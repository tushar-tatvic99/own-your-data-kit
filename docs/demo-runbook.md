# Demo Runbook — Aurablush (OYDK)

Rehearse once before the event. Total demo time: ~25 minutes.

**Production URLs**

| System | URL |
|--------|-----|
| Shop | https://auraandblush-61760469326.asia-south1.run.app |
| Matomo admin | https://matomo.35-234-210-199.nip.io |
| GA4 | Property `560630351`, `G-SBRP8M6S83` |
| GTM | `GTM-MMXM5L53` |

---

## Pre-demo checklist

- [ ] `credentials/ga-service-account.json` present
- [ ] `config/client.yaml` filled in
- [ ] `$env:MATOMO_API_TOKEN` set (Matomo → Personal → Security → **Auth token**, HTTPS-only)
- [ ] Shop loads; cookie banner works
- [ ] Optional: Slack webhook in `config/client.yaml`

---

## Demo 1: Stack on GCP (~5 min)

**Show judges:**

- Matomo admin on **HTTPS** (no “insecure HTTP” banner)
- Aurablush site id **1**, goals migrated from GA4
- Architecture: GTM → GA4; Matomo via `matomo-tracker.js` + MTM container

---

## Demo 2: Migration agent (~5 min)

```powershell
$env:MATOMO_API_TOKEN = "<token>"
py -3 -m kit.cli migrate -c config/client.yaml
```

**Show:** `output/migration/migration-report.md` and Matomo **Goals**.

*(GTM “OYDK Migration Draft” is optional — not required for Aurablush architecture.)*

---

## Demo 3: Parity (~5 min)

```powershell
py -3 -m kit.cli parity -d 2026-10-24 -c config/client.yaml
```

**Show:** GA4 vs Matomo table, diagnosis on MISS.

Fixture rehearsal (offline):

```powershell
py -3 -m kit.cli parity -c config/client.yaml --fixture
py -3 -m kit.cli parity -c config/client.yaml --fixture --break-tag purchase
```

---

## Demo 4: DPDP (~5 min)

**Consent (live shop, incognito):**

1. Decline → no `matomo.php` to `matomo.35-234-210-199.nip.io`
2. Accept → `matomo.php` + GTM/GA4 fire

**DSAR:**

```powershell
py -3 -m kit.cli dsar-lookup --user-id <userId> -c config/client.yaml
py -3 -m kit.cli dsar-delete --user-id <userId> -c config/client.yaml -y
py -3 -m kit.cli dsar-lookup --user-id <userId> -c config/client.yaml
```

---

## Demo 5: Connectors (optional)

```powershell
py -3 -m kit.cli connectors-test -c config/client.yaml
```

Requires Ads/Meta IDs in `config/client.yaml` (not configured for Aurablush yet).

---

## Demo 6: Stack choice (~2 min)

Walk through `docs/stack-choice.md`.

---

## Token rotation (after exposure)

1. Matomo → **Personal → Security** → create new auth token (allow secure connections).
2. On VM: update `deploy/docker/.env` `MATOMO_API_TOKEN`, then `sudo docker-compose up -d kit-api kit-scheduler`.
3. Locally: `$env:MATOMO_API_TOKEN = "<new>"`.
4. Optional: `echo -n "<new>" | gcloud secrets versions add aurablush-matomo-api-token --data-file=- --project=tvc-int-matomo`
5. Revoke old token in Matomo UI.

Helper on VM (after token works): `deploy/docker/rotate-matomo-token.sh`
