# After `deploy.ps1` — what’s left?

## One command = the **platform** is live

```powershell
.\deploy\deploy.ps1 -ProjectId <gcp-project> -ClientName <client> -Profile standard
```

**You do not** hand-build VMs, Docker, TLS, backups, or schedulers. The script does that.

| Done automatically | |
|--------------------|---|
| GCP APIs, VPC, VM (sized by `-Profile`) | India `asia-south1` |
| Matomo + MariaDB + Caddy HTTPS + kit-api + parity scheduler | Docker on VM |
| GCS backups + Cloud Scheduler (backup, daily parity, retention) | |
| Kit code on server | URLs printed at end |

That **is** the “one-command deploy” the brief asks for: **repeatable full stack on a fresh GCP project.**

---

## What is **not** in one command (and why)

These need **the client’s** Google and Matomo accounts. No tool can run the Matomo install wizard or read their GA4 property without their credentials.

**Three steps (~15 minutes)** — then run `migrate` / `parity`:

| # | Step | Once per |
|---|------|----------|
| 1 | Open Matomo URL → finish **install wizard** → copy **API token** into VM `deploy/docker/.env` → `docker-compose up -d --force-recreate kit-api kit-scheduler` | New Matomo install |
| 2 | `config/client.yaml` + `credentials/ga-service-account.json` (GA4/GTM IDs + SA access in their Google account) | Client |
| 3 | Point the site at Matomo + consent (or use Tatvic’s shop template) | Client site |

Optional later: SMTP for parity emails, custom domain, Ads/Meta IDs — **not** required to prove deploy + agents.

```powershell
py -3 -m kit.cli verify-parts
py -3 -m kit.cli migrate -c config/client.yaml
py -3 -m kit.cli parity -c config/client.yaml
```

---

## Optional: Tatvic engineer reference

Longer hardening and connector steps: [client-onboarding-detail.md](client-onboarding-detail.md)

Sizing / millions of events: [scaling.md](scaling.md)
