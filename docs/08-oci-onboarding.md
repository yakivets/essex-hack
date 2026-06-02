# OCI Onboarding — A Mentoring Guide for First-Timers

> **Read this before you touch any cloud resource.** Nobody on the team has used Oracle Cloud (OCI)
> before — that's normal and fine. This doc is the plain-English mental model + a hands-on day-1 path.
> [`06-oracle-setup.md`](06-oracle-setup.md) is the operational checklist; **this** is the "what does
> any of this *mean*" guide. When you're stuck, jump to the [I'm stuck playbook](#im-stuck-playbook).

## Why OCI at all
Oracle is the hackathon sponsor, and the rules require: an **OCI AI service**, a **vector DB**, **RAG**,
and a **deployed** app. We satisfy all four with OCI, and we host the *whole product* there — that's
the "OCI-first" rule you'll see everywhere in these docs. No Vercel/Netlify/third-party hosting.

## The 60-second mental model
OCI is just "someone else's computers + managed services," organised like this:

```
Tenancy (your whole Oracle Cloud account, tied to ONE home region forever)
 └─ Region  (a geographic data-centre group, e.g. UK South / London)
     └─ Compartment  (a labelled box for resources — we use ONE called `hackathon`)
         ├─ Compute instance   (a Linux VM — runs our API + serves the UI)
         ├─ Autonomous DB 23ai  (managed Oracle DB — our vector store)
         ├─ Object Storage bucket (file storage — raw uploads, ephemeral)
         └─ Generative AI        (the LLM + embeddings service — pay-per-use)
```

Four ideas explain 90% of the confusion:

| Term | What it really is | Why you care |
|---|---|---|
| **Tenancy** | Your entire account/org | One per team. Created at signup. |
| **Home region** | The physical location of your tenancy | ⚠️ **Chosen at signup, NEVER changeable.** Must support Generative AI. |
| **Compartment** | A folder/namespace for resources + permissions | Put *everything* in `hackathon` → delete it = clean teardown. |
| **OCID** | A long unique ID string (`ocid1.<type>.oc1..aaaa…`) | Every resource has one. You'll paste these into `.env`. They're identifiers, not secrets — but don't post them publicly. |

If you remember nothing else: **pick a Generative-AI region at signup, put everything in one
compartment, and OCIDs are just addresses.**

## The five services we use (and what each does in PactPilot)
| Service | Console location | Role in our app | Free? |
|---|---|---|---|
| **Generative AI** | Analytics & AI → Generative AI | The LLM (clause classify/extract/summary) + embeddings | pay-per-use (a few £) |
| **Autonomous DB 23ai** | Oracle Database → Autonomous Database | Vector search over `cuad_clauses` + `doc_clauses` (RAG) | Always Free |
| **Object Storage** | Storage → Buckets | Holds the raw uploaded file briefly, then we delete it | Always Free |
| **Compute (Ampere A1)** | Compute → Instances | The Linux VM running FastAPI **and** serving the built UI | Always Free |
| **IAM / Identity** | Identity & Security | Users, the `hackathon` compartment, API signing keys | Free |

> **Only Generative AI inference costs money.** Everything else is Always Free. The real risk isn't
> cost — it's *forgetting to delete* anything you accidentally created as paid. See [Cost & teardown](#cost--teardown).

## How authentication works (this trips everyone up)
There are **two separate auth mechanisms** — don't confuse them:

1. **OCI API auth (for GenAI, Object Storage, the SDK)** — uses an **API signing key pair**, not a
   password. You run `oci setup config` once; it generates a private key + writes `~/.oci/config`
   with your tenancy/user/region OCIDs and a key fingerprint. You upload the *public* key to your
   user in the console. The Python SDK reads `~/.oci/config` automatically.
   - **Never commit** `~/.oci/config` or the private key. They're in `.gitignore` for a reason.
2. **Autonomous DB auth (for the vector store)** — uses a **wallet** (a zip of mTLS certs you download
   from the DB console) + an `ADMIN` password. The backend points `TNS_ADMIN` at the unzipped wallet
   folder and connects with `oracledb`.
   - **Never commit** the wallet or the DB password.

```
Your code ──┬─ GenAI / Object Storage  → reads ~/.oci/config (signing key)
            └─ Autonomous DB 23ai       → reads wallet + ADB_PASSWORD
```

## Day-1 hands-on path (do these in order, ~60–90 min)
This is the "learn by doing" sequence. The lead does steps 1–2 for the team; everyone else can follow
along read-only once access is shared.

1. **Sign up with the right home region.** Verify the current GenAI-supported region list in Oracle's
   docs *that day*, then sign up choosing it (London/Frankfurt for a UK team). This is the one
   irreversible step — get it right. *(Lead only.)*
2. **Make the `hackathon` compartment.** Identity & Security → Compartments → Create. Everything goes here.
3. **Prove GenAI works — no code.** Analytics & AI → Generative AI → **Chat playground** → send a
   prompt. If you get a reply, the most important (and only paid) dependency is alive. Note the
   **chat model OCID**, **embedding model OCID**, and your **compartment OCID**.
4. **Install the OCI CLI + configure auth.** `oci setup config`, upload the public key to your user,
   then verify: `oci os ns get` should return your Object Storage namespace. ✅ auth works.
5. **Provision Always-Free Autonomous DB (pick 23ai).** Download the wallet, set the `ADMIN` password,
   connect once from SQL worksheet to confirm it's up.
6. **Create the `pactpilot-uploads` bucket.** Storage → Buckets → Create, inside `hackathon`.
7. **Record the identifiers** in a *private* notes file (NOT git): tenancy/user/compartment OCIDs,
   region, both GenAI model OCIDs, ADB connection string + password, key fingerprint. These populate
   `backend/.env` (see [06-oracle-setup.md](06-oracle-setup.md) for the exact keys).

After step 3 you've de-risked the scary part. After step 7 the backend can flip `FAKE_OCI=0` and run
for real.

## You don't need OCI to build
This is the key to 6 people not being blocked on one person's cloud account:
- **Backend:** `FAKE_OCI=1` stubs every OCI call (fake embeddings/LLM responses, a simple in-memory
  cosine vector store). The full pipeline runs offline on a laptop.
- **Frontend:** empty `VITE_API_BASE_URL` → runs on mock JSON.
- Only the **lead** needs live OCI early (to provision + deploy). Everyone else integrates against the
  real cloud near the end.
- ⚠️ But the **judged demo runs on real OCI** — `FAKE_OCI`/mock is a dev convenience, never the
  thing you present.

## Deploying to OCI (the end-game, Hour 24–36)
The whole product on **one Ampere A1 VM**:
1. Create the VM (Ubuntu), open the port in the VCN **security list** (a common gotcha — the firewall
   is at the network level, not just on the box).
2. Install Docker, copy the repo + wallet, `docker build` the backend, `docker run` with `.env` mounted.
3. `npm run build` the frontend → put `dist/` behind **nginx** on the same VM. nginx serves `/` and
   proxies `/api/` → uvicorn on `:8000`. Same origin = no CORS, one clean demo URL.
4. Hit `http://<vm-public-ip>/api/samples` to confirm it's live.

(Alternative for the UI: an Object Storage bucket set to static-website hosting. The nginx route is
simpler for the demo.)

## Vocabulary cheat-sheet
- **VCN** — Virtual Cloud Network (your private network). Its **security list** is the firewall; you
  must open ports there or your VM looks dead.
- **Ampere A1** — Arm-based Always-Free compute (up to 4 OCPU / 24GB). Our host.
- **Always Free** — resources that never charge, ever. Most of our stack.
- **Wallet** — the zip of certs that lets you connect to Autonomous DB securely.
- **AI Vector Search** — Oracle 23ai's native `VECTOR` column type + the `VECTOR_DISTANCE()` SQL
  function. We query it with plain SQL via `oracledb` — no ORM or LangChain adapter.
- **Service endpoint** — region-specific URL for a service, e.g. the GenAI inference endpoint.

## "I'm stuck" playbook
| Symptom | Likely cause | Fix |
|---|---|---|
| GenAI call fails / model not found | Wrong region or missing model access | Confirm your home region supports GenAI; re-check the model OCID + compartment OCID; test in the Chat playground. |
| `oci` CLI: "NotAuthenticated" | `~/.oci/config` wrong or public key not uploaded | Re-run `oci setup config`; upload the **public** key to your user; check the fingerprint matches. |
| VM is up but the API/URL won't load | Port not opened | Add an **ingress rule** to the VCN security list (80/8000); also check the OS firewall (`ufw`). |
| DB connection hangs/refuses | Wallet/TNS misconfigured | Unzip the wallet; set `TNS_ADMIN` to that folder; use the right `*_high` DSN + `ADMIN` password. |
| "I just want to build, OCI isn't ready" | You don't need it yet | `FAKE_OCI=1` (backend) / empty `VITE_API_BASE_URL` (frontend). Build offline. |
| Scared of a surprise bill | Only GenAI is paid | Keep everything in `hackathon`; check Cost Analysis; tear that compartment down after the event. |

**Escalation:** ping the lead in the team channel with (a) what you ran, (b) the exact error text,
(c) which service. Don't burn 30 minutes solo — the lead is mentoring this on purpose.

## Cost & teardown
- **Budget:** $300 free credits + Always Free. Realistic spend: a few £ (GenAI inference only).
- **Golden rule:** everything in the `hackathon` compartment → after the event, delete paid resources
  (any non-free Compute/DB) and confirm `$0` ongoing in **Cost Analysis**. Always Free resources can stay.
- Don't leave a paid resource running "just in case." There is no "just in case" in a hackathon.

## Where to go next
- Operational steps + exact `.env` keys → [`06-oracle-setup.md`](06-oracle-setup.md)
- How OCI fits the whole system → [`02-implementation-plan.md`](02-implementation-plan.md)
- Backend code that calls these services → [`05-backend-plan.md`](05-backend-plan.md)
