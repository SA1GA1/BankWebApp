from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import init_db
from app.seed import seed_if_empty


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    seed_if_empty()
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="BankWebApp Backend", version="0.1.0", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
        allow_credentials=False,
    )

    from app.routers import antifraud as antifraud_router
    from app.routers import merchants, messages, transactions, users

    app.include_router(users.router)
    app.include_router(transactions.router)
    app.include_router(merchants.router)
    app.include_router(messages.router)
    app.include_router(antifraud_router.router)

    @app.get("/api/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
