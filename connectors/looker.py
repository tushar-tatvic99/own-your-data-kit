"""Looker Studio dashboard connector — generates direct linking and dashboard configuration."""

import urllib.parse

LOOKER_DASHBOARD_TEMPLATE = {
    "name": "Matomo Marketing Overview",
    "dataSource": {
        "type": "BIGQUERY",
        "projectId": "${BQ_PROJECT}",
        "datasetId": "${BQ_DATASET}",
        "tableId": "${BQ_TABLE}",
    },
    "dimensions": [
        "event_date",
        "event_name_clean",
        "event_category",
        "city",
        "country",
        "device_type",
        "operating_system",
        "browser",
        "traffic_channel",
        "is_conversion",
    ],
    "metrics": [
        {"name": "Total Users", "formula": "COUNT(DISTINCT visitor_id)"},
        {"name": "Total Sessions", "formula": "COUNT(DISTINCT session_id)"},
        {"name": "Total Events", "formula": "COUNT(*)"},
        {"name": "Total Revenue", "formula": "SUM(revenue)"},
        {"name": "Total Conversions", "formula": "COUNT(CASE WHEN is_conversion THEN 1 END)"},
    ],
    "pages": [
        {
            "name": "Executive Marketing & BFSI Overview",
            "charts": [
                {
                    "type": "scorecard",
                    "title": "Total Users",
                    "metric": "COUNT(DISTINCT visitor_id)",
                },
                {
                    "type": "scorecard",
                    "title": "Total Sessions",
                    "metric": "COUNT(DISTINCT session_id)",
                },
                {
                    "type": "scorecard",
                    "title": "Total Conversions",
                    "metric": "COUNT(CASE WHEN is_conversion THEN 1 END)",
                },
                {
                    "type": "scorecard",
                    "title": "Gross Revenue",
                    "metric": "SUM(revenue)",
                },
                {
                    "type": "time_series",
                    "title": "Daily Users & Sessions Trend",
                    "dimension": "event_date",
                    "metrics": ["COUNT(DISTINCT visitor_id)", "COUNT(DISTINCT session_id)"],
                },
                {
                    "type": "bar_chart",
                    "title": "Top Events by Volume",
                    "dimension": "event_name_clean",
                    "metric": "COUNT(*)",
                    "limit": 10,
                },
                {
                    "type": "pie_chart",
                    "title": "Traffic Acquisition Channels",
                    "dimension": "traffic_channel",
                    "metric": "COUNT(DISTINCT session_id)",
                },
                {
                    "type": "table",
                    "title": "Geographic Breakdown",
                    "dimensions": ["city", "country"],
                    "metrics": ["COUNT(DISTINCT visitor_id)", "SUM(revenue)"],
                    "sort": "SUM(revenue) DESC",
                },
            ],
        }
    ],
}


def generate_looker_studio_url(
    project_id: str = "tvc-int-matomo",
    dataset: str = "matomo_export",
    table_or_view: str = "v_marketing_overview",
) -> str:
    """Build a direct 1-click URL to create a Looker Studio report connected to BigQuery."""
    params = {
        "ds.connector": "bigQuery",
        "ds.type": "TABLE",
        "ds.projectId": project_id,
        "ds.datasetId": dataset,
        "ds.tableId": table_or_view,
    }
    return f"https://lookerstudio.google.com/reporting/create?{urllib.parse.urlencode(params)}"


def generate_dashboard_config(project_id: str, dataset: str, table: str) -> dict:
    """Generate Looker Studio dashboard configuration and link."""
    import copy
    config = copy.deepcopy(LOOKER_DASHBOARD_TEMPLATE)
    config["dataSource"]["projectId"] = project_id
    config["dataSource"]["datasetId"] = dataset
    config["dataSource"]["tableId"] = table
    config["direct_looker_studio_url"] = generate_looker_studio_url(project_id, dataset, table)
    return config
