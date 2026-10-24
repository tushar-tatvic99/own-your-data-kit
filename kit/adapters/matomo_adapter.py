"""Matomo adapter implementing the universal AnalyticsStackAdapter interface."""

import json
from datetime import datetime, timezone
from typing import Any
import requests

from kit.stack_adapter import AnalyticsStackAdapter


class MatomoAdapter(AnalyticsStackAdapter):
    """Adapter for Matomo self-hosted open-source analytics."""

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

    def health_check(self) -> dict[str, Any]:
        res = self._api("API.getMatomoVersion")
        version = res.get("value", "unknown") if isinstance(res, dict) else str(res)
        return {"status": "healthy", "engine": "matomo", "version": version, "site_id": self.site_id}

    def create_custom_dimension(self, name: str, scope: str = "visit") -> dict[str, Any]:
        return self._api(
            "CustomDimensions.configureNewCustomDimension",
            name=name,
            scope=scope,
            active=1,
        )

    def create_conversion_goal(
        self,
        name: str,
        match_attribute: str = "event_action",
        pattern: str = "",
        pattern_type: str = "exact",
        revenue: float = 0.0,
    ) -> dict[str, Any]:
        return self._api(
            "Goals.addGoal",
            name=name,
            matchAttribute=match_attribute,
            pattern=pattern,
            patternType=pattern_type,
            revenue=revenue,
            caseSensitive=0,
        )

    def set_data_retention(self, days: int) -> dict[str, Any]:
        return self._api(
            "SitesManager.setSiteSpecificSettings",
            settings=json.dumps({"delete_logs_older_than": days}),
        )

    def get_daily_summary(self, date: str) -> dict[str, int]:
        data = self._api("VisitsSummary.get", period="day", date=date)
        if isinstance(data, dict):
            return {
                "users": int(data.get("nb_uniq_visitors", 0)),
                "sessions": int(data.get("nb_visits", 0)),
            }
        return {"users": 0, "sessions": 0}

    def get_daily_events(self, date: str) -> list[dict[str, Any]]:
        actions = self._api("Events.getAction", period="day", date=date)
        categories = self._api("Events.getCategory", period="day", date=date)
        events: list[dict[str, Any]] = []
        if isinstance(actions, list):
            events.extend(actions)
        if isinstance(categories, list):
            events.extend(categories)
        return events

    def get_daily_referrers(self, date: str) -> list[dict[str, Any]]:
        refs = self._api("Referrers.getReferrerType", period="day", date=date)
        return refs if isinstance(refs, list) else []

    def fetch_stream_actions(
        self,
        since_timestamp: int = 0,
        limit: int = 100,
    ) -> tuple[list[dict[str, Any]], int]:
        visits = self._api(
            "Live.getLastVisitsDetails",
            filter_limit=limit,
            period="day",
            date="today",
        )
        if not isinstance(visits, list):
            return [], since_timestamp

        extracted = []
        max_ts = since_timestamp

        for visit in visits:
            visitor_id = str(visit.get("visitorId", ""))
            session_id = str(visit.get("idVisit", ""))
            actions = visit.get("actionDetails", [])

            for action in actions:
                action_ts = int(action.get("timestamp", 0))
                if action_ts <= since_timestamp:
                    continue
                if action_ts > max_ts:
                    max_ts = action_ts

                action_type = action.get("type", "unknown")
                page_url = action.get("url") or visit.get("referrerUrl") or ""
                revenue = float(action.get("revenue") or action.get("eventValue") or 0.0)

                dimensions = {
                    "city": visit.get("city"),
                    "country": visit.get("country"),
                    "device": visit.get("deviceType"),
                    "os": visit.get("operatingSystem"),
                    "browser": visit.get("browser"),
                    "referrer_type": visit.get("referrerTypeName"),
                }

                if action_type == "action":
                    event_name = "pageview"
                    event_category = "pageview"
                elif action_type == "event":
                    event_name = action.get("eventName") or action.get("eventAction") or "event"
                    event_category = action.get("eventCategory", "general")
                elif action_type == "ecommerceOrder":
                    event_name = "purchase"
                    event_category = "ecommerce"
                elif action_type == "ecommerceAbandonedCart":
                    event_name = "abandoned_cart"
                    event_category = "ecommerce"
                else:
                    event_name = action.get("title") or action_type
                    event_category = action_type

                iso_timestamp = datetime.fromtimestamp(action_ts, timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

                extracted.append({
                    "event_timestamp": iso_timestamp,
                    "event_name": str(event_name),
                    "event_category": str(event_category),
                    "page_url": str(page_url),
                    "visitor_id": visitor_id,
                    "session_id": session_id,
                    "custom_dimensions": json.dumps(dimensions),
                    "revenue": revenue,
                    "_raw_timestamp": action_ts,
                })

        extracted.sort(key=lambda x: x["_raw_timestamp"])
        return extracted, max_ts

    def search_subject_records(self, user_id: str) -> list[dict[str, Any]]:
        # Search by visitorId segment (Matomo segment API)
        visits = self._api(
            "Live.getLastVisitsDetails",
            filterLimit=100,
            segment=f"visitorId=={user_id}",
        )
        if isinstance(visits, list) and visits:
            return visits

        # Fallback: search by userId
        visits_by_uid = self._api(
            "Live.getLastVisitsDetails",
            filterLimit=100,
            segment=f"userId=={user_id}",
        )
        return visits_by_uid if isinstance(visits_by_uid, list) else []

    def delete_subject_records(self, user_id: str) -> dict[str, Any]:
        visits = self.search_subject_records(user_id)

        if not visits:
            return {
                "user_id": user_id,
                "visitor_ids_deleted": [],
                "deletion_results": [],
                "rows_deleted": 0,
            }

        deletion_results = []
        total_rows = 0

        for i, visit in enumerate(visits):
            id_visit = visit.get("idVisit")
            visitor_id = visit.get("visitorId", "unknown")
            if not id_visit:
                continue

            # Matomo PrivacyManager.deleteDataSubjects requires bracket-array format
            payload = {
                f"visits[{i}][idsite]": str(self.site_id),
                f"visits[{i}][idvisit]": str(id_visit),
            }
            res = self._api("PrivacyManager.deleteDataSubjects", **payload)

            rows = 0
            if isinstance(res, dict):
                rows = sum(v for v in res.values() if isinstance(v, int))
                total_rows += rows

            deletion_results.append({
                "visitor_id": visitor_id,
                "id_visit": id_visit,
                "rows_deleted": rows,
                "result": res,
            })

        visitor_ids = [v.get("visitorId") for v in visits if v.get("visitorId")]
        return {
            "user_id": user_id,
            "visitor_ids_deleted": visitor_ids,
            "deletion_results": deletion_results,
            "rows_deleted": total_rows,
        }
