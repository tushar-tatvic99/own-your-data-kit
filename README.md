# Own-Your-Data Analytics Kit

Move off Google Analytics onto a self-hosted, DPDP-ready analytics stack — deployed on the client's own cloud in India, with migration done mostly by an agent.

**Built by Tatvic** | Default stack: Matomo (adapter swappable — [kit vs stack](docs/kit-vs-analytics-stack.md)) | Region: India (`asia-south1`)

---

## What this kit does

| Component | What it does |
|-----------|-------------|
| **One-command deploy** | Full stack on a fresh GCP project in an India region |
| **DPDP-ready defaults** | Consent gating, PII scrubbing, retention limits, DSAR, audit log |
| **GA4 migration agent** | Reads GA4 + GTM via APIs, builds Matomo setup, writes GTM draft |
| **Parity checker** | Daily/weekly GA4 vs Matomo comparison with alerts and diagnosis |
| **Connectors** | Google Ads, Meta CAPI, BigQuery export, Looker Studio dashboard |

## Aurablush production (asia-south1)

- **Site:** https://auraandblush-61760469326.asia-south1.run.app  
- **Tracking:** Google GTM → GA4; Matomo via MTM (see [docs/aurablush-tracking-architecture.md](docs/aurablush-tracking-architecture.md))  
- **Config:** `config/client.yaml`

## Quick start

### Prerequisites

- Python 3.11+
- Docker & Docker Compose (local Matomo stack only — not needed for fixture demos)
- `gcloud` CLI + Terraform 1.5+ (GCP deploy only)

**Publishing the demo console for other teams:** see **[docs/run-console-on-your-pc.md](docs/run-console-on-your-pc.md)** (laptop setup, credentials, Custom mode, what requires VM/Docker vs not).

### Local development

```bash
# Install dependencies
pip install -r requirements.txt

# Start local stack (Matomo + kit services)
$env:OYDK_LOCAL = "1"          # Windows
export OYDK_LOCAL=1            # Linux/Mac
.\deploy\deploy.ps1 -ProjectId local

# Matomo:  http://localhost:8080
# Kit API: http://localhost:8090
```

### Cloud deployment (one command)

**One command** provisions the full stack on a **new GCP project** (VM, Matomo, TLS, kit API, backups, schedulers — India region). No manual Terraform or Docker assembly.

```powershell
.\deploy\deploy.ps1 -ProjectId <gcp-project-id> -ClientName <client> -Profile standard
```

```bash
SCALE_PROFILE=enterprise ./deploy/deploy.sh <gcp-project-id> <client-name>
```

**After that**, the client’s Google/Matomo logins need **~3 short steps** (wizard + `client.yaml` + site tags) — things no deploy script can do without their accounts. See **[docs/post-deploy-checklist.md](docs/post-deploy-checklist.md)**.

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

# Verify all five required build parts (hackathon checklist)
python -m kit.cli verify-parts
```

See **[docs/five-parts-complete.md](docs/five-parts-complete.md)** for the full rubric mapping.

### Judge demo UI (one screen, click buttons)

```powershell
py -3 -m kit.cli demo-ui
```

Open **http://127.0.0.1:8765** — all 5 parts + stretch + cost calculator + Ask your data. See [docs/demo-console.md](docs/demo-console.md).

### Stretch: GA4 history import (BigQuery → Matomo)

```powershell
py -3 -m kit.cli import-ga4-history -c config/client.yaml --fixture --dry-run
```

See **[docs/ga4-history-import.md](docs/ga4-history-import.md)**.

## Project structure

```
own-your-data-kit/
├── deploy/              # One-command deploy (Terraform + Docker)
│   ├── terraform/       # GCP infrastructure
│   ├── docker/          # Matomo + kit services
│   ├── deploy.sh        # Linux/Mac deploy script
│   └── deploy.ps1       # Windows deploy script
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
