"""Optional: mirror imported GA4 rows into the kit BigQuery warehouse for Looker."""

from typing import Any


def mirror_to_warehouse(
    project_id: str,
    dataset: str,
    table: str,
    rows: list[dict[str, Any]],
) -> dict[str, Any]:
    from connectors.bigquery_export import export_events

    events = []
    for row in rows:
        events.append(
            {
                "event_name": row.get("event_name"),
                "category": "ga4_history_import",
                "url": row.get("page_url"),
                "visitor_id": row.get("visitor_id"),
                "session_id": row.get("user_pseudo_id", "")[:32],
                "custom_dimensions": {"source": "ga4_bq_export"},
            }
        )
    return export_events(project_id, dataset, table, events)
