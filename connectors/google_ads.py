"""Google Ads conversion connector — upload conversions from Matomo events."""

import hashlib
import time

from google.ads.googleads.client import GoogleAdsClient
from google.ads.googleads.errors import GoogleAdsException


def send_conversion(
    customer_id: str,
    conversion_action_id: str,
    gclid: str | None = None,
    email: str | None = None,
    conversion_value: float = 0.0,
    currency: str = "INR",
    credentials_path: str = "credentials/google-ads.yaml",
) -> dict:
    """Upload an offline conversion to Google Ads."""
    client = GoogleAdsClient.load_from_storage(credentials_path)
    conversion_upload_service = client.get_service("ConversionUploadService")

    click_conversion = client.get_type("ClickConversion")
    click_conversion.conversion_action = (
        f"customers/{customer_id}/conversionActions/{conversion_action_id}"
    )
    click_conversion.conversion_date_time = time.strftime("%Y-%m-%d %H:%M:%S+05:30")
    click_conversion.conversion_value = conversion_value
    click_conversion.currency_code = currency

    if gclid:
        click_conversion.gclid = gclid
    elif email:
        normalized = email.strip().lower()
        click_conversion.user_identifiers.append(
            client.get_type("UserIdentifier")(hashed_email=hashlib.sha256(normalized.encode()).hexdigest())
        )

    try:
        response = conversion_upload_service.upload_click_conversions(
            customer_id=customer_id,
            conversions=[click_conversion],
            partial_failure=True,
        )
        return {
            "status": "success",
            "results": len(response.results),
        }
    except GoogleAdsException as ex:
        return {
            "status": "error",
            "message": ex.failure.errors[0].message if ex.failure.errors else str(ex),
        }
