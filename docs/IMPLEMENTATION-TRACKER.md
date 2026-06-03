# Implementation Tracker

_Single source of truth for **what's built** and **whether it actually works**. Update this whenever
a feature lands or its status changes. Pair with [`STATUS.md`](STATUS.md) (the resume/run guide)._

_Last updated: 2026-06-02 (evening). Branch: `mykyta-dev`. Nothing committed yet._

## Legend
- ✅ **Working** — implemented and verified end-to-end (how it was checked is noted).
- 🟡 **Partial** — code exists but unverified, stubbed, or only part of it is proven.
- ⏳ **Not started** — planned, no code yet.
- 🧪 **Verified via** — the concrete check that proves it.

## At a glance
| Area | Status |
|---|---|
| Backend API (canned + real) | ✅ Working |
| Real OCI GenAI (chat + embeddings) | ✅ Working (London, `command-r-08-2024`) |
| Analysis pipeline (LLM → structured result) | ✅ Working (~45s) |
| Vector benchmarks (in-memory) | ✅ Working |
| RAG chat (grounded + citations) | ✅ Working |
| Frontend (runs + wired to API) | 🟡 Runs; live UI click-through not yet confirmed |
| Oracle ADB 23ai vector store | 🟡 Code written, not connected |
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

## 2. OCI Generative AI
| Item | Status | Verified via |
|---|---|---|
| `~/.oci/config` API-key auth | ✅ | `validate_config` + `get_user` (auth as Essex user) |
| GenAI available in `uk-london-1` | ✅ | `list_models` returned chat+embed models |
| Chat model `cohere.command-r-08-2024` | ✅ | `smoke_oci` chat → "pong"; full analysis |
| Embeddings `cohere.embed-english-v3.0` | ✅ | `embed()` → 2×1024-dim vectors |
| `genai.chat()` (Cohere + Generic shapes) | ✅ | Real call (Cohere path) |
| `genai.llm_json()` helper | ✅ | Used by chat module |
| Compartment = root/tenancy | ✅ | Inference + model listing succeed |
| Model choice rationale | ✅ | `command-r-plus` ~120s (too slow); `r-08-2024` ~44s rich; `llama-3.3-70b` ~22s but terse (3 clauses) |

## 3. Analysis pipeline
| Item | Status | Verified via |
|---|---|---|
| `ingest.py` text extraction (plain) | ✅ | Sample text analysed |
| `ingest.py` PDF (`pdfplumber`) | 🟡 | Lib installed; **not tested with a real PDF** |
| `ingest.py` DOCX (`python-docx`) | 🟡 | Lib installed; **not tested with a real DOCX** |
| `orchestrator.run_analysis()` | ✅ | Real sample → 8 clauses, 4 red flags, all depth panels |
| Robust assembler (Layer-1 strict, depth best-effort) | ✅ | Survived real LLM null-`date` drift |
| JSON parse + 1 retry | ✅ | Clean JSON observed; retry path coded |
| `document.html` synthesis (clause spans) | ✅ | Built from clause quotes |
| Single-call design (no concurrent steps yet) | 🟡 | Works but ~45s; plan's modular/concurrent steps not split out |

## 4. Vector search (RAG + benchmarks)
| Item | Status | Verified via |
|---|---|---|
| `embeddings.py` (OCI real + fake) | ✅ | Real 1024-dim vectors |
| `vectorstore.py` in-memory cosine | ✅ | benchmark + chat retrieval |
| `vectorstore.py` Oracle 23ai (`VECTOR`) | 🟡 | DDL/insert/`VECTOR_DISTANCE` coded; **DB not connected** |
| `cuad_reference.py` seed corpus (12 cats) | ✅ | 36 records loaded |
| `benchmark.apply_benchmarks()` | ✅ | All 8 clauses got grounded `{percentile, typical}` |
| `doc_clauses` indexing for chat | ✅ | Retrieval returns correct clause ids |
| RAG chat answer + citations | ✅ | Real Q "cancel early?" → cited c8/c4 |
| `scripts/ingest_cuad.py` | ✅ | Loaded 36 rows (in-memory) |
| `scripts/smoke_oci.py` | ✅ | chat→embed→analysis all pass |

## 5. Frontend
| Item | Status | Verified via |
|---|---|---|
| Deps installed (npm; bun not present) | ✅ | `npm install` 482 pkgs, 0 vuln |
| Dev server runs | ✅ | Vite ready at `http://localhost:8080` |
| `api.ts` wired to all 4 endpoints | ✅ | Code review; mock fallback intact |
| `frontend/.env` → `localhost:8000` | ✅ | File created (gitignored) |
| Components (Upload/Verdict/Document/Chat/…) | ✅ | Present in `components/pactpilot/` |
| **Live UI click-through vs real backend** | 🟡 | **Not yet confirmed by a real upload in the browser** |
| Clause highlight → detail panel → ask-clause | 🟡 | Not verified against real data |

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
| `STATUS.md` | ✅ | Updated (run guide + OCI-verified) |
| This tracker | ✅ | Created |
| `docs/03-api-contract.md` | ✅ | Reconciled to `types.ts` / `schemas.py` (lowercase risk, top-level `clauses`, `quote`, string `parties`, `fairness {score,label}`) |
| `docs/05-backend-plan.md` | 🟡 | Mentions `segment.py` (skipped for single-call slice) |
| `docs/06-oracle-setup.md` | 🟡 | Deploy note: TanStack server runtime, not static-only |
| Git commit/push | ⏳ | Nothing committed yet |

---

## Known gaps / next actions (priority order)
1. **Confirm live UI flow** — upload/sample in the browser, click a flag, ask the chat (real backend).
2. **Latency** — ~45s is over the 30–40s target; split Layer-1 vs depth into concurrent calls or cap clauses.
3. **Oracle 23ai** — provision ADB, set `ADB_*`/`TNS_ADMIN`, run `ingest_cuad`; flip from in-memory to native VECTOR.
4. **Object Storage** + **Dockerfile** + **deploy** to OCI (judging requires a deployed app).
5. **Reconcile `docs/03-api-contract.md`** to the real shape.
6. **Test ingest** with a real PDF and DOCX.
7. **Commit** the work.
