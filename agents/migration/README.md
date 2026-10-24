# Autonomous GA4 Migration Agent — Operator Runbook

> **Core Objective:** Migrate a company's analytics schema, custom dimensions, conversion goals, and tag manager configurations off Google Analytics 4 onto an open-source analytics stack, driven autonomously by an agent with zero production risk.

---

## 1. Architecture & The 5-Step Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   GA4 & GTM HARVESTING ENGINE (STEP 1 & 2)                  │
│       Google Analytics Admin API v1beta  •  Google Tag Manager API v2       │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      SCHEMA MAPPING ENGINE (STEP 3)                         │
│   • Custom Dimensions (Event/User) ──► Target Engine Dimensions (Action/Visit)│
│   • Custom Metrics                 ──► Event Values / Numeric Properties    │
│   • Conversion Events              ──► Target Engine Goals (Exact/Regex)    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                 SAFETY FIRST: GTM DRAFT STAGING (STEP 4)                    │
│   • Creates "OYDK Migration Draft" Workspace (UNPUBLISHED)                  │
│   • Injects Base Tracker (Consent Gated) & Custom Event Tags                │
│   • Generates Importable GTM Container JSON for zero-permission clients     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                 GAP ANALYSIS & AUDIT REPORTING (STEP 5)                     │
│   • Markdown Executive Audit Report: output/migration/migration-report.md   │
│   • Technical Rationale & Workable Alternatives for Unmigratable Features   │
│   • Recorded into Immutable DPDP Audit Trail                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. The Five Rules of Requirement 3

### 1. Schema Recreation (Dimensions, Metrics & Conversions)
- Reads the property configuration via Google Analytics Admin API (`list_custom_dimensions`, `list_custom_metrics`, `list_conversion_events`, `list_data_streams`).
- Automatically provisions corresponding schema entities in the target engine via [`AnalyticsStackAdapter`](file:///home/parshwasalot/0-projects/AppTag/tvc_intern_group5/own-your-data-kit/kit/stack_adapter.py):
  - GA4 `EVENT` scope $\rightarrow$ Target `action` scope.
  - GA4 `USER` scope $\rightarrow$ Target `visit` scope.
  - Built-in ecommerce events (`purchase`, `add_to_cart`, `begin_checkout`, `sign_up`) $\rightarrow$ Engine conversion goals with monetary values.

### 2. Equivalent Tracking Code & Tag Configurations
- Generates equivalent tracking tags matching each discovered GA4 event.
- Injects consent-gated base tracking snippet (`requireConsent` + `trackPageView`).

### 3. Safety First (Unpublished Draft Only)
- **Zero Live Modifying Guarantee**: Never modifies live published GTM versions or production web snippets.
- Stages all new tags into an isolated GTM workspace named `OYDK Migration Draft` with status `UNPUBLISHED (DRAFT ONLY)`.
- Generates an offline importable container JSON at `output/migration/gtm_draft_container.json` for clients who prohibit service account write permissions on GTM.

### 4. Honest Gap Analysis & Workable Alternatives
When proprietary Google features cannot be programmatically migrated, the agent explicitly documents the technical rationale and recommends an actionable, production-ready alternative:

| GA4 Proprietary Feature | Why It Cannot Auto-Migrate | Recommended Workable Alternative |
| :--- | :--- | :--- |
| **Predictive Metrics** (Purchase / Churn Probability) | Relies on Google-internal machine learning models and Google user graphs. | Train a BigQuery ML logistic regression / XGBoost model on the exported raw events (`matomo_export.events`). |
| **Google Signals Audiences** (Cross-Device) | Relies on Google-logged-in identity graphs across third-party properties. (Also creates DPDP consent risks). | Deterministic User-ID stitching via `setUserId` and BigQuery first-party identity resolution. |
| **Exploration Funnels** | Closed-source exploration UI reporting engine without export APIs. | Matomo Funnels plugin or Looker Studio visual funnel reports querying raw BigQuery event logs. |
| **Data-Driven Attribution** (DDA) | Proprietary black-box Shapley value algorithm computed in Google's cloud. | Multi-Channel Conversion Attribution plugin supporting Linear, Position-Based (40-20-40), and Time-Decay. |
| **Enhanced Measurement** | Google gtag.js auto-injects DOM listeners for scroll depth and video. | Pre-packaged GTM scroll depth and video engagement triggers dispatching custom events. |

### 5. Executive Audit Report
- Outputs comprehensive Markdown gap analysis: `output/migration/migration-report.md`.
- Outputs structured machine-readable JSON: `output/migration/migration-report.json`.
- Commits audit action `actor="migration-agent"`, `action="migrate"` to the DPDP audit trail.

---

## 3. Operator Execution Command

To run the migration agent for any client:
```bash
.venv/bin/python3 -m kit.cli migrate
```
Or specify a custom configuration file:
```bash
.venv/bin/python3 -m kit.cli migrate --config config/client.yaml
```
