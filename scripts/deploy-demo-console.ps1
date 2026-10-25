# Deploy OYDK demo console to Cloud Run (tvc-int-matomo default).
param(
  [string]$Project = "tvc-int-matomo",
  [string]$Region = "asia-south1",
  [string]$Service = "oydk-demo-console",
  [string]$GaCredentialsFile = "credentials\ga-service-account.json",
  [string]$MatomoSecret = "aurablush-matomo-api-token",
  [string]$GaSecretName = "oydk-ga-service-account",
  [string]$BasicUser = "",
  [string]$BasicPassword = ""
)

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent

if (-not (Test-Path (Join-Path $Root $GaCredentialsFile))) {
  throw "Missing $GaCredentialsFile - required for live GA4/GTM actions on Cloud Run"
}

Write-Host "Ensuring GA service account secret exists in Secret Manager..."
$prevEap = $ErrorActionPreference
$ErrorActionPreference = "SilentlyContinue"
& gcloud secrets describe $GaSecretName --project=$Project 2>&1 | Out-Null
$gaSecretExists = ($LASTEXITCODE -eq 0)
$ErrorActionPreference = $prevEap
if (-not $gaSecretExists) {
  Write-Host "Creating secret $GaSecretName ..."
  gcloud secrets create $GaSecretName --project=$Project --replication-policy=automatic
  if ($LASTEXITCODE -ne 0) { throw "gcloud secrets create failed" }
  $gaCredsPath = Join-Path $Root $GaCredentialsFile
  gcloud secrets versions add $GaSecretName --project=$Project --data-file="$gaCredsPath"
  if ($LASTEXITCODE -ne 0) { throw "gcloud secrets versions add failed" }
} else {
  Write-Host "Secret $GaSecretName already exists (skip upload unless you need a new version)"
}

$envVars = @(
  "OYDK_CONFIG=config/cloud-run.client.yaml",
  "OYDK_DEFAULT_CONFIG=config/cloud-run.client.yaml",
  "KIT_API_URL=http://35.234.210.199:8090",
  "OYDK_DEMO_HOST=0.0.0.0"
)
if ($BasicUser -and $BasicPassword) {
  $envVars += "OYDK_DEMO_BASIC_USER=$BasicUser"
  $envVars += "OYDK_DEMO_BASIC_PASSWORD=$BasicPassword"
}

$image = "gcr.io/$Project/$Service"
Push-Location $Root
$runSa = "serviceAccount:$(gcloud projects describe $Project --format='value(projectNumber)')-compute@developer.gserviceaccount.com"
foreach ($secret in @($GaSecretName, $MatomoSecret)) {
  Write-Host "Granting Secret Accessor on $secret to Cloud Run runtime SA ..."
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = "SilentlyContinue"
  gcloud secrets add-iam-policy-binding $secret --project=$Project --member=$runSa --role="roles/secretmanager.secretAccessor" 2>&1 | Out-Null
  $ErrorActionPreference = $prevEap
}

Write-Host "Building image $image ..."
$prevEap = $ErrorActionPreference
$ErrorActionPreference = "SilentlyContinue"
$buildId = gcloud builds submit . --project=$Project --config=demo/console/cloudbuild.yaml --substitutions="_IMAGE=$image" --async --format="value(id)" 2>&1 | Select-Object -Last 1
$ErrorActionPreference = $prevEap
if (-not $buildId) {
  Pop-Location
  throw "Cloud Build submit failed (no build id)"
}
Write-Host "Build id: $buildId (polling status; log streaming may be blocked by IAM) ..."
do {
  Start-Sleep -Seconds 5
  $status = gcloud builds describe $buildId --project=$Project --format="value(status)" 2>&1 | Select-Object -Last 1
  Write-Host "  build status: $status"
} while ($status -in @("QUEUED", "WORKING", "PENDING"))
if ($status -ne "SUCCESS") {
  Pop-Location
  throw "Cloud Build failed with status: $status"
}

gcloud run deploy $Service `
  --image $image `
  --project $Project `
  --region $Region `
  --allow-unauthenticated `
  --memory 2Gi `
  --cpu 2 `
  --timeout 3600 `
  --min-instances 0 `
  --max-instances 3 `
  --set-env-vars ($envVars -join ",") `
  --set-secrets "MATOMO_API_TOKEN=${MatomoSecret}:latest,/app/credentials/ga-service-account.json=${GaSecretName}:latest"

if ($LASTEXITCODE -ne 0) {
  Pop-Location
  throw "gcloud run deploy failed"
}
Pop-Location

$url = gcloud run services describe $Service --project=$Project --region=$Region --format="value(status.url)"
Write-Host ""
Write-Host "Demo console URL: $url"
Write-Host "Tip: set -BasicUser / -BasicPassword on next deploy for HTTP basic auth."
Write-Host "Note: gcloud login from the UI only works on a laptop with gcloud installed, not inside Cloud Run."
