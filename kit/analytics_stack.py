"""Analytics stack adapter — agents talk here, not to Matomo/PostHog directly."""

from typing import Any, Protocol, runtime_checkable

from kit.config import load_config
from kit.matomo_client import MatomoClient
from kit.matomo_token import resolve_matomo_token


@runtime_checkable
class AnalyticsStackClient(Protocol):
    """Operations the kit needs from any self-hosted analytics backend."""

    def list_goals(self) -> list[dict]: ...
    def add_goal(self, name: str, match_attribute: str = "url", pattern: str = "",
                 pattern_type: str = "contains", case_sensitive: bool = False) -> dict: ...
    def list_custom_dimensions(self) -> list[dict]: ...
    def create_custom_dimension(self, name: str, scope: str = "visit",
                                active: bool = True) -> dict: ...
    def get_visits_summary(self, period: str = "day", date: str = "yesterday") -> dict: ...
    def get_events(self, period: str = "day", date: str = "yesterday") -> list[dict]: ...
    def get_referrers(self, period: str = "day", date: str = "yesterday") -> list[dict]: ...
    def find_visits_by_user_id(self, user_id: str) -> list[dict]: ...
    def delete_data_subjects(self, visits: list[dict]) -> dict: ...
    def set_delete_logs_settings(self, days: int, enabled: bool = True) -> dict: ...


def analytics_stack_from_config(config_path: str) -> AnalyticsStackClient:
    """Return the configured analytics backend (Matomo today; others via new adapters)."""
    cfg = load_config(config_path)
    stack = cfg["stack"]
    stack_type = (stack.get("type") or "matomo").lower()

    if stack_type == "matomo":
        token = resolve_matomo_token(stack.get("api_token"))
        return MatomoClient(stack["url"], int(stack["site_id"]), token)

    if stack_type == "posthog":
        raise NotImplementedError(
            "stack.type=posthog is not implemented yet. Add kit/posthog_client.py "
            "implementing AnalyticsStackClient; agents and DPDP stay unchanged. "
            "See docs/kit-vs-analytics-stack.md."
        )

    raise ValueError(f"Unknown stack.type: {stack_type!r} (supported: matomo)")
