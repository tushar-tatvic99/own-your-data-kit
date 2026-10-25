"""Fetch metrics from GA4 Data API for parity comparison."""

import os
from typing import Any
import google.auth
from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import (
    DateRange,
    Dimension,
    Metric,
    RunReportRequest,
)
from google.oauth2 import service_account

# Explicit dry-run fixtures used ONLY when dry_run=True
DRY_RUN_USERS_SESSIONS = {"users": 12, "sessions": 15}
DRY_RUN_KEY_EVENTS = {
    "purchase": 3,
    "add_to_cart": 5,
    "begin_checkout": 4,
    "financial_lead_submitted": 1,
    "calculate_loan_emi": 1,
}
DRY_RUN_TRAFFIC_SOURCES = {"Direct": 10, "Organic Search": 4, "Referral": 1}


class GA4Metrics:
    def __init__(
        self,
        property_id: str,
        credentials_path: str | None = None,
        dry_run: bool = False,
    ):
        self.property_id = str(property_id).strip()
        self.credentials_path = credentials_path
        self.dry_run = dry_run
        self.client = None

        if self.dry_run:
            return

        if credentials_path and os.path.exists(credentials_path):
            try:
                creds = service_account.Credentials.from_service_account_file(
                    credentials_path,
                    scopes=["https://www.googleapis.com/auth/analytics.readonly"],
                )
                self.client = BetaAnalyticsDataClient(credentials=creds)
            except Exception as e:
                raise RuntimeError(
                    f"Failed to load GA4 Data API credentials from '{credentials_path}': {e}"
                )
        else:
            try:
                creds, _ = google.auth.default(
                    scopes=["https://www.googleapis.com/auth/analytics.readonly"]
                )
                self.client = BetaAnalyticsDataClient(credentials=creds)
            except Exception as e:
                raise RuntimeError(
                    f"GA4 Data API credentials missing for property '{self.property_id}'.\n"
                    f"Expected credentials at '{credentials_path}' or via Application Default Credentials (ADC).\n"
                    f"Details: {e}\n"
                    f"Hint: Pass '--dry-run' to simulate parity checks without live Google API authentication."
                )

    def _run_report(
        self,
        metrics: list[str],
        dimensions: list[str] | None,
        start_date: str,
        end_date: str,
    ) -> list[dict[str, Any]]:
        if self.dry_run:
            return []

        try:
            request = RunReportRequest(
                property=f"properties/{self.property_id}",
                date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
                metrics=[Metric(name=m) for m in metrics],
                dimensions=[Dimension(name=d) for d in (dimensions or [])],
            )
            response = self.client.run_report(request)
            rows = []
            for row in response.rows:
                entry = {}
                for i, dim in enumerate(dimensions or []):
                    entry[dim] = row.dimension_values[i].value
                for i, met in enumerate(metrics):
                    entry[met] = int(row.metric_values[i].value)
                rows.append(entry)
            return rows
        except Exception as e:
            raise RuntimeError(
                f"Google Analytics Data API error on property '{self.property_id}' ({start_date} to {end_date}):\n"
                f"{e}\n\n"
                f"Action Required:\n"
                f"1. Ensure the Service Account has 'Viewer' permission on GA4 Property '{self.property_id}'.\n"
                f"2. Ensure 'analyticsdata.googleapis.com' API is enabled in your GCP project.\n"
                f"3. Run with '--dry-run' if you want to test parity workflows offline."
            )

    def get_users_sessions(self, date: str) -> dict[str, int]:
        """Fetch active users and sessions count for date."""
        if self.dry_run:
            return DRY_RUN_USERS_SESSIONS

        rows = self._run_report(["totalUsers", "sessions"], None, date, date)
        if rows:
            return {"users": int(rows[0]["totalUsers"]), "sessions": int(rows[0]["sessions"])}
        return {"users": 0, "sessions": 0}

    def get_key_events(self, date: str, event_names: list[str]) -> dict[str, int]:
        """Fetch event counts for specific key conversion events on date."""
        if self.dry_run:
            return {ev: DRY_RUN_KEY_EVENTS.get(ev, 1) for ev in event_names}

        rows = self._run_report(["eventCount"], ["eventName"], date, date)
        events = {ev: 0 for ev in event_names}
        for row in rows:
            ev_name = row.get("eventName", "")
            if ev_name in events:
                events[ev_name] = int(row.get("eventCount", 0))
        return events

    def get_traffic_sources(self, date: str) -> dict[str, int]:
        """Fetch session counts grouped by default channel group on date."""
        if self.dry_run:
            return DRY_RUN_TRAFFIC_SOURCES

        rows = self._run_report(["sessions"], ["sessionDefaultChannelGroup"], date, date)
        if rows:
            return {row["sessionDefaultChannelGroup"]: int(row["sessions"]) for row in rows}
        return {}
