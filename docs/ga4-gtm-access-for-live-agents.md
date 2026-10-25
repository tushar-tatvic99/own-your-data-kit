# Fix GA4 `403 The caller does not have permission` (live migration & parity)

Live **migration** and **parity** call Google APIs using a **service account JSON** on your laptop (or VM). A `403` almost always means: wrong file, wrong property ID, or the service account was never granted access in **GA4** / **GTM**.

---

## 1. Files and config (OYDK side)

| Item | Where |
|------|--------|
| Service account key | `credentials/ga-service-account.json` (path in `config/client.yaml` → `ga4.credentials_file` and `gtm.credentials_file`) |
| GA4 property ID | `config/client.yaml` → `ga4.property_id` (numeric, e.g. `123456789`) |
| GTM account + container | `gtm.account_id`, `gtm.container_id` (migration only) |

Copy the **service account email** from the JSON (`client_email`), e.g. `oydk-reader@my-project.iam.gserviceaccount.com`.

---

## 2. Google Cloud project (where the key was created)

In the **same GCP project** that owns the service account (or ensure APIs are enabled there):

1. [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services** → **Enable APIs**:
   - **Google Analytics Admin API**
   - **Google Analytics Data API**
   - **Tag Manager API** (for live GTM migration draft)
   - **BigQuery API** (only if you use GA4 → BQ history import)

2. No need to put the JSON in Secret Manager for local console use — the file on disk is enough.

---

## 3. GA4 property access (required for migration + parity)

The service account must be a **user on the GA4 property**, not only on GCP.

1. Open [Google Analytics](https://analytics.google.com) → **Admin** (gear).
2. Select the correct **Account** and **Property** (must match `ga4.property_id` in YAML).
3. **Property access management** → **+** → **Add users**.
4. Email: paste **`client_email`** from the JSON.
5. Role: at least **Viewer** (read-only is enough; OYDK uses scope `analytics.readonly`).

Wait a few minutes, then retry:

```powershell
py -3 -m kit.cli migrate -c config/client.yaml
py -3 -m kit.cli parity -c config/client.yaml
```

**Common mistakes**

- Property ID in YAML is the **measurement ID** (`G-XXXX`) instead of the **numeric property ID** (Admin → Property settings).
- SA added at **Account** level but property is in another account.
- SA key from project A while GA4 property lives under a client Google account that never added that email.

---

## 4. GTM access (required for live migration step 4)

Migration reads tags/triggers/variables and may create a **draft workspace** (never auto-published).

1. [tagmanager.google.com](https://tagmanager.google.com) → correct **Account** and **Container** (IDs in `config/client.yaml`).
2. **Admin** → **User management** → **Add**.
3. Add the same **`client_email`**.
4. Recommended permissions:
   - **Read** (minimum to read container), or
   - **Edit** + **Approve** if you want the agent to create migration workspaces via API (see `agents/migration/gtm_draft_writer.py`).

Scopes used by the kit: `tagmanager.readonly`, `tagmanager.edit.containers`, `tagmanager.manage.accounts`.

---

## 5. GA4 BigQuery export (history import only)

Separate from migration/parity APIs:

1. GA4 → **Admin** → **BigQuery Links** — export enabled to a dataset (e.g. `analytics_123456789`).
2. In GCP, grant the service account **BigQuery Data Viewer** on that dataset (or project).
3. Set in `config/client.yaml`:

```yaml
history:
  ga4_bigquery:
    project_id: "your-gcp-project"
    dataset: "analytics_123456789"
```

---

## 6. Quick verification

```powershell
# Matomo only (no GA)
py -3 -m kit.cli verify-matomo -c config/client.yaml

# Full live migration (fails at step 1 if GA4 403)
py -3 -m kit.cli migrate -c config/client.yaml

# Live parity for yesterday
py -3 -m kit.cli parity -c config/client.yaml --date 2026-10-24
```

Or in the demo console: **Demo mode** → **Run all default connection tests** (uses live when creds + permissions are OK).

---

## Checklist (share with client)

- [ ] Service account JSON in `credentials/`  
- [ ] `ga4.property_id` = numeric GA4 property ID  
- [ ] `gtm.account_id` + `gtm.container_id` correct  
- [ ] GA4 **Property access**: SA email = **Viewer** (or higher)  
- [ ] GTM **User management**: SA email = **Read** (or Edit for drafts)  
- [ ] Analytics Admin + Data (+ Tag Manager) APIs **enabled** on GCP  
- [ ] (Optional) BigQuery link + **BQ Data Viewer** for history import  
