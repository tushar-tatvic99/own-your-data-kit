"""Structured evidence for demo suite and dashboards (migration, parity, DPDP)."""

import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

from demo.console.dashboard import dpdp_dashboard, migration_dashboard, parity_dashboard

REPO_ROOT = Path(__file__).resolve().parents[2]


def build_suite_evidence(config_path: str) -> dict[str, Any]:
    mig = migration_dashboard(config_path)
    dpdp = dpdp_dashboard(config_path)
    parity = parity_dashboard(config_path)
    daily = parity.get("daily_rows") or []
    last_two = _last_n_calendar_days(daily, 2)
    return {
        "migration": {
            "mode": (mig.get("report") or {}).get("mode"),
            "ga4_property": (mig.get("report") or {}).get("ga4_property"),
            "gtm_container": (mig.get("report") or {}).get("gtm_container"),
            "dimensions": mig.get("dimensions") or [],
            "goals": mig.get("goals") or [],
            "gtm_draft_changes": mig.get("gtm_draft") or [],
            "unmigrated": mig.get("unmigrated") or [],
            "errors": mig.get("errors") or [],
        },
        "dpdp": {
            "consent": dpdp.get("consent"),
            "rights_requests": dpdp.get("rights_requests") or [],
            "audit_requests": dpdp.get("audit_requests") or [],
            "matomo_note": dpdp.get("matomo_note"),
        },
        "parity": {
            "target_gap_percent": parity.get("target_gap_percent"),
            "daily_last_2_days": last_two,
            "latest_report": parity.get("latest_report"),
            "email_subject": (parity.get("email_preview") or {}).get("subject"),
        },
    }


def _last_n_calendar_days(rows: list[dict], n: int) -> list[dict]:
    if not rows:
        return []
    dates = {
        (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
        for i in range(1, n + 1)
    }
    picked = [r for r in rows if (r.get("report_date") or "") in dates]
    if picked:
        return picked
    return rows[-n:]
