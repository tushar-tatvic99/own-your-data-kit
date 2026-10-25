# OYDK demo console on Cloud Run

Host the demo console so teammates open a **URL** instead of `localhost:8765`. Each user still brings **their own** GCP/GA4 access for *custom* projects; the shared Cloud Run service can run the **reference** Aurablush profile.

## Prerequisites (deployer laptop)

- `gcloud auth login` + project `tvc-int-matomo` (or your project)
- `credentials/ga-service-account.json` on disk (uploaded to Secret Manager once)
- Matomo token already in Secret Manager as `aurablush-matomo-api-token` (same as shop)

## Deploy

```powershell
cd C:\Users\TusharBorude\Projects\own-your-data-kit
.\scripts\deploy-demo-console.ps1
```

Optional HTTP basic auth (recommended if URL is public):

```powershell
.\scripts\deploy-demo-console.ps1 -BasicUser demo -BasicPassword "choose-a-strong-password"
```

The script:

- Builds from `demo/console/Dockerfile` (repo root context)
- Sets `config/cloud-run.client.yaml` (no secrets in image)
- Mounts `MATOMO_API_TOKEN` + GA JSON as secrets
- **2 GiB RAM**, **3600 s** request timeout (long migrate/parity/suite)

## After deploy

```powershell
gcloud run services describe oydk-demo-console --region asia-south1 --format="value(status.url)"
```

Open that URL in a browser.

**UI out of date?** The hosted service is a Docker image. Local `demo-ui` always uses files from your repo; Cloud Run uses whatever was last built. Re-run `deploy-demo-console.ps1`, then hard-refresh. Confirm: open `/api/console/meta` (while signed in) and check `ui_version` (e.g. `20261025k`).

## What works on Cloud Run vs laptop

| Feature | Cloud Run | Local laptop |
|---------|-----------|----------------|
| Migration / parity / connectors | ✅ (with mounted secrets) | ✅ |
| Demo suite / downloads | ✅ (ephemeral disk; resets on new instance) | ✅ |
| **Sign in to Google Cloud** button | ❌ (no gcloud on container) | ✅ |
| **Deploy to GCP** from UI | ❌ use local `deploy.ps1` | ✅ |
| Custom user YAML | Use **Custom** profile (writes ephemeral file; lost on scale-to-zero unless you add persistent volume) | ✅ persisted under `output/` |

For **other clients’** GA4/GTM: they should run the console **locally** with their credentials, or you deploy a **separate** Cloud Run service per client with their secrets.

## Security

- Do not bake `config/client.yaml` or JSON keys into the image.
- Use `-BasicUser` / `-BasicPassword` or Cloud Run **IAM** (`--no-allow-unauthenticated` + invoker role).
- Rotate Matomo token if it was ever committed to git.

## Update

Re-run `.\scripts\deploy-demo-console.ps1` after code changes.
