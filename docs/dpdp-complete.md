# DPDP module — complete checklist (Aurablush)

Run: `py -3 -m kit.cli verify-dpdp -c config/client.yaml`

## Requirements vs implementation

| DPDP capability | Status | Where |
|-----------------|--------|--------|
| Consent before tracking | **Live** | Shop + `demo/site` Klaro + `requireConsent`; `dpdp/consent_snippet.js` |
| PII scrub (URLs, connector payloads) | **Live** | `dpdp/pii_scrubber.py`; connector demo rows; DSAR URL fields |
| Data retention | **Live** | `config/client.yaml` → `data_retention_days`; `kit.cli retention-run` → Matomo `PrivacyManager.setDeleteLogsSettings` |
| Right to access (DSAR lookup/export) | **Live** | `dsar-lookup`, `dsar-export`; kit-api `POST /dsar/*` |
| Right to erasure | **Live** | `dsar-delete` → Matomo `PrivacyManager.deleteDataSubjects` |
| Audit trail | **Live** | `output/audit.db`; `GET http://35.234.210.199:8090/audit` |
| CMP → ads gate (documented) | **Live** | `connectors/cmp_signals.py` |

## Website erasure form (Infinity Bank shop)

1. User submits **Petition for Data Erasure** at `/#dpdp-erasure`.
2. Shop `POST /api/dpdp/erasure` → kit-api `POST /dsar/process-erasure` → Matomo `PrivacyManager.deleteDataSubjects`.
3. Matomo **User ID** = `dpdp-<sha256(email)[:24]>` (set on submit via `dpdp-subject.js`).

Redeploy: `demo/infinity-shop/README-DPDP-WIRING.md`  
**Judge demo (before/after + email):** `docs/dpdp-erasure-demo.md`  
**Enable inbox email:** `scripts/setup-dpdp-email.ps1` · **Redeploy shop:** `scripts/deploy-infinity-shop.ps1`

## Demo script (2 min)

1. **Consent:** Incognito shop → decline (no Matomo) → accept (Matomo fires).
2. **DSAR:** Open shop **OYDK align** page once (sets User ID `oydk-align-001`), then:
   ```powershell
   py -3 -m kit.cli dsar-lookup --user-id oydk-align-001 -c config/client.yaml
   py -3 -m kit.cli dsar-export --user-id oydk-align-001 -c config/client.yaml
   ```
3. **Audit:** Browser `http://35.234.210.199:8090/audit` — lookup/export entries.
4. **Retention:** `py -3 -m kit.cli retention-run -c config/client.yaml`

## Config flags (`config/client.yaml` → `dpdp`)

- `require_consent`, `cmp_provider`
- `data_retention_days` (default 365)
- `pii_scrub_enabled`, `audit_log_enabled`
- `demo_user_id` — Matomo User ID for DSAR demo

## Not in scope (honest limits)

- **Kit API DSAR** has no API-key auth (demo VM only; put behind IAP/VPN for production).
- **Consent** is enforced on the **site tracker**, not inside Matomo server code.
- **Scheduled retention** on VM calls `POST /internal/retention` (audit + Matomo API); redeploy kit-api image after code changes.
