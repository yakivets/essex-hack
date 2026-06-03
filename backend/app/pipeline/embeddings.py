"""Text embeddings for vector search.

FAKE_OCI=1  -> deterministic hash-based vectors (offline, no cloud, repeatable).
FAKE_OCI=0  -> OCI Generative AI `embed_text` (batched).

Both paths return L2-normalised vectors of length `settings.embed_dim`, so cosine
similarity is just a dot product and the in-memory and Oracle backends agree.
"""

from __future__ import annotations

import hashlib
import math

from app.config import settings

# OCI embed_text accepts at most 96 inputs per request.
_OCI_BATCH = 96


def embed(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    if settings.fake_oci:
        return [_fake_vector(t) for t in texts]
    return _oci_embed(texts)


def embed_one(text: str) -> list[float]:
    return embed([text])[0]


def _normalise(vec: list[float]) -> list[float]:
    norm = math.sqrt(sum(x * x for x in vec))
    if norm == 0:
        return vec
    return [x / norm for x in vec]


def _fake_vector(text: str) -> list[float]:
    """Deterministic pseudo-embedding: hash the text into `embed_dim` floats.

    Not semantically meaningful, but stable and unit-norm, so similarity is
    self-consistent — good enough to exercise the vector plumbing offline.
    """
    dim = settings.embed_dim
    vec: list[float] = []
    counter = 0
    seed = text.lower().encode("utf-8")
    while len(vec) < dim:
        digest = hashlib.sha256(seed + counter.to_bytes(4, "little")).digest()
        for i in range(0, len(digest), 4):
            if len(vec) >= dim:
                break
            n = int.from_bytes(digest[i : i + 4], "little")
            vec.append((n / 2**32) * 2.0 - 1.0)  # map to [-1, 1)
        counter += 1
    return _normalise(vec)


def _oci_embed(texts: list[str]) -> list[list[float]]:
    from oci.generative_ai_inference import models as m

    from app.oci.genai import _client  # reuse the configured inference client

    client = _client()
    model_id = settings.oci_genai_embed_model
    serving = m.OnDemandServingMode(model_id=model_id)

    out: list[list[float]] = []
    for start in range(0, len(texts), _OCI_BATCH):
        batch = texts[start : start + _OCI_BATCH]
        details = m.EmbedTextDetails(
            serving_mode=serving,
            inputs=batch,
            compartment_id=settings.oci_compartment_id,
            truncate="END",
        )
        resp = client.embed_text(details)
        out.extend(_normalise(v) for v in resp.data.embeddings)
    return out
