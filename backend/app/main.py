"""FastAPI entrypoint. Run: uvicorn app.main:app --reload"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.api.auth_routes import router as auth_router
from app.api.routes import router
from app.config import settings
from app.db import SessionLocal, init_db

DEMO_EMAIL = "demo@pactpilot.ai"
DEMO_PASSWORD = "demo1234"


def _seed_demo_user() -> None:
    """Seed the judges' demo account if it doesn't exist yet (idempotent)."""
    from app.auth import hash_password
    from app.models.db_models import User

    with SessionLocal() as db:
        if db.scalar(select(User).where(User.email == DEMO_EMAIL)) is None:
            db.add(User(email=DEMO_EMAIL, password_hash=hash_password(DEMO_PASSWORD)))
            db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    _seed_demo_user()
    yield


app = FastAPI(title="PactPilot API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(auth_router)


@app.get("/health")
async def health() -> dict[str, str | bool]:
    return {"status": "ok", "fake_oci": settings.fake_oci}
