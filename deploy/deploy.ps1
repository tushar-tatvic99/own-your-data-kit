# One-command deployment for Own-Your-Data Analytics Kit (Windows)
# Usage: .\deploy\deploy.ps1 -ProjectId <gcp-project-id> [-ClientName demo]
param(
    [Parameter(Mandatory=$true)][string]$ProjectId,
    [string]$ClientName = "demo"
)

$ErrorActionPreference = "Stop"
$Region = "asia-south1"
$Zone = "asia-south1-a"
$RootDir = Split-Path -Parent $PSScriptRoot

Write-Host "========================================"
Write-Host " Own-Your-Data Analytics Kit — Deploy"
Write-Host " Project: $ProjectId"
Write-Host " Client:  $ClientName"
Write-Host " Region:  $Region (India)"
Write-Host "========================================"

# Local dev mode — skip GCP, start Docker stack locally
if ($env:OYDK_LOCAL -eq "1") {
    Write-Host "[LOCAL] Starting Docker Compose stack..."
    Push-Location "$RootDir\deploy\docker"
    if (-not (Test-Path ".env")) { Copy-Item ".env.example" ".env" }
    docker compose up -d --build
    Pop-Location
    Write-Host "Matomo:  http://localhost:8080"
    Write-Host "Kit API: http://localhost:8090"
    exit 0
}

# 1. Enable APIs
Write-Host "[1/6] Enabling GCP APIs..."
gcloud services enable compute.googleapis.com storage.googleapis.com `
    secretmanager.googleapis.com monitoring.googleapis.com `
    cloudscheduler.googleapis.com bigquery.googleapis.com `
    --project=$ProjectId

# 2. Terraform
Write-Host "[2/6] Provisioning infrastructure..."
Push-Location "$PSScriptRoot\terraform"
terraform init -input=false
terraform apply -auto-approve `
    -var="project_id=$ProjectId" `
    -var="client_name=$ClientName" `
    -var="region=$Region" `
    -var="zone=$Zone"
$AnalyticsIp = terraform output -raw analytics_ip
Pop-Location

Write-Host "[3/6] Copying kit to server..."
gcloud compute scp --recurse `
    "$RootDir\deploy\docker", "$RootDir\kit", "$RootDir\agents", `
    "$RootDir\dpdp", "$RootDir\connectors", "$RootDir\config", `
    "$RootDir\requirements.txt" `
    "${ClientName}-analytics:/opt/own-your-data-kit/" `
    --zone=$Zone --project=$ProjectId

Write-Host "[4/6] Starting services..."
gcloud compute ssh "${ClientName}-analytics" --zone=$Zone --project=$ProjectId `
    --command="cd /opt/own-your-data-kit/docker && cp .env.example .env && docker compose up -d --build"

Write-Host "[5/6] Waiting for Matomo..."
for ($i = 1; $i -le 30; $i++) {
    try {
        Invoke-WebRequest -Uri "http://${AnalyticsIp}:8080" -UseBasicParsing -TimeoutSec 5 | Out-Null
        Write-Host "Matomo is up!"
        break
    } catch {
        Write-Host "  Waiting... ($i/30)"
        Start-Sleep -Seconds 10
    }
}

Write-Host "[6/6] Deployment complete!"
Write-Host "Matomo:  http://${AnalyticsIp}:8080"
Write-Host "Kit API: http://${AnalyticsIp}:8090"
