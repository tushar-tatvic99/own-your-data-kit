"""Where the demo console is running (local laptop vs hosted / Cloud Run)."""

import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def _truthy(name: str) -> bool:
    return os.environ.get(name, "").strip().lower() in ("1", "true", "yes")


def deploy_capabilities() -> dict:
    # Cloud Run sets K_SERVICE. OYDK_HOSTED_UI=1 = LAN/prod host for other PCs
    # (Deploy downloads OYDK-Deploy.cmd instead of opening PowerShell on the server).
    hosted = bool(os.environ.get("K_SERVICE")) or _truthy("OYDK_HOSTED_UI")
    windows = os.name == "nt"
    deploy_script = (REPO_ROOT / "deploy" / "deploy.ps1").is_file()
    return {
        "host": "cloud_run" if hosted else "local",
        "browser_only_for_judges": True,
        "hosted_console_url": os.environ.get(
            "OYDK_HOSTED_CONSOLE_URL",
            "https://oydk-demo-console-qvoqwz57fq-el.a.run.app",
        ),
        "can_run_gcp_deploy": (not hosted) and windows and deploy_script,
        "can_run_local_docker": (not hosted) and windows and deploy_script,
        "can_gcloud_login_from_ui": (not hosted) and windows,
        "gcloud_hint": (
            "gcloud runs on your PC only. On Demo mode use Sign in to Google Cloud, "
            "or run: gcloud auth login"
            if not hosted
            else "This console is hosted — Deploy downloads OYDK-Deploy.cmd to run on the visitor PC (gcloud + Terraform there)."
        ),
    }
