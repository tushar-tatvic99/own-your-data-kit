# Verify Kit API, shop DPDP summary, and optional OpenAI key for the demo console.
param(
  [string]$KitUrl = "http://35.234.210.199:8090",
  [string]$ShopUrl = "https://auraandblush-61760469326.asia-south1.run.app"
)

$ErrorActionPreference = "Continue"
$ok = $true

function Test-UrlJson($name, $url) {
  Write-Host "`n[$name] $url"
  try {
    $r = Invoke-RestMethod -Uri $url -TimeoutSec 15
    Write-Host "  OK" -ForegroundColor Green
    $r | ConvertTo-Json -Depth 4 -Compress | Write-Host
    return $true
  } catch {
    Write-Host "  FAIL: $($_.Exception.Message)" -ForegroundColor Red
    return $false
  }
}

if (-not (Test-UrlJson "Kit health" "$KitUrl/health")) { $ok = $false }
if (-not (Test-UrlJson "Kit audit" "$KitUrl/audit")) { $ok = $false }
if (-not (Test-UrlJson "Shop DPDP summary" "$ShopUrl/api/dpdp/summary")) { $ok = $false }

$envFile = Join-Path (Split-Path $PSScriptRoot -Parent) ".env"
$openai = $env:OYDK_OPENAI_API_KEY
if (-not $openai -and (Test-Path $envFile)) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*OYDK_OPENAI_API_KEY=(.+)$') { $openai = $matches[1].Trim() }
  }
}
Write-Host "`n[Matomo agent LLM]"
if ($openai -and $openai -notmatch 'your-|placeholder') {
  Write-Host "  OYDK_OPENAI_API_KEY is set (agent can use OpenAI)" -ForegroundColor Green
} else {
  Write-Host "  Optional: add OYDK_OPENAI_API_KEY to .env (rule-based agent still works)" -ForegroundColor Yellow
}

if ($ok) {
  Write-Host "`nAll required infra checks passed." -ForegroundColor Green
  exit 0
}
Write-Host "`nFix: gcloud auth login; .\scripts\restart-kit-api.ps1; .\scripts\deploy-infinity-shop.ps1" -ForegroundColor Yellow
exit 1
