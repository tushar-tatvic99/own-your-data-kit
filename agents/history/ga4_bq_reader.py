"""Read GA4 event rows from the standard BigQuery export (events_* tables)."""

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from google.cloud import bigquery


def _visitor_id_hex(user_pseudo_id: str) -> str:
    """Matomo _id expects 16 hex chars."""
    return hashlib.md5((user_pseudo_id or "unknown").encode()).hexdigest()[:16]


def _micros_to_cdt(micros: int) -> str:
    dt = datetime.fromtimestamp(micros / 1_000_000, tz=timezone.utc)
    return dt.strftime("%Y-%m-%d %H:%M:%S")


def normalize_ga4_row(row: dict[str, Any]) -> dict[str, Any]:
    """Map a BQ row to kit import shape."""
    micros = int(row.get("event_timestamp") or 0)
    name = row.get("event_name") or "unknown"
    page = row.get("page_location") or row.get("page_title") or "https://imported.local/"
    return {
        "event_timestamp_micros": micros,
        "cdt": _micros_to_cdt(micros) if micros else None,
        "event_name": name,
        "page_url": page,
        "page_title": row.get("page_title") or name,
        "user_pseudo_id": row.get("user_pseudo_id") or "",
        "visitor_id": _visitor_id_hex(str(row.get("user_pseudo_id") or "")),
    }


def read_from_fixture(fixture_path: Path, limit: int) -> list[dict[str, Any]]:
    data = json.loads(fixture_path.read_text(encoding="utf-8"))
    rows = data.get("rows", data if isinstance(data, list) else [])
    return [normalize_ga4_row(r) for r in rows[:limit]]


def resolve_bq_location(client: bigquery.Client, project_id: str, dataset: str) -> str | None:
    """Return dataset location (e.g. asia-south1) when the dataset exists."""
    try:
        ds = client.get_dataset(f"{project_id}.{dataset}")
        return ds.location
    except Exception:
        return None


def read_from_bigquery(
    project_id: str,
    dataset: str,
    start_date: str,
    end_date: str,
    limit: int,
    location: str | None = None,
) -> list[dict[str, Any]]:
    """
    Query GA4 export tables `project.dataset.events_*`.

    start_date / end_date: YYYY-MM-DD (converted to _TABLE_SUFFIX YYYYMMDD).
    """
    start_suffix = start_date.replace("-", "")
    end_suffix = end_date.replace("-", "")
    client = bigquery.Client(project=project_id)
    job_location = location or resolve_bq_location(client, project_id, dataset)
    query = f"""
        SELECT
          event_timestamp,
          event_name,
          user_pseudo_id,
          (SELECT ep.value.string_value FROM UNNEST(event_params) AS ep
           WHERE ep.key = 'page_location' LIMIT 1) AS page_location,
          (SELECT ep.value.string_value FROM UNNEST(event_params) AS ep
           WHERE ep.key = 'page_title' LIMIT 1) AS page_title
        FROM `{project_id}.{dataset}.events_*`
        WHERE _TABLE_SUFFIX BETWEEN @start_suffix AND @end_suffix
        ORDER BY event_timestamp
        LIMIT @row_limit
    """
    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("start_suffix", "STRING", start_suffix),
            bigquery.ScalarQueryParameter("end_suffix", "STRING", end_suffix),
            bigquery.ScalarQueryParameter("row_limit", "INT64", limit),
        ]
    )
    rows = []
    query_kwargs: dict[str, Any] = {"job_config": job_config}
    if job_location:
        query_kwargs["location"] = job_location
    for row in client.query(query, **query_kwargs).result():
        rows.append(
            normalize_ga4_row(
                {
                    "event_timestamp": row.event_timestamp,
                    "event_name": row.event_name,
                    "user_pseudo_id": row.user_pseudo_id,
                    "page_location": row.page_location,
                    "page_title": row.page_title,
                }
            )
        )
    return rows
