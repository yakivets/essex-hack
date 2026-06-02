# Engineer Context — Onboarding & Who Owns What

Read this first, then your track's plan. The golden rule: **build to the
[API contract](03-api-contract.md). It is frozen. Don't change a field without telling the UI and
backend owners.**

## What we're building (10-second version)
PactPilot — a no-login web app where a founder drops in a contract and gets a 30-second risk
verdict, an interactive risk-highlighted document, market benchmarks, and a Q&A chat. Stack:
Lovable UI → FastAPI → LangChain/LangGraph → OCI GenAI + Oracle 23ai. Full context:
[01-project-brief.md](01-project-brief.md).

## How we avoid collisions
The **API contract is the seam.** UI builds against mock JSON; backend builds the real JSON; both
match the contract exactly; merge = flip `VITE_API_BASE_URL`. The backend returns a **canned
`AnalysisResult` from hour 1**, so nobody is blocked waiting.

## Team split (7 people)
| Person | Pod | Owns | Start with |
|---|---|---|---|
| **You (Lead)** | Glue + Infra | Architecture, API contract, **OCI setup & deploy**, integration, demo | [06-oracle-setup.md](06-oracle-setup.md) |
| **Advanced** | AI Core | LangGraph graph, vector store, benchmark + risk nodes, chat RAG | [05-backend-plan.md](05-backend-plan.md) Ph 3–5 |
| **Intermediate A** | Doc Pipeline | Ingestion + segmentation (text + char offsets) | 05 Phase 1 |
| **Intermediate B** | Analysis | classify / extract / summary / missing nodes | 05 Phase 4 |
| **Intermediate C** | Frontend | Lovable build, the document cockpit, chat UI, wiring `api.ts` | [04-lovable-ui-prompt.md](04-lovable-ui-prompt.md) |
| **Beginner A** | Frontend (pair w/ Inter C) | UI components, fairness meter, risk minimap, polish, empty/null states | 04 |
| **Beginner B** | Data & QA | CUAD subset prep, sample contracts + mock JSON, manual testing, demo script | 05 Phase 3 + samples |

Principle: advanced owns the spine; beginners are always paired and get **bounded** tasks
(a component, a dataset) not open-ended ambiguity; the risky external dependency (OCI) sits with
the lead.

## The interfaces between pods (so work merges cleanly)
- **Doc Pipeline → Analysis:** `segment(text) -> list[Clause{id,heading,text,start,end}]`. That list
  is the input to every analysis node. Agree it early; it won't change.
- **Analysis nodes → Result:** each node fills only its slice of `AnalysisResult` (see backend plan).
  Nodes are independent and testable with a sample `clauses` list.
- **Backend → Frontend:** the API contract. Nothing else.
- **Data → AI Core:** `cuad_clauses` collection in the vector store (built by `ingest_cuad.py`),
  queried by the benchmark node.

## Local dev quickstart
```
# backend
cd backend && python -m venv .venv && .venv\Scripts\activate   # (Windows)
pip install -r requirements.txt
copy .env.example .env        # set FAKE_OCI=1 to run with no OCI access
uvicorn app.main:app --reload # http://localhost:8000

# frontend
cd frontend && npm install
# .env: leave VITE_API_BASE_URL empty for mock mode, or set to http://localhost:8000
npm run dev
```
`FAKE_OCI=1` stubs all OCI calls so anyone can run the full pipeline offline. Empty
`VITE_API_BASE_URL` runs the UI on mock data. **Nobody is ever blocked on cloud access.**

## Working agreements
- Branch per pod (`feat/pipeline`, `feat/ui`, `feat/nodes`…). Small PRs. Don't push to `main` directly.
- If you need a new field, **propose it in the API contract PR first**, get the UI + backend owners
  to ack, then both sides implement.
- Keep prompts/config near the code that uses them. Structured LLM output via Pydantic.
- Ask in the team channel before inventing a dependency or changing a shared interface.

## Definition of done (project)
Upload/sample → verdict < 40s → interactive risk document → click flag → benchmark + detail → chat
answer with citation. Deployed on OCI, using OCI GenAI + Oracle 23ai. Everything else is bonus.
See per-track "Definition of done" in each plan.
