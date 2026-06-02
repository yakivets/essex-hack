"""Market-reference clause corpus for benchmarking uploaded clauses.

Primary source: `cuad_clauses.jsonl` — real clauses extracted from the CUAD legal
corpus (category + harshness label per clause). When that file is present we build
the reference set from it; otherwise we fall back to the small hand-written seed
corpus below so the app still runs with no data file.

Each reference record has:
  * category   — coarse CUAD clause type (liability, payment, termination, …)
  * text       — the real clause language (what we embed for similarity)
  * typical    — one-line description of the market-standard version (by category)
  * harshness  — 0..100, how aggressive THIS clause is vs the market

`scripts/ingest_cuad.py` embeds these into Oracle 23ai; the in-memory store
auto-loads them on first use (see `benchmark.ensure_reference_loaded`).
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

# Real CUAD-derived clauses (built on the data/cuad-ingest branch).
_JSONL_PATH = Path(__file__).resolve().parent / "cuad_clauses.jsonl"

# Cap how many clauses per category we load into the live store. The full file
# has ~6.3k clauses; embedding all of them on first request (esp. via real OCI)
# would be slow, so we take a balanced subset. The full file stays in the repo
# for a one-off Oracle ingest, which can pass per_category=None.
_DEFAULT_PER_CATEGORY = 50

# CUAD harshness labels -> a 0..100 score (aligned with benchmark._RISK_HARSHNESS).
_HARSHNESS_SCORE = {"high": 85.0, "medium": 60.0, "low": 30.0}

# One readable "market typical" line per coarse CUAD category (shown in the UI).
_CATEGORY_TYPICAL = {
    "termination": "Termination for convenience with 30–60 days' notice; fair renewal",
    "liability": "Liability capped at ~12 months of fees, mutual",
    "payment": "Net-30 terms with late fees around 1–1.5% monthly",
    "ip": "Each party keeps its own pre-existing IP; you own your data",
    "obligations": "Balanced, mutual obligations without lock-ins",
    "jurisdiction": "Neutral or your home jurisdiction",
    "warranty": "Limited performance warranty with a cure remedy",
    "penalty": "Liquidated damages that reasonably pre-estimate actual loss",
    "confidentiality": "Mutual confidentiality with a 2–3 year survival period",
}

# Fallback hand-written seed corpus, used only if cuad_clauses.jsonl is absent.
# (category, typical-description, [(harshness, example_text), ...])
_FALLBACK_CORPUS: list[tuple[str, str, list[tuple[int, str]]]] = [
    (
        "Auto-renewal",
        "12-month renewal with 30–60 days' notice",
        [
            (25, "This Agreement renews for successive one-year terms unless either party gives 60 days' written notice of non-renewal."),
            (50, "This Agreement renews automatically for one-year periods unless cancelled 30 days before the end of the term."),
            (85, "This Agreement automatically renews for successive two-year periods unless written notice is given at least 30 days prior to the end of the then-current term."),
        ],
    ),
    (
        "Indemnification",
        "Mutual indemnity capped at 12 months of fees, IP carve-outs",
        [
            (30, "Each party shall indemnify the other for third-party claims arising from its own breach, subject to the limitation of liability."),
            (60, "Customer shall indemnify Provider for third-party claims arising from Customer's use of the Services."),
            (90, "Customer shall indemnify, defend, and hold harmless Provider from any and all third-party claims, without limitation, including the Provider's own negligence."),
        ],
    ),
    (
        "Liability Cap",
        "Liability capped at 12 months of fees, mutual",
        [
            (20, "Each party's aggregate liability is capped at the fees paid in the 12 months preceding the claim."),
            (55, "Provider's total liability shall not exceed the fees paid in the six (6) months preceding the claim."),
            (80, "Provider's total liability shall not exceed the fees paid in the three (3) months preceding the claim."),
        ],
    ),
    (
        "Price Changes",
        "Pricing fixed for the initial term; renewal increases capped at CPI",
        [
            (25, "Fees are fixed for the initial term; any increase at renewal is capped at CPI or 5%, whichever is lower."),
            (60, "Provider may modify pricing upon 60 days' written notice, effective at the next renewal."),
            (85, "Provider may modify pricing at any time upon 30 days' written notice to Customer, including during the current term."),
        ],
    ),
    (
        "Service Levels",
        "99.9% uptime with tiered service credits",
        [
            (20, "Provider guarantees 99.9% monthly uptime and issues service credits of up to 25% of monthly fees for misses."),
            (55, "Provider targets 99.5% monthly uptime with limited service credits on request."),
            (80, "Provider targets 99.9% monthly uptime, excluding scheduled maintenance, with no service credits."),
        ],
    ),
    (
        "Termination",
        "Termination for convenience with 30–60 days' notice, plus for-cause",
        [
            (25, "Either party may terminate for convenience on 60 days' written notice, or immediately for material breach."),
            (55, "Either party may terminate for material breach upon 30 days' written notice and opportunity to cure."),
            (85, "Customer may terminate only for the Provider's uncured material breach; termination for convenience is not permitted."),
        ],
    ),
    (
        "Governing Law",
        "Neutral or customer's jurisdiction",
        [
            (20, "This Agreement is governed by the laws of England and Wales, the customer's home jurisdiction."),
            (50, "This Agreement is governed by the laws of the State of Delaware."),
            (70, "This Agreement is governed by the laws of the Provider's home jurisdiction, and disputes must be brought there exclusively."),
        ],
    ),
    (
        "Confidentiality",
        "Mutual confidentiality, 2–3 year survival",
        [
            (25, "Each party shall protect the other's Confidential Information with reasonable care for three years after disclosure."),
            (55, "The receiving party shall keep Confidential Information secret for the term and two years thereafter."),
            (80, "The receiving party's confidentiality obligations survive in perpetuity and cover all information disclosed, however marked."),
        ],
    ),
    (
        "Intellectual Property",
        "Each party keeps its own IP; customer owns its data",
        [
            (25, "Each party retains ownership of its pre-existing intellectual property; Customer owns Customer Data."),
            (60, "Provider owns all improvements and feedback arising from the Services."),
            (85, "All intellectual property created in connection with this Agreement, including Customer's contributions, vests solely in Provider."),
        ],
    ),
    (
        "Payment Terms",
        "Net-30, late fees around 1–1.5% monthly",
        [
            (25, "Customer shall pay undisputed invoices within 30 days; late amounts accrue interest at 1% per month."),
            (55, "Customer shall pay invoices within 15 days; overdue amounts accrue 1.5% monthly interest."),
            (80, "Customer shall pay invoices within 7 days; overdue amounts accrue 1.5% monthly interest and the Provider may suspend Services immediately."),
        ],
    ),
    (
        "Data & Privacy",
        "Processing per a DPA with defined security standards",
        [
            (25, "Provider processes Customer Data only per the Data Processing Addendum and maintains ISO 27001-aligned controls."),
            (55, "Provider shall process Customer Data in accordance with its Privacy Policy."),
            (80, "Provider may use and disclose Customer Data for any purpose consistent with its policies, as amended from time to time."),
        ],
    ),
    (
        "Warranty",
        "Limited performance warranty with a cure remedy",
        [
            (25, "Provider warrants the Services will materially conform to the documentation and will re-perform non-conforming Services."),
            (55, "Provider warrants the Services for 30 days; the sole remedy is re-performance."),
            (85, "The Services are provided \"AS IS\" without warranty of any kind, and all implied warranties are disclaimed."),
        ],
    ),
]


def _records_from_jsonl(per_category: int | None) -> list[dict[str, Any]]:
    """Build reference records from the real CUAD jsonl (balanced subset)."""
    per_cat_count: dict[str, int] = {}
    records: list[dict[str, Any]] = []
    with _JSONL_PATH.open(encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            row = json.loads(line)
            category = (row.get("category") or "").lower()
            if not category:
                continue
            if per_category is not None and per_cat_count.get(category, 0) >= per_category:
                continue
            per_cat_count[category] = per_cat_count.get(category, 0) + 1
            records.append(
                {
                    "id": row.get("id") or f"cuad{len(records)}",
                    "category": category,
                    "text": row.get("text") or "",
                    "typical": _CATEGORY_TYPICAL.get(category, "Market-standard terms"),
                    "harshness": _HARSHNESS_SCORE.get((row.get("harshness") or "").lower(), 60.0),
                    "analysis_id": None,
                }
            )
    return records


def _records_from_fallback() -> list[dict[str, Any]]:
    """Flatten the hand-written seed corpus into vector-store records."""
    records: list[dict[str, Any]] = []
    idx = 0
    for category, typical, samples in _FALLBACK_CORPUS:
        for harshness, text in samples:
            idx += 1
            records.append(
                {
                    "id": f"cuad{idx}",
                    "category": category,
                    "text": text,
                    "typical": typical,
                    "harshness": float(harshness),
                    "analysis_id": None,
                }
            )
    return records


def reference_records(per_category: int | None = _DEFAULT_PER_CATEGORY) -> list[dict[str, Any]]:
    """Reference clauses (no embeddings). Real CUAD data if present, else the seed set.

    `per_category` caps how many clauses per category are loaded into the live
    store (None = no cap; used for a full Oracle ingest).
    """
    if _JSONL_PATH.exists():
        records = _records_from_jsonl(per_category)
        if records:
            return records
    return _records_from_fallback()
