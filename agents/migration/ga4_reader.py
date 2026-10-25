"""Read GA4 property configuration via Google Analytics Admin API."""

import os
from typing import Any
import google.auth
from google.analytics.admin import AnalyticsAdminServiceClient
from google.oauth2 import service_account


# Explicit fixtures used ONLY when dry_run=True
DRY_RUN_CUSTOM_DIMENSIONS = [
    {
        "name": "customer_tier",
        "display_name": "Customer Tier",
        "scope": "USER",
        "description": "Wealth portfolio bracket (Private, Sovereign, Retail)",
    },
    {
        "name": "bfsi_product_type",
        "display_name": "BFSI Product Type",
        "scope": "EVENT",
        "description": "Category of financial product applied for",
    },
    {
        "name": "investment_horizon",
        "display_name": "Investment Horizon",
        "scope": "EVENT",
        "description": "Tenure selected in calculator",
    },
    {
        "name": "preferred_currency",
        "display_name": "Preferred Currency",
        "scope": "USER",
        "description": "User selected currency (INR, USD, EUR)",
    },
]

DRY_RUN_CUSTOM_METRICS = [
    {
        "name": "lead_credit_score",
        "display_name": "Lead Credit Score",
        "scope": "EVENT",
        "measurement_unit": "STANDARD",
    }
]

DRY_RUN_CONVERSION_EVENTS = [
    {"name": "purchase", "create_time": "2026-10-24T10:00:00Z", "custom": False},
    {"name": "financial_lead_submitted", "create_time": "2026-10-24T12:00:00Z", "custom": True},
    {"name": "calculate_loan_emi", "create_time": "2026-10-24T12:00:00Z", "custom": True},
    {"name": "calculate_fd_yield", "create_time": "2026-10-24T12:00:00Z", "custom": True},
    {"name": "sign_up", "create_time": "2026-10-24T10:00:00Z", "custom": False},
]

DRY_RUN_DATA_STREAMS = [
    {
        "name": "Aura & Blush Production Web",
        "display_name": "Aura & Blush Web",
        "type": "WEB_DATA_STREAM",
        "web_stream": {
            "default_uri": "https://auraandblush-61760469326.asia-south1.run.app",
            "measurement_id": "G-MMXM5L53",
        },
    }
]


class GA4Reader:
    def __init__(
        self,
        property_id: str,
        credentials_path: str | None = None,
        dry_run: bool = False,
    ):
        self.property_id = str(property_id).strip()
        self.credentials_path = credentials_path
        self.dry_run = dry_run
        self._property_path = f"properties/{self.property_id}"
        self.admin = None

        if self.dry_run:
            return

        # Attempt to load credentials
        if credentials_path and os.path.exists(credentials_path):
            try:
                self.credentials = service_account.Credentials.from_service_account_file(
                    credentials_path,
                    scopes=["https://www.googleapis.com/auth/analytics.readonly"],
                )
                self.admin = AnalyticsAdminServiceClient(credentials=self.credentials)
            except Exception as e:
                raise RuntimeError(
                    f"Failed to initialize GA4 Admin Client from credentials file '{credentials_path}': {e}"
                )
        else:
            # Attempt Application Default Credentials (ADC)
            try:
                creds, _ = google.auth.default(
                    scopes=["https://www.googleapis.com/auth/analytics.readonly"]
                )
                self.admin = AnalyticsAdminServiceClient(credentials=creds)
            except Exception as e:
                raise RuntimeError(
                    f"GA4 credentials missing or invalid for property '{self.property_id}'.\n"
                    f"Expected credentials at '{credentials_path}' or via Application Default Credentials (ADC).\n"
                    f"Details: {e}\n"
                    f"Hint: Run with '--dry-run' if you wish to simulate without live Google Cloud authentication."
                )

    def get_custom_dimensions(self) -> list[dict[str, Any]]:
        """Harvest custom dimensions from live GA4 Admin API (or dry-run fixture)."""
        if self.dry_run:
            return DRY_RUN_CUSTOM_DIMENSIONS

        try:
            dims = []
            for dim in self.admin.list_custom_dimensions(parent=self._property_path):
                dims.append({
                    "name": dim.parameter_name,
                    "display_name": dim.display_name,
                    "scope": dim.scope.name,
                    "description": dim.description,
                })
            return dims
        except Exception as e:
            err_str = str(e)
            scope_hint = ""
            if "insufficient authentication scopes" in err_str.lower():
                scope_hint = (
                    "\n\nRoot Cause: Your Google ADC credentials lack the 'analytics.readonly' OAuth scope.\n"
                    "Fix with either:\n"
                    "  A) Copy your service account JSON key to: credentials/ga-service-account.json\n"
                    "  B) Or run in PowerShell:\n"
                    "     gcloud auth application-default login --scopes=https://www.googleapis.com/auth/analytics.readonly,https://www.googleapis.com/auth/tagmanager.readonly,https://www.googleapis.com/auth/cloud-platform\n"
                    "  C) Or run: .\\oydk auth\n"
                )
            raise RuntimeError(
                f"Google Analytics Admin API error while listing custom dimensions on property '{self.property_id}':\n"
                f"{e}{scope_hint}\n\n"
                f"Action Required:\n"
                f"1. Ensure your user/Service Account has 'Viewer' permission on GA4 Property '{self.property_id}'.\n"
                f"2. Ensure the 'analyticsadmin.googleapis.com' API is enabled in your GCP project.\n"
                f"3. Run with '--dry-run' if you want to test migration workflows offline."
            )

    def get_custom_metrics(self) -> list[dict[str, Any]]:
        """Harvest custom metrics from live GA4 Admin API (or dry-run fixture)."""
        if self.dry_run:
            return DRY_RUN_CUSTOM_METRICS

        try:
            metrics = []
            for m in self.admin.list_custom_metrics(parent=self._property_path):
                metrics.append({
                    "name": m.parameter_name,
                    "display_name": m.display_name,
                    "scope": m.scope.name,
                    "measurement_unit": m.measurement_unit.name,
                })
            return metrics
        except Exception as e:
            raise RuntimeError(
                f"Google Analytics Admin API error while listing custom metrics on property '{self.property_id}':\n{e}"
            )

    def get_conversion_events(self) -> list[dict[str, Any]]:
        """Harvest conversion events from live GA4 Admin API (or dry-run fixture)."""
        if self.dry_run:
            return DRY_RUN_CONVERSION_EVENTS

        try:
            events = []
            for conv in self.admin.list_conversion_events(parent=self._property_path):
                events.append({
                    "name": conv.event_name,
                    "create_time": str(conv.create_time),
                    "deletable": conv.deletable,
                    "custom": conv.custom,
                })
            return events
        except Exception as e:
            raise RuntimeError(
                f"Google Analytics Admin API error while listing conversion events on property '{self.property_id}':\n{e}"
            )

    def get_data_streams(self) -> list[dict[str, Any]]:
        """Harvest data streams from live GA4 Admin API (or dry-run fixture)."""
        if self.dry_run:
            return DRY_RUN_DATA_STREAMS

        try:
            streams = []
            for stream in self.admin.list_data_streams(parent=self._property_path):
                streams.append({
                    "name": stream.name,
                    "display_name": stream.display_name,
                    "type": stream.type_.name,
                    "web_stream": {
                        "default_uri": stream.web_stream_data.default_uri,
                        "measurement_id": stream.web_stream_data.measurement_id,
                    } if stream.web_stream_data else None,
                })
            return streams
        except Exception as e:
            raise RuntimeError(
                f"Google Analytics Admin API error while listing data streams on property '{self.property_id}':\n{e}"
            )

    def get_full_setup(self) -> dict[str, Any]:
        """Read complete GA4 property configuration."""
        return {
            "property_id": self.property_id,
            "custom_dimensions": self.get_custom_dimensions(),
            "custom_metrics": self.get_custom_metrics(),
            "conversion_events": self.get_conversion_events(),
            "data_streams": self.get_data_streams(),
        }
