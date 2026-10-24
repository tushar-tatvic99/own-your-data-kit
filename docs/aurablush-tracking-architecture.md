# Aurablush tracking architecture (production)

**Region:** `asia-south1` (Mumbai) only  
**GCP project:** `tvc-int-matomo`

## URLs

| Role | URL |
|------|-----|
| **Website (shop)** | https://auraandblush-61760469326.asia-south1.run.app |
| **Alt URL (same service)** | https://auraandblush-qvoqwz57fq-el.a.run.app |
| **Matomo tracker** | `{website}/matomo.php` |
| **Google GTM** | `GTM-MMXM5L53` |
| **Matomo** | **Matomo Tag Manager (MTM)** — not via GTM |

Do **not** use `us-central1` Cloud Run URLs.

## Split of responsibilities (target)

```
Page load
  → CMP / Consent (DPDP) — CookieConsent + consent-init.js on site today
  → Google GTM (GTM-MMXM5L53)     → GA4 only
  → Matomo Tag Manager (MTM)      → Matomo only (configure in Matomo UI)
```

## Current production (verified 2026-10-24)

| Piece | Status |
|-------|--------|
| GTM `GTM-MMXM5L53` | Loaded on site |
| GA4 via `dataLayer` | `matomo-tracker.js` pushes GA4 ecommerce events |
| Matomo | `matomo.js` + `matomo-tracker.js` + `requireConsent` (custom JS, **not** MTM container snippet yet) |
| `_mtm` queue | Initialized in tracker — ready when MTM install snippet is added |
| US Cloud Run | **Removed** — only `asia-south1` remains |
| Matomo `https://matomo.35-234-210-199.nip.io` | **Admin, MTM, API, DSAR** — shop `matomo-tracker.js` should send hits here (HTTPS) |

- **No Matomo tags inside Google GTM** (correct).
- **MTM container settings (when you publish MTM):** keep GTM `dataLayer`; enable **Actively synchronise from GTM data layer**.

## MTM checklist (Matomo UI)

1. Tag Manager → container → **Install** snippet on site (if not already in Cloud Run app).
2. Tags: Matomo Configuration (site ID, consent), events: `purchase`, `add_to_cart`, `sign_up`.
3. Triggers: match shop + consent granted.
4. Publish MTM version after QA.

## GTM checklist

1. GA4 Config + events unchanged.
2. Consent Mode aligned with Aurablush DPDP.
3. Optional: push ecommerce to `dataLayer` for MTM sync.

## Kit / OYDK

- `config/client.yaml` → `stack.url` and `website_url` point at asia-south1 Run URL.
- DSAR / parity / migration agents use `MATOMO_API_TOKEN` from **this** Matomo instance.
- Shop tracker config: `matomoUrl: https://matomo.35-234-210-199.nip.io/`, `siteId: 1`.

## QA

| Step | Expected |
|------|----------|
| Decline consent | No GA4; no `matomo.php` |
| Accept | GA4 + `matomo.php` on asia-south1 host |
| Purchase | GA4 event + Matomo event |
| Parity | `py -3 -m kit.cli parity` when GA creds available |
