# Implementation Tracker

_Single source of truth for **what's built** and **whether it actually works**. Update this whenever
a feature lands or its status changes. Pair with [`STATUS.md`](STATUS.md) (run/resume guide) and the
root [`README.md`](../README.md) (overview)._

_Last updated: 2026-06-03. All work below is **committed and merged to `main`** (`mykyta-dev` kept
for ongoing work)._

## Legend
- ✅ **Working** — implemented and verified (how it was checked is noted).
- 🟡 **Partial** — code exists but unverified, stubbed, or only part of it is proven.
- ⏳ **Not started** — planned, no code yet.
- 🧪 **Verified via** — the concrete check that proves it.

## At a glance
| Area | Status |
|---|---|
| Backend API (canned + real) | ✅ Working |
| Real OCI GenAI (chat + embeddings) | ✅ Working (London, `command-r-08-2024`) |
| Analysis pipeline (LLM → structured result) | ✅ Working (~30–45s, single LLM call) |
| Vector benchmarks (real CUAD corpus, in-memory) | ✅ Working |
| RAG chat (grounded + citations) | ✅ Working |
| Frontend — redesigned no-scroll cockpit | ✅ Built & runs · 🟡 live click-through vs real backend unconfirmed |
| Oracle ADB 23ai vector store | 🟡 Code written, not connected (in-memory fallback live) |
| Multi-agent analysis | ⏳ Designed only (`docs/09`) |
| OCI Object Storage | ⏳ Not started |
| Deployment (OCI Compute) | ⏳ Not started |

---

## 1. Backend API & contract
| Item | Status | Verified via |
|---|---|---|
| FastAPI app + CORS + `/health` | ✅ | HTTP `GET /health` → `{"status":"ok","fake_oci":false}` |
| `GET /api/samples` | ✅ | HTTP returns 3 samples |
| `POST /api/analyze` (file/text/sample) | ✅ | HTTP sample run → valid `AnalysisResult` |
| `GET /api/analysis/{id}` | ✅ | TestClient 200 + 404 for missing |
| `POST /api/chat` | ✅ | HTTP real RAG answer with citations |
| Pydantic `schemas.py` (mirrors `types.ts`) | ✅ | Import + response validation |
| In-memory TTL result cache | ✅ | Chat/refresh-by-id works |
| `FAKE_OCI` toggle (canned vs real) | ✅ | Both paths exercised |
| Canned fixtures (Stage A) | ✅ | TestClient regression |
| Unknown `sample_id` doesn't 500 | ✅ | Falls back gracefully (commit `643c7a3`) |

## 2. OCI Generative AI
| Item | Status | Verified via |
|---|---|---|
| `~/.oci/config` API-key auth | ✅ | `validate_config` + `get_user` (auth as Essex user) |
| GenAI available in `uk-london-1` | ✅ | `list_models` returned chat+embed models |
| Chat model `cohere.command-r-08-2024` | ✅ | `smoke_oci` chat → "pong"; full analysis |
| Embeddings `cohere.embed-english-v3.0` | ✅ | `embed()` → 1024-dim vectors |
| `genai.chat()` (Cohere + Generic shapes) | ✅ | Real call (Cohere path) |
| `genai.llm_json()` helper | ✅ | Used by chat module |
| Compartment = root/tenancy | ✅ | Inference + model listing succeed |
| Read timeout 240s (was 60s) | ✅ | Fixed timeout-502 on long generations (`config.py`) |
| Blocking LLM calls off-loaded to threadpool | ✅ | Commit `25a7f53` (event loop not blocked) |

## 3. Analysis pipeline
| Item | Status | Verified via |
|---|---|---|
| `ingest.py` text extraction (plain) | ✅ | Sample text analysed |
| `ingest.py` PDF (`pdfplumber`) | 🟡 | Lib installed; **not tested with a real PDF** |
| `ingest.py` DOCX (`python-docx`) | 🟡 | Lib installed; **not tested with a real DOCX** |
| `orchestrator.run_analysis()` | ✅ | Real sample → clauses + red flags + depth panels |
| Robust assembler (Layer-1 strict, depth best-effort) | ✅ | Survived real LLM null-`date` drift |
| JSON parse + 1 retry | ✅ | Clean JSON observed; retry path coded |
| `document.html` synthesis (clause spans) | ✅ | Built from clause quotes |
| `MAX_CLAUSES=8` latency/reliability guard | ✅ | Caps JSON size (`config.py`) |
| Single big LLM call (no concurrent agents) | 🟡 | Works ~30–45s; multi-agent split designed in `docs/09` |

## 4. Vector search (RAG + benchmarks)
| Item | Status | Verified via |
|---|---|---|
| `embeddings.py` (OCI real + fake) | ✅ | Real 1024-dim vectors |
| `vectorstore.py` in-memory cosine | ✅ | benchmark + chat retrieval |
| `vectorstore.py` Oracle 23ai (`VECTOR`) | 🟡 | DDL/insert/`VECTOR_DISTANCE` coded; **DB not connected** |
| **Real CUAD corpus** `cuad_clauses.jsonl` (~6.3k) | ✅ | Replaced toy seed (commit `3829c26`) |
| `cuad_reference.py` balanced subset loader (15/cat) | ✅ | Loads from JSONL; seed fallback if missing |
| `benchmark.apply_benchmarks()` | ✅ | Clauses get grounded `{percentile, typical}` |
| `doc_clauses` indexing for chat | ✅ | Retrieval returns correct clause ids |
| RAG chat answer + citations | ✅ | Real Q "cancel early?" → cited clauses |
| Empty-clauses guard in chat | ✅ | Commit `25a7f53` |
| `scripts/ingest_cuad.py` | ✅ | Loads corpus (in-memory verified; Oracle path coded) |
| `scripts/smoke_oci.py` | ✅ | chat→embed→analysis all pass |

## 5. Frontend (redesigned cockpit)
| Item | Status | Verified via |
|---|---|---|
| Deps installed (npm; bun not present) | ✅ | `npm install` 482 pkgs, 0 vuln |
| Dev server runs | ✅ | Vite ready at `http://localhost:8080` |
| `api.ts` wired to all 4 endpoints (+ mock fallback) | ✅ | Code review |
| `frontend/.env` → `localhost:8000` | ✅ | File created (gitignored) |
| No-scroll two-pane results (`ResultsLayout`) | ✅ | `DocumentPane` + `RiskRail` present |
| `DocumentPane` — risk highlights, filters, minimap | ✅ | Component present |
| `RiskRail` — verdict gauge + Flags/Chat tabs | ✅ | Component present |
| `ChatPanel` — RAG chat + clickable citations | ✅ | Component present |
| `DetailsDrawer` (shadcn Sheet) — depth panels | ✅ | Component present |
| Light/dark theme (`ThemeToggle`, persisted) | ✅ | Component present |
| Animated "contract under review" processing | ✅ | `Processing.tsx` present |
| Branded PDF export (jsPDF) | ✅ | `lib/exportPdf.ts` present |
| 3 risk-tiered samples (danger/suspicious/legit) | ✅ | Mock ids synced to backend (`643c7a3`) |
| **Live UI click-through vs real backend** | 🟡 | **Not yet confirmed by a real upload in the browser** |

## 6. Infra / deploy / storage
| Item | Status | Verified via |
|---|---|---|
| OCI Object Storage (`storage.py`) | ⏳ | Not implemented (ephemeral raw-file store) |
| `Dockerfile` (backend) | ⏳ | Not created |
| Deploy backend → OCI Compute (Ampere) | ⏳ | Not started |
| Serve frontend from OCI (nginx, same origin) | ⏳ | Not started |
| Oracle ADB 23ai provisioned + wallet | ⏳ | Not started (in-memory fallback used) |

## 7. Docs / housekeeping
| Item | Status | Notes |
|---|---|---|
| Root `README.md` | ✅ | Full overview + setup + run |
| `backend/README.md` · `frontend/README.md` | ✅ | Per-folder, context-specific |
| `CLAUDE.md` | ✅ | Refreshed status |
| `STATUS.md` · this tracker | ✅ | Up to date |
| `docs/03-api-contract.md` | ✅ | Reconciled to `types.ts` / `schemas.py` |
| `docs/09-multi-agent-plan.md` | ✅ | Multi-agent analysis design (not yet built) |
| `docs/05-backend-plan.md` | 🟡 | Mentions `segment.py` (skipped for single-call slice) |
| `docs/06-oracle-setup.md` | 🟡 | Deploy note: TanStack server runtime, not static-only |
| Git commit/push | ✅ | Committed + merged to `main` |

---

## Known gaps / next actions (priority order)
1. **Confirm live UI flow** — upload/sample in the browser against the real backend; click a flag,
   open the details drawer, ask the chat. (Everything is verified at the API level, not yet via the UI.)
2. **Oracle 23ai** — provision ADB, set `ADB_*`/`TNS_ADMIN`, run `python -m scripts.ingest_cuad`;
   flip from the in-memory store to native `VECTOR` search. (Code already supports it.)
3. **Deploy** — `Dockerfile` + OCI Compute (Ampere) for the API, serve the frontend bundle from OCI.
   (Judging requires a deployed app.)
4. **OCI Object Storage** — store the raw upload ephemerally, delete after analysis.
5. **Multi-agent analysis** (`docs/09`) — split the single LLM call into specialised agents for
   accuracy + real per-step progress; also the main latency win (show Layer-1 first).
6. **Test ingest** with a real PDF and DOCX.
