"""Consent Management Platform signal bridge for ad connectors."""

from kit.config import load_config


def describe_cmp_integration(config_path: str) -> dict:
    """
    Document how CMP consent flows into GA4 Consent Mode and Matomo requireConsent.

    Connectors must only fire when analytics_storage / ad_storage are granted.
    """
    cfg = load_config(config_path)
    dpdp = cfg.get("dpdp", {})
    return {
        "cmp_provider": dpdp.get("cmp_provider", "klaro"),
        "require_consent": dpdp.get("require_consent", True),
        "ga4": "Consent Mode v2 default denied; update on CMP accept",
        "matomo": "requireConsent in tracker; setConsentGiven on accept",
        "ads_meta": "Upload conversions only when ad_storage=granted (server-side gate)",
        "status": "documented",
    }
