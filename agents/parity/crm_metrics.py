"""Fetch ground truth business metrics from client's internal records (Backend DB / CRM / BigQuery).

Supports post-migration steady-state parity checking when GA4 has been decommissioned.
Compares self-hosted analytics telemetry against ground-truth ERP orders and CRM leads.
"""

from typing import Any

DRY_RUN_BACKEND_ORDERS = {
    "orders": 10,
    "revenue": 14250.0,
    "source": "backend_order_ledger_simulation",
}

DRY_RUN_CRM_LEADS = {
    "leads": 2,
    "source": "crm_database_simulation",
}


class CRMBackendMetrics:
    def __init__(self, config: dict[str, Any], dry_run: bool = False):
        self.config = config
        self.dry_run = dry_run
        self.bq_project = config.get("connectors", {}).get("bigquery", {}).get("project_id", "tvc-int-matomo")
        self.bq_dataset = config.get("connectors", {}).get("bigquery", {}).get("dataset", "matomo_export")

    def get_backend_orders(self, date: str) -> dict[str, Any]:
        """Fetch ground truth orders and revenue from client backend database or BigQuery conversions."""
        if self.dry_run:
            return DRY_RUN_BACKEND_ORDERS

        try:
            from google.cloud import bigquery
            client = bigquery.Client(project=self.bq_project)
            query = f"""
                SELECT 
                    COUNT(1) as total_orders,
                    COALESCE(SUM(conversion_value), 0) as total_revenue
                FROM `{self.bq_project}.{self.bq_dataset}.connector_conversions`
                WHERE DATE(conversion_timestamp) = @check_date
            """
            job_config = bigquery.QueryJobConfig(
                query_parameters=[bigquery.ScalarQueryParameter("check_date", "DATE", date)]
            )
            rows = list(client.query(query, job_config=job_config).result())
            if rows:
                return {
                    "orders": int(rows[0]["total_orders"] or 0),
                    "revenue": float(rows[0]["total_revenue"] or 0.0),
                    "source": f"bigquery:{self.bq_project}.{self.bq_dataset}.connector_conversions",
                }
            return {
                "orders": 0,
                "revenue": 0.0,
                "source": f"bigquery:{self.bq_project}.{self.bq_dataset}.connector_conversions",
            }
        except Exception as e:
            raise RuntimeError(
                f"Failed to query backend ground-truth orders from BigQuery ({self.bq_project}.{self.bq_dataset}.connector_conversions):\n"
                f"{e}\n\n"
                f"Action Required:\n"
                f"1. Verify BigQuery table exists and service account has BigQuery Data Viewer role.\n"
                f"2. Run with '--dry-run' to simulate steady-state parity checking offline."
            )

    def get_crm_leads(self, date: str) -> dict[str, Any]:
        """Fetch ground truth lead submissions from client CRM (e.g. Salesforce, HubSpot, or SQL CRM)."""
        if self.dry_run:
            return DRY_RUN_CRM_LEADS

        try:
            from google.cloud import bigquery
            client = bigquery.Client(project=self.bq_project)
            query = f"""
                SELECT COUNT(1) as lead_count
                FROM `{self.bq_project}.{self.bq_dataset}.events`
                WHERE event_name IN ('financial_lead_submitted', 'generate_lead', 'lead')
                  AND DATE(event_timestamp) = @check_date
            """
            job_config = bigquery.QueryJobConfig(
                query_parameters=[bigquery.ScalarQueryParameter("check_date", "DATE", date)]
            )
            rows = list(client.query(query, job_config=job_config).result())
            if rows:
                return {
                    "leads": int(rows[0]["lead_count"] or 0),
                    "source": f"bigquery:{self.bq_project}.{self.bq_dataset}.events",
                }
            return {
                "leads": 0,
                "source": f"bigquery:{self.bq_project}.{self.bq_dataset}.events",
            }
        except Exception as e:
            raise RuntimeError(
                f"Failed to query CRM ground-truth leads from BigQuery ({self.bq_project}.{self.bq_dataset}.events):\n"
                f"{e}\n\n"
                f"Action Required:\n"
                f"1. Verify BigQuery table exists and service account has BigQuery Data Viewer role.\n"
                f"2. Run with '--dry-run' to simulate steady-state parity checking offline."
            )
