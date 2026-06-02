"""Grounded benchmarking: place each clause against the market reference corpus.

Replaces the LLM's guessed `benchmark` with a vector-search result: embed the
clause, find the most similar reference clauses in the same category, and derive
a percentile (how much harsher than typical) + the market-typical description.

Falls back to leaving the LLM's estimate in place when there's no category match.
"""

from __future__ import annotations

from typing import Any

from app.data.cuad_reference import reference_records
from app.pipeline import embeddings
from app.pipeline.vectorstore import CUAD, get_store

# Map the analyser's risk level to an approximate harshness (0..100) so we can
# position the clause within its category's reference distribution.
_RISK_HARSHNESS = {"high": 85.0, "medium": 60.0, "low": 30.0}


def ensure_reference_loaded() -> None:
    """Embed + load the seed corpus if the cuad collection is empty (idempotent)."""
    store = get_store()
    if store.count(CUAD) > 0:
        return
    records = reference_records()
    vectors = embeddings.embed([r["text"] for r in records])
    for r, v in zip(records, vectors):
        r["embedding"] = v
    store.add(CUAD, records)


def apply_benchmarks(clauses: list[dict[str, Any]]) -> None:
    """Mutate each clause in place, setting a grounded `benchmark` where possible."""
    ensure_reference_loaded()
    store = get_store()

    texts = [c.get("quote") or "" for c in clauses]
    vectors = embeddings.embed(texts)

    for clause, vec in zip(clauses, vectors):
        category = clause.get("category")
        if not category:
            continue
        matches = store.similar(CUAD, vec, k=5, category=category)
        if not matches:
            continue  # unknown category -> keep the LLM's estimate

        typical = matches[0].get("typical") or ""
        harshnesses = [float(m["harshness"]) for m in matches if m.get("harshness") is not None]
        clause_harshness = _RISK_HARSHNESS.get(clause.get("risk_level", ""), 60.0)

        if harshnesses:
            below = sum(1 for h in harshnesses if h <= clause_harshness)
            percentile = round(100 * below / len(harshnesses))
        else:
            percentile = round(clause_harshness)

        clause["benchmark"] = {"percentile": percentile, "typical": typical}
