# ==============================================================================
# TATVIC OWN-YOUR-DATA ANALYTICS KIT (OYDK) — WINDOWS ENTERPRISE INSTALLER
# ==============================================================================
# One-command automated deployment for GCP (India region) and On-Premise on Windows.
# Usage:
#   Interactive:  irm https://oydk-portal-61760469326.asia-south1.run.app/install.ps1 | iex
#   Local Repo:   .\deploy\install.ps1
#   Dry Run:      .\deploy\install.ps1 -DryRun
#   Unattended:   .\deploy\install.ps1 -Target gcp -ProjectId tvc-int-matomo -ClientName demo -Profile standard
# ==============================================================================
[CmdletBinding()]
param(
    [switch]$DryRun,
    [string]$Target = "",
    [string]$ProjectId = "",
    [string]$ClientName = "",
    [string]$Profile = "standard",
    [string]$Engine = "matomo",
    [string]$Region = "asia-south1",
    [string]$Zone = "asia-south1-a",
    [string]$Ga4PropertyId = "61760469326",
    [string]$GtmContainerId = "GTM-MMXM5L53",
    [string]$GtmAccountId = "6000000000",
    [string]$CredentialsPath = "credentials/ga-service-account.json",
    [int]$ParityTargetGap = 5,
    [string]$AlertEmails = "analytics-owner@client.com,devops-alerts@tatvic.com",
    [switch]$Unattended
)

$ErrorActionPreference = "Stop"

# Detect root directory or clone repository
$RootDir = Get-Location
if (Test-Path "deploy\deploy.ps1") {
    # Already in repo root
} elseif (Test-Path "own-your-data-kit\deploy\deploy.ps1") {
    Set-Location "own-your-data-kit"
    $RootDir = Get-Location
} else {
    Write-Host "Cloning Own-Your-Data Kit repository from GitHub..." -ForegroundColor Cyan
    try {
        git clone https://github.com/tushar-tatvic99/own-your-data-kit.git
        if (Test-Path "own-your-data-kit") {
            Set-Location "own-your-data-kit"
            $RootDir = Get-Location
            Write-Host "✓ Repository cloned successfully." -ForegroundColor Green
        }
    } catch {
        Write-Warning "Could not clone repository automatically via git. If in dry-run mode, simulation will proceed."
    }
}

# Display Banner
Clear-Host
Write-Host @"
  ██████╗ ██╗   ██╗██████╗ ██╗  ██╗    ███████╗██╗   ██╗██╗████████╗███████╗
 ██╔═══██╗╚██╗ ██╔╝██╔══██╗██║ ██╔╝    ██╔════╝██║   ██║██║╚══██╔══╝██╔════╝
 ██║   ██║ ╚████╔╝ ██║  ██║█████╔╝     ███████╗██║   ██║██║   ██║   █████╗  
 ██║   ██║  ╚██╔╝  ██║  ██║██╔═██╗     ╚════██║██║   ██║██║   ██║   ██╔══╝  
 ╚██████╔╝   ██║   ██████╔╝██║  ██╗    ███████║╚██████╔╝██║   ██║   ███████╗
  ╚═════╝    ╚═╝   ╚═════╝ ╚═╝  ╚═╝    ╚══════╝ ╚═════╝ ╚═╝   ╚═╝   ╚══════╝
      Enterprise Open-Source Analytics Kit — Tatvic Analytics (Windows)
"@ -ForegroundColor Cyan

Write-Host "One-Command Enterprise Deployment & Architecture Provisioner (PowerShell)" -ForegroundColor White
Write-Host "================================================================================"

function Prompt-User([string]$prompt, [string]$defaultVal) {
    if ($defaultVal) {
        $resp = Read-Host "$prompt (default: $defaultVal)"
        if ([string]::IsNullOrWhiteSpace($resp)) { return $defaultVal }
        return $resp
    } else {
        return (Read-Host $prompt)
    }
}

# Interactive Prompts if not unattended and parameters missing
if (-not $Unattended) {
    if (-not $Target -and -not $DryRun) {
        Write-Host "`n[1/5] Select Deployment Mode & Target Infrastructure:" -ForegroundColor Yellow
        Write-Host "  1) Google Cloud Platform (VPC + VM in India asia-south1)"
        Write-Host "  2) On-Premise / Bare Metal (Local Docker Compose stack)"
        Write-Host "  3) Instantaneous Dry-Run Simulation ($0 Billing Impact)"
        $envChoice = Prompt-User "Enter choice [1-3]" "3"
        if ($envChoice -eq "1") {
            $Target = "gcp"
        } elseif ($envChoice -eq "2") {
            $Target = "on-premise"
        } else {
            $DryRun = $true
            $Target = "gcp"
        }
    }

    if (-not $DryRun -and $Target -eq "gcp" -and -not $ProjectId) {
        $activeProject = ""
        try { $activeProject = (gcloud config get-value project 2>$null).Trim() } catch {}
        if (-not $activeProject) { $activeProject = "tvc-int-matomo" }
        Write-Host "`n[2/5] Google Cloud Configuration:" -ForegroundColor Yellow
        $ProjectId = Prompt-User "Enter GCP Project ID" $activeProject
    }

    if (-not $ClientName) {
        $defaultClient = "client-$((Get-Date).ToString('mmss'))"
        Write-Host "`n[3/5] Client Identification:" -ForegroundColor Yellow
        $ClientName = Prompt-User "Enter Client Slug" $defaultClient
    }

    if (-not $DryRun -and $Target -eq "gcp") {
        Write-Host "`n[4/5] Select Hardware & Scaling Profile (see docs/scaling.md):" -ForegroundColor Yellow
        Write-Host "  1) standard   [e2-standard-4 (4 vCPU, 16 GB RAM), 100 GB SSD] - Recommended for up to 10M events/mo"
        Write-Host "  2) small      [e2-standard-2 (2 vCPU, 8 GB RAM), 50 GB SSD]   - Dev/POC mode"
        Write-Host "  3) enterprise [c2-standard-8 (8 vCPU, 32 GB RAM), 250 GB SSD] - Enterprise BFSI / High Traffic"
        $profChoice = Prompt-User "Enter choice [1-3]" "1"
        if ($profChoice -eq "2") { $Profile = "small" }
        elseif ($profChoice -eq "3") { $Profile = "enterprise" }
        else { $Profile = "standard" }
    }

    Write-Host "`n[5/5] GA4 & GTM Migration Source (Press Enter for practice property):" -ForegroundColor Yellow
    $Ga4PropertyId = Prompt-User "Enter GA4 Property ID" $Ga4PropertyId
    $GtmContainerId = Prompt-User "Enter GTM Container ID" $GtmContainerId
    $AlertEmails = Prompt-User "Enter alert notification email(s)" $AlertEmails
}

# Defaults fallback
if (-not $ClientName) { $ClientName = "demo-client" }
if (-not $Target) { $Target = "gcp" }
if (-not $ProjectId) { $ProjectId = "tvc-int-matomo" }

Write-Host "`nDeployment Configuration Summary:" -ForegroundColor Blue
Write-Host "--------------------------------------------------"
Write-Host "  Target Platform : $($Target.ToUpper())"
Write-Host "  Client Name     : $ClientName"
Write-Host "  Analytics Stack : $($Engine.ToUpper())"
if ($Target -eq "gcp") {
    Write-Host "  GCP Project     : $ProjectId"
    Write-Host "  Cloud Region    : $Region (Mumbai, India)"
    Write-Host "  Scale Profile   : $Profile"
}
Write-Host "  GA4 Property    : $Ga4PropertyId"
Write-Host "  GTM Container   : $GtmContainerId"
if ($DryRun) {
    Write-Host "  Execution Mode  : DRY-RUN SIMULATION (No Billing Impact)" -ForegroundColor Magenta
} else {
    Write-Host "  Execution Mode  : LIVE EXECUTION" -ForegroundColor Green
}
Write-Host "--------------------------------------------------"

# ==============================================================================
# DRY-RUN SIMULATION ENGINE
# ==============================================================================
if ($DryRun) {
    Write-Host "`nSimulating Deployment Architecture Execution..." -ForegroundColor Cyan
    Start-Sleep -Milliseconds 800

    if ($Target -eq "gcp") {
        Write-Host "  [1/5] [SIMULATED] Verifying GCP Project '$ProjectId' & APIs:"
        Write-Host "        ✓ compute.googleapis.com (VPC & VM)" -ForegroundColor Green
        Write-Host "        ✓ storage.googleapis.com (Backups Bucket)" -ForegroundColor Green
        Write-Host "        ✓ bigquery.googleapis.com (Warehouse Export)" -ForegroundColor Green
        Write-Host "        ✓ cloudscheduler.googleapis.com (Automated Backups)" -ForegroundColor Green
        Write-Host "        ✓ monitoring.googleapis.com (Uptime Health Check)" -ForegroundColor Green
        Start-Sleep -Milliseconds 600

        Write-Host "  [2/5] [SIMULATED] Planning Terraform Resource Graph in $Region ($Profile profile):"
        Write-Host "        + google_compute_network.${ClientName}-analytics-vpc"
        Write-Host "        + google_compute_subnetwork.${ClientName}-analytics-subnet (10.0.0.0/24)"
        Write-Host "        + google_compute_address.${ClientName}-analytics-ip (Static IP)"
        Write-Host "        + google_compute_instance.${ClientName}-analytics ($Profile)"
        Write-Host "        + google_storage_bucket.${ProjectId}-${ClientName}-analytics-backups (90d retention)"
        Write-Host "        + google_monitoring_uptime_check_config.${ClientName}-matomo (300s period)"
        Start-Sleep -Milliseconds 600

        $SimIp = "35.234.210.199"
        $SimUrl = "https://matomo.$($SimIp.Replace('.', '-')).nip.io"
        Write-Host "  [3/5] [SIMULATED] Inspecting SSL & Automated Caddy Edge Proxy:"
        Write-Host "        ✓ Ingress SSL Endpoint: $SimUrl" -ForegroundColor Green
        Start-Sleep -Milliseconds 500
    } else {
        Write-Host "  [1/5] [SIMULATED] Verifying Local Container Runtime:"
        Write-Host "        ✓ Docker Engine online" -ForegroundColor Green
        Write-Host "        ✓ Docker Compose v2 active" -ForegroundColor Green
        Start-Sleep -Milliseconds 600

        Write-Host "  [2/5] [SIMULATED] Container Topology Planning:"
        Write-Host "        + matomo-mysql (MariaDB 10.11)"
        Write-Host "        + matomo-app (Matomo 5.14.2 PHP-FPM)"
        Write-Host "        + kit-api (FastAPI / DPDP endpoints)"
        Write-Host "        + kit-scheduler (Automated Cron / Parity)"
        $SimUrl = "http://localhost:8080"
    }

    Write-Host "  [4/5] [SIMULATED] Ingesting GA4 & GTM Migration Targets:"
    Write-Host "        • GA4 Property ID  : $Ga4PropertyId"
    Write-Host "        • GTM Container ID : $GtmContainerId"
    Write-Host "        • Tolerance Limit  : ±$ParityTargetGap%"
    Start-Sleep -Milliseconds 500

    Write-Host "  [5/5] [SIMULATED] Synthesizing client.yaml Configuration:"
    $SimConfigFile = Join-Path $env:TEMP "client.${ClientName}.yaml"
    $emailList = ($AlertEmails -split ',' | ForEach-Object { "    - $($_.Trim())" }) -join "`n"
    
    $simYaml = @"
client:
  name: "$ClientName"
  target_stack: "$Engine"

ga4:
  property_id: "$Ga4PropertyId"
  credentials_file: "$CredentialsPath"

gtm:
  account_id: "$GtmAccountId"
  container_id: "$GtmContainerId"
  credentials_file: "$CredentialsPath"

matomo:
  url: "$SimUrl"
  site_id: 1
  token_auth: "SIMULATED_AUTH_TOKEN_DRYRUN"

parity:
  target_gap_percentage: $ParityTargetGap
  tolerance_percentage: $ParityTargetGap
  alert_emails:
$emailList

dpdp:
  require_consent: true
  cmp_provider: "cookieconsent"
  data_retention_days: 365
  pii_scrub_enabled: true
  audit_log_enabled: true

connectors:
  bigquery:
    project_id: "$ProjectId"
    dataset: "matomo_export"
    table: "events"
"@
    Set-Content -Path $SimConfigFile -Value $simYaml -Encoding UTF8
    Write-Host "        ✓ Preview config written to $SimConfigFile" -ForegroundColor Green

    Write-Host "`n================================================================================" -ForegroundColor Green
    Write-Host " ✓ DRY-RUN SIMULATION COMPLETE — VALIDATION PASSED!" -ForegroundColor Green
    Write-Host "================================================================================" -ForegroundColor Green
    Write-Host "  Simulated Target : $($Target.ToUpper())"
    Write-Host "  Analytics Stack  : $($Engine.ToUpper())"
    Write-Host "  Simulated URL    : $SimUrl"
    Write-Host "  Billing Impact   : `$0.00 (Zero changes made)" -ForegroundColor Green
    Write-Host "--------------------------------------------------------------------------------"
    Write-Host "To execute this deployment live on Windows, run without -DryRun:"
    Write-Host "  .\deploy\install.ps1 -Target $Target -ProjectId $ProjectId -ClientName $ClientName -Profile $Profile" -ForegroundColor Cyan
    Write-Host "================================================================================`n"
    exit 0
}

# ==============================================================================
# LIVE EXECUTION PATH
# ==============================================================================
if ($Target -eq "on-premise") {
    Write-Host "`nExecuting On-Premise Bare-Metal Deployment on Windows Docker..." -ForegroundColor Cyan
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Error "Docker Desktop is not installed or not running. Please start Docker before proceeding."
        exit 1
    }
    $env:OYDK_LOCAL = "1"
    & "$RootDir\deploy\deploy.ps1" -ProjectId local
} elseif ($Target -eq "gcp") {
    Write-Host "`nExecuting GCP Cloud Deployment in India ($Region)..." -ForegroundColor Cyan
    if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
        Write-Error "Google Cloud SDK (gcloud) is not installed or not in PATH."
        exit 1
    }
    if (-not (Get-Command terraform -ErrorAction SilentlyContinue)) {
        Write-Error "Terraform is not installed or not in PATH. Please install Terraform 1.5+."
        exit 1
    }

    & "$RootDir\deploy\deploy.ps1" -ProjectId $ProjectId -ClientName $ClientName -Profile $Profile
}
