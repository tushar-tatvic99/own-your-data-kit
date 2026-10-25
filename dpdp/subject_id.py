"""Stable Matomo User ID derived from email (no raw email in analytics ID)."""

import hashlib
import re


def normalize_email(email: str) -> str:
    return (email or "").strip().lower()


def subject_user_id(email: str) -> str:
    """Same algorithm as demo/infinity-shop/dpdp-subject.js."""
    normalized = normalize_email(email)
    digest = hashlib.sha256(normalized.encode("utf-8")).hexdigest()[:24]
    return f"dpdp-{digest}"


def matomo_lookup_ids_for_email(email: str) -> list[str]:
    """Identifiers to search when a data principal submits their registered email."""
    normalized = normalize_email(email)
    if not normalized or not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", normalized):
        return []
    return list({normalized, subject_user_id(normalized), f"email:{normalized}"})
