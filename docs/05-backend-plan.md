# Backend Plan — Step by Step

Stack: **Python 3.11 · FastAPI (no LangChain/LangGraph) · OCI GenAI via the raw `oci` SDK · Oracle
ADB 23ai (native `VECTOR` via `oracledb`) · OCI Object Storage**. Everything is built to the
[API contract](03-api-contract.md).

## Repo structure
```
backend/
  app/
    main.py                 # FastAPI app + CORS + router include
    config.py               # env/settings (pydantic-settings)
    api/routes.py           # endpoints: /samples /analyze /analysis/{id} /chat
    models/schemas.py       # Pydantic models — MIRROR the API contract exactly
    services/
      cache.py              # in-memory analysis cache (dict + TTL) keyed by analysis_id
    pipeline/
      ingest.py             # extract text + char offsets (PDF/DOCX/plain)
      segment.py            # split into clauses (heading/number heuristics) -> [Clause]
      embeddings.py         # oci SDK embed_text wrapper (in-mem fake under FAKE_OCI)
      vectorstore.py        # oracledb: create/query VECTOR tables (cuad_clauses + doc_clauses)
      orchestrator.py       # runs analysis steps (asyncio.gather), assembles AnalysisResult
      chat.py               # Q&A RAG over doc_clauses
      steps/
        classify.py         # clause category + risk_level
        risk.py             # overall risk_score + verdict + fairness
        benchmark.py        # vector search vs cuad_clauses -> percentile/typical
        extract.py          # key_facts, obligations, money, dates (structured output)
        missing.py          # missing-clause detection
        summary.py          # summary_line + bullets + red_flags assembly
    oci/
      genai.py              # GenerativeAiInferenceClient factory + llm_json(prompt, schema) helper
      storage.py            # Object Storage put/delete (ephemeral)
  data/
    samples/                # sample contracts served by /api/samples
  scripts/
    ingest_cuad.py          # ONE-OFF: build the cuad_clauses vector collection
  requirements.txt
  .env.example
  Dockerfile
```

## Phase 0 — Scaffold & the canned response (unblocks UI immediately)
1. `requirements.txt`: `fastapi uvicorn pydantic pydantic-settings python-multipart oci oracledb
   pdfplumber python-docx`. (No langchain / langchain-community / langgraph.)
2. `models/schemas.py`: Pydantic models for `AnalysisResult` and every nested object — **field
   names identical to the API contract**. This file IS the contract in code.
3. `api/routes.py`: implement all four endpoints. `POST /analyze` returns a **hard-coded
   `AnalysisResult`** loaded from `data/samples/supplier_result.json`. CORS open for dev.
4. `main.py` + run `uvicorn app.main:app --reload`. Frontend can now integrate against real shapes.

> ✅ After Phase 0, the API contract is proven end-to-end with fake data. Everything below replaces
> the canned response slice by slice — the UI never breaks.

## Phase 1 — Ingestion & segmentation (no OCI needed → start now)
1. `ingest.py`: `extract(file_bytes, filename) -> {text, char_map}`.
   - PDF → `pdfplumber` (keep char offsets / page). DOCX → `python-docx`. Plain → passthrough.
2. `segment.py`: `segment(text) -> list[Clause]` where `Clause = {id, heading, text, start, end}`.
   - Heuristic: split on numbered headings (`^\d+\.`, `ARTICLE`, ALL-CAPS headings). Fallback:
     paragraph chunks. Assign `c1, c2, …` ids and char `start/end` (drives UI highlighting).
3. Unit-test on the sample contracts. Output feeds every analysis step below.

## Phase 2 — OCI plumbing
1. `oci/genai.py`: factory returning a `GenerativeAiInferenceClient` (model OCID, compartment_id,
   region/endpoint from config), plus `llm_json(prompt, schema)` — calls `.chat(...)`, parses the
   JSON reply into a Pydantic model, retries once on malformed JSON. This replaces LangChain's
   structured-output helper.
2. `pipeline/embeddings.py`: `embed(texts) -> list[vector]` wrapping the SDK `.embed_text(...)`.
3. `oci/storage.py`: `put(file)` / `delete(key)` — store raw upload, delete after analysis (privacy).
4. **Smoke test:** one LLM call + one embedding call succeed against OCI. (Blocks on OCI access —
   see [06-oracle-setup.md](06-oracle-setup.md). Provide a `FAKE_OCI=1` mode that returns stub
   embeddings/responses so the rest of the team isn't blocked.)

## Phase 3 — Vector store
1. `vectorstore.py`: connect to ADB 23ai with `oracledb` + wallet. Create two tables, each with a
   native `VECTOR` column: `cuad_clauses`, `doc_clauses`. Helpers: `add_clauses(table, clauses)`
   (INSERT embeddings + metadata), `similar(table, query_embedding, k, filter_category)`
   (`SELECT ... ORDER BY VECTOR_DISTANCE(embedding, :q, COSINE) FETCH FIRST :k ROWS ONLY`).
2. `scripts/ingest_cuad.py` (one-off, offline): load a CUAD subset → segment → embed → upsert into
   `cuad_clauses` with metadata `{category, harshness?}`. This is the "market" reference corpus.
   Local fallback: a simple in-memory cosine store if ADB isn't ready, same `add_clauses`/`similar` interface.

## Phase 4 — The analysis orchestrator (the agentic core)
A plain async orchestrator passes `{clauses, result_partial}` through steps (each independently
testable, each fills a slice of `AnalysisResult`). No graph framework — just functions called by
`orchestrator.py`, independent ones via `asyncio.gather`:
1. `classify.py`: for each clause → `category` + `risk_level` (LLM, structured output). Run clauses
   in batches/concurrently.
2. `benchmark.py`: for each risky clause → embed → `similar(cuad_clauses, …, category)` → derive
   `percentile`, `comparison`, `typical`.
3. `risk.py`: aggregate clause risks → `verdict.risk_score`, `risk_level`, `fairness`.
4. `extract.py`: structured extraction → `key_facts`, `obligations`, `money`, `dates`, `exit`,
   `scenarios`. (Each is independent — ship as they're ready; UI tolerates `null`.)
5. `missing.py`: compare present categories vs an expected-set for the `contract_type` → `missing_clauses`.
6. `summary.py`: `summary_line`, `summary_bullets`, assemble `red_flags` from the HIGH clauses.
7. `orchestrator.py`: call the steps (independent ones concurrent via `asyncio.gather`), assemble the
   final `AnalysisResult`, embed the uploaded clauses into `doc_clauses` for chat.

**Performance:** run independent steps concurrently; cap clauses analysed (e.g. top N by length/keyword);
keep prompts tight. Target < 40s.

## Phase 5 — Q&A chat
`chat.py`: embed the question → `similar(doc_clauses, …)` → call the OCI chat model with the retrieved
clauses → return `{answer, citations:[{clause_id, quote}]}`. `clause_id` in the request scopes it.

## Phase 6 — Wire endpoints to the pipeline
Replace the Phase-0 canned `/analyze` with: ingest → segment → `orchestrator.run()` → cache by
`analysis_id` → return. `/analysis/{id}` and `/chat` read from the cache. Delete the Object Storage
file after analysis.

## Phase 7 — Deploy
Containerise (`Dockerfile`), run on OCI Compute (Ampere). See [06-oracle-setup.md](06-oracle-setup.md).

## Conventions
- **`schemas.py` is the source of truth in code; it must match `03-api-contract.md`.** Change one →
  change both → tell the UI owner.
- Every step returns/fills only its slice and is testable in isolation with a sample `clauses` list.
- Provide `FAKE_OCI=1` everywhere external so any engineer can run the whole pipeline offline.
- Keep prompts in `pipeline/steps/*.py` next to their step; structured output via `llm_json()` + Pydantic.

## Definition of done (backend)
`POST /api/analyze` with a real PDF returns a schema-valid `AnalysisResult` in < 40s using OCI GenAI
+ Oracle 23ai; `/api/chat` returns cited answers; deployed and reachable on OCI.
