# Oracle / OCI Setup & Deployment

> Owner: **team lead**. Do the pre-event checklist **before** the hackathon so nothing here is a
> surprise on the clock. Budget: $300 free credits + Always Free resources. Realistic spend: a few $.

## ⚠️ The one irreversible decision: home region
OCI **Generative AI runs only in certain regions**, and your tenancy's **home region is chosen at
signup and can never be changed**. Pick a GenAI-supported region as your home region *before*
creating the account. For a UK team, **London (UK South)** or **Frankfurt (Germany Central)** are
the natural choices — **verify the current GenAI region list in Oracle's docs on signup day**, as
they expand it over time.

## What's free vs what spends credits
| Service | Tier | Cost |
|---|---|---|
| Autonomous DB 23ai (vector DB) | Always Free (2 instances, 20GB) | £0 |
| Object Storage (raw files) | Always Free (20GB) | £0 |
| Compute — Arm Ampere A1 (host the API) | Always Free (4 OCPU / 24GB) | £0 |
| **OCI Generative AI** (LLM + embeddings) | Pay-per-use → credits | a few £ |
Only AI inference spends credits. Danger isn't cost — it's forgetting to tear down paid resources.

## Pre-event checklist (do this week)
1. ☐ Verify the best GenAI-supported region, then **sign up** with it as home region.
2. ☐ Create a compartment `hackathon` (put all resources here → easy cleanup).
3. ☐ Install the **OCI CLI**; run `oci setup config` (generates API signing key + `~/.oci/config`).
4. ☐ Verify auth: `oci os ns get` returns your object-storage namespace.
5. ☐ Open **Generative AI → Chat playground** in the console, send a test prompt (proves access).
6. ☐ Provision an **Always Free Autonomous Database (pick 23ai)**; download the wallet; connect once.
7. ☐ Record (in a private notes file, not git): tenancy OCID, user OCID, compartment OCID, region,
   GenAI model OCID, ADB connection string, key fingerprint.

## Generative AI access
- In the console: **Analytics & AI → Generative AI**. Confirm chat + embedding models are available
  in your region; note the **model OCIDs** and your **compartment OCID**.
- Code uses `langchain_community`:
  - `from langchain_community.chat_models import ChatOCIGenAI`
  - `from langchain_community.embeddings import OCIGenAIEmbeddings`
  - Auth via the `~/.oci/config` file (the SDK reads it automatically); pass `compartment_id`,
    `model_id`, `service_endpoint` (region-specific GenAI endpoint).

## Autonomous DB 23ai — the vector store
- Create **Always Free ADB**, workload type "Data Warehouse" or "Transaction Processing" (either
  works); choose the **23ai** version so AI Vector Search is available.
- Download the **wallet** (mTLS) → backend connects with `oracledb` + `TNS_ADMIN` pointing at the
  unzipped wallet.
- LangChain `OracleVS` (`langchain_community.vectorstores.oraclevs`) creates/queries vector tables.
- Two collections/tables: `cuad_clauses` (built once by `scripts/ingest_cuad.py`) and `doc_clauses`
  (per-request, for chat RAG).

## Object Storage
- Create a bucket `pactpilot-uploads` in the `hackathon` compartment. Backend `put`s the raw upload
  and `delete`s it after analysis (privacy/"we don't keep your contract").

## Backend `.env` (see `.env.example`)
```
OCI_REGION=uk-london-1
OCI_COMPARTMENT_ID=ocid1.compartment...
OCI_GENAI_ENDPOINT=https://inference.generativeai.uk-london-1.oci.oraclecloud.com
OCI_GENAI_CHAT_MODEL=ocid1.generativeaimodel...
OCI_GENAI_EMBED_MODEL=ocid1.generativeaimodel...
ADB_USER=ADMIN
ADB_PASSWORD=...
ADB_DSN=pactpilot_high
TNS_ADMIN=/app/wallet
OCI_BUCKET=pactpilot-uploads
FAKE_OCI=0          # set 1 to run the pipeline with stubs, no OCI needed
```

## Deployment (Hour 24–36)
**Backend → OCI Compute (Always Free Ampere):**
1. Create an Ampere A1 VM (Ubuntu), open port 8000 (or 80 via a reverse proxy) in the security list.
2. Install Docker; copy repo + wallet; `docker build` from `backend/Dockerfile`; `docker run` with
   the `.env` mounted. (Or run `uvicorn` under `systemd` for simplicity.)
3. Confirm `GET /api/samples` responds from the VM's public IP.

**Frontend:** host the Lovable-built static app (its own hosting, or Vercel, or the same VM behind
nginx). Set `VITE_API_BASE_URL` to the backend's public URL and rebuild.

**Sponsor story:** the AI (GenAI), the vector data (23ai), the files (Object Storage), and the
running service (Compute) are all on OCI — Oracle is the engine, not a checkbox.

## Teardown (after the event)
Delete the `hackathon` compartment's paid resources (Compute if not Always Free, any non-free ADB).
Always Free resources can stay. Confirm `$` spend in the Cost Analysis dashboard.
