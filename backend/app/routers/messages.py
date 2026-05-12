from __future__ import annotations

import json
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from app.antifraud import check_chat
from app.db import get_conn, row_to_dict
from app.schemas import MessageCreate, MessagePostResponse, MessageOut

router = APIRouter(prefix="/api/messages", tags=["messages"])


def _iso(dt: datetime) -> str:
    return dt.replace(microsecond=0).isoformat()


def _utc_z(iso: str) -> str:
    """Преобразовать ISO без таймзоны → ISO с Z (UTC)."""
    if iso.endswith("Z"):
        return iso
    return f"{iso}Z"


@router.get("/threads/{user_id}")
def list_threads(user_id: int) -> list[dict]:
    """Список собеседников: для каждого пира — последнее сообщение."""
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT
              peer.id AS peer_id,
              peer.full_name AS peer_name,
              peer.account_number AS peer_account,
              last_msg.text AS last_text,
              last_msg.created_at AS last_created_at,
              last_msg.sender_id AS last_sender_id
            FROM users peer
            JOIN (
              SELECT
                CASE WHEN sender_id = :uid THEN receiver_id ELSE sender_id END AS peer_id,
                id, text, created_at, sender_id,
                ROW_NUMBER() OVER (
                  PARTITION BY CASE WHEN sender_id = :uid THEN receiver_id ELSE sender_id END
                  ORDER BY id DESC
                ) AS rn
              FROM messages
              WHERE sender_id = :uid OR receiver_id = :uid
            ) last_msg ON last_msg.peer_id = peer.id AND last_msg.rn = 1
            WHERE peer.id != :uid
            ORDER BY last_msg.id DESC
            """,
            {"uid": user_id},
        ).fetchall()
    return [row_to_dict(r) for r in rows]


@router.get("/{user_id}/{peer_id}")
def list_messages(user_id: int, peer_id: int) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT id, sender_id, receiver_id, text, created_at, antifraud_score,"
            " antifraud_decision, antifraud_reasons FROM messages"
            " WHERE (sender_id=? AND receiver_id=?) OR (sender_id=? AND receiver_id=?)"
            " ORDER BY id ASC",
            (user_id, peer_id, peer_id, user_id),
        ).fetchall()
    out = []
    for r in rows:
        d = row_to_dict(r)
        try:
            d["antifraud_reasons"] = json.loads(d.get("antifraud_reasons") or "[]")
        except Exception:
            d["antifraud_reasons"] = []
        out.append(d)
    return out


@router.post("", response_model=MessagePostResponse)
async def post_message(req: MessageCreate) -> MessagePostResponse:
    with get_conn() as conn:
        sender = conn.execute(
            "SELECT id, full_name, created_at FROM users WHERE id=?", (req.sender_id,)
        ).fetchone()
        receiver = conn.execute(
            "SELECT id, full_name, created_at FROM users WHERE id=?", (req.receiver_id,)
        ).fetchone()
        if sender is None or receiver is None:
            raise HTTPException(404, "sender or receiver not found")
        history_rows = conn.execute(
            "SELECT sender_id, receiver_id, text, created_at FROM messages"
            " WHERE (sender_id=? AND receiver_id=?) OR (sender_id=? AND receiver_id=?)"
            " ORDER BY id DESC LIMIT 5",
            (req.sender_id, req.receiver_id, req.receiver_id, req.sender_id),
        ).fetchall()

    history_msgs = []
    for r in reversed(history_rows):
        history_msgs.append(
            {
                "sender_id": f"usr_{r['sender_id']}",
                "receiver_id": f"usr_{r['receiver_id']}",
                "message_text": r["text"],
                "timestamp": _utc_z(r["created_at"]),
            }
        )

    now = datetime.now(timezone.utc)
    new_msg = {
        "sender_id": f"usr_{req.sender_id}",
        "receiver_id": f"usr_{req.receiver_id}",
        "message_text": req.text,
        "timestamp": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
    }

    try:
        receiver_created = datetime.fromisoformat(receiver["created_at"])
        age_days = max(1, (datetime.utcnow() - receiver_created).days)
    except Exception:
        age_days = 365

    payload = {
        "counterparty_metadata": {
            "user_id": f"usr_{req.receiver_id}",
            "verification_status": "verified",
            "account_age_days": age_days,
            "geo_location": "RU-MOW",
            "geo_mismatch": bool(req.signals.geo_mismatch),
            "kyc_level": "full",
        },
        "messages": history_msgs + [new_msg],
    }

    score_res = await check_chat(user_id=req.sender_id, payload=payload)

    created_at = _iso(datetime.utcnow())

    if score_res.decision == "biometry":
        return MessagePostResponse(
            status="blocked",
            score=score_res.score,
            decision=score_res.decision,
            reasons=score_res.reasons,
        )

    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO messages (sender_id, receiver_id, text, created_at,"
            " antifraud_score, antifraud_decision, antifraud_reasons)"
            " VALUES (?,?,?,?,?,?,?)",
            (
                req.sender_id,
                req.receiver_id,
                req.text,
                created_at,
                score_res.score,
                score_res.decision,
                json.dumps(score_res.reasons, ensure_ascii=False),
            ),
        )
        msg_id = cur.lastrowid

    out_msg = MessageOut(
        id=msg_id,
        sender_id=req.sender_id,
        receiver_id=req.receiver_id,
        text=req.text,
        created_at=created_at,
        antifraud_score=score_res.score,
        antifraud_decision=score_res.decision,
        antifraud_reasons=score_res.reasons,
    )
    status = "flagged" if score_res.decision != "safe" else "ok"
    return MessagePostResponse(
        status=status,
        message=out_msg,
        score=score_res.score,
        decision=score_res.decision,
        reasons=score_res.reasons,
    )
