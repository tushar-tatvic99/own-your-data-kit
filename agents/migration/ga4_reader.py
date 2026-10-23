"""Read GA4 property configuration via Admin API and Data API."""

from google.analytics.admin import AnalyticsAdminServiceClient
from google.analytics.admin_v1beta.types import ListCustomDimensionsRequest
from google.oauth2 import service_account


class GA4Reader:
    def __init__(self, property_id: str, credentials_path: str):
        self.property_id = property_id
        self.credentials = service_account.Credentials.from_service_account_file(
            credentials_path,
            scopes=["https://www.googleapis.com/auth/analytics.readonly"],
        )
        self.admin = AnalyticsAdminServiceClient(credentials=self.credentials)
        self._property_path = f"properties/{property_id}"

    def get_custom_dimensions(self) -> list[dict]:
        dims = []
        for dim in self.admin.list_custom_dimensions(parent=self._property_path):
            dims.append({
                "name": dim.parameter_name,
                "display_name": dim.display_name,
                "scope": dim.scope.name,
                "description": dim.description,
            })
        return dims

    def get_custom_metrics(self) -> list[dict]:
        metrics = []
        for m in self.admin.list_custom_metrics(parent=self._property_path):
            metrics.append({
                "name": m.parameter_name,
                "display_name": m.display_name,
                "scope": m.scope.name,
                "measurement_unit": m.measurement_unit.name,
            })
        return metrics

    def get_conversion_events(self) -> list[dict]:
        events = []
        for conv in self.admin.list_conversion_events(parent=self._property_path):
            events.append({
                "name": conv.event_name,
                "create_time": str(conv.create_time),
                "deletable": conv.deletable,
                "custom": conv.custom,
            })
        return events

    def get_data_streams(self) -> list[dict]:
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

    def get_full_setup(self) -> dict:
        """Read complete GA4 property configuration."""
        return {
            "property_id": self.property_id,
            "custom_dimensions": self.get_custom_dimensions(),
            "custom_metrics": self.get_custom_metrics(),
            "conversion_events": self.get_conversion_events(),
            "data_streams": self.get_data_streams(),
        }
