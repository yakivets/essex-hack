# Build Status — resume point

_Last updated: 2026-06-03. Snapshot of what's built, what's left, and how to run it._

> 📋 For a per-feature **"is it actually working?"** checklist, see
> [`IMPLEMENTATION-TRACKER.md`](IMPLEMENTATION-TRACKER.md). For the project overview, see the
> root [`README.md`](../README.md). This file is the run/resume guide.

## TL;DR
**The real OCI GenAI prototype works end-to-end** (verified over HTTP) and also runs fully offline
(`FAKE_OCI=1` + mock mode): upload/sample → structured analysis → vector-grounded benchmarks (real
CUAD corpus) → RAG chat with citations. The UI is the redesigned **no-scroll cockpit** — document
left, risk + chat right — with light/dark theme, an animated processing screen, and **branded PDF
export**. Auth via `~/.oci/config`, region **uk-london-1**, chat **cohere.command-r-08-2024**,
embeddings **cohere.embed-english-v3.0**. Vector store on the **in-memory fallback** (Oracle 23ai
built, not connected). All work is **committed and merged to `main`**. No OCI deploy yet.

## Real OCI path — VERIFIED ✅ (this session)
- `~/.oci/config` written + validated (authenticated as the Essex student user); GenAI confirmed
  available in London (queried `list_models`).
- `backend/.env` filled: `FAKE_OCI=0`, region/endpoint, **root/tenancy compartment**, chat + embed
  models, `EMBED_DIM=1024`. ADB_* left blank → in-memory vector store.
- `scripts/smoke_oci.py` added: chat → embeddings → full `run_analysis` in one command. **Passes.**
- Latency: `command-r-plus` was ~120s (too slow) → switched to **`command-r-08-2024` (~44s, 8 clauses,
  all depth panels)**. `llama-3.3-70b` is faster (~22s) but too terse (3 clauses).
- Orchestrator hardened: Layer-1 strict, **depth panels best-effort** (malformed items/panels dropped,
  never fails the whole analysis) — fixes LLM null-field drift (e.g. a null `date`).
- Live HTTP check: `/health` (`fake_oci:false`), `/api/samples`, `/api/analyze` (real, ~45s),
  `/api/chat` (RAG, cited clauses) all return correct shapes.
- `frontend/.env` → `VITE_API_BASE_URL=http://localhost:8000` (gitignored).

## Key decisions (locked this session)
- **Contract source of truth = the frontend's `src/lib/types.ts`** (lowercase risk levels,
  top-level `clauses`, `quote` not `text`, `parties` as a string, `fairness {score,label}`).
  The backend matches this. ✅ `docs/03-api-contract.md` has been reconciled to this shape.
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
- **Vector slice** (benchmark + RAG chat) built and verified offline:
  - `pipeline/embeddings.py` — OCI `embed_text` (real) / deterministic unit-norm vectors (fake).
  - `pipeline/vectorstore.py` — one interface, two backends: Oracle 23ai native `VECTOR`
    (`oracledb`, `VECTOR_DISTANCE … COSINE`) **or** in-memory cosine. Picked by `ADB_DSN`.
  - `data/cuad_reference.py` — small CUAD-flavoured market corpus (12 categories × 3 harshness).
  - `pipeline/benchmark.py` — embeds each clause, finds similar in-category references, sets a
    grounded `{percentile, typical}` (keeps the LLM's estimate when the category is unknown).
  - `pipeline/chat.py` — now retrieves top-k clauses from `doc_clauses` (vector) instead of
    dumping all clauses; orchestrator indexes the analysed clauses into `doc_clauses`.
  - `scripts/ingest_cuad.py` — one-off to build `cuad_clauses` (auto-loaded for in-memory).
  - `oracledb` enabled in `requirements.txt`; ADB/embeds vars added to `config.py` + `.env.example`.
- **Real benchmark corpus:** `data/cuad_clauses.jsonl` (~6.3k real CUAD clauses) replaced the toy
  seed; `cuad_reference.py` loads a balanced subset (15/category) for fast warmup.
- **Frontend redesign:** no-scroll two-pane results (`DocumentPane` + `RiskRail`), RAG chat moved
  into the rail as a tab, `DetailsDrawer` (shadcn Sheet) for depth panels, light/dark theme toggle,
  animated "contract under review" processing screen, **branded PDF export** (jsPDF). Old
  single-column components removed.
- **Backend reliability/latency:** OCI read timeout 60→240s (fixes timeout-502 on long generations),
  `MAX_CLAUSES`=8, CUAD warmup capped; blocking LLM calls off-loaded to a threadpool; tracebacks
  logged on failure.
- **Committed + merged to `main`** (branch `mykyta-dev` kept for ongoing work).

## Left to do ⏳
1. **Oracle 23ai (next vector slice):** set `ADB_*`/`TNS_ADMIN`, run `python -m scripts.ingest_cuad`,
   to swap the in-memory store for native `VECTOR` search. (Code already supports it.)
2. **OCI Object Storage** for raw uploads (ephemeral) — not implemented yet.
3. **Deploy** the FastAPI API + frontend bundle on OCI Compute (Ampere) — see `docs/06-oracle-setup.md`.
4. **Multi-agent analysis** — split the single LLM call into specialised agents (accuracy + real
   per-step progress). Plan: `docs/09-multi-agent-plan.md`.
5. **Latency** is still ~30–45s (one big LLM call); the multi-agent split (Layer-1 first) is the real win.

## How to run (two terminals, PowerShell)
```powershell
# Terminal 1 — backend
cd D:\Projects\essex-hack\backend
.\.venv\Scripts\python.exe -m pip install -r requirements.txt   # once, for real mode
.\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8000  # avoid --reload (port-linger)
# Terminal 2 — frontend  (bun isn't installed here → use npm; Node v22 present)
cd D:\Projects\essex-hack\frontend
npm install                                                    # once (482 pkgs)
npm run dev                                                    # http://localhost:8080
```
> Stop the backend with **Ctrl+C** (not an external kill) — force-killing it once truncated the
> venv `python.exe` to 0 bytes; we repaired it with `python -m venv .venv` (keeps site-packages).
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
  pipeline/embeddings.py embed(texts) -> vectors  (OCI embed_text / deterministic fake)
  pipeline/vectorstore.py Oracle 23ai VECTOR  OR  in-memory cosine (picked by ADB_DSN)
  pipeline/benchmark.py  apply_benchmarks(clauses) -> grounded {percentile, typical}
  pipeline/orchestrator.py  run_analysis(text) -> AnalysisResult    (LLM call + benchmark + doc index)
  pipeline/chat.py       answer_question(...) -> RAG over doc_clauses + citations
  data/cuad_reference.py market reference corpus (seed for cuad_clauses)
  scripts/ingest_cuad.py one-off: embed + load the cuad_clauses collection
backend/.env             FAKE_OCI=0 + OCI placeholders (gitignored)
backend/.env.example     template (FAKE_OCI=1 default)
```
```
frontend/                TanStack Start app; src/lib/{api.ts,types.ts,mockAnalysis.ts}; .env
```

## Docs that need updating (housekeeping)
- ✅ `docs/03-api-contract.md` — reconciled to `frontend/src/lib/types.ts` + `backend schemas.py`.
- `docs/05-backend-plan.md` mentions a `segment.py` step we skipped for the single-call slice.
- `docs/06` deployment note: frontend is a server runtime (TanStack Start), not a static bundle.
