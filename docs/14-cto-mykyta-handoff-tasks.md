# CTO handoff — Mykyta (infra, deploy, ADB 23ai)

> **For:** Mykyta (team lead / OCI owner)  
> **From:** Ankit — context after local real-OCI + Document AI OCR work  
> **Branch:** [`feat/document-ai-ocr`](https://github.com/yakivets/essex-hack/tree/feat/document-ai-ocr) (open PR to `main`)  
> **Last updated:** 2026-06-03

---

## TL;DR

| Area | Status | Owner suggestion |
|------|--------|------------------|
| Real OCI GenAI (laptop) | Working (`smoke_oci`, analyze, chat) | — |
| Document AI OCR (scanned PDFs) | Implemented on feature branch | Review + merge PR |
| **Public deploy (OCI Compute + nginx)** | Not done | **Mykyta** |
| **ADB 23ai + `ingest_cuad`** | Code ready; needs provisioning | **Mykyta** (or shared compartment) |
| Object Storage uploads | Not in code; docs only | Optional / later |

**Judged demo needs:** a **public URL** on OCI with `FAKE_OCI=0`, GenAI, Document AI, and preferably **real vector DB (ADB 23ai)**.

---

## What landed on `feat/document-ai-ocr`

### 1. Dev onboarding (docs)
- [`12-dev-onboarding-local-oci.md`](12-dev-onboarding-local-oci.md) — Windows path: `.env`, `~/.oci/config`, `smoke_oci`, local servers.
- [`11-local-vs-deployed-architecture.md`](11-local-vs-deployed-architecture.md) — mock vs real vs deployed.
- [`13-oci-deploy-and-handoff.md`](13-oci-deploy-and-handoff.md) — VM + nginx + team handoff checklist.
- [`deploy/nginx-pactpilot.conf`](deploy/nginx-pactpilot.conf) — nginx template.

### 2. Document AI OCR (code)
- **Problem:** `pdfplumber` returns garbage on photo/scanned leases.
- **Fix:** Quality heuristic → **OCI Document AI** `TEXT_EXTRACTION`; **physical PDF split** (`pypdf`, ≤5 pages per API call — OCI inline limit).
- **Config:** `OCI_DOCUMENT_AI_ENDPOINT`, `OCR_*`, optional `OCR_FORCE=true` when pdfplumber text looks OK but UI is still garbled.
- **Smoke:** `python -m scripts.smoke_document_ai [path/to.pdf]`
- **Happy path unchanged:** born-digital PDFs still use pdfplumber only.

### 3. Other
- `smoke_oci` sample path fix (`saas-subscription.txt`).
- Unit tests: `tests/test_text_quality.py`, `tests/test_pdf_split.py`.

**PR:** open from `feat/document-ai-ocr` → `main` (Ankit can share link in Slack).

---

## What already works locally (reference)

Verified on a **personal tenancy** (`uk-london-1`, root/tenancy compartment OCID):

| Check | Command / URL |
|-------|----------------|
| GenAI | `python -m scripts.smoke_oci` → ALL OK (~45s analysis) |
| Document AI | `python -m scripts.smoke_document_ai <lease.pdf>` → ALL OK (batched chunks) |
| Health | `GET /health` → `fake_oci: false`, `ocr_enabled: true` |
| UI | `frontend/.env` → `VITE_API_BASE_URL=http://localhost:8000` |

**Models:** `cohere.command-r-08-2024`, `cohere.embed-english-v3.0`.

**Not done locally:** deploy, ADB 23ai (still in-memory CUAD), Object Storage.

---

## Your tasks (recommended order)

### Task 1 — Review & merge PR
- [ ] Review `feat/document-ai-ocr` (OCR + docs; no API contract changes).
- [ ] Merge to `main` when happy.
- [ ] Align team on `main` for deploy branch.

### Task 2 — Team OCI compartment & IAM
- [ ] Confirm **hackathon** compartment OCID (or standardise on team tenancy).
- [ ] Policies for **Generative AI**, **Document AI** (`analyze_document`), and (for Task 4) **ADB** + wallet access.
- [ ] Decide: **shared VM** vs personal tenancies for demo URL.
- [ ] Share non-secret `.env` **keys** with team (values in password manager / private notes only).

### Task 3 — Deploy to OCI Compute (required for judging)

Follow [`13-oci-deploy-and-handoff.md`](13-oci-deploy-and-handoff.md) and [`06-oracle-setup.md`](06-oracle-setup.md).

- [ ] Always Free **Ampere A1** VM (Ubuntu), region **uk-london-1** (or team home region with GenAI).
- [ ] Security list: **22**, **80** (443 optional).
- [ ] Clone `main`, `backend/.env` with `FAKE_OCI=0` + all `OCI_*` + `OCI_DOCUMENT_AI_*` + `OCR_*`.
- [ ] Auth on VM: `~/.oci/config` or **instance principal** (preferred).
- [ ] `systemd` (or Docker) for **uvicorn** on `127.0.0.1:8000`.
- [ ] Frontend: `npm run build` + `npm run preview` on port **3000** (see nginx template).
- [ ] **nginx:** `/` → frontend, `/api/` → backend; empty `VITE_API_BASE_URL` at build for same-origin.
- [ ] Smoke: `curl http://<public-ip>/health`, browser upload + chat.

**Acceptance:** one public URL; scanned lease readable with `OCR_FORCE=true` if needed.

### Task 4 — Autonomous DB 23ai (required for “real vector DB”)

Code is **already implemented** — no new vector layer to write.

| Step | Action |
|------|--------|
| Provision | Always Free **ADB 23ai** in team compartment; download **wallet** |
| Configure | `backend/.env`: `ADB_USER`, `ADB_PASSWORD`, `ADB_DSN`, `TNS_ADMIN`, `EMBED_DIM=1024` |
| Ingest once | `FAKE_OCI=0` → `python -m scripts.ingest_cuad` (uses OCI embeddings; run **once**) |
| Verify | `store.count('cuad_clauses')` > 0; benchmarks on analyze show grounded percentiles |
| Deploy | Copy wallet to VM; same env on deployed API |

Details: [`06-oracle-setup.md`](06-oracle-setup.md) § Autonomous DB, [`backend/scripts/ingest_cuad.py`](../backend/scripts/ingest_cuad.py).

**Note:** `ingest_cuad` defaults to **15 clauses/category** for speed. Full `cuad_clauses.jsonl` ingest = one-line change (`reference_records(per_category=None)`) if you want a richer corpus.

**Idempotency:** Re-running `ingest_cuad` on Oracle **duplicates** rows — truncate tables or run once.

### Task 5 — Object Storage (optional — not implemented)

Slides may mention Object Storage; **backend does not upload to a bucket yet** (multipart in-process only).

If judges require it:
- [ ] Bucket `pactpilot-uploads` in compartment.
- [ ] New code in `routes.py` / OCI SDK `put_object` + delete after analysis (separate PR).

---

## `.env` template for production VM (no secrets)

Copy from [`backend/.env.example`](../backend/.env.example). Required keys when `FAKE_OCI=0`:

```env
FAKE_OCI=0
OCI_REGION=uk-london-1
OCI_GENAI_ENDPOINT=https://inference.generativeai.uk-london-1.oci.oraclecloud.com
OCI_DOCUMENT_AI_ENDPOINT=https://document.aiservice.uk-london-1.oci.oraclecloud.com
OCI_COMPARTMENT_ID=<team-or-tenancy-ocid>
OCI_GENAI_CHAT_MODEL=cohere.command-r-08-2024
OCI_GENAI_EMBED_MODEL=cohere.embed-english-v3.0
OCR_ENABLED=true
OCR_MAX_PAGES=20
OCR_MAX_PAGES_PER_REQUEST=5

# Task 4 — vector DB
ADB_USER=ADMIN
ADB_PASSWORD=<set-in-console>
ADB_DSN=<from-wallet-tnsnames-high>
TNS_ADMIN=/path/to/unzipped/wallet
EMBED_DIM=1024
```

Frontend on VM (same-origin):

```env
VITE_API_BASE_URL=
```

---

## What Ankit can keep doing (no blockers)

- Polish UI / demo script with Claudia & Adriana.
- Manual QA on `main` after merge.
- Personal VM duplicate for rehearsal (optional).
- Docs only PRs — no OCI account changes without sync.

---

## Links

| Doc | Purpose |
|-----|---------|
| [08-oci-onboarding.md](08-oci-onboarding.md) | OCI mental model |
| [06-oracle-setup.md](06-oracle-setup.md) | Pre-event + ADB + bucket |
| [13-oci-deploy-and-handoff.md](13-oci-deploy-and-handoff.md) | Deploy steps |
| [12-dev-onboarding-local-oci.md](12-dev-onboarding-local-oci.md) | How Ankit wired laptop |
| [STATUS.md](STATUS.md) | Repo snapshot (may lag) |
| [03-api-contract.md](03-api-contract.md) | Frozen API |

---

## Questions for you (Mykyta)

1. **Merge** `feat/document-ai-ocr` now or after deploy spike?
2. **Canonical demo URL** — team VM IP vs personal tenancy?
3. **ADB** — new shared instance or existing team DB?
4. **Object Storage** — must-have for judging or ADB + deploy is enough?

Reply in Slack / PR when tasks 3–4 are done so we can update [`STATUS.md`](STATUS.md) with the public URL.
