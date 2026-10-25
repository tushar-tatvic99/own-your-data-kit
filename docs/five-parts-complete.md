# Five required build parts — completion checklist

Use `py -3 -m kit.cli verify-parts` to validate the repo. Production proof on GCP: `.\deploy\deploy.ps1 -ProjectId <id> -ClientName <client>`.

## Part 1 — One-command deployment

| Requirement | Implementation |
|-------------|----------------|
| India region | `asia-south1` in Terraform + deploy scripts |
| Database | MariaDB in `deploy/docker/docker-compose.yml` |
| Backups | `deploy/docker/backup-to-gcs.sh` → GCS bucket from Terraform |
| Updates | `deploy/docker/update-stack.sh` |
| Monitoring | GCP uptime check (HTTPS :443), Cloud Monitoring |
| HTTPS | Caddy + Let's Encrypt (`Caddyfile`, `matomo-https-config.sh`) |
| Repeatable | `deploy/deploy.ps1 -Profile standard` + `deploy/terraform/` |
| Sizing / millions of events | `docs/scaling.md` (small / standard / enterprise profiles) |
| After deploy | Platform done in one command; ~3 client-specific steps in `docs/post-deploy-checklist.md` |

## Part 2 — DPDP-ready defaults

| Requirement | Implementation |
|-------------|----------------|
| Consent before tracking | `dpdp/consent_snippet.js`, Klaro demo, shop CookieConsent + `requireConsent` |
| PII scrub | `dpdp/pii_scrubber.py` |
| Retention | `config/client.yaml` → `dpdp.data_retention_days`; `kit.cli retention-run` |
| See / delete data | `dsar-lookup`, `dsar-export`, `dsar-delete`; kit-api `/dsar/*` |
| Audit log | `dpdp/audit_log.py`; `GET /audit` |

## Part 3 — GA4 migration agent

| Requirement | Implementation |
|-------------|----------------|
| Read GA4 + GTM | `agents/migration/ga4_reader.py`, `gtm_reader.py` |
| Build Matomo setup | Goals/dimensions via `MatomoClient` in `run.py` |
| GTM draft (no publish) | `get_or_create_migration_workspace()` + `output/migration/gtm-draft-bundle.json` |
| Unmigrated list | `output/migration/migration-report.md` |

## Part 4 — Continuous parity

| Requirement | Implementation |
|-------------|----------------|
| Scheduled | `agents/parity/scheduler.py`; Cloud Scheduler → `POST /internal/parity` |
| ±5% target | `config/client.yaml` → `parity.target_gap_percent` |
| Alert + diagnose | Daily email report to `parity.alert_emails`; diagnosis when gap &gt; target; `alerts.log` + Slack on MISS |
| Judge break-tag | `kit.cli parity --fixture --break-tag purchase` |

## Part 5 — Ready connectors

| Requirement | Implementation |
|-------------|----------------|
| Google Ads | `connectors/google_ads.py` |
| Meta CAPI | `connectors/meta_capi.py` |
| CMP signals | `connectors/cmp_signals.py` |
| BigQuery | `connectors/bigquery_export.py` |
| Looker | `connectors/looker.py` → `output/connectors/looker-dashboard.json` |
| Demo path | `connectors/demo_pipeline.py` when `connectors.demo_mode: true` |

## Stack choice (written)

`docs/stack-choice.md` — Matomo vs five tests.
