"""BigQuery export — batch insert, Matomo live sync, and kit warehouse tables."""

import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from google.cloud import bigquery

from dpdp.audit_log import log_action
from kit.adapters import get_stack_adapter
from kit.config import load_config

DEFAULT_WATERMARK_FILE = "output/bq_sync_watermark.json"

CONVERSION_EVENT_NAMES = {
    "purchase",
    "financial_lead_submitted",
    "add_to_cart",
    "begin_checkout",
    "calculate_loan_emi",
    "calculate_fd_yield",
}


def _ensure_dataset(client: bigquery.Client, project_id: str, dataset: str) -> None:
    dataset_ref = bigquery.Dataset(f"{project_id}.{dataset}")
    dataset_ref.location = "asia-south1"
    try:
        client.create_dataset(dataset_ref, exists_ok=True)
    except Exception:
        pass


def get_last_sync_watermark(watermark_path: str = DEFAULT_WATERMARK_FILE) -> int:
    path = Path(watermark_path)
    if not path.exists():
        return 0
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return int(data.get("last_processed_timestamp", 0))
    except Exception:
        return 0


def save_sync_watermark(watermark_path: str, timestamp: int, extra: dict | None = None) -> None:
    path = Path(watermark_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "last_processed_timestamp": timestamp,
        "last_sync_iso": datetime.now(timezone.utc).isoformat(),
        **(extra or {}),
    }
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def fetch_matomo_actions(
    matomo: Any = None,
    min_timestamp: int = 0,
    filter_limit: int = 100,
) -> tuple[list[dict], int]:
    try:
        visits = matomo._api(
            "Live.getLastVisitsDetails",
            filter_limit=filter_limit,
            period="day",
            date="today",
        )
    except Exception as e:
        print(f"Warning: Failed to fetch live visits from Matomo: {e}")
        return [], min_timestamp

    if not isinstance(visits, list):
        return [], min_timestamp

    extracted_events: list[dict] = []
    max_ts = min_timestamp

    for visit in visits:
        visitor_id = str(visit.get("visitorId", ""))
        session_id = str(visit.get("idVisit", ""))
        actions = visit.get("actionDetails", [])

        for action in actions:
            action_ts = int(action.get("timestamp", 0))
            if action_ts <= min_timestamp:
                continue
            max_ts = max(max_ts, action_ts)

            action_type = action.get("type", "unknown")
            page_url = action.get("url") or visit.get("referrerUrl") or ""
            revenue = float(action.get("revenue") or action.get("eventValue") or 0.0)
            dimensions = {
                "city": visit.get("city"),
                "country": visit.get("country"),
                "device": visit.get("deviceType"),
                "os": visit.get("operatingSystem"),
                "browser": visit.get("browser"),
                "referrer_type": visit.get("referrerTypeName"),
            }

            if action_type == "action":
                event_name, event_category = "pageview", "pageview"
            elif action_type == "event":
                event_name = action.get("eventName") or action.get("eventAction") or "event"
                event_category = action.get("eventCategory", "general")
            elif action_type == "ecommerceOrder":
                event_name, event_category = "purchase", "ecommerce"
            elif action_type == "ecommerceAbandonedCart":
                event_name, event_category = "abandoned_cart", "ecommerce"
            else:
                event_name = action.get("title") or action_type
                event_category = action_type

            iso_timestamp = datetime.fromtimestamp(action_ts, timezone.utc).strftime(
                "%Y-%m-%d %H:%M:%S"
            )
            extracted_events.append({
                "event_timestamp": iso_timestamp,
                "event_name": str(event_name),
                "event_category": str(event_category),
                "page_url": str(page_url),
                "visitor_id": visitor_id,
                "session_id": session_id,
                "custom_dimensions": json.dumps(dimensions),
                "revenue": revenue,
                "_raw_timestamp": action_ts,
            })

    extracted_events.sort(key=lambda x: x["_raw_timestamp"])
    return extracted_events, max_ts


def create_export_schema(project_id: str, dataset: str, table: str) -> None:
    client = bigquery.Client(project=project_id)
    _ensure_dataset(client, project_id, dataset)
    schema = [
        bigquery.SchemaField("event_timestamp", "TIMESTAMP"),
        bigquery.SchemaField("event_name", "STRING"),
        bigquery.SchemaField("event_category", "STRING"),
        bigquery.SchemaField("page_url", "STRING"),
        bigquery.SchemaField("visitor_id", "STRING"),
        bigquery.SchemaField("session_id", "STRING"),
        bigquery.SchemaField("custom_dimensions", "STRING"),
        bigquery.SchemaField("revenue", "FLOAT"),
    ]
    table_ref = bigquery.Table(f"{project_id}.{dataset}.{table}", schema=schema)
    client.create_table(table_ref, exists_ok=True)


def _normalize_event_row(event: dict[str, Any]) -> dict[str, Any]:
    """Accept kit demo rows (category/url) or sync rows (event_category/page_url)."""
    ts = event.get("event_timestamp")
    if not ts:
        ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    cat = event.get("event_category") or event.get("category") or ""
    url = event.get("page_url") or event.get("url") or ""
    dims = event.get("custom_dimensions", {})
    if not isinstance(dims, str):
        dims = json.dumps(dims)
    return {
        "event_timestamp": ts,
        "event_name": event.get("event_name", ""),
        "event_category": cat,
        "page_url": url,
        "visitor_id": event.get("visitor_id", ""),
        "session_id": event.get("session_id", ""),
        "custom_dimensions": dims,
        "revenue": float(event.get("revenue", 0.0) or 0.0),
    }


def export_events(
    project_id: str,
    dataset: str,
    table: str,
    events: list[dict],
    credentials_path: str | None = None,
) -> dict:
    """Insert events into BigQuery (demo pipeline, history mirror, or sync)."""
    if not events:
        return {"status": "success", "rows_inserted": 0, "errors": []}

    client = bigquery.Client(project=project_id)
    table_ref = f"{project_id}.{dataset}.{table}"
    create_export_schema(project_id, dataset, table)

    rows = [_normalize_event_row(e) for e in events]
    errors = client.insert_rows_json(table_ref, rows)
    return {
        "status": "success" if not errors else "partial",
        "rows_inserted": len(rows) - len(errors),
        "errors": errors,
    }


def run_bigquery_sync(
    config_path: str = "config/client.yaml",
    watermark_path: str = DEFAULT_WATERMARK_FILE,
    continuous: bool = False,
    interval_seconds: int = 60,
) -> dict:
    cfg = load_config(config_path)
    bq_cfg = cfg.get("connectors", {}).get("bigquery", {})
    stack_cfg = cfg.get("stack", {})

    project_id = bq_cfg.get("project_id", "tvc-int-matomo")
    dataset = bq_cfg.get("dataset", "matomo_export")
    events_table = bq_cfg.get("table", "events")
    conversions_table = bq_cfg.get("conversions_table", "connector_conversions")

    create_export_schema(project_id, dataset, events_table)
    create_export_schema(project_id, dataset, conversions_table)

    adapter = get_stack_adapter(cfg)

    iteration = 0
    total_synced = 0
    new_watermark = get_last_sync_watermark(watermark_path)

    while True:
        iteration += 1
        watermark = get_last_sync_watermark(watermark_path)
        events, new_watermark = adapter.fetch_stream_actions(since_timestamp=watermark)

        if events:
            res_events = export_events(project_id, dataset, events_table, events)
            conversion_events = [
                e
                for e in events
                if e["event_name"].lower() in CONVERSION_EVENT_NAMES
                or e["event_category"].lower() in ("ecommerce", "bfsi_backend_api", "lead")
                or e["revenue"] > 0
            ]
            res_conv = export_events(project_id, dataset, conversions_table, conversion_events)
            save_sync_watermark(
                watermark_path,
                new_watermark,
                extra={
                    "total_events_synced": res_events["rows_inserted"],
                    "total_conversions_synced": res_conv["rows_inserted"],
                },
            )
            total_synced += res_events["rows_inserted"]
            log_action(
                actor="connector-bq",
                action="sync",
                resource=f"bigquery:{dataset}.{events_table}",
                details={
                    "events_synced": res_events["rows_inserted"],
                    "conversions_synced": res_conv["rows_inserted"],
                    "new_watermark": new_watermark,
                },
            )
            print(
                f"[{datetime.now().strftime('%H:%M:%S')}] Synced "
                f"{res_events['rows_inserted']} events, {res_conv['rows_inserted']} conversions."
            )
        else:
            print(
                f"[{datetime.now().strftime('%H:%M:%S')}] No new events since watermark ({watermark})."
            )

        if not continuous:
            return {
                "status": "success",
                "events_synced": total_synced,
                "latest_watermark": new_watermark if events else watermark,
            }

        time.sleep(interval_seconds)
