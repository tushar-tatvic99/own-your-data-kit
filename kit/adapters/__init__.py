"""Analytics Stack Adapters Factory."""

from typing import Any
from kit.stack_adapter import AnalyticsStackAdapter
from kit.adapters.matomo_adapter import MatomoAdapter
from kit.adapters.posthog_adapter import PostHogAdapter


def get_stack_adapter(config: dict[str, Any]) -> AnalyticsStackAdapter:
    """Instantiate the appropriate analytics stack adapter from client configuration."""
    stack_cfg = config.get("stack", {})
    stack_type = stack_cfg.get("type", "matomo").lower()

    if stack_type == "matomo":
        token = (stack_cfg.get("api_token") or "").strip()
        if not token or token.startswith("${"):
            import os
            token = os.environ.get("MATOMO_API_TOKEN", "").strip()
        return MatomoAdapter(
            base_url=stack_cfg["url"],
            site_id=int(stack_cfg.get("site_id", 1)),
            token=token,
        )
    elif stack_type == "posthog":
        return PostHogAdapter(
            base_url=stack_cfg["url"],
            project_id=stack_cfg.get("project_id", 1),
            api_key=stack_cfg.get("api_key", ""),
        )
    else:
        raise ValueError(
            f"Unsupported analytics stack type: '{stack_type}'. "
            f"Supported stacks are 'matomo' (Priority 1) and 'posthog' (Priority 2)."
        )


__all__ = ["AnalyticsStackAdapter", "MatomoAdapter", "PostHogAdapter", "get_stack_adapter"]
