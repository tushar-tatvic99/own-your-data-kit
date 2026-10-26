# Stretch goal: GA4 history from BigQuery

Clients with **GA4 → BigQuery export** should not start Matomo at zero. This agent reads the standard **`events_*`** tables and **replays** hits into Matomo using the Tracking API with **`cdt`** (custom date/time) so reports show historical dates.

## Command

```powershell
# Demo (no BigQuery)
py -3 -m kit.cli import-ga4-history -c config/client.yaml --fixture --dry-run

# Replay fixture into Matomo (small sample)
py -3 -m kit.cli import-ga4-history -c config/client.yaml --fixture

# Live GA4 export (needs BQ access + export dataset)
py -3 -m kit.cli import-ga4-history -c config/client.yaml --start 2026-10-01 --end 2026-10-07 --limit 5000

# Also mirror rows into kit warehouse table for Looker
py -3 -m kit.cli import-ga4-history -c config/client.yaml --fixture --mirror-bq
```

Report: `output/history/import-<start>-to-<end>.json`

## Config (`config/client.yaml`)

```yaml
history:
  import_limit: 5000
  throttle_ms: 0
  mirror_to_warehouse: false
  warehouse_table: ga4_history_import
  ga4_bigquery:
    project_id: tvc-int-matomo
    dataset: analytics_560630351   # GA4 export dataset (not matomo_export)
  fixture_file: agents/history/fixtures/sample_ga4_bq_rows.json
```

GA4 export dataset name is usually `analytics_<PROPERTY_ID>` (Admin → BigQuery links).

**Not the same as `matomo_export`** — that table is Matomo → BQ (connectors). History import needs the **GA4 native export** dataset in the project you linked in GA4 Admin.

Set `history.ga4_bigquery.location` to match the export region (e.g. `asia-south1`). If the dataset is missing, BigQuery may report “not found in location US” because the default query region is US.

## How it works

1. **Read** — SQL over `` `project.dataset.events_*` `` for date range (or fixture JSON).
2. **Transform** — Map `event_name`, `page_location`, `user_pseudo_id` → Matomo tracker params.
3. **Replay** — `GET {matomo}/matomo.php` with `cdt=YYYY-MM-DD HH:MM:SS` for backdating.
4. **Optional mirror** — Insert same rows into `connectors.bigquery` warehouse via `bigquery_export.py` for dashboards.

## Limits (honest)

- Matomo **raw hit import** is not 1:1 with GA4 sessions (different session model). Use for **marketing continuity**, not forensic GA4 parity.
- Large imports need **throttling** and Matomo capacity planning (`docs/scaling.md`).
- Tracking must be allowed from the machine running the import (server IP / `--force-ip` not implemented).

## Audit

Logged as `history-import` / `ga4_bq` in the kit audit log.
