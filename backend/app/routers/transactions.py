from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException

from app.antifraud import build_behavior_payload, check_behavior, check_merchant
from app.db import get_conn, row_to_dict
from app.schemas import (
    Decision,
    ScoreResponse,
    TransferConfirmRequest,
    TransferRequest,
    TransferResponse,
)

router = APIRouter(prefix="/api/transfer", tags=["transfer"])

# pending-store: pending_id → детали перевода. Только в памяти процесса (для демо).
_PENDING: dict[str, dict[str, Any]] = {}


def _challenge_for(decision: Decision) -> str | None:
    if decision == "review":
        return "phrase"
    if decision == "sms":
        return "sms"
    return None


def _resolve_recipient(req: TransferRequest, conn) -> tuple[str, dict | None]:
    """Возвращает (counterparty_display_name, recipient_user_row|None)."""
    if req.mode == "p2p":
        if not req.to_account:
            raise HTTPException(400, "to_account is required for p2p mode")
        row = conn.execute(
            "SELECT id, full_name, account_number FROM users WHERE account_number=?",
            (req.to_account,),
        ).fetchone()
        if row is None:
            return req.to_name or req.to_account, None
        return row["full_name"], row_to_dict(row)
    # merchant
    if not req.merchant_site:
        raise HTTPException(400, "merchant_site is required for merchant mode")
    row = conn.execute(
        "SELECT name FROM merchants WHERE site=?",
        (req.merchant_site,),
    ).fetchone()
    return (row["name"] if row else req.merchant_site), None


def _commit_transfer(req: TransferRequest, counterparty: str, score: float, decision: Decision) -> int:
    with get_conn() as conn:
        sender = conn.execute("SELECT id, balance FROM users WHERE id=?", (req.from_user_id,)).fetchone()
        if sender is None:
            raise HTTPException(404, "sender not found")
        if sender["balance"] < req.amount:
            raise HTTPException(400, "insufficient balance")
        conn.execute(
            "UPDATE users SET balance = balance - ? WHERE id=?",
            (req.amount, req.from_user_id),
        )
        kind = "outgoing" if req.mode == "p2p" else "payment"
        cursor = conn.execute(
            "INSERT INTO transactions (user_id, kind, counterparty, amount, description, created_at,"
            " antifraud_score, antifraud_decision) VALUES (?,?,?,?,?,?,?,?)",
            (
                req.from_user_id,
                kind,
                counterparty,
                -abs(req.amount),
                "Перевод по реквизитам" if req.mode == "p2p" else f"Оплата {counterparty}",
                datetime.utcnow().replace(microsecond=0).isoformat(),
                score,
                decision,
            ),
        )
        tx_id = cursor.lastrowid

        # Зачислить получателю, если это другой клиент банка
        if req.mode == "p2p" and req.to_account:
            recipient = conn.execute(
                "SELECT id FROM users WHERE account_number=?", (req.to_account,)
            ).fetchone()
            if recipient:
                conn.execute(
                    "UPDATE users SET balance = balance + ? WHERE id=?",
                    (req.amount, recipient["id"]),
                )
                conn.execute(
                    "INSERT INTO transactions (user_id, kind, counterparty, amount, description, created_at,"
                    " antifraud_score, antifraud_decision) VALUES (?,?,?,?,?,?,?,?)",
                    (
                        recipient["id"],
                        "incoming",
                        req.to_name or f"User {req.from_user_id}",
                        abs(req.amount),
                        "Входящий перевод",
                        datetime.utcnow().replace(microsecond=0).isoformat(),
                        score,
                        decision,
                    ),
                )
        return tx_id


@router.post("", response_model=TransferResponse)
async def create_transfer(req: TransferRequest) -> TransferResponse:
    with get_conn() as conn:
        sender = conn.execute(
            "SELECT id, balance FROM users WHERE id=?", (req.from_user_id,)
        ).fetchone()
        if sender is None:
            raise HTTPException(404, "sender not found")
        counterparty, _ = _resolve_recipient(req, conn)

    transaction_type = "p2p" if req.mode == "p2p" else "payment"
    merchant_name = "private_user" if req.mode == "p2p" else req.merchant_site or "merchant"
    behavior_payload = build_behavior_payload(
        customer_id=req.from_user_id,
        signals=req.signals,
        operaton_amt=req.amount,
        transaction_type=transaction_type,
        merchant_name=merchant_name,
    )
    behavior = await check_behavior(user_id=req.from_user_id, payload=behavior_payload)

    final_score = behavior.score
    final_decision = behavior.decision
    reasons = list(behavior.reasons)

    if req.mode == "merchant" and req.merchant_site:
        merchant_res = await check_merchant(
            user_id=req.from_user_id,
            site_name=req.merchant_site,
            amount=req.amount,
        )
        reasons.extend(merchant_res.reasons)
        if merchant_res.score > final_score:
            final_score = merchant_res.score
            final_decision = merchant_res.decision

    # decision уже отражает score, но если мы взяли merchant.score — мог сместиться. Перевычислим.
    final_decision = _decision_from_score(final_score)

    if final_decision == "biometry":
        return TransferResponse(
            status="blocked",
            score=final_score,
            decision=final_decision,
            reasons=reasons,
        )

    if final_decision in ("review", "sms"):
        pending_id = str(uuid.uuid4())
        _PENDING[pending_id] = {
            "request": req.model_dump(),
            "counterparty": counterparty,
            "score": final_score,
            "decision": final_decision,
        }
        return TransferResponse(
            status="challenge",
            score=final_score,
            decision=final_decision,
            reasons=reasons,
            challenge=_challenge_for(final_decision),
            pending_id=pending_id,
        )

    tx_id = _commit_transfer(req, counterparty, final_score, final_decision)
    return TransferResponse(
        status="ok",
        score=final_score,
        decision=final_decision,
        reasons=reasons,
        transaction_id=tx_id,
    )


@router.post("/confirm", response_model=TransferResponse)
async def confirm_transfer(req: TransferConfirmRequest) -> TransferResponse:
    pending = _PENDING.pop(req.pending_id, None)
    if pending is None:
        raise HTTPException(404, "pending transfer not found or already used")
    if not req.code or not req.code.strip():
        raise HTTPException(400, "code is required")
    original = TransferRequest(**pending["request"])
    tx_id = _commit_transfer(
        original,
        pending["counterparty"],
        pending["score"],
        pending["decision"],
    )
    return TransferResponse(
        status="ok",
        score=pending["score"],
        decision=pending["decision"],
        reasons=["confirmed_via_challenge"],
        transaction_id=tx_id,
    )


def _decision_from_score(score: float):
    if score < 3.0:
        return "safe"
    if score < 6.0:
        return "review"
    if score < 8.0:
        return "sms"
    return "biometry"
