# Live team demo — Own-Your-Data Analytics Kit (Aurablush)

**GCP project:** `tvc-int-matomo` · **Region:** `asia-south1` (Mumbai)

## Demo Console (recommended)

```powershell
py -3 -m kit.cli demo-ui
```

Open **http://127.0.0.1:8765** — one-click buttons for all 5 parts + stretch. See [demo-console.md](demo-console.md).

## Open these URLs (share screen)

| What | URL |
|------|-----|
| **Shop (dual-tag site)** | https://auraandblush-61760469326.asia-south1.run.app |
| **Matomo admin** (HTTPS) | https://matomo.35-234-210-199.nip.io |
| **Kit API health** | http://35.234.210.199:8090/health |
| **Audit log (JSON)** | http://35.234.210.199:8090/audit |
| **GA4 property** | `560630351` / `G-SBRP8M6S83` |
| **GTM** | `GTM-MMXM5L53` |
| **BigQuery** | [Console — matomo_export](https://console.cloud.google.com/bigquery?project=tvc-int-matomo&d=matomo_export) |

---

## New client: one-command deploy

```powershell
.\deploy\deploy.ps1 -ProjectId <gcp-project> -ClientName <client> -Profile standard
```

**One command** = platform live. **~3 client steps** after (Matomo token, GA config, tags) — [post-deploy-checklist.md](post-deploy-checklist.md). Profiles: [scaling.md](scaling.md).

---

## Matomo API token (one-time setup)

1. Matomo → **Personal → Security → Auth tokens → Create new token** (secure connections only).
2. Copy `.env.example` → `.env` in the repo root and set `MATOMO_API_TOKEN=...` (`.env` is gitignored).

The CLI loads `.env` automatically — **no new token each demo**, and no `$env:...` unless you prefer it for one session.

---

## 10-minute demo script

### 1) Architecture (1 min)

- **GTM → GA4** (existing marketing stack)
- **Matomo** on **your GCP VM** (India), DPDP consent on shop
- **OYDK agents** migrate GA4 → Matomo, check parity, DSAR

### 2) Consent + tracking (2 min)

1. Open shop in **Incognito**.
2. **Decline** cookies → DevTools Network: no calls to `matomo.35-234-210-199.nip.io`.
3. **Accept** → `matomo.php` + GTM requests.
4. Matomo → **Visitors** / **Realtime** (same session).

### 3) Migration agent (2 min)

On your laptop (repo cloned):

```powershell
cd C:\Users\TusharBorude\Projects\own-your-data-kit
py -3 -m kit.cli migrate -c config/client.yaml
```

Show:

- Terminal summary
- `output/migration/migration-report.md`
- `output/migration/gtm-draft-bundle.json`
- Matomo → **Goals** (Purchase, leads)

### 4) Parity + “broken tag” (2 min)

```powershell
# Live (today's date)
py -3 -m kit.cli parity -d 2026-10-24 -c config/client.yaml

# Judge-style rehearsal (always works)
py -3 -m kit.cli parity -c config/client.yaml --fixture --break-tag purchase
# ↑ sends a [DEMO] MISS email on purpose; daily schedule uses live data only (no --fixture/--break-tag)
```

Show MISS, diagnosis, `output/parity/alerts.log`.

**Daily email report:** Every scheduled parity run emails the full GA4 vs Matomo table to `parity.alert_emails`. If any metric is above ±5%, the same email adds **diagnosis & proposed fixes**. SMTP in repo `.env` (local) or VM `deploy/docker/.env`:

```env
OYDK_EMAIL_FROM=tushar@tatvic.com
OYDK_SMTP_USER=tushar@tatvic.com
OYDK_SMTP_PASS=<Gmail app password>
```

VM one-shot: `.\scripts\setup-parity-email-vm.ps1` (pulls app password from Secret Manager).

**Scheduled:** `kit-scheduler` + Cloud Scheduler `POST /internal/parity` daily **6:00 IST** — both trigger `run_parity` (yesterday’s date) and email the list.

### 5) DPDP — DSAR (2 min)

Full checklist: `docs/dpdp-complete.md` · `py -3 -m kit.cli verify-dpdp`

```powershell
py -3 -m kit.cli dsar-lookup --user-id oydk-align-001 -c config/client.yaml
py -3 -m kit.cli dsar-export --user-id oydk-align-001 -c config/client.yaml
# Optional delete on test user:
# py -3 -m kit.cli dsar-delete --user-id oydk-align-001 -c config/client.yaml -y
```

Show **http://35.234.210.199:8090/audit** for lookup/export audit entries.

### 6) Connectors + stack choice (1 min)

```powershell
py -3 -m kit.cli connectors-test -c config/client.yaml
py -3 -m kit.cli verify-parts
```

Show BigQuery table `connector_conversions`, then **`docs/stack-choice.md`** (Matomo vs five tests).

---

## What’s live on GCP right now

- Cloud Run shop with **HTTPS Matomo** tracker
- VM: Matomo + Caddy TLS + kit-api + parity scheduler
- Cloud Scheduler: daily backup, **daily parity**, weekly retention audit
- Secret Manager: Matomo API token

---

## If something fails

| Issue | Fix |
|-------|-----|
| Matomo login | Use your `tushar` user; token under Personal → Security |
| CLI 401 | Token is **secure-only** — kit uses POST; set `$env:MATOMO_API_TOKEN` |
| Parity MISS | Expected early; use `--fixture --break-tag` for a clean alert demo |
| GTM workspace API | Draft is in `gtm-draft-bundle.json`; SA needs GTM **Approve** to create workspace in UI |
