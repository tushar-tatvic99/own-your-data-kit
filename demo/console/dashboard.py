"""Dashboard data for the OYDK demo console."""

import csv
import json
import os
from pathlib import Path
from typing import Any

import requests

from agents.parity.email_alert import build_parity_email, parity_recipients, _client_name
from kit.notify_email import smtp_ready
from dpdp.audit_log import get_audit_log
from kit.config import load_config
from kit.matomo_client import MatomoClient
from kit.matomo_token import resolve_matomo_token

REPO_ROOT = Path(__file__).resolve().parents[2]
PARITY_DIR = REPO_ROOT / "output" / "parity"
PARITY_SHEET = PARITY_DIR / "parity-daily-sheet.csv"
PARITY_LATEST_REPORT = REPO_ROOT / "output" / "demo-console" / "last-parity-report.json"


def _matomo_client(cfg: dict) -> MatomoClient:
    stack = cfg["stack"]
    token = resolve_matomo_token(stack["api_token"])
    return MatomoClient(stack["url"], int(stack["site_id"]), token)


PARITY_LATEST_LIVE = REPO_ROOT / "output" / "demo-console" / "last-parity-live.json"
PARITY_LATEST_FIXTURE = REPO_ROOT / "output" / "demo-console" / "last-parity-fixture.json"


def _load_parity_json(path: Path) -> dict | None:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        data["_source_file"] = path.name
        return data
    except Exception:
        return None


def _parity_from_pointer(path: Path) -> dict | None:
    if not path.is_file():
        return None
    try:
        pointer = json.loads(path.read_text(encoding="utf-8"))
        rep = pointer.get("report")
        if isinstance(rep, dict) and rep.get("gaps"):
            rep = dict(rep)
            rep["_source_file"] = pointer.get("report_file") or "last-run"
            return rep
    except Exception:
        pass
    return None


def _latest_parity_report_for_mode(mode: str) -> dict | None:
    pointer = PARITY_LATEST_LIVE if mode == "live" else PARITY_LATEST_FIXTURE
    from_pointer = _parity_from_pointer(pointer)
    if from_pointer and from_pointer.get("mode") == mode:
        return from_pointer

    files = sorted(PARITY_DIR.glob("parity-*.json"), key=lambda p: p.stat().st_mtime, reverse=True)
    for path in files:
        if "daily" in path.name:
            continue
        name = path.name
        if mode == "live":
            if "-fixture" in name or "-break-" in name:
                continue
        else:
            if "-fixture" not in name or "-break-" in name:
                continue
        report = _load_parity_json(path)
        if report and report.get("mode") == mode:
            return report
    return None


def _latest_parity_report(prefer_live: bool = True) -> dict | None:
    live = _latest_parity_report_for_mode("live")
    if prefer_live and live:
        return live
    fix = _latest_parity_report_for_mode("fixture")
    return live or fix


def _read_migration_json(name: str) -> dict[str, Any] | None:
    path = REPO_ROOT / "output" / "migration" / name
    if not path.is_file():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def _migration_bundle_files() -> dict[str, str]:
    return {
        "mtm": "mtm-container-draft.json",
        "gtm_suggested": "gtm-matomo-suggested-container.json",
        "gtm_workspace": "gtm-draft-bundle.json",
    }


def migration_bundle(kind: str) -> dict[str, Any]:
    """kind: mtm | gtm_suggested | gtm_workspace"""
    files = _migration_bundle_files()
    fname = files.get(kind)
    if not fname:
        return {"error": f"Unknown bundle kind: {kind}"}
    data = _read_migration_json(fname)
    if data is None:
        return {"error": f"Missing {fname} — run Migration agent first (fixture or live)."}
    return {"kind": kind, "filename": fname, "bundle": data}


def migration_bundles_inline() -> dict[str, Any | None]:
    """Load all migration bundle JSON for the console (avoids extra round-trip)."""
    out: dict[str, Any | None] = {}
    for key, fname in _migration_bundle_files().items():
        out[key] = _read_migration_json(fname)
    return out


def migration_dashboard(config_path: str) -> dict[str, Any]:
    report_path = REPO_ROOT / "output" / "migration" / "migration-report.json"
    empty = {
        "report": None,
        "dimensions": [],
        "goals": [],
        "gtm_draft": [],
        "unmigrated": [],
        "errors": [],
        "mtm_summary": None,
        "gtm_suggested_summary": None,
        "has_mtm_bundle": False,
        "has_gtm_suggested_bundle": False,
        "has_gtm_workspace_bundle": False,
    }
    if not report_path.is_file():
        return empty
    try:
        report = json.loads(report_path.read_text(encoding="utf-8"))
    except Exception:
        return empty
    migrated = report.get("migrated") or {}
    mtm_path = REPO_ROOT / "output" / "migration" / "mtm-container-draft.json"
    gtm_sug_path = REPO_ROOT / "output" / "migration" / "gtm-matomo-suggested-container.json"
    gtm_ws_path = REPO_ROOT / "output" / "migration" / "gtm-draft-bundle.json"
    return {
        "report": report,
        "dimensions": migrated.get("dimensions") or [],
        "goals": migrated.get("goals") or [],
        "gtm_draft": report.get("gtm_draft_changes") or [],
        "unmigrated": report.get("unmigrated") or [],
        "errors": report.get("errors") or migrated.get("errors") or [],
        "mtm_summary": report.get("mtm_container_draft"),
        "gtm_suggested_summary": report.get("gtm_matomo_suggested_container"),
        "has_mtm_bundle": mtm_path.is_file(),
        "has_gtm_suggested_bundle": gtm_sug_path.is_file(),
        "has_gtm_workspace_bundle": gtm_ws_path.is_file(),
        "artifacts": report.get("artifacts") or {},
        "bundles": migration_bundles_inline(),
        "downloads": {
            "mtm": "/api/download/migration-mtm",
            "gtm_suggested": "/api/download/migration-gtm-suggested",
            "gtm_workspace": "/api/download/migration-gtm-workspace",
        },
    }


def parity_dashboard(config_path: str) -> dict[str, Any]:
    cfg = load_config(config_path)
    target = cfg.get("parity", {}).get("target_gap_percent", 5)
    rows: list[dict] = []
    if PARITY_SHEET.is_file():
        with open(PARITY_SHEET, newline="", encoding="utf-8") as fh:
            rows = list(csv.DictReader(fh))
    live_report = _latest_parity_report_for_mode("live")
    fixture_report = _latest_parity_report_for_mode("fixture")

    def _preview(rep: dict | None) -> dict | None:
        if not rep:
            return None
        subject, plain, html = build_parity_email(rep, _client_name(cfg))
        return {"subject": subject, "plain": plain, "html": html}

    recipients = parity_recipients(cfg)
    email_meta = {
        "recipients": recipients,
        "smtp_ready": smtp_ready(),
        "email_daily_report": bool(cfg.get("parity", {}).get("email_daily_report", True)),
    }
    if live_report and not live_report.get("all_within_target") and not live_report.get("diagnosis"):
        from agents.parity.diagnosis import diagnose

        missed = [g for g in live_report.get("gaps", []) if not g.get("within_target")]
        live_report = {
            **live_report,
            "diagnosis": [
                {
                    "cause": d.likely_cause,
                    "confidence": d.confidence,
                    "fix": d.proposed_fix,
                    "affected": d.affected_metric,
                }
                for d in diagnose(missed)
            ],
        }

    return {
        "target_gap_percent": target,
        "daily_rows": rows[-30:],
        "live_report": live_report,
        "fixture_report": fixture_report,
        "live_email_preview": _preview(live_report),
        "fixture_email_preview": _preview(fixture_report),
        "latest_report": live_report or fixture_report,
        "email_preview": _preview(live_report or fixture_report),
        "sheet_path": str(PARITY_SHEET.relative_to(REPO_ROOT)),
        "alert_email": email_meta,
    }


AURABLUSH_SHOP_HOST = "auraandblush-61760469326.asia-south1.run.app"


def _aurablush_demo_rights_requests() -> list[dict]:
    """Shop tickets shown when live /api/dpdp/summary is unreachable (matches infinity-shop seeds)."""
    return [
        {
            "ticketId": "DR-849201",
            "requestType": "delete_analytics_marketing",
            "status": "retained",
            "currentStage": "Completed / Statutory Retention Notified",
            "acknowledgedDate": "2026-10-20T10:00:00+00:00",
        },
        {
            "ticketId": "DPDP-2026-5YN04",
            "requestType": "full_erasure",
            "status": "completed",
            "currentStage": "Matomo analytics erasure processed",
            "acknowledgedDate": "2026-10-24T14:30:00+00:00",
        },
    ]


def _is_bundled_demo_config(config_path: str) -> bool:
    norm = Path(config_path).as_posix().lower()
    return norm.endswith("config/client.yaml")


def _is_aurablush_demo_shop(shop_url: str) -> bool:
    return AURABLUSH_SHOP_HOST in (shop_url or "").lower()


def _fetch_shop_dpdp_summary(shop_url: str) -> tuple[dict | None, str]:
    if not shop_url:
        return None, "no_shop_url — set Shop URL on Deploy tab (Your Analytics Setup)"
    base = shop_url.rstrip("/")
    try:
        r = requests.get(f"{base}/api/dpdp/summary", timeout=10)
        if r.status_code == 200:
            return r.json(), ""
        return None, f"shop_http_{r.status_code} — redeploy shop with /api/dpdp/summary"
    except Exception as exc:
        return None, f"shop_unreachable — {exc}"


def _kit_audit_entries(kit_api: str) -> list[dict]:
    base = (kit_api or "").rstrip("/")
    if not base:
        return []
    try:
        r = requests.get(f"{base}/audit", timeout=10)
        if r.status_code == 200:
            data = r.json()
            return data.get("entries") or []
    except Exception:
        pass
    return []


def dpdp_dashboard(config_path: str) -> dict[str, Any]:
    cfg = load_config(config_path)
    dpdp = cfg.get("dpdp", {})
    shop = (cfg.get("client") or {}).get("website_url", "")
    kit_api = os.environ.get("KIT_API_URL", "http://35.234.210.199:8090")

    local_entries = get_audit_log(limit=200)
    remote_entries = _kit_audit_entries(kit_api)
    merged: dict[str, dict] = {}
    for e in local_entries + remote_entries:
        key = f"{e.get('timestamp')}-{e.get('action')}-{e.get('resource')}"
        merged[key] = e
    entries = sorted(merged.values(), key=lambda x: x.get("timestamp", ""), reverse=True)

    requests_rows = []
    for e in entries:
        action = (e.get("action") or "").lower()
        resource = e.get("resource") or ""
        details = e.get("details") or {}
        if any(
            k in action
            for k in ("erasure", "delete", "dsar", "export", "lookup", "retention")
        ) or "ticket" in resource.lower():
            requests_rows.append(
                {
                    "timestamp": e.get("timestamp"),
                    "actor": e.get("actor"),
                    "action": e.get("action"),
                    "resource": resource,
                    "visits_deleted": details.get("visits_deleted"),
                    "visits_before": details.get("visits_before"),
                    "lookup_ids": details.get("lookup_ids"),
                    "details": details,
                }
            )

    shop_summary, shop_err = _fetch_shop_dpdp_summary(shop)
    consent = {
        "require_consent": dpdp.get("require_consent", True),
        "cmp_provider": dpdp.get("cmp_provider", "klaro"),
        "shop_url": shop,
        "granted": 0,
        "denied": 0,
        "source": "config_only",
        "note": shop_err or "Counts come from the live shop /api/dpdp/summary (in-memory until redeploy).",
    }
    if shop_summary and shop_summary.get("consent"):
        c = shop_summary["consent"]
        consent.update(
            {
                "granted": c.get("granted", 0),
                "denied": c.get("denied", 0),
                "total": c.get("total", 0),
                "granted_today": c.get("granted_today", 0),
                "denied_today": c.get("denied_today", 0),
                "source": "live_shop_api",
                "note": (
                    "Granted/denied = all CMP choices in the shop log (not the same as Matomo visits). "
                    "Matomo visits today = tracked sessions after consent."
                ),
            }
        )
    shop_fetch_error = shop_err
    use_demo_seed = bool(shop_err) and (
        _is_bundled_demo_config(config_path) or _is_aurablush_demo_shop(shop)
    )
    if use_demo_seed:
        consent.update(
            {
                "granted": 24,
                "denied": 5,
                "total": 29,
                "source": "aurablush_demo_seed",
                "granted_today": 0,
                "denied_today": 0,
                "note": (
                    "All-time shop CMP log (not Matomo visits). "
                    "Matomo visits today = sessions tracked after consent."
                ),
            }
        )
        shop_fetch_error = ""

    matomo_note = ""
    try:
        client = _matomo_client(cfg)
        summary = client.get_visits_summary(period="day", date="today")
        consent["matomo_visits_today"] = int(summary.get("nb_visits") or 0)
        matomo_note = "Sessions Matomo recorded today (subset of consented traffic)."
    except Exception as exc:
        matomo_note = str(exc)

    rights = list((shop_summary or {}).get("rights_requests", []))
    if not rights and (
        use_demo_seed
        or _is_bundled_demo_config(config_path)
        or _is_aurablush_demo_shop(shop)
    ):
        rights = _aurablush_demo_rights_requests()
        if shop_err and not shop_fetch_error:
            consent["note"] = (
                (consent.get("note") or "")
                + " Shop rights table: demo tickets (live shop summary unavailable — redeploy shop for live tickets)."
            ).strip()
    rights.sort(key=lambda r: r.get("acknowledgedDate") or "", reverse=True)
    rights_source = "live_shop_api" if (shop_summary and (shop_summary or {}).get("rights_requests")) else (
        "aurablush_demo_seed" if rights else "none"
    )
    return {
        "consent": consent,
        "matomo_note": matomo_note,
        "shop_fetch_error": shop_fetch_error,
        "rights_requests": rights,
        "rights_requests_source": rights_source,
        "audit_requests": requests_rows[:50],
        "total_audit_entries": len(entries),
    }


def connectors_dashboard(config_path: str) -> dict[str, Any]:
    from connectors.cmp_signals import describe_cmp_integration

    cfg = load_config(config_path)
    connectors = cfg.get("connectors", {})
    demo = connectors.get("demo_mode", True)
    items = [
        {
            "id": "cmp",
            "name": "CMP → GA4 / Matomo",
            "ready": True,
            "demo": False,
            "detail": describe_cmp_integration(config_path),
        },
        {
            "id": "google_ads",
            "name": "Google Ads conversions",
            "ready": bool(connectors.get("google_ads", {}).get("customer_id")),
            "demo": demo,
            "detail": connectors.get("google_ads", {}),
        },
        {
            "id": "meta",
            "name": "Meta Conversions API",
            "ready": bool(connectors.get("meta", {}).get("pixel_id")),
            "demo": demo,
            "detail": connectors.get("meta", {}),
        },
        {
            "id": "bigquery",
            "name": "BigQuery warehouse",
            "ready": bool(connectors.get("bigquery", {}).get("project_id")),
            "demo": False,
            "detail": connectors.get("bigquery", {}),
        },
        {
            "id": "looker",
            "name": "Looker dashboard JSON",
            "ready": bool(connectors.get("looker", {}).get("dashboard_id")),
            "demo": False,
            "detail": connectors.get("looker", {}),
        },
    ]
    return {"connectors": items, "demo_mode": demo}


def _ga4_export_dataset_status(project: str, dataset: str) -> dict[str, Any]:
    if not project or not dataset:
        return {"exists": False, "detail": "project_id or dataset not configured"}
    try:
        from agents.history.ga4_bq_reader import resolve_bq_location
        from google.cloud import bigquery

        client = bigquery.Client(project=project)
        loc = resolve_bq_location(client, project, dataset)
        if loc:
            return {"exists": True, "location": loc, "dataset_id": f"{project}.{dataset}"}
        return {
            "exists": False,
            "dataset_id": f"{project}.{dataset}",
            "detail": "Dataset not found — enable GA4 → BigQuery linking for this property.",
        }
    except Exception as exc:
        return {"exists": False, "dataset_id": f"{project}.{dataset}", "detail": str(exc)[:300]}


def bq_export_guide(config_path: str) -> dict[str, Any]:
    """GA4 BigQuery export → Matomo backfill (not Matomo → BQ)."""
    cfg = load_config(config_path)
    hist = cfg.get("history", {})
    ga4 = cfg.get("ga4", {})
    bq_hist = hist.get("ga4_bigquery", {})
    dataset = bq_hist.get("dataset") or f"analytics_{ga4.get('property_id', '')}"
    project = bq_hist.get("project_id") or (cfg.get("connectors") or {}).get("bigquery", {}).get(
        "project_id", ""
    )
    ds_status = _ga4_export_dataset_status(str(project), str(dataset))
    return {
        "flow": "GA4 (BigQuery export) → OYDK history agent → Matomo",
        "prerequisites": [
            "GA4 property linked to BigQuery export (Google Analytics → BigQuery Linking)",
            f"BigQuery dataset: {project}.{dataset} (typically analytics_<property_id>)",
            "Service account with BigQuery Data Viewer on that dataset",
            "credentials/ga-service-account.json (same as migration)",
            "MATOMO_API_TOKEN in .env — replay hits into your Matomo site",
            "config history.ga4_bigquery.project_id and dataset in client.yaml",
        ],
        "matomo_vs_ga4": [
            {
                "topic": "Purpose",
                "ga4": "Historical events already in BQ (batch export)",
                "matomo": "Target warehouse after GA4 → Matomo migration",
            },
            {
                "topic": "OYDK command",
                "ga4": "py -3 -m kit.cli import-ga4-history --start … --end …",
                "matomo": "Replay rows via agents/history/matomo_replay.py",
            },
            {
                "topic": "Optional mirror",
                "ga4": "Can also mirror imported rows to kit warehouse table",
                "matomo": "Separate: connectors/bigquery_export.py = Matomo → BQ (ongoing sync)",
            },
        ],
        "config": {"ga4_bigquery": bq_hist, "ga4_property_id": ga4.get("property_id")},
        "ga4_export_dataset": ds_status,
        "demo_without_bq": "Use Preview (fixture) on this tab — no BigQuery export required.",
    }
