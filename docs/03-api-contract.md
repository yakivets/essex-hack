# API Contract — the merge linchpin

> **This is the single most important document for parallel work.** The Lovable UI is built
> against these exact shapes (using mock data). The backend implements these exact shapes.
> Merge day = point the UI's `VITE_API_BASE_URL` at the real backend. Nothing else should change.
>
> **Source of truth in code:** `frontend/src/lib/types.ts` and `backend/app/models/schemas.py`.
> Those two files match each other exactly; this doc mirrors them. **Do not** change a field name
> or shape without updating *all three* in the same change and telling the UI + backend owners.

Base URL (env-configurable on the frontend): `VITE_API_BASE_URL` (e.g. `http://localhost:8000`).
Empty = the UI uses local mock data.

All responses are JSON. All errors use the standard error shape (bottom of file).

---

## Endpoints

### `GET /api/samples`
List the pre-loaded sample contracts shown on the landing page. Returns `Sample[]`:
```json
[
  { "id": "saas-msa", "name": "SaaS Master Services Agreement", "description": "A typical vendor MSA" },
  { "id": "nda",      "name": "Mutual NDA",                     "description": "Standard mutual NDA" },
  { "id": "supplier", "name": "Supplier Agreement",            "description": "Goods supply contract" }
]
```

### `POST /api/analyze`
The main endpoint. Accepts an uploaded file **or** pasted text **or** a sample id.
Always sent as `multipart/form-data` with exactly one of these fields:
- `file` — the uploaded contract (PDF/DOCX), **or**
- `text` — pasted contract text, **or**
- `sample_id` — id of a built-in sample (e.g. `saas-msa`)

Returns **`200`** with an `AnalysisResult` (see schema below). Processing is **synchronous** for the
hackathon (target < 40s; real runs ~45s).

### `GET /api/analysis/{id}`
Re-fetch a previously computed `AnalysisResult` (used by chat + refresh). Returns the same
`AnalysisResult`. `404` if expired (results are cached in-memory with a TTL; stateless app).

### `POST /api/chat`
Q&A grounded in one analysed contract.
```json
// request — ChatRequest
{ "analysis_id": "uuid", "message": "Can I cancel early?", "clause_id": "c4" }  // clause_id optional
// response — ChatResponse
{
  "answer": "Yes, but only with 90 days' written notice, and a 40% penalty applies (clause 8).",
  "citations": [ { "clause_id": "c8", "quote": "Either party may terminate with 90 days' notice..." } ]
}
```

---

## Core schema: `AnalysisResult`

Risk levels are **lowercase**: `"high" | "medium" | "low"`.

```jsonc
{
  "id": "uuid",

  // ── LAYER 1: THE VERDICT (above the fold) ──────────────────────────────
  "verdict": {
    "risk_score": 74,                  // 0-100 integer
    "risk_level": "high",              // "low" | "medium" | "high"
    "summary_line": "Proceed with caution — 3 high-risk clauses",
    "summary_bullets": [               // plain-English TL;DR, ~5 bullets
      "Two-party SaaS services agreement between you (Client) and Vendor Ltd.",
      "Initial term 12 months, auto-renews for 3-year periods.",
      "Annual fee £24,000, paid quarterly in advance."
    ],
    "fairness": {
      "score": -0.6,                   // -1 (favours them) .. 0 (balanced) .. +1 (favours you)
      "label": "Leans in their favour"
    }
  },

  "benchmark_summary": "More vendor-favourable than ~80% of comparable SaaS MSAs.", // optional

  // ── KEY FACTS STRIP (all fields optional) ─────────────────────────────
  "key_facts": {
    "parties": "Your Company Ltd (you) and Vendor Ltd (counterparty)",
    "term": "12 months, auto-renews 3 years",
    "value": "£24,000 / year",
    "auto_renewal": "Yes — 3-year terms, 90 days' notice to cancel",
    "notice": "90 days",
    "governing_law": "England & Wales"
  },

  // ── RED FLAGS (Layer 1 list) ──────────────────────────────────────────
  "red_flags": [
    {
      "id": "rf1",
      "clause_id": "c3",               // links to a clause in clauses[]
      "title": "Unlimited liability",
      "severity": "high",              // "low" | "medium" | "high"
      "explanation": "You are liable for all losses with no cap.",
      "why_risky": "A single dispute could exceed the contract's total value."
    }
  ],

  // ── CLAUSES (Layer 2 — top-level, NOT nested under document) ──────────
  "clauses": [
    {
      "id": "c3",
      "category": "Liability",         // free-form string (see suggested categories below)
      "risk_level": "high",            // "low" | "medium" | "high"
      "quote": "The Client shall indemnify the Supplier against all losses...",
      "plain_english": "You promise to cover all of the supplier's losses, without limit.",
      "why_risky": "Unlimited, one-sided indemnity. Standard practice is a mutual cap.", // optional
      "suggested_fix": "Cap liability at the total fees paid in the prior 12 months, mutually.", // optional
      "benchmark": {                   // optional
        "percentile": 85,              // "harsher than 85% of comparable clauses"
        "typical": "Liability is usually capped at 12 months' fees."
      }
    }
  ],

  // ── DOCUMENT (the rendered contract; clause spans carry data-clause) ──
  "document": {
    "html": "<p>1. Definitions ...</p><p><span data-clause=\"c3\">3. Liability ...</span></p>"
  },

  // ── DEPTH PANELS (all optional/best-effort — UI hides if absent) ──────
  "obligations": {
    "yours":  ["Pay £6,000 per quarter in advance", "Provide 90 days' notice to cancel"],
    "theirs": ["Provide the service with 99.5% uptime"]
  },
  "money": {
    "total_value": "£24,000 / year",
    "payment_schedule": "Quarterly in advance",
    "penalties": ["40% of remaining term on early termination", "8% interest on late payment"],
    "liability_cap": "None (unlimited)"
  },
  "dates": [
    { "label": "Effective date",     "date": "2026-01-15", "type": "start" },
    { "label": "Cancel-by deadline", "date": "2026-10-17", "type": "notice" },
    { "label": "Auto-renews",        "date": "2027-01-15", "type": "renewal" }
  ],
  "exit": {
    "difficulty": "hard",            // "easy" | "moderate" | "hard"
    "summary": "Locked in for 12 months; 90 days' notice + 40% penalty to leave early.",
    "termination_terms": ["90 days' written notice", "40% early-termination penalty"]
  },
  "missing_clauses": [
    { "name": "Limitation of liability", "why_matters": "No cap means your exposure is unlimited." }
  ],
  "scenarios": [
    { "question": "What if I pay late?",      "answer": "8% interest accrues; repeated lateness is a breach." },
    { "question": "What if I want out early?","answer": "90 days' notice and a 40% penalty on the remaining term." }
  ]
}
```

### Suggested clause categories
Free-form string, but prefer one of:
`"Definitions" | "Payment" | "Liability" | "Indemnity" | "Termination" | "Confidentiality" |
"IP" | "Warranty" | "Data Protection" | "Governing Law" | "Renewal" | "Penalty" | "Other"`

### Risk level → colour (UI convention)
`high → red` · `medium → amber` · `low → green`.

---

## Standard error shape
```json
{ "error": { "code": "UNSUPPORTED_FILE", "message": "Only PDF and DOCX are supported." } }
```
Common codes: `UNSUPPORTED_FILE`, `FILE_TOO_LARGE`, `EMPTY_DOCUMENT`, `ANALYSIS_FAILED`,
`NOT_FOUND` (expired analysis), `RATE_LIMITED`.

---

## Contract-stability notes for the UI team
- **Layer 1 fields (`verdict`, `key_facts`, `red_flags`, `clauses`, `document`) are guaranteed.**
  Build the whole core experience on these.
- **Depth panels (`obligations`, `money`, `dates`, `exit`, `scenarios`, `missing_clauses`,
  `benchmark_summary`) are best-effort.** The UI must render gracefully if any are `null` or `[]`.
- `document.html` is the rendered contract; risky clauses are wrapped in elements carrying
  `data-clause="<id>"` so click-to-highlight maps cleanly to a clause `id` in `clauses[]`.
