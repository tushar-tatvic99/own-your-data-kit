# OYDK Demo Console (one-click UI)

Stop memorizing a dozen CLI commands. Run a **local web UI** with buttons for all **five build parts** plus **stretch** demos.

## Cloud Run (shared URL)

See **[demo-console-cloud-run.md](demo-console-cloud-run.md)** — `.\scripts\deploy-demo-console.ps1`

## Run on anyone’s PC (publish / fork)

**Full prerequisites and credential checklist:** **[run-console-on-your-pc.md](run-console-on-your-pc.md)**

Summary: **Python 3.11+**, `pip install -r requirements.txt`, optional **Docker** (local Matomo), **gcloud + Terraform** (GCP deploy), **your** `config/client.yaml`, **`.env`**, and **GA service account JSON** for live GA4/GTM. Fixture demos work without cloud.

## Start (before the judge room)

**After pulling UI changes:** stop the old console and start again (`Ctrl+C`, then `py -3 -m kit.cli demo-ui`). An old process serves stale APIs (404 on `/api/dashboard/*`).

```powershell
cd C:\Users\TusharBorude\Projects\own-your-data-kit
# .env with MATOMO_API_TOKEN; credentials/ for live migrate & parity
py -3 -m kit.cli demo-ui
```

Open **http://127.0.0.1:8765** in your browser (Chrome/Edge full screen).

## Demo mode (default vs custom)

Open **Demo mode** (first tab):

- **Default demo** — uses `config/client.yaml` + repo `.env` (Matomo token, GA JSON, SMTP). Click **Run all default connection tests** for the full judge walkthrough (live steps when credentials exist, otherwise fixture).
- **Your Analytics Setup** — fill the Deploy form (GCP project, GA4/GTM, Matomo URL), then **Save & activate**. All tabs use `output/demo-console/generated-client.yaml`.

**Hosted Cloud Run** serves the same UI as localhost only after `scripts/deploy-demo-console.ps1` rebuilds the image. If you still see old radio buttons, redeploy and hard-refresh (Ctrl+F5). Check `GET /api/console/meta` → `ui_version` should be `20261025k` or newer.
- **Sign in to Google Cloud** — opens `gcloud auth login` in a terminal window before deploy or VM fixes.

The console is organized as **five product areas** plus **stretch**:

| Nav | What it does |
|-----|----------------|
| **1 · Deploy** | Form for GCP project, GA4/GTM IDs, emails → preview `deploy.ps1`, save YAML, start deploy (or local Docker) |
| **2 · Migration** | **Start migration (live)** on linked `config/client.yaml` |
| **3 · Parity** | Daily CSV history + metric table + **same text as the email** |
| **4 · DPDP** | Live shop consent counts (`/api/dpdp/summary`), rights tickets, kit/Matomo audit rows |
| **5 · Connectors** | Ready-state cards + run connector test |
| **BigQuery** | Prerequisites, GA4 vs Matomo diff, start BQ sync |
| **Cost calculator** | Years × traffic × events vs GA4 360 |
| **Ask your agent** | Matomo site picker + chat (rules; optional `OYDK_OPENAI_API_KEY`) |

Optional:

```powershell
py -3 -m kit.cli demo-ui -p 8765 -c config/client.yaml
```

## Suggested 10-minute click path

| Order | Button | Story |
|-------|--------|--------|
| 1 | **Verify all 5 parts** | Rubric green |
| 2 | **Show deploy command** | One-command India GCP |
| 3 | **verify-dpdp** + open **DPDP erasure** link | DPDP-ready |
| 4 | **Migrate (fixture)** | GA4→Matomo agent |
| 5 | **Parity fixture + break purchase** | Alert + email narrative |
| 6 | **connectors-test** | Ads/Meta/BQ/Looker |
| 7 | **Cost calculator** | Business case vs GA4 360 |
| 8 | **Ask your data** (email) | DSAR / subject ID |
| 9 | **GA4 history (fixture dry-run)** | Stretch: not starting at zero |
| 10 | **BigQuery live sync** | Stretch: warehouse export |

Output panel shows the same text you would see in the terminal.

## Downloads

After any action:

- **Download last run log** — `output/demo-console/last-run.txt`
- **Parity daily sheet (CSV)** — `output/parity/parity-daily-sheet.csv` (one row appended per parity run; use for continuous parity history)

Sidebar shows **Kit API** status (server probes `/health` so you do not rely on the browser alone).

## Infra before judges

See **[infra-demo-checklist.md](infra-demo-checklist.md)** — console tab **Infra checklist**, or `.\scripts\setup-infra-demo.ps1` after `gcloud auth login`.

## Kit API `/health` and `/audit` not loading?

If http://35.234.210.199:8090/health fails, the **kit-api** container on the VM is usually stopped or crashed:

```powershell
gcloud auth login
.\scripts\restart-kit-api.ps1
```

Then open `/health` and `/audit` again. The demo console status pill should turn green after **Refresh Kit API status**.

## Security

- Binds **127.0.0.1 only** — not exposed to the network.
- Do not run on a shared server without auth.

## Architecture

- `demo/console/static/` — HTML/CSS/JS
- `demo/console/server.py` — calls kit agents (no subprocess)
- `demo/console/actions.py` — action registry
