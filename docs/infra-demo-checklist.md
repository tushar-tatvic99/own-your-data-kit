# Infra checklist (before demo)

Run these once after code changes or when Kit API / shop endpoints fail.

## Quick verify (no deploy)

```powershell
.\scripts\verify-infra.ps1
```

From the demo console: open **Infra checklist** → **Run checks now**.

## Full setup (interactive gcloud login required)

```powershell
gcloud auth login
gcloud config set project tvc-int-matomo
.\scripts\setup-infra-demo.ps1
```

This runs:

1. `restart-kit-api.ps1` — `docker-compose up -d kit-api` on the analytics VM  
2. `deploy-infinity-shop.ps1` — Cloud Run shop with `/api/dpdp/summary`  
3. `verify-infra.ps1` — probes `/health`, `/audit`, shop summary  

## Matomo agent (optional)

Add to repo root `.env`:

```env
OYDK_OPENAI_API_KEY=sk-...
OYDK_OPENAI_MODEL=gpt-4o-mini
```

Restart `py -3 -m kit.cli demo-ui` so `load_kit_env()` picks up the key.

## Expected URLs

| Check | URL |
|-------|-----|
| Kit health | http://35.234.210.199:8090/health |
| Kit audit | http://35.234.210.199:8090/audit |
| Shop DPDP | https://auraandblush-61760469326.asia-south1.run.app/api/dpdp/summary |
