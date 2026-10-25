"""Validate Matomo API token from config + environment."""

import os
import re

import click
import requests

from kit.env import load_kit_env

_PLACEHOLDER = re.compile(r"^\$\{[^}]+\}$")


def resolve_matomo_token(raw: str) -> str:
    load_kit_env()
    if not raw or _PLACEHOLDER.match(str(raw).strip()):
        raw = os.environ.get("MATOMO_API_TOKEN", "")
    token = (raw or "").strip()
    if _PLACEHOLDER.match(token):
        token = ""
    if not token:
        raise click.ClickException(
            "MATOMO_API_TOKEN is missing. Copy .env.example → .env and set your token."
        )
    return token


def verify_matomo_token(base_url: str, token: str, site_id: int = 1) -> None:
    """Fail fast if token cannot call Matomo API (secure tokens require POST)."""
    url = base_url.rstrip("/") + "/index.php"
    resp = requests.post(
        url,
        data={
            "module": "API",
            "method": "API.getMatomoVersion",
            "format": "JSON",
            "token_auth": token,
        },
        timeout=30,
    )
    if resp.status_code == 401:
        raise click.ClickException(
            "Matomo API returned 401 Unauthorized. Update MATOMO_API_TOKEN in repo-root .env "
            "(Matomo → Personal → Security). If .env is already correct, clear a stale "
            "shell variable: Remove-Item Env:MATOMO_API_TOKEN -ErrorAction SilentlyContinue"
        )
    if resp.status_code >= 400:
        try:
            msg = resp.json().get("message", resp.text[:200])
        except Exception:
            msg = resp.text[:200]
        hint = ""
        if "too many failed logins" in msg.lower():
            hint = (
                " Run deploy/docker/clear-matomo-brute-force.sh on the Matomo VM "
                "(failed API calls with a bad token count as login failures)."
            )
        raise click.ClickException(f"Matomo API error {resp.status_code}: {msg}.{hint}")
