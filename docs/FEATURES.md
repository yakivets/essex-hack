# PactPilot — Features

_A complete catalogue of everything PactPilot does today, end to end. This reflects the **current
committed version** (`mykyta-dev`). For run/resume notes see [`STATUS.md`](STATUS.md); for the
"is it actually working?" checklist see [`IMPLEMENTATION-TRACKER.md`](IMPLEMENTATION-TRACKER.md)._

> ⚠️ **Not legal advice.** PactPilot is a first-pass triage tool, not a lawyer.

---

## 1. The core flow

A small-business founder lands on the page, drops in a contract, and ~30–45s later has a full
review. No account is required to run an analysis — accounts only add saved history.

```
Upload / paste / pick a sample
        │
        ▼
Animated "contract under review" processing screen
        │
        ▼
Results cockpit  ──▶  Negotiation co-pilot (draft an email)
        │            └▶  PDF export
        ▼
(optional) Sign in  →  analysis auto-saved to your Dashboard
```

---

## 2. Input options

| Input | How | Notes |
|---|---|---|
| **File upload** | Drag-drop or browse on the landing hero | PDF (`pdfplumber`) and DOCX (`python-docx`) are extracted to text server-side |
| **Paste text** | Paste raw contract text | Fastest path; no parsing |
| **Sample contract** | One-click chips | 3 built-in samples spanning the risk spectrum (below) |

**Built-in samples** (`backend/app/data/samples/`):
- **Dangerous** — a developer-drafted agency agreement (lopsided terms).
- **Suspicious** — a SaaS subscription with quiet catches (auto-renewal, fees).
- **Legit** — a balanced mutual NDA.

The backend tolerates an unknown `sample_id` by degrading to the first available sample rather than
erroring.

---

## 3. The analysis (what you get back)

A single structured LLM call (OCI GenAI, `cohere.command-r-08-2024`) turns the contract into an
`AnalysisResult`. The result has two tiers:

- **Layer-1 (guaranteed):** `verdict`, `key_facts`, `clauses`, `red_flags`, `document` — validated
  strictly; always present.
- **Depth panels (best-effort):** `obligations`, `money`, `dates`, `exit`, `missing_clauses`,
  `scenarios`, `benchmark_summary` — validated item-by-item; a malformed entry is dropped rather
  than failing the whole analysis (handles LLM null-field drift, e.g. a null `date`).

### 3.1 Verdict
- **Risk score** 0–100 (higher = riskier for the user).
- **Risk level** high / medium / low.
- **Plain-English summary line** + 3–5 summary bullets.
- **Fairness meter** — a −1…+1 score (favours them ↔ favours you) with a short label.

### 3.2 Key facts
Parties, term, value, auto-renewal, notice period, governing law — each `null` if not found.

### 3.3 Document cockpit
The contract rendered with each clause wrapped in a `data-clause` span so the UI can highlight by
risk and sync clicks. Per clause you get: category, risk level, the **verbatim quote**, a
plain-English meaning, why it's risky, a suggested fix, and a market benchmark.

### 3.4 Red flags
The genuinely dangerous clauses, ranked, each with a title, severity, explanation, and a
`clause_id` link back into the document.

### 3.5 Depth panels
- **Obligations** — what *you* must do vs what *they* must do.
- **Money** — total value, payment schedule, penalties, liability cap.
- **Dates** — key dates/deadlines (label, date, type).
- **Exit** — how hard it is to leave (easy/moderate/hard) + termination terms.
- **Missing clauses** — standard protections that are *absent* and why they matter.
- **Scenarios** — 2–3 "what happens if…" Q&As.

---

## 4. Market benchmarks (vector search)

Each clause is embedded (`cohere.embed-english-v3.0`, 1024-dim) and compared against a **real CUAD
legal corpus** (`cuad_clauses.jsonl`, ~6.3k clauses) via cosine similarity. The most similar
in-category references set a grounded `{percentile, typical}` — e.g. *"harsher than 78% of
comparable clauses."* When a clause's category is unknown, the LLM's own estimate is kept.

- **Vector store:** Oracle Autonomous DB 23ai native `VECTOR` + `VECTOR_DISTANCE` (via `oracledb`)
  **or** an in-memory cosine fallback. The store is chosen by whether `ADB_DSN` is set, so the app
  runs with no database. (Currently running on the in-memory fallback.)
- A one-off `scripts/ingest_cuad.py` builds the `cuad_clauses` collection for the Oracle path.

---

## 5. Grounded Q&A chat (RAG)

Ask anything about the contract. The analysed clauses are indexed into a `doc_clauses` vector
collection; the chat retrieves the top-k most relevant clauses and answers **grounded in them**,
returning **citations** (clause id + verbatim quote) the UI links back to the document. You can
also ask about a specific clause by passing its `clause_id`.

---

## 6. Negotiation co-pilot

From the results screen, turn the analysis into a **ready-to-send negotiation email** — entirely
client-side from the existing data (no extra API call, instant).

- Pick which red flags to include.
- Choose a **tone**: *collaborative* (warm, "align on a few points") or *firm* ("required changes
  before signing").
- Each selected flag becomes a concrete "ask", preferring the clause's `suggested_fix`.
- Copy the drafted email and send it.

Implementation: `frontend/src/lib/negotiationEmail.ts` + `NegotiateModal` / `NegotiatePanel`.

---

## 7. Accounts & dashboard

Accounts are **optional** — analysis works fully anonymously. Signing in unlocks saved history.

- **Auth:** email + password register / login. Passwords hashed (bcrypt); sessions are HS256 JWTs
  (`Authorization: Bearer <token>`, 7-day expiry). Token stored client-side and attached to every
  request by `src/lib/api.ts`.
- **Auto-save:** when a logged-in user views a fresh result it's persisted automatically.
  Idempotent — re-saving the same id returns the existing row (covers analyse-anon → log-in → save).
- **Dashboard:** lists your saved analyses newest-first (filename, contract type, risk score/level,
  date). Reopen any saved contract — `GET /api/analysis/{id}` falls back to the DB (owner-checked)
  once the in-memory cache has expired.
- **Sign-in-to-unlock teaser:** anonymous users can run an analysis and see the verdict, but the
  full report (document, all clauses, benchmarks, chat) is blurred behind a sign-in prompt
  (`BlurTeaser`). Logging in while viewing reveals it *and* auto-saves it.
- **Contract type label:** a keyword scan over the document + clause categories gives a friendly
  type (NDA, SaaS Agreement, Lease, …) for the dashboard — no extra LLM call.

**Storage:** SQLAlchemy. SQLite locally (`pactpilot.db`); swappable to Oracle ADB by changing
`DATABASE_URL` to the `oracle+oracledb://` driver (same code path).

---

## 8. Export

One click produces a **branded PDF summary** of the report (jsPDF, `src/lib/exportPdf.ts`,
dynamically imported so it never runs during SSR).

---

## 9. UI / UX

- **No-scroll two-pane cockpit:** document left (`DocumentPane`), risk + chat right (`RiskRail`).
- **Risk highlighting:** clauses coloured by risk; click a highlight ↔ clause detail; filters + a
  minimap for navigation.
- **Details drawer:** depth panels (obligations, money, dates, exit…) in a shadcn `Sheet`.
- **Light / dark theme:** CSS-variable tokens, top-bar toggle, persisted to `localStorage`,
  respects OS preference.
- **Animated processing screen:** a "contract under review" scene (inline SVG/CSS — no chart lib).
- **Risk gauge + fairness meter:** inline SVG, no chart dependency.
- **SSR:** TanStack Start renders on the server; anything touching `window`/`document` runs in
  `useEffect` or a dynamic import.

---

## 10. Reliability & "always works offline"

PactPilot is designed to demo with **zero cloud access**:

| Layer | Offline switch | Behaviour |
|---|---|---|
| Backend AI | `FAKE_OCI=1` | Canned `AnalysisResult`; deterministic stub embeddings |
| Frontend | empty `VITE_API_BASE_URL` | Built-in mock data for every screen |
| Vector store | unset `ADB_DSN` | In-memory cosine over the real CUAD corpus |
| Accounts DB | default `DATABASE_URL` | Local SQLite |

Additional hardening:
- Blocking OCI HTTP calls are off-loaded to a threadpool so one ~45s analysis doesn't stall the
  event loop / other requests.
- OCI read timeout raised to 240s (large structured generations exceed the 60s default).
- `MAX_CLAUSES=8` caps JSON size for latency/reliability.
- JSON parse with one retry; Layer-1 strict, depth panels degrade gracefully.
- In-memory TTL result cache (default 1h) powers chat + refresh-by-id without a database.

---

## 11. API surface

| Method | Path | Purpose | Auth |
|---|---|---|---|
| `GET` | `/api/samples` | The 3 built-in samples | — |
| `POST` | `/api/analyze` | `file` / `text` / `sample_id` → `AnalysisResult` | optional |
| `GET` | `/api/analysis/{id}` | Re-fetch a result (cache → DB fallback) | optional (owner) |
| `POST` | `/api/chat` | `{analysis_id, message, clause_id?}` → `{answer, citations[]}` | — |
| `GET` | `/api/analyses` | Current user's saved analyses (summaries) | required |
| `POST` | `/api/analyses` | Persist a cached analysis to the account | required |
| `POST` | `/api/auth/register` | Create account → `{token, user}` | — |
| `POST` | `/api/auth/login` | Log in → `{token, user}` | — |
| `GET` | `/api/auth/me` | Current user | required |
| `GET` | `/health` | Liveness + whether `FAKE_OCI` is on | — |

The exact JSON shapes are the **frozen contract**: `frontend/src/lib/types.ts` ⇆
`backend/app/models/schemas.py` ⇆ [`03-api-contract.md`](03-api-contract.md). Change all three
together or none.

---

## 12. Tech stack (at a glance)

| | |
|---|---|
| **Frontend** | React 19 · TypeScript · Vite · TanStack Start (SSR) · Tailwind v4 · shadcn/ui · lucide-react · jsPDF |
| **Backend** | Python 3.11 · FastAPI · Pydantic · SQLAlchemy · **no LangChain / no LangGraph** |
| **AI** | OCI Generative AI via the raw `oci` SDK — chat `cohere.command-r-08-2024`, embeddings `cohere.embed-english-v3.0` |
| **Vector DB** | Oracle ADB 23ai native `VECTOR` (`oracledb`) — or in-memory cosine fallback |
| **Accounts DB** | SQLite locally; Oracle ADB via the same SQLAlchemy `oracle+oracledb://` driver |
| **Auth** | bcrypt password hashing · HS256 JWT (PyJWT) |
| **Docs parsing** | pdfplumber (PDF) · python-docx (DOCX) |
| **Corpus** | CUAD legal clause corpus (`cuad_clauses.jsonl`) |

---

## 13. What's not in this version yet

- **Multi-agent analysis** — per-clause specialist agents + a verdict synthesiser (designed in
  [`09-multi-agent-plan.md`](09-multi-agent-plan.md); a working draft exists on a side branch/stash).
- **Oracle ADB connected** — code is ready; currently on the in-memory fallback.
- **OCI Object Storage** — ephemeral raw-upload store.
- **OCI Compute deploy** — the app runs locally / offline; not yet hosted on OCI.
