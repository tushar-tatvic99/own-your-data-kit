"""Demo console — Matomo account provisioning for Your Analytics Setup."""

import json
import os
from pathlib import Path
from typing import Any

from kit.config import load_config
from kit.env import load_kit_env
from kit.matomo_provision import provision_matomo_account, provision_status, provision_token_from_env

REPO_ROOT = Path(__file__).resolve().parents[2]
PROVISION_LOG = REPO_ROOT / "output" / "demo-console" / "matomo-provision-latest.json"


def default_matomo_url(config_path: str) -> str:
    load_kit_env()
    try:
        cfg = load_config(config_path)
        return (cfg.get("stack") or {}).get("url") or ""
    except Exception:
        return os.getenv("OYDK_DEFAULT_MATOMO_URL", "https://matomo.35-234-210-199.nip.io")


def get_provision_status(config_path: str) -> dict[str, Any]:
    return provision_status(default_matomo_url(config_path))


def _is_oydk_hosted_matomo(matomo_url: str, default_url: str) -> bool:
    base = (matomo_url or "").strip().rstrip("/")
    env_default = (default_url or "").strip().rstrip("/")
    if not base:
        return False
    if env_default and base == env_default:
        return True
    return "35-234-210-199" in base


def run_provision(config_path: str, fields: dict[str, Any]) -> dict[str, Any]:
    matomo_url = (fields.get("matomo_url") or "").strip() or default_matomo_url(config_path)
    default_url = default_matomo_url(config_path)
    inline = (fields.get("provision_token") or "").strip()
    env_token = provision_token_from_env()
    if _is_oydk_hosted_matomo(matomo_url, default_url) and not inline:
        token = env_token
    else:
        token = inline or env_token
        if not inline and matomo_url and not _is_oydk_hosted_matomo(matomo_url, default_url):
            raise RuntimeError(
                "For your own Matomo on GCP, finish the install wizard, then paste the "
                "superuser API token in Step 1 before Create Matomo site."
            )
    result = provision_matomo_account(
        matomo_url=matomo_url,
        provision_token=token,
        email=(fields.get("provision_email") or fields.get("alert_emails") or "").split(",")[0].strip(),
        site_name=(fields.get("client_name") or fields.get("site_name") or "OYDK Site").strip(),
        website_url=(fields.get("website_url") or "").strip(),
        client_name=(fields.get("client_name") or "client").strip(),
    )
    PROVISION_LOG.parent.mkdir(parents=True, exist_ok=True)
    safe = {k: v for k, v in result.items() if k not in ("api_token", "user_password")}
    safe["api_token_set"] = bool(result.get("api_token"))
    PROVISION_LOG.write_text(json.dumps(safe, indent=2), encoding="utf-8")
    snippet_path = REPO_ROOT / "output" / "demo-console" / "matomo-env-snippet.txt"
    snippet_path.write_text(
        f"# Add to your repo .env (one-time — do not commit)\n{result.get('env_snippet')}\n",
        encoding="utf-8",
    )
    if result.get("api_token"):
        os.environ["MATOMO_API_TOKEN"] = result["api_token"]
    return result
