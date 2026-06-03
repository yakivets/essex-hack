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
        # Sidecar metadata (filename, contract_type) used when saving to an account.
        # Kept out of the result dict so the API response stays a clean AnalysisResult.
        self._meta: dict[str, dict[str, Any]] = {}

    def put(
        self,
        analysis_id: str,
        result: dict[str, Any],
        meta: dict[str, Any] | None = None,
    ) -> None:
        self._store[analysis_id] = (time.time(), result)
        if meta is not None:
            self._meta[analysis_id] = meta

    def get(self, analysis_id: str) -> dict[str, Any] | None:
        entry = self._store.get(analysis_id)
        if entry is None:
            return None
        created, result = entry
        if time.time() - created > self._ttl:
            self._store.pop(analysis_id, None)
            self._meta.pop(analysis_id, None)
            return None
        return result

    def get_meta(self, analysis_id: str) -> dict[str, Any]:
        """Best-effort metadata for a cached analysis (empty dict if unknown)."""
        return self._meta.get(analysis_id, {})


cache = AnalysisCache(settings.cache_ttl_seconds)
