from __future__ import annotations

import os
from pathlib import Path


class Settings:
    db_path: Path = Path(os.environ.get("BANK_DB_PATH", Path(__file__).resolve().parent.parent / "bank.db"))
    antifraud_url: str = os.environ.get("ANTIFRAUD_URL", "http://localhost:8000")
    antifraud_timeout_seconds: float = float(os.environ.get("ANTIFRAUD_TIMEOUT_SECONDS", "2.0"))
    cors_origins: list[str] = [
        o.strip()
        for o in os.environ.get(
            "CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173",
        ).split(",")
        if o.strip()
    ]


settings = Settings()
