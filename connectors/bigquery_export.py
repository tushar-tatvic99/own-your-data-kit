"""Export Matomo data to BigQuery warehouse."""

from datetime import datetime, timezone

from google.cloud import bigquery


def export_events(
    project_id: str,
    dataset: str,
    table: str,
    events: list[dict],
    credentials_path: str | None = None,
) -> dict:
    """Insert Matomo events into a BigQuery table."""
    client = bigquery.Client(project=project_id)

    table_ref = f"{project_id}.{dataset}.{table}"

    # Ensure dataset exists
    dataset_ref = bigquery.Dataset(f"{project_id}.{dataset}")
    dataset_ref.location = "asia-south1"
    try:
        client.create_dataset(dataset_ref, exists_ok=True)
    except Exception:
        pass

    rows = []
    for event in events:
        rows.append({
            "event_timestamp": datetime.now(timezone.utc).isoformat(),
            "event_name": event.get("event_name", ""),
            "event_category": event.get("category", ""),
            "page_url": event.get("url", ""),
            "visitor_id": event.get("visitor_id", ""),
            "session_id": event.get("session_id", ""),
            "custom_dimensions": str(event.get("custom_dimensions", {})),
            "revenue": event.get("revenue", 0.0),
        })

    errors = client.insert_rows_json(table_ref, rows)
    return {
        "status": "success" if not errors else "partial",
        "rows_inserted": len(rows) - len(errors),
        "errors": errors,
    }


def create_export_schema(project_id: str, dataset: str, table: str) -> None:
    """Create the BigQuery table with standard schema if it doesn't exist."""
    client = bigquery.Client(project=project_id)
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
