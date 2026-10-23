"""Meta Conversions API connector — send server-side events."""

import hashlib
import time

import requests


def send_event(
    pixel_id: str,
    access_token: str,
    event_name: str = "Purchase",
    email: str | None = None,
    phone: str | None = None,
    value: float = 0.0,
    currency: str = "INR",
    event_source_url: str = "",
    test_event_code: str | None = None,
) -> dict:
    """Send a server-side event to Meta Conversions API."""
    user_data = {}
    if email:
        user_data["em"] = hashlib.sha256(email.strip().lower().encode()).hexdigest()
    if phone:
        normalized = phone.strip().replace("+", "").replace("-", "").replace(" ", "")
        user_data["ph"] = hashlib.sha256(normalized.encode()).hexdigest()

    event = {
        "event_name": event_name,
        "event_time": int(time.time()),
        "action_source": "website",
        "event_source_url": event_source_url,
        "user_data": user_data,
        "custom_data": {
            "value": value,
            "currency": currency,
        },
    }

    payload = {
        "data": [event],
        "access_token": access_token,
    }
    if test_event_code:
        payload["test_event_code"] = test_event_code

    url = f"https://graph.facebook.com/v19.0/{pixel_id}/events"
    resp = requests.post(url, json=payload, timeout=15)
    return resp.json()
