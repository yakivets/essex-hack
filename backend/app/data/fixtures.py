"""Canned data for Stage A — a hard-coded AnalysisResult + sample list.

Mirrors the frontend's mockAnalysis.ts so the UI renders identically whether it
runs in mock mode or against this backend. Real pipeline output replaces
`build_canned_result()` slice by slice later; the shape never changes.
"""

from __future__ import annotations

import copy
from typing import Any

SAMPLES: list[dict[str, str]] = [
    {
        "id": "saas-msa",
        "name": "SaaS Master Services Agreement",
        "description": "A vendor-friendly MSA with auto-renewal and broad indemnity.",
    },
    {
        "id": "freelance-nda",
        "name": "Mutual NDA",
        "description": "Two-page NDA from a prospective enterprise client.",
    },
    {
        "id": "office-lease",
        "name": "Commercial Office Lease",
        "description": "36-month lease with personal guarantee and CAM escalations.",
    },
]


def _clause(
    cid: str,
    category: str,
    risk: str,
    quote: str,
    plain: str,
    why: str | None = None,
    fix: str | None = None,
    bench: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return {
        "id": cid,
        "category": category,
        "risk_level": risk,
        "quote": quote,
        "plain_english": plain,
        "why_risky": why,
        "suggested_fix": fix,
        "benchmark": bench,
    }


_DOCUMENT_HTML = """
      <h3>Master Services Agreement</h3>
      <p><span data-clause="c1">This Agreement is entered into as of the Effective Date between Acme Corp ("Customer") and Globex SaaS ("Provider") for an initial term of twenty-four (24) months.</span></p>
      <h4>1. Term &amp; Renewal</h4>
      <p><span data-clause="c2">This Agreement shall automatically renew for successive twenty-four (24) month periods unless either party provides written notice of non-renewal at least thirty (30) days prior to the end of the then-current term.</span></p>
      <h4>2. Fees</h4>
      <p><span data-clause="c3">Customer shall pay the fees set forth in the applicable Order Form.</span> <span data-clause="c6">Provider may modify pricing upon thirty (30) days' written notice to Customer.</span></p>
      <h4>3. Indemnification</h4>
      <p><span data-clause="c4">Customer shall indemnify, defend, and hold harmless Provider from any and all third-party claims arising out of Customer's use of the Services.</span></p>
      <h4>4. Limitation of Liability</h4>
      <p><span data-clause="c5">Provider's total liability shall not exceed the fees paid in the three (3) months preceding the claim.</span></p>
      <h4>5. Data &amp; Privacy</h4>
      <p><span data-clause="c7">Provider shall process Customer Data in accordance with its Privacy Policy.</span></p>
      <h4>6. Service Levels</h4>
      <p><span data-clause="c8">Provider targets 99.9% monthly uptime, excluding scheduled maintenance.</span></p>
      <h4>7. Governing Law</h4>
      <p><span data-clause="c9">This Agreement shall be governed by the laws of the State of Delaware.</span></p>
      <h4>8. Termination</h4>
      <p><span data-clause="c10">Either party may terminate this Agreement for material breach upon thirty (30) days' written notice and opportunity to cure.</span></p>
    """


_CANNED: dict[str, Any] = {
    "id": "canned-1",
    "verdict": {
        "risk_score": 72,
        "risk_level": "high",
        "summary_line": "This contract leans heavily toward the vendor.",
        "summary_bullets": [
            "Auto-renews for 24 months with only 30 days' notice",
            "Uncapped indemnification for IP and data claims",
            "Vendor can change pricing with 30 days' notice",
            "Governing law set to vendor's home jurisdiction",
            "No SLA credits despite a 99.9% uptime promise",
        ],
        "fairness": {"score": -0.55, "label": "Favours the vendor"},
    },
    "benchmark_summary": "Tougher than 78% of comparable SaaS agreements we've seen.",
    "key_facts": {
        "parties": "Acme Corp ↔ Globex SaaS",
        "term": "24 months",
        "value": "$48,000 / year",
        "auto_renewal": "Yes — 24 months",
        "notice": "30 days",
        "governing_law": "Delaware, USA",
    },
    "red_flags": [
        {
            "id": "f1", "clause_id": "c2", "title": "Aggressive auto-renewal", "severity": "high",
            "explanation": "Renews for another 24 months unless cancelled 30 days before term ends.",
            "why_risky": "Easy to miss the window and be locked in for two more years.",
        },
        {
            "id": "f2", "clause_id": "c4", "title": "Uncapped indemnification", "severity": "high",
            "explanation": "You indemnify the vendor for all third-party claims without a cap.",
            "why_risky": "A single dispute could exceed the total contract value many times over.",
        },
        {
            "id": "f3", "clause_id": "c6", "title": "Unilateral price changes", "severity": "medium",
            "explanation": "Vendor may increase fees with 30 days' notice during the term.",
            "why_risky": "Budget certainty disappears; switching costs make pushback hard.",
        },
        {
            "id": "f4", "clause_id": "c8", "title": "No SLA remedy", "severity": "medium",
            "explanation": "Uptime target of 99.9% is stated but no credits or remedies are offered.",
            "why_risky": "Promise without a remedy is effectively unenforceable.",
        },
    ],
    "clauses": [
        _clause("c1", "Parties & Term", "low", "This Agreement is entered into as of the Effective Date between Acme Corp and Globex SaaS for an initial term of twenty-four (24) months.", "Defines who's signing and the 24-month starting term."),
        _clause("c2", "Auto-renewal", "high", "This Agreement shall automatically renew for successive twenty-four (24) month periods unless either party provides written notice of non-renewal at least thirty (30) days prior to the end of the then-current term.", "Renews for another 2 years unless you cancel 30 days before term ends.", "30 days is a short window for a 2-year commitment; most teams miss it.", "Shorten renewal to 12 months and extend notice to 60–90 days.", {"percentile": 82, "typical": "12-month renewal with 60-day notice"}),
        _clause("c3", "Fees", "low", "Customer shall pay the fees set forth in the applicable Order Form.", "Standard fee reference to the Order Form."),
        _clause("c4", "Indemnification", "high", "Customer shall indemnify, defend, and hold harmless Provider from any and all third-party claims arising out of Customer's use of the Services.", "You cover the vendor for any third-party lawsuit related to your use — with no cap.", "An uncapped indemnity can dwarf the contract's value if a claim ever materialises.", "Cap indemnity at fees paid in the prior 12 months and carve out vendor IP claims.", {"percentile": 71, "typical": "Mutual indemnity capped at 12 months of fees"}),
        _clause("c5", "Liability Cap", "medium", "Provider's total liability shall not exceed the fees paid in the three (3) months preceding the claim.", "Vendor's max payout if they mess up is 3 months of fees.", "A 3-month cap is unusually low and asymmetric to your uncapped indemnity.", "Raise to 12 months of fees and make caps mutual.", {"percentile": 65, "typical": "12 months of fees"}),
        _clause("c6", "Price Changes", "medium", "Provider may modify pricing upon thirty (30) days' written notice to Customer.", "Vendor can raise prices mid-term with 30 days' notice.", "Removes budget certainty during the term and pressures renewal.", "Lock pricing for the initial term; cap renewal increases at CPI or 5%."),
        _clause("c7", "Data & Privacy", "low", "Provider shall process Customer Data in accordance with its Privacy Policy.", "Vendor follows its own privacy policy when handling your data."),
        _clause("c8", "Service Levels", "medium", "Provider targets 99.9% monthly uptime, excluding scheduled maintenance.", "Uptime target with no service credits if missed.", "A target without a remedy is marketing, not a contract right.", "Add tiered service credits (e.g. 10/25/100% of monthly fee)."),
        _clause("c9", "Governing Law", "low", "This Agreement shall be governed by the laws of the State of Delaware.", "Disputes are settled under Delaware law in vendor's home turf."),
        _clause("c10", "Termination", "medium", "Either party may terminate this Agreement for material breach upon thirty (30) days' written notice and opportunity to cure.", "Either side can exit for a serious breach after a 30-day cure period.", "Termination for convenience isn't permitted — you're locked in absent breach.", "Add termination for convenience with 60 days' notice."),
    ],
    "document": {"html": _DOCUMENT_HTML},
    "obligations": {
        "yours": [
            "Pay invoices within 30 days of receipt",
            "Indemnify vendor for third-party claims (uncapped)",
            "Provide written notice of non-renewal 30 days before term end",
            "Maintain reasonable security on your endpoints",
        ],
        "theirs": [
            "Deliver the Services per the Order Form",
            "Target 99.9% monthly uptime (no credits)",
            "Process customer data per privacy policy",
        ],
    },
    "money": {
        "total_value": "$96,000 over 24 months",
        "payment_schedule": "Quarterly in advance",
        "penalties": ["1.5% monthly late fee on overdue invoices", "Suspension after 15 days past due"],
        "liability_cap": "3 months of fees",
    },
    "dates": [
        {"label": "Effective date", "date": "2026-06-01", "type": "start"},
        {"label": "First payment", "date": "2026-06-15", "type": "payment"},
        {"label": "Renewal notice deadline", "date": "2028-05-01", "type": "notice"},
        {"label": "Term ends", "date": "2028-05-31", "type": "end"},
    ],
    "exit": {
        "difficulty": "hard",
        "summary": "No termination for convenience. You're tied in unless there's a material breach.",
        "termination_terms": [
            "Material breach with 30-day cure period",
            "Insolvency of either party",
            "No early termination fee defined (ambiguous)",
        ],
    },
    "missing_clauses": [
        {"name": "Data portability on exit", "why_matters": "Without it you may struggle to retrieve your data when leaving."},
        {"name": "Source-code escrow", "why_matters": "Protects continuity if the vendor goes out of business."},
        {"name": "Mutual non-solicitation", "why_matters": "Standard protection so neither side poaches employees."},
    ],
    "scenarios": [
        {"question": "What if the vendor raises prices 20% next year?", "answer": "They may, with 30 days' notice. You'd have to accept or breach — there's no opt-out for price changes."},
        {"question": "What if there's a data breach?", "answer": "Their liability is capped at 3 months of fees; your indemnity to them is uncapped — a serious asymmetry."},
        {"question": "What if you want to leave after 12 months?", "answer": "You can't, absent a material breach by the vendor. There's no termination for convenience."},
    ],
}


def build_canned_result(analysis_id: str) -> dict[str, Any]:
    """Return a deep copy of the canned AnalysisResult with the given id."""
    result = copy.deepcopy(_CANNED)
    result["id"] = analysis_id
    return result
