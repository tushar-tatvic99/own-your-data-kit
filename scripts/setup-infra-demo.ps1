# One script: restart Kit API on VM + redeploy Cloud Run shop (after gcloud auth).
param(
  [switch]$SkipShop,
  [switch]$SkipKitApi
)

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent

Write-Host "=== OYDK infra setup for demo console ===" -ForegroundColor Cyan
Write-Host "Requires: gcloud auth login (interactive) and project tvc-int-matomo`n"

gcloud auth print-access-token 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "gcloud tokens expired. Run: gcloud auth login"
}

if (-not $SkipKitApi) {
  & (Join-Path $PSScriptRoot "restart-kit-api.ps1")
}

if (-not $SkipShop) {
  & (Join-Path $PSScriptRoot "deploy-infinity-shop.ps1")
}

Write-Host "`nVerifying endpoints..."
& (Join-Path $PSScriptRoot "verify-infra.ps1")
