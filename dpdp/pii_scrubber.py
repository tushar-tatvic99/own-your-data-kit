"""Strip personal data (emails, phone numbers) from URLs and event parameters.

Implements DPDP-ready default privacy filters for enterprise web and app analytics.
Supports standard email formats and Indian phone number variants (+91, spaced, hyphenated).
"""

import re
from typing import Any
from urllib.parse import parse_qs, unquote, urlencode, urlparse, urlunparse

EMAIL_PATTERN = re.compile(
    r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", re.IGNORECASE
)

# Indian phone numbers (+91 / 0 prefix with 10 digits formatted with spaces, dashes, or plain)
IN_PHONE_PATTERN = re.compile(
    r"(?:(?:\+91|0)[\s\-]?)?[6-9]\d{2}[\s\-]?\d{3}[\s\-]?\d{4}|(?:(?:\+91|0)[\s\-]?)?[6-9]\d{4}[\s\-]?\d{5}|(?:(?:\+91|0)[\s\-]?)?[6-9]\d{9}"
)

# International phone numbers
INTL_PHONE_PATTERN = re.compile(
    r"(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}"
)

PII_QUERY_PARAMS = {
    "email", "e-mail", "mail", "phone", "phone_number", "tel", "telephone",
    "mobile", "cell", "contact", "name", "firstname", "lastname", "fname",
    "lname", "user_email", "user_phone", "full_name", "aadhaar", "pan",
}


def scrub_string(value: str) -> str:
    """Remove PII patterns (emails, phone numbers) from a string."""
    if not value or not isinstance(value, str):
        return value
    value = EMAIL_PATTERN.sub("[REDACTED_EMAIL]", value)
    value = IN_PHONE_PATTERN.sub("[REDACTED_PHONE]", value)
    value = INTL_PHONE_PATTERN.sub("[REDACTED_PHONE]", value)
    return value


def scrub_url(url: str) -> str:
    """Remove PII from URL path and query parameters."""
    if not url:
        return url

    # Decode first to catch encoded PII like test%40domain.com or %2B919876543210
    decoded_url = unquote(url)
    parsed = urlparse(decoded_url)
    path = scrub_string(parsed.path)

    if parsed.query:
        params = parse_qs(parsed.query, keep_blank_values=True)
        cleaned: dict[str, list[str]] = {}
        for key, values in params.items():
            if key.lower() in PII_QUERY_PARAMS:
                cleaned[key] = ["[REDACTED]"]
            else:
                cleaned[key] = [scrub_string(v) for v in values]
        query = urlencode(cleaned, doseq=True)
    else:
        query = parsed.query

    # Scrub fragment if present (e.g. #token=... or #email=...)
    fragment = scrub_string(parsed.fragment) if parsed.fragment else ""

    return urlunparse((parsed.scheme, parsed.netloc, path, parsed.params, query, fragment))


def scrub_value(value: Any) -> Any:
    """Recursively scrub any value, dictionary, or array."""
    if isinstance(value, str):
        return scrub_string(value)
    elif isinstance(value, dict):
        return scrub_event_params(value)
    elif isinstance(value, list):
        return [scrub_value(item) for item in value]
    return value


def scrub_event_params(params: dict[str, Any]) -> dict[str, Any]:
    """Recursively scrub PII from event parameter dict."""
    if not isinstance(params, dict):
        return params

    cleaned: dict[str, Any] = {}
    for key, value in params.items():
        if key.lower() in PII_QUERY_PARAMS:
            cleaned[key] = "[REDACTED]"
        else:
            cleaned[key] = scrub_value(value)
    return cleaned
