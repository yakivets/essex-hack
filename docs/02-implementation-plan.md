# Implementation Plan — Master

This is the top-level plan. It ties together the UI (Lovable), the backend (**FastAPI only — no
LangChain**), the data/vector layer (Oracle 23ai), and deployment (OCI). Detailed step-by-step lives
in the linked docs.

- Idea & scope → [`01-project-brief.md`](01-project-brief.md)
- **The merge contract** → [`03-api-contract.md`](03-api-contract.md) ← freeze this first
- UI build → [`04-lovable-ui-prompt.md`](04-lovable-ui-prompt.md)
- Backend build → [`05-backend-plan.md`](05-backend-plan.md)
- Oracle + deploy → [`06-oracle-setup.md`](06-oracle-setup.md)
- Local vs deployed architecture → [`11-local-vs-deployed-architecture.md`](11-local-vs-deployed-architecture.md)
- **Dev onboarding (local + real OCI, Windows)** → [`12-dev-onboarding-local-oci.md`](12-dev-onboarding-local-oci.md)
- **Deploy + team handoff** → [`13-oci-deploy-and-handoff.md`](13-oci-deploy-and-handoff.md)
- Team & onboarding → [`07-engineer-context.md`](07-engineer-context.md)

## Architecture (one picture)

```
  Founder ──▶  Frontend (React/Vite, built in Lovable → served from OCI)
                 │  REST (see API contract)
                 ▼
            Backend API (FastAPI on OCI Compute / Ampere)
                 │
        Async analysis orchestrator (plain functions)
        ┌────────┼─────────────┬──────────────┐
        ▼        ▼             ▼              ▼
   OCI GenAI  Oracle ADB 23ai  OCI Object   in-mem
   (LLM +     (vector DB:      Storage      result
   embeddings)  CUAD corpus +  (raw file,   cache
                doc clauses)   ephemeral)   (TTL)
```

**Why these pieces:** OCI GenAI = the required OCI AI service (LLM + embeddings). Oracle 23ai AI
Vector Search = the required vector DB *and* satisfies "Autonomous Database". Object Storage =
file handling. FastAPI on OCI Compute = the required *deployed* service (keeps Oracle central per
sponsor requirement). The multi-step *agentic* reasoning is our own async orchestrator (no LangGraph):
read → segment → classify → retrieve → benchmark → score → summarise.

> **OCI-first (hard requirement).** Every box in the diagram — including the served frontend — runs on
> Oracle Cloud. No Vercel/Netlify/third-party hosting in the deployed product. The team is new to OCI,
> so the lead mentors against [`08-oci-onboarding.md`](08-oci-onboarding.md); local `FAKE_OCI`/mock
> mode is a **dev-only** safety net, never the judged demo.

## Data flow (request lifecycle)

1. UI sends contract to `POST /api/analyze` (file / text / sample_id).
2. Backend stores raw file in Object Storage (ephemeral), extracts text **with char offsets**.
3. Segment text into clauses (heading/number heuristics).
4. The orchestrator runs (independent steps concurrent): classify → risk-score → benchmark (vector search vs CUAD) → extract
   (key facts / obligations / money / dates) → fairness → missing-clause → summary.
5. Assemble `AnalysisResult`, cache in-memory by `analysis_id` (TTL ~1h), return JSON.
6. UI renders verdict (Layer 1) + document cockpit (Layer 2).
7. `POST /api/chat` does RAG over the analysed contract's clauses for Q&A.

**Vector DB has two collections:**
- `cuad_clauses` — pre-built from the CUAD corpus (the "market" reference for benchmarking). Built
  once, offline, by `scripts/ingest_cuad.py`.
- `doc_clauses` — the uploaded contract's clauses, embedded at request time, used for Q&A RAG.

## The parallelisation strategy (how 6 people don't collide)

The **API contract** is the seam. Everything is built to it independently:

| Track | Depends on | Can start immediately? |
|---|---|---|
| **A. Lovable UI** | API contract + mock JSON | ✅ Yes — uses mock data |
| **B. Backend skeleton + API** | API contract | ✅ Yes — returns canned `AnalysisResult` first |
| **C. Ingestion + segmentation** | nothing | ✅ Yes |
| **D. Vector store + CUAD ingest** | OCI access | ✅ Yes (parallel to A/B) |
| **E. Analysis steps (functions)** | schemas (Pydantic) | ✅ Yes — each step tested in isolation |
| **F. OCI setup + deploy** | OCI account | ✅ Yes (owner: lead) |

**Integration order:** (1) UI ↔ canned backend → proves the contract. (2) Real pipeline replaces
canned response node-by-node. (3) Deploy. Because every node returns a slice of the frozen schema,
they slot in without breaking the UI.

## Phases & 48-hour timeline

**Hour 0–2 — Foundation (everyone)**
- Freeze the API contract. Repo scaffold. OCI account/region confirmed. Lovable project created.
- Backend returns a hard-coded `AnalysisResult` (from a real sample) so the UI is unblocked instantly.

**Hour 2–12 — Parallel build I**
- UI: landing + upload + verdict card against mock data.
- Backend: ingestion + segmentation; OCI GenAI wired (one real LLM call); Pydantic schemas.
- Data: ADB 23ai provisioned; CUAD subset ingested into `cuad_clauses`.

**Hour 12–24 — Parallel build II**
- UI: document cockpit (interactive highlights, detail panel, filters), chat box.
- Backend: classify + risk + benchmark nodes producing real `document.clauses`.
- Q&A endpoint over `doc_clauses`.

**Hour 24–36 — Integrate & deepen**
- Point UI at real backend (flip `VITE_API_BASE_URL`). Fix contract mismatches.
- Add depth panels (obligations, money, dates, missing-clause) as nodes land.
- Deploy backend to OCI Compute (Ampere); build the frontend static bundle and serve it **from OCI**
  too (nginx on the same VM, same origin → no CORS). No third-party hosting — see 06.

**Hour 36–44 — Polish & harden**
- Error states, loading/processing animation, sample contracts, empty/`null` handling.
- End-to-end run on the demo machine. Lock the demo script.

**Hour 44–48 — Demo prep**
- Rehearse the 3-minute pitch. Backups: recorded video + screenshots in case live fails.
- Freeze code. No new features.

## Definition of done (MVP)

Upload/sample → verdict in < 40s → interactive document with risk highlights → click a flag →
benchmark + detail → ask the chat a question → cited answer. Running on OCI, using OCI GenAI +
Oracle 23ai. Everything else is bonus.

## Risk register

| Risk | Mitigation |
|---|---|
| OCI GenAI region/quota issues | Lead confirms region + test call **before** hour 0; local fallback (see backend plan) |
| PDF highlight mapping is fiddly | Core path = reflowed **HTML** highlights, not PDF overlay (stretch) |
| Analysis steps slow (>40s) | Run independent steps concurrently (`asyncio.gather`); cap clause count; cache |
| Stateless chat needs the doc | In-memory result cache keyed by `analysis_id` (TTL) |
| Merge conflicts | Frozen API contract + canned response from hour 1 |
| Non-tech/intermediate blocked | Bounded tasks (samples, Lovable UI, test data) — see engineer context |
