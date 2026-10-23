"""Fetch metrics from GA4 Data API for parity comparison."""

from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import (
    DateRange,
    Dimension,
    Metric,
    RunReportRequest,
)
from google.oauth2 import service_account


class GA4Metrics:
    def __init__(self, property_id: str, credentials_path: str):
        self.property_id = property_id
        self.credentials = service_account.Credentials.from_service_account_file(
            credentials_path,
            scopes=["https://www.googleapis.com/auth/analytics.readonly"],
        )
        self.client = BetaAnalyticsDataClient(credentials=self.credentials)

    def _run_report(self, metrics: list[str], dimensions: list[str] | None,
                    start_date: str, end_date: str) -> list[dict]:
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

    def get_users_sessions(self, date: str) -> dict:
        rows = self._run_report(
            ["totalUsers", "sessions"],
            None,
            date, date,
        )
        if rows:
            return {"users": rows[0]["totalUsers"], "sessions": rows[0]["sessions"]}
        return {"users": 0, "sessions": 0}

    def get_key_events(self, date: str, event_names: list[str]) -> dict:
        rows = self._run_report(
            ["eventCount"],
            ["eventName"],
            date, date,
        )
        events = {}
        for row in rows:
            if row["eventName"] in event_names:
                events[row["eventName"]] = row["eventCount"]
        return events

    def get_traffic_sources(self, date: str) -> dict:
        rows = self._run_report(
            ["sessions"],
            ["sessionDefaultChannelGroup"],
            date, date,
        )
        return {row["sessionDefaultChannelGroup"]: row["sessions"] for row in rows}
