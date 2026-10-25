"""Local demo console — product UI for deploy, migrate, parity, DPDP, connectors, stretch."""

import base64
import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

import requests

from demo.console.actions import run_action
from demo.console.dashboard import (
    bq_export_guide,
    connectors_dashboard,
    dpdp_dashboard,
    migration_bundle,
    migration_dashboard,
    parity_dashboard,
)
from demo.console.connector_views import connector_view
from demo.console.deploy_wizard import (
    deploy_preflight,
    get_deploy_status,
    preview_deploy,
    save_client_config,
    start_deploy,
    start_deploy_in_terminal,
)
from demo.console.auth_guide import google_auth_guide
from demo.console.runtime import deploy_capabilities
from demo.console.matomo_setup import get_provision_status, run_provision
from demo.console.infra import verify_infra
from demo.console.session import (
    active_config_path,
    format_suite_log,
    run_demo_suite,
    session_status,
    set_custom_mode,
    set_default_mode,
    set_gcloud_project,
    start_gcloud_login,
)
from demo.console.matomo_agent import chat as agent_chat
from demo.console.matomo_agent import list_matomo_sites
from kit.config import load_config
from kit.env import load_kit_env

STATIC = Path(__file__).resolve().parent / "static"
# Bump when static UI changes; Cloud Run must be redeployed to pick up new assets.
CONSOLE_UI_VERSION = "20261025t"
REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CONFIG = os.environ.get("OYDK_CONFIG", "config/client.yaml")


def _cfg() -> str:
    return active_config_path()
PORT = int(os.environ.get("PORT", os.environ.get("OYDK_DEMO_PORT", "8765")))
HOST = os.environ.get("OYDK_DEMO_HOST", "127.0.0.1")
_BASIC_USER = os.environ.get("OYDK_DEMO_BASIC_USER", "")
_BASIC_PASS = os.environ.get("OYDK_DEMO_BASIC_PASSWORD", "")
LAST_RUN = REPO_ROOT / "output" / "demo-console" / "last-run.txt"
PARITY_LAST_RUN = REPO_ROOT / "output" / "demo-console" / "last-parity-run.txt"
PARITY_LATEST_REPORT = REPO_ROOT / "output" / "demo-console" / "last-parity-report.json"
PARITY_LATEST_LIVE = REPO_ROOT / "output" / "demo-console" / "last-parity-live.json"
PARITY_LATEST_FIXTURE = REPO_ROOT / "output" / "demo-console" / "last-parity-fixture.json"
PARITY_SHEET = REPO_ROOT / "output" / "parity" / "parity-daily-sheet.csv"
DEPLOY_LOG = REPO_ROOT / "output" / "demo-console" / "deploy.log"
MIGRATION_DIR = REPO_ROOT / "output" / "migration"
MIGRATION_DOWNLOAD_FILES = {
    "migration-mtm": ("mtm-container-draft.json", "oydk-mtm-container-draft.json"),
    "migration-gtm-suggested": (
        "gtm-matomo-suggested-container.json",
        "oydk-gtm-matomo-suggested-container.json",
    ),
    "migration-gtm-workspace": ("gtm-draft-bundle.json", "oydk-gtm-workspace-draft.json"),
}


def _kit_status(kit_url: str) -> dict:
    base = (kit_url or "").rstrip("/")
    if not base:
        return {"ok": False, "detail": "KIT_API_URL not set"}
    try:
        r = requests.get(f"{base}/health", timeout=8)
        return {"ok": r.status_code == 200, "detail": r.text[:200], "status_code": r.status_code}
    except Exception as exc:
        return {"ok": False, "detail": str(exc)}


def public_links(config_path: str) -> dict:
    try:
        cfg = load_config(config_path)
    except Exception:
        cfg = {}
    client = cfg.get("client", {})
    dpdp = cfg.get("dpdp", {})
    kit_api = os.environ.get("KIT_API_URL", "http://35.234.210.199:8090")
    kit = _kit_status(kit_api)
    return {
        "client": client.get("name", "demo"),
        "shop": client.get("website_url", ""),
        "matomo": cfg.get("stack", {}).get("url", ""),
        "kit_api": kit_api,
        "kit_api_ok": kit["ok"],
        "kit_api_detail": kit["detail"],
        "erasure_demo": client.get("website_url", "")
        + (
            f"?{dpdp.get('erasure_demo_email_param', 'dpdp_email')}=demo@tatvic.com#dpdp-erasure"
            if client.get("website_url")
            else ""
        ),
        "config_path": config_path,
        "parity_sheet_exists": PARITY_SHEET.is_file(),
        "parity_threshold": cfg.get("parity", {}).get("target_gap_percent", 5),
        "deploy": deploy_capabilities(),
    }


def _save_last_run(action: str, result: dict) -> None:
    LAST_RUN.parent.mkdir(parents=True, exist_ok=True)
    text = (result.get("stdout") or "") + (result.get("stderr") or "")
    res = result.get("result")
    mode = (res or {}).get("mode") if isinstance(res, dict) else ""
    date = (res or {}).get("date") if isinstance(res, dict) else ""
    if res is not None and action != "demo_suite":
        text += "\n\n" + json.dumps(res, indent=2)
    header = f"=== {action} | status={result.get('status')}"
    if mode:
        header += f" | mode={mode}"
    if date:
        header += f" | date={date}"
    header += " ===\n\n"
    body = header + text
    LAST_RUN.write_text(body, encoding="utf-8")
    if action.startswith("parity_"):
        PARITY_LAST_RUN.write_text(body, encoding="utf-8")
        res = result.get("result")
        if isinstance(res, dict) and res.get("gaps"):
            PARITY_LATEST_REPORT.parent.mkdir(parents=True, exist_ok=True)
            payload = json.dumps(
                {
                    "action": action,
                    "report": res,
                    "report_file": res.get("report_file"),
                },
                indent=2,
                default=str,
            )
            PARITY_LATEST_REPORT.write_text(payload, encoding="utf-8")
            mode = res.get("mode")
            if mode == "live" or action == "parity_live":
                PARITY_LATEST_LIVE.write_text(payload, encoding="utf-8")
            if mode == "fixture" or action.startswith("parity_fixture") or action == "parity_break_purchase":
                PARITY_LATEST_FIXTURE.write_text(payload, encoding="utf-8")


class DemoHandler(BaseHTTPRequestHandler):
    def _check_basic_auth(self) -> bool:
        if not _BASIC_USER:
            return True
        header = self.headers.get("Authorization") or ""
        if not header.startswith("Basic "):
            return False
        try:
            decoded = base64.b64decode(header[6:]).decode("utf-8")
            user, _, password = decoded.partition(":")
            return user == _BASIC_USER and password == _BASIC_PASS
        except Exception:
            return False

    def _require_auth(self) -> bool:
        if self._check_basic_auth():
            return True
        self.send_response(401)
        self.send_header("WWW-Authenticate", 'Basic realm="OYDK Demo Console"')
        self.end_headers()
        return False

    def _read_body(self) -> dict:
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length).decode("utf-8") if length else "{}"
        try:
            return json.loads(raw) if raw.strip() else {}
        except json.JSONDecodeError:
            return {}

    def _config_from_body(self, body: dict) -> str:
        return body.get("config") or _cfg()

    def _send_json(self, code: int, payload: dict) -> None:
        body = json.dumps(payload, default=str).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_download(
        self, path: Path, filename: str, content_type: str, placeholder: str | None = None
    ) -> None:
        if path.is_file():
            data = path.read_bytes()
        elif placeholder is not None:
            data = placeholder.encode("utf-8")
        else:
            data = (
                f"(No file yet — run an action in the console first.)\nExpected: {path}\n"
            ).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _send_file(self, path: Path, content_type: str) -> None:
        if not path.is_file():
            self.send_error(404)
            return
        data = path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self) -> None:
        if not self._require_auth():
            return
        load_kit_env()
        parsed = urlparse(self.path)
        path = parsed.path
        if path == "/favicon.ico":
            self.send_response(204)
            self.end_headers()
            return
        if path in ("/", "/index.html"):
            return self._send_file(STATIC / "index.html", "text/html; charset=utf-8")
        if path == "/app.js":
            return self._send_file(STATIC / "app.js", "application/javascript")
        if path == "/styles.css":
            return self._send_file(STATIC / "styles.css", "text/css")
        if path == "/api/console/meta":
            return self._send_json(
                200,
                {
                    "api_level": 2,
                    "ui_version": CONSOLE_UI_VERSION,
                    "routes": [
                        "auth/google-guide",
                        "matomo/provision",
                        "gcloud/login",
                        "deploy/start-terminal",
                        "deploy/preflight",
                        "deploy/status",
                    ],
                },
            )
        if path == "/api/links":
            return self._send_json(200, public_links(_cfg()))
        if path == "/api/session/status":
            try:
                return self._send_json(200, session_status())
            except Exception as exc:
                return self._send_json(500, {"error": str(exc)})
        if path == "/api/dashboard/parity":
            try:
                return self._send_json(200, parity_dashboard(_cfg()))
            except Exception as exc:
                return self._send_json(500, {"error": str(exc)})
        if path == "/api/dashboard/migration":
            try:
                return self._send_json(200, migration_dashboard(_cfg()))
            except Exception as exc:
                return self._send_json(500, {"error": str(exc)})
        if path.startswith("/api/migration/bundle"):
            from urllib.parse import parse_qs

            qs = parse_qs(parsed.query)
            kind = (qs.get("kind") or [""])[0]
            try:
                return self._send_json(200, migration_bundle(kind))
            except Exception as exc:
                return self._send_json(500, {"error": str(exc)})
        if path == "/api/auth/google-guide":
            try:
                return self._send_json(200, google_auth_guide(_cfg(), deploy_capabilities()))
            except Exception as exc:
                return self._send_json(500, {"error": str(exc)})
        if path == "/api/matomo/provision/status":
            try:
                return self._send_json(200, get_provision_status(_cfg()))
            except Exception as exc:
                return self._send_json(500, {"error": str(exc)})
        if path.startswith("/api/deploy/status"):
            from urllib.parse import parse_qs

            qs = parse_qs(parsed.query)
            client = (qs.get("client_name") or qs.get("client") or [""])[0]
            try:
                return self._send_json(200, get_deploy_status(client))
            except Exception as exc:
                return self._send_json(500, {"error": str(exc)})
        if path.startswith("/api/deploy/preflight"):
            from urllib.parse import parse_qs

            qs = parse_qs(parsed.query)
            local_only = (qs.get("local_only") or ["0"])[0] in ("1", "true", "yes")
            try:
                return self._send_json(200, deploy_preflight(local_only=local_only))
            except Exception as exc:
                return self._send_json(500, {"error": str(exc)})
        if path == "/api/dashboard/dpdp":
            try:
                return self._send_json(200, dpdp_dashboard(_cfg()))
            except Exception as exc:
                return self._send_json(500, {"error": str(exc)})
        if path == "/api/dashboard/connectors":
            try:
                return self._send_json(200, connectors_dashboard(_cfg()))
            except Exception as exc:
                return self._send_json(500, {"error": str(exc)})
        if path.startswith("/api/connectors/view"):
            from urllib.parse import parse_qs

            qs = parse_qs(parsed.query)
            cid = (qs.get("id") or [""])[0]
            if not cid:
                return self._send_json(400, {"error": "id query param required"})
            try:
                return self._send_json(200, connector_view(cid, _cfg()))
            except Exception as exc:
                return self._send_json(500, {"error": str(exc)})
        if path == "/api/bq/guide":
            try:
                return self._send_json(200, bq_export_guide(_cfg()))
            except Exception as exc:
                return self._send_json(500, {"error": str(exc)})
        if path == "/api/agent/sites":
            try:
                return self._send_json(200, {"sites": list_matomo_sites(_cfg())})
            except Exception as exc:
                return self._send_json(500, {"error": str(exc)})
        if path == "/api/infra/verify":
            try:
                cfg = load_config(_cfg())
                shop = (cfg.get("client") or {}).get("website_url", "")
                return self._send_json(200, verify_infra(shop_url=shop))
            except Exception as exc:
                return self._send_json(500, {"error": str(exc)})
        if path == "/api/download/last-run":
            return self._send_download(
                LAST_RUN,
                "oydk-last-run.log",
                "text/plain; charset=utf-8",
                placeholder="No runs yet. Click any action (e.g. Migration or Parity), then download again.\n",
            )
        mig_dl_key = path.removeprefix("/api/download/")
        if mig_dl_key in MIGRATION_DOWNLOAD_FILES:
            on_disk, dl_name = MIGRATION_DOWNLOAD_FILES[mig_dl_key]
            return self._send_download(
                MIGRATION_DIR / on_disk,
                dl_name,
                "application/json; charset=utf-8",
                placeholder='{"error":"Run Migration agent first (fixture or live)."}\n',
            )
        if path == "/api/download/parity-sheet":
            header = (
                "run_at_utc,report_date,mode,target_gap_percent,all_within_target,"
                "missed_count,missed_metrics,email_sent,simulated_break_tag\n"
            )
            return self._send_download(
                PARITY_SHEET,
                "parity-daily-sheet.csv",
                "text/csv; charset=utf-8",
                placeholder=header,
            )
        if path == "/api/download/deploy-log":
            return self._send_download(
                DEPLOY_LOG,
                "oydk-deploy.log",
                "text/plain; charset=utf-8",
                placeholder="No deploy started yet. Use Deploy to GCP on the Deploy tab.\n",
            )
        self.send_error(404)

    def do_POST(self) -> None:
        if not self._require_auth():
            return
        load_kit_env()
        parsed = urlparse(self.path)
        path = parsed.path
        body = self._read_body()
        config = self._config_from_body(body)

        if path == "/api/session/default":
            return self._send_json(200, set_default_mode())
        if path == "/api/session/custom":
            return self._send_json(200, set_custom_mode(body.get("fields") or {}))
        if path == "/api/gcloud/login":
            return self._send_json(
                200,
                start_gcloud_login((body.get("gcp_project_id") or "").strip()),
            )
        if path == "/api/gcloud/set-project":
            return self._send_json(200, set_gcloud_project((body.get("gcp_project_id") or "").strip()))
        if path == "/api/demo/run-suite":
            force_fixture = bool(body.get("fixture_only"))
            try:
                result = run_demo_suite(_cfg(), force_fixture=force_fixture)
                _save_last_run(
                    "demo_suite",
                    {
                        "status": result["status"],
                        "stdout": format_suite_log(result),
                        "stderr": "",
                    },
                )
                return self._send_json(200, result)
            except Exception as exc:
                return self._send_json(500, {"error": str(exc)})
        if path == "/api/matomo/provision":
            try:
                result = run_provision(_cfg(), body.get("fields") or body)
                return self._send_json(200, result)
            except Exception as exc:
                msg = str(exc)
                if hasattr(exc, "response") and getattr(exc, "response", None) is not None:
                    try:
                        msg = exc.response.text[:400] or msg
                    except Exception:
                        pass
                return self._send_json(400, {"ok": False, "error": msg})
        if path == "/api/deploy/preview":
            return self._send_json(200, preview_deploy(body.get("fields") or {}))
        if path == "/api/deploy/save-config":
            return self._send_json(200, save_client_config(body.get("fields") or {}))
        if path == "/api/deploy/start":
            fields = body.get("fields") or {}
            if body.get("interactive_terminal"):
                return self._send_json(200, start_deploy_in_terminal(fields))
            return self._send_json(
                200,
                start_deploy(fields, local_only=bool(body.get("local_only"))),
            )
        if path == "/api/deploy/start-terminal":
            return self._send_json(200, start_deploy_in_terminal(body.get("fields") or {}))
        if path == "/api/agent/chat":
            msg = (body.get("message") or "").strip()
            if not msg:
                return self._send_json(400, {"error": "message required"})
            try:
                return self._send_json(
                    200,
                    agent_chat(config, msg, site_id=body.get("site_id")),
                )
            except Exception as exc:
                return self._send_json(500, {"error": str(exc)})

        if path != "/api/run":
            self.send_error(404)
            return

        action = body.get("action", "")
        params = body.get("params") or {}
        result = run_action(action, config, params)
        _save_last_run(action, result)
        result["downloads"] = {
            "last_run": "/api/download/last-run",
            "parity_sheet": "/api/download/parity-sheet" if PARITY_SHEET.is_file() else None,
            "deploy_log": "/api/download/deploy-log" if DEPLOY_LOG.is_file() else None,
        }
        self._send_json(200, result)

    def log_message(self, fmt: str, *args) -> None:
        if os.environ.get("OYDK_DEMO_QUIET", "").strip() in ("1", "true", "yes"):
            return
        print(f"[demo-console] {args[0]}")


def _ensure_download_stubs() -> None:
    LAST_RUN.parent.mkdir(parents=True, exist_ok=True)
    if not LAST_RUN.is_file():
        LAST_RUN.write_text(
            "OYDK demo console — no actions run yet.\n",
            encoding="utf-8",
        )


def main() -> None:
    load_kit_env()
    _ensure_download_stubs()
    server = ThreadingHTTPServer((HOST, PORT), DemoHandler)
    quiet = os.environ.get("OYDK_DEMO_QUIET", "").strip() in ("1", "true", "yes")
    if not quiet:
        print(f"OYDK Demo Console: http://{HOST}:{PORT}")
        print(f"Config: {_cfg()} (default bundle: config/client.yaml + .env)")
    server.serve_forever()


if __name__ == "__main__":
    main()
