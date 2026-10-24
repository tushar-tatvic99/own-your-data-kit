"""Data Subject Access Request — find and delete a person's analytics data across any stack."""

from dpdp.audit_log import log_action
from kit.adapters import get_stack_adapter
from kit.config import load_config


def lookup_user(config_path: str, user_id: str) -> dict:
    """Find all analytics data for a person (by visitor ID or custom dimension) via stack adapter."""
    cfg = load_config(config_path)
    adapter = get_stack_adapter(cfg)
    visits = adapter.search_subject_records(user_id)

    log_action(
        actor="dsar-system",
        action="lookup",
        resource=f"user:{user_id}",
        details={"visit_count": len(visits)},
    )

    return {
        "user_id": user_id,
        "visit_count": len(visits),
        "visits": visits,
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
    )

    return {
        "user_id": user_id,
        "result": result,
    }
