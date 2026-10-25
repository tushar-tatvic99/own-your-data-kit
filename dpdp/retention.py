"""Apply configured data retention policy (DPDP-ready default)."""

from dpdp.audit_log import log_action
from dpdp.settings import dpdp_config
from kit.config import load_config
from kit.analytics_stack import analytics_stack_from_config


def enforce_retention(config_path: str) -> dict:
    """
    Apply retention days via Matomo PrivacyManager API when possible,
    and return config + API status for operators.
    """
    cfg = load_config(config_path)
    dpdp = dpdp_config(config_path)
    days = int(dpdp.get("data_retention_days", 365))
    site_id = cfg["stack"]["site_id"]
    audit_on = bool(dpdp.get("audit_log_enabled", True))

    matomo_result: dict | str = {"status": "skipped", "reason": "not attempted"}
    try:
        client = analytics_stack_from_config(config_path)
        matomo_result = client.set_delete_logs_settings(days, enabled=True)
    except Exception as exc:
        matomo_result = {"status": "error", "message": str(exc)}

    log_action(
        actor="retention-job",
        action="enforce",
        resource=f"site:{site_id}",
        details={"retention_days": days, "matomo": matomo_result},
        enabled=audit_on,
    )
    return {
        "retention_days": days,
        "site_id": site_id,
        "matomo_api": matomo_result,
        "status": (
            "ok"
            if isinstance(matomo_result, dict)
            and matomo_result.get("status") != "error"
            and matomo_result.get("result") != "error"
            else "partial"
        ),
        "fallback_ui": (
            f"Matomo Admin → Privacy → Regularly delete old raw data ({days} days)"
        ),
    }
