"""Strip personal data (emails, phone numbers) from URLs and event parameters."""

import re
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

EMAIL_PATTERN = re.compile(
    r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", re.IGNORECASE
)
PHONE_PATTERN = re.compile(
    r"(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}"
)
# Indian phone numbers
IN_PHONE_PATTERN = re.compile(r"(?:\+91|0)?[6-9]\d{9}")

PII_QUERY_PARAMS = {
    "email", "e-mail", "mail", "phone", "tel", "mobile",
    "name", "firstname", "lastname", "fname", "lname",
    "user_email", "user_phone", "contact",
}


def scrub_string(value: str) -> str:
    """Remove PII patterns from a string."""
    if not value:
        return value
    value = EMAIL_PATTERN.sub("[REDACTED_EMAIL]", value)
    value = IN_PHONE_PATTERN.sub("[REDACTED_PHONE]", value)
    value = PHONE_PATTERN.sub("[REDACTED_PHONE]", value)
    return value


def scrub_url(url: str) -> str:
    """Remove PII from URL path and query parameters."""
    if not url:
        return url

    parsed = urlparse(url)
    path = scrub_string(parsed.path)

    if parsed.query:
        params = parse_qs(parsed.query, keep_blank_values=True)
        cleaned = {}
        for key, values in params.items():
            if key.lower() in PII_QUERY_PARAMS:
                cleaned[key] = ["[REDACTED]"]
            else:
                cleaned[key] = [scrub_string(v) for v in values]
        query = urlencode(cleaned, doseq=True)
    else:
        query = parsed.query

    return urlunparse((parsed.scheme, parsed.netloc, path, parsed.params, query, parsed.fragment))


def scrub_event_params(params: dict) -> dict:
    """Scrub PII from event parameter dict."""
    cleaned = {}
    for key, value in params.items():
        if key.lower() in PII_QUERY_PARAMS:
            cleaned[key] = "[REDACTED]"
        elif isinstance(value, str):
            cleaned[key] = scrub_string(value)
        else:
            cleaned[key] = value
    return cleaned
