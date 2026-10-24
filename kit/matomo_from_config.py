"""Build analytics client from config — Matomo by default via stack adapter."""

from kit.analytics_stack import analytics_stack_from_config
from kit.matomo_client import MatomoClient


def matomo_client_from_config(config_path: str) -> MatomoClient:
    """Return Matomo client (stack.type must be matomo)."""
    client = analytics_stack_from_config(config_path)
    if not isinstance(client, MatomoClient):
        raise TypeError(
            f"Expected stack.type=matomo, got {type(client).__name__}. "
            "Use analytics_stack_from_config() for stack-agnostic code."
        )
    return client
