"""SQLAlchemy engine/session wiring, driven by a single DATABASE_URL.

Local default is SQLite (`sqlite:///./pactpilot.db`); switching to Oracle ADB 23ai
is a config-only change (`oracle+oracledb://ADMIN:...@adb_high`) — no code edits.
The SQLite `check_same_thread` arg is only applied for SQLite so the Oracle driver
isn't handed an argument it doesn't understand.
"""

from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings

_is_sqlite = settings.database_url.startswith("sqlite")

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if _is_sqlite else {},
    pool_pre_ping=True,
    future=True,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency: yields a session and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create tables for all imported models. Idempotent."""
    # Import models so they register on Base.metadata before create_all.
    from app.models import db_models  # noqa: F401

    Base.metadata.create_all(bind=engine)
