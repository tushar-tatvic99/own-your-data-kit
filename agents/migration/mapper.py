"""Map GA4/GTM concepts to Matomo equivalents."""

# GA4 scope → Matomo custom dimension scope
SCOPE_MAP = {
    "EVENT": "action",
    "USER": "visit",
}

# GA4 built-in events that map to Matomo goals
BUILTIN_EVENT_GOALS = {
    "purchase": {"name": "Purchase", "match_attribute": "event_action", "pattern": "purchase"},
    "sign_up": {"name": "Sign Up", "match_attribute": "event_action", "pattern": "sign_up"},
    "add_to_cart": {"name": "Add to Cart", "match_attribute": "event_action", "pattern": "add_to_cart"},
    "begin_checkout": {"name": "Begin Checkout", "match_attribute": "event_action", "pattern": "begin_checkout"},
    "generate_lead": {"name": "Generate Lead", "match_attribute": "event_action", "pattern": "generate_lead"},
}

# Items that cannot be auto-migrated: Technical Rationale & Workable Alternatives
UNMIGRATABLE = [
    {
        "feature": "GA4 Predictive Metrics (Purchase Probability, Churn Risk)",
        "category": "Machine Learning",
        "why": "GA4 predictive metrics rely on proprietary Google-hosted neural networks trained across closed Google identity graphs. Cannot be exported or run inside self-hosted open-source stacks.",
        "alternative": "Deploy a BigQuery ML logistic regression or XGBoost model on the continuous raw event export (dataset `matomo_export.events`). Run weekly batch scoring to compute churn/purchase likelihood percentiles.",
        "action": "Execute provided BigQuery ML scoring template in `connectors/templates/predictive_scoring.sql`.",
    },
    {
        "feature": "Google Signals Audiences (Cross-Device Graph)",
        "category": "Identity & Audiences",
        "why": "Google Signals aggregates data from users logged into Google accounts across devices. Third-party self-hosted tools cannot access Google's private identity graph. (Also presents DPDP consent liabilities under Section 4).",
        "alternative": "Implement first-party deterministic User-ID tracking via client authenticated login sessions (`setUserId`). Perform server-side identity stitching in BigQuery using hashed customer IDs.",
        "action": "Enable `setUserId` in `matomo-tracker.js` on user login and authenticate sessions.",
    },
    {
        "feature": "Exploration Funnels (Custom Multi-Step Funnel Reports)",
        "category": "Reporting",
        "why": "GA4 Explorations are stored in Google's internal closed-source reporting UI and do not have an automated export/import API endpoint.",
        "alternative": "Recreate funnels using Matomo's Funnels visual builder or utilize pre-built Looker Studio Funnel visualizations querying the BigQuery raw event table.",
        "action": "Open Looker Studio template `matomo-marketing-overview` and review Funnel tabs.",
    },
    {
        "feature": "Data-Driven Attribution (DDA / Shapley Algorithm)",
        "category": "Attribution",
        "why": "GA4 uses a proprietary algorithmic Shapley-value model that is evaluated in Google's cloud backend.",
        "alternative": "Utilize Matomo Multi-Channel Conversion Attribution plugin supporting Linear, Position-Based (40-20-40), First Interaction, and Time-Decay attribution models with 100% data ownership.",
        "action": "Configure Position-Based Attribution in Matomo Admin -> Goals -> Multi Channel Conversion Attribution.",
    },
    {
        "feature": "Enhanced Measurement (Auto Scroll & Video Tracking)",
        "category": "Client Ingestion",
        "why": "GA4 dynamically injects DOM event listeners for 90% scroll depth and YouTube embedded players via Google gtag.js.",
        "alternative": "Use OYDK pre-configured GTM triggers for Scroll Depth (25%, 50%, 75%, 90%) and Video Engagements dispatching Matomo custom events.",
        "action": "Inspect staged triggers in the generated `OYDK Migration Draft` GTM workspace.",
    },
    {
        "feature": "Direct Google Ads Native Audience Sync",
        "category": "Advertising",
        "why": "GA4 automatically synchronizes audience segments to Google Ads via shared Google account linking.",
        "alternative": "Use the OYDK Google Ads Connector (`connectors/google_ads.py`) or BigQuery Customer Match export to stream hashed first-party customer lists directly via Google Ads API v26.",
        "action": "Automated daily sync managed via `.venv/bin/python3 -m kit.cli bq-sync`.",
    },
]


def map_custom_dimension(ga4_dim: dict) -> dict:
    return {
        "name": ga4_dim["display_name"],
        "scope": SCOPE_MAP.get(ga4_dim["scope"], "visit"),
        "ga4_source": ga4_dim["name"],
        "description": ga4_dim.get("description", ""),
    }


def map_custom_metric(ga4_metric: dict) -> dict:
    return {
        "name": ga4_metric["display_name"],
        "scope": SCOPE_MAP.get(ga4_metric.get("scope", "EVENT"), "action"),
        "measurement_unit": ga4_metric.get("measurement_unit", "STANDARD"),
        "ga4_source": ga4_metric["name"],
        "target_mapping": "Event Value / Numerical Dimension",
    }


def map_conversion_event(ga4_event: dict) -> dict:
    event_name = ga4_event["name"]
    if event_name in BUILTIN_EVENT_GOALS:
        goal = BUILTIN_EVENT_GOALS[event_name].copy()
        goal["ga4_source"] = event_name
        return goal
    return {
        "name": event_name.replace("_", " ").title(),
        "match_attribute": "event_action",
        "pattern": event_name,
        "pattern_type": "exact",
        "ga4_source": event_name,
    }


def map_gtm_tag_to_matomo(tag: dict) -> dict | None:
    """Map a GTM tag to a Matomo tracking instruction."""
    tag_type = tag.get("type", "")

    if tag_type == "gaawe":  # GA4 event tag
        event_name = _extract_param(tag, "eventName")
        return {
            "action": "track_event",
            "category": _extract_param(tag, "eventSettingsTable", "parameter") or "general",
            "event_name": event_name,
            "gtm_tag_name": tag["name"],
        }
    elif tag_type == "gaawc":  # GA4 config tag
        return {
            "action": "replace_with_matomo_config",
            "gtm_tag_name": tag["name"],
            "note": "Replace GA4 config tag with Matomo tracker snippet",
        }
    return None


def generate_gtm_draft_changes(tags: list[dict], matomo_url: str, site_id: int) -> list[dict]:
    """Generate GTM draft changes: add Matomo tags alongside existing GA4 tags."""
    changes = []

    # Add Matomo config tag
    changes.append({
        "type": "tag",
        "action": "create",
        "name": "OYDK - Matomo Config",
        "tag_type": "html",
        "html": _matomo_config_html(matomo_url, site_id),
        "firing_trigger": "All Pages",
        "note": "Matomo base tracker — fires only after consent (see consent snippet)",
    })

    for tag in tags:
        mapped = map_gtm_tag_to_matomo(tag)
        if mapped and mapped["action"] == "track_event":
            changes.append({
                "type": "tag",
                "action": "create",
                "name": f"OYDK - Matomo Event: {mapped['event_name']}",
                "tag_type": "html",
                "html": f"_paq.push(['trackEvent', '{mapped['category']}', '{mapped['event_name']}']);",
                "firing_trigger": tag.get("name", "unknown"),
                "replaces_ga4_tag": tag["name"],
                "note": f"Mirrors GA4 event '{mapped['event_name']}' from tag '{tag['name']}'",
            })

    return changes


def _extract_param(tag: dict, key: str, subkey: str | None = None) -> str | None:
    for param in tag.get("parameter", []):
        if param.get("key") == key:
            if subkey:
                for item in param.get("list", []):
                    for p in item.get("map", []):
                        if p.get("key") == subkey:
                            return p.get("value")
            return param.get("value")
    return None


def _matomo_config_html(matomo_url: str, site_id: int) -> str:
    return f"""<script>
  var _paq = window._paq = window._paq || [];
  _paq.push(['requireConsent']);
  _paq.push(['setTrackerUrl', '{matomo_url}/matomo.php']);
  _paq.push(['setSiteId', '{site_id}']);
  _paq.push(['trackPageView']);
</script>
<script async src="{matomo_url}/matomo.js"></script>"""


def generate_importable_gtm_json(changes: list[dict], container_id: str = "GTM-MMXM5L53") -> dict:
    """Produce an official GTM container JSON file that can be imported via GTM UI."""
    gtm_tags = []
    for i, change in enumerate(changes, start=1001):
        gtm_tags.append({
            "accountId": "6000000000",
            "containerId": container_id,
            "tagId": str(i),
            "name": change["name"],
            "type": "html",
            "parameter": [
                {"type": "template", "key": "html", "value": change["html"]},
                {"type": "boolean", "key": "supportDocumentWrite", "value": "false"},
            ],
            "firingTriggerId": ["2147479553"] if "Config" in change["name"] else ["201"],
            "notes": f"OYDK Staged Draft Migration: {change.get('note', '')}",
        })

    return {
        "exportFormatVersion": 2,
        "exportTime": "2026-10-25 00:00:00",
        "containerVersion": {
            "path": f"accounts/6000000000/containers/{container_id}/versions/0",
            "accountId": "6000000000",
            "containerId": container_id,
            "containerVersionId": "0",
            "name": "OYDK Staged Draft Workspace (Unpublished)",
            "description": "Auto-generated by Tatvic Own-Your-Data Kit migration agent. Contains staged open-source tracking tags. Human review required before publishing.",
            "container": {
                "name": "OYDK Production Container",
                "publicId": container_id,
            },
            "tag": gtm_tags,
        },
    }
