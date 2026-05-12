from __future__ import annotations

from fastapi import APIRouter

from app.db import get_conn, row_to_dict

router = APIRouter(prefix="/api/merchants", tags=["merchants"])


@router.get("")
def list_merchants(q: str = "") -> list[dict]:
    pattern = f"%{q.strip().lower()}%" if q.strip() else "%"
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT id, name, site, category, is_known_suspicious FROM merchants"
            " WHERE LOWER(name) LIKE ? OR LOWER(site) LIKE ? ORDER BY name",
            (pattern, pattern),
        ).fetchall()
    return [row_to_dict(r) for r in rows]
