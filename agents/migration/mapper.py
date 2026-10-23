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

# Items that cannot be auto-migrated
UNMIGRATABLE = {
    "audiences": "GA4 audiences require manual recreation as Matomo segments",
    "funnels": "GA4 exploration funnels have no direct Matomo equivalent — use custom reports",
    "bigquery_link": "BigQuery export link must be reconfigured to point at Matomo export",
    "google_signals": "Google Signals (cross-device) is GA4-only — not available in self-hosted Matomo",
    "attribution_models": "GA4 data-driven attribution models differ from Matomo's attribution — review manually",
    "enhanced_measurement": "Enhanced measurement auto-events need manual Matomo trigger setup",
}


def map_custom_dimension(ga4_dim: dict) -> dict:
    return {
        "name": ga4_dim["display_name"],
        "scope": SCOPE_MAP.get(ga4_dim["scope"], "visit"),
        "ga4_source": ga4_dim["name"],
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
