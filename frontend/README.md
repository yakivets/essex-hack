# PactPilot Frontend

The web UI — a no-login, single-page experience: upload/sample → animated processing →
a full-viewport results cockpit (document on the left, risk + RAG chat on the right).

- **Stack:** React 19 · TypeScript · Vite · **TanStack Start** (SSR) · Tailwind CSS v4 · shadcn/ui ·
  lucide-react · jsPDF.
- **Theming:** light/dark via CSS variables (`src/styles.css`), toggled in the top bar, persisted to
  `localStorage`, respects the OS preference.
- **Talks to the backend** only through `src/lib/api.ts`. With `VITE_API_BASE_URL` empty it uses
  built-in **mock data**, so the UI runs with no backend at all.

## Run

```bash
cd frontend
npm install
npm run dev          # open the URL it prints (http://localhost:8080)
```

Other scripts: `npm run build` (production) · `npm run lint` · `npm run format` (Prettier — run this
before committing so the editor stops flagging formatting).

## Connect to the backend

Create `frontend/.env`:

```
# empty  -> use built-in mock data (no backend needed)
# set    -> call the real API
VITE_API_BASE_URL=http://localhost:8000
```

That env var is the **only** integration point. Mock mode (`empty`) returns `mockAnalysis` from
`src/lib/mockAnalysis.ts` after a simulated delay, so every screen is demoable offline.

## Structure

```
src/
  routes/
    __root.tsx           app shell (head, error wrappers)
    index.tsx            the single page: upload → processing → results
  components/
    pactpilot/           the app's own components:
      TopBar.tsx           logo (→home), Details drawer trigger, theme toggle, New
      UploadHero.tsx       landing: drag-drop / paste / sample chips
      Processing.tsx       animated "contract under review" wait screen
      ResultsLayout.tsx    no-scroll two-pane shell (owns selection + chat state)
      DocumentPane.tsx     left: contract with risk highlights, filters, minimap
      RiskRail.tsx         right: verdict gauge + Flags/Chat tabs + clause detail
      ChatPanel.tsx        RAG chat (grounded answers + clickable citations)
      DetailsDrawer.tsx    shadcn Sheet with depth panels (obligations, money, dates, exit…)
      Sections.tsx         the depth-panel cards
      ThemeToggle.tsx      light/dark switch
      risk.tsx             risk colour / label helpers + RiskBadge
    ui/                  shadcn/ui primitives (Sheet, Tabs, …)
  lib/
    api.ts               getSamples / analyze / getAnalysis / chat  (mock-or-real)
    types.ts             AnalysisResult & friends — the FROZEN contract (mirror of schemas.py)
    mockAnalysis.ts      sample data for mock mode
    exportPdf.ts         branded PDF export (jsPDF, dynamically imported)
    utils.ts             cn() etc.
  styles.css             Tailwind v4 + design tokens (light + .dark) + animations
```

## Conventions

- **Never break on missing data.** Layer-1 fields (`verdict`, `key_facts`, `red_flags`, `clauses`,
  `document`) are guaranteed; depth panels can be `null`/`[]` — render gracefully.
- **`types.ts` is the contract.** It must stay identical to `backend/app/models/schemas.py`
  (and `docs/03-api-contract.md`). Don't add a field the backend doesn't send.
- All network calls live in `api.ts`. Components never `fetch` directly.
- Use the design tokens (`bg-card`, `text-foreground`, `var(--risk-high)`, …) — not hardcoded
  colours — so light/dark both work.

## Notes

- TanStack Start renders on the server, so anything touching `window`/`document`/`localStorage`
  must run in `useEffect` or a dynamic import (see `ThemeToggle.tsx`, `exportPdf.ts`).
- The risk gauge, fairness meter, and processing scene are inline SVG/CSS — no chart library.
