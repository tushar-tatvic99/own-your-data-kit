"""Infra readiness checks for the demo console."""

import os
from typing import Any

import requests

from kit.env import load_kit_env

load_kit_env()


def verify_infra(shop_url: str | None = None, kit_url: str | None = None) -> dict[str, Any]:
    kit = (kit_url or os.environ.get("KIT_API_URL") or "http://35.234.210.199:8090").rstrip("/")
    shop = (shop_url or "").rstrip("/")

    checks: list[dict[str, Any]] = []

    def probe(name: str, url: str, required: bool = True) -> None:
        row = {"name": name, "url": url, "required": required, "ok": False, "detail": ""}
        try:
            r = requests.get(url, timeout=12)
            row["ok"] = r.status_code == 200
            row["status_code"] = r.status_code
            row["detail"] = r.text[:300] if r.text else ""
            if r.status_code == 200:
                try:
                    row["json"] = r.json()
                except Exception:
                    pass
        except Exception as exc:
            row["detail"] = str(exc)
        checks.append(row)

    probe("Kit API /health", f"{kit}/health")
    probe("Kit API /audit", f"{kit}/audit")
    if shop:
        probe("Shop /api/dpdp/summary", f"{shop}/api/dpdp/summary")
    else:
        checks.append(
            {
                "name": "Shop /api/dpdp/summary",
                "required": True,
                "ok": False,
                "detail": "Set website_url in config/client.yaml",
            }
        )

    key = os.environ.get("OYDK_OPENAI_API_KEY") or os.environ.get("OPENAI_API_KEY")
    llm_ok = bool(key and "your-" not in key.lower() and not key.startswith("sk-placeholder"))
    checks.append(
        {
            "name": "Matomo agent (OYDK_OPENAI_API_KEY)",
            "required": False,
            "ok": llm_ok,
            "detail": "Set in .env for OpenAI answers; rule-based mode works without it",
        }
    )

    required_fail = [c for c in checks if c.get("required") and not c.get("ok")]
    return {
        "all_required_ok": len(required_fail) == 0,
        "checks": checks,
        "fix_commands": [
            "gcloud auth login",
            ".\\scripts\\restart-kit-api.ps1",
            ".\\scripts\\deploy-infinity-shop.ps1",
            "Add OYDK_OPENAI_API_KEY to .env (optional)",
        ],
    }
