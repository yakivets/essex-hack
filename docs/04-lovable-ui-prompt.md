# Lovable UI — Build Prompt & Screen Specs

Lovable builds the **frontend only**. We ignore/strip any backend it offers and wire the UI to
our FastAPI backend via the [API contract](03-api-contract.md). The UI must work standalone on
**mock data** first, then flip to the real API by setting one env var.

## Golden rules for the UI team
1. Build against the **mock `AnalysisResult`** (copy the example from the API contract). Do not
   wait for the backend.
2. The only integration point is `VITE_API_BASE_URL`. When unset → use mock data; when set → call
   the real API.
3. **Layer-1 fields are guaranteed; depth panels may be `null`/`[]` — render gracefully.**
4. Match field names to the contract **exactly**. If you want a field that isn't there, ask — don't invent.

---

## The paste-into-Lovable prompt

> Build a single-page web app called **PactPilot** — an AI contract review tool for small-business
> founders. Clean, trustworthy, modern legal-tech aesthetic (think Linear/Notion): deep navy/charcoal
> base, white cards, one calm teal accent, generous whitespace, rounded cards, subtle shadows. Use a
> clean sans (Inter) for UI and a serif for contract body text. **No login, no accounts, no auth** —
> it's a stateless single page. Risk colours: HIGH=red, MEDIUM=amber, LOW=green, used only for risk.
>
> **Screen 1 — Landing / Upload.** Centered hero: headline "Know what you're signing.", subhead
> "A lawyer's first look in 30 seconds." A large drag-and-drop zone ("Drop your contract here — PDF
> or DOCX") with a browse button and a "paste text instead" toggle. Below it: "Or try a sample:"
> with 3 sample chips loaded from `GET /api/samples`. Footer line: "🔒 Private — we delete your file
> after analysis. Not legal advice."
>
> **Screen 2 — Processing.** After submit, show a centered card that narrates agent steps as an
> animated checklist ticking off: "Reading document… → Extracting clauses… → Classifying… →
> Benchmarking against market norms… → Scoring risk…". The faded document sits behind it.
>
> **Screen 3 — Results.** Two layers:
>
> *Layer 1 — Verdict (top, always visible):* a prominent card with a circular **risk gauge**
> (`verdict.risk_score` /100) and a `verdict.risk_level` badge (red/amber/green); the
> `verdict.summary_line`; the 5 `verdict.summary_bullets`; a **fairness meter** — a horizontal
> slider from "Favours them" (left) to "Favours you" (right) positioned by `verdict.fairness.score`
> (-1..1) with the `verdict.fairness.label`; a **key-facts strip** showing parties / term / value /
> auto-renewal from `key_facts`; and a **Top red flags** list from `red_flags` (title + severity
> badge + explanation). An "Export" button (can be a stub).
>
> *Layer 2 — Document cockpit (below / revealed):* a 3-pane layout —
> • **Left INDEX:** layer toggles (radio: "Red flags only" (default) / "All clauses" / "By category"),
>   a severity filter (High/Med/Low with counts), and a clickable list of clauses grouped by severity.
> • **Center DOCUMENT:** render `document.html`; clauses are wrapped with `data-clause="<id>"`.
>   Highlight each clause by its `risk_level` colour. A thin **risk minimap** on the right edge of the
>   document shows coloured ticks for every clause; clicking a tick scrolls to it.
> • **Right DETAIL:** when a clause is selected (via index, document highlight, or red flag), show its
>   `category` + `risk_level` badge, the quoted `text`, `plain_english`, `why_risky`, a **benchmark**
>   line ("📊 harsher than {benchmark.percentile}% — {benchmark.typical}"), the `suggested_fix`, and a
>   "💬 Ask about this clause" button that opens chat pre-filled.
> Clicking an index item, a document highlight, and a red flag must all select the same clause and
> sync all three panes. Add "◄ prev flag / next flag ►" buttons to step through red flags.
>
> *Depth panels (render only if present in the data):* "Your obligations" (two columns: yours/theirs),
> "Money summary", "Key dates" (a simple horizontal timeline from `dates`), "Exit analysis", and
> "Missing clauses". Each as a collapsible card under the cockpit.
>
> *Chat (docked bottom):* an input "Ask about this contract…" that POSTs to `/api/chat`; render the
> answer with its citations (each citation shows the clause quote and, on click, selects that clause).
>
> **Data layer:** read `VITE_API_BASE_URL`. If unset, import a local `mockAnalysis.ts` (an
> `AnalysisResult`) and a mock samples list, and simulate the processing delay. If set, call the real
> endpoints. Keep all API calls in a single `api.ts` module with typed functions: `getSamples()`,
> `analyze(input)`, `getAnalysis(id)`, `chat(analysisId, message, clauseId?)`. Define TypeScript
> types that mirror the AnalysisResult schema exactly.

---

## After Lovable generates

- Export the project / connect the GitHub repo into `frontend/`.
- Create `frontend/.env` with `VITE_API_BASE_URL=` (empty → mock mode).
- Drop the real `mockAnalysis.ts` from a backend sample so the UI looks real in the demo even offline.
- Verify the 3 sync points (index ↔ document ↔ detail) all select the same clause.

## Definition of done (UI)
Landing → sample click → processing animation → verdict card renders from mock → cockpit highlights
clauses → clicking a red flag selects + scrolls + shows benchmark → chat box echoes a mocked answer.
All with `VITE_API_BASE_URL` empty. Then: set the env var and it talks to the real backend unchanged.
