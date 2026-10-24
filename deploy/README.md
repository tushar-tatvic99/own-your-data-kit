# Tatvic OYDK — One-Command Enterprise Deployment Playbook

> **Target Standard:** Any consultant or engineer at Tatvic can provision and configure the complete Own-Your-Data Analytics Kit for a new enterprise client in under 15 minutes on a clean cloud project or bare-metal server.

---

## 1. Architecture Overview

The OYDK installer provisions a complete, DPDP-ready analytics infrastructure with zero vendor lock-in.

```
                              ┌───────────────────────────────────────────────┐
                              │             Ingress Edge Proxy                │
                              │     Automated TLS (Let's Encrypt / Caddy)     │
                              │           https://matomo.<ip>.nip.io          │
                              └──────────────────────┬────────────────────────┘
                                                     │
                             ┌───────────────────────┴────────────────────────┐
                             │                                                │
                             ▼                                                ▼
               ┌───────────────────────────┐                    ┌───────────────────────────┐
               │    Web Analytics UI       │                    │      OYDK Kit Daemon      │
               │   (Matomo 5.x / PostHog)  │                    │    DSAR, BQ & Ads Sync    │
               │        Port 8080          │                    │        Port 8090          │
               └─────────────┬─────────────┘                    └─────────────┬─────────────┘
                             │                                                │
         ┌───────────────────┴───────────────────┐        ┌───────────────────┴───────────────────┐
         ▼                                       ▼        ▼                                       ▼
┌─────────────────┐                     ┌─────────────────┐                     ┌─────────────────┐
│ MariaDB 10.11   │                     │ Redis Cache     │                     │ GCS Backups     │
│ Persistent SSD  │                     │ Session Store   │                     │ 90-Day Policy   │
└─────────────────┘                     └─────────────────┘                     └─────────────────┘
```

### Supported Deployment Targets
1. **Google Cloud Platform (India Region `asia-south1`)**:
   - Custom VPC with private subnets and static external IP.
   - Dedicated `e2-standard-4` VM with encrypted Persistent SSD (`pd-ssd`).
   - Cloud Storage bucket for daily automated backups (`gs://<project>-<client>-analytics-backups`).
   - Cloud Monitoring uptime checks and email alerting policies.
2. **On-Premise / Bare Metal (Local Docker Compose Stack)**:
   - Zero cloud dependency, fully self-contained on Linux/macOS.
   - MariaDB 10.11, Redis 7, Analytics Engine, Kit API, and Sync Scheduler.

---

## 2. Pre-Flight Checklist

Before deploying for a new client, ensure:
1. **Google Cloud Project** created (e.g. `client-analytics-prod`) with billing enabled.
2. **Permissions**: You need `Owner` or `Editor` + `Security Admin` on the GCP project.
3. **gcloud CLI**: Logged in via `gcloud auth login` and `gcloud auth application-default login`.
4. **Target Region**: `asia-south1` (Mumbai) or `asia-south2` (Delhi) for Indian data localization compliance.

---

## 3. Fast-Track Deployment Options

### Option A: Zero-Install Quick Boot (Recommended for Clean Laptops)
Judges or field engineers on a fresh machine with no prior repository setup:
```bash
curl -fsSL https://oydk-portal-61760469326.asia-south1.run.app/install.sh | bash
```

### Option B: Interactive Deployment (From Local Cloned Repository)
```bash
cd own-your-data-kit
./deploy/install.sh
```
The installer prompts for:
1. Target Infrastructure (GCP or On-Premise)
2. Analytics Stack (Matomo or PostHog)
3. Client Slug (e.g. `hdfc-bank`, `tatvic-ecom`)
4. GCP Project ID (auto-detected from active `gcloud` config)

### Option C: Automated Unattended CI/CD Deployment
For scripted pipeline execution without interactive prompts:
```bash
./deploy/install.sh \
  --unattended \
  --target gcp \
  --project tvc-int-matomo \
  --client client-demo \
  --region asia-south1
```

### Option D: Zero-Cost Dry-Run Simulation
Validates all GCP APIs, plans the Terraform resource graph, inspects edge SSL domains, and outputs a sealed `config/client.dryrun.yaml` with **$0.00 billing impact**:
```bash
./deploy/install.sh --dry-run --target gcp --project tvc-int-matomo --client demo
```

---

## 4. The Four Enterprise Operational Pillars

### Pillar 1: Enterprise Database & Compute
- **Engine**: MariaDB 10.11 LTS with `utf8mb4` collation and tuned InnoDB buffer pools.
- **Storage**: Persistent SSD disk with ext4 filesystem.
- **Session Caching**: Redis 7 Alpine for high-throughput tracking ingest.
- **Edge Routing**: Automated HTTPS/TLS termination via Let's Encrypt reverse proxy.

### Pillar 2: Automated Backups & Disaster Recovery
- **Daily Schedule**: Cloud Scheduler triggers automated database dumps and state capture daily at 02:00 IST (`0 2 * * *`).
- **Cloud Storage**: Archived to GCS bucket (`gs://${project}-${client}-analytics-backups`) with automated 90-day lifecycle expiration.
- **Local Protection**: Local rotation retains 30 days of archives to prevent disk exhaustion.
- **On-Demand Backup**:
  ```bash
  .venv/bin/python3 -m kit.cli backup
  ```
- **Disaster Recovery Restore**:
  ```bash
  .venv/bin/python3 -m kit.cli restore output/backups/oydk_backup_<client>_<timestamp>.tar.gz
  ```
  Restores database schema, DPDP audit trails, and BigQuery sync watermarks in seconds.

### Pillar 3: Zero-Downtime Updates & OS Patching
- **OS CVE Security Updates**: VM startup script activates Debian `unattended-upgrades` to automatically patch operating system vulnerabilities nightly without manual intervention.
- **Analytics Engine Updates**: Safe update mechanism verifies release compatibility, creates an automated pre-update safety backup, pulls container layers, and applies database schema migrations (`core:update`):
  ```bash
  # Check for available updates
  .venv/bin/python3 -m kit.cli update --check-only

  # Apply update with pre-update safety backup
  .venv/bin/python3 -m kit.cli update
  ```

### Pillar 4: Cloud Monitoring & Proactive Alerting
- **Uptime Monitoring**: Google Cloud Monitoring Uptime Check pings the analytics service every 300 seconds from multi-region probe locations.
- **Incident Alert Policy**: Configured Terraform resource `google_monitoring_alert_policy.uptime_alert` triggers immediate alerts if health checks fail for > 5 minutes.
- **Operational Dashboard**: Run the single-pane operational health check at any time:
  ```bash
  .venv/bin/python3 -m kit.cli health
  ```
  Displays live status for:
  - Analytics Engine Health & Version
  - Automated Backup Archive Status
  - BigQuery Streaming Watermark & Last Sync Time
  - Google Cloud Monitoring Configuration

---

## 5. Post-Deployment Verification Checklist

Run these five commands immediately after deployment to certify the installation:

```bash
# 1. Verify stack health & monitoring
.venv/bin/python3 -m kit.cli health

# 2. Test DPDP DSAR flow
.venv/bin/python3 -m kit.cli dsar-lookup "user-test@example.com"

# 3. Test BigQuery sync stream
.venv/bin/python3 -m kit.cli bq-sync

# 4. Verify Google Ads conversion connection
.venv/bin/python3 -m kit.cli connectors-test

# 5. Check immutable audit trail
.venv/bin/python3 -m kit.cli audit-log --limit 5
```

---

## 6. Client Handover & Maintenance

1. **Config Storage**: Copy `config/client.yaml` to the client's internal secure repository or Google Secret Manager.
2. **Access Handover**: Provide the client's data engineering team with BigQuery dataset access (`matomo_export`).
3. **Web Tracking**: Embed the DPDP-ready snippet (found in `Matomo ecomm Web/index.html`) on the client's web properties.
