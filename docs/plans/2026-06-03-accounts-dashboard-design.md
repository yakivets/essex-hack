# Accounts + Dashboard + Blur-Teaser — Implementation Brief

Self-contained brief so a cold build agent (or a future session) can execute without
re-deriving context. Branch: `mykyta-dev`. Goal: add a real (demo-grade) account system,
a per-account contract dashboard, and a "sign in to unlock" blur teaser on results.

## Critical context / guardrails (read first)
- ⚠️ **The real API contract is `frontend/src/lib/types.ts`** (mirrored by
  `backend/app/models/schemas.py`). `docs/03-api-contract.md` is partially STALE — do not build to it.
  Risk levels are **lowercase** (`high|medium|low`); `clauses` is top-level; clause text is `quote`.
- ⚠️ **Do not break the OCI pipeline.** `FAKE_OCI` toggles canned vs real; `oci`/pipeline imports are
  lazy. Real OCI works (auth via `~/.oci/config`, London, `cohere.command-r-08-2024`).
- **Frontend is TanStack Start** (React 19, Vite, Tailwind v4, shadcn, bun). Single route
  `frontend/src/routes/index.tsx` drives a **view state machine** (`upload | processing | results`);
  results render in `components/pactpilot/ResultsLayout.tsx` → `RiskRail` + `DocumentPane`, with a
  shadcn `Dialog` overlay pattern (see `NegotiateModal.tsx`).
- **DB must be swappable to OCI Oracle**: SQLAlchemy with a single `DATABASE_URL`. Local =
  `sqlite:///./pactpilot.db`; OCI later = `oracle+oracledb://ADMIN:...@adb_high` (same driver + wallet).
- Run: backend `./.venv/Scripts/python.exe -m uvicorn app.main:app --port 8000`; frontend `bun run dev`
  (http://localhost:8080). `frontend/.env` → `VITE_API_BASE_URL=http://localhost:8000`. Don't commit
  `.env` / `~/.oci`.

## Locked decisions
- **Demo account (seeded on startup):** `demo@pactpilot.ai` / `demo1234`. Register also works for new emails.
- **Blur split:** free (logged-out) = risk gauge + risk level + `verdict.summary_line`. Locked behind
  sign-in = clauses, document pane, benchmarks, chat, negotiate, depth panels.
- **Dashboard = a `view` in the existing state machine** (`view: ... | "dashboard"`), not a new route.
- **Auto-save:** when logged in, analyzing auto-saves (frontend calls `POST /api/analyses`). Anonymous
  analyses are ephemeral (in-memory cache only) until the user logs in, then saved.
- **Saving is a separate `POST /api/analyses {analysis_id}`** endpoint (covers logged-in-analyze AND
  anon→login→save). `/api/analyze` stays auth-agnostic.
- New deps: `sqlalchemy`, `passlib[bcrypt]`, `pyjwt` (+ `oracledb` already present).

## The 10 steps (ordered; each independently testable)
1. **DB layer + deps + config.** Add deps to `requirements.txt`. `app/db.py`: engine/SessionLocal/Base
   from `settings.database_url` (SQLite `connect_args={"check_same_thread": False}`). Add
   `DATABASE_URL` (default `sqlite:///./pactpilot.db`), `JWT_SECRET`, `JWT_EXPIRE_HOURS` to `config.py`
   + `.env.example`.
2. **Models + seed.** `app/models/db_models.py`: `User(id, email unique, password_hash, created_at)`,
   `Analysis(id, user_id FK, filename, contract_type, risk_score, risk_level, result_json:Text, created_at)`.
   Create tables + seed demo user on startup (`main.py`).
3. **Auth module** `app/auth.py`: bcrypt hash/verify, `create_token`/`decode_token` (pyjwt),
   `current_user` dep (401), `optional_user` dep (anon-OK), `get_db` dep.
4. **Auth endpoints** (`app/api/auth_routes.py`): `POST /api/auth/register`, `POST /api/auth/login`
   → `{token, user}`; `GET /api/auth/me`. Pydantic models; email-exists / bad-credentials errors.
5. **History endpoints + DB fallback** (extend `routes.py`): `GET /api/analyses` → user's summaries
   `[{id, filename, contract_type, risk_score, risk_level, created_at}]`; `POST /api/analyses
   {analysis_id}` → read from cache, persist to current user (idempotent); `GET /api/analysis/{id}` →
   fall back to DB (owner-checked) when not in the in-memory cache. Store `result_json` = full AnalysisResult.
6. **Verify backend (curl):** register→token; login; analyze→id; `POST /api/analyses` save; `GET
   /api/analyses` lists it; reopen via `GET /api/analysis/{id}` from DB; 401 without token.
7. **Frontend auth context + api client.** `lib/auth.tsx` (user/token/login/register/logout; token in
   `localStorage`). Extend `lib/api.ts`: `login/register/getMe/getAnalyses/saveAnalysis`; attach
   `Authorization: Bearer <token>` when present; bootstrap user from token on load. Add types.
8. **Auth modal + header nav.** `AuthModal` (shadcn Dialog, Login/Register tabs, demo-creds hint).
   `TopBar`: "Sign in" when logged out; user menu + "Dashboard" + "New" when logged in.
9. **Blur teaser** in `ResultsLayout`: when logged out, keep verdict visible; wrap the rest in a blurred
   container with an overlay card "Sign in to unlock the full report" → opens `AuthModal`. On login →
   unblur + auto-save (`POST /api/analyses`) the current analysis.
10. **Dashboard view + e2e.** Dashboard component: stat cards (total analysed, # high-risk, avg risk
    score — from `GET /api/analyses`) + history list (filename, contract_type, risk badge, date) →
    click reopens full result (`GET /api/analysis/{id}` → set result + `view="results"`). Wire into the
    state machine + nav. E2E: upload anon → blur → sign in → unlock+save → dashboard shows it → reopen.

## Definition of done
Anon upload → real analysis → blurred teaser → sign in (`demo@pactpilot.ai`/`demo1234`) → full report +
auto-saved → Dashboard shows stats + the saved contract → reopening it loads the full result. Backend
on SQLite locally, swappable to OCI Oracle by changing `DATABASE_URL`. OCI pipeline untouched.
