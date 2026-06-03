# OCI Deployment + Team Handoff

> **Purpose:** Deploy PactPilot on OCI Compute (personal tenancy first), then hand off to the team VM.  
> **Prerequisites:** Real OCI working locally — [`12-dev-onboarding-local-oci.md`](12-dev-onboarding-local-oci.md)  
> **Architecture:** [`11-local-vs-deployed-architecture.md`](11-local-vs-deployed-architecture.md)

---

## What judges should see

| Capability | On the VM |
|------------|-----------|
| OCI Generative AI | `FAKE_OCI=0`, chat + embed models |
| **OCI Document AI** | Scanned PDF upload → readable text (OCR fallback) |
| RAG | In-memory CUAD (ADB 23ai optional stretch) |
| **Deployed URL** | `http://<public-ip>/` (nginx) |

**Pitch line:** *"Oracle Document AI reads scanned contracts; GenAI and vector RAG analyse them — all on OCI Compute."*

---

## Phase A — Personal tenancy (your credits)

### A1. VM (Always Free Ampere A1)

1. Console → **Compute → Instances** → Create (Ubuntu 22.04/24.04), shape **Ampere A1** (Always Free eligible).
2. **VCN security list:** ingress TCP **80** and **443** (and **22** for SSH) from `0.0.0.0/0` (demo only).
3. Note **public IP**.

### A2. Packages on the VM

```bash
sudo apt update
sudo apt install -y python3.11 python3.11-venv nginx git
# Node 18+ (nodesource or nvm) for frontend build
```

### A3. Clone and configure backend

```bash
git clone <repo-url> pactpilot && cd pactpilot
git checkout feat/document-ai-ocr   # or main after merge

cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
nano .env
```

**`backend/.env` on VM (no private keys — use API signing on the box):**

```env
FAKE_OCI=0
OCI_REGION=uk-london-1
OCI_GENAI_ENDPOINT=https://inference.generativeai.uk-london-1.oci.oraclecloud.com
OCI_DOCUMENT_AI_ENDPOINT=https://document.aiservice.uk-london-1.oci.oraclecloud.com
OCI_COMPARTMENT_ID=ocid1.tenancy.oc1..aaaa...   # or hackathon compartment
OCI_GENAI_CHAT_MODEL=cohere.command-r-08-2024
OCI_GENAI_EMBED_MODEL=cohere.embed-english-v3.0
OCR_ENABLED=true
OCR_MAX_PAGES=20
```

**Auth (pick one):**

- **Fast:** copy `~/.oci/config` + `oci_api_key.pem` to the VM user (chmod 600).
- **Better:** [Instance Principal](https://docs.oracle.com/en-us/iaas/Content/Identity/Tasks/callingservicesfrominstances.htm) + dynamic group policy for GenAI + Document AI.

**IAM (compartment):** allow `analyze document` / AI Document use + Generative AI inference for your user or instance principal.

### A4. Backend service (systemd example)

```ini
# /etc/systemd/system/pactpilot-api.service
[Unit]
Description=PactPilot API
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/pactpilot/backend
Environment=PATH=/home/ubuntu/pactpilot/backend/.venv/bin
ExecStart=/home/ubuntu/pactpilot/backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now pactpilot-api
curl -s http://127.0.0.1:8000/health
# expect: {"status":"ok","fake_oci":false,"ocr_enabled":true}
```

### A5. Frontend build (TanStack Start)

```bash
cd /home/ubuntu/pactpilot/frontend
npm install
# Same-origin deploy: leave API URL empty at build time
echo 'VITE_API_BASE_URL=' > .env
npm run build
```

Run the production server per team convention (e.g. `npm run start` / `node .output/server/index.mjs` on the port nginx expects — check `frontend/package.json` `start` script). Bind to **127.0.0.1:3000** (or documented port).

### A6. nginx (one public URL)

Copy [`deploy/nginx-pactpilot.conf`](deploy/nginx-pactpilot.conf) to `/etc/nginx/sites-available/pactpilot`, adjust `root` / `proxy_pass` ports, then:

```bash
sudo ln -s /etc/nginx/sites-available/pactpilot /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

**Smoke from your laptop:**

```bash
curl http://<PUBLIC_IP>/health
curl http://<PUBLIC_IP>/api/samples
```

Upload a **scanned lease PDF** in the browser → document pane readable → analysis ~45–60s.

---

## Phase B — Team VM handoff (Mykyta / shared infra)

Use this checklist when moving from **personal** to **team** OCI:

| Item | Action |
|------|--------|
| Compartment | Switch `OCI_COMPARTMENT_ID` to team `hackathon` compartment OCID |
| GenAI endpoint | Confirm region (likely `uk-london-1`) |
| Document AI endpoint | `https://document.aiservice.<region>.oci.oraclecloud.com` |
| Model IDs | Confirm `cohere.command-r-08-2024` + `cohere.embed-english-v3.0` still enabled |
| API auth | Team API key on VM **or** instance principal in team compartment |
| IAM | Policy for Document AI + GenAI in team compartment |
| DNS | Optional: point team hostname to VM public IP |
| Secrets | **Never** commit `.env` or `~/.oci` — share via password manager / private notes |
| Repo | Deploy from `main` after PR merge |
| OCR test | `python -m scripts.smoke_document_ai /path/to/lease.pdf` on VM |

**What to send Mykyta (no secrets):**

- PR link for `feat/document-ai-ocr`
- This doc + [`12-dev-onboarding-local-oci.md`](12-dev-onboarding-local-oci.md)
- Screenshot of successful scanned-PDF upload on personal VM
- List of `.env` **keys** (not values) you used

---

## Deploy acceptance checklist

- [ ] Public URL loads UI
- [ ] `GET /health` → `fake_oci: false`, `ocr_enabled: true`
- [ ] `python -m scripts.smoke_oci` on VM → ALL OK
- [ ] `python -m scripts.smoke_document_ai lease.pdf` → ALL OK (optional argv)
- [ ] Scanned tenancy PDF → readable document + verdict
- [ ] Team handoff notes shared

---

## Optional stretch (judge-grade vector DB)

1. Provision Always Free **ADB 23ai**, download wallet.
2. Set `ADB_*`, `TNS_ADMIN` in `backend/.env`.
3. `python -m scripts.ingest_cuad` on VM.
4. Re-run analysis — benchmarks hit Oracle `VECTOR` columns.

See [`06-oracle-setup.md`](06-oracle-setup.md).

---

## Related

| Doc | Topic |
|-----|--------|
| [`06-oracle-setup.md`](06-oracle-setup.md) | Pre-event OCI checklist |
| [`12-dev-onboarding-local-oci.md`](12-dev-onboarding-local-oci.md) | Laptop + smoke tests |
| [`deploy/nginx-pactpilot.conf`](deploy/nginx-pactpilot.conf) | nginx template |
