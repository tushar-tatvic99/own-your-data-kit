# Infinity Bank shop ↔ OYDK DPDP erasure

The **Petition for Data Erasure** form calls `POST /api/dpdp/erasure` on the shop server, which proxies to **kit-api**:

`POST http://35.234.210.199:8090/dsar/process-erasure`

## Redeploy shop (Cloud Run)

Use the **Dockerfile** in this folder (includes `styles.css` + `assets/`). Buildpack-only deploys can omit static files.

```powershell
gcloud run deploy auraandblush --source . --region asia-south1 --project tvc-int-matomo --allow-unauthenticated --clear-base-image --set-env-vars "MATOMO_URL=https://matomo.35-234-210-199.nip.io" --set-secrets "MATOMO_API_TOKEN=aurablush-matomo-api-token:latest"
```

Set env if kit-api URL changes:

```text
KIT_API_URL=http://35.234.210.199:8090
```

## Redeploy kit-api (VM)

After pulling latest `own-your-data-kit` on the VM:

```bash
cd /home/tushar_tatvic_com/own-your-data-kit/deploy/docker
sudo docker-compose build kit-api && sudo docker-compose up -d kit-api
```

## Demo flow

1. Browse shop with analytics consent (creates Matomo visits).
2. Open **#dpdp-erasure**, submit form with the **same email** you used on the site (or any email — visits linked via `dpdp-<sha256>` User ID).
3. Confirm: `py -3 -m kit.cli dsar-lookup --user-id <dpdp-subject-id>` or check Matomo / kit `GET /audit` for `web-dpdp-form` / `erasure`.

Subject ID algorithm: `demo/infinity-shop/dpdp-subject.js` ↔ `dpdp/subject_id.py`.
