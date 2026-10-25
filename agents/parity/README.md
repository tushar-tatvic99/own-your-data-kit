# Continuous Parity Check & Tag-Break Simulator — Operator Runbook

> **Core Objective:** "Parity is not a one-time report. Run GA4 and the new stack side by side and check parity on a schedule: daily during migration, weekly after. When the target is missed, the agent alerts the owner, diagnoses the likely cause and proposes a fix. Once the client switches GA4 off, parity is checked against the client's own records, such as orders in their backend or CRM."

---

## 1. Architecture: The Two Operational Modes

```
                                 ┌─────────────────────────────────────────┐
                                 │       Continuous Parity Engine          │
                                 │      agents/parity/run.py (±5% Target)   │
                                 └────────────────────┬────────────────────┘
                                                      │
                       ┌──────────────────────────────┴──────────────────────────────┐
                       │                                                             │
                       ▼                                                             ▼
     ┌───────────────────────────────────┐                         ┌───────────────────────────────────┐
     │          MODE A: MIGRATION        │                         │        MODE B: STEADY-STATE       │
     │      GA4 vs New Stack Dual-Run    │                         │  New Stack vs Backend / CRM Truth │
     │       (Scheduled Daily: 06:00)    │                         │      (Scheduled Weekly: Sunday)   │
     └─────────────────┬─────────────────┘                         └─────────────────┬─────────────────┘
                       │                                                             │
        ┌──────────────┴──────────────┐                               ┌──────────────┴──────────────┐
        ▼                             ▼                               ▼                             ▼
┌──────────────┐              ┌──────────────┐                ┌──────────────┐              ┌──────────────┐
│ GA4 Data API │              │ Stack Engine │                │ Backend ERP  │              │ Stack Engine │
│ 4 Core Metr. │              │ Users/Sess.  │                │ Orders/CRM   │              │ Recorded Ev. │
└──────────────┘              └──────────────┘                └──────────────┘              └──────────────┘
                       │                                                             │
                       └──────────────────────────────┬──────────────────────────────┘
                                                      │
                                                      ▼
                                       ┌─────────────────────────────┐
                                       │   Root-Cause Diagnostics    │
                                       │   Likely Cause & Direct Fix │
                                       └─────────────────────────────┘
```

---

## 2. Mode A: Migration Dual-Run Parity (GA4 vs New Stack)

Runs side by side daily during migration (`0 6 * * *`):
1. **Users**: Compares GA4 `totalUsers` vs Target Engine unique visitors.
2. **Sessions**: Compares GA4 `sessions` vs Target Engine visits.
3. **Key Events**: Compares event counts for configured key events (`purchase`, `add_to_cart`, `financial_lead_submitted`, etc.).
4. **Traffic Sources**: Compares session totals by attribution channel.
* **Target Gap**: $\le 5\%$.
* **Run Command**:
  ```bash
  .venv/bin/python3 -m kit.cli parity
  ```

---

## 3. Mode B: Steady-State Parity (GA4 Decommissioned $\rightarrow$ Backend/CRM Truth)

Once the client switches GA4 off, parity checks shift to checking against the client's **ground-truth business records**:
1. **Backend Orders**: Compares analytics `purchase` events against completed transactions in the backend database or BigQuery conversions table.
2. **Settled Revenue**: Compares tracked ecommerce revenue against accounting gross order value.
3. **CRM Lead Ingest**: Compares `financial_lead_submitted` events against verified CRM database rows.
* **Target Gap**: $\le 5\%$.
* **Run Command**:
  ```bash
  .venv/bin/python3 -m kit.cli parity --crm
  ```

---

## 4. Automated Root-Cause Diagnostic Engine

When any metric misses the $\pm 5\%$ threshold, the rules engine analyzes the pattern of divergence, establishes confidence level, and provides an actionable remediation plan:

| Divergence Pattern | Diagnosed Root Cause | Proposed Remediation Plan |
| :--- | :--- | :--- |
| **Key Event Miss (>20% gap)** | Key event tag is missing, muted, or failing trigger condition in GTM. | 1. Open GTM preview mode and trigger event. 2. Verify if tag `OYDK - Matomo Event: <name>` fired. 3. Inspect dataLayer push payload. |
| **Users Miss (>10% gap)** | Consent banner change blocking tracking for a segment of visitors. | Verify CMP configuration: inspect analytics consent opt-in rate vs total page views. |
| **Sessions Miss (>10% gap)** | Session timeout or cookie definition mismatch between stacks. | Align session timeout settings in Matomo (Settings > Websites > Session settings) with GA4 30-min window. |
| **Traffic Sources Miss (>15% gap)** | Referrer attribution / UTM parameter stripping discrepancy. | Check Matomo referrer exclusion list and verify GTM passes UTM parameters into custom dimensions. |
| **Bot Discrepancy (>5% gap)** | Bot filtering rules differ between engines. | Enable Matomo bot filtering (Settings > Websites > Exclude visits by bots). |
| **Backend Orders Divergence (>5% gap)** | Browser ad blockers or script-blockers blocking client-side tags on checkout. | Deploy server-side conversion dispatch webhook directly from the backend order checkout worker. |
| **CRM Leads Divergence (>5% gap)** | Form validation drop-off firing tags prior to API validation. | Fire lead custom event only on HTTP 200 response from backend lead submission API. |

---

## 5. Tag-Break Simulator

To demonstrate autonomous diagnostics and alerting during judge evaluation or client drills without breaking live production containers:

```bash
# Simulate broken purchase event tag
.venv/bin/python3 -m kit.cli simulate-tag-break --event purchase

# Or test broken lead submission in CRM mode
.venv/bin/python3 -m kit.cli parity --crm --simulate-break financial_lead_submitted
```

---

## 6. Background Daemon & Scheduling

The parity engine and BigQuery streaming daemon run continuously in the background via [`agents/parity/scheduler.py`](file:///home/parshwasalot/0-projects/AppTag/tvc_intern_group5/own-your-data-kit/agents/parity/scheduler.py):
* **BigQuery Sync**: Every 15 minutes (`*/15 * * * *`).
* **Migration Parity Check**: Daily at 06:00 IST (`0 6 * * *`).
* **Steady-State Parity Check**: Weekly on Sunday at 06:00 IST (`0 6 * * 1`).
* **Alert Notifications**: Dispatches alerts with proposed fixes via Slack Webhook and Email when targets are exceeded.
