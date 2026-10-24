"""Process website DPDP erasure petitions against Matomo (OYDK kit-api)."""

from dpdp.audit_log import log_action
from dpdp.settings import dpdp_config
from dpdp.subject_id import matomo_lookup_ids_for_email, subject_user_id
from kit.matomo_from_config import matomo_client_from_config


def _audit_on(config_path: str) -> bool:
    return bool(dpdp_config(config_path).get("audit_log_enabled", True))


def _lookup_all_ids(config_path: str, email: str) -> dict:
    client = matomo_client_from_config(config_path)
    all_visits: list[dict] = []
    ids_tried: list[str] = []
    for uid in matomo_lookup_ids_for_email(email):
        ids_tried.append(uid)
        visits = client.find_visits_by_user_id(uid)
        if isinstance(visits, dict) and visits.get("result") == "error":
            continue
        for v in visits or []:
            if isinstance(v, dict):
                all_visits.append(v)
    # De-dupe by idVisit
    seen: set[int] = set()
    unique: list[dict] = []
    for v in all_visits:
        vid = v.get("idVisit") or v.get("idvisit")
        if vid is not None and int(vid) in seen:
            continue
        if vid is not None:
            seen.add(int(vid))
        unique.append(v)
    return {"lookup_ids": ids_tried, "visits": unique, "visit_count": len(unique)}


def process_erasure(
    config_path: str,
    *,
    email: str,
    scope: str,
    ticket_id: str,
    legal_hold: bool = False,
    name: str | None = None,
) -> dict:
    """
    scope: full_erasure | tracking_only | access_inquiry (website values)
    legal_hold: true when active order — analytics purge deferred, statutory retention UI only
    """
    subject_id = subject_user_id(email)
    audit_on = _audit_on(config_path)

    if scope == "access_inquiry":
        payload = _lookup_all_ids(config_path, email)
        log_action(
            actor="web-dpdp-form",
            action="access_inquiry",
            resource=f"ticket:{ticket_id}",
            details={"visit_count": payload["visit_count"], "subject_id": subject_id},
            enabled=audit_on,
        )
        return {
            "status": "completed",
            "ticket_id": ticket_id,
            "scope": scope,
            "subject_user_id": subject_id,
            "visit_count": payload["visit_count"],
            "message": "Access summary available; no deletion performed.",
        }

    if legal_hold:
        log_action(
            actor="web-dpdp-form",
            action="erasure_deferred",
            resource=f"ticket:{ticket_id}",
            details={"reason": "active_order_legal_hold", "subject_id": subject_id},
            enabled=audit_on,
        )
        return {
            "status": "partial",
            "ticket_id": ticket_id,
            "scope": scope,
            "subject_user_id": subject_id,
            "matomo_visits_deleted": 0,
            "message": "Analytics erasure deferred while order/contract obligations apply.",
        }

    if scope not in ("full_erasure", "tracking_only"):
        return {
            "status": "error",
            "message": f"Unsupported scope: {scope}",
            "ticket_id": ticket_id,
        }

    lookup = _lookup_all_ids(config_path, email)
    deleted_total = 0
    deletion_results: list[dict] = []
    client = matomo_client_from_config(config_path)

    if lookup["visits"]:
        result = client.delete_data_subjects(lookup["visits"])
        deleted_total = len(lookup["visits"])
        deletion_results.append(result)

    log_action(
        actor="web-dpdp-form",
        action="erasure",
        resource=f"ticket:{ticket_id}",
        details={
            "scope": scope,
            "subject_id": subject_id,
            "visits_deleted": deleted_total,
            "name_provided": bool(name),
        },
        enabled=audit_on,
    )

    return {
        "status": "completed" if deleted_total else "completed_no_visits",
        "ticket_id": ticket_id,
        "scope": scope,
        "subject_user_id": subject_id,
        "matomo_visits_deleted": deleted_total,
        "deletion_results": deletion_results,
        "message": (
            f"Matomo analytics data removed for {deleted_total} visit(s)."
            if deleted_total
            else "No Matomo visits matched this email yet; device data cleared on browser."
        ),
    }
