# Run the OYDK console on your PC (any project)

Anyone can clone this repo, install prerequisites on **their laptop**, add **their** credentials, and run the full kit against **their** GA4 property, GTM container, GCP project, and Matomo site.

The console is **local only** (`http://127.0.0.1:8765`). It does not send your secrets to Tatvic or a hosted server.

---

## What you need on your laptop

### Always required (console + offline demos)

| Prerequisite | Why |
|--------------|-----|
| **Python 3.11+** | Runs the kit and demo console |
| **Git** | Clone the repository |
| **pip** + `requirements.txt` | Python dependencies |
| **Modern browser** (Chrome, Edge, Firefox) | Demo console UI |
| **~2 GB free disk** | Repo, Python packages, `output/` logs |

```powershell
# Windows (example)
git clone <your-fork-or-repo-url> own-your-data-kit
cd own-your-data-kit
py -3 -m pip install -r requirements.txt
```

```bash
# macOS / Linux
python3 -m pip install -r requirements.txt
```

### Required for **live** GA4 / GTM / Matomo (not for fixture-only demos)

| Prerequisite | Why |
|--------------|-----|
| **`config/client.yaml`** | Your client name, Matomo URL, GA4/GTM IDs (copy from `config/example.client.yaml`) |
| **Repo root `.env`** | At minimum `MATOMO_API_TOKEN=…` (from Matomo → Personal → Security) |
| **GA4/GTM service account JSON** | Path in YAML, usually `credentials/ga-service-account.json`; grant that SA **Viewer** on the GA4 property and **Read** (or Edit) on GTM — see **[ga4-gtm-access-for-live-agents.md](ga4-gtm-access-for-live-agents.md)** if you see `403` |
| **A Matomo instance** | Self-hosted (OYDK deploy) or existing; you need **site URL**, **site ID**, **API token** |

Without GA credentials, the console still works: use **Run safe suite (fixture only)** or individual **fixture** buttons.

### Required to **deploy the analytics stack** (VM + Matomo on GCP)

| Prerequisite | Why |
|--------------|-----|
| **Google Cloud account** + **project** with **billing** enabled | Terraform creates a VM, disk, scheduler, etc. |
| **gcloud CLI** | Auth and deploy scripts |
| **Terraform 1.5+** | Used by `deploy/deploy.ps1` / `deploy.sh` |
| **Permissions** on the project | e.g. Compute Admin, Service Usage Admin (or Owner for lab projects) |

```powershell
gcloud auth login
gcloud config set project YOUR_GCP_PROJECT_ID
# Or run the full Tatvic-style wizard (GCP / on-prem / dry-run):
.\deploy\enterprise-deploy.ps1
```

Use **Demo mode → Sign in to Google Cloud** in the console to open the same flow, or run `enterprise-deploy.ps1` in PowerShell for the full 5-step provisioner.

### Required for **local Matomo only** (no GCP VM)

| Prerequisite | Why |
|--------------|-----|
| **Docker Desktop** + **Docker Compose** | `OYDK_LOCAL=1` path in `deploy.ps1` starts Matomo + kit-api on localhost |

```powershell
$env:OYDK_LOCAL = "1"
.\deploy\deploy.ps1 -ProjectId local -ClientName myclient
# Matomo http://localhost:8080  |  Kit API http://localhost:8090
```

### Optional (stretch features)

| Prerequisite | Feature |
|--------------|---------|
| **SMTP** in `.env` (`OYDK_SMTP_*`) | Parity daily emails |
| **BigQuery** + same or other GCP project | Matomo → BQ export tab |
| **`OYDK_OPENAI_API_KEY`** | Richer “Ask your agent” answers |
| **Google Ads / Meta tokens** | Live connector tests (demo mode works without them) |

### Not required on the laptop

- A **remote VM** running 24/7 (only after you deploy to GCP, the VM lives in **your** cloud)
- Aurablush or Tatvic credentials (those are just the **default** demo profile in our reference repo)

---

## Credentials checklist (your project)

Copy this list and fill before **Custom** mode:

1. **GCP project ID** (for deploy and optional BigQuery)  
2. **Matomo** — base URL, `idSite`, API token → `.env` + YAML  
3. **GA4** — property ID, measurement ID  
4. **GTM** — account ID, container ID  
5. **Service account JSON** — downloaded from GCP; GA4 + GTM access granted to that email  
6. **Website URL** — your shop or app (for DPDP consent summary if your site exposes `/api/dpdp/summary`)  
7. **Parity alert emails** (optional)  
8. **`gcloud auth login`** — before **Deploy to GCP** or infra scripts  

---

## First-time setup (15 minutes)

### 1. Install and configure

```powershell
cd own-your-data-kit
py -3 -m pip install -r requirements.txt

copy config\example.client.yaml config\client.yaml
copy .env.example .env
# Edit config/client.yaml — your Matomo, GA4, GTM, website_url
# Edit .env — MATOMO_API_TOKEN at minimum
mkdir credentials
# Place ga-service-account.json in credentials\
```

### 2. Start the console

```powershell
py -3 -m kit.cli demo-ui
```

Open **http://127.0.0.1:8765** (keep the terminal open).

### 3. Use **Demo mode**

| Goal | Steps |
|------|--------|
| **Try without cloud** | **Run safe suite (fixture only)** |
| **Your live GA4 + Matomo** | **Custom** → fill Deploy form → **Apply custom profile** → **Run all default connection tests** |
| **Provision stack on your GCP** | **Sign in to Google Cloud** → Deploy tab → **Deploy to GCP** (or local Docker with **Local Docker only**) |

After deploy, complete **[post-deploy-checklist.md](post-deploy-checklist.md)** (Matomo wizard, token in `.env`, site tags).

### 4. Verify

- **Infra checklist** tab → **Run checks now** (Kit API + shop DPDP summary when deployed)  
- Or: `.\scripts\verify-infra.ps1`  

---

## What works on “any” website / property?

| Capability | Your inputs | Notes |
|------------|-------------|--------|
| Migration agent | Your GA4 + GTM IDs + SA JSON | GTM changes stay **draft** until you publish in GTM |
| Parity | GA4 + Matomo on same dates | Needs both sides collecting comparable events |
| DPDP / DSAR | Matomo + optional kit-api | Erasure demo needs DPDP wiring on **your** site |
| Deploy | Your GCP project | Creates **your** VM + Matomo in **your** project |
| Connectors | Your Ads/Meta/BQ IDs in YAML | Demo mode can run with `demo_mode: true` |

The console does **not** automatically attach to a random URL without config—you always point `website_url`, Matomo, and GA4/GTM to **your** assets.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `ERR_CONNECTION_REFUSED` on :8765 | Start `py -3 -m kit.cli demo-ui`; leave terminal open |
| Live migration/parity fails | Check `credentials/ga-service-account.json` and Matomo token in `.env` |
| Deploy fails | `gcloud auth login`; billing on project; run from repo root |
| Kit API offline | Deploy stack first, or `.\scripts\restart-kit-api.ps1` on **your** VM |

More: [demo-console.md](demo-console.md), [infra-demo-checklist.md](infra-demo-checklist.md).

---

## Hosted demo (Cloud Run)

To share one URL for the team (reference Aurablush config): **[demo-console-cloud-run.md](demo-console-cloud-run.md)** and `.\scripts\deploy-demo-console.ps1`.

## Security when publishing the repo

- Tell users: **never commit** `.env`, `config/client.yaml` with real emails, or `credentials/*.json`.  
- Console binds **127.0.0.1** only; do not expose port 8765 to the internet without authentication.  
- Each user runs agents against **their** cloud accounts; you are distributing **software**, not a shared multi-tenant service.
