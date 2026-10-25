# Own-Your-Data Analytics Kit — Ready Connectors Reference Manual

This document provides a permanent, end-to-end technical reference for all connectors built in Requirement 5. It details every component, live production URL, data flow, underlying mechanisms, and operational verification commands.

---

## 1. System Architecture & Live URLs

```
+-------------------------------------------------------------+
| 1. Live Website (Cloud Run)                                 |
|    https://auraandblush-61760469326.asia-south1.run.app    |
+-------------------------------------------------------------+
                              |
                              | (DPDP Consent Gated Tracking)
                              v
+-------------------------------------------------------------+
| 2. Self-Hosted Matomo Analytics (GCP Compute Engine)        |
|    https://matomo.35-234-210-199.nip.io                     |
+-------------------------------------------------------------+
                              |
                              | (API: Live.getLastVisitsDetails)
                              | (Watermarked Incremental Ingestion)
                              v
+-------------------------------------------------------------+
| 3. Automated BigQuery Pipeline                              |
|    GCP Project: tvc-int-matomo                              |
|    Dataset:     matomo_export                               |
|    Raw Events:  matomo_export.events                        |
|    Conversions: matomo_export.connector_conversions         |
+-------------------------------------------------------------+
                              |
                              | (Virtual Reporting View)
                              v
+-------------------------------------------------------------+
| 4. Cleaned Analytics View                                   |
|    tvc-int-matomo.matomo_export.v_marketing_overview        |
+-------------------------------------------------------------+
                              |
                              | (Direct 1-Click Connector Link)
                              v
+-------------------------------------------------------------+
| 5. Live Looker Studio Dashboard                             |
|    https://lookerstudio.google.com/reporting/create?...     |
+-------------------------------------------------------------+
```

### Production Endpoints Summary

| Component | Endpoint / URL | Purpose |
| :--- | :--- | :--- |
| **Demo Website** | [https://auraandblush-61760469326.asia-south1.run.app](https://auraandblush-61760469326.asia-south1.run.app) | E-commerce / BFSI test store generating user journeys & telemetry |
| **Matomo Instance** | [https://matomo.35-234-210-199.nip.io](https://matomo.35-234-210-199.nip.io) | Self-hosted analytics platform (Site ID: 1) running on Compute Engine |
| **BigQuery Dataset** | `tvc-int-matomo.matomo_export` | Cloud data warehouse storage in region `asia-south1` |
| **Raw Events Table** | `tvc-int-matomo.matomo_export.events` | Ingests every discrete action (pageviews, clicks, searches, orders) |
| **Conversions Table**| `tvc-int-matomo.matomo_export.connector_conversions` | Filtered conversions (purchases, lead forms, EMI / FD calculations) |
| **Reporting View** | `tvc-int-matomo.matomo_export.v_marketing_overview` | Normalized SQL view with clean dimensions & conversion flags |
| **Looker Studio** | [1-Click Direct Dashboard Link](https://lookerstudio.google.com/reporting/create?ds.connector=bigQuery&ds.type=TABLE&ds.projectId=tvc-int-matomo&ds.datasetId=matomo_export&ds.tableId=v_marketing_overview) | Real-time BI visualization pre-connected to the BigQuery reporting view |

---

## 2. Connector 1: Automated Continuous BigQuery Pipeline

### Problem & Objective
* **What was needed**: Marketers and enterprise data teams require warehouse exports to perform deep-dive SQL queries, join analytics with backend order databases, and retain full data ownership. Previously, only a mock helper inserting hardcoded records existed.
* **What was built**: A production-grade, state-tracked, incremental streaming pipeline in [`connectors/bigquery_export.py`](bigquery_export.py).

### How It Works Under the Hood
1. **Extraction**:
   * Uses `MatomoClient._api` via HTTPS POST to invoke `Live.getLastVisitsDetails` on Matomo.
   * Extracts granular visits and unrolls nested `actionDetails` (individual pageviews, events, e-commerce orders, cart updates).
2. **State Tracking & Watermarking**:
   * Reads the highest processed unix timestamp from [`output/bq_sync_watermark.json`](../output/bq_sync_watermark.json).
   * Only actions with `timestamp > watermark` are selected for ingestion.
   * After streaming, the watermark is updated to the newest action timestamp. This guarantees **zero duplicate records** regardless of how often the sync executes.
3. **Data Transformation & Enrichment**:
   * Geo and technical metadata (`city`, `country`, `device`, `os`, `browser`, `referrer_type`) are packaged into `custom_dimensions`.
   * Standardizes fields: `event_timestamp`, `event_name`, `event_category`, `page_url`, `visitor_id`, `session_id`, `revenue`.
4. **Dual Streaming Ingestion**:
   * **All events** stream to `tvc-int-matomo.matomo_export.events`.
   * **Conversion actions** (e.g. `purchase`, `financial_lead_submitted`, `calculate_loan_emi`, `calculate_fd_yield`, and cart events) are simultaneously routed to `tvc-int-matomo.matomo_export.connector_conversions`.
5. **Billing & Cost Control**:
   * Uses BigQuery streaming inserts (`insert_rows_json`) only for newly arrived records.
   * Ingesting hundreds of daily visits consumes < 500 KB, costing less than **$0.0001 / month** (well within GCP free tier).

### Operational Commands
```bash
# Run a one-time synchronization cycle:
.venv/bin/python3 -m kit.cli bq-sync --config config/client.yaml

# Run continuously as a background daemon (every 60 seconds):
.venv/bin/python3 -m kit.cli bq-sync --config config/client.yaml --continuous --interval 60

# Run all connector health checks:
.venv/bin/python3 -m kit.cli connectors-test --config config/client.yaml
```

---

## 3. Connector 2: Looker Studio Reporting & Dashboard

### Problem & Objective
* **What was needed**: Business stakeholders and marketing managers need interactive dashboards for daily decision-making without writing manual SQL.
* **What was built**: 
  1. A flattened, production SQL view in BigQuery: `tvc-int-matomo.matomo_export.v_marketing_overview`.
  2. A direct 1-click Looker Studio report launcher in [`connectors/looker.py`](looker.py).

### How It Works Under the Hood
1. **The Reporting View (`v_marketing_overview`)**:
   * Normalizes raw event names: converts checkout funnel JSON payloads (`{"orderId":"#AB-..."}`) into readable actions (`checkout_order_details`, `checkout_shipping_details`).
   * Extracts JSON fields from `custom_dimensions` into first-class SQL columns: `city`, `country`, `device_type`, `operating_system`, `browser`, and `traffic_channel`.
   * Automatically calculates `is_conversion = TRUE` whenever an event is a purchase, lead, or financial calculator engagement.
2. **1-Click Direct Link Launcher**:
   * Instead of requiring complex manual data source configuration, the URL parameters pass the exact project, dataset, and view:
     ```
     https://lookerstudio.google.com/reporting/create?ds.connector=bigQuery&ds.type=TABLE&ds.projectId=tvc-int-matomo&ds.datasetId=matomo_export&ds.tableId=v_marketing_overview
     ```
   * Clicking this link opens Looker Studio immediately authenticated with your GCP account and pre-linked to the BigQuery view.

### Standard Dashboard Visualizations Included
* **Executive Scorecards**: Total Unique Users (`COUNT(DISTINCT visitor_id)`), Total Sessions (`COUNT(DISTINCT session_id)`), Total Conversions, and Gross Revenue (`SUM(revenue)`).
* **Time Series Trend**: Daily Users vs. Sessions.
* **Top Events Breakdown**: Bar chart of events by volume.
* **Traffic Channels**: Acquisition breakdown (Direct, Organic, Social, Referral).
* **Geographic Map / Table**: Conversions and revenue by City and Country.

---

## 4. Connector 3: Google Ads Offline Conversion Connector (Phase 3)

### Objective
* Automatically capture completed purchases and qualified leads from Matomo and upload them to Google Ads as offline conversions via the Google Ads API (`ConversionUploadService`).
* Preserves conversion data for ad bidding algorithms after migrating off GA4.

### How It Works (Architecture)
1. **Identifier Capture**:
   * User arrives via Google Ads click with a `gclid` query parameter, or submits their email during checkout / lead generation.
   * Matomo records the `gclid` in custom dimensions or visit metadata; user email is SHA-256 hashed locally in compliance with DPDP.
2. **Conversion Extraction**:
   * Connector queries `matomo_export.connector_conversions` for un-uploaded conversion records.
3. **Google Ads API Dispatch**:
   * Transforms conversions into `ClickConversion` objects matching the configured `conversionAction`.
   * Dispatches payloads to Google Ads API using `ConversionUploadService.upload_click_conversions`.

---

## 5. Verification Runbook

To verify that the entire connector stack is healthy and communicating:

1. **Perform an action on the website**: Open [Aura & Blush Web](https://auraandblush-61760469326.asia-south1.run.app), accept cookies, view a product, add to cart, or submit an application.
2. **Execute the sync**:
   ```bash
   .venv/bin/python3 -m kit.cli bq-sync --config config/client.yaml
   ```
3. **Check BigQuery**:
   ```bash
   bq query --use_legacy_sql=false "SELECT event_name_clean, city, traffic_channel, revenue FROM \`tvc-int-matomo.matomo_export.v_marketing_overview\` ORDER BY event_timestamp DESC LIMIT 5"
   ```
4. **View in Looker Studio**: Open the [1-Click Looker Studio Link](https://lookerstudio.google.com/reporting/create?ds.connector=bigQuery&ds.type=TABLE&ds.projectId=tvc-int-matomo&ds.datasetId=matomo_export&ds.tableId=v_marketing_overview) to see the newly generated telemetry reflected on the dashboard.
