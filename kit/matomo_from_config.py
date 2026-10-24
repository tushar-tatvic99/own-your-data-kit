"""Build MatomoClient from client YAML + repo .env."""

from kit.config import load_config
from kit.env import load_kit_env
from kit.matomo_client import MatomoClient
from kit.matomo_token import resolve_matomo_token


def matomo_client_from_config(config_path: str) -> MatomoClient:
    load_kit_env()
    cfg = load_config(config_path)
    stack = cfg["stack"]
    token = resolve_matomo_token(stack.get("api_token", ""))
    return MatomoClient(stack["url"], int(stack["site_id"]), token)
