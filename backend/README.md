# PactPilot Backend (FastAPI)

The analysis API. Turns a contract (PDF / DOCX / pasted text / sample id) into an `AnalysisResult`
whose shape **exactly** matches the frontend's `src/lib/types.ts`, and answers grounded Q&A about it.

- **No LangChain / no LangGraph.** A small `asyncio` orchestrator calls OCI directly.
- **AI:** OCI Generative AI via the raw `oci` SDK — chat (`cohere.command-r-08-2024`) + embeddings
  (`cohere.embed-english-v3.0`).
- **Vector search:** Oracle 23ai native `VECTOR` (via `oracledb`) **or** an in-memory cosine fallback.
- **`FAKE_OCI=1`** stubs all cloud calls so the whole thing runs offline with no credentials.

## Run

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate            # Windows  ·  macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env            # macOS/Linux: cp .env.example .env   (defaults to FAKE_OCI=1)
python -m uvicorn app.main:app --reload --port 8000
```

- Interactive API: http://localhost:8000/docs
- Health: http://localhost:8000/health → `{"status":"ok","fake_oci":true}`

> Tip: run with `--reload` during development so code changes hot-reload. Without it you must
> restart uvicorn to pick up changes.

## Modes

| `FAKE_OCI` | Behaviour | Needs |
|---|---|---|
| `1` (default) | `/analyze` returns a canned `AnalysisResult`; embeddings are deterministic stubs | nothing |
| `0` | Real pipeline: ingest → LLM analysis → vector benchmark → cache; real RAG chat | OCI creds (below) |

## Configuration (`.env`)

Auth comes from **`~/.oci/config`** (an API signing key) — never put keys in `.env`. The `.env` only
holds non-secret ids/endpoints. See `.env.example` for the full list; the essentials for real mode:

```
FAKE_OCI=0
OCI_REGION=uk-london-1
OCI_GENAI_ENDPOINT=https://inference.generativeai.uk-london-1.oci.oraclecloud.com
OCI_COMPARTMENT_ID=ocid1.compartment...      # or the tenancy/root OCID
OCI_GENAI_CHAT_MODEL=cohere.command-r-08-2024
OCI_GENAI_EMBED_MODEL=cohere.embed-english-v3.0
# Oracle 23ai vector store (optional) — leave ADB_DSN empty to use the in-memory fallback:
ADB_USER=ADMIN
ADB_PASSWORD=...
ADB_DSN=pactpilot_high
TNS_ADMIN=/path/to/unzipped/wallet
```

Other knobs (in `app/config.py`): `OCI_READ_TIMEOUT` (default 240s), `MAX_CLAUSES` (default 8),
`CACHE_TTL_SECONDS`, `EMBED_DIM` (1024).

## Endpoints

| Method | Path | Body / params | Returns |
|---|---|---|---|
| `GET` | `/api/samples` | — | `Sample[]` (3 contracts) |
| `POST` | `/api/analyze` | multipart: `file` **or** `text` **or** `sample_id` | `AnalysisResult` |
| `GET` | `/api/analysis/{id}` | — | cached `AnalysisResult` (404 after TTL) |
| `POST` | `/api/chat` | JSON `{analysis_id, message, clause_id?}` | `{answer, citations[]}` |
| `GET` | `/health` | — | `{status, fake_oci}` |

## Layout

```
app/
  main.py                FastAPI app + CORS + /health
  config.py              settings (FAKE_OCI, OCI_*, timeouts, max_clauses)
  api/routes.py          the 4 endpoints (+ branches on FAKE_OCI)
  models/schemas.py      Pydantic models — MIRROR frontend types.ts EXACTLY
  services/cache.py      in-memory TTL result cache (enables chat / refresh by id)
  oci/genai.py           OCI GenAI client + chat() + llm_json(prompt, schema)
  pipeline/
    ingest.py            PDF/DOCX/text -> plain text
    orchestrator.py      run_analysis(text) -> AnalysisResult (the single-call analysis)
    embeddings.py        embed(texts) -> vectors (OCI embed_text / deterministic fake)
    vectorstore.py       Oracle 23ai VECTOR  OR  in-memory cosine (picked by ADB_DSN)
    benchmark.py         apply_benchmarks(clauses) -> grounded {percentile, typical}
    chat.py              answer_question(...) -> RAG over the contract's clauses + citations
  data/
    fixtures.py          canned AnalysisResult (FAKE_OCI demo)
    cuad_reference.py    market reference corpus loader (real CUAD or seed fallback)
    cuad_clauses.jsonl   ~6.3k real CUAD clauses (benchmark corpus)
    samples/*.txt        3 sample contracts served by sample_id
scripts/
  ingest_cuad.py         one-off: embed + load the cuad_clauses collection (for Oracle)
  smoke_oci.py           dev smoke test: chat -> embed -> full analysis
requirements.txt · .env.example · .gitignore
```

## Notes

- The frozen contract is `app/models/schemas.py` ⇆ `frontend/src/lib/types.ts` ⇆
  `docs/03-api-contract.md`. Change all three together or nothing.
- Analysis is currently **one structured LLM call**; splitting it into specialised agents (better
  accuracy + real per-step progress) is planned in `docs/09-multi-agent-plan.md`.
- Benchmark + chat are best-effort over the vector store; if it's unavailable the analysis still
  returns (Layer-1 fields are guaranteed, depth panels degrade gracefully).
