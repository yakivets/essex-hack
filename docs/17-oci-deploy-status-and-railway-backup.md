# OCI deploy status + Railway backup plan

> **For:** @Mykyta (CTO) and team  
> **Author:** Ankit (DB + deploy)  
> **Date:** 2026-06-03  
> **Repo:** `yakivets/essex-hack`

---

## TL;DR

| Track | Status |
|-------|--------|
| **OCI (primary — judging)** | VM created; **no public demo URL yet**. Blocked by **~0.5 GB RAM** on `pactpilot-vm` (`dnf` OOM-killed). **Resize shape in OCI**, then finish packages + nginx + app. |
| **ADB + GenAI (laptop)** | **Done** — real GenAI smoke OK; `cuad_clauses` ingested on Autonomous DB; wallet path fix on branch `fix/adb-wallet-connection` (commit `8086272`). |
| **Railway (backup)** | **Possible** for a quick public URL (~**4–8 h** for a useful backup). **Does not replace** hackathon requirement that the **judged demo runs on OCI**. |

---

## OCI deployment — current status

### Done

| Item | Detail |
|------|--------|
| **OCI API auth** | `~/.oci/config` works locally (`uk-london-1`, Essex tenancy). |
| **GenAI pipeline** | `python -m scripts.smoke_oci` passes (~45s, `cohere.command-r-08-2024`). |
| **Autonomous DB** | `PactPilotDB` (23ai), wallet at `Wallet_PactPilotAutoDB`, TNS `pactpilotautodb_high`. |
| **CUAD ingest** | `ingest_cuad` → **120 rows** in `cuad_clauses` (run once). |
| **Wallet connection fix** | `vectorstore.py` + `db.py` pass `config_dir` / `wallet_location` (fixes ORA-12506 / DPY-6000). |
| **Local full stack** | Backend `:8000` + frontend `:8080` with real OCI + Oracle when `.env` set. |
| **Compute VM** | `pactpilot-vm`, **Always Free**, region UK South (London), **Oracle Linux 9**, user **`opc`**. |
| **Public IP** | `193.123.178.230` (ephemeral; confirm after stop/start). |
| **SSH** | Key: `C:\Users\ankit\Documents\hackathon\ssh-key-2026-06-03.key` — login works as `opc`. |
| **Swap (workaround)** | Added `/swapfile2` (2 GiB) — total swap ~2.5 GiB. |

### In progress / blocked

| Item | Detail |
|------|--------|
| **VM RAM** | `free -h` showed **Mem: 498 MiB total** — too small for `dnf install` (nginx, nodejs) and for running API + Node + nginx together. |
| **Package install** | `sudo dnf install -y nginx` and `nodejs npm` → **`Killed`** (kernel OOM; confirmed in `dmesg`). |
| **nginx / node / git on VM** | **Not installed** yet on the VM. |
| **App on VM** | Repo not cloned; no `.env` / wallet on VM; no systemd/nginx; **no `/health` on public IP**. |
| **VCN port 80** | Not verified yet (needed for browser demo). |
| **Shape change** | Instance was **Stopping** to allow **Edit / Change shape** — target **≥ 4 GB RAM** (Ampere A1 flex or larger x86 if available). |

### Not started (OCI)

- Clone `essex-hack` on VM, copy wallet + `~/.oci` (or instance principal) + production `.env`.
- `pip install`, `ingest_cuad` on VM (optional if same ADB already loaded from laptop).
- systemd for `uvicorn`, frontend build/preview, `docs/deploy/nginx-pactpilot.conf` (on unmerged `feat/document-ai-ocr` branch).
- Object Storage for uploads (out of scope for minimum demo).

### SSH reference

```powershell
ssh -i "C:\Users\ankit\Documents\hackathon\ssh-key-2026-06-03.key" opc@193.123.178.230
```

After resize, run on VM:

```bash
free -h   # Mem: total should be several GiB, not ~498Mi
sudo dnf install -y nginx git nodejs npm python3-pip
```

---

## Railway as a backup plan

### Does it fit the hackathon?

From [`07-engineer-context.md`](07-engineer-context.md): the **judged demo must run on real OCI** (Compute + GenAI + 23ai story). Railway is only useful as:

- A **fallback public URL** if OCI Compute is still broken near the deadline.
- **Frontend/API hosting** while OCI DB + GenAI stay in Oracle Cloud.
- **Internal team testing** (not a substitute for the OCI judging narrative).

### What Railway can host

| Component | Railway? | Notes |
|-----------|----------|--------|
| **FastAPI backend** | Yes | One Railway **service**, start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`. |
| **TanStack Start frontend** | Yes | Second service, or build + `npm run preview` / Node server; set `VITE_API_BASE_URL` to backend URL. |
| **OCI GenAI** | Yes (with setup) | Backend today uses `oci.config.from_file()` → **`~/.oci/config` on disk**. On Railway you must inject the same via **secrets** (mount config file at startup) or a small code change to use env-based auth. |
| **Oracle ADB vectors** | Harder | Needs wallet zip + `TNS_ADMIN` + `ADB_*` env on the service; ADB must allow access from Railway egress (mTLS wallet is fine if network/ACL allows). No wallet in git. |
| **SQLite accounts** | Easy | Default `DATABASE_URL=sqlite:///./pactpilot.db` — **ephemeral** on Railway (resets on redeploy) unless you add a Railway **volume**. |
| **`FAKE_OCI=1`** | Easiest | ~**1–2 h** for a fake demo URL; **no** real Oracle AI story. |

### Effort estimate (backup only)

| Scenario | Work | Outcome |
|----------|------|---------|
| **A. Fake demo** | ~**1–2 h** | Railway backend `FAKE_OCI=1` + frontend pointing at it; good for UI walkthrough, **not** for judging. |
| **B. Real GenAI, in-memory vectors** | ~**3–5 h** | Railway backend with OCI config secret + all `OCI_*` env; `ADB_DSN` empty; SQLite or Postgres plugin for accounts. |
| **C. Real GenAI + Oracle ADB** | ~**6–10 h** | Wallet as Railway secret/volume, `DATABASE_URL` + `ADB_*`, debug connectivity; still **not** “all on OCI Compute”. |
| **D. Parity with OCI VM plan** | Similar to fixing VM | Two services + secrets + DB + long timeouts; **no clear win** vs resizing `pactpilot-vm`. |

### Railway vs fixing the VM

| | **Resize OCI VM (recommended)** | **Railway backup** |
|---|--------------------------------|-------------------|
| Judging alignment | Full OCI stack | Partial; GenAI/ADB can stay OCI, app elsewhere |
| Blocker | One console shape change | OCI config on PaaS, 2 services, CORS/URLs |
| Ops Ankit already did | SSH, wallet, `.env` pattern | New platform + env matrix |
| Cost | Always Free VM | Railway trial/credit; GenAI still OCI spend |

**Recommendation:** finish **OCI VM resize + deploy** for the official demo; use Railway only if the VM is still blocked close to the deadline (scenario **B** is the realistic backup).

### Railway sketch (if we do it)

1. **Service `pactpilot-api`** — root `backend/`, `pip install -r requirements.txt`, start uvicorn on `$PORT`.
2. **Service `pactpilot-web`** — root `frontend/`, `npm ci && npm run build && npm run preview` (or documented start command).
3. **Variables (API)** — from `backend/.env.example`: `FAKE_OCI`, `OCI_*`, optional `ADB_*`, `TNS_ADMIN` (path to mounted wallet), `DATABASE_URL`, `JWT_SECRET` (32+ chars).
4. **Secrets** — paste OCI config + key PEM as files; unzip wallet to `/app/wallet` in build or entrypoint.
5. **Frontend** — `VITE_API_BASE_URL=https://<api>.up.railway.app` at build time.
6. **Timeouts** — Railway HTTP limits may be tighter than nginx `300s`; analysis ~45s needs a plan (streaming or async job — not built today).

No `Dockerfile` or `railway.toml` exists in the repo yet; add in a small PR if we pursue this.

---

## Decisions for @Mykyta

1. **Confirm target VM shape** (RAM/OCPU) for `pactpilot-vm` after stop — suggest **≥ 4 GB RAM**.
2. **Single ADB** for accounts + vectors on deploy (same wallet as laptop) — OK?
3. **Railway:** pursue backup now, or only if OCI URL slips?
4. **Merge** `fix/adb-wallet-connection` to `main` before VM deploy (wallet fix required on server).

---

## Related docs

| Doc | Use |
|-----|-----|
| [`06-oracle-setup.md`](06-oracle-setup.md) | OCI checklist |
| [`08-oci-onboarding.md`](08-oci-onboarding.md) | VCN / security list / vocabulary |
| [`STATUS.md`](STATUS.md) | Local run + feature status (may lag deploy) |
| `docs/deploy/nginx-pactpilot.conf` | On branch `feat/document-ai-ocr` (nginx template) |

---

## Changelog

| Date | Update |
|------|--------|
| 2026-06-03 | Initial handoff: VM OOM, resize in progress, Railway backup assessed. |
