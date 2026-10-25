# DPDP erasure demo — prove before / after + email

Use one **test email** you control (e.g. `you+dpdp@gmail.com`).

## Quick demo URL (links Matomo User ID while you browse)

```
https://auraandblush-61760469326.asia-south1.run.app/?dpdp_email=YOU@example.com#dpdp-erasure
```

1. Open link → **Accept** analytics → click 2–3 pages.
2. Form email is pre-filled; submit erasure.

## 1) Before — prove data exists

```powershell
Invoke-RestMethod "https://auraandblush-61760469326.asia-south1.run.app/api/dpdp/visit-count?email=YOU@example.com"
py -3 -m kit.cli dsar-subject-id -e YOU@example.com
py -3 -m kit.cli dsar-lookup --user-id dpdp-XXXXXXXX -c config/client.yaml
```

Show `matomo_visit_count` ≥ **1**.

## 2) Submit on website

`#dpdp-erasure` → same email → **Complete Account & Analytics** → no order ref → submit.

Receipt shows visits **before/after**, subject ID, and **email confirmation** (sent or full preview text).

## 3) After — prove deletion

```powershell
Invoke-RestMethod ".../api/dpdp/visit-count?email=YOU@example.com"
```

Expect **`matomo_visit_count`: 0**.

## 4) Enable real email to inbox

Gmail (App Password):

```powershell
.\scripts\setup-dpdp-email.ps1 -FromEmail "your@gmail.com" -SmtpUser "your@gmail.com" -SmtpPass "xxxx xxxx xxxx xxxx"
```

SendGrid:

```powershell
.\scripts\setup-dpdp-email.ps1 -Mode sendgrid -FromEmail "dpo@yourdomain.com" -SendGridApiKey "SG.xxx"
```

Without SMTP/SendGrid, `DPDP_EMAIL_MODE=auto` shows the **full confirmation letter on the receipt** (echo).

## 5) Redeploy shop after code changes

```powershell
.\scripts\deploy-infinity-shop.ps1
```

## Judge checklist

| Step | Show |
|------|------|
| Data existed | `visit-count` ≥ 1 or Matomo Visitors |
| User requested erasure | Form + ticket ID on receipt |
| Server deleted | `visit-count` = 0, receipt deleted count |
| User notified | Inbox or receipt email preview |
