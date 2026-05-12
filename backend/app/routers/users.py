from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.db import get_conn, row_to_dict

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("")
def list_users() -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT id, full_name, account_number, phone, balance, created_at FROM users ORDER BY id"
        ).fetchall()
    return [row_to_dict(r) for r in rows]


@router.get("/{user_id}")
def get_user(user_id: int) -> dict:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT id, full_name, account_number, phone, balance, created_at FROM users WHERE id=?",
            (user_id,),
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="user not found")
        user = row_to_dict(row)
        tx_rows = conn.execute(
            "SELECT id, kind, counterparty, amount, description, created_at, antifraud_score, antifraud_decision"
            " FROM transactions WHERE user_id=? ORDER BY id DESC LIMIT 10",
            (user_id,),
        ).fetchall()
    user["transactions"] = [row_to_dict(r) for r in tx_rows]
    return user


@router.get("/{user_id}/transactions")
def list_transactions(user_id: int, limit: int = 20) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT id, kind, counterparty, amount, description, created_at, antifraud_score, antifraud_decision"
            " FROM transactions WHERE user_id=? ORDER BY id DESC LIMIT ?",
            (user_id, limit),
        ).fetchall()
    return [row_to_dict(r) for r in rows]
