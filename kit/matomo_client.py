"""Matomo API client — used by migration, parity, DSAR, and connectors."""

import json
from typing import Any
from urllib.parse import urlencode

import requests


class MatomoClient:
    def __init__(self, base_url: str, site_id: int, token: str):
        self.base_url = base_url.rstrip("/")
        self.site_id = site_id
        self.token = token

    def _api(self, method: str, **params: Any) -> Any:
        params.update({
            "module": "API",
            "method": method,
            "idSite": self.site_id,
            "format": "JSON",
            "token_auth": self.token,
        })
        resp = requests.post(f"{self.base_url}/index.php", data=params, timeout=30)
        resp.raise_for_status()
        return resp.json()

    # --- Goals (conversions) ---
    def list_goals(self) -> list[dict]:
        return self._api("Goals.getGoals")

    def add_goal(self, name: str, match_attribute: str = "url", pattern: str = "",
                 pattern_type: str = "contains", case_sensitive: bool = False) -> dict:
        return self._api(
            "Goals.addGoal",
            name=name,
            matchAttribute=match_attribute,
            pattern=pattern,
            patternType=pattern_type,
            caseSensitive=1 if case_sensitive else 0,
        )

    # --- Custom dimensions ---
    def list_custom_dimensions(self) -> list[dict]:
        return self._api("CustomDimensions.getConfiguredCustomDimensions")

    def create_custom_dimension(self, name: str, scope: str = "visit",
                                active: bool = True) -> dict:
        return self._api(
            "CustomDimensions.configureNewCustomDimension",
            name=name,
            scope=scope,
            active=1 if active else 0,
        )

    # --- Reporting (for parity) ---
    def get_visits_summary(self, period: str = "day", date: str = "yesterday") -> dict:
        return self._api("VisitsSummary.get", period=period, date=date)

    def get_events(self, period: str = "day", date: str = "yesterday") -> list[dict]:
        return self._api("Events.getCategory", period=period, date=date)

    def get_referrers(self, period: str = "day", date: str = "yesterday") -> list[dict]:
        return self._api("Referrers.getReferrerType", period=period, date=date)

    # --- DSAR ---
    def find_visits_by_user_id(self, user_id: str) -> list[dict]:
        """Search visits by custom dimension or visitor ID."""
        return self._api(
            "Live.getLastVisitsDetails",
            filterLimit=100,
            segment=f"customVariableValue1=={user_id}",
        )

    def delete_visitor_data(self, visitor_id: str) -> dict:
        """Request deletion of all data for a visitor (GDPR/DPDP plugin)."""
        return self._api(
            "PrivacyManager.deleteDataSubjects",
            jsonData=json.dumps([{"visitorId": visitor_id}]),
        )

    # --- Site settings ---
    def set_data_retention(self, days: int) -> dict:
        return self._api(
            "SitesManager.setSiteSpecificSettings",
            settings=json.dumps({"delete_logs_older_than": days}),
        )
