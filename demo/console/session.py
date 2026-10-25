"""Demo console session — default (bundled creds) vs custom judge profile."""

import json
import os
import subprocess
import threading
from pathlib import Path
from typing import Any

from demo.console.deploy_wizard import GENERATED_CONFIG, save_client_config
from kit.config import load_config
from kit.env import load_kit_env
from kit.matomo_token import resolve_matomo_token

REPO_ROOT = Path(__file__).resolve().parents[2]
SESSION_FILE = REPO_ROOT / "output" / "demo-console" / "session.json"
DEFAULT_CONFIG_PATH = (
    os.environ.get("OYDK_DEFAULT_CONFIG")
    or os.environ.get("OYDK_CONFIG")
    or "config/client.yaml"
)

# Known Aurablush demo defaults (overridden by client.yaml when present)
FALLBACK_DEFAULTS = {
    "gcp_project_id": os.environ.get("OYDK_DEMO_GCP_PROJECT", "tvc-int-matomo"),
    "client_name": "aurablush",
    "website_url": "https://auraandblush-61760469326.asia-south1.run.app",
    "matomo_url": "https://matomo.35-234-210-199.nip.io",
    "site_id": "1",
    "profile": "standard",
    "bq_dataset": "matomo_export",
    "kit_api_url": os.environ.get("KIT_API_URL", "http://35.234.210.199:8090"),
    "alert_emails": "mohit@tatvic.com,tushar@tatvic.com,parshwa@tatvic.com,dhruvi.p@tatvic.com,prakash.katariya@tatvic.com",
}


def _parity_alert_emails(parity: dict) -> list[str]:
    emails = list(parity.get("alert_emails") or [])
    single = (parity.get("alert_email") or "").strip()
    if single and single not in emails:
        emails.append(single)
    if not emails:
        from agents.parity.email_alert import DEFAULT_PARITY_ALERT_EMAILS

        emails = list(DEFAULT_PARITY_ALERT_EMAILS)
    return emails

_lock = threading.Lock()
_session: dict[str, Any] = {"mode": "default", "config_path": DEFAULT_CONFIG_PATH}


def _load_session() -> None:
    global _session
    if SESSION_FILE.is_file():
        try:
            _session = json.loads(SESSION_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass


def _save_session() -> None:
    SESSION_FILE.parent.mkdir(parents=True, exist_ok=True)
    SESSION_FILE.write_text(json.dumps(_session, indent=2), encoding="utf-8")


_load_session()


def active_config_path() -> str:
    with _lock:
        return _session.get("config_path") or DEFAULT_CONFIG_PATH


def set_default_mode() -> dict[str, Any]:
    with _lock:
        _session["mode"] = "default"
        _session["config_path"] = DEFAULT_CONFIG_PATH
        os.environ["OYDK_CONFIG"] = DEFAULT_CONFIG_PATH
        _save_session()
    return session_status()


def set_custom_mode(fields: dict[str, Any]) -> dict[str, Any]:
    saved = save_client_config(fields)
    rel = saved["path"]
    with _lock:
        _session["mode"] = "custom"
        _session["config_path"] = rel
        _session["custom_fields"] = fields
        os.environ["OYDK_CONFIG"] = rel
        _save_session()
    if fields.get("gcp_project_id"):
        os.environ["GOOGLE_CLOUD_PROJECT"] = str(fields["gcp_project_id"])
    return session_status()


def _config_path_abs(rel: str) -> Path:
    p = Path(rel)
    return p if p.is_absolute() else REPO_ROOT / p


def credential_status(config_path: str | None = None) -> dict[str, Any]:
    load_kit_env()
    path = config_path or active_config_path()
    cfg = load_config(path)
    ga_file = (cfg.get("ga4") or {}).get("credentials_file", "credentials/ga-service-account.json")
    ga_path = REPO_ROOT / ga_file
    matomo_ok = False
    matomo_err = ""
    try:
        token = resolve_matomo_token(cfg["stack"]["api_token"])
        matomo_ok = bool(token and "your-" not in token.lower())
    except Exception as exc:
        matomo_err = str(exc)
    return {
        "matomo_token": matomo_ok,
        "matomo_error": matomo_err,
        "ga_credentials_file": ga_file,
        "ga_credentials_present": ga_path.is_file(),
        "smtp_ready": bool(os.getenv("OYDK_SMTP_PASS") or os.getenv("OYDK_SMTP_USER")),
        "openai_optional": bool(os.getenv("OYDK_OPENAI_API_KEY")),
        "live_migration_ready": ga_path.is_file(),
        "live_parity_ready": ga_path.is_file() and matomo_ok,
    }


def default_profile_fields() -> dict[str, Any]:
    load_kit_env()
    fields = dict(FALLBACK_DEFAULTS)
    try:
        cfg = load_config(DEFAULT_CONFIG_PATH)
        client = cfg.get("client", {})
        stack = cfg.get("stack", {})
        ga4 = cfg.get("ga4", {})
        gtm = cfg.get("gtm", {})
        bq = (cfg.get("connectors") or {}).get("bigquery", {})
        parity = cfg.get("parity", {})
        emails = _parity_alert_emails(parity)
        fields.update(
            {
                "client_name": client.get("name") or fields["client_name"],
                "website_url": client.get("website_url") or fields["website_url"],
                "matomo_url": stack.get("url") or fields["matomo_url"],
                "site_id": str(stack.get("site_id", fields["site_id"])),
                "ga4_property_id": str(ga4.get("property_id") or ""),
                "ga4_measurement_id": ga4.get("measurement_id") or "",
                "gtm_account_id": str(gtm.get("account_id") or ""),
                "gtm_container_id": str(gtm.get("container_id") or ""),
                "gcp_project_id": bq.get("project_id") or fields["gcp_project_id"],
                "bq_dataset": bq.get("dataset") or fields["bq_dataset"],
                "parity_threshold": parity.get("target_gap_percent", 5),
                "alert_emails": ",".join(emails) if isinstance(emails, list) else str(emails or ""),
            }
        )
    except Exception:
        pass
    return fields


def session_status() -> dict[str, Any]:
    path = active_config_path()
    creds = credential_status(path)
    fields = default_profile_fields() if _session.get("mode") == "default" else (_session.get("custom_fields") or {})
    return {
        "mode": _session.get("mode", "default"),
        "config_path": path,
        "default_config_path": DEFAULT_CONFIG_PATH,
        "credentials": creds,
        "default_fields": default_profile_fields(),
        "active_fields_preview": fields,
        "gcloud": gcloud_status(),
        "suite_plan": suite_plan(path, force_fixture=False),
        "suite_plan_fixture": suite_plan(path, force_fixture=True),
    }


def gcloud_status() -> dict[str, Any]:
    try:
        proc = subprocess.run(
            ["gcloud", "auth", "list", "--filter=status:ACTIVE", "--format=json"],
            capture_output=True,
            text=True,
            timeout=25,
            cwd=str(REPO_ROOT),
        )
        accounts = json.loads(proc.stdout or "[]") if proc.returncode == 0 else []
        proj = subprocess.run(
            ["gcloud", "config", "get-value", "project"],
            capture_output=True,
            text=True,
            timeout=15,
            cwd=str(REPO_ROOT),
        )
        project = (proj.stdout or "").strip() if proj.returncode == 0 else ""
        token = subprocess.run(
            ["gcloud", "auth", "print-access-token"],
            capture_output=True,
            text=True,
            timeout=15,
            cwd=str(REPO_ROOT),
        )
        return {
            "installed": proc.returncode == 0 or "gcloud" in (proc.stderr or ""),
            "active_accounts": [a.get("account") for a in accounts if a.get("account")],
            "project": project,
            "token_ok": token.returncode == 0,
            "token_error": (token.stderr or "").strip()[:200] if token.returncode != 0 else "",
        }
    except FileNotFoundError:
        return {"installed": False, "active_accounts": [], "project": "", "token_ok": False}
    except Exception as exc:
        return {"installed": True, "error": str(exc), "token_ok": False}


def _subprocess_no_window(cmd: str | list[str], *, shell: bool = False) -> subprocess.Popen:
    """Run gcloud without popping a CMD window (browser-only sign-in for judges)."""
    kwargs: dict = {"cwd": str(REPO_ROOT), "shell": shell}
    if os.name == "nt":
        kwargs["creationflags"] = subprocess.CREATE_NO_WINDOW  # type: ignore[attr-defined]
    if shell:
        return subprocess.Popen(cmd, **kwargs)
    return subprocess.Popen(cmd, **kwargs)  # type: ignore[arg-type]


def start_gcloud_login(gcp_project_id: str = "") -> dict[str, Any]:
    """Start gcloud auth in the background; user completes sign-in in the browser only."""
    project = (gcp_project_id or os.environ.get("GOOGLE_CLOUD_PROJECT") or "").strip()
    try:
        if os.name == "nt":
            inner = "gcloud auth login && gcloud auth application-default login"
            if project:
                inner += f' && gcloud config set project "{project}"'
            _subprocess_no_window(inner, shell=True)
        else:
            _subprocess_no_window(["gcloud", "auth", "login"], shell=False)
        msg = (
            "Google sign-in should open in your browser (no terminal needed). When finished, click "
            "Refresh gcloud status."
        )
        if project:
            msg += f" Project will be set to {project} after login."
        return {"started": True, "message": msg, "project": project}
    except Exception as exc:
        return {"started": False, "error": str(exc)}


def set_gcloud_project(project_id: str) -> dict[str, Any]:
    project_id = (project_id or "").strip()
    if not project_id:
        return {"ok": False, "error": "project_id required"}
    proc = subprocess.run(
        ["gcloud", "config", "set", "project", project_id],
        capture_output=True,
        text=True,
        timeout=30,
        cwd=str(REPO_ROOT),
    )
    if proc.returncode != 0:
        return {"ok": False, "error": (proc.stderr or proc.stdout or "gcloud failed")[:300]}
    os.environ["GOOGLE_CLOUD_PROJECT"] = project_id
    return {"ok": True, "project": project_id, "message": f"Active gcloud project set to {project_id}"}


def suite_plan(config_path: str, force_fixture: bool = False) -> list[dict[str, Any]]:
    creds = credential_status(config_path)
    use_live = not force_fixture and creds.get("live_parity_ready")
    steps = [
        {"action": "verify_parts", "label": "Verify 5 hackathon parts"},
        {"action": "verify_dpdp", "label": "Verify DPDP module"},
        {"action": "verify_matomo", "label": "Verify Matomo API"},
        {
            "action": "migrate_live" if use_live and creds.get("live_migration_ready") else "migrate_fixture",
            "label": "Migration agent (live)" if use_live else "Migration agent (fixture)",
        },
        {
            "action": "parity_live" if use_live else "parity_fixture_ok",
            "label": "Parity (live, yesterday)" if use_live else "Parity (fixture, yesterday)",
            "params": {"date_offset": 1},
        },
        {
            "action": "parity_live" if use_live else "parity_fixture_ok",
            "label": "Parity (live, 2 days ago)" if use_live else "Parity (fixture, 2 days ago)",
            "params": {"date_offset": 2},
        },
        {"action": "connectors_test", "label": "Connectors test"},
        {"action": "history_fixture_dry", "label": "GA4 history import (dry-run)"},
    ]
    return steps


def format_suite_log(result: dict[str, Any]) -> str:
    """Human-readable last-run log (avoids huge JSON)."""
    mode_label = "fixture-only" if not result.get("live_mode") else "live (default)"
    lines = [
        f"OYDK demo suite — {mode_label} — overall: {result.get('status')}",
        f"Config: {result.get('config')}",
        "",
    ]
    for step in result.get("steps") or []:
        mark = "OK" if step.get("status") == "ok" else "FAIL"
        line = f"[{mark}] {step.get('label')} ({step.get('action')})"
        res = step.get("result") or {}
        if res.get("mode"):
            line += f" — mode={res['mode']}"
        if res.get("date"):
            line += f" — date={res['date']}"
        if res.get("all_within_target") is not None:
            line += f" — within_target={res['all_within_target']}"
        lines.append(line)
        if step.get("stderr"):
            lines.append(f"    error: {step['stderr'][:300]}")
    lines.append("")
    lines.append("Parity: live rows use GA4+Matomo APIs; fixture rows use snapshot (parity-*-fixture.json).")
    lines.append("Download Parity CSV for full history with a 'mode' column per run.")
    return "\n".join(lines)


def run_demo_suite(config_path: str, force_fixture: bool = False) -> dict[str, Any]:
    from demo.console.actions import run_action
    from demo.console.evidence import build_suite_evidence

    steps = suite_plan(config_path, force_fixture=force_fixture)
    results: list[dict[str, Any]] = []
    overall = "ok"
    for step in steps:
        out = run_action(step["action"], config_path, step.get("params") or {})
        row = {
            "action": step["action"],
            "label": step["label"],
            "status": out.get("status"),
            "stdout": (out.get("stdout") or "")[:4000],
            "stderr": (out.get("stderr") or "")[:500],
            "result": out.get("result"),
        }
        results.append(row)
        if out.get("status") == "error":
            overall = "partial"
    return {
        "status": overall,
        "config": config_path,
        "steps": results,
        "live_mode": not force_fixture,
        "evidence": build_suite_evidence(config_path),
    }
