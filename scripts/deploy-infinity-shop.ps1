# Build & deploy Infinity Bank shop (DPDP erasure wired) to Cloud Run.
param(
  [string]$Project = "tvc-int-matomo",
  [string]$Region = "asia-south1",
  [string]$Service = "auraandblush"
)

$Root = Split-Path $PSScriptRoot -Parent
$Shop = Join-Path $Root "demo\infinity-shop"

Push-Location $Shop
gcloud run deploy $Service `
  --source . `
  --project $Project `
  --region $Region `
  --allow-unauthenticated `
  --clear-base-image `
  --set-env-vars "DPDP_EMAIL_MODE=auto,MATOMO_URL=https://matomo.35-234-210-199.nip.io,KIT_API_URL=http://35.234.210.199:8090" `
  --set-secrets "MATOMO_API_TOKEN=aurablush-matomo-api-token:latest"
if ($LASTEXITCODE -ne 0) {
  Pop-Location
  throw "gcloud run deploy failed (run gcloud auth login if tokens expired)"
}
Pop-Location

Write-Host "Deployed. Run scripts/setup-dpdp-email.ps1 to enable real SMTP/SendGrid."
