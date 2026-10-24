# Configure DPDP erasure confirmation email on Cloud Run (Gmail SMTP or SendGrid).
param(
  [string]$Project = "tvc-int-matomo",
  [string]$Region = "asia-south1",
  [string]$Service = "auraandblush",
  [ValidateSet("auto", "smtp", "sendgrid", "echo")]
  [string]$Mode = "auto",
  [string]$FromEmail = "",
  [string]$SmtpHost = "smtp.gmail.com",
  [string]$SmtpPort = "587",
  [string]$SmtpUser = "",
  [string]$SmtpPass = "",
  [string]$SendGridApiKey = ""
)

$ErrorActionPreference = "Stop"

if ($SmtpPass) {
  $tmp = [System.IO.Path]::GetTempFileName()
  [System.IO.File]::WriteAllText($tmp, $SmtpPass.Replace(' ', ''))
  $exists = $false
  gcloud secrets describe dpdp-smtp-pass --project=$Project 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) { $exists = $true }
  if (-not $exists) {
    Write-Host "Creating secret dpdp-smtp-pass..."
    gcloud secrets create dpdp-smtp-pass --project=$Project --data-file=$tmp
  } else {
    Write-Host "Adding new version to dpdp-smtp-pass..."
    gcloud secrets versions add dpdp-smtp-pass --project=$Project --data-file=$tmp
  }
  Remove-Item $tmp -Force
}

if ($SendGridApiKey -and -not (gcloud secrets describe dpdp-sendgrid-api-key --project=$Project 2>$null)) {
  $SendGridApiKey | gcloud secrets create dpdp-sendgrid-api-key --project=$Project --data-file=-
} elseif ($SendGridApiKey) {
  $SendGridApiKey | gcloud secrets versions add dpdp-sendgrid-api-key --project=$Project --data-file=-
}

$envVars = @(
  "DPDP_EMAIL_MODE=$Mode",
  "MATOMO_URL=https://matomo.35-234-210-199.nip.io",
  "KIT_API_URL=http://35.234.210.199:8090"
)
if ($FromEmail) { $envVars += "DPDP_EMAIL_FROM=$FromEmail" }
if ($SmtpHost) { $envVars += "DPDP_SMTP_HOST=$SmtpHost" }
if ($SmtpPort) { $envVars += "DPDP_SMTP_PORT=$SmtpPort" }
if ($SmtpUser) { $envVars += "DPDP_SMTP_USER=$SmtpUser" }

$secrets = @("MATOMO_API_TOKEN=aurablush-matomo-api-token:latest")
if ($SmtpPass) { $secrets += "DPDP_SMTP_PASS=dpdp-smtp-pass:latest" }
if ($SendGridApiKey) { $secrets += "DPDP_SENDGRID_API_KEY=dpdp-sendgrid-api-key:latest" }

gcloud run services update $Service `
  --project=$Project `
  --region=$Region `
  --update-env-vars ($envVars -join ",") `
  --update-secrets ($secrets -join ",")

Write-Host "Done. Test erasure on the shop and check inbox for $FromEmail / user email."
