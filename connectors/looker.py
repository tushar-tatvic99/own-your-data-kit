"""Looker Studio dashboard connector — generates dashboard from BigQuery data."""

LOOKER_DASHBOARD_TEMPLATE = {
    "name": "Matomo Marketing Overview",
    "dataSource": {
        "type": "BIGQUERY",
        "projectId": "${BQ_PROJECT}",
        "datasetId": "${BQ_DATASET}",
        "tableId": "${BQ_TABLE}",
    },
    "pages": [
        {
            "name": "Overview",
            "charts": [
                {
                    "type": "scorecard",
                    "title": "Total Users",
                    "metric": "COUNT(DISTINCT visitor_id)",
                    "dateRange": "last_30_days",
                },
                {
                    "type": "scorecard",
                    "title": "Total Sessions",
                    "metric": "COUNT(DISTINCT session_id)",
                    "dateRange": "last_30_days",
                },
                {
                    "type": "time_series",
                    "title": "Daily Users",
                    "dimension": "DATE(event_timestamp)",
                    "metric": "COUNT(DISTINCT visitor_id)",
                },
                {
                    "type": "bar_chart",
                    "title": "Top Events",
                    "dimension": "event_name",
                    "metric": "COUNT(*)",
                    "limit": 10,
                },
                {
                    "type": "pie_chart",
                    "title": "Revenue by Event",
                    "dimension": "event_name",
                    "metric": "SUM(revenue)",
                },
                {
                    "type": "table",
                    "title": "Event Details",
                    "dimensions": ["event_timestamp", "event_name", "page_url", "revenue"],
                    "sort": "event_timestamp DESC",
                    "limit": 100,
                },
            ],
        },
        {
            "name": "Conversions",
            "charts": [
                {
                    "type": "scorecard",
                    "title": "Purchases",
                    "metric": "COUNT(*) WHERE event_name = 'purchase'",
                    "dateRange": "last_30_days",
                },
                {
                    "type": "scorecard",
                    "title": "Revenue",
                    "metric": "SUM(revenue) WHERE event_name = 'purchase'",
                    "dateRange": "last_30_days",
                },
                {
                    "type": "time_series",
                    "title": "Daily Conversions",
                    "dimension": "DATE(event_timestamp)",
                    "metric": "COUNT(*) WHERE event_name = 'purchase'",
                },
            ],
        },
    ],
}


def generate_dashboard_config(project_id: str, dataset: str, table: str) -> dict:
    """Generate Looker Studio dashboard configuration."""
    import copy
    config = copy.deepcopy(LOOKER_DASHBOARD_TEMPLATE)
    config["dataSource"]["projectId"] = project_id
    config["dataSource"]["datasetId"] = dataset
    config["dataSource"]["tableId"] = table
    return config
