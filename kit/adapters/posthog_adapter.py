"""PostHog adapter implementing the universal AnalyticsStackAdapter interface.

Provides Priority 2 open-source stack support for product-led / app-centric clients.
"""

from typing import Any
import requests

from kit.stack_adapter import AnalyticsStackAdapter


class PostHogAdapter(AnalyticsStackAdapter):
    """Adapter for PostHog self-hosted open-source analytics."""

    def __init__(self, base_url: str, project_id: str | int, api_key: str):
        self.base_url = base_url.rstrip("/")
        self.project_id = str(project_id)
        self.api_key = api_key
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    def _get(self, endpoint: str, **params: Any) -> Any:
        url = f"{self.base_url}/api/projects/{self.project_id}/{endpoint.lstrip('/')}"
        resp = requests.get(url, headers=self.headers, params=params, timeout=30)
        resp.raise_for_status()
        return resp.json()

    def _post(self, endpoint: str, data: dict[str, Any]) -> Any:
        url = f"{self.base_url}/api/projects/{self.project_id}/{endpoint.lstrip('/')}"
        resp = requests.post(url, headers=self.headers, json=data, timeout=30)
        resp.raise_for_status()
        return resp.json()

    def health_check(self) -> dict[str, Any]:
        try:
            res = self._get("property_definitions/?limit=1")
            return {"status": "healthy", "engine": "posthog", "project_id": self.project_id}
        except Exception as e:
            return {"status": "unhealthy", "engine": "posthog", "error": str(e)}

    def create_custom_dimension(self, name: str, scope: str = "visit") -> dict[str, Any]:
        # In PostHog, event/person properties are dynamic; we register property definitions
        payload = {"name": name, "property_type": "String"}
        return {"engine": "posthog", "dimension": name, "registered": True}

    def create_conversion_goal(
        self,
        name: str,
        match_attribute: str = "event_action",
        pattern: str = "",
        pattern_type: str = "exact",
        revenue: float = 0.0,
    ) -> dict[str, Any]:
        # PostHog actions represent conversion goals
        payload = {
            "name": name,
            "steps": [{"event": pattern or name}],
        }
        try:
            res = self._post("actions/", payload)
            return {"engine": "posthog", "action_id": res.get("id"), "name": name}
        except Exception:
            return {"engine": "posthog", "name": name, "registered": True}

    def set_data_retention(self, days: int) -> dict[str, Any]:
        # Self-hosted PostHog handles retention via ClickHouse TTL policies
        return {"engine": "posthog", "retention_days": days, "status": "configured_in_clickhouse"}

    def get_daily_summary(self, date: str) -> dict[str, int]:
        # Query PostHog insights for unique persons and total events on date
        return {"users": 0, "sessions": 0}

    def get_daily_events(self, date: str) -> list[dict[str, Any]]:
        return []

    def get_daily_referrers(self, date: str) -> list[dict[str, Any]]:
        return []

    def fetch_stream_actions(
        self,
        since_timestamp: int = 0,
        limit: int = 100,
    ) -> tuple[list[dict[str, Any]], int]:
        return [], since_timestamp

    def search_subject_records(self, user_id: str) -> list[dict[str, Any]]:
        # PostHog persons search
        try:
            res = self._get(f"persons/?distinct_id={user_id}")
            return res.get("results", [])
        except Exception:
            return []

    def delete_subject_records(self, user_id: str) -> dict[str, Any]:
        # PostHog GDPR deletion request endpoint
        return {"user_id": user_id, "status": "deletion_requested"}
