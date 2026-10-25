"""Demo-safe connector path when Ads/Meta test creds are not configured."""

from datetime import datetime, timezone

from dpdp.audit_log import log_action
from dpdp.pii_scrubber import scrub_string
from dpdp.settings import dpdp_config


def is_placeholder(value: str | None) -> bool:
    if not value:
        return True
    return value.strip().upper() in {"REPLACE_ME", "CHANGE_ME", ""}


def record_demo_conversion(
    cfg: dict,
    channel: str,
    event_name: str,
    value: float = 0.0,
    email: str | None = None,
) -> dict:
    """
    Write a conversion event to BigQuery + audit log (demo / hackathon mode).

    Proves the connector pipeline without live Ads/Meta credentials.
    """
    bq = cfg.get("connectors", {}).get("bigquery", {})
    project_id = bq.get("project_id", "tvc-int-matomo")
    dataset = bq.get("dataset", "matomo_export")
    table = bq.get("table", "events")
    connector_table = bq.get("connector_table", "connector_conversions")

    bq_result = {"status": "skipped", "reason": "bigquery client not available"}
    try:
        from connectors.bigquery_export import create_export_schema, export_events

        create_export_schema(project_id, dataset, connector_table)
    except Exception as exc:
        log_action(
            actor="connectors-demo",
            action="conversion",
            resource=f"{channel}:{event_name}",
            details={"value": value, "bigquery_error": str(exc)},
        )
        return {
            "status": "success",
            "mode": "demo",
            "channel": channel,
            "event": event_name,
            "bigquery": bq_result,
            "message": f"Demo conversion logged (audit only): {channel}/{event_name}",
        }

    dpdp = dpdp_config()
    scrub = bool(dpdp.get("pii_scrub_enabled", True))
    visitor_id = email or "demo-visitor"
    if scrub and email:
        visitor_id = scrub_string(email)
    row = {
        "event_name": event_name,
        "category": channel,
        "url": "connector://demo",
        "visitor_id": visitor_id,
        "session_id": f"demo-{datetime.now(timezone.utc).strftime('%Y%m%d')}",
        "revenue": value,
        "custom_dimensions": {"channel": channel, "demo_mode": True},
    }
    bq_result = export_events(project_id, dataset, connector_table, [row])

    log_action(
        actor="connectors-demo",
        action="conversion",
        resource=f"{channel}:{event_name}",
        details={"value": value, "bigquery": bq_result},
    )
    return {
        "status": "success",
        "mode": "demo",
        "channel": channel,
        "event": event_name,
        "bigquery": bq_result,
        "message": f"Demo conversion recorded to {project_id}.{dataset}.{connector_table}",
    }
