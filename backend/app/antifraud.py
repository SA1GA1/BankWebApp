"""Async-клиент антифрод-сервиса (Back) + логирование запросов в SQLite."""
from __future__ import annotations

import hashlib
import json
import logging
import re
import time
import uuid
from datetime import datetime
from typing import Any, Optional

import httpx

from app.config import settings
from app.db import get_conn
from app.schemas import ScoreResponse, Signals

_LOG = logging.getLogger("bankwebapp.antifraud")


def _iso(dt: datetime) -> str:
    return dt.replace(microsecond=0).isoformat()


def _now() -> str:
    return _iso(datetime.utcnow())


def _parse_browser(user_agent: Optional[str]) -> tuple[str, str, str]:
    """Грубо парсим UA → (browser_name, browser_version, os_type)."""
    if not user_agent:
        return "Unknown", "0", "Unknown"
    ua = user_agent
    if "Edg/" in ua:
        name = "Edge"
    elif "Chrome/" in ua and "Safari/" in ua and "Edg" not in ua:
        name = "Chrome"
    elif "Firefox/" in ua:
        name = "Firefox"
    elif "Safari/" in ua:
        name = "Safari"
    else:
        name = "Unknown"
    m = re.search(r"(?:Chrome|Firefox|Safari|Edg)/([\d.]+)", ua)
    version = m.group(1) if m else "0"
    if "Windows" in ua:
        os_type = "Windows"
    elif "Mac OS X" in ua or "Macintosh" in ua:
        os_type = "macOS"
    elif "Linux" in ua:
        os_type = "Linux"
    elif "Android" in ua:
        os_type = "Android"
    elif "iPhone" in ua or "iPad" in ua:
        os_type = "iOS"
    else:
        os_type = "Unknown"
    return name, version, os_type


def _fingerprint(signals: Signals) -> str:
    raw = "|".join(
        [
            signals.user_agent or "",
            signals.screen_resolution or "",
            signals.system_language or "",
            str(signals.timezone_offset_minutes or 0),
        ]
    )
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()


def build_behavior_payload(
    *,
    customer_id: int,
    signals: Signals,
    operaton_amt: float,
    transaction_type: str,
    merchant_name: str = "private_user",
    event_id: Optional[str] = None,
) -> dict[str, Any]:
    """Соберёт web-payload для POST /score/behavior."""
    now = datetime.utcnow()
    hour = signals.force_hour_of_day if signals.force_hour_of_day is not None else now.hour
    name, version, os_type = _parse_browser(signals.user_agent)
    fingerprint = signals.browser_fingerprint or _fingerprint(signals)
    return {
        "customer_id": customer_id,
        "event_id": event_id or str(uuid.uuid4()),
        "event_dttm": now.strftime("%Y-%m-%d %H:%M:%S"),
        "hour_of_day": hour,
        "day_of_week": now.weekday(),
        "operaton_amt": float(operaton_amt),
        "currency_iso_cd": 643,
        "transaction_type": transaction_type,
        "merchant_name": merchant_name,
        # web-discriminator
        "browser_fingerprint": fingerprint,
        "user_agent": signals.user_agent or "Mozilla/5.0",
        "browser_name": signals.browser_name or name,
        "browser_version": signals.browser_version or version,
        "os_type": signals.os_type or os_type,
        "screen_resolution": signals.screen_resolution or "1920x1080",
        "system_language": signals.system_language or "ru-RU",
        # сигналы риска
        "is_vpn_detected": int(signals.is_vpn_detected),
        "is_proxy_detected": int(signals.is_proxy_detected),
        "is_tor_detected": int(signals.is_tor_detected),
        "is_new_device": int(signals.is_new_device),
        "is_new_browser": int(signals.is_new_browser),
        "geo_speed_km_h": float(signals.geo_speed_km_h),
        "session_duration_sec": float(signals.session_duration_sec or 0.0),
        "transfers_count_last_10min": int(signals.transfers_count_last_10min),
        "network_rtt_avg_ms": float(signals.network_rtt_avg_ms or 0.0),
        "mouse_velocity_avg": float(signals.mouse_velocity_avg or 0.0),
        "mouse_jitter_score": float(signals.mouse_jitter_score or 0.0),
        "keyboard_typing_speed_median_ms": float(signals.keyboard_typing_speed_median_ms or 0.0),
    }


def _log_call(
    *,
    user_id: Optional[int],
    check_type: str,
    payload: dict,
    response: ScoreResponse,
) -> None:
    try:
        with get_conn() as conn:
            conn.execute(
                "INSERT INTO antifraud_log (user_id, check_type, request_payload, response_score,"
                " response_decision, response_reasons, latency_ms, created_at)"
                " VALUES (?,?,?,?,?,?,?,?)",
                (
                    user_id,
                    check_type,
                    json.dumps(payload, ensure_ascii=False)[:8000],
                    response.score,
                    response.decision,
                    json.dumps(response.reasons, ensure_ascii=False),
                    response.latency_ms,
                    _now(),
                ),
            )
    except Exception as exc:  # noqa: BLE001
        _LOG.warning("antifraud_log_failed: %s", exc)


def _fail_open(reason: str = "antifraud_unreachable") -> ScoreResponse:
    return ScoreResponse(score=0.0, decision="safe", reasons=[reason], used_model=False, latency_ms=0)


async def _post(path: str, payload: dict) -> ScoreResponse:
    url = f"{settings.antifraud_url}{path}"
    started = time.perf_counter()
    try:
        async with httpx.AsyncClient(timeout=settings.antifraud_timeout_seconds) as client:
            resp = await client.post(url, json=payload)
        if resp.status_code >= 500:
            _LOG.warning("antifraud %s returned %s", path, resp.status_code)
            return _fail_open(f"antifraud_status_{resp.status_code}")
        if resp.status_code >= 400:
            _LOG.warning("antifraud %s 4xx: %s", path, resp.text[:300])
            return _fail_open(f"antifraud_bad_request_{resp.status_code}")
        data = resp.json()
        return ScoreResponse(**data)
    except httpx.HTTPError as exc:
        _LOG.warning("antifraud %s error: %s", path, exc)
        elapsed = int((time.perf_counter() - started) * 1000)
        result = _fail_open()
        result.latency_ms = elapsed
        return result


async def check_behavior(*, user_id: int, payload: dict) -> ScoreResponse:
    response = await _post("/score/behavior", payload)
    _log_call(user_id=user_id, check_type="behavior", payload=payload, response=response)
    return response


async def check_merchant(*, user_id: int, site_name: str, amount: float) -> ScoreResponse:
    payload = {"site_name": site_name, "customer_id": user_id, "amount": amount}
    response = await _post("/score/merchant", payload)
    _log_call(user_id=user_id, check_type="merchant", payload=payload, response=response)
    return response


async def check_chat(*, user_id: int, payload: dict) -> ScoreResponse:
    response = await _post("/score/chat", payload)
    _log_call(user_id=user_id, check_type="chat", payload=payload, response=response)
    return response


async def check_screen(*, user_id: int, screen: str, signals: Signals) -> ScoreResponse:
    payload = build_behavior_payload(
        customer_id=user_id,
        signals=signals,
        operaton_amt=0.0,
        transaction_type="screen_entry",
        merchant_name=f"screen:{screen}",
    )
    response = await _post("/score/behavior", payload)
    _log_call(user_id=user_id, check_type="screen", payload=payload, response=response)
    return response
