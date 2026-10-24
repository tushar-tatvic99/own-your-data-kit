# Own-Your-Data Analytics Kit

Move off Google Analytics onto a self-hosted, DPDP-ready analytics stack — deployed on the client's own cloud in India, with migration done mostly by an agent.

**Built by Tatvic** | Stack: Matomo (self-hosted) | Region: India (`asia-south1`)  
**Live Judge Portal**: [https://oydk-portal-61760469326.asia-south1.run.app](https://oydk-portal-61760469326.asia-south1.run.app)  
**Live Test Store**: [https://auraandblush-61760469326.asia-south1.run.app](https://auraandblush-61760469326.asia-south1.run.app)  

---

## What this kit does

| Component | What it does |
|-----------|-------------|
| **One-command deploy** | Full stack on a fresh GCP project in an India region |
| **DPDP-ready defaults** | Consent gating, PII scrubbing, retention limits, DSAR, audit log |
| **GA4 migration agent** | Reads GA4 + GTM via APIs, builds Matomo setup, writes GTM draft |
| **Parity checker** | Daily/weekly GA4 vs Matomo comparison with alerts and diagnosis |
| **Connectors** | Google Ads, Meta CAPI, BigQuery export, Looker Studio dashboard |

## Quick start

### Prerequisites

- Python 3.11+
- Docker & Docker Compose
- `gcloud` CLI (for cloud deploy)
- Terraform 1.5+

### One-Command Deployment

```bash
# Interactive Master Installer (GCP India Region or On-Premise Docker)
./deploy/install.sh

# Unattended GCP Cloud Deploy
./deploy/install.sh --target gcp --project <gcp-project-id> --client <client-name>

# On-Premise Bare-Metal Deployment
./deploy/install.sh --target on-premise --client <client-name>

# Dry-Run Architecture & Config Simulation ($0 Billing Impact)
./deploy/install.sh --dry-run --target gcp --client demo
```

### Local Development & Testing

```bash
# Install dependencies
pip install -r requirements.txt

# Background Daemon (Parity checker & BigQuery incremental streaming)
docker compose up -d
docker compose logs -f
```

### Configure a client

```bash
cp config/example.client.yaml config/client.yaml
# Edit with GA4 property ID, GTM container ID, Matomo URL, API tokens
```

### Run the agents

```bash
# Migrate GA4 → Matomo
python -m agents.migration.run --config config/client.yaml

# Check parity
python -m agents.parity.run --config config/client.yaml

# DPDP: look up / delete a person's data
python -m kit.cli dsar-lookup --user-id visitor-123
python -m kit.cli dsar-delete --user-id visitor-123

# Test connectors
python -m kit.cli connectors-test
```

## Project structure

```
own-your-data-kit/
├── deploy/              # Master Enterprise Installer (GCP & On-Premise)
│   ├── install.sh       # Unified CLI & unattended deployer
│   ├── terraform/       # GCP infrastructure in asia-south1
│   └── docker/          # Matomo, Postgres, MariaDB, Kit API & Scheduler
├── Matomo ecomm Web/    # Test E-Commerce & Banking Web App (Cloud Run)
├── agents/
│   ├── migration/       # GA4/GTM → Matomo migration agent
│   └── parity/          # Scheduled parity checker + diagnosis
├── dpdp/                # Consent, PII scrub, DSAR, audit log
├── connectors/          # Google Ads, Meta, BigQuery, Looker
├── kit/                 # Shared library (config, Matomo client, CLI)
├── config/              # Per-client configuration
└── docs/                # Stack choice, demo runbook
```

## DPDP-ready (not "compliant")

This kit provides **DPDP-ready defaults**. Compliance depends on the client's processes, legal review, and operational practices — not on a tool alone.

Defaults included:
- No tracking until visitor consents (enforced via CMP)
- Personal data stripped from URLs and events
- Configurable data retention limits
- DSAR flow to find and delete a person's data
- Audit log of who accessed or changed what

## Licence

Kit code: proprietary (Tatvic IP).
Matomo: GPL v3 (unchanged, deployed as-is).
