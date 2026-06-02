# PactPilot — Project Brief

> Working name: **PactPilot** (provisional — easy to rename). Tagline: _"Know what you're signing."_  
> **Requirements & constraints:** see [`00-prd.md`](00-prd.md) (FR/NFR IDs, MoSCoW, judging matrix, team RACI).

## The one-liner

An AI co-pilot where a small-business founder drops in a contract and, in ~30 seconds, gets a
lawyer-quality first pass: a plain-English verdict, a clause-by-clause risk breakdown, a
"how does this compare to normal" benchmark, and answers to any question they ask.

## Hackathon context

- **Event:** IADS Agentic AI Hackathon (internal university). 48 hours.
- **Challenge:** Topic 1 — Contract Review Agent (legal document summarisation + risk flagging).
- **Mandatory capabilities (judging backbone):**
  1. Retrieval-Augmented Generation (RAG)
  2. Integration with **OCI AI services** (Oracle is the main sponsor — non-negotiable)
  3. A **vector database** for semantic search
  4. A **deployed** AI-enabled app (not just a notebook)
- **Team:** 6 people — 2 strong engineers (one is lead) + 2 intermediate + 2 non-technical.

## The problem

Businesses sign contracts constantly (supplier agreements, NDAs, SaaS terms, leases). Each is
10–80 pages of dense legalese. Lawyers cost £200–£500/hr and take days, so small businesses
often **sign blind**. The danger is rarely *understanding* the contract — it's *not noticing*
the one buried clause (auto-renewal, unlimited liability, a one-sided termination right, a penalty)
that costs them later. Non-lawyers also have **no benchmark** for what counts as "normal" vs predatory.

## Why this is *agentic*, not a chatbot

The system does what a junior lawyer does — a multi-step, tool-using workflow:
**read → identify clauses → classify → benchmark against market norms → score risk → act.**
It uses retrieval (vector search over a real contract corpus), structured extraction, and a
multi-node reasoning graph. That is the "agentic" story the judges named the event after.

## Target user

**Small-business owner / founder** who can't afford a lawyer and signs on a deadline.

## The killer scenario (the demo spine)

> Friday afternoon. A SaaS vendor sends a 28-page Master Services Agreement: "sign by Monday."
> The founder drops it into PactPilot. **30 seconds later:** risk score 74/100, three red flags —
> *auto-renews 3 years unless cancelled 90 days early, unlimited liability, 40% early-termination
> penalty* — each with "here's what's normal instead," plus a ready-to-send negotiation email.
> Sent before the coffee's cold.

## Product shape (locked decisions)

- **Form factor:** web-first, single page, **no accounts / no sign-in / stateless**.
- **Privacy angle:** uploaded file is processed and not retained (good pitch line).
- **Positioned** as the free tier of a SaaS — but we do **not** build auth/billing.
- **Browser extension / proactive inbox guardian:** future vision only (pitch's "what's next" slide).

## Results experience: verdict-first, depth on demand

**Layer 1 — The Verdict** (instant, above the fold):
- Risk score (0–100) + Low/Med/High badge
- One-line verdict ("⚠️ Proceed with caution — 3 high-risk clauses")
- Top 3 red flags (plain English)
- Fairness meter (whose side the contract favours: you ↔ them)
- Key-facts strip (parties · term · value · auto-renewal)

**Layer 2 — Depth on demand** (the interactive document cockpit):
- The contract rendered as an **interactive canvas** with risk highlights (red/amber/green).
  Toggle layers (red-flags-only / all clauses / by category), filter by severity, step
  through flags, risk minimap on the scrollbar.
- Click any highlight → detail panel: quoted text, plain English, why it's risky, benchmark,
  suggested safer wording, "ask about this clause".
- **Your obligations** checklist (what *you* must do vs what *they* must do)
- **Money summary** (cost, payment schedule, penalties, liability cap)
- **Key-dates timeline** (start → notice deadline → auto-renew → end)
- **Exit analysis** ("how hard is it to leave?")
- **"What happens if…" scenarios** (pay late / leave early / they breach)
- **Missing-clause detection** (protective clauses that are *absent*)
- **Q&A chat** — docked, grounded in this contract, answers cite the clause

## Feature scope (MoSCoW)

**Must have (core / required capabilities):** upload (PDF/DOCX/paste/sample) · plain-English
summary · clause classification + risk flagging · risk score + heatmap · vector DB + RAG ·
deployed web app · Q&A chat.

**Should have (the differentiators that win):** benchmark vs market · fairness meter ·
your-obligations checklist · missing-clause detection · key facts · clause-level citations.

**Could have (stretch):** suggested redlines · negotiation-email draft · money summary ·
key-dates timeline · exit analysis · what-if scenarios · PDF export.

**Won't have:** accounts/auth, billing, contract history/portfolio, word counts, readability
scores, sentiment analysis, word clouds (all vanity / out of scope).

## Cut for good (YAGNI)

Word/page counts, reading-time, readability score, sentiment analysis, word clouds, topic tags —
they look like analysis but drive no decision.

## What "done" looks like for the demo

A judge uploads `supplier_agreement.pdf` (or clicks a sample) → verdict card in ~30s → opens the
document cockpit → clicks the red "Liability" highlight → sees the benchmark "harsher than 85%" →
asks the chat "can I cancel early?" → gets a cited answer. Deployed on OCI, powered by OCI GenAI +
Oracle 23ai vector search.
