"""In-memory analysis cache with a TTL, keyed by analysis_id.

The app is stateless/no-login; this cache is what lets chat + refresh re-fetch a
result by id within its lifetime. Process-local only (fine for the hackathon).
"""

from __future__ import annotations

import time
from typing import Any

from app.config import settings


class AnalysisCache:
    def __init__(self, ttl_seconds: int) -> None:
        self._ttl = ttl_seconds
        self._store: dict[str, tuple[float, dict[str, Any]]] = {}

    def put(self, analysis_id: str, result: dict[str, Any]) -> None:
        self._store[analysis_id] = (time.time(), result)

    def get(self, analysis_id: str) -> dict[str, Any] | None:
        entry = self._store.get(analysis_id)
        if entry is None:
            return None
        created, result = entry
        if time.time() - created > self._ttl:
            self._store.pop(analysis_id, None)
            return None
        return result


cache = AnalysisCache(settings.cache_ttl_seconds)
