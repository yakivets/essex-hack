# Multi-Agent Analysis Plan

How PactPilot's analysis moves from **one mega-prompt** to a **multi-agent pipeline** —
without LangChain/LangGraph, without changing the API contract, and with better accuracy.

> Decision (locked): **hybrid granularity** — one combined classify+risk+explain call per
> clause, run concurrently — and the **core accurate path** scope (segment → per-clause →
> benchmark → verdict → verify, plus the fact extractor for depth panels). Negotiator/redline,
> missing-clause auditor, and LLM self-critique are deferred.

## Why we're doing this
The single call must segment, classify, score, extract, benchmark, find gaps, and summarise all
at once over the raw contract. That causes: shallow clause coverage, **hallucinated `quote`s**
(text not in the contract), inconsistent risk levels, and a verdict not grounded in the clauses.
Specialised agents over **segmented clauses** fix each of these.

## Architecture
```
ingest.extract_text(text)
        │
STAGE 0  SEGMENTER  segment(text) -> [Clause{id, heading, text}]     (deterministic, offline)
        │  clauses are REAL substrings of the contract  ► quotes can't be hallucinated
        ├───────────────────────────── asyncio.gather ──────────────────────────────┐
STAGE 1  CLAUSE AGENT (per clause, concurrent)            STAGE 2  FACT EXTRACTOR     │
         analyze_clause(c) -> {category, risk_level,               extract_facts(text)│
           plain_english, why_risky, suggested_fix}                -> {key_facts,money,│
        │                                                            dates,obligations,│
        │  BENCHMARK (vector, no LLM)  apply_benchmarks()            exit}             │
        └───────────────────────────────────────────────────────────────────────────┘
        │
STAGE 3  VERDICT SYNTHESIZER  synthesize_verdict(clause_results, facts)
         -> {verdict{risk_score,risk_level,summary_line,summary_bullets,fairness}, red_flags[]}
        │  reasons over STRUCTURED clause findings, not raw text ► consistent verdict
STAGE 4  VERIFIER (deterministic gate)
         - every red_flag.clause_id exists
         - every clause.quote is a verbatim substring of the source (whitespace-normalised)
         - risk levels / counts internally consistent
        │
        ▼  assemble AnalysisResult (schema UNCHANGED) → cache → return
```

## Agent contracts (each = one small async function + its own prompt via `llm_json`)
| Agent | File | Input | Output (its slice) |
|---|---|---|---|
| Segmenter | `pipeline/segment.py` | contract text | `list[Clause{id,heading,text}]` |
| Clause agent | `pipeline/agents/clause.py` | one clause {heading,text} | `{category, risk_level, plain_english, why_risky, suggested_fix}` |
| Benchmark | `pipeline/benchmark.py` (exists) | analysed clauses | `clause.benchmark{percentile,typical}` |
| Fact extractor | `pipeline/agents/extract.py` | contract text | `key_facts, money, dates, obligations, exit` |
| Verdict synthesizer | `pipeline/agents/verdict.py` | clause results + facts | `verdict{...}, red_flags[]` |
| Verifier | `pipeline/verify.py` | assembled result + source text | cleaned result (drops/repairs bad items) |

**Key accuracy property:** the per-clause agent never emits a `quote` — the clause `quote` is the
segmenter's verbatim `text`. The agent only *classifies* real text, so quotes are correct by
construction; the verifier catches anything that slips.

## Concurrency (no SDK rewrite)
- `genai.chat` is sync. Add `async def llm_json_async(prompt, schema)` that runs the sync call via
  `starlette.concurrency.run_in_threadpool` under an `asyncio.Semaphore(settings.agent_concurrency)`
  (default 5) to respect OCI rate limits.
- `orchestrator.run_analysis_async(text)` uses `asyncio.gather` for the per-clause fan-out and the
  contract-level extractor. The `/api/analyze` endpoint `await`s it directly (no outer threadpool).
- Cap clauses at `settings.max_clauses` (longest / keyword-bearing first) to bound latency & cost.

## Latency note
Many small parallel calls replace one ~45s monolith. With a clause cap + semaphore this should land
near or under the monolith's time, and is far more accurate. (Streaming Layer-1 first is a later
optimisation, not in this plan.)

## What does NOT change
- `models/schemas.py` / frontend `types.ts` — **frozen**. The UI is untouched.
- `vectorstore.py`, `embeddings.py`, `benchmark.py`, `chat.py`, `ingest.py` — reused as-is.
- The monolith stays behind `settings.use_agents` (default on) as a one-flag fallback.

## Build order (each step independently verifiable)
1. **`segment.py`** — heuristic split (numbered/ALL-CAPS headings; paragraph fallback). Pure,
   offline. Verify on the 3 sample contracts → sane clause counts/headings.
2. **`genai.llm_json_async` + semaphore** — the concurrency primitive. (Add a `FAKE_OCI` chat stub
   so agents can be exercised offline by the rest of the team.)
3. **`agents/clause.py`** — per-clause classify+risk+explain (+ Pydantic output). Test on a few
   real clauses.
4. **`agents/extract.py`** — contract-level facts.
5. **`agents/verdict.py`** — synthesizer over structured clause results + facts.
6. **`verify.py`** — deterministic quote/id/consistency gate.
7. **`orchestrator.run_analysis_async`** — wire stages with `asyncio.gather`; add `use_agents` flag;
   update `routes.analyze` to `await` it. Keep the monolith path.
8. **End-to-end real run** on the 3 samples — confirm risk tiers separate (dangerous/suspicious/
   legit) and measure latency.

## Definition of done
`/api/analyze` runs the agent pipeline on a real PDF, returns a schema-valid `AnalysisResult` with
verbatim quotes and a clause-grounded verdict, on OCI GenAI + the vector store, with the three
sample contracts landing in visibly different risk tiers.
