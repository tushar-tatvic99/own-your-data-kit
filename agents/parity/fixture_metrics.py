"""Offline GA4 metrics snapshots for parity rehearsal."""

import json
from pathlib import Path


class FixtureGA4Metrics:
    def __init__(self, fixture_path: str | Path):
        with open(fixture_path, encoding="utf-8") as f:
            self._data = json.load(f)

    def _day(self, date: str) -> dict:
        dates = self._data.get("dates", {})
        if date not in dates:
            raise KeyError(
                f"No fixture data for {date}. Available: {', '.join(sorted(dates.keys()))}"
            )
        return dates[date]

    def get_users_sessions(self, date: str) -> dict:
        ga4 = self._day(date)["ga4"]
        return {"users": ga4["users"], "sessions": ga4["sessions"]}

    def get_key_events(self, date: str, event_names: list[str]) -> dict:
        events = self._day(date)["ga4"].get("key_events", {})
        return {name: int(events.get(name, 0)) for name in event_names}

    def get_traffic_sources(self, date: str) -> dict:
        return dict(self._day(date)["ga4"].get("traffic_sources", {}))

    def get_matomo_baseline(self, date: str) -> dict:
        """Matomo side of fixture (used instead of live API in fixture mode)."""
        return self._day(date)["matomo"]
