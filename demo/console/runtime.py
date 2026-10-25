"""Where the demo console is running (local laptop vs Cloud Run)."""

import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def deploy_capabilities() -> dict:
    cloud_run = bool(os.environ.get("K_SERVICE"))
    windows = os.name == "nt"
    deploy_script = (REPO_ROOT / "deploy" / "deploy.ps1").is_file()
    return {
        "host": "cloud_run" if cloud_run else "local",
        "browser_only_for_judges": True,
        "hosted_console_url": os.environ.get(
            "OYDK_HOSTED_CONSOLE_URL",
            "https://oydk-demo-console-qvoqwz57fq-el.a.run.app",
        ),
        "can_run_gcp_deploy": (not cloud_run) and windows and deploy_script,
        "can_run_local_docker": (not cloud_run) and windows and deploy_script,
        "can_gcloud_login_from_ui": (not cloud_run) and windows,
        "gcloud_hint": (
            "gcloud runs on your PC only. On Demo mode use Sign in to Google Cloud, "
            "or run: gcloud auth login"
            if not cloud_run
            else "This console is hosted on Cloud Run — run gcloud auth login on your own laptop, not in the browser."
        ),
    }
