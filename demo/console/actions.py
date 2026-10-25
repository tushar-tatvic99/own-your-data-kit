"""Demo actions invoked from the OYDK console UI."""

import io
import sys
from contextlib import redirect_stdout, redirect_stderr
from typing import Any, Callable

from kit.config import load_config


def _capture(fn: Callable[[], Any]) -> dict[str, Any]:
    out = io.StringIO()
    err = io.StringIO()
    status = "ok"
    result = None
    try:
        with redirect_stdout(out), redirect_stderr(err):
            result = fn()
    except SystemExit as exc:
        status = "ok" if exc.code in (0, None) else "error"
    except Exception as exc:
        status = "error"
        err.write(str(exc))
    return {
        "status": status,
        "stdout": out.getvalue(),
        "stderr": err.getvalue(),
        "result": result,
    }


def run_action(action_id: str, config_path: str, params: dict[str, Any]) -> dict[str, Any]:
    cfg = load_config(config_path)

    def verify_parts():
        from kit.verify_parts import verify_all
        return {"pass": verify_all(config_path)}

    def verify_dpdp():
        from demo.console.dashboard import dpdp_dashboard
        from dpdp.verify_dpdp import verify_dpdp

        ok = verify_dpdp(config_path)
        dash = dpdp_dashboard(config_path)
        return {
            "pass": ok,
            "consent": dash.get("consent"),
            "rights_requests": dash.get("rights_requests"),
            "audit_requests": (dash.get("audit_requests") or [])[:15],
            "shop_fetch_error": dash.get("shop_fetch_error"),
        }

    def verify_matomo():
        from kit.matomo_token import resolve_matomo_token, verify_matomo_token
        token = resolve_matomo_token(cfg["stack"]["api_token"])
        verify_matomo_token(cfg["stack"]["url"], token, int(cfg["stack"]["site_id"]))
        return {"message": "Matomo token OK"}

    def migrate(fixture: bool):
        from agents.migration.run import run_migration

        report = run_migration(config_path, fixture=fixture)
        migrated = report.get("migrated") or {}
        return {
            "mode": report.get("mode"),
            "ga4_property": report.get("ga4_property"),
            "gtm_container": report.get("gtm_container"),
            "dimensions": migrated.get("dimensions") or [],
            "goals": migrated.get("goals") or [],
            "gtm_draft_changes": report.get("gtm_draft_changes") or [],
            "unmigrated": report.get("unmigrated") or [],
            "errors": report.get("errors") or [],
        }

    def parity(fixture: bool, break_tag: str | None, date: str | None):
        from datetime import datetime, timedelta

        from agents.parity.run import run_parity

        start = (params.get("start_date") or date or "").strip() or None
        end = (params.get("end_date") or start or "").strip() or None
        if not start and params.get("date_offset"):
            offset = int(params["date_offset"])
            start = (datetime.now() - timedelta(days=offset)).strftime("%Y-%m-%d")
            end = start
        if not start:
            start = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
            end = start
        if not end:
            end = start

        start_dt = datetime.strptime(start, "%Y-%m-%d")
        end_dt = datetime.strptime(end, "%Y-%m-%d")
        if end_dt < start_dt:
            start_dt, end_dt = end_dt, start_dt
        days = []
        cur = start_dt
        while cur <= end_dt and len(days) < 14:
            days.append(cur.strftime("%Y-%m-%d"))
            cur += timedelta(days=1)

        combined_gaps: list[dict] = []
        diagnosis: list[dict] = []
        all_ok = True
        last_report: dict = {}
        for day in days:
            report = run_parity(config_path, date=day, fixture=fixture, break_tag=break_tag)
            last_report = report
            if not report.get("all_within_target", True):
                all_ok = False
            for g in report.get("gaps") or []:
                row = dict(g)
                if len(days) > 1:
                    row["date"] = day
                combined_gaps.append(row)
            for d in report.get("diagnosis") or []:
                if d not in diagnosis:
                    diagnosis.append(d)

        return {
            "date": last_report.get("date"),
            "start_date": days[0] if days else start,
            "end_date": days[-1] if days else end,
            "days_checked": len(days),
            "mode": last_report.get("mode"),
            "simulated_break_tag": last_report.get("simulated_break_tag"),
            "all_within_target": all_ok,
            "gaps": combined_gaps,
            "diagnosis": diagnosis,
            "email_sent": (last_report.get("email_alert") or {}).get("sent"),
            "report_file": last_report.get("report_file"),
            "report_path": last_report.get("report_path"),
            "target_gap_percent": last_report.get("target_gap_percent"),
        }

    def connectors():
        from connectors.runner import test_all_connectors
        test_all_connectors(config_path)
        return {"message": "Connector test finished"}

    def history_import(fixture: bool, dry_run: bool):
        from agents.history.run import run_ga4_history_import
        return run_ga4_history_import(
            config_path,
            start_date=params.get("start_date"),
            end_date=params.get("end_date"),
            fixture=fixture,
            dry_run=dry_run,
            limit=int(params.get("limit", 100)),
        )

    def bq_sync():
        from connectors.bigquery_export import run_bigquery_sync
        return run_bigquery_sync(config_path, continuous=False)

    def dsar_lookup(user_id: str):
        from dpdp.dsar import lookup_user
        return lookup_user(config_path, user_id)

    def dsar_subject_email(email: str):
        from dpdp.subject_id import subject_user_id
        from dpdp.dsar import lookup_user
        uid = subject_user_id(email)
        return {"subject_user_id": uid, "lookup": lookup_user(config_path, uid)}

    def deploy_info():
        info = {
            "command": f'.\\deploy\\deploy.ps1 -ProjectId <gcp-project> -ClientName {cfg["client"]["name"]} -Profile standard',
            "doc": "docs/post-deploy-checklist.md",
        }
        print(info["command"])
        print(f"See {info['doc']}")
        return info

    handlers: dict[str, Callable[[], Any]] = {
        "verify_parts": verify_parts,
        "verify_dpdp": verify_dpdp,
        "verify_matomo": verify_matomo,
        "migrate_live": lambda: migrate(False),
        "migrate_linked": lambda: migrate(False),
        "migrate_fixture": lambda: migrate(True),
        "parity_live": lambda: parity(False, None, params.get("date")),
        "parity_fixture_ok": lambda: parity(True, None, params.get("date")),
        "parity_break_purchase": lambda: parity(True, "purchase", params.get("date")),
        "connectors_test": connectors,
        "history_fixture_dry": lambda: history_import(True, True),
        "history_fixture_import": lambda: history_import(True, False),
        "ga4_bq_import_live": lambda: history_import(False, False),
        "ga4_bq_import_dry": lambda: history_import(False, True),
        "bq_sync": bq_sync,
        "dsar_lookup": lambda: dsar_lookup(params.get("user_id", "")),
        "dsar_by_email": lambda: dsar_subject_email(params.get("email", "")),
        "deploy_info": deploy_info,
    }

    if action_id not in handlers:
        return {"status": "error", "stderr": f"Unknown action: {action_id}"}

    return _capture(handlers[action_id])
