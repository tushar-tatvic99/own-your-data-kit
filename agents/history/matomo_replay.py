"""Replay normalized GA4 rows into Matomo via Tracking API (backdated cdt)."""

import time
from typing import Any

import requests


def replay_rows(
    tracker_base_url: str,
    site_id: int,
    rows: list[dict[str, Any]],
    *,
    dry_run: bool = False,
    throttle_ms: int = 0,
) -> dict[str, Any]:
    """
    Send hits to matomo.php. Requires tracking not blocked for the server IP.
    Uses cdt so historical timestamps appear in Matomo reports.
    """
    base = tracker_base_url.rstrip("/")
    tracker_url = f"{base}/matomo.php"
    sent = 0
    errors: list[str] = []

    for row in rows:
        if dry_run:
            sent += 1
            continue

        params: dict[str, Any] = {
            "idsite": site_id,
            "rec": 1,
            "url": row.get("page_url") or "https://imported.local/",
            "action_name": row.get("page_title") or row.get("event_name"),
            "_id": row.get("visitor_id"),
        }
        if row.get("cdt"):
            params["cdt"] = row["cdt"]

        name = row.get("event_name") or ""
        if name and name not in ("page_view", "session_start", "first_visit"):
            params["e_c"] = "GA4 Import"
            params["e_a"] = name

        try:
            resp = requests.get(tracker_url, params=params, timeout=15)
            if resp.status_code >= 400:
                errors.append(f"{resp.status_code} for {name}")
            else:
                sent += 1
        except requests.RequestException as exc:
            errors.append(str(exc)[:120])

        if throttle_ms > 0:
            time.sleep(throttle_ms / 1000.0)

    return {
        "dry_run": dry_run,
        "attempted": len(rows),
        "sent": sent,
        "errors": errors[:20],
        "error_count": len(errors),
    }
