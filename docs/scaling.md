# Scaling Matomo on GCP (OYDK)

The kit deploys **Matomo on the client's GCP project** in **India (`asia-south1`)**. Event volume is handled by **Matomo + MariaDB**, not by the migration/parity agents.

## Sizing profiles (one-command deploy)

Pass **`-Profile`** to `deploy.ps1` or **`SCALE_PROFILE`** to `deploy.sh`:

| Profile | VM (default) | Disk | Rough capacity* |
|---------|----------------|------|-----------------|
| **small** | `e2-standard-2` | 50 GB | Pilot, &lt; ~500k hits/month |
| **standard** | `e2-standard-4` | 100 GB | Typical marketing site, up to ~5M hits/month |
| **enterprise** | `e2-standard-16` | 500 GB | Heavy single-VM, up to ~50M+ hits/month with tuning |

\*Depends on tracking granularity, session rules, and archive settings. Use parity + monitoring; scale up before you hit limits.

```powershell
.\deploy\deploy.ps1 -ProjectId my-client-gcp -ClientName acme -Profile enterprise
```

```bash
SCALE_PROFILE=enterprise ./deploy/deploy.sh my-client-gcp acme
```

**Custom override** (Terraform):

```bash
terraform apply -var="scale_profile=standard" -var="machine_type=e2-standard-8" -var="disk_size_gb=250"
```

## What the default stack is

One GCE VM runs Docker Compose:

- Matomo (tracker + UI)
- MariaDB
- Caddy (HTTPS)
- kit-api, kit-scheduler, Postgres (audit)

This matches **Priority 1: Matomo** for marketing-led and regulated clients. The OYDK layer stays the same when you scale Matomo.

## When one VM is not enough

Matomo supports **horizontal scaling** in production. Tatvic typically phases this under a maintenance contract:

| Phase | Change |
|-------|--------|
| **1 — Vertical** | Larger `machine_type` / disk via `-Profile enterprise` or Terraform overrides |
| **2 — Database** | Move MariaDB to **Cloud SQL** (or dedicated DB VM), tune InnoDB, backups |
| **3 — Tracker tier** | Separate hostname(s) for `matomo.php` / JS; CDN in front of tracker |
| **4 — Reporting** | Read replica or archive-heavy config so UI queries do not block ingestion |
| **5 — Warehouse** | **BigQuery export** (`connectors/bigquery_export.py`) for very high volume analytics; Matomo remains marketing UI |

PostHog OSS is a poor default at millions of events/month on one box; that is why `docs/stack-choice.md` picks Matomo for this segment.

## Operational levers (all clients)

- **GCS backups** — `deploy/docker/backup-to-gcs.sh` + Cloud Scheduler (from Terraform)
- **Updates** — `deploy/docker/update-stack.sh`
- **Monitoring** — GCP uptime check on HTTPS; extend with Cloud Monitoring alerts on CPU, disk, MariaDB
- **Parity** — Daily during migration; switch to weekly after GA4 cutover (`parity.schedule_steady` + `PARITY_SCHEDULE` on VM)

## Aurablush (demo)

Reference deployment uses **standard** footprint on a single VM plus Cloud Run for the shop. It proves deploy + agents, not maximum throughput.

## Related

- [post-deploy-checklist.md](post-deploy-checklist.md) — finish setup after `deploy.ps1`
- [five-parts-complete.md](five-parts-complete.md) — hackathon parts map
