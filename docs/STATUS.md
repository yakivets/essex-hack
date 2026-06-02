# Build Status — resume point

_Last updated: 2026-06-02. Snapshot of what's built, what's left, and how to run it._

## TL;DR
End-to-end **mock + canned** path works (UI ↔ FastAPI). The **real OCI GenAI** pipeline is
**written but not yet verified** — it needs the OCI deps installed and real OCI values in
`backend/.env`. Nothing is committed yet (all changes are in the working tree).

## Key decisions (locked this session)
- **Contract source of truth = the frontend's `src/lib/types.ts`** (lowercase risk levels,
  top-level `clauses`, `quote` not `text`, `parties` as a string, `fairness {score,label}`).
  The backend matches this. ⚠️ `docs/03-api-contract.md` still describes the OLD shape — **out of date**.
- **Frontend is TanStack Start** (React 19 + Vite + Tailwind v4 + shadcn, bun) — a server-ful SSR app,
  not a static SPA. Deploys on OCI as a bun/node server behind nginx (settle at deploy time).
- **First real slice = GenAI-only** (no Oracle 23ai yet). Benchmark percentile is LLM-estimated;
  chat is LLM-over-clauses. Vector DB (benchmark + RAG) is the next slice.

## Done ✅
- **Frontend** pulled into `frontend/` (Lovable export), deps installed (`bun install`), runs at
  `http://localhost:8080`. `frontend/.env` → `VITE_API_BASE_URL=http://localhost:8000`.
- **Backend** (`backend/`, FastAPI) with a `FAKE_OCI` toggle:
  - Stage A canned response — **verified** via curl (all 4 endpoints, correct shape, 404s).
  - Real GenAI pipeline — **written** (see file map). Imports verified; canned regression verified.
  - venv created, core deps installed.
- `backend/.env` (paste-ready, `FAKE_OCI=0` + placeholders) and `.env.example` created.

## Left to do ⏳
1. **Install real-mode deps** (interrupted): `pip install oci pdfplumber python-docx`
   (already in `requirements.txt`).
2. **OCI setup** (you): confirm GenAI in the Chat playground; from "View code" get region,
   endpoint, **compartment OCID**, **chat model id**; set up `~/.oci/config` (API key).
3. **Fill `backend/.env`** — replace `OCI_COMPARTMENT_ID=...REPLACE_ME` and the model/region.
4. **Verify the real path**: restart uvicorn → upload/sample a contract → real output. Watch for:
   - SDK request-shape mismatch (Cohere vs Generic) — confirm against playground "View code".
   - JSON validity from the model (we retry once; tighten the prompt if it drifts).
5. **Reconcile `docs/03-api-contract.md`** to the real (frontend) shape — currently stale/misleading.
6. **Next slice:** Oracle 23ai vector — real benchmark percentile + RAG chat (uncomment `oracledb`).
7. **Deploy** decision for the TanStack Start server on OCI.
8. **Commit/push** — nothing committed yet.

## How to run (two terminals, PowerShell)
```powershell
# Terminal 1 — backend
cd C:\Projects\essex-hack\backend
.\.venv\Scripts\python.exe -m pip install -r requirements.txt   # once, for real mode
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
# Terminal 2 — frontend
cd C:\Projects\essex-hack\frontend
bun run dev                                                     # http://localhost:8080
```
- `FAKE_OCI=1` in `backend/.env` → canned demo (no cloud). `FAKE_OCI=0` → real GenAI (needs creds).

## Backend file map
```
backend/app/
  main.py                FastAPI + CORS + /health
  config.py              settings (FAKE_OCI, OCI_* , cache TTL, max_clauses)
  api/routes.py          /samples /analyze /analysis/{id} /chat — branches on FAKE_OCI
  models/schemas.py      Pydantic mirroring frontend types.ts EXACTLY
  services/cache.py      in-memory TTL cache (enables chat/refresh by id)
  data/fixtures.py       canned AnalysisResult (mirrors mockAnalysis.ts)
  data/samples/*.txt     3 sample contracts (used by sample_id in real mode)
  oci/genai.py           GenAI client + llm_json(prompt, schema)   [lazy oci import]
  pipeline/ingest.py     PDF/DOCX/text -> text                      [lazy parsers]
  pipeline/orchestrator.py  run_analysis(text) -> AnalysisResult    (one structured LLM call)
  pipeline/chat.py       answer_question(...) -> grounded answer + citations
backend/.env             FAKE_OCI=0 + OCI placeholders (gitignored)
backend/.env.example     template (FAKE_OCI=1 default)
```
```
frontend/                TanStack Start app; src/lib/{api.ts,types.ts,mockAnalysis.ts}; .env
```

## Docs that need updating (housekeeping)
- `docs/03-api-contract.md` — bring in line with `frontend/src/lib/types.ts` + `backend schemas.py`.
- `docs/05-backend-plan.md` mentions a `segment.py` step we skipped for the single-call slice.
- `docs/06` deployment note: frontend is a server runtime (TanStack Start), not a static bundle.
