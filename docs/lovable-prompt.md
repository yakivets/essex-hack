# PactPilot — Lovable Prompt (modern v2)

The paste-ready prompt for Lovable. Aesthetic = **modern premium SaaS** (Linear / Stripe / Vercel),
not the old "contract book" direction. It still binds to our frozen [API contract](03-api-contract.md):
exact field names, the four endpoints, mock mode via `VITE_API_BASE_URL`. Once you're happy with it,
say the word and I'll make this the canonical prompt and retire the old block in
[`04-lovable-ui-prompt.md`](04-lovable-ui-prompt.md).

---

## Paste this into Lovable

```text
Build a polished, single-page web app called PactPilot — an AI contract-review tool for
small-business founders. Target the production quality of Linear, Stripe and Vercel: clean,
bright, confident, modern SaaS. NOT a template, NOT skeuomorphic/parchment, NOT a dark dashboard,
NO AI purple/pink gradients. No login, no accounts, no auth — one stateless page.

VISUAL IDENTITY
- Surfaces: app background #FBFBFD; cards pure #FFFFFF; subtle section bands #F5F6F8; hairline
  borders #ECECEF.
- Text: primary #0B0B0F, secondary #4B5563, tertiary #9CA3AF.
- Accent: ONE confident blue #2563EB (hover #1D4ED8), used sparingly for primary actions, active
  states, focus rings and the live risk gauge.
- Risk colours (only for risk, always paired with a label/icon): HIGH #E11D48, MEDIUM #F59E0B,
  LOW #10B981.
- Type: Inter for everything — 700/600 headings, 400/500 body. Large confident headings with tight
  letter-spacing on display sizes; tabular-nums for numbers; body 16px / line-height 1.6.
- Shape & depth: rounded-2xl cards, soft layered shadows (low opacity, large blur), 1px hairline
  borders. 8pt spacing grid, generous whitespace, content centred in max-w-5xl.
- Icons: Lucide SVG only (1.5px stroke, 20–24px). Never emojis.
- Motion (subtle, springy, max ~2 hero animations per view, all behind prefers-reduced-motion):
  content fades + rises 8px on mount with a 40ms stagger; accordions expand via height+opacity
  ease-out ~200ms; cards/buttons lift on hover (shadow + 1px translate — never a layout-shifting
  scale). Loading uses shimmer skeletons / spinners only, no infinite decorative motion.

LAYOUT — one page, three in-place states
Sticky top bar (glassy: white/70 + backdrop-blur, hairline bottom border): left = a minimal SVG
logomark that draws its stroke once on load + "PactPilot" wordmark; right = a subtle "Not legal
advice" pill. The page transitions Upload -> Processing -> Results in place.

STATE 1 — UPLOAD (hero)
Centred hero. Eyebrow "AI CONTRACT REVIEW". H1 "Know what you're signing." (large, tight). Subhead
"A lawyer's first look — in 30 seconds." A large, inviting drag-and-drop zone (dashed hairline that
turns solid accent with a soft glow on drag-over) with an upload icon and "Drop a PDF or DOCX, or
browse", plus a "Paste text instead" ghost button that reveals a clean textarea. Below: "Or try a
sample" with 3 chips from GET /api/samples ({id,name,description}). A trust row of small ghost
badges: "Private · deleted after analysis" and "No account needed". Submitting calls analyze(input).

STATE 2 — PROCESSING
Swap the hero for a refined centred card: an SVG document with an accent scan-line sweeping
top -> bottom while 4–5 placeholder clause lines light up in sequence; beside it an animated
checklist that ticks off with a spring: Reading -> Extracting clauses -> Classifying ->
Benchmarking vs market -> Scoring risk. Show shimmer skeletons for the verdict while waiting.

STATE 3 — RESULTS
A pinned Verdict hero (NOT collapsible) followed by a vertical stack of collapsible section cards
("drop-downs"). Each section header is a real button: a Lucide icon in a soft tinted square, a
title, a count/severity badge on the right, and a chevron that rotates 180° when open. First two
sections open, the rest collapsed. HIDE any section whose data is null or []. Sections animate
height+opacity.

VERDICT HERO (always visible) — a clean two-column card.
  Left: a circular risk gauge (SVG ring: neutral track + accent/risk-coloured progress arc) that
  animates stroke-dashoffset from 0 and counts the number up to verdict.risk_score /100, with a
  coloured pill showing verdict.risk_level.
  Right: verdict.summary_line as a confident H2; verdict.summary_bullets (~5) as a tidy checklist;
  a fairness meter = a slim horizontal track with an animated thumb easing to verdict.fairness.score
  (-1..1), endpoints labelled "Favours them" / "Favours you", with the verdict.fairness.label; and a
  responsive key-facts strip of small stat tiles (parties · term · value · auto-renewal · notice ·
  governing law) from key_facts. A ghost "Export" button (stub). If benchmark_summary is present,
  show it as a one-line callout below the hero.

SECTION — Red flags (open by default): cards from red_flags, each with a left risk-coloured accent
bar, title, a severity badge, explanation and why_risky. Clicking a flag selects its clause_id and
scrolls the Document section to that clause. Include ◄ prev / next ► to step through flags.

SECTION — Document (open by default; the interactive reader): a 3-pane card —
  • Left INDEX: a segmented control "Red flags / All clauses / By category"; severity filter chips
    (High/Med/Low with counts); a scrollable clause list grouped by severity.
  • Center DOCUMENT: render document.html in a comfortable reading column; clauses are wrapped with
    data-clause="<id>" — highlight each by its risk_level colour as a soft underline/tinted
    background (tasteful, not garish). A thin risk minimap down the right edge shows one coloured
    tick per clause; clicking a tick scrolls to it.
  • Right DETAIL (sticky): when a clause is selected, show its category + risk_level badge, the
    quoted text, plain_english, why_risky, a benchmark line "Harsher than {benchmark.percentile}% —
    {benchmark.typical}", the suggested_fix in a soft callout, and an "Ask about this clause" button
    that opens the chat pre-filled with that clause_id.
  All four selection sources (index item, document highlight, minimap tick, red flag) must select
  the SAME clause and stay in sync.

SECTIONS (collapsed by default; render only if the data is present):
  • Your obligations — two columns: obligations.yours vs obligations.theirs.
  • Money — stat tiles for money.total_value, payment_schedule, penalties[], liability_cap.
  • Key dates — a horizontal timeline from dates[] (label, date, type) with a "today" marker.
  • Exit analysis — exit.difficulty badge, exit.summary, exit.termination_terms[].
  • Missing clauses — missing_clauses[] (name, why_matters), framed as "protections this contract
    lacks".
  • What happens if… — scenarios[] (question/answer) as an FAQ list.

CHAT (docked at the bottom as a floating glassy bar): an input "Ask about this contract…" that calls
chat(analysisId, message, clauseId?) -> POST /api/chat. Render the answer plus citations[] (each
shows the clause quote; clicking a citation selects its clause_id and scrolls the Document section to
it). Show a typing indicator while awaiting the response.

DATA LAYER: read VITE_API_BASE_URL. If empty, import a local mockAnalysis.ts (a full AnalysisResult)
and a mock samples list, and simulate the processing animation. If set, call the real endpoints. Put
ALL network calls in a single api.ts module with typed functions: getSamples(), analyze(input),
getAnalysis(id), chat(analysisId, message, clauseId?). Define TypeScript types that mirror the
AnalysisResult schema EXACTLY (identical field names).

QUALITY BAR: pixel-clean alignment on an 8pt grid; cursor-pointer + a visible focus ring on every
interactive element; accordions use aria-expanded + aria-controls; icon-only buttons have aria-label;
meaningful SVGs have <title>; touch targets ≥44px; text contrast ≥4.5:1; no horizontal scroll at
375 / 768 / 1024 / 1440px; reserve space for async content so nothing jumps. Make it feel expensive
and effortless.
```

---

## After Lovable generates
- Export / connect the repo into `frontend/`. **Lovable is only the builder — it never hosts the
  product.** `npm run build` → static bundle served **from OCI** (nginx on the Ampere VM, or an
  Object Storage static site; see [06-oracle-setup.md](06-oracle-setup.md)). No Vercel/Netlify.
- `frontend/.env`: leave `VITE_API_BASE_URL=` empty for mock mode (also fine in production when the
  bundle is served same-origin behind nginx with the API proxied at `/api/`).
- Drop a real `mockAnalysis.ts` from a backend sample so the demo looks real offline.
- Verify the four clause-selection sources stay in sync, and that red-flag / chat-citation clicks
  scroll the Document section to the right clause.
