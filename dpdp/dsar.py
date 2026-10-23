"""Data Subject Access Request — find and delete a person's analytics data."""

from kit.config import load_config
from kit.matomo_client import MatomoClient
from dpdp.audit_log import log_action


def _get_client(config_path: str) -> MatomoClient:
    cfg = load_config(config_path)
    stack = cfg["stack"]
    return MatomoClient(stack["url"], stack["site_id"], stack["api_token"])


def lookup_user(config_path: str, user_id: str) -> dict:
    """Find all analytics data for a person (by visitor ID or custom dimension)."""
    client = _get_client(config_path)
    visits = client.find_visits_by_user_id(user_id)

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
    """Delete all analytics data for a person."""
    client = _get_client(config_path)

    # Find visitor IDs associated with this user
    visits = client.find_visits_by_user_id(user_id)
    visitor_ids = list({v.get("visitorId") for v in visits if v.get("visitorId")})

    deleted = []
    for vid in visitor_ids:
        result = client.delete_visitor_data(vid)
        deleted.append({"visitor_id": vid, "result": result})

    log_action(
        actor="dsar-system",
        action="delete",
        resource=f"user:{user_id}",
        details={"visitor_ids_deleted": visitor_ids},
    )

    return {
        "user_id": user_id,
        "visitor_ids_deleted": visitor_ids,
        "deletion_results": deleted,
    }
