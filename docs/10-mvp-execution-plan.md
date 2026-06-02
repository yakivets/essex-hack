# PactPilot — MVP Execution Plan (48 hours)

> **Owner:** whole team · **CTO spine:** Mykyta + Sukru · **Aligns with:** [`00-prd.md`](00-prd.md), [`05-backend-plan.md`](05-backend-plan.md), [`09-architecture-diagrams.md`](09-architecture-diagrams.md)

## MVP done = judged demo passes

1. Upload/sample → `AnalysisResult` in **&lt; 40s** on **real OCI** (GenAI + 23ai)
2. Layer 1 verdict + Chapter 02 highlights + benchmark on click
3. Chat with **citations** that scroll to clause
4. **One public OCI URL** (nginx: UI + `/api/` proxy)
5. 3-min pitch rehearsed + backup video ([`00-prd.md`](00-prd.md) §12)

## Scope (48h freeze)

| Tier | Ship |
|------|------|
| **Must** | Upload/samples, verdict, clause risk + HTML doc, CUAD benchmark RAG, chat, OCI deploy |
| **Should** | Fairness, missing clauses, depth chapters 03–08 (UI hides if null) |
| **Won’t** | Auth, LangChain, Vercel/Netlify, redlines/negotiation email unless time |

## Team deliverables

| Person | Deliver |
|--------|---------|
| **Mykyta** | OCI ([`08`](08-oci-onboarding.md), [`06`](06-oracle-setup.md)), Phase 0 scaffold, deploy, integrate h24–36 |
| **Sukru** | `orchestrator`, `vectorstore`, `genai`/`llm_json`, benchmark/risk/chat steps |
| **Claudia** | Lovable UI [`04`](04-lovable-ui-prompt.md), `api.ts`, 4-way clause sync |
| **Tarak** | CUAD subset, samples + villain contract, mock JSON, QA checklist |
| **Adriana** | Pitch/demo script (MUST features only), backup recording |

## Phase gates (backend Phases 0–7)

| Phase | Hours | Gate |
|-------|-------|------|
| **0** | 0–2 | Canned `AnalysisResult`; `uvicorn` + Claudia on shapes |
| **1** | 2–8 | `ingest` + `segment` frozen |
| **2** | 4–12 | GenAI + embed smoke; `FAKE_OCI` |
| **3** | 6–14 | `cuad_clauses` ingested; `similar()` works |
| **4** | 10–22 | Real PDF → valid `AnalysisResult` |
| **5** | 18–24 | `/api/chat` with citations |
| **6** | 24–30 | E2E local &lt; 40s |
| **7** | 28–36 | **Public OCI URL** |
| **8** | 36–48 | Polish + pitch + **freeze h44** |

## Timeline

| Hours | Focus |
|-------|--------|
| Pre | OCI account + GenAI region (Mykyta) |
| 0–2 | Phase 0 + merge product docs |
| 2–12 | Verdict UI mock; ingest; CUAD start |
| 12–24 | Document cockpit + chat; classify/benchmark |
| 24–36 | Integrate + **OCI deploy** |
| 36–44 | E2E villain contract; errors/a11y |
| 44–48 | Pitch; freeze |

## Implementation branches (after docs PR)

| Branch | Content |
|--------|---------|
| `feat/scaffold` | Phase 0 backend |
| `feat/ui` | `frontend/` from Lovable |
| `feat/pipeline` | ingest, segment |
| `feat/oci` | genai, vectorstore, ingest_cuad |
| `feat/steps` | orchestrator + steps |
| `feat/deploy` | Docker, nginx, OCI |

**Rule:** frozen [`03-api-contract.md`](03-api-contract.md) — no field changes without Claudia + Mykyta ack.

## Demo script (3 min)

Problem → upload on OCI URL → verdict + red flags → click Liability benchmark → chat “cancel early?” + citation → OCI stack → not legal advice.

## Risks

OCI late → pre-smoke + `FAKE_OCI` dev only · Slow analyze → `asyncio.gather` + cap clauses · Drift → canned JSON hour 1 · Live fail → backup video h44

---

*Full detail: Cursor plan `pactpilot_mvp_execution` · Diagrams: [`09-architecture-diagrams.md`](09-architecture-diagrams.md)*
