# DB + Deployment — Work Audit (Ankit)

> **For:** Ankit (backup dev — DB + deploy owner per Mykyta)  
> **Context:** Mykyta (CTO): *"can u do db and deployment pls. db is 26ai because 23ai is not available"*  
> **Repo state pulled:** `main` @ `f59c990` (merge `mykyta-dev`, 2026-06-03) — **docs only**, no infra code  
> **Last updated:** 2026-06-03

---

## TL;DR — how much is left?

| Area | Code ready? | Ops / your work | Effort |
|------|-------------|-----------------|--------|
| **Vector DB (ADB + CUAD ingest)** | ✅ ~95% | Provision ADB **26ai**, wallet, `.env`, run `ingest_cuad`, smoke | **2–4 h** |
| **Accounts DB on Oracle** | ✅ ~90% | Point `DATABASE_URL` at same ADB (recommended) or keep SQLite on VM | **30–60 min** (with vectors) |
| **Schema / migrations** | 🟡 create-only | No Alembic; verify tables on fresh ADB; document manual steps | **30 min** |
| **OCI Compute deploy** | ⏳ ~10% | VM, nginx, systemd, `.env`, wallet, build frontend | **3–5 h** |
| **Object Storage** | ⏳ 0% | Not required for judging minimum | **skip for now** |
| **Docs saying "23ai"** | — | Rename to 26ai in pitch/deploy notes (cosmetic) | **15 min** |

**Realistic total for a demo-ready public URL + real ADB vectors:** **~6–10 hours** (first time on OCI).  
**Minimum viable for judging (deploy + in-memory vectors):** **~3–4 hours** (skip ADB, keep SQLite on VM).

Mykyta's latest push did **not** include DB credentials, wallet, VM, or deploy scripts — only [`FEATURES.md`](FEATURES.md) and status doc updates.

---

## What Mykyta pushed (you are up to date)

```text
f59c990  Merge branch 'mykyta-dev'
c6f7cc4  docs: document current version + add FEATURES.md catalogue
```

**Changed:** `FEATURES.md`, `STATUS.md`, `IMPLEMENTATION-TRACKER.md`, READMEs, `CLAUDE.md`.  
**Not changed:** no `Dockerfile`, no nginx, no `.env` production template, no ADB wallet, no deploy automation.

`origin/mykyta-dev` is **2 commits ahead** of `main` (README + lovable prompt trim only) — nothing deploy-related.

---

## 26ai vs 23ai — what it means for you

| Topic | Detail |
|-------|--------|
| **Why 26ai** | 23ai not offered in your tenancy/region; Mykyta chose **Autonomous DB 26ai** instead |
| **Impact on code** | **Likely none.** App uses standard `VECTOR(dim, FLOAT32)` + `VECTOR_DISTANCE(..., COSINE)` via `oracledb` — supported on 23ai+ and should work on 26ai |
| **Impact on docs/pitch** | Say *"Oracle Autonomous Database 26ai (AI Vector Search)"* instead of 23ai |
| **Always Free** | Confirm in OCI console that the 26ai instance is Always Free tier before provisioning |
| **What to verify first** | Connect with wallet → `SELECT * FROM V$VERSION` → run a one-row VECTOR insert test |

No code references hard-code "23ai" in SQL — only comments/docs say 23ai.

---

## Database design — what exists today

The app uses **two separate database mechanisms** (easy to miss):

### 1. Accounts + saved history (SQLAlchemy)

| Item | Detail |
|------|--------|
| **Driver** | SQLAlchemy 2.x + `oracledb` (when on Oracle) |
| **Config** | `DATABASE_URL` in `.env` |
| **Local default** | `sqlite:///./pactpilot.db` |
| **Oracle swap** | `DATABASE_URL=oracle+oracledb://ADMIN:<pw>@<tns_name_high>` + `TNS_ADMIN=/path/to/wallet` |
| **Tables** | `users`, `analyses` (see `backend/app/models/db_models.py`) |
| **Init** | `init_db()` → `Base.metadata.create_all()` on app startup (`main.py` lifespan) |
| **Seed** | Demo user `demo@pactpilot.ai` / `demo1234` idempotent on startup |

**`analyses` schema:**

- `id` (PK, same as analysis cache id)
- `user_id` → `users.id`
- `filename`, `contract_type`, `risk_score`, `risk_level`
- `result_json` (full `AnalysisResult` JSON text)
- `created_at`

### 2. Vector store — benchmarks + RAG (raw `oracledb`)

| Item | Detail |
|------|--------|
| **Driver** | Direct `oracledb.connect()` — **not** SQLAlchemy |
| **Config** | `ADB_USER`, `ADB_PASSWORD`, `ADB_DSN`, `TNS_ADMIN`, `EMBED_DIM=1024` |
| **Toggle** | `ADB_DSN` non-empty → `settings.use_oracle` → `OracleVectorStore`; else in-memory cosine |
| **Tables** | `cuad_clauses` (market corpus, one-time ingest), `doc_clauses` (per-analysis RAG index) |
| **Init** | `_ensure_schema()` runs `CREATE TABLE IF NOT EXISTS` on first vector store use |
| **Ingest** | `python -m scripts.ingest_cuad` (once; re-run duplicates rows on Oracle) |

**Vector row shape:** `id`, `text`, `category`, `analysis_id`, `typical`, `harshness`, `embedding VECTOR(1024, FLOAT32)`.

### Recommended production layout (one ADB 26ai)

Use **one** Autonomous DB instance for **both**:

```env
# Same wallet folder for both
TNS_ADMIN=/home/ubuntu/wallet

# Accounts (SQLAlchemy)
DATABASE_URL=oracle+oracledb://ADMIN:<password>@pactpilot_high

# Vectors (oracledb) — same instance
ADB_USER=ADMIN
ADB_PASSWORD=<same password>
ADB_DSN=pactpilot_high
EMBED_DIM=1024
```

**Why one DB:** simpler ops, one wallet, survives VM restart, matches "real Oracle stack" story for judges.

**Alternative (not recommended):** SQLite file on VM for accounts + ADB only for vectors — works for hackathon but fragile (file permissions, no HA, two persistence models).

---

## Migrations — current state

| Question | Answer |
|----------|--------|
| **Alembic / Flyway?** | ❌ **None** — no migration framework in `requirements.txt` |
| **How schema is created** | SQLAlchemy `create_all()` + vectorstore raw DDL |
| **Idempotent?** | Yes on fresh DB; vector DDL swallows "table already exists" |
| **Schema versioning?** | ❌ No — if models change, manual `ALTER` or drop/recreate |
| **What you need to do** | On first deploy: start API once → tables auto-create; run `ingest_cuad` once |

**For hackathon:** acceptable. **Do not** add Alembic now unless schema changes mid-event.

**Manual checklist after first ADB connect:**

1. Start backend → confirm `users` + `analyses` exist  
2. Run `ingest_cuad` → confirm `cuad_clauses` row count > 0  
3. Run one analyze + chat → confirm rows appear in `doc_clauses` (in-memory always; on Oracle only if `ADB_DSN` set)

---

## Deployment — current state

| Asset | Status |
|-------|--------|
| `Dockerfile` | ❌ Not in repo |
| nginx config | ❌ Not on `main` (exists on unmerged `feat/document-ai-ocr` → `docs/deploy/nginx-pactpilot.conf`) |
| systemd units | ❌ Not in repo |
| deploy script | ❌ Not in repo |
| production `.env` template | 🟡 `backend/.env.example` only (dev-oriented) |
| Object Storage upload code | ❌ Not implemented |
| Frontend deploy model | TanStack Start SSR → `npm run build` + `npm run preview` (not static `dist/` only) |

**Judging requirement:** entire app on OCI Compute (nginx + API + UI). See [`06-oracle-setup.md`](06-oracle-setup.md), [`08-oci-onboarding.md`](08-oci-onboarding.md).

---

## Your task list (priority order)

### Phase A — Oracle ADB 26ai (vectors + accounts)

- [ ] **A1.** Get from Mykyta: compartment OCID, region, ADB admin password, wallet zip (or create ADB if you have IAM)
- [ ] **A2.** Provision / confirm **Autonomous Database 26ai** (Always Free if available)
- [ ] **A3.** Download wallet → unzip on VM (and locally for testing)
- [ ] **A4.** Update `backend/.env`:
  - `DATABASE_URL=oracle+oracledb://ADMIN:...@..._high`
  - `ADB_*` + `TNS_ADMIN` (same wallet)
  - `FAKE_OCI=0` + all `OCI_GENAI_*`
  - `JWT_SECRET=<32+ char random>` (fixes PyJWT warning you may have seen locally)
- [ ] **A5.** Local smoke: `python -m scripts.ingest_cuad` → prints Oracle backend + row count
- [ ] **A6.** Local smoke: register/login, analyze, save to dashboard, chat with citations
- [ ] **A7.** Confirm benchmarks show grounded percentiles (not just LLM guesses)

### Phase B — OCI Compute deploy

- [ ] **B1.** Ampere A1 VM (Ubuntu), security list **22 + 80**
- [ ] **B2.** Install: `git`, `python3.11-venv`, `nginx`, `nodejs`, `npm`
- [ ] **B3.** Clone `main`, `pip install -r requirements.txt`, copy `~/.oci/config` or use instance principal
- [ ] **B4.** Copy wallet + `.env` to VM (never commit)
- [ ] **B5.** Run `ingest_cuad` once on VM (if not done against shared ADB from laptop)
- [ ] **B6.** systemd: `uvicorn` on `127.0.0.1:8000`
- [ ] **B7.** Frontend: empty `VITE_API_BASE_URL`, `npm run build`, `npm run preview` on `127.0.0.1:3000`
- [ ] **B8.** nginx: `/` → :3000, `/api/` → :8000, `proxy_read_timeout 300s`, `client_max_body_size 25m`
- [ ] **B9.** Smoke from laptop: `curl http://<public-ip>/health`, browser full demo path
- [ ] **B10.** Send public URL to team; update `STATUS.md` with URL

### Phase C — Optional / later

- [ ] Merge `feat/document-ai-ocr` for scanned PDF OCR + nginx template doc
- [ ] Object Storage ephemeral uploads
- [ ] Alembic (only if schema changes)

---

## Production `.env` checklist

```env
# Core
FAKE_OCI=0
CACHE_TTL_SECONDS=3600

# Auth / accounts (Oracle on deploy)
DATABASE_URL=oracle+oracledb://ADMIN:<pw>@<service>_high
JWT_SECRET=<random-32+-chars>
JWT_EXPIRE_HOURS=168

# OCI GenAI
OCI_REGION=uk-london-1
OCI_GENAI_ENDPOINT=https://inference.generativeai.uk-london-1.oci.oraclecloud.com
OCI_COMPARTMENT_ID=<ocid>
OCI_GENAI_CHAT_MODEL=cohere.command-r-08-2024
OCI_GENAI_EMBED_MODEL=cohere.embed-english-v3.0

# Vector store (same ADB)
ADB_USER=ADMIN
ADB_PASSWORD=<pw>
ADB_DSN=<service>_high
TNS_ADMIN=/home/ubuntu/wallet
EMBED_DIM=1024
```

**Frontend build on VM:**

```env
VITE_API_BASE_URL=
```

(empty = same-origin `/api/...` through nginx)

---

## Verification commands

```bash
# Backend health
curl -s http://127.0.0.1:8000/health
# expect: {"status":"ok","fake_oci":false}

# CUAD ingest (from backend/ with venv active)
python -m scripts.ingest_cuad
# expect: Vector store: Oracle ADB ... | Inserted into 'cuad_clauses'. Total rows now: N

# Full pipeline
python -m scripts.smoke_oci

# Public deploy
curl -s http://<PUBLIC_IP>/health
curl -s http://<PUBLIC_IP>/api/samples
```

---

## Risks & gotchas

| Risk | Mitigation |
|------|------------|
| **Two DB configs confused** | Set both `DATABASE_URL` and `ADB_*` to the **same** ADB 26ai |
| **Re-running ingest_cuad** | Duplicates rows — run **once**; truncate tables to rebuild |
| **`doc_clauses` on Oracle** | Grows per analysis; fine for demo; no cleanup job exists |
| **SQLite on VM** | Lost on redeploy — use Oracle for accounts in prod |
| **Analysis ~45s** | nginx `proxy_read_timeout 300s` |
| **JWT secret too short** | Use 32+ chars in prod |
| **26ai VECTOR syntax** | If DDL fails, check Oracle docs for 26ai VECTOR dimension limits (1024 should be fine for Cohere v3) |
| **TanStack SSR** | Don't serve only static `dist/` — run `npm run preview` or node server |
| **VCN firewall** | Open port **80** on security list (most common "dead URL" bug) |
| **Pitch says 23ai** | Update slides to **26ai** — see [`15-pitch-deck-judging-guide.md`](15-pitch-deck-judging-guide.md) |

---

## What's already done (don't redo)

- ✅ Real OCI GenAI pipeline (analyze + chat + embeddings)
- ✅ Vector store **code** for Oracle + in-memory fallback
- ✅ `ingest_cuad.py` script
- ✅ Accounts ORM + JWT + dashboard API
- ✅ Frontend auth, blur teaser, dashboard, negotiate, PDF export
- ✅ CUAD corpus `cuad_clauses.jsonl` in repo
- ✅ `smoke_oci.py` for connectivity testing

---

## Questions for Mykyta (when he's awake)

1. Is ADB 26ai **already provisioned**? Wallet + password + service name?
2. Shared **compartment / VM** OCID and who creates the Compute instance?
3. **Canonical demo URL** — team VM IP or your tenancy?
4. OK to use **one ADB** for both accounts + vectors?
5. Merge **OCR branch** before deploy or skip for pitch?

---

## Related docs

| Doc | Use |
|-----|-----|
| [`06-oracle-setup.md`](06-oracle-setup.md) | OCI checklist (update 23ai → 26ai mentally) |
| [`08-oci-onboarding.md`](08-oci-onboarding.md) | Stuck playbook |
| [`STATUS.md`](STATUS.md) | What's verified locally |
| [`IMPLEMENTATION-TRACKER.md`](IMPLEMENTATION-TRACKER.md) | Feature-level checklist |
| [`15-pitch-deck-judging-guide.md`](15-pitch-deck-judging-guide.md) | Pitch (update OCI slide to 26ai) |
| `feat/document-ai-ocr` branch | nginx template + deploy doc + Document AI OCR |

---

## Suggested branch for your work

```bash
git checkout main && git pull
git checkout -b feat/adb-26ai-and-deploy
# ... infra commits, .env.example updates (no secrets), optional nginx template ...
```

Do **not** commit wallet, `.env`, or passwords.
