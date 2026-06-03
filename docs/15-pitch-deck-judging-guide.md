# PactPilot — Pitch Deck & Judging Guide

> **For:** Team pitch session — Thursday 4 June 2026, 2:00 PM sharp  
> **Format:** 5 minutes presentation + live demo · 2 minutes Q&A  
> **Slides due:** 12:00 noon same day → Dr Haider Raza · h.raza@essex.ac.uk  
> **Source:** IADS Hackathon opening deck + live product (main branch, June 2026)

---

## How to use this doc

| Judging requirement | Where in deck |
|---|---|
| 1. Problem Statement | Slides 1–2 |
| 2. Proposed Solution & USP | Slides 3–4 |
| 3. AI Architecture | Slide 5 (one diagram only) |
| 4. OCI Services Used | Slide 6 |
| 5. Live Demonstration | During talk (script below) |
| 6. Business Value | Slides 2, 4, 7 |

**Scoring weights (don't over-index on tech):**

| Criterion | Weight | Emphasise in talk |
|-----------|--------|-------------------|
| Problem Understanding | 15% | Founder on deadline, £ cost, hidden clauses |
| AI Architecture | 15% | One diagram; agentic steps; RAG + vectors |
| Functionality | 20% | **Live demo** — all flows |
| OCI Usage | 10% | Name 3–4 services; "all on OCI" |
| Innovation | 15% | Benchmark + negotiate + verdict-first vs ChatGPT |
| User Experience | 10% | Blur teaser, cockpit, citations, dark mode |
| Business Impact | 15% | Time/money saved, freemium, ROI story |

**~45% of marks** = Problem + Innovation + Business Impact (not product/tech alone).

---

## Suggested timing (5 minutes total)

| Time | What |
|------|------|
| 0:00–0:45 | Problem + who pays the price |
| 0:45–1:30 | Solution + USP (not a chatbot) |
| 1:30–2:15 | Business value + impact numbers |
| 2:15–2:45 | Architecture + OCI (brief) |
| 2:45–4:45 | **Live demo** |
| 4:45–5:00 | Close + "what's next" |

---

## Slide-by-slide content

### Slide 1 — Title

**PactPilot** — *Know what you're signing.*

- IADS Agentic AI Hackathon 2026 · University of Essex
- Team: [names + roles]
- Tagline for judges: *A lawyer's first pass in 30 seconds — for founders who can't afford £500/hr.*

**Speaker note:** Open with the Friday-afternoon scenario: vendor sends 28 pages, deadline Monday, founder signs blind.

---

### Slide 2 — Problem Statement *(15% — Problem Understanding)*

**Headline:** Small businesses sign contracts blind.

**Pain points:**

- **Volume:** NDAs, SaaS terms, supplier MSAs — 10–80 pages each, on deadline
- **Cost:** Lawyers £200–£500/hr; review takes days — too slow for a Monday signature
- **Hidden risk:** The danger isn't reading — it's **missing one clause** (auto-renewal, unlimited liability, one-sided termination)

**Who suffers:** Founders, freelancers, small ops teams — not enterprise legal departments.

**Stat to say aloud:** *Most SMBs have no benchmark for "normal vs predatory."*

**Maps to Challenge 1:** summarise · flag risk · highlight obligations · Q&A over contracts ✓

---

### Slide 3 — Solution & USP *(required #2 + 15% Innovation)*

**Headline:** PactPilot — decision support, not a chatbot.

**What it does in one flow:**

Upload → **Verdict in ~30s** → interactive document → market benchmark → grounded chat → **negotiation email**

**USP (say explicitly):**

1. **Verdict-first UX** — score + fairness meter before legalese
2. **Market benchmarks** — *"harsher than X% of comparable clauses"* (CUAD corpus + vector search)
3. **Grounded Q&A** — answers **cite clause text**, not hallucinations
4. **Negotiation Co-pilot** — turns flags into a ready-to-send email
5. **Agentic workflow** — read → extract → classify → benchmark → score → **act**

**One-line USP:** *ChatGPT summarises. PactPilot tells you if you should sign — and what to push back on.*

---

### Slide 4 — Business Value & Impact *(15% — Business Impact)*

**Headline:** From days and £££ to minutes and clarity.

| Before PactPilot | After PactPilot |
|---|---|
| Days waiting on legal | ~30–45 second first pass |
| £200–£500/hr lawyer triage | Free tier: instant verdict; full report on sign-in |
| No idea what "normal" looks like | Percentile vs real market clauses |
| Risk discovered after signing | Red flags **before** signature |
| Founder googles legalese | Plain-English + cited chat |

**Quantified story (use conservatively):**

- *"One missed auto-renewal clause can cost thousands — we surface it in the first screen."*
- *"Turns legal triage from a blocking cost into a 30-second decision gate."*

**Go-to-market:** Freemium — free verdict; sign-in unlocks full report, history, negotiate (blur teaser = business model).

**Footer:** *Not legal advice — first-pass triage, like a junior associate, not a replacement for counsel.*

---

### Slide 5 — AI Architecture *(15% — keep light)*

**Headline:** Agentic pipeline on Oracle Cloud

```
Founder upload
    ↓
FastAPI orchestrator (OCI Compute)
    ↓
┌─────────────────────────────────────┐
│ 1. Ingest (PDF/DOCX/text)           │
│ 2. OCI GenAI — structured analysis  │
│ 3. Embed clauses (OCI GenAI)        │
│ 4. Vector search vs CUAD corpus     │
│ 5. RAG chat over THIS contract      │
│ 6. Negotiation draft from flags     │
└─────────────────────────────────────┘
    ↓
Verdict + cockpit + chat + email
```

**Agentic proof:** Multi-step reasoning with retrieval and structured output — not a single prompt-and-pray chat.

**Honesty for Q&A:** Analysis is currently one orchestrated LLM call (~45s); multi-agent split is designed next — **working prototype today**.

---

### Slide 6 — OCI Services Used *(10% — OCI Usage)*

**Headline:** Built on Oracle — not hosted elsewhere.

| OCI service | Role in PactPilot |
|---|---|
| **OCI Generative AI** | Contract analysis, embeddings, RAG answers (`command-r-08-2024`, `embed-english-v3.0`) |
| **Autonomous DB 23ai** | AI Vector Search — `cuad_clauses` benchmark corpus *(code ready; demo may use in-memory fallback until ADB wired)* |
| **OCI Compute (Ampere A1)** | Hosts API + web UI behind nginx |
| **Object Storage** *(planned)* | Ephemeral upload storage — privacy story |

**Sponsor line:** *UI, AI, vectors, and compute all on OCI — Oracle is the engine, not a checkbox.*

---

### Slide 7 — Innovation & Moat vs Competitors *(15% Innovation)*

**Headline:** Why PactPilot wins vs alternatives

| | Generic AI (ChatGPT) | Enterprise CLM (Ironclad, Kira) | **PactPilot** |
|---|---|---|---|
| Target user | Anyone | Fortune 500 legal teams | **SMB founders** |
| Output | Wall of text | Workflow + repo | **Verdict + heatmap** |
| Market benchmark | None | Internal playbooks | **CUAD vector benchmark** |
| Citations | Unreliable | N/A for SMB | **Clause-level RAG** |
| Next action | You write the email | Legal team negotiates | **Negotiation Co-pilot** |
| Price / access | Subscription | Enterprise £££ | **Free verdict → unlock** |
| Time to value | Prompt engineering | Weeks onboarding | **30 seconds** |

**Moat:**

- **Verdict-first + benchmark-grounded** — optimised for *sign / don't sign / negotiate*, not chat
- **OCI-native agent stack** — GenAI + 23ai vector search in one deployable product

---

### Slide 8 — Live Demo & Close *(20% Functionality + 10% UX)*

**Headline:** See it work — [localhost / deployed URL]

**Demo path:**

1. Upload founders' agreement → processing animation
2. **Logged out:** blur teaser — score 50/100, fairness "Balanced", unlock CTA
3. Sign in `demo@pactpilot.ai` / `demo1234` → full cockpit unlocks
4. Document pane — colour-coded clauses (medium/low)
5. Chat: *"Any vesting period? Red flags for founder with less equity?"* → **cited clauses**
6. **Negotiate** → email draft from selected flags
7. **Export PDF** · **Dashboard** — saved contracts

**Close:** *"A working prototype that turns contract panic into a confident decision — on Oracle Cloud."*

---

## Feature inventory

### Core (Challenge 1 + mandatory)

- PDF / DOCX / paste / 3 sample contracts
- Plain-English summary + risk score 0–100
- Clause classification + red-flag ranking
- Interactive document with risk highlights + minimap
- RAG Q&A with citations
- Vector DB + semantic search (CUAD corpus)
- Deployed web app on OCI

### Differentiators

- Fairness meter (favours you ↔ them)
- Market benchmark per clause (% vs typical)
- Missing-clause / depth panels (obligations, money, dates, exit)
- Branded PDF export
- Negotiation Co-pilot (tone + selectable flags → email)
- Freemium blur teaser + accounts + contract dashboard
- Light/dark theme, no-scroll cockpit UX

### Say carefully in Q&A

- **Document AI OCR** for scanned PDFs — on `feat/document-ai-ocr`, not merged to `main` yet
- **Object Storage** — planned, not fully coded
- **ADB 23ai** — implemented; may demo on in-memory fallback if ADB not connected

---

## 5-minute demo script

| Step | Action | Line to say |
|------|--------|-------------|
| 1 | Open app | "Friday 4pm — vendor wants this signed by Monday." |
| 2 | Upload / sample | "No legal team. One upload." |
| 3 | Wait ~45s | "Real OCI GenAI — not canned." |
| 4 | Blur screen | "Free tier: instant verdict — score, summary, fairness." |
| 5 | Sign in | "Unlock full report — our freemium model." |
| 6 | Click clause | "Plain English + benchmark vs market." |
| 7 | Chat question | "Grounded — every answer cites the contract." |
| 8 | Negotiate | "We don't just find problems — we help you push back." |
| 9 | Dashboard | "History for repeat signers — portfolio view." |

**Backup if live fails:** Use product screenshots in the deck as "recorded demo."

**Demo credentials:** `demo@pactpilot.ai` / `demo1234`

---

## Q&A prep (2 minutes)

| Question | Short answer |
|----------|--------------|
| Is this legal advice? | No — triage tool; always recommend counsel for high-stakes deals. |
| How is this agentic? | Multi-step pipeline: ingest → extract → classify → vector benchmark → score → negotiate. |
| Why Oracle? | GenAI + 23ai vectors + Compute — full stack on OCI per hackathon rules. |
| vs ChatGPT? | Structured verdict, CUAD benchmarks, cited RAG, negotiation output — built for signing decisions. |
| Privacy? | Ephemeral processing; no long-term storage of raw uploads (stateless analysis path). |
| Accuracy? | Grounded citations + market corpus; depth panels best-effort; not replacing lawyers. |

---

## Gamma.app prompt

Paste into [gamma.app](https://gamma.app) to generate slides:

```
Create a 8-slide pitch deck for a university hackathon (5-minute presentation + live demo).

Brand: "PactPilot" — tagline "Know what you're signing."
Event: IADS Agentic AI Hackathon 2026, University of Essex. Sponsor: Oracle Cloud Infrastructure (OCI).
Audience: Academic judges + industry panel. Tone: confident, business-focused, not overly technical.

Visual style:
- Modern SaaS aesthetic, dark mode friendly (navy/charcoal background, white text, accent blue + risk colors: red/amber/green)
- Clean diagrams, minimal bullet text (max 5 bullets per slide)
- Include placeholder boxes for 4 product screenshots: (1) blurred freemium verdict teaser, (2) full document cockpit with clause highlights, (3) RAG chat with clause citations, (4) negotiation email modal
- Professional, founder-focused — not cyberpunk, not generic corporate blue

Slide 1 — Title: PactPilot, team names, hackathon, tagline
Slide 2 — Problem (15% weight): SMB founders sign 10-80 page contracts blind; lawyers cost £200-500/hr; hidden clauses (auto-renewal, liability) cause real financial harm. Target user: small business founder on a deadline.
Slide 3 — Solution & USP: AI contract co-pilot — verdict in 30 seconds. NOT a chatbot. Features: risk score, fairness meter, clause heatmap, market benchmarks vs CUAD corpus, grounded Q&A with citations, negotiation email co-pilot. USP one-liner: "ChatGPT summarises. PactPilot tells you if you should sign."
Slide 4 — Business value (15% weight): Before/after table — days→seconds, £500/hr→free first pass, no benchmark→percentile vs market, sign blind→negotiate with evidence. Freemium model: free verdict, sign-in unlocks full report + dashboard. Footer: "Not legal advice."
Slide 5 — AI architecture (keep simple): One flow diagram — Upload → FastAPI on OCI Compute → OCI GenAI (analysis + embeddings) → Vector DB (Oracle 23ai / CUAD) → RAG chat → Negotiation draft → Verdict UI. Label as "agentic multi-step workflow, not single chat prompt."
Slide 6 — OCI services: OCI Generative AI (Cohere command-r + embeddings), Autonomous Database 23ai AI Vector Search, OCI Compute Ampere A1, Object Storage (planned). Emphasise entire solution runs on Oracle Cloud.
Slide 7 — Innovation vs competitors: Comparison table — ChatGPT vs Enterprise CLM (Ironclad/Kira) vs PactPilot. Moat: verdict-first UX, CUAD vector benchmarks, cited RAG, negotiation co-pilot, SMB-focused freemium.
Slide 8 — Demo & close: 60-second demo script bullets (upload → blur teaser → sign in → chat with citations → negotiate → dashboard). Closing: "Working prototype. Real business value. Built on OCI."

Do NOT overload slides with code or API names. Prioritise problem understanding, business impact, and innovation over technical depth. Match judging criteria weights: Problem 15%, Business Impact 15%, Innovation 15%, Functionality 20%, AI Architecture 15%, OCI 10%, UX 10%.
```

---

## Hackathon rules reminder (from opening deck)

- **Goal:** AI agent that solves a real business problem, uses OCI, delivers measurable value, **working prototype**
- **Think beyond chatbot:** agents, RAG, workflow automation, intelligent decision support
- **Must run on OCI** — no Vercel/Netlify/third-party hosting for the deployed product
- **Judges expect:** working prototype > ambitious undemoable idea
- **Architecture diagram:** include OCI resources (Compute, GenAI, ADB 23ai)

---

## Speaker assignments (suggested)

| Person | Owns |
|--------|------|
| Non-tech / pitch lead | Slides 2, 4, 8 close — problem + business value |
| CTO / infra | Slide 6 — OCI services (30 sec max) |
| Backend / AI | Slide 5 — architecture (30 sec max) |
| Demo driver | Live walkthrough — rehearse twice |

---

## Related docs

- [`01-project-brief.md`](01-project-brief.md) — product vision + killer scenario
- [`STATUS.md`](STATUS.md) — what's verified vs not (honest demo claims)
- [`IMPLEMENTATION-TRACKER.md`](IMPLEMENTATION-TRACKER.md) — feature checklist
- [`06-oracle-setup.md`](06-oracle-setup.md) — OCI deploy checklist
- [`08-oci-onboarding.md`](08-oci-onboarding.md) — OCI mental model

---

_Last updated: 2026-06-03 · branch: `docs/pitch-deck-judging-guide`_
