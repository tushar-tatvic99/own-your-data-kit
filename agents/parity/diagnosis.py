"""Diagnose parity gaps — rules engine + structured output for demo."""

from dataclasses import dataclass


@dataclass
class Diagnosis:
    likely_cause: str
    confidence: str  # high | medium | low
    proposed_fix: str
    affected_metric: str


DIAGNOSIS_RULES = [
    {
        "condition": lambda gaps: any(
            g["metric"] == "key_events" and g["gap_percent"] > 20 for g in gaps
        ),
        "cause": "A key event tag is likely missing or broken on one or more pages",
        "confidence": "high",
        "fix": "Check GTM preview mode on recently changed pages. Look for tags that stopped firing. Review the OYDK migration workspace for missing event tags.",
    },
    {
        "condition": lambda gaps: any(
            g["metric"] == "users" and g["gap_percent"] > 10 for g in gaps
        ),
        "cause": "Consent banner change may be blocking tracking for a segment of visitors",
        "confidence": "medium",
        "fix": "Verify CMP configuration: check if analytics consent rate dropped. Compare Matomo visits with consent=true vs total page loads.",
    },
    {
        "condition": lambda gaps: any(
            g["metric"] == "sessions" and g["gap_percent"] > 10 for g in gaps
        ),
        "cause": "Session timeout or definition mismatch between GA4 (default 30 min) and Matomo (default 30 min, but cookie settings may differ)",
        "confidence": "medium",
        "fix": "Align session timeout settings in Matomo (Settings > Websites > Session settings) with GA4's session definition.",
    },
    {
        "condition": lambda gaps: any(
            g["metric"] == "traffic_sources" and g["gap_percent"] > 15 for g in gaps
        ),
        "cause": "Referrer attribution differs — likely UTM parameter handling or self-referral exclusion settings",
        "confidence": "medium",
        "fix": "Check Matomo referrer exclusion list and UTM campaign tracking settings. Ensure GTM passes UTM params to Matomo custom dimensions.",
    },
    {
        "condition": lambda gaps: any(g["gap_percent"] > 5 for g in gaps),
        "cause": "Bot filtering settings differ between GA4 and Matomo",
        "confidence": "low",
        "fix": "Compare bot filtering: GA4 excludes known bots by default. Enable Matomo's bot filtering (Settings > Websites > Exclude visits by bots).",
    },
]


def diagnose(gaps: list[dict]) -> list[Diagnosis]:
    """Run diagnosis rules against parity gaps and return likely causes + fixes."""
    results = []
    for rule in DIAGNOSIS_RULES:
        if rule["condition"](gaps):
            affected = [g["metric"] for g in gaps if g["gap_percent"] > 5]
            results.append(Diagnosis(
                likely_cause=rule["cause"],
                confidence=rule["confidence"],
                proposed_fix=rule["fix"],
                affected_metric=", ".join(affected),
            ))
    return results
