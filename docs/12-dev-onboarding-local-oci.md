# Dev Onboarding — Local Setup + Real OCI (Windows)

> **Purpose:** Step-by-step path that worked on a developer laptop: run the CTO app locally, wire
> your own OCI account, pass `smoke_oci`, then upload a real contract (PDF/DOCX).  
> **Validated:** UK South (`uk-london-1`), root/tenancy compartment OCID, `cohere.command-r-08-2024` +
> `cohere.embed-english-v3.0`.  
> **Related:** mental model → [`08-oci-onboarding.md`](08-oci-onboarding.md); local vs deploy →
> [`11-local-vs-deployed-architecture.md`](11-local-vs-deployed-architecture.md); deploy checklist →
> [`06-oracle-setup.md`](06-oracle-setup.md).

---

## What you get at the end

| Check | Meaning |
|-------|---------|
| `GET http://localhost:8000/health` → `"fake_oci": false` | Backend using real OCI GenAI |
| `python -m scripts.smoke_oci` → **ALL OK** | Chat, embeddings, and full analysis pipeline work |
| UI at http://localhost:8080 + upload | Real contract analysis (~45–60s) |

You do **not** need OCI deploy, Autonomous DB, or **Generative AI → Vector stores** in the console for
this path. Vector stores in the GenAI UI can stay empty; the app uses in-memory CUAD RAG by default.

---

## Prerequisites

- **Repo:** `essex-hack` on branch with CTO app (`main` / `test/cto-app`).
- **Python 3.11+** and **Node.js** (for frontend).
- **Your own OCI tenancy** with Generative AI in **UK South (London)** (`uk-london-1`).
- **OCI CLI** installed ([Oracle CLI install guide](https://docs.oracle.com/en-us/iaas/Content/API/SDKDocs/cliinstall.htm)).

---

## 1. Backend — install and `.env`

```cmd
cd C:\Users\<you>\Documents\hackathon\essex-hack\backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Edit `backend\.env` for **real AI** (no API keys here — auth is in `~/.oci/config`):

```env
FAKE_OCI=0
CACHE_TTL_SECONDS=3600

OCI_REGION=uk-london-1
OCI_GENAI_ENDPOINT=https://inference.generativeai.uk-london-1.oci.oraclecloud.com

# Root compartment OCID is OK — often shows as ocid1.tenancy.oc1..aaaa...
OCI_COMPARTMENT_ID=ocid1.tenancy.oc1..aaaaaaa...

OCI_GENAI_CHAT_MODEL=cohere.command-r-08-2024
OCI_GENAI_EMBED_MODEL=cohere.embed-english-v3.0

# Optional — leave empty for in-memory CUAD (fine for local dev)
ADB_USER=ADMIN
ADB_PASSWORD=
ADB_DSN=
TNS_ADMIN=
EMBED_DIM=1024
```

### Where to find `OCI_COMPARTMENT_ID`

1. Console → **Identity & Security → Compartments**
2. Open **root** compartment → **Details** → copy **OCID**

If the OCID contains `ocid1.tenancy.oc1..` instead of `ocid1.compartment.oc1..`, that is **correct**
for the root compartment. The backend README allows tenancy/root OCID.

### Which Cohere models?

In **Analytics & AI → Generative AI → Playground → Chat**, pick **`cohere.command-r-08-2024`**
(display name may include `v2.0`). Confirm with **View code** — use the exact `model_id` string in `.env`.

For embeddings, use **`cohere.embed-english-v3.0`** (1024 dimensions, matches `EMBED_DIM=1024`).

Avoid `command-latest` / `command-a-*` unless you intentionally change `backend/app/oci/genai.py`.

---

## 2. OCI CLI auth (`~/.oci/config`)

Auth is **separate** from `.env`. Never commit keys or `~/.oci/config`.

### A. Collect OCIDs (console)

| Value | Where |
|-------|--------|
| **Tenancy OCID** | Profile (top right) → Tenancy |
| **User OCID** | Identity & Security → Users → your user |
| **Region** | `uk-london-1` (UK South London) |

### B. Run setup (CMD)

```cmd
oci setup config
```

Typical answers:

- Config file: default → `C:\Users\<you>\.oci\config`
- Paste **User OCID** and **Tenancy OCID**
- Region: `uk-london-1`
- Generate new key pair: **Y**
- Key directory: default `C:\Users\<you>\.oci`
- Passphrase: optional

This creates `oci_api_key.pem` (private) and `oci_api_key_public.pem` (upload to console).

### C. Upload public key

1. **Identity & Security → Users** → your user → **API keys** → **Add API key**
2. Paste or upload **`oci_api_key_public.pem`**
3. Save (fingerprint must match CLI output)

### D. Verify

```cmd
oci os ns get
```

Success returns JSON with your Object Storage namespace. If you see **NotAuthenticated**, re-check
OCIDs, region, and the uploaded public key.

---

## 3. Smoke test (before starting servers)

From `backend\` with venv activated:

```cmd
python -m scripts.smoke_oci
```

**Expected output:**

```
Region=uk-london-1  chat=cohere.command-r-08-2024  embed=cohere.embed-english-v3.0

[1/3] chat() ...
   ok -> pong
[2/3] embeddings.embed() ...
   ok -> 2 vectors, dim=1024
[3/3] run_analysis(sample) ...
   using saas-subscription.txt
   ok -> risk .../100 (...), N clauses, M red flags
        benchmarks set on N clauses (vector-grounded)

ALL OK — real OCI GenAI path is working.
```

Step 3 can take **~45–60 seconds** (real LLM + benchmarks).

### Common smoke failures

| Symptom | Fix |
|---------|-----|
| `Missing ... OCI_COMPARTMENT_ID` | Fill compartment/tenancy OCID in `.env` |
| `FAKE_OCI=1` | Set `FAKE_OCI=0` in `.env` |
| `NotAuthenticated` / config errors | Fix `oci setup config` + API key upload |
| `FileNotFoundError: saas-msa.txt` | Pull latest repo — smoke uses `saas-subscription.txt` |
| Step 3 timeout | Increase `OCI_READ_TIMEOUT` in `.env` (default 240) |

---

## 4. Run local servers (two CMD windows)

Restart backend after **any** `.env` change (settings load at process start).

### Window 1 — API (port 8000)

```cmd
cd C:\Users\<you>\Documents\hackathon\essex-hack\backend
.venv\Scripts\activate
python -m uvicorn app.main:app --reload --port 8000
```

Check: http://localhost:8000/health → `"fake_oci": false`

### Window 2 — UI (port 8080)

Create `frontend\.env` if missing:

```env
VITE_API_BASE_URL=http://localhost:8000
```

Then:

```cmd
cd C:\Users\<you>\Documents\hackathon\essex-hack\frontend
npm install
npm run dev
```

Open: http://localhost:8080

| `VITE_API_BASE_URL` | Behaviour |
|---------------------|-----------|
| Empty | UI mock only — backend ignored |
| `http://localhost:8000` | Real API (needs backend running) |

---

## 5. OCI Document AI (scanned PDF OCR)

**Problem:** `pdfplumber` only reads embedded text. Photo/scanned leases return garbage in the document pane.

**Fix:** When text quality is poor, the backend calls **OCI Document AI** (`TEXT_EXTRACTION`).

### 5.1 Console + IAM (~15 min)

1. **Analytics & AI → AI Document** (Document Understanding) — confirm **UK South (London)**.
2. You do **not** need **Generative AI → Vector stores** (empty is fine).
3. IAM: your user (or group) needs permission to run **analyze document** in your compartment, e.g.:
   - Broad (hackathon): `allow group <your-group> to manage ai-service in compartment <compartment>`
   - Or narrower per [OCI AI Document policies](https://docs.oracle.com/en-us/iaas/Content/document-understanding/using/policy.htm)

### 5.2 `backend/.env` (add to GenAI keys)

```env
OCI_DOCUMENT_AI_ENDPOINT=https://document.aiservice.uk-london-1.oci.oraclecloud.com
OCR_ENABLED=true
OCR_MAX_PAGES=20
OCR_MAX_PAGES_PER_REQUEST=5
OCR_MIN_CHARS_PER_PAGE=50
OCR_JUNK_RATIO_THRESHOLD=0.25
```

Restart uvicorn after changes.

### 5.3 Smoke tests

```cmd
python -m scripts.smoke_oci
python -m scripts.smoke_document_ai
python -m scripts.smoke_document_ai C:\path\to\your\tenancy-lease.pdf
```

`/health` should include `"ocr_enabled": true` when `FAKE_OCI=0`.

### 5.4 Verify scanned lease in UI

1. Confirm `/health` → `fake_oci: false`, `ocr_enabled: true`.
2. Upload the **scanned tenancy PDF**.
3. Document pane should show readable English (e.g. "End of Tenancy Matters", clause numbers).
4. Analysis may take **longer** than born-digital PDFs (OCR + GenAI).

**Limits:**

- `OCR_MAX_PAGES_PER_REQUEST` (default **5**) — OCI **inline** sync allows at most **5 pages per
  uploaded file** ([limits](https://docs.oracle.com/en-us/iaas/Content/document-understanding/using/limits.htm)).
  `page_range` on a 24-page file still returns **413**; the backend **physically splits** the PDF
  with `pypdf` into ≤5-page chunks (e.g. 24 pages capped at 20 → **4 API calls**, ~1–3 minutes).
- `OCR_MAX_PAGES` (default **20**) — only the first N pages are OCR’d on long leases.
- `MAX_CLAUSES` (default **8**) — LLM returns at most 8 structured clauses.
- Margin handwriting may not appear in OCR (acceptable for demo).

If `smoke_document_ai` shows `needs_ocr=False` but the UI still looks garbled, pdfplumber is
extracting a broken text layer — set `OCR_FORCE=true` in `backend/.env` and restart uvicorn.

---

## 6. Analyse your own contract (born-digital or scanned)

1. Confirm `/health` shows `fake_oci: false`.
2. Open http://localhost:8080.
3. Upload **PDF or DOCX** (or paste text / pick a built-in sample).
4. Wait **~45–90s** for real analysis (OCR adds time on scanned PDFs).

---

## 7. Three local modes (quick reference)

| Mode | `backend/.env` | `frontend/.env` | Analysis |
|------|----------------|-------------------|----------|
| UI mock | any | empty | Browser mock JSON |
| Canned API | `FAKE_OCI=1` | `http://localhost:8000` | Fixed fixture |
| **Real OCI** | `FAKE_OCI=0` + OCI_* + `~/.oci/config` | `http://localhost:8000` | Live GenAI + in-memory CUAD |

---

## 8. Stopping servers (Windows)

If a dev server won’t exit in Cursor:

```cmd
netstat -ano | findstr ":8080"
taskkill /PID <pid> /F
```

Same for port **8000** if uvicorn is stuck.

---

## 9. What’s still needed for the hackathon demo

Local real OCI on your laptop satisfies **“OCI AI works”** for development. Judges still expect:

| Item | Local (this doc) | Judged demo |
|------|------------------|-------------|
| OCI GenAI | ✅ | ✅ on OCI Compute |
| RAG | ✅ in-memory CUAD | ✅ preferably ADB 23ai |
| **Deployed public URL** | ❌ | ✅ required |
| Team shared compartment | Optional (your tenancy OK for solo) | Often team VM |

Next steps: [`13-oci-deploy-and-handoff.md`](13-oci-deploy-and-handoff.md) (VM + nginx + team handoff),
[`06-oracle-setup.md`](06-oracle-setup.md) (ADB wallet optional).

---

## 10. Checklist (copy for PR / standup)

- [ ] `backend/.env`: `FAKE_OCI=0`, region, endpoint, compartment OCID, both model ids
- [ ] `~/.oci/config` + API key uploaded
- [ ] `oci os ns get` succeeds
- [ ] `python -m scripts.smoke_oci` → ALL OK
- [ ] `OCI_DOCUMENT_AI_ENDPOINT` set; `python -m scripts.smoke_document_ai <lease.pdf>` → ALL OK
- [ ] `frontend/.env`: `VITE_API_BASE_URL=http://localhost:8000`
- [ ] `/health` → `fake_oci: false`, `ocr_enabled: true`
- [ ] Scanned lease PDF → readable document pane + live verdict

---

## Related docs

| Doc | Topic |
|-----|--------|
| [`08-oci-onboarding.md`](08-oci-onboarding.md) | OCI mental model, “I’m stuck” playbook |
| [`11-local-vs-deployed-architecture.md`](11-local-vs-deployed-architecture.md) | Mock vs real vs deployed |
| [`backend/README.md`](../backend/README.md) | API endpoints, env keys |
| [`frontend/README.md`](../frontend/README.md) | UI mock vs API |
| [`STATUS.md`](STATUS.md) | Team progress snapshot |
| [`13-oci-deploy-and-handoff.md`](13-oci-deploy-and-handoff.md) | Deploy VM + team handoff |
