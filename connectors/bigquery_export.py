"""Automated BigQuery Export Pipeline for Matomo Telemetry."""

import json
import os
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


def get_last_sync_watermark(watermark_path: str = DEFAULT_WATERMARK_FILE) -> int:
    """Retrieve the highest processed unix timestamp from the watermark file."""
    path = Path(watermark_path)
    if not path.exists():
        return 0
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return int(data.get("last_processed_timestamp", 0))
    except Exception:
        return 0


def save_sync_watermark(watermark_path: str, timestamp: int, extra: dict | None = None) -> None:
    """Persist the highest processed unix timestamp to disk."""
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
    """Extract individual actions (pageviews, events, conversions) from Matomo visits."""
    try:
        visits = matomo._api(
            "Live.getLastVisitsDetails",
            filter_limit=filter_limit,
            period="day",
            date="today",
        )
    except Exception as e:
        # Fallback or empty if connection error
        print(f"Warning: Failed to fetch live visits from Matomo: {e}")
        return [], min_timestamp

    if not isinstance(visits, list):
        return [], min_timestamp

    extracted_events = []
    max_ts = min_timestamp

    for visit in visits:
        visitor_id = str(visit.get("visitorId", ""))
        session_id = str(visit.get("idVisit", ""))
        actions = visit.get("actionDetails", [])

        for action in actions:
            action_ts = int(action.get("timestamp", 0))
            if action_ts <= min_timestamp:
                continue

            if action_ts > max_ts:
                max_ts = action_ts

            action_type = action.get("type", "unknown")
            page_url = action.get("url") or visit.get("referrerUrl") or ""
            revenue = float(action.get("revenue") or action.get("eventValue") or 0.0)

            # Dimensions & metadata
            dimensions = {
                "city": visit.get("city"),
                "country": visit.get("country"),
                "device": visit.get("deviceType"),
                "os": visit.get("operatingSystem"),
                "browser": visit.get("browser"),
                "referrer_type": visit.get("referrerTypeName"),
            }

            if action_type == "action":
                event_name = "pageview"
                event_category = "pageview"
            elif action_type == "event":
                event_name = action.get("eventName") or action.get("eventAction") or "event"
                event_category = action.get("eventCategory", "general")
            elif action_type == "ecommerceOrder":
                event_name = "purchase"
                event_category = "ecommerce"
            elif action_type == "ecommerceAbandonedCart":
                event_name = "abandoned_cart"
                event_category = "ecommerce"
            else:
                event_name = action.get("title") or action_type
                event_category = action_type

            # ISO Timestamp for BigQuery TIMESTAMP field
            iso_timestamp = datetime.fromtimestamp(action_ts, timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

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

    # Sort ascending by timestamp so streaming occurs chronologically
    extracted_events.sort(key=lambda x: x["_raw_timestamp"])
    return extracted_events, max_ts


def create_export_schema(project_id: str, dataset: str, table: str) -> None:
    """Create BigQuery table with standard schema if it does not already exist."""
    client = bigquery.Client(project=project_id)
    dataset_ref = bigquery.Dataset(f"{project_id}.{dataset}")
    dataset_ref.location = "asia-south1"
    try:
        client.create_dataset(dataset_ref, exists_ok=True)
    except Exception:
        pass

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


def export_events(
    project_id: str,
    dataset: str,
    table: str,
    events: list[dict],
) -> dict:
    """Stream formatted events into BigQuery."""
    if not events:
        return {"status": "success", "rows_inserted": 0, "errors": []}

    client = bigquery.Client(project=project_id)
    table_ref = f"{project_id}.{dataset}.{table}"

    rows_to_insert = [
        {
            "event_timestamp": e["event_timestamp"],
            "event_name": e["event_name"],
            "event_category": e["event_category"],
            "page_url": e["page_url"],
            "visitor_id": e["visitor_id"],
            "session_id": e["session_id"],
            "custom_dimensions": e["custom_dimensions"],
            "revenue": e["revenue"],
        }
        for e in events
    ]

    errors = client.insert_rows_json(table_ref, rows_to_insert)
    return {
        "status": "success" if not errors else "partial",
        "rows_inserted": len(rows_to_insert) - len(errors),
        "errors": errors,
    }


def run_bigquery_sync(
    config_path: str = "config/client.yaml",
    watermark_path: str = DEFAULT_WATERMARK_FILE,
    continuous: bool = False,
    interval_seconds: int = 60,
) -> dict:
    """Orchestrate end-to-end sync from Matomo to BigQuery."""
    cfg = load_config(config_path)
    bq_cfg = cfg.get("connectors", {}).get("bigquery", {})
    stack_cfg = cfg.get("stack", {})

    project_id = bq_cfg.get("project_id", "tvc-int-matomo")
    dataset = bq_cfg.get("dataset", "matomo_export")
    events_table = bq_cfg.get("table", "events")
    conversions_table = bq_cfg.get("conversions_table", "connector_conversions")

    # Ensure tables exist
    create_export_schema(project_id, dataset, events_table)
    create_export_schema(project_id, dataset, conversions_table)

    adapter = get_stack_adapter(cfg)

    iteration = 0
    total_synced = 0

    while True:
        iteration += 1
        watermark = get_last_sync_watermark(watermark_path)
        events, new_watermark = adapter.fetch_stream_actions(since_timestamp=watermark)

        if events:
            # 1. Insert into raw events table
            res_events = export_events(project_id, dataset, events_table, events)
            
            # 2. Filter conversions and insert into conversions table
            conversion_events = [
                e for e in events
                if e["event_name"].lower() in CONVERSION_EVENT_NAMES
                or e["event_category"].lower() in ("ecommerce", "bfsi_backend_api", "lead")
                or e["revenue"] > 0
            ]
            res_conv = export_events(project_id, dataset, conversions_table, conversion_events)

            # 3. Update watermark
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
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Synced {res_events['rows_inserted']} events, {res_conv['rows_inserted']} conversions to BigQuery.")
        else:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] No new events since watermark ({watermark}). BigQuery up to date.")

        if not continuous:
            return {
                "status": "success",
                "events_synced": total_synced,
                "latest_watermark": new_watermark if events else watermark,
            }

        time.sleep(interval_seconds)
