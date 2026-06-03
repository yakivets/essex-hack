# Engineer Context — Onboarding & Who Owns What

Read this first, then your track's plan. The golden rule: **build to the
[API contract](03-api-contract.md). It is frozen. Don't change a field without telling the UI and
backend owners.**

## What we're building (10-second version)
PactPilot — a no-login web app where a founder drops in a contract and gets a 30-second risk
verdict, an interactive risk-highlighted document, market benchmarks, and a Q&A chat. Stack:
Lovable-built UI → FastAPI (no LangChain) → OCI GenAI + Oracle 23ai. Full context:
[01-project-brief.md](01-project-brief.md).

**OCI-first — and none of us have used OCI before.** The *entire deployed solution* runs on Oracle
Cloud (UI bundle + API + GenAI + 23ai + Object Storage); no Vercel/Netlify/third-party hosting. The
lead owns the OCI account and **mentors the team against [08-oci-onboarding.md](08-oci-onboarding.md)**
— start there before touching any cloud resource. For a **hands-on laptop path** (`.env`, CLI,
`smoke_oci`, two CMD windows), see **[12-dev-onboarding-local-oci.md](12-dev-onboarding-local-oci.md)**.
`FAKE_OCI=1` + mock mode keep everyone unblocked during dev, but the judged demo must run on real OCI.

## How we avoid collisions
The **API contract is the seam.** UI builds against mock JSON; backend builds the real JSON; both
match the contract exactly; merge = flip `VITE_API_BASE_URL`. The backend returns a **canned
`AnalysisResult` from hour 1**, so nobody is blocked waiting.

## Team split (6 people: 2 strong · 2 intermediate · 2 non-tech)
| Person | Pod | Owns | Start with |
|---|---|---|---|
| **Strong #1 (Lead)** | Glue + Infra | Architecture, API contract, **OCI setup & deploy**, mentoring the team on OCI, integration, demo wiring | **[14-cto-mykyta-handoff-tasks.md](14-cto-mykyta-handoff-tasks.md)** → [08-oci-onboarding.md](08-oci-onboarding.md) → [06-oracle-setup.md](06-oracle-setup.md) |
| **Strong #2** | AI Core | the async analysis orchestrator, vector store (23ai SQL), benchmark + risk steps, chat RAG | [05-backend-plan.md](05-backend-plan.md) Ph 3–5 |
| **Intermediate A** | Doc Pipeline | ingestion + segmentation (text + char offsets) | 05 Phase 1 |
| **Intermediate B** | Analysis steps | classify / extract / summary / missing steps | 05 Phase 4 |
| **Non-tech A** | Frontend (Lovable) | drive Lovable from the prompt, click-test the 3 sync points, polish/empty states | [04-lovable-ui-prompt.md](04-lovable-ui-prompt.md) |
| **Non-tech B** | Data & QA + Pitch | CUAD subset prep, sample contracts (incl. the demo "villain") + mock JSON, manual testing, **demo script + slides** | 05 Phase 3 + samples |

Principle: the **two strong engineers own the spine** (OCI + AI core + integration); intermediates take
bounded backend slices; non-tech own the **prompt-driven UI** (Lovable) and **data/QA/pitch** — always
bounded tasks, not open-ended ambiguity. The risky external dependency (OCI) sits with the lead, who
mentors. With only 2 strong engineers, keep OCI off the critical path by starting the account **today**.

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
