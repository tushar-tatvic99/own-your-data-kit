"""Provision a new Matomo user + site via superuser API token (Your Analytics Setup)."""

import re
import secrets
from typing import Any

import requests


def _api(base_url: str, token: str, method: str, id_site: int | None = None, **params: Any) -> Any:
    pairs: list[tuple[str, str]] = [
        ("module", "API"),
        ("method", method),
        ("format", "JSON"),
        ("token_auth", token),
    ]
    if id_site is not None:
        pairs.append(("idSite", str(id_site)))
    for key, value in params.items():
        if key == "urls" and isinstance(value, list):
            for url in value:
                pairs.append(("urls[]", str(url)))
        elif key == "idSites":
            sites = value if isinstance(value, list) else [value]
            for sid in sites:
                pairs.append(("idSites[]", str(sid)))
        else:
            pairs.append((key, str(value)))
    resp = requests.post(f"{base_url.rstrip('/')}/index.php", data=pairs, timeout=45)
    if resp.status_code >= 400:
        raise requests.HTTPError(f"HTTP {resp.status_code}: {resp.text[:300]}", response=resp)
    body = resp.json()
    if isinstance(body, dict) and body.get("result") == "error":
        raise RuntimeError(body.get("message", "Matomo API error"))
    return body


def _api_public(base_url: str, method: str, **params: Any) -> Any:
    """Matomo API without token_auth (e.g. createAppSpecificTokenAuth for a new user)."""
    pairs: list[tuple[str, str]] = [
        ("module", "API"),
        ("method", method),
        ("format", "JSON"),
    ]
    for key, value in params.items():
        pairs.append((key, str(value)))
    resp = requests.post(f"{base_url.rstrip('/')}/index.php", data=pairs, timeout=45)
    if resp.status_code >= 400:
        raise requests.HTTPError(f"HTTP {resp.status_code}: {resp.text[:300]}", response=resp)
    body = resp.json()
    if isinstance(body, dict) and body.get("result") == "error":
        raise RuntimeError(body.get("message", "Matomo API error"))
    if isinstance(body, dict) and "value" in body:
        return body["value"]
    return body


def _login_from_email(email: str, client_name: str) -> str:
    local = (email or "").split("@")[0].lower()
    local = re.sub(r"[^a-z0-9_]", "_", local)[:24]
    brand = re.sub(r"[^a-z0-9_]", "_", (client_name or "client").lower())[:16]
    suffix = secrets.token_hex(3)
    return f"oydk_{local}_{brand}_{suffix}"


def provision_token_from_env() -> str:
    import os

    return (
        os.getenv("OYDK_MATOMO_PROVISION_TOKEN", "").strip()
        or os.getenv("MATOMO_SUPERUSER_TOKEN", "").strip()
        or os.getenv("MATOMO_API_TOKEN", "").strip()
    )


def _parse_site_id(site_id_raw: Any) -> int:
    if isinstance(site_id_raw, dict):
        return int(site_id_raw.get("value", site_id_raw))
    return int(site_id_raw)


def _resolve_user_login_by_email(base: str, provision_token: str, email: str) -> str | None:
    users = _api(base, provision_token, "UsersManager.getUsers")
    if not isinstance(users, list):
        return None
    target = email.strip().lower()
    for row in users:
        if (row.get("email") or "").strip().lower() == target:
            login = row.get("login")
            if login:
                return str(login)
    return None


def provision_status(default_matomo_url: str) -> dict[str, Any]:
    import os

    token = provision_token_from_env()
    hosted = (default_matomo_url or "").strip().rstrip("/")
    env_host = os.getenv("OYDK_DEFAULT_MATOMO_URL", "").strip().rstrip("/")
    is_hosted = bool(hosted and env_host and hosted == env_host) or bool(
        hosted and "35-234-210-199" in hosted
    )
    if token and is_hosted:
        hint = (
            "OYDK hosted Matomo — enter your work email and shop URL below, then click Create. "
            "No API token to paste; the console uses the server token."
        )
    elif token:
        hint = "Click Create to add a site on your Matomo URL (server token already configured)."
    else:
        hint = (
            "Operator: set OYDK_MATOMO_PROVISION_TOKEN in .env, or choose “My Matomo server” "
            "and paste a one-time superuser token."
        )
    return {
        "enabled": bool(token),
        "hosted_matomo": is_hosted,
        "default_matomo_url": default_matomo_url,
        "hint": hint,
        "hint_hosted": (
            "OYDK hosted Matomo — enter work email + shop URL, then Create Matomo site. "
            "No API token to paste."
        ),
        "hint_own_gcp": (
            "Your GCP Matomo — deploy the stack on your project (button below), finish the Matomo "
            "wizard in the browser, paste your superuser API token, then Create Matomo site."
        ),
        "allow_inline_token": not bool(token),
        "open_matomo_url": f"{hosted}/index.php" if hosted else "",
    }


def provision_matomo_account(
    matomo_url: str,
    provision_token: str,
    email: str,
    site_name: str,
    website_url: str,
    client_name: str = "client",
) -> dict[str, Any]:
    """
    Create Matomo site, user (admin on site), and app-specific API token.
    Returns one-time credentials for the console / .env.
    """
    if not provision_token:
        raise RuntimeError("Matomo provisioning is disabled (missing OYDK_MATOMO_PROVISION_TOKEN)")
    if not email or "@" not in email:
        raise ValueError("Valid work email is required")
    if not site_name.strip():
        raise ValueError("Site name is required")
    if not website_url.strip():
        raise ValueError("Website URL is required for the new Matomo site")

    base = matomo_url.rstrip("/")
    existing_login = _resolve_user_login_by_email(base, provision_token, email)
    login = existing_login or _login_from_email(email, client_name)
    password = secrets.token_urlsafe(14)
    user_created = existing_login is None

    site_id_raw = _api(
        base,
        provision_token,
        "SitesManager.addSite",
        siteName=site_name.strip(),
        urls=[website_url.strip()],
    )
    site_id = _parse_site_id(site_id_raw)

    if user_created:
        _api(
            base,
            provision_token,
            "UsersManager.addUser",
            userLogin=login,
            password=password,
            passwordConfirmation=password,
            email=email.strip(),
        )

    try:
        _api(
            base,
            provision_token,
            "UsersManager.setUserAccess",
            userLogin=login,
            idSites=[site_id],
            access="admin",
        )
    except Exception as exc:
        if "super user" not in str(exc).lower():
            raise

    api_token = ""
    use_shared_api = False
    if user_created:
        api_token = _api_public(
            base,
            "UsersManager.createAppSpecificTokenAuth",
            userLogin=login,
            passwordConfirmation=password,
            description=f"OYDK console — {site_name[:40]}",
            expireDays=365,
        )
        api_token = api_token if isinstance(api_token, str) else str(api_token)
    else:
        use_shared_api = True

    matomo_ui = f"{base}/index.php"
    if user_created:
        message = (
            "Matomo site and login created. Your profile is activated automatically — "
            "go to Demo mode and run the connection tests."
        )
    else:
        message = (
            f"Matomo site created and linked to your existing account ({login}). "
            "No token to paste — this console uses the hosted Matomo API token."
        )

    return {
        "matomo_url": base,
        "matomo_ui_url": matomo_ui,
        "site_id": site_id,
        "site_name": site_name.strip(),
        "website_url": website_url.strip(),
        "user_login": login,
        "user_email": email.strip(),
        "user_password": password if user_created else "",
        "api_token": api_token,
        "use_shared_api": use_shared_api,
        "env_snippet": f"MATOMO_API_TOKEN={api_token}" if api_token else "# Uses server MATOMO_API_TOKEN in .env",
        "message": message,
        "open_matomo_url": matomo_ui,
    }
