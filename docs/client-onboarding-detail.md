# Client onboarding detail (optional)

Use after [post-deploy-checklist.md](post-deploy-checklist.md) when you need full hardening or connector setup. **Not** part of one-command deploy.

## Matomo (step 1 expanded)

SSH: `gcloud compute ssh <client>-analytics --zone=asia-south1-a --project=<project>`

- Setup wizard, site ID, admin user
- API token → `MATOMO_API_TOKEN`, `MATOMO_SITE_ID` in `deploy/docker/.env`
- Secret Manager pattern (Aurablush): store token in GCP, mount in Cloud Run / compose

## Google APIs (step 2 expanded)

- GA4 Admin → SA **Viewer** on property
- GTM → SA **Approve** on container
- Copy `credentials/` to VM for scheduler live parity

## SMTP

`OYDK_SMTP_*` in VM `.env` for daily parity emails to `parity.alert_emails`.

## Website / DPDP

- `dpdp/consent_snippet.js` / Klaro
- Dual GA4 + Matomo during migration
- Erasure: shop `POST /api/dpdp/erasure` + Matomo delete

## Hardening (go-live)

- Restrict `admin_cidr_blocks` in Terraform
- Custom domain in Caddy
- Weekly parity after GA4 off: `PARITY_SCHEDULE=0 6 * * 1`
- Real Ads/Meta IDs; `connectors.demo_mode: false`

## Handoff talking points

Data in client GCP (India), DPDP-ready defaults, migration agent + GTM draft, scheduled parity, Tatvic maintenance on sizing/backups.
