"""Live connector detail views for the demo console (click each card)."""

import json
from pathlib import Path
from typing import Any

from connectors.cmp_signals import describe_cmp_integration
from connectors.demo_pipeline import is_placeholder
from connectors.looker import generate_dashboard_config
from kit.config import load_config

REPO_ROOT = Path(__file__).resolve().parents[2]
LOOKER_OUTPUT = REPO_ROOT / "output" / "connectors" / "looker-dashboard.json"


def _bq_console_url(project: str, dataset: str, table: str) -> str:
    return (
        "https://console.cloud.google.com/bigquery?"
        f"project={project}&ws=!1m5!1m4!4m3!1s{project}!2s{dataset}!3s{table}"
    )


def _ads_conversion_url(customer_id: str, conversion_action_id: str) -> str:
    """Deep-link to the configured conversion action (not the Ads home/overview)."""
    cid = (customer_id or "").replace("-", "")
    ct = (conversion_action_id or "").strip()
    if ct and cid:
        return f"https://ads.google.com/aw/conversions/detail?ctId={ct}&ocid={cid}"
    if cid:
        return f"https://ads.google.com/aw/conversions?ocid={cid}"
    return "https://ads.google.com/aw/conversions"


def view_cmp(config_path: str) -> dict[str, Any]:
    cfg = load_config(config_path)
    shop = (cfg.get("client") or {}).get("website_url", "")
    dpdp = cfg.get("dpdp", {})
    integration = describe_cmp_integration(config_path)
    return {
        "id": "cmp",
        "title": "CMP → GA4 / Matomo",
        "configured": True,
        "summary": "Consent gates analytics on the live shop before GA4/Matomo fire.",
        "config": {
            "cmp_provider": dpdp.get("cmp_provider"),
            "require_consent": dpdp.get("require_consent"),
            "shop_url": shop,
            "integration": integration,
        },
        "open_url": shop or None,
        "open_label": "Open live shop (CMP banner)",
        "preview_lines": [
            f"CMP: {dpdp.get('cmp_provider', '—')}",
            f"Shop: {shop or '(set on Deploy tab)'}",
            f"GA4: {integration.get('ga4', '—')}",
            f"Matomo: {integration.get('matomo', '—')}",
        ],
    }


def view_google_ads(config_path: str) -> dict[str, Any]:
    cfg = load_config(config_path)
    ads = cfg.get("connectors", {}).get("google_ads", {})
    creds = ads.get("credentials_file", "credentials/google-ads.yaml")
    cred_path = REPO_ROOT / creds
    customer_id = ads.get("customer_id", "")
    action_id = ads.get("conversion_action_id", "")
    lines = [
        f"Customer ID: {customer_id}",
        f"Conversion action: {action_id}",
        f"Name: {ads.get('conversion_name', '—')}",
        f"Credentials: {creds} ({'found' if cred_path.is_file() else 'MISSING'})",
    ]
    live: dict[str, Any] = {"status": "not_run"}
    if not customer_id or is_placeholder(customer_id):
        return {
            "id": "google_ads",
            "title": "Google Ads conversions",
            "configured": False,
            "summary": "Set customer_id in config/client.yaml connectors.google_ads",
            "preview_lines": lines,
        }
    if not cred_path.is_file():
        live = {"status": "error", "message": f"Add {creds} (Google Ads API yaml)"}
    else:
        try:
            from connectors.google_ads import send_conversion

            result = send_conversion(
                customer_id,
                action_id,
                email="oydk-connector-test@tatvic.com",
                conversion_value=1.0,
                credentials_path=str(cred_path),
            )
            live = {"status": "ok" if result.get("status") == "success" else "error", "result": result}
            lines.append(f"Live test upload: {result}")
        except Exception as exc:
            live = {"status": "error", "message": str(exc)}
            lines.append(f"Live test: {exc}")

    conv_name = ads.get("conversion_name", "purchase")
    bq = cfg.get("connectors", {}).get("bigquery", {})
    bq_project = bq.get("project_id", "")
    bq_dataset = bq.get("dataset", "matomo_export")
    bq_conv_table = bq.get("conversions_table", "connector_conversions")
    bq_url = (
        _bq_console_url(bq_project, bq_dataset, bq_conv_table)
        if bq_project
        else None
    )
    return {
        "id": "google_ads",
        "title": "Google Ads conversions",
        "configured": True,
        "summary": (
            "Hackathon proof: Matomo purchases land in BigQuery, then this kit uploads them to your "
            f"Google Ads conversion action ({conv_name}) via ConversionUploadService — not GA4."
        ),
        "config": ads,
        "live_check": live,
        "open_url": _ads_conversion_url(customer_id, action_id),
        "open_label": f"Open conversion action in Ads ({conv_name})",
        "secondary_open_url": bq_url,
        "secondary_open_label": "BigQuery: connector_conversions (source rows)",
        "preview_lines": lines
        + [
            "Judge flow: (1) purchase on shop with consent → Matomo goal",
            "(2) bq-sync fills matomo_export.connector_conversions",
            "(3) connectors-test or this card calls send_conversion (gclid or hashed email)",
            f"(4) verify in Ads → Goals → Conversions → {conv_name}",
        ],
    }


def view_meta(config_path: str) -> dict[str, Any]:
    meta = load_config(config_path).get("connectors", {}).get("meta", {})
    pixel = meta.get("pixel_id", "")
    configured = bool(pixel) and not is_placeholder(pixel)
    return {
        "id": "meta",
        "title": "Meta Conversions API",
        "configured": configured,
        "summary": "Not configured for this demo — add connectors.meta.pixel_id and access_token in YAML to enable.",
        "config": meta if configured else {},
        "preview_lines": [
            "pixel_id: (not set)",
            "access_token: (not set)",
            "Use Deploy → generated client YAML when you have Meta credentials.",
        ],
        "open_url": None,
    }


def view_bigquery(config_path: str) -> dict[str, Any]:
    cfg = load_config(config_path)
    bq = cfg.get("connectors", {}).get("bigquery", {})
    project = bq.get("project_id", "")
    dataset = bq.get("dataset", "matomo_export")
    table = bq.get("table", "events")
    conv = bq.get("conversions_table", "connector_conversions")
    fq = f"{project}.{dataset}.{table}"
    lines = [f"Table: {fq}", f"Connector conversions: {project}.{dataset}.{conv}"]
    sample: list[dict] = []
    stats: dict[str, Any] = {}
    if not project:
        return {
            "id": "bigquery",
            "title": "BigQuery warehouse",
            "configured": False,
            "summary": "Set connectors.bigquery.project_id in client YAML",
            "preview_lines": lines,
        }
    try:
        from google.cloud import bigquery

        client = bigquery.Client(project=project)
        q = f"SELECT COUNT(*) AS n FROM `{fq}`"
        try:
            row = list(client.query(q).result())[0]
            stats["row_count"] = int(row.n)
            lines.append(f"Rows in {table}: {stats['row_count']}")
        except Exception as exc:
            stats["row_count_error"] = str(exc)
            lines.append(f"Count: {exc}")

        try:
            sample_q = f"SELECT event_timestamp, event_name, event_category, page_url FROM `{fq}` ORDER BY event_timestamp DESC LIMIT 8"
            sample = [dict(r) for r in client.query(sample_q).result()]
        except Exception:
            sample = []

        stats["dataset_exists"] = True
    except Exception as exc:
        stats["error"] = str(exc)
        lines.append(f"GCP/BQ: {exc}")

    return {
        "id": "bigquery",
        "title": "BigQuery warehouse",
        "configured": True,
        "summary": "Live dataset from your GCP project (service account / ADC).",
        "config": bq,
        "stats": stats,
        "sample_rows": sample,
        "open_url": _bq_console_url(project, dataset, table),
        "open_label": "Open table in Google Cloud Console",
        "preview_lines": lines,
    }


def view_looker(config_path: str) -> dict[str, Any]:
    cfg = load_config(config_path)
    bq = cfg.get("connectors", {}).get("bigquery", {})
    looker_cfg = cfg.get("connectors", {}).get("looker", {})
    project = bq.get("project_id", "tvc-int-matomo")
    dataset = bq.get("dataset", "matomo_export")
    table = bq.get("table", "events")
    dash = generate_dashboard_config(project, dataset, table)
    dash["dashboard_id"] = looker_cfg.get("dashboard_id", "matomo-marketing-overview")
    LOOKER_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    LOOKER_OUTPUT.write_text(json.dumps(dash, indent=2), encoding="utf-8")
    url = dash.get("direct_looker_studio_url", "")
    return {
        "id": "looker",
        "title": "Looker Studio",
        "configured": True,
        "summary": "Opens Looker Studio with BigQuery source pre-filled (create report wizard).",
        "config": {"looker": looker_cfg, "bigquery_source": {"project": project, "dataset": dataset, "table": table}},
        "dashboard_json_path": str(LOOKER_OUTPUT.relative_to(REPO_ROOT)),
        "dashboard_preview": {
            "name": dash.get("name"),
            "dimensions": len(dash.get("dataSource", {})),
            "pages": len(dash.get("pages", [])),
        },
        "open_url": url,
        "open_label": "Create / open Looker Studio report (BigQuery)",
        "preview_lines": [
            f"Data source: {project}.{dataset}.{table}",
            f"Dashboard template: {dash.get('name')}",
            f"Saved: {LOOKER_OUTPUT.relative_to(REPO_ROOT)}",
        ],
    }


def connector_view(connector_id: str, config_path: str) -> dict[str, Any]:
    views = {
        "cmp": view_cmp,
        "google_ads": view_google_ads,
        "meta": view_meta,
        "bigquery": view_bigquery,
        "looker": view_looker,
    }
    fn = views.get(connector_id)
    if not fn:
        return {"error": f"Unknown connector: {connector_id}"}
    return fn(config_path)
