"""Send email via SMTP (stdlib). Uses OYDK_SMTP_* or DPDP_SMTP_* from environment."""

import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Sequence


def smtp_ready() -> bool:
    return _smtp_config() is not None


def _smtp_config() -> dict | None:
    user = os.getenv("OYDK_SMTP_USER") or os.getenv("DPDP_SMTP_USER")
    password = os.getenv("OYDK_SMTP_PASS") or os.getenv("DPDP_SMTP_PASS")
    if not user or not password:
        return None
    host = os.getenv("OYDK_SMTP_HOST") or os.getenv("DPDP_SMTP_HOST") or "smtp.gmail.com"
    port = int(os.getenv("OYDK_SMTP_PORT") or os.getenv("DPDP_SMTP_PORT") or "587")
    from_addr = os.getenv("OYDK_EMAIL_FROM") or os.getenv("DPDP_EMAIL_FROM") or user
    return {
        "host": host,
        "port": port,
        "user": user,
        "password": password,
        "from_addr": from_addr,
    }


def send_email(
    to: Sequence[str],
    subject: str,
    plain_body: str,
    html_body: str | None = None,
) -> None:
    recipients = [a.strip() for a in to if a and str(a).strip()]
    if not recipients:
        raise ValueError("No recipients")

    cfg = _smtp_config()
    if not cfg:
        raise RuntimeError(
            "SMTP not configured. Set OYDK_SMTP_USER and OYDK_SMTP_PASS "
            "(or DPDP_SMTP_USER / DPDP_SMTP_PASS) in .env or kit-api environment."
        )

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = cfg["from_addr"]
    msg["To"] = ", ".join(recipients)
    msg.attach(MIMEText(plain_body, "plain", "utf-8"))
    if html_body:
        msg.attach(MIMEText(html_body, "html", "utf-8"))

    with smtplib.SMTP(cfg["host"], cfg["port"], timeout=30) as smtp:
        smtp.ehlo()
        smtp.starttls()
        smtp.ehlo()
        smtp.login(cfg["user"], cfg["password"])
        smtp.sendmail(cfg["from_addr"], recipients, msg.as_string())
