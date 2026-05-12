from __future__ import annotations

from fastapi import APIRouter

from app.antifraud import check_screen
from app.db import get_conn, row_to_dict
from app.schemas import ScreenEntryRequest, ScreenEntryResponse

router = APIRouter(prefix="/api/antifraud", tags=["antifraud"])


@router.post("/screen-entry", response_model=ScreenEntryResponse)
async def screen_entry(req: ScreenEntryRequest) -> ScreenEntryResponse:
    response = await check_screen(user_id=req.user_id, screen=req.screen, signals=req.signals)
    return ScreenEntryResponse(
        score=response.score, decision=response.decision, reasons=response.reasons
    )


@router.get("/log")
def list_log(limit: int = 20) -> list[dict]:
    """Debug-эндпоинт: показывает последние N запросов к антифроду."""
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT id, user_id, check_type, response_score, response_decision,"
            " response_reasons, latency_ms, created_at FROM antifraud_log"
            " ORDER BY id DESC LIMIT ?",
            (limit,),
        ).fetchall()
    return [row_to_dict(r) for r in rows]
