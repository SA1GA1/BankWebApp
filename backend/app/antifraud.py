"""Async-клиент антифрод-сервиса (Back) + логирование запросов в SQLite."""
from __future__ import annotations

import hashlib
import json
import logging
import re
import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import httpx

from app.config import settings
from app.db import get_conn
from app.schemas import Decision, ScoreResponse, Signals

_LOG = logging.getLogger("bankwebapp.antifraud")
_LOG.setLevel(logging.INFO)
if not _LOG.handlers:
    # uvicorn по умолчанию не конфигурирует root-логгер, наши INFO уходили в /dev/null.
    _handler = logging.StreamHandler()
    _handler.setFormatter(
        logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s")
    )
    _LOG.addHandler(_handler)
    _LOG.propagate = False


_TIER_ORDER: tuple[Decision, ...] = ("safe", "review", "sms", "block")


def _decision_from_score(score: float) -> Decision:
    """Fallback-маппинг скора. Используется только когда Back не вернул
    ни `challenges`, ни `decision` (fail-open, или нештатный ответ)."""
    if score < 3.0:
        return "safe"
    if score < 6.0:
        return "review"
    if score < 8.0:
        return "sms"
    return "block"


def _decision_from_challenges(challenges: list[str]) -> Decision:
    """Web/mobile challenges из Back → bank.Decision (берём сильнейший).

    Web (по нарастанию): safe < captcha < email < sms < second_device.
    Mobile: safe < gyroscope < touch_id < face_id < sms < email.
    Соответствие тирам банка из `app/core/scoring.py` Back-сервиса:
    - second_device              → block (8.5+)
    - sms                        → sms      (5.0–8.4)
    - captcha/email/gyroscope/   → review   (3.0–4.9)
      face_id/touch_id
    - только ["safe"]            → safe     (<3.0)
    """
    s = set(challenges or [])
    if "second_device" in s:
        return "block"
    if "sms" in s:
        return "sms"
    if s & {"captcha", "email", "gyroscope", "face_id", "touch_id"}:
        return "review"
    return "safe"


def max_decision(*decisions: Decision) -> Decision:
    """Сильнейший тир из набора (для объединения behavior + merchant)."""
    if not decisions:
        return "safe"
    return _TIER_ORDER[max(_TIER_ORDER.index(d) for d in decisions)]


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


def _parse_os_version(user_agent: Optional[str]) -> str:
    """Грубый парс OS-версии из UA. Дефолт 10.0 (Windows-like)."""
    if not user_agent:
        return "10.0"
    if "Windows NT" in user_agent:
        m = re.search(r"Windows NT ([\d.]+)", user_agent)
        return m.group(1) if m else "10.0"
    if "Mac OS X" in user_agent:
        m = re.search(r"Mac OS X ([\d_.]+)", user_agent)
        return m.group(1).replace("_", ".") if m else "14"
    if "iPhone OS" in user_agent:
        m = re.search(r"iPhone OS ([\d_]+)", user_agent)
        return m.group(1).replace("_", ".") if m else "17"
    if "Android" in user_agent:
        m = re.search(r"Android ([\d.]+)", user_agent)
        return m.group(1) if m else "14"
    return "10.0"


def build_behavior_payload(
    *,
    customer_id: int,
    signals: Signals,
    operaton_amt: float,
    transaction_type: str,
    merchant_name: str = "private_user",
    event_id: Optional[int] = None,
) -> dict[str, Any]:
    """Соберёт web-payload для POST /score/behavior/web.

    Шаблон полей — эталонный «чистый» пример от Back-команды:
      customer_id=77002, event_id=7700200001, … operaton_amt=450, … geo_speed_km_h=0.0 …

    Динамические поля заполняются из request/signals, статические — захардкожены
    под web. Mobile-only сигналы передаются как 0 (схема web FraudMLP принимает
    единый список колонок mobile+web и заполняет недостающие нулями).
    """
    now = datetime.now(timezone(timedelta(hours=3)))  # Moscow +03:00 для event_dttm
    hour = signals.force_hour_of_day if signals.force_hour_of_day is not None else now.hour
    name, version, os_type = _parse_browser(signals.user_agent)
    os_version = _parse_os_version(signals.user_agent)
    fingerprint = signals.browser_fingerprint or _fingerprint(signals)

    # signals могут содержать измеренный 0 (только-только открыли страницу); тогда
    # подставляем эталонные «человеческие» значения, чтобы клиент-демо не валился
    # в micro_session и нейронка не видела бота.
    session_duration = float(signals.session_duration_sec) if signals.session_duration_sec else 720.0
    network_rtt = float(signals.network_rtt_avg_ms) if signals.network_rtt_avg_ms else 52.10

    return {
        # ---- идентификаторы (int) ----
        "customer_id": int(customer_id),
        "event_id": int(event_id) if event_id is not None else (uuid.uuid4().int & 0x7FFFFFFFFFFFFFFF),
        "session_id": uuid.uuid4().int & 0x7FFFFFFFFFFFFFFF,

        # ---- время ----
        "event_dttm": now.replace(microsecond=0).isoformat(),  # 2026-05-13T12:15:00+03:00
        "hour_of_day": hour,
        "day_of_week": now.weekday(),
        "timezone_offset_minutes": signals.timezone_offset_minutes or 180,

        # ---- браузер/устройство ----
        "browser_fingerprint": fingerprint,
        "user_agent": signals.user_agent or (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        ),
        "browser_name": signals.browser_name or name,
        "browser_version": signals.browser_version or version,
        "os_type": signals.os_type or os_type,
        "os_version": os_version,
        "device_model": "Desktop",
        "app_version": "web",

        # ---- транзакция ----
        "operaton_amt": float(operaton_amt),
        "currency_iso_cd": "RUB",
        "mcc_code": "5411",
        "merchant_name": merchant_name,
        "pos_cd": "ECOM",
        "transaction_type": transaction_type,

        # ---- безопасность браузера ----
        "is_developer_tools": 0,
        "developer_tools_enabled": 0,
        "is_headless_browser": 0,
        "is_incognito": 0,

        # ---- сеть ----
        "ip_address_hash": "sha256_web_demo_moscow",
        "is_vpn_detected": int(signals.is_vpn_detected),
        "is_proxy_detected": int(signals.is_proxy_detected),
        "is_tor_detected": int(signals.is_tor_detected),
        "connection_type": "wifi",
        "network_rtt_avg_ms": network_rtt,

        # ---- поведенческие сигналы (web) ----
        "backspace_ratio": 0.08,
        "clipboard_paste_ratio": 0.02,
        "form_fill_duration_sec": 85.4,
        "session_duration_sec": session_duration,

        # ---- история устройства ----
        "is_new_device": int(signals.is_new_device),
        "is_new_browser": int(signals.is_new_browser),

        # ---- геолокация (Moscow center; демо) ----
        "geo_speed_km_h": float(signals.geo_speed_km_h),
        "latitude": 55.753215,
        "longitude": 37.622504,
        "accuracy_meters": 10,
        "location_provider": "gps",

        # ---- индикаторы компрометации ----
        "is_rooted_jailbroken": 0,
        "is_emulator": 0,
        "is_debugger_attached": 0,
        "biometric_entry_used": 0,
        "attestation_status": "not_applicable_web",
        "app_install_source": "n_a",
        "integrity_token": "n_a",

        # ---- carrier (web → n/a, но колонки в схеме есть) ----
        "carrier_name": "n_a",
        "carrier_mcc": 250,
        "carrier_mnc": 1,
        "sim_country_code": "RU",
        "sim_carrier_name": "n_a",
        "battery_charging_state": "unknown",

        # ---- mobile-only (нули для web) ----
        "touch_typing_rhythm_median_ms": 0,
        "touch_typing_rhythm_std_dev": 0,
        "touch_typing_rhythm_cv": 0,
        "tap_velocity_avg": 0,
        "tap_pressure_avg": 0,
        "touch_jitter_score": 0,
        "swipe_angle_deviation": 0,
        "app_background_events": 0,
        "screen_orientation_changes": 0,
        "accelerometer_variance_x": 0,
        "accelerometer_variance_y": 0,
        "gyroscope_variance": 0,
        "battery_level": 0,
        "storage_free_percent": 0,

        # ---- velocity ----
        "transfers_count_last_10min": int(signals.transfers_count_last_10min),
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
    if path == "/score/behavior/web":
        _LOG.info(
            "→ POST %s\n%s",
            url,
            json.dumps(payload, ensure_ascii=False, indent=2),
        )
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
        score = float(data.get("score", 0.0))
        challenges = data.get("challenges")
        back_decision = data.get("decision")
        if challenges:
            # behavior-ручки: всегда есть min_length=1 список challenges
            decision = _decision_from_challenges(challenges)
        elif back_decision == "safe":
            decision = "safe"
        elif back_decision == "unsafe":
            # chat/merchant: бинарка → детализируем тир по скору, но не ниже sms
            decision = "block" if score >= 8.0 else "sms"
        else:
            decision = _decision_from_score(score)
        return ScoreResponse(
            score=score,
            decision=decision,
            reasons=list(data.get("reasons", [])),
            used_model=bool(data.get("used_model", False)),
            latency_ms=int(data.get("latency_ms", 0)),
        )
    except httpx.HTTPError as exc:
        _LOG.warning("antifraud %s error: %s", path, exc)
        elapsed = int((time.perf_counter() - started) * 1000)
        result = _fail_open()
        result.latency_ms = elapsed
        return result


async def check_behavior(*, user_id: int, payload: dict) -> ScoreResponse:
    response = await _post("/score/behavior/web", payload)
    _log_call(user_id=user_id, check_type="behavior", payload=payload, response=response)
    return response


async def check_merchant(*, user_id: int, site_name: str, amount: float) -> ScoreResponse:
    # MerchantScoreRequest на стороне Back — extra="forbid"; принимает только
    # site_name/merchant_name. amount и customer_id оставляем в логе через _log_call.
    payload = {"site_name": site_name}
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
    response = await _post("/score/behavior/web", payload)
    _log_call(user_id=user_id, check_type="screen", payload=payload, response=response)
    return response
