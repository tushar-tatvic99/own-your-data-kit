"""Deploy wizard — collect inputs, write client YAML, start deploy.ps1."""

import json
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
GA_CREDENTIALS_REL = "credentials/ga-service-account.json"
GA_CREDENTIALS_PATH = REPO_ROOT / GA_CREDENTIALS_REL

GA_SA_PREREQ = (
    "Create a Google Cloud service account, download its JSON key, and grant that "
    "service account **Administrator** access on the GA4 property and GTM container "
    "you want to migrate (GA4 Admin → Property access; GTM Admin → User management)."
)


def _parse_ga_service_account_json(text: str) -> dict[str, Any]:
    raw = (text or "").strip()
    if not raw:
        raise ValueError("Empty file — upload the service account JSON key from Google Cloud.")
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Not valid JSON: {exc}") from exc
    if data.get("type") != "service_account":
        raise ValueError("File must be a Google service account key (type: service_account).")
    if not data.get("client_email") or not data.get("private_key"):
        raise ValueError("Invalid service account JSON: missing client_email or private_key.")
    return data


def save_ga_credentials_content(text: str) -> dict[str, Any]:
    data = _parse_ga_service_account_json(text)
    GA_CREDENTIALS_PATH.parent.mkdir(parents=True, exist_ok=True)
    normalized = json.dumps(data, indent=2)
    GA_CREDENTIALS_PATH.write_text(normalized + "\n", encoding="utf-8")
    return {
        "ok": True,
        "path": GA_CREDENTIALS_REL,
        "client_email": data.get("client_email", ""),
        "sa_project_id": data.get("project_id", ""),
        "message": "GA/GTM service account key saved for migration and parity.",
    }


def ga_credentials_status() -> dict[str, Any]:
    if not GA_CREDENTIALS_PATH.is_file():
        return {
            "present": False,
            "path": GA_CREDENTIALS_REL,
            "client_email": "",
            "prerequisite": GA_SA_PREREQ,
        }
    try:
        data = json.loads(GA_CREDENTIALS_PATH.read_text(encoding="utf-8"))
        _parse_ga_service_account_json(json.dumps(data))
        return {
            "present": True,
            "path": GA_CREDENTIALS_REL,
            "client_email": data.get("client_email", ""),
            "sa_project_id": data.get("project_id", ""),
            "prerequisite": GA_SA_PREREQ,
        }
    except Exception as exc:
        return {
            "present": False,
            "path": GA_CREDENTIALS_REL,
            "client_email": "",
            "error": str(exc),
            "prerequisite": GA_SA_PREREQ,
        }

DEFAULT_MATOMO_URL = os.environ.get(
    "OYDK_DEFAULT_MATOMO_URL", "https://matomo.35-234-210-199.nip.io"
)
DEFAULT_SHOP_URL = "https://auraandblush-61760469326.asia-south1.run.app"


def _normalize_deploy_fields(fields: dict[str, Any]) -> dict[str, Any]:
    """Fill gaps so generated YAML never keeps placeholder analytics.example.com."""
    out = dict(fields or {})
    matomo = (out.get("matomo_url") or "").strip()
    if not matomo or "example.com" in matomo:
        # Fresh GCP deploy: Matomo URL does not exist until terraform finishes.
        if (out.get("gcp_project_id") or "").strip():
            out["matomo_url"] = ""
        else:
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
        GA_SA_PREREQ,
        "Upload the service account JSON key on the Deploy tab (or place credentials/ga-service-account.json on your PC)",
        "MATOMO_API_TOKEN in deploy/docker/.env after Matomo wizard",
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

    ga_st = ga_credentials_status()
    add(
        "GA4/GTM service account JSON",
        bool(ga_st.get("present")),
        "Upload the JSON key on Deploy (SA must be Admin on your GA4 property and GTM container)",
        required=False,
    )

    if caps["host"] == "cloud_run":
        add("Windows laptop with gcloud", False, "GCP deploy cannot run inside Cloud Run", True)
        return {
            "ready": False,
            "checks": checks,
            "message": "Use Deploy to download OYDK-Deploy.cmd for your Windows PC. Upload the GA key here first so migration is ready.",
            "ga_credentials": ga_st,
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
    if not ga_st.get("present"):
        message += " Tip: upload your GA/GTM service account JSON on Deploy before migration."
    return {
        "ready": len(required_fail) == 0,
        "checks": checks,
        "message": message,
        "capabilities": caps,
        "ga_credentials": ga_st,
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
        launcher = build_powershell_launcher(fields)
        if not launcher.get("ok"):
            return {
                "started": False,
                "runtime": "cloud_run",
                "error": launcher.get("error"),
                "message": launcher.get("error"),
            }
        preview = preview_deploy(fields)
        return {
            "started": True,
            "runtime": "cloud_run",
            "download_launcher": True,
            "launcher": launcher,
            "capabilities": caps,
            "saved_config": launcher.get("saved_config"),
            "command": preview["command"],
            "checklist": preview["checklist"],
            "message": launcher["message"],
            "local_only_requested": local_only,
            "steps": [
                "Download OYDK-Deploy.cmd (automatic)",
                "Double-click it on your Windows PC",
                "PowerShell installs gcloud/Terraform if needed, signs into Google, then runs one-command deploy",
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


def build_powershell_launcher(fields: dict[str, Any]) -> dict[str, Any]:
    """Build a double-clickable .cmd that runs one-command deploy on the user's Windows PC."""
    import base64

    fields = _normalize_deploy_fields(fields)
    project = (fields.get("gcp_project_id") or "").strip()
    if not project:
        return {"ok": False, "error": "gcp_project_id required"}
    client = (fields.get("client_name") or "client-demo").strip()
    profile = (fields.get("profile") or "standard").strip()
    ga4 = (fields.get("ga4_property_id") or "560630351").strip()
    gtm = (fields.get("gtm_container_id") or "283402441").strip()
    emails = (fields.get("alert_emails") or "tushar@tatvic.com").strip()
    git_url = (
        os.environ.get("OYDK_GIT_URL") or "https://github.com/tushar-tatvic99/own-your-data-kit.git"
    ).strip()

    def q(s: str) -> str:
        return s.replace("'", "''")

    ps = f"""$ErrorActionPreference = 'Stop'
$ProjectId = '{q(project)}'
$ClientName = '{q(client)}'
$Profile = '{q(profile)}'
$Ga4PropertyId = '{q(ga4)}'
$GtmContainerId = '{q(gtm)}'
$AlertEmails = '{q(emails)}'
$GitUrl = '{q(git_url)}'
function Test-OydkRepo([string]$Path) {{
  if (-not $Path) {{ return $false }}
  return (Test-Path (Join-Path $Path 'scripts\\matomo-gcp-deploy-terminal.ps1')) -or
    (Test-Path (Join-Path $Path 'deploy\\deploy.ps1'))
}}
function Install-OydkKit([string]$Target) {{
  if (-not $GitUrl) {{ throw 'Git URL missing in launcher config.' }}
  if (Test-OydkRepo $Target) {{ return $Target }}
  if (Test-Path $Target) {{
    throw "Folder exists but is not OYDK: $Target — remove it or set OYDK_REPO to another path."
  }}
  if (-not (Get-Command git -ErrorAction SilentlyContinue)) {{
    if (Get-Command winget -ErrorAction SilentlyContinue) {{
      Write-Host "Installing Git for Windows (required to download the kit)..." -ForegroundColor Yellow
      winget install --id Git.Git -e --accept-source-agreements --accept-package-agreements
      $env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')
    }}
  }}
  if (-not (Get-Command git -ErrorAction SilentlyContinue)) {{
    throw 'Git is required to download the OYDK kit. Install from https://git-scm.com/download/win then re-run OYDK-Deploy.cmd.'
  }}
  New-Item -ItemType Directory -Force -Path (Split-Path $Target) | Out-Null
  Write-Host "Downloading Own-Your-Data kit to this PC (one-time)..." -ForegroundColor Cyan
  Write-Host "  $Target"
  git clone --depth 1 -b main $GitUrl $Target
  if ($LASTEXITCODE -ne 0) {{
    Write-Host "Retrying clone (default branch)..." -ForegroundColor Yellow
    git clone --depth 1 $GitUrl $Target
  }}
  if (-not (Test-OydkRepo $Target)) {{ throw "Download finished but deploy scripts missing under $Target" }}
  Write-Host "[OK] OYDK kit ready on this PC." -ForegroundColor Green
  return $Target
}}
function Find-OydkRepo {{
  if ($env:OYDK_REPO -and (Test-OydkRepo $env:OYDK_REPO)) {{ return $env:OYDK_REPO }}
  $candidates = @(
    (Join-Path $env:USERPROFILE 'Projects\\own-your-data-kit'),
    (Join-Path $env:USERPROFILE 'Documents\\own-your-data-kit'),
    (Join-Path $env:USERPROFILE 'own-your-data-kit')
  )
  foreach ($c in $candidates) {{
    if (Test-OydkRepo $c) {{ return $c }}
  }}
  $default = Join-Path $env:USERPROFILE 'Projects\\own-your-data-kit'
  return (Install-OydkKit $default)
}}
$Log = Join-Path $env:USERPROFILE 'oydk-deploy-launcher.log'
function Write-Log([string]$Message) {{
  $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $Message"
  Add-Content -Path $Log -Value $line -ErrorAction SilentlyContinue
  Write-Host $Message
}}
try {{
Write-Log 'OYDK launcher started on this PC'
$Repo = Find-OydkRepo
$Script = Join-Path $Repo 'scripts\\matomo-gcp-deploy-terminal.ps1'
if (-not (Test-Path $Script)) {{ throw "Missing $Script" }}
"""
    ga_write = ""
    if GA_CREDENTIALS_PATH.is_file():
        ga_b64 = base64.b64encode(GA_CREDENTIALS_PATH.read_bytes()).decode("ascii")
        ga_write = f"""
$GaCreds = Join-Path $Repo 'credentials\\ga-service-account.json'
New-Item -ItemType Directory -Force -Path (Split-Path $GaCreds) | Out-Null
[IO.File]::WriteAllBytes($GaCreds, [Convert]::FromBase64String('{ga_b64}'))
Write-Host '[OK] GA/GTM service account key copied to credentials\\ga-service-account.json' -ForegroundColor Green
"""
    ps += ga_write
    ps += """
Write-Host "OYDK one-command deploy on this PC" -ForegroundColor Cyan
Write-Host "Repo: $Repo"
Write-Host "Project: $ProjectId  Client: $ClientName  Profile: $Profile"
Write-Log "Starting deploy script: $Script"
$proc = Start-Process -FilePath powershell.exe -WorkingDirectory $Repo -PassThru -ArgumentList @(
  '-NoExit',
  '-ExecutionPolicy', 'Bypass',
  '-File', $Script,
  '-ProjectId', $ProjectId,
  '-ClientName', $ClientName,
  '-Profile', $Profile,
  '-Ga4PropertyId', $Ga4PropertyId,
  '-GtmContainerId', $GtmContainerId,
  '-AlertEmails', $AlertEmails,
  '-RepoRoot', $Repo
)
if (-not $proc) { throw 'Could not open the deploy PowerShell window.' }
Write-Host 'Deploy window opened (keep it open until deploy finishes).' -ForegroundColor Green
Write-Log 'Deploy window started'
Start-Sleep -Seconds 2
} catch {
  $err = $_.Exception.Message
  Write-Host ""
  Write-Host "OYDK launcher failed: $err" -ForegroundColor Red
  Write-Host "Log file: $Log"
  Write-Log "ERROR: $err"
  Read-Host "Press Enter to close this window"
}
"""
    b64 = base64.b64encode(ps.encode("utf-8")).decode("ascii")
    cmd = (
        "@echo off\r\n"
        "title OYDK Deploy\r\n"
        "echo OYDK Deploy - if the window closes instantly, read:\r\n"
        "echo   %USERPROFILE%\\oydk-deploy-launcher.log\r\n"
        "echo.\r\n"
        "powershell -NoProfile -NoExit -ExecutionPolicy Bypass -Command "
        "\"$log=Join-Path $env:USERPROFILE 'oydk-deploy-launcher.log'; "
        "try { "
        f"$p=Join-Path $env:TEMP 'oydk-deploy.ps1'; "
        f"[IO.File]::WriteAllText($p,[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('{b64}'))); "
        "& $p "
        "} catch { "
        "$m=$_.Exception.Message; "
        "Add-Content -Path $log -Value $m; "
        "Write-Host $m -ForegroundColor Red; "
        "Read-Host 'Press Enter to close' "
        "}\""
        "\r\n"
    )
    saved = save_client_config(fields)
    ga_st = ga_credentials_status()
    msg = (
        "Downloaded OYDK-Deploy.cmd — one file for end users. "
        "First run downloads the full OYDK kit to this PC, then deploys Matomo on their GCP."
    )
    if ga_st.get("present"):
        msg += f" Your uploaded GA key ({ga_st.get('client_email')}) is bundled into the launcher."
    else:
        msg += " Upload the GA service account JSON on Deploy before downloading if you need migration/parity."
    return {
        "ok": True,
        "filename": "OYDK-Deploy.cmd",
        "content_type": "application/octet-stream",
        "script": cmd,
        "saved_config": saved["path"],
        "ga_credentials_bundled": bool(ga_st.get("present")),
        "ga_credentials": ga_st,
        "message": msg,
    }


def start_deploy_in_terminal(fields: dict[str, Any]) -> dict[str, Any]:
    """Open a visible PowerShell window: prerequisites, gcloud auth, GCP Matomo deploy."""
    from demo.console.runtime import deploy_capabilities

    caps = deploy_capabilities()
    project = (fields.get("gcp_project_id") or "").strip()
    if not project:
        return {"started": False, "error": "gcp_project_id required"}

    if caps["host"] == "cloud_run":
        launcher = build_powershell_launcher(fields)
        if not launcher.get("ok"):
            return {"started": False, "error": launcher.get("error"), "runtime": "cloud_run"}
        preview = preview_deploy(fields)
        script_rel = "scripts/matomo-gcp-deploy-terminal.ps1"
        command = (
            f".\\{script_rel} -ProjectId {project} "
            f"-ClientName {fields.get('client_name') or 'client-demo'} "
            f"-Profile {fields.get('profile') or 'standard'}"
        )
        return {
            "started": True,
            "runtime": "cloud_run",
            "interactive": False,
            "download_launcher": True,
            "launcher": launcher,
            "saved_config": launcher.get("saved_config"),
            "command": command,
            "message": launcher["message"],
            "steps": [
                "Download OYDK-Deploy.cmd (automatic from Deploy)",
                "Double-click the file on your Windows PC",
                "Install tools → Google sign-in → one-command GCP deploy (VM + Matomo + kit)",
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
            "PowerShell opened on this PC for one-command deploy. "
            "It installs gcloud/Terraform if missing, signs you into Google if needed, "
            "then runs deploy (VM + Matomo + kit). Keep that window open; this page polls the log."
        ),
    }
