from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


Decision = Literal["safe", "review", "sms", "biometry"]


class Signals(BaseModel):
    """Сигналы с фронта (fingerprint + dev panel). Все поля опциональны."""

    model_config = {"extra": "allow"}

    browser_fingerprint: Optional[str] = None
    user_agent: Optional[str] = None
    browser_name: Optional[str] = None
    browser_version: Optional[str] = None
    os_type: Optional[str] = None
    screen_resolution: Optional[str] = None
    system_language: Optional[str] = None
    timezone_offset_minutes: Optional[int] = None
    session_duration_sec: Optional[float] = None

    mouse_velocity_avg: Optional[float] = None
    mouse_jitter_score: Optional[float] = None
    keyboard_typing_speed_median_ms: Optional[float] = None
    network_rtt_avg_ms: Optional[float] = None

    is_vpn_detected: int = 0
    is_proxy_detected: int = 0
    is_tor_detected: int = 0
    is_new_device: int = 0
    is_new_browser: int = 0
    geo_speed_km_h: float = 0.0
    transfers_count_last_10min: int = 0
    force_hour_of_day: Optional[int] = None
    geo_mismatch: bool = False


class ScoreResponse(BaseModel):
    score: float = 0.0
    decision: Decision = "safe"
    reasons: list[str] = Field(default_factory=list)
    used_model: bool = False
    latency_ms: int = 0


# ---- Transfer ----


class TransferRequest(BaseModel):
    from_user_id: int
    mode: Literal["p2p", "merchant"]
    amount: float = Field(gt=0)
    to_account: Optional[str] = None
    to_name: Optional[str] = None
    merchant_site: Optional[str] = None
    signals: Signals = Field(default_factory=Signals)


class TransferResponse(BaseModel):
    status: Literal["ok", "challenge", "blocked"]
    score: float
    decision: Decision
    reasons: list[str] = Field(default_factory=list)
    challenge: Optional[Literal["phrase", "sms"]] = None
    pending_id: Optional[str] = None
    transaction_id: Optional[int] = None


class TransferConfirmRequest(BaseModel):
    pending_id: str
    code: str


# ---- Messages ----


class MessageCreate(BaseModel):
    sender_id: int
    receiver_id: int
    text: str
    signals: Signals = Field(default_factory=Signals)


class MessageOut(BaseModel):
    id: Optional[int] = None
    sender_id: int
    receiver_id: int
    text: str
    created_at: str
    antifraud_score: float = 0.0
    antifraud_decision: Decision = "safe"
    antifraud_reasons: list[str] = Field(default_factory=list)


class MessagePostResponse(BaseModel):
    status: Literal["ok", "flagged", "blocked"]
    message: Optional[MessageOut] = None
    score: float
    decision: Decision
    reasons: list[str] = Field(default_factory=list)


# ---- Screen entry ----


class ScreenEntryRequest(BaseModel):
    user_id: int
    screen: Literal["transfer", "messenger"]
    signals: Signals = Field(default_factory=Signals)


class ScreenEntryResponse(BaseModel):
    score: float
    decision: Decision
    reasons: list[str] = Field(default_factory=list)
