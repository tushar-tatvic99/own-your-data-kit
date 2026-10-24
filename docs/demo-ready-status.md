# Aurablush + OYDK — status

**Team demo guide:** [TEAM_DEMO_LIVE.md](TEAM_DEMO_LIVE.md)

## Five build parts (code)

Run: `py -3 -m kit.cli verify-parts` → all **PASS**

Detail: `docs/five-parts-complete.md`

| Part | Status |
|------|--------|
| 1 Deploy | IaC, Docker, Caddy HTTPS, backup/update scripts, deploy.ps1 |
| 2 DPDP | Consent, PII, DSAR export/delete, retention job, audit API |
| 3 Migration | Live GA4→Matomo + `gtm-draft-bundle.json` + report |
| 4 Parity | Scheduler, Cloud Scheduler hooks, alerts.log, diagnosis |
| 5 Connectors | Ads/Meta demo→BQ, CMP doc, BQ export, Looker JSON |

## GTM workspace API (optional polish)

If migration logs `permission denied` on workspace create: GTM Admin → **User management** → add  
`matomo-ga4@tvc-int-matomo.iam.gserviceaccount.com` with **Approve** on container `GTM-MMXM5L53`.  
Draft artifacts still ship in `output/migration/gtm-draft-bundle.json`.

## Production URLs

- Shop: https://auraandblush-61760469326.asia-south1.run.app
- Matomo: https://matomo.35-234-210-199.nip.io
- Kit API: http://35.234.210.199:8090

## CLI

```powershell
$env:MATOMO_API_TOKEN = "<token>"
py -3 -m kit.cli verify-parts
py -3 -m kit.cli connectors-test
py -3 -m kit.cli migrate
py -3 -m kit.cli parity -d 2026-10-24
```
