"""Abstract interface for analytics stack adapters.

Decouples core OYDK IP (migration, parity, DPDP, connectors) from any specific
open-source analytics backend (Matomo, PostHog, etc.).
"""

from abc import ABC, abstractmethod
from typing import Any


class AnalyticsStackAdapter(ABC):
    """Universal protocol for self-hosted analytics engines."""

    @abstractmethod
    def health_check(self) -> dict[str, Any]:
        """Verify stack connectivity and return engine version/status."""
        pass

    # --- Schema & Configuration (Used by Migration Agent) ---
    @abstractmethod
    def create_custom_dimension(self, name: str, scope: str = "visit") -> dict[str, Any]:
        """Create a custom dimension in the target stack.
        
        Args:
            name: Display name of the dimension
            scope: 'visit' (session/user) or 'action' (event/hit)
        """
        pass

    @abstractmethod
    def create_conversion_goal(
        self,
        name: str,
        match_attribute: str = "event_action",
        pattern: str = "",
        pattern_type: str = "exact",
        revenue: float = 0.0,
    ) -> dict[str, Any]:
        """Create a conversion goal in the target stack."""
        pass

    @abstractmethod
    def set_data_retention(self, days: int) -> dict[str, Any]:
        """Configure data retention limits in days (DPDP requirement)."""
        pass

    # --- Telemetry Extraction (Used by Parity & BigQuery Connector) ---
    @abstractmethod
    def get_daily_summary(self, date: str) -> dict[str, int]:
        """Fetch high-level metrics for parity comparison: {'users': int, 'sessions': int}."""
        pass

    @abstractmethod
    def get_daily_events(self, date: str) -> list[dict[str, Any]]:
        """Fetch daily event counts by category/action."""
        pass

    @abstractmethod
    def get_daily_referrers(self, date: str) -> list[dict[str, Any]]:
        """Fetch daily acquisition channels and referrer distributions."""
        pass

    @abstractmethod
    def fetch_stream_actions(
        self,
        since_timestamp: int = 0,
        limit: int = 100,
    ) -> tuple[list[dict[str, Any]], int]:
        """Extract incremental actions for warehouse streaming (BigQuery).
        
        Returns:
            Tuple of (list_of_normalized_actions, highest_timestamp)
        """
        pass

    # --- DPDP & Privacy Rights (DSAR) ---
    @abstractmethod
    def search_subject_records(self, user_id: str) -> list[dict[str, Any]]:
        """Locate all records and visits associated with a subject ID."""
        pass

    @abstractmethod
    def delete_subject_records(self, user_id: str) -> dict[str, Any]:
        """Permanently delete all personal telemetry for a subject ID."""
        pass
