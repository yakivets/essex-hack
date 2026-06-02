# Lovable UI — Build Prompt & Screen Specs

Lovable builds the **frontend only**. We ignore/strip any backend it offers and wire the UI to
our FastAPI backend via the [API contract](03-api-contract.md). The UI must work standalone on
**mock data** first, then flip to the real API by setting one env var.

## Golden rules for the UI team
1. Build against the **mock `AnalysisResult`** (copy the example from the API contract). Do not
   wait for the backend.
2. The only integration point is `VITE_API_BASE_URL`. When unset → use mock data; when set → call
   the real API.
3. **Layer-1 fields are guaranteed; depth panels may be `null`/`[]` — render gracefully (hide the
   whole collapsible section if its data is absent).**
4. Match field names to the contract **exactly**. If you want a field that isn't there, ask — don't invent.

## Design direction (the "contract book" system)
A **bright, modern, trustworthy legal-tech** look — think a beautifully typeset contract on fine
paper, not a dark dashboard. Single page, everything reachable by scrolling and expanding
**collapsible "chapter" cards**.

- **Mood:** Trust & Authority. Calm, premium, editorial. No AI purple/pink gradients, no neon, no clutter.
- **Palette (light, warm paper):**
  - Background `#FAF6EE` (warm ivory "paper"); cards `#FFFFFF` with a soft deckled-edge shadow.
  - Ink text `#0F172A`; muted text `#475569` (never lighter than slate-600).
  - Primary navy `#1E3A8A`; accent **gold** `#B45309` (used for the CTA, section rules, the wax-seal verdict).
  - Risk colours, warmed to sit on paper but still ≥4.5:1 contrast: **HIGH** `#B91C1C` (terracotta red),
    **MEDIUM** `#B45309` (ochre amber), **LOW** `#15803D` (sage green), **NONE** = no highlight.
    Colour is never the only signal — always pair with a label/icon.
- **Typography (Google Fonts):** headings & contract body in **EB Garamond** (serif, authoritative);
  UI/labels/buttons in **Lato** (clean sans). Import:
  `@import url('https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600;700&family=Lato:wght@300;400;700&display=swap');`
  Tailwind: `fontFamily: { serif: ['EB Garamond','serif'], sans: ['Lato','sans-serif'] }`.
  Body text ≥16px, line-height 1.6, contract body lines limited to ~70 characters.
- **Bookish details:** thin gold rule under each section title; serif **chapter numbers** (01–08) beside
  section titles; the verdict shown as an embossed **wax-seal badge**; a subtle drop-cap on the summary;
  generous whitespace; `max-w-5xl` centred "page".
- **Icons:** SVG only (Lucide/Heroicons), 24×24 viewBox, consistent sizing. **No emoji as icons.**
- **Interaction:** `cursor-pointer` on every clickable card; hover = colour/shadow/border change
  (never a scale that shifts layout); transitions 150–300ms `ease-out`.
- **SVG animations (creative but restrained — max ~2 moving things per view, all gated behind
  `prefers-reduced-motion`):**
  - Brand mark: a small document/quill SVG whose strokes *draw in* on load (`stroke-dasharray`).
  - Verdict **risk gauge**: an SVG arc that animates `stroke-dashoffset` from 0 → score on reveal.
  - **Fairness meter**: an SVG balance-scale (or slider thumb) that eases to its position.
  - **Processing**: an SVG "scanner line" sweeping a faux document while clause lines highlight in
    sequence (the "agent reading"); plus a ticking checklist. Use skeleton screens, never a frozen blank.
  - Accordion **chevrons** rotate; sections reveal with a height + fade `ease-out` transition.
  - Loading uses `animate-pulse`/`animate-spin` only — no infinite decorative motion.

---

## The paste-into-Lovable prompt

> Build a **single-page** web app called **PactPilot** — an AI contract-review tool for small-business
> founders. The vibe is a **beautifully typeset contract on fine paper**: bright, warm, premium,
> trustworthy legal-tech (not a dark dashboard). **No login, no accounts, no auth** — one stateless page.
>
> **Design system.** Background warm ivory `#FAF6EE`; white cards with soft deckled-edge shadows; ink
> text `#0F172A`, muted `#475569`; primary navy `#1E3A8A`; gold accent `#B45309`. Risk colours
> HIGH=`#B91C1C`, MEDIUM=`#B45309`, LOW=`#15803D` (used only for risk, always paired with a label).
> Fonts: **EB Garamond** (serif) for headings and contract body, **Lato** (sans) for UI. Body ≥16px,
> line-height 1.6. Centre everything in a `max-w-5xl` "page". SVG icons only (Lucide) — no emojis.
> All clickable elements get `cursor-pointer` and a 150–300ms ease-out hover. Respect
> `prefers-reduced-motion` for every animation.
>
> **Layout:** one page with a fixed slim **brand bar** at top (serif "PactPilot" wordmark + a small
> animated document/quill SVG that draws on load, tagline "Know what you're signing."). Below it, the
> app moves through three states in place: **Upload → Processing → Results**. Results is a stack of
> **collapsible "chapter" cards** (drop-down boxes) so everything lives on one scrollable page.
>
> **State 1 — Upload (the cover page).** A centred "document cover" card: headline "Know what you're
> signing.", subhead "A lawyer's first look in 30 seconds." A large drag-and-drop zone ("Drop your
> contract here — PDF or DOCX") with a browse button and a "paste text instead" toggle (textarea). Below:
> "Or try a sample:" with 3 chips loaded from `GET /api/samples` (`{id,name,description}`). Footer:
> "Private — we delete your file after analysis. Not legal advice." Submitting calls `analyze(input)`.
>
> **State 2 — Processing.** Replace the cover with an animated **SVG "reading" scene**: a faux document
> page with a gold **scanner line sweeping top-to-bottom** while clause lines highlight in sequence, and
> a checklist that ticks: "Reading document… → Extracting clauses… → Classifying… → Benchmarking against
> market norms… → Scoring risk…". Use skeleton placeholders for the verdict while waiting.
>
> **State 3 — Results.** All sections are **collapsible cards**, each with a serif **chapter number**
> (01, 02, …), a serif title, a thin gold rule, a count badge where relevant, and a rotating chevron.
> Smooth height+fade expand/collapse. The first two cards are open by default; the rest start collapsed.
> **Hide a section entirely if its data is `null`/`[]`.**
>
> *Verdict band (always visible, NOT collapsible, at the top):* a premium "executive summary" card with:
> a circular **risk gauge** as an SVG arc that animates to `verdict.risk_score` /100; an embossed
> **wax-seal badge** showing `verdict.risk_level` (HIGH/MEDIUM/LOW, coloured); `verdict.summary_line`
> as a serif headline with a drop-cap; the `verdict.summary_bullets` (~5) as a clean list; a **fairness
> meter** rendered as an SVG balance scale / slider from "Favours them" (left) to "Favours you" (right),
> positioned by `verdict.fairness.score` (-1..1) and labelled with `verdict.fairness.label`; and a
> **key-facts strip** (parties · term · value · auto-renewal · notice · governing law) from `key_facts`.
> An "Export" button (stub).
>
> *Chapter 01 — Red flags (open by default):* list from `red_flags` — each row shows `title`, a severity
> badge (`severity`), `explanation`, and `why_risky`. Clicking a flag selects its `clause_id` and scrolls
> the Document chapter to that clause. Include "◄ prev / next ►" to step through flags.
>
> *Chapter 02 — The document (open by default; the interactive reader):* a 3-pane layout inside the card —
> • **Left INDEX:** layer toggles (radio: "Red flags only" (default) / "All clauses" / "By category"), a
>   severity filter (High/Med/Low with counts), and a clickable list of clauses grouped by severity.
> • **Center DOCUMENT:** render `document.html` (serif, justified, paper feel); clauses are wrapped in
>   elements carrying `data-clause="<id>"` — highlight each by its `risk_level` colour. A thin **risk
>   minimap** on the right edge shows a coloured tick per clause; clicking a tick scrolls to it.
> • **Right DETAIL:** when a clause is selected (via index, a document highlight, the minimap, or a red
>   flag), show its `category` + `risk_level` badge, the quoted `text`, `plain_english`, `why_risky`, a
>   **benchmark** line ("harsher than {benchmark.percentile}% — {benchmark.typical}"), the `suggested_fix`,
>   and an "Ask about this clause" button that opens the chat pre-filled with that `clause_id`.
> The four selection sources must all select the **same** clause and stay in sync.
>
> *Remaining chapters (each a collapsible card; render only if the data is present):*
> • **03 — Your obligations:** two columns, `obligations.yours` vs `obligations.theirs`.
> • **04 — Money summary:** `money.total_value`, `payment_schedule`, `penalties[]`, `liability_cap`.
> • **05 — Key dates:** a horizontal **timeline** built from `dates[]` (`label`,`date`,`type`).
> • **06 — Exit analysis:** `exit.difficulty` badge, `exit.summary`, `exit.termination_terms[]`.
> • **07 — Missing clauses:** `missing_clauses[]` (`name`, `why_matters`) — framed as "protections this
>   contract is missing".
> • **08 — What happens if…:** `scenarios[]` (`question`/`answer`) as a small Q&A list.
> If `benchmark_summary` is present, show it as a one-line callout under the verdict band.
>
> *Chat (docked at the bottom of the page):* an input "Ask about this contract…" that POSTs via
> `chat(analysisId, message, clauseId?)` to `/api/chat`. Render the `answer` plus its `citations[]`
> (each shows the clause `quote`; clicking a citation selects that `clause_id` and scrolls the Document
> chapter to it).
>
> **Data layer:** read `VITE_API_BASE_URL`. If unset, import a local `mockAnalysis.ts` (a full
> `AnalysisResult`) and a mock samples list, and simulate the processing delay/animation. If set, call the
> real endpoints. Keep all API calls in a single `api.ts` module with typed functions: `getSamples()`,
> `analyze(input)`, `getAnalysis(id)`, `chat(analysisId, message, clauseId?)`. Define TypeScript types that
> mirror the `AnalysisResult` schema **exactly** (same field names).
>
> **Accessibility & polish:** every collapsible uses a real `<button>` header with `aria-expanded` and
> controls its panel; visible focus rings; keyboard-navigable; icon-only buttons have `aria-label`; alt
> text on meaningful SVGs; 44×44px min touch targets; light-mode text contrast ≥4.5:1; no horizontal
> scroll at 375/768/1024/1440px; reserve space for async content (no layout jump).

---

## After Lovable generates

- Export the project / connect the GitHub repo into `frontend/`. **Lovable does not host the product**
  — it's only the builder. From here it's our code: `npm run build` → static bundle served **from OCI**
  (nginx on the Ampere VM, or an Object Storage static site — see [06-oracle-setup.md](06-oracle-setup.md)).
  No Vercel/Netlify.
- Create `frontend/.env` with `VITE_API_BASE_URL=` (empty → mock mode; also fine in production when the
  bundle is served same-origin behind nginx with the API proxied at `/api/`).
- Drop the real `mockAnalysis.ts` from a backend sample so the UI looks real in the demo even offline.
- Verify the 4 sync points (index ↔ document highlight ↔ minimap ↔ detail) all select the same clause,
  and that red-flag and chat-citation clicks scroll the Document chapter to the right clause.

## Definition of done (UI)
Landing → sample click → animated processing scene → verdict band renders from mock (gauge + wax seal +
fairness scale) → collapsible chapters expand/collapse smoothly → clicking a red flag opens the Document
chapter, selects + scrolls + shows the benchmark → chat echoes a mocked answer with a clickable citation.
All with `VITE_API_BASE_URL` empty, bright "contract book" theme, and `prefers-reduced-motion` respected.
Then: set the env var and it talks to the real backend unchanged.
