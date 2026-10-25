"""Data Subject Access Request — find, export, and delete a person's analytics data across any stack."""

from datetime import datetime, timezone

from dpdp.audit_log import log_action
from dpdp.pii_scrubber import scrub_url
from dpdp.settings import dpdp_config
from kit.adapters import get_stack_adapter
from kit.config import load_config


def _audit_on(config_path: str) -> bool:
    return bool(dpdp_config(config_path).get("audit_log_enabled", True))


def _scrub_visits(config_path: str, visits: list) -> list:
    if not dpdp_config(config_path).get("pii_scrub_enabled", True):
        return visits
    cleaned = []
    for visit in visits:
        if not isinstance(visit, dict):
            cleaned.append(visit)
            continue
        v = dict(visit)
        for detail in v.get("actionDetails") or []:
            if isinstance(detail, dict) and detail.get("url"):
                detail["url"] = scrub_url(str(detail["url"]))
        cleaned.append(v)
    return cleaned


def lookup_user(config_path: str, user_id: str) -> dict:
    """Find all analytics data for a person (by visitor ID or custom dimension) via stack adapter."""
    cfg = load_config(config_path)
    adapter = get_stack_adapter(cfg)
    visits = adapter.search_subject_records(user_id)
    if isinstance(visits, dict) and visits.get("result") == "error":
        visits = []
    visits = _scrub_visits(config_path, visits)

    log_action(
        actor="dsar-system",
        action="lookup",
        resource=f"user:{user_id}",
        details={"visit_count": len(visits)},
        enabled=_audit_on(config_path),
    )

    return {
        "user_id": user_id,
        "visit_count": len(visits),
        "visits": visits,
    }


def export_user(config_path: str, user_id: str) -> dict:
    """Export all analytics data for a person (DSAR access / portability)."""
    payload = lookup_user(config_path, user_id)
    log_action(
        actor="dsar-system",
        action="export",
        resource=f"user:{user_id}",
        details={"visit_count": payload["visit_count"]},
        enabled=_audit_on(config_path),
    )
    return {
        "user_id": user_id,
        "format": "json",
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "pii_scrub_applied": dpdp_config(config_path).get("pii_scrub_enabled", True),
        "data": payload,
    }


def delete_user(config_path: str, user_id: str) -> dict:
    """Delete all analytics data for a person via stack adapter."""
    cfg = load_config(config_path)
    adapter = get_stack_adapter(cfg)
    result = adapter.delete_subject_records(user_id)

    log_action(
        actor="dsar-system",
        action="delete",
        resource=f"user:{user_id}",
        details=result,
        enabled=_audit_on(config_path),
    )

    return {
        "user_id": user_id,
        "result": result,
    }
