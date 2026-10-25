"""Deploy wizard — collect inputs, write client YAML, start deploy.ps1."""

import os
import re
import shutil
import subprocess
from pathlib import Path
from typing import Any

import yaml

REPO_ROOT = Path(__file__).resolve().parents[2]
GENERATED_CONFIG = REPO_ROOT / "output" / "demo-console" / "generated-client.yaml"
DEPLOY_LOG = REPO_ROOT / "output" / "demo-console" / "deploy.log"
DEPLOY_OUTPUT_DIR = REPO_ROOT / "output" / "deploy"

DEFAULT_MATOMO_URL = os.environ.get(
    "OYDK_DEFAULT_MATOMO_URL", "https://matomo.35-234-210-199.nip.io"
)
DEFAULT_SHOP_URL = "https://auraandblush-61760469326.asia-south1.run.app"


def _normalize_deploy_fields(fields: dict[str, Any]) -> dict[str, Any]:
    """Fill gaps so generated YAML never keeps placeholder analytics.example.com."""
    out = dict(fields or {})
    matomo = (out.get("matomo_url") or "").strip()
    if not matomo or "example.com" in matomo:
        out["matomo_url"] = DEFAULT_MATOMO_URL
    shop = (out.get("website_url") or "").strip()
    if not shop:
        out["website_url"] = DEFAULT_SHOP_URL
    if not (out.get("site_id") or "").strip():
        out["site_id"] = "1"
    if not (out.get("client_name") or "").strip():
        out["client_name"] = "aurablush"
    return out


def _template_from_fields(fields: dict[str, Any]) -> dict:
    fields = _normalize_deploy_fields(fields)
    return {
        "client": {
            "name": fields.get("client_name") or "demo-client",
            "region": fields.get("region") or "asia-south1",
            "website_url": fields.get("website_url") or DEFAULT_SHOP_URL,
        },
        "stack": {
            "type": "matomo",
            "url": fields.get("matomo_url") or DEFAULT_MATOMO_URL,
            "site_id": int(fields.get("site_id") or 1),
            "api_token": "${MATOMO_API_TOKEN}",
        },
        "ga4": {
            "property_id": str(fields.get("ga4_property_id") or ""),
            "measurement_id": fields.get("ga4_measurement_id") or "G-XXXXXXXX",
            "credentials_file": fields.get("ga_credentials") or "credentials/ga-service-account.json",
        },
        "gtm": {
            "account_id": str(fields.get("gtm_account_id") or ""),
            "container_id": str(fields.get("gtm_container_id") or ""),
            "credentials_file": fields.get("ga_credentials") or "credentials/ga-service-account.json",
        },
        "dpdp": {
            "require_consent": True,
            "cmp_provider": fields.get("cmp_provider") or "cookieconsent",
            "data_retention_days": int(fields.get("retention_days") or 365),
            "pii_scrub_enabled": True,
            "audit_log_enabled": True,
        },
        "parity": {
            "target_gap_percent": float(fields.get("parity_threshold") or 5),
            "email_daily_report": True,
            "alert_emails": [
                e.strip()
                for e in (
                    fields.get("alert_emails")
                    or "mohit@tatvic.com,tushar@tatvic.com,parshwa@tatvic.com,dhruvi.p@tatvic.com,prakash.katariya@tatvic.com"
                ).split(",")
                if e.strip()
            ],
        },
        "connectors": {
            "demo_mode": bool(fields.get("connectors_demo", False)),
            "bigquery": {
                "project_id": fields.get("gcp_project_id") or "",
                "dataset": fields.get("bq_dataset") or "matomo_export",
                "table": "events",
            },
        },
        "migration": {
            "gtm_draft_only": True,
            "output_dir": "output/migration",
        },
    }


def preview_deploy(fields: dict[str, Any]) -> dict[str, Any]:
    project = fields.get("gcp_project_id") or "<gcp-project-id>"
    client = fields.get("client_name") or "demo"
    profile = fields.get("profile") or "standard"
    cmd = (
        f".\\deploy\\enterprise-deploy.ps1 -NonInteractive -Mode Gcp "
        f"-ProjectId {project} -ClientName {client} -Profile {profile} "
        f"-Ga4PropertyId {fields.get('ga4_property_id') or '560630351'} "
        f"-GtmContainerId {fields.get('gtm_container_id') or '283402441'} "
        f"-AlertEmails {fields.get('alert_emails') or 'mohit@tatvic.com,tushar@tatvic.com,parshwa@tatvic.com,dhruvi.p@tatvic.com,prakash.katariya@tatvic.com'}"
    )
    interactive_cmd = ".\\deploy\\enterprise-deploy.ps1"
    checklist = [
        "gcloud auth login && gcloud config set project " + project,
        "Billing enabled on the GCP project",
        "MATOMO_API_TOKEN in deploy/docker/.env after Matomo wizard",
        "credentials/ga-service-account.json for live migration & parity",
    ]
    return {
        "command": cmd,
        "interactive_command": interactive_cmd,
        "checklist": checklist,
        "local_docker": ".\\deploy\\enterprise-deploy.ps1 then choose option 2 (On-Premise Docker)",
        "dry_run_command": (
            f".\\deploy\\enterprise-deploy.ps1 -NonInteractive -Mode DryRun "
            f"-ProjectId {project} -ClientName {client} -Profile {profile}"
        ),
        "yaml_preview": yaml.safe_dump(_template_from_fields(fields), sort_keys=False),
    }


def save_client_config(fields: dict[str, Any]) -> dict[str, Any]:
    GENERATED_CONFIG.parent.mkdir(parents=True, exist_ok=True)
    doc = _template_from_fields(_normalize_deploy_fields(fields))
    GENERATED_CONFIG.write_text(yaml.safe_dump(doc, sort_keys=False), encoding="utf-8")
    return {"path": str(GENERATED_CONFIG.relative_to(REPO_ROOT)), "absolute": str(GENERATED_CONFIG)}


def _parse_matomo_url_from_text(text: str) -> str:
    for pattern in (
        r"\|\s*Matomo\s*\|\s*(https://[^\s|]+)",
        r"Matomo:\s+(https://[^\s]+)",
        r"matomo_url\s*=\s*(https://[^\s]+)",
    ):
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            return m.group(1).strip().rstrip("/")
    return ""


def _last_deploy_log_segment(raw: str) -> str:
    parts = raw.split("--- deploy start ---")
    return parts[-1] if parts else raw


def _extract_deploy_failure(segment: str) -> str:
    for line in reversed(segment.splitlines()):
        s = line.strip()
        if not s:
            continue
        if any(
            x in s
            for x in (
                "CommandNotFoundException",
                "not recognized",
                "Terraform apply failed",
                "throw ",
                "authentication required",
            )
        ):
            return s[:500]
    return ""


def deploy_preflight(local_only: bool = False) -> dict[str, Any]:
    from demo.console.runtime import deploy_capabilities

    caps = deploy_capabilities()
    checks: list[dict[str, Any]] = []

    def add(name: str, ok: bool, hint: str, required: bool = True) -> None:
        checks.append({"name": name, "ok": ok, "hint": hint, "required": required})

    if caps["host"] == "cloud_run":
        add("Windows laptop with gcloud", False, "GCP deploy cannot run inside Cloud Run", True)
        return {
            "ready": False,
            "checks": checks,
            "message": "Run Deploy Matomo on my GCP from the demo console on your PC, not the hosted URL.",
        }

    add("gcloud CLI", bool(shutil.which("gcloud")), "Install Google Cloud SDK and run gcloud auth login")
    if local_only:
        add("docker", bool(shutil.which("docker")), "Install Docker Desktop for local Matomo stack")
    else:
        add(
            "terraform",
            bool(shutil.which("terraform")),
            "Install Terraform and add to PATH: https://developer.hashicorp.com/terraform/install",
        )
    add(
        "deploy script",
        (REPO_ROOT / "deploy" / "enterprise-deploy.ps1").is_file(),
        "Clone the full OYDK repo",
    )

    required_fail = [c for c in checks if c.get("required") and not c.get("ok")]
    message = "Ready to deploy." if not required_fail else required_fail[0]["hint"]
    return {
        "ready": len(required_fail) == 0,
        "checks": checks,
        "message": message,
        "capabilities": caps,
    }


def get_deploy_status(client_name: str = "") -> dict[str, Any]:
    """Tail deploy log and discover Matomo URL from log or post-deploy checklist."""
    matomo_url = ""
    checklist_path = ""
    slug = (client_name or "").strip()
    if slug:
        checklist = DEPLOY_OUTPUT_DIR / f"{slug}-post-deploy-checklist.md"
        if checklist.is_file():
            checklist_path = str(checklist.relative_to(REPO_ROOT))
            matomo_url = _parse_matomo_url_from_text(checklist.read_text(encoding="utf-8", errors="replace"))
    log_tail = ""
    segment = ""
    log_exists = DEPLOY_LOG.is_file()
    if log_exists:
        raw = DEPLOY_LOG.read_text(encoding="utf-8", errors="replace")
        log_tail = raw[-12000:]
        segment = _last_deploy_log_segment(raw)
        if not matomo_url:
            matomo_url = _parse_matomo_url_from_text(raw)
    complete = bool(
        segment
        and (
            "ONE-COMMAND DEPLOY: COMPLETE" in segment
            or "[7/7] Deployment complete" in segment
            or "Deployment complete!" in segment
        )
    )
    last_error = _extract_deploy_failure(segment) if segment else ""
    failed = bool(last_error) and not complete
    running = bool(segment.strip()) and not complete and not failed
    return {
        "log_path": str(DEPLOY_LOG.relative_to(REPO_ROOT)) if log_exists else "",
        "log_tail": log_tail,
        "matomo_url": matomo_url,
        "checklist_path": checklist_path,
        "deploy_complete": complete,
        "deploy_failed": failed,
        "deploy_running": running,
        "last_error": last_error,
    }


def start_deploy(fields: dict[str, Any], local_only: bool = False) -> dict[str, Any]:
    from demo.console.runtime import deploy_capabilities

    caps = deploy_capabilities()
    project = fields.get("gcp_project_id")
    if not project and not local_only:
        return {"started": False, "error": "gcp_project_id required"}

    if caps["host"] == "cloud_run":
        saved = save_client_config(fields)
        preview = preview_deploy(fields)
        return {
            "started": False,
            "runtime": "cloud_run",
            "capabilities": caps,
            "saved_config": saved["path"],
            "command": preview["command"],
            "checklist": preview["checklist"],
            "message": (
                "Deploy does not run inside the hosted Cloud Run console. "
                "Your YAML was saved — run the command below on a Windows PC with gcloud."
            ),
            "local_only_requested": local_only,
            "steps": [
                "On your laptop: install gcloud CLI and run gcloud auth login",
                "Clone this repo (or use the same release) and copy your .env + credentials",
                f"Saved profile: {saved['path']}",
                "Open PowerShell in the repo root and run the deploy command shown below",
                "Or run locally: py -3 -m kit.cli demo-ui → Demo → Sign in to Google Cloud → Deploy to GCP",
            ],
            "doc": "docs/run-console-on-your-pc.md",
        }

    if not caps["can_run_gcp_deploy"] and not local_only:
        return {
            "started": False,
            "runtime": caps["host"],
            "capabilities": caps,
            "error": "GCP deploy is only supported from Windows with deploy/deploy.ps1 in this repo.",
            "message": caps["gcloud_hint"],
        }
    preflight = deploy_preflight(local_only=local_only)
    if not preflight.get("ready"):
        return {
            "started": False,
            "runtime": caps["host"],
            "capabilities": caps,
            "preflight": preflight,
            "error": preflight.get("message"),
            "message": preflight.get("message"),
            "log": str(DEPLOY_LOG.relative_to(REPO_ROOT)),
        }
    client = fields.get("client_name") or "demo"
    profile = fields.get("profile") or "standard"
    script = REPO_ROOT / "deploy" / "enterprise-deploy.ps1"
    DEPLOY_LOG.parent.mkdir(parents=True, exist_ok=True)
    env = dict(os.environ)
    if local_only:
        env["OYDK_LOCAL"] = "1"
    ga4 = fields.get("ga4_property_id") or "560630351"
    gtm = fields.get("gtm_container_id") or "283402441"
    emails = (
        fields.get("alert_emails")
        or "mohit@tatvic.com,tushar@tatvic.com,parshwa@tatvic.com,dhruvi.p@tatvic.com,prakash.katariya@tatvic.com"
    )
    mode = "OnPrem" if local_only else "Gcp"
    args = [
        "powershell",
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        str(script),
        "-NonInteractive",
        "-Mode",
        mode,
        "-ProjectId",
        project or "local",
        "-ClientName",
        client,
        "-Profile",
        profile,
        "-Ga4PropertyId",
        str(ga4),
        "-GtmContainerId",
        str(gtm),
        "-AlertEmails",
        str(emails).replace(" ", ""),
    ]
    with open(DEPLOY_LOG, "a", encoding="utf-8") as log:
        log.write(f"\n--- deploy start ---\n")
        proc = subprocess.Popen(
            args,
            cwd=str(REPO_ROOT),
            stdout=log,
            stderr=subprocess.STDOUT,
            env=env,
        )
    return {
        "started": True,
        "pid": proc.pid,
        "log": str(DEPLOY_LOG.relative_to(REPO_ROOT)),
        "capabilities": caps,
        "message": (
            "Deploy started in background on this PC. "
            "If you have not signed in yet: Demo mode → Sign in to Google Cloud (gcloud auth). "
            f"Watch log: {DEPLOY_LOG.relative_to(REPO_ROOT)} or download Deploy log from the sidebar."
        ),
        "gcloud_reminder": caps["gcloud_hint"],
    }


def start_deploy_in_terminal(fields: dict[str, Any]) -> dict[str, Any]:
    """Open a visible PowerShell window: prerequisites, gcloud auth, GCP Matomo deploy."""
    from demo.console.runtime import deploy_capabilities

    caps = deploy_capabilities()
    project = (fields.get("gcp_project_id") or "").strip()
    if not project:
        return {"started": False, "error": "gcp_project_id required"}

    if caps["host"] == "cloud_run":
        saved = save_client_config(fields)
        preview = preview_deploy(fields)
        script_rel = "scripts/matomo-gcp-deploy-terminal.ps1"
        command = (
            f".\\{script_rel} -ProjectId {project} "
            f"-ClientName {fields.get('client_name') or 'client-demo'} "
            f"-Profile {fields.get('profile') or 'standard'}"
        )
        return {
            # "started" means the hosted action finished OK (saved YAML + showed laptop command).
            "started": True,
            "runtime": "cloud_run",
            "interactive": False,
            "saved_config": saved["path"],
            "command": command,
            "message": (
                "Profile saved on the hosted console. "
                "GCP Matomo deploy needs PowerShell on your laptop — open the repo and run the command in Details."
            ),
            "steps": [
                "On your Windows laptop, open PowerShell in the OYDK repo root",
                f"Saved profile: {saved['path']}",
                f"Run: {command}",
            ],
            "checklist": preview["checklist"],
        }

    if os.name != "nt":
        return {
            "started": False,
            "error": "Interactive terminal deploy is supported on Windows only.",
            "message": "Run scripts/matomo-gcp-deploy-terminal.ps1 from the repo on Windows.",
        }

    script = REPO_ROOT / "scripts" / "matomo-gcp-deploy-terminal.ps1"
    if not script.is_file():
        return {"started": False, "error": f"Missing {script.relative_to(REPO_ROOT)}"}

    save_client_config(_normalize_deploy_fields(fields))
    client = fields.get("client_name") or "client-demo"
    profile = fields.get("profile") or "standard"
    ga4 = str(fields.get("ga4_property_id") or "560630351")
    gtm = str(fields.get("gtm_container_id") or "283402441")
    emails = (
        fields.get("alert_emails")
        or "mohit@tatvic.com,tushar@tatvic.com,parshwa@tatvic.com,dhruvi.p@tatvic.com,prakash.katariya@tatvic.com"
    )
    args = [
        "powershell.exe",
        "-NoExit",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        str(script),
        "-ProjectId",
        project,
        "-ClientName",
        str(client),
        "-Profile",
        str(profile),
        "-Ga4PropertyId",
        ga4,
        "-GtmContainerId",
        gtm,
        "-AlertEmails",
        str(emails).replace(" ", ""),
        "-RepoRoot",
        str(REPO_ROOT),
    ]
    creationflags = 0
    if hasattr(subprocess, "CREATE_NEW_CONSOLE"):
        creationflags = subprocess.CREATE_NEW_CONSOLE  # type: ignore[attr-defined]
    subprocess.Popen(args, cwd=str(REPO_ROOT), creationflags=creationflags)
    DEPLOY_LOG.parent.mkdir(parents=True, exist_ok=True)
    with open(DEPLOY_LOG, "a", encoding="utf-8") as log:
        log.write(f"\n--- deploy terminal launched ---\nproject={project} client={client}\n")
    return {
        "started": True,
        "interactive": True,
        "log": str(DEPLOY_LOG.relative_to(REPO_ROOT)),
        "capabilities": caps,
        "message": (
            "PowerShell opened on this PC. It will install Terraform/gcloud if missing, "
            "prompt Google sign-in if needed, then deploy Matomo on your GCP project. "
            "Keep that window open until it finishes; this page will refresh the log below."
        ),
    }
