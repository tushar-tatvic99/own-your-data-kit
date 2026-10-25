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
        if resp.status_code == 401:
            raise requests.HTTPError(
                "401 Unauthorized — set MATOMO_API_TOKEN in .env (Matomo → Personal → Security)",
                response=resp,
            )
        if resp.status_code >= 400:
            try:
                body = resp.json()
                msg = body.get("message", resp.text[:200])
            except Exception:
                msg = resp.text[:200]
            if "too many failed logins" in msg.lower():
                raise requests.HTTPError(
                    f"{resp.status_code} — {msg}. Clear matomo_brute_force_log on the server "
                    "(deploy/docker/clear-matomo-brute-force.sh) or wait ~15 minutes.",
                    response=resp,
                )
            raise requests.HTTPError(f"{resp.status_code} — {msg}", response=resp)
        data = resp.json()
        if isinstance(data, dict) and data.get("result") == "error":
            raise requests.HTTPError(data.get("message", "Matomo API error"), response=resp)
        return data

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
        """Search visits by User ID, visitor ID, or email-like custom dimension."""
        segments = [
            f"userId=={user_id}",
            f"visitorId=={user_id}",
        ]
        for segment in segments:
            result = self._api(
                "Live.getLastVisitsDetails",
                period="month",
                date="today",
                filterLimit=100,
                segment=segment,
            )
            if isinstance(result, dict) and result.get("result") == "error":
                continue
            if isinstance(result, list):
                return result
        return []

    def delete_data_subjects(self, visits: list[dict]) -> dict:
        """Delete stored visit rows for data subjects (Matomo PrivacyManager GDPR API)."""
        params: dict[str, Any] = {}
        for i, visit in enumerate(visits):
            id_site = visit.get("idSite") or visit.get("idsite") or self.site_id
            id_visit = visit.get("idVisit") or visit.get("idvisit")
            if id_visit is None:
                continue
            params[f"visits[{i}][idsite]"] = int(id_site)
            params[f"visits[{i}][idvisit]"] = int(id_visit)
        if not params:
            return {"result": "error", "message": "No visits to delete"}
        return self._api("PrivacyManager.deleteDataSubjects", **params)

    # --- Privacy / retention ---
    def set_delete_logs_settings(self, days: int, enabled: bool = True) -> dict:
        return self._api(
            "PrivacyManager.setDeleteLogsSettings",
            deleteLogsEnable=1 if enabled else 0,
            deleteLogsOlderThan=int(days),
        )
