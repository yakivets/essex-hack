# API Contract — the merge linchpin

> **This is the single most important document for parallel work.** The Lovable UI is built
> against these exact shapes (using mock data). The backend implements these exact shapes.
> Merge day = point the UI's `API_BASE_URL` at the real backend. Nothing else should need to change.
>
> **Rule:** Do **not** change a field name or shape without updating this file and telling both
> the UI and backend owners. Treat it as frozen once work starts.

Base URL (env-configurable on the frontend): `VITE_API_BASE_URL` (e.g. `http://localhost:8000`).

All responses are JSON. All errors use the standard error shape (bottom of file).

---

## Endpoints

### `GET /api/samples`
List the pre-loaded sample contracts shown on the landing page.
```json
[
  { "id": "saas-msa",  "name": "SaaS Master Services Agreement", "description": "A typical vendor MSA" },
  { "id": "nda",       "name": "Mutual NDA",                     "description": "Standard mutual NDA" },
  { "id": "supplier",  "name": "Supplier Agreement",            "description": "Goods supply contract" }
]
```

### `POST /api/analyze`
The main endpoint. Accepts an uploaded file **or** pasted text **or** a sample id.
- `multipart/form-data` with field `file` (PDF/DOCX), **or**
- `application/json` body: `{ "text": "..." }`, **or**
- `application/json` body: `{ "sample_id": "saas-msa" }`

Returns **`200`** with an `AnalysisResult` (see schema below). Processing is synchronous for the
hackathon (target < 40s). If we add async later, this returns `{ "analysis_id": "...", "status": "processing" }`
and the UI polls `GET /api/analysis/{id}` — but **default is synchronous**.

### `GET /api/analysis/{analysis_id}`
Re-fetch a previously computed `AnalysisResult` (used by chat + refresh). Returns the same
`AnalysisResult`. `404` if expired (results are cached in-memory with a TTL; stateless app).

### `POST /api/chat`
Q&A grounded in one analysed contract.
```json
// request
{ "analysis_id": "uuid", "message": "Can I cancel early?", "clause_id": "c4" }  // clause_id optional
// response
{
  "answer": "Yes, but only with 90 days' written notice, and a 40% penalty applies (clause 12).",
  "citations": [ { "clause_id": "c12", "quote": "Either party may terminate with 90 days' notice..." } ]
}
```

---

## Core schema: `AnalysisResult`

```jsonc
{
  "analysis_id": "uuid",
  "filename": "supplier_agreement.pdf",
  "contract_type": "Master Services Agreement",   // detected; null if unknown

  // ── LAYER 1: THE VERDICT (above the fold) ──────────────────────────────
  "verdict": {
    "risk_score": 74,                  // 0-100 integer
    "risk_level": "HIGH",              // "LOW" | "MEDIUM" | "HIGH"
    "summary_line": "Proceed with caution — 3 high-risk clauses",
    "summary_bullets": [               // plain-English TL;DR, ~5 bullets
      "Two-party SaaS services agreement between you (Client) and Vendor Ltd.",
      "Initial term 12 months, auto-renews for 3-year periods.",
      "Annual fee £24,000, paid quarterly in advance."
    ],
    "fairness": {
      "score": -0.6,                   // -1 (favours them) .. 0 (balanced) .. +1 (favours you)
      "favors": "counterparty",        // "you" | "counterparty" | "balanced"
      "label": "Leans in their favour"
    }
  },

  // ── KEY FACTS STRIP ───────────────────────────────────────────────────
  "key_facts": {
    "parties": [
      { "name": "Your Company Ltd", "role": "you" },
      { "name": "Vendor Ltd",       "role": "counterparty" }
    ],
    "effective_date": "2026-01-15",    // ISO date or null
    "term": "12 months, auto-renews 3 years",
    "value": "£24,000 / year",
    "auto_renewal": "Yes — 3-year terms, 90 days' notice to cancel",
    "notice_period": "90 days",
    "governing_law": "England & Wales"
  },

  // ── RED FLAGS (Layer 1 list) ──────────────────────────────────────────
  "red_flags": [
    {
      "id": "rf1",
      "title": "Unlimited liability",
      "severity": "HIGH",              // "LOW" | "MEDIUM" | "HIGH"
      "clause_id": "c3",               // links to a clause in document.clauses
      "explanation": "You are liable for all losses with no cap.",
      "why_risky": "A single dispute could exceed the contract's total value."
    }
  ],

  // ── LAYER 2: THE DOCUMENT COCKPIT ─────────────────────────────────────
  "document": {
    "format": "html",                  // "html" reflowed text with <mark> spans (core path)
    "html": "<p>1. Definitions ...</p><p data-clause=\"c3\">3. Liability ...</p>",
    "clauses": [
      {
        "id": "c3",
        "category": "Liability",       // see clause category enum below
        "heading": "3. Liability",
        "text": "The Client shall indemnify the Supplier against all losses...",
        "risk_level": "HIGH",          // "LOW" | "MEDIUM" | "HIGH" | "NONE"
        "start": 1234,                 // char offset into the plain text (for highlight mapping)
        "end": 1456,
        "plain_english": "You promise to cover all of the supplier's losses, without limit.",
        "why_risky": "Unlimited, one-sided indemnity. Standard practice is a mutual cap.",
        "benchmark": {
          "percentile": 85,            // "harsher than 85% of comparable clauses"
          "comparison": "harsher",     // "harsher" | "typical" | "more_favourable"
          "typical": "Liability is usually capped at 12 months' fees."
        },
        "suggested_fix": "Cap liability at the total fees paid in the prior 12 months, mutually.",
        "obligations": ["Indemnify the supplier for losses"]
      }
    ]
  },

  // ── DEPTH PANELS (Layer 2, all optional/stretch — UI hides if absent) ──
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
    { "label": "Effective date",        "date": "2026-01-15", "type": "start" },
    { "label": "Cancel-by deadline",    "date": "2026-10-17", "type": "notice" },
    { "label": "Auto-renews",           "date": "2027-01-15", "type": "renewal" }
  ],
  "exit": {
    "difficulty": "HARD",              // "EASY" | "MODERATE" | "HARD"
    "summary": "Locked in for 12 months; 90 days' notice + 40% penalty to leave early.",
    "termination_terms": ["90 days' written notice", "40% early-termination penalty"]
  },
  "scenarios": [
    { "question": "What if I pay late?",     "answer": "8% interest accrues; repeated lateness is a breach." },
    { "question": "What if I want out early?","answer": "90 days' notice and a 40% penalty on the remaining term." }
  ],
  "missing_clauses": [
    { "name": "Limitation of liability", "why_matters": "No cap means your exposure is unlimited." }
  ],
  "benchmark_summary": "Overall this contract is more vendor-favourable than ~80% of comparable SaaS MSAs."
}
```

### Clause category enum
`"Definitions" | "Payment" | "Liability" | "Indemnity" | "Termination" | "Confidentiality" |
"IP" | "Warranty" | "Data Protection" | "Governing Law" | "Renewal" | "Penalty" | "Other"`

### Risk level → colour (UI convention)
`HIGH → red` · `MEDIUM → amber` · `LOW → green` · `NONE → neutral/no highlight`.

---

## Standard error shape
```json
{ "error": { "code": "UNSUPPORTED_FILE", "message": "Only PDF and DOCX are supported." } }
```
Common codes: `UNSUPPORTED_FILE`, `FILE_TOO_LARGE`, `EMPTY_DOCUMENT`, `ANALYSIS_FAILED`,
`NOT_FOUND` (expired analysis), `RATE_LIMITED`.

---

## Contract-stability notes for the UI team
- **Layer 1 fields (`verdict`, `key_facts`, `red_flags`, `document.clauses`) are guaranteed.**
  Build the whole core experience on these.
- **Depth panels (`obligations`, `money`, `dates`, `exit`, `scenarios`, `missing_clauses`) are
  best-effort / stretch.** The UI must render gracefully if any are `null` or `[]`.
- `document.html` is the reflowed contract; wrap risky clauses in elements carrying
  `data-clause="<id>"` so click-to-highlight maps cleanly to `document.clauses`.
