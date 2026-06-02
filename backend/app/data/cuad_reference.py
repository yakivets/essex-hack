"""Market-reference clause corpus (a small, CUAD-flavoured seed set).

This stands in for the full CUAD-derived `cuad_clauses` collection. Each entry is
a representative market clause with:
  * category   — clause type (matches the categories the analyser emits)
  * text       — example clause language (what we embed for similarity)
  * typical    — one-line description of the market-standard version
  * harshness  — 0..100, how aggressive THIS example is vs the market

Multiple entries per category span a harshness range, so we can place an uploaded
clause on a percentile within its category. `scripts/ingest_cuad.py` embeds these
into Oracle 23ai; the in-memory store auto-loads them on first use.
"""

from __future__ import annotations

from typing import Any

# (category, typical-description, [(harshness, example_text), ...])
_CORPUS: list[tuple[str, str, list[tuple[int, str]]]] = [
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


def reference_records() -> list[dict[str, Any]]:
    """Flatten the corpus into vector-store records (without embeddings)."""
    records: list[dict[str, Any]] = []
    idx = 0
    for category, typical, samples in _CORPUS:
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
