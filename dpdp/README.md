# DPDP-Ready Defaults Architecture & Verification Playbook

> **Legal Standard:** "Call it **DPDP-ready**, never **DPDP compliant** — compliance depends on the client's internal operational processes, not solely on a tool."  
> *India's Digital Personal Data Protection (DPDP) Act core obligations take effect on 12 May 2027.*

---

## 1. Overview of the Five Mandatory Defaults

The Own-Your-Data Analytics Kit (OYDK) ships with five hardened privacy defaults activated out of the box:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         INDIA DPDP PRIVACY SHIELD                           │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        ▼                              ▼                              ▼
┌───────────────┐              ┌───────────────┐              ┌───────────────┐
│ 1. Consent    │              │ 2. PII        │              │ 3. Retention  │
│ Gating (CMP)  │              │ Scrubbing     │              │ Limits        │
│ Denied by def.│              │ Email & Phone │              │ 365d default  │
└───────┬───────┘              └───────┬───────┘              └───────┬───────┘
        │                              │                              │
        └──────────────────────────────┼──────────────────────────────┘
                                       │
                        ┌──────────────┴──────────────┐
                        ▼                             ▼
                ┌───────────────┐             ┌───────────────┐
                │ 4. DSAR Flow  │             │ 5. Immutable  │
                │ Lookup & Purge│             │ Audit Trail   │
                │ Sec 12 Rights │             │ SQLite Ledger │
                └───────────────┘             └───────────────┘
```

---

## 2. Detailed Technical Implementation

### Obligation 1: Consent Gating Prior to Tracking
* **Principle**: No analytics or marketing identifiers may be read, written, or transmitted until the data principal explicitly grants affirmative consent.
* **Implementation**:
  - `Matomo ecomm Web/consent-init.js`: CookieConsent v3 initializes with `analytics: false` and `marketing: false`.
  - `Matomo ecomm Web/matomo-tracker.js`: Pushes `_paq.push(['requireConsent'])` synchronously before tracking calls.
  - `Matomo ecomm Web/index.html`: Google Consent Mode v2 default states set to `denied` (`analytics_storage`, `ad_storage`, `ad_user_data`, `ad_personalization`).
  - Rejection / revocation immediately triggers `_paq.push(['forgetConsentGiven'])` and auto-clears tracking cookies (`_ga*`, `_pk*`).

### Obligation 2: Automated PII Stripping
* **Principle**: Personal identifiers (emails, phone numbers, contact names) must never enter analytics databases or URLs.
* **Implementation**:
  - Module: [`dpdp/pii_scrubber.py`](file:///home/parshwasalot/0-projects/AppTag/tvc_intern_group5/own-your-data-kit/dpdp/pii_scrubber.py)
  - **Indian Phone Numbers**: Matches 10-digit Indian numbers across standard prefixes (`+91`, `0`) and formatting styles (`+91 98765 43210`, `+91-98765-43210`, `98765 43210`).
  - **Email Addresses**: RFC 5322 regex strips emails into `[REDACTED_EMAIL]`.
  - **Query Parameters**: Auto-strips sensitive keys (`email`, `phone`, `mobile`, `name`, `pan`, `aadhaar`, etc.) into `[REDACTED]`.
  - **Recursive Traversal**: Deep cleans nested payload dictionaries and item arrays.
  - **Client-Side Filter**: `_paq.push(['setExcludedQueryParams', ...])` drops PII parameters at browser ingestion.

### Obligation 3: Configurable Data Retention Limits
* **Principle**: Raw personal interaction logs must not be retained indefinitely.
* **Implementation**:
  - Configured in `config/client.yaml` under `dpdp.data_retention_days` (default: 365 days).
  - CLI Management:
    ```bash
    # View current retention policy
    .venv/bin/python3 -m kit.cli retention

    # Update retention limit (e.g. 180 days for BFSI clients)
    .venv/bin/python3 -m kit.cli retention --days 180
    ```
  - Directly applies retention policy in target engine (e.g. `Deletelogs.delete_logs_older_than` in Matomo or ClickHouse TTL policies in PostHog).
  - Every policy update is recorded in the DPDP audit trail.

### Obligation 4: Working DSAR Rights Flow (Section 12)
* **Principle**: Individuals have statutory rights to access (lookup) and erase (delete) personal data held about them.
* **Implementation**:
  - Module: [`dpdp/dsar.py`](file:///home/parshwasalot/0-projects/AppTag/tvc_intern_group5/own-your-data-kit/dpdp/dsar.py)
  - **Lookup**: Queries raw visitor sessions and actions by visitor ID or user identifier:
    ```bash
    .venv/bin/python3 -m kit.cli dsar-lookup --user-id 63702f357b983584
    ```
  - **Erasure**: Permanently deletes all raw visitor log records and action rows via target engine's privacy manager:
    ```bash
    .venv/bin/python3 -m kit.cli dsar-delete --user-id 63702f357b983584
    ```
  - Web UI: In the test e-commerce banking store (`Matomo ecomm Web/`), users can click **DPDP Rights Center** in the footer to submit self-service erasure requests.

### Obligation 5: Immutable Audit Logging
* **Principle**: Regulators and auditors require verifiable records of who accessed or modified data.
* **Implementation**:
  - Module: [`dpdp/audit_log.py`](file:///home/parshwasalot/0-projects/AppTag/tvc_intern_group5/own-your-data-kit/dpdp/audit_log.py)
  - Persistent SQLite ledger (`output/audit.db`) storing:
    - UTC Timestamp
    - Actor (`dsar-system`, `admin-retention`, `operator-restore`, `backup-daemon`, `connector-bq`)
    - Action (`lookup`, `delete`, `retention_update`, `backup`, `restore`, `sync`)
    - Resource Target
    - Structured Details JSON
  - CLI Inspection:
    ```bash
    .venv/bin/python3 -m kit.cli audit-log --limit 20
    ```

---

## 3. Fast Verification Commands for Judges

Run this test suite in order to demonstrate complete DPDP readiness:

```bash
# 1. Test real-time PII stripping on URLs and text
.venv/bin/python3 -m kit.cli scrub

# 2. View data retention status
.venv/bin/python3 -m kit.cli retention

# 3. Update data retention policy
.venv/bin/python3 -m kit.cli retention --days 180

# 4. Perform DSAR lookup
.venv/bin/python3 -m kit.cli dsar-lookup --user-id "sample_visitor_id"

# 5. Inspect the immutable audit log
.venv/bin/python3 -m kit.cli audit-log --limit 10
```
