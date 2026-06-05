"""Authentication primitives: password hashing, JWTs, and FastAPI deps.

Two request deps cover both product modes:
- `current_user`  -> 401 if no/invalid token (protected endpoints).
- `optional_user` -> returns None for anonymous callers (auth-agnostic endpoints
  like /api/analyze, which must keep working with no account).
Tokens are HS256 JWTs carrying the user id as `sub`.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.models.db_models import User

# auto_error=False so optional_user can treat "no header" as anonymous, not 403.
_bearer = HTTPBearer(auto_error=False)

_ALG = "HS256"


def hash_password(password: str) -> str:
    # bcrypt caps input at 72 bytes; trim defensively so long inputs don't error.
    digest = bcrypt.hashpw(password.encode("utf-8")[:72], bcrypt.gensalt())
    return digest.decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8")[:72], password_hash.encode("utf-8"))
    except Exception:
        return False


def create_token(user_id: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "iat": now,
        "exp": now + timedelta(hours=settings.jwt_expire_hours),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=_ALG)


def decode_token(token: str) -> Optional[str]:
    """Return the user id from a valid token, or None if invalid/expired."""
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[_ALG])
        sub = payload.get("sub")
        return sub if isinstance(sub, str) else None
    except jwt.PyJWTError:
        return None


def optional_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Resolve the caller if a valid Bearer token is present; else None (anon OK)."""
    if creds is None:
        return None
    user_id = decode_token(creds.credentials)
    if user_id is None:
        return None
    return db.get(User, user_id)


def current_user(
    user: Optional[User] = Depends(optional_user),
) -> User:
    """Require an authenticated user; 401 otherwise."""
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user
