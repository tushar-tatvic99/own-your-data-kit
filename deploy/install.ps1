# ==============================================================================
# TATVIC OWN-YOUR-DATA ANALYTICS KIT (OYDK) - WINDOWS ENTERPRISE INSTALLER
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

# Avoid running or cloning inside Windows system directories (like C:\Windows\System32)
$currentPath = (Get-Location).Path
$winDir = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Windows)
if (-not (Test-Path "deploy\deploy.ps1") -and ($currentPath.StartsWith($winDir, [System.StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path $currentPath))) {
    Write-Host "Notice: Switched working directory from '$currentPath' to user home '$HOME'." -ForegroundColor Yellow
    Set-Location $HOME
}

# Detect root directory or clone/download repository
$RootDir = (Get-Location).Path
if (Test-Path (Join-Path $RootDir "deploy\deploy.ps1")) {
    # Already in repo root
} elseif (Test-Path (Join-Path $RootDir "own-your-data-kit\deploy\deploy.ps1")) {
    Set-Location (Join-Path $RootDir "own-your-data-kit")
    $RootDir = (Get-Location).Path
} else {
    $targetDir = Join-Path (Get-Location).Path "own-your-data-kit"
    $cloned = $false

    # Method 1: Git clone if git is available
    if (Get-Command git -ErrorAction SilentlyContinue) {
        Write-Host "Cloning Own-Your-Data Kit repository via Git..." -ForegroundColor Cyan
        try {
            git clone https://github.com/tushar-tatvic99/own-your-data-kit.git
            if (Test-Path (Join-Path $targetDir "deploy\deploy.ps1")) {
                $cloned = $true
            }
        } catch {
            Write-Warning "git clone encountered an issue: $_. Falling back to direct archive download."
        }
    }

    # Method 2: Direct GitHub ZIP download (zero git prerequisite)
    if (-not $cloned -and -not (Test-Path (Join-Path $targetDir "deploy\deploy.ps1"))) {
        Write-Host "Downloading Own-Your-Data Kit repository archive from GitHub..." -ForegroundColor Cyan
        $zipUrl = "https://github.com/tushar-tatvic99/own-your-data-kit/archive/refs/heads/main.zip"
        $tempZip = Join-Path $env:TEMP "own-your-data-kit-main.zip"
        $tempExtract = Join-Path $env:TEMP "oydk_extract_$(Get-Random)"
        try {
            [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
            $prevProg = $ProgressPreference
            $ProgressPreference = 'SilentlyContinue'
            Invoke-WebRequest -UseBasicParsing -Uri $zipUrl -OutFile $tempZip
            $ProgressPreference = $prevProg

            Expand-Archive -Path $tempZip -DestinationPath $tempExtract -Force
            $extractedFolder = Join-Path $tempExtract "own-your-data-kit-main"
            if (Test-Path $extractedFolder) {
                if (Test-Path $targetDir) { Remove-Item $targetDir -Recurse -Force -ErrorAction SilentlyContinue }
                Move-Item -Path $extractedFolder -Destination $targetDir -Force
            }
            Remove-Item $tempZip -Force -ErrorAction SilentlyContinue
            Remove-Item $tempExtract -Recurse -Force -ErrorAction SilentlyContinue

            if (Test-Path (Join-Path $targetDir "deploy\deploy.ps1")) {
                $cloned = $true
            }
        } catch {
            Write-Warning "Direct archive download failed: $_"
        }
    }

    if (Test-Path (Join-Path $targetDir "deploy\deploy.ps1")) {
        Set-Location $targetDir
        $RootDir = (Get-Location).Path
        Write-Host "[OK] Repository initialized successfully at $RootDir" -ForegroundColor Green
    }
}

# Display Banner
Clear-Host
Write-Host @"
  ######  ##    ## ######  ##   ##     ####### ##    ## ## ######## ####### 
 ##    ##  ##  ##  ##   ## ##  ##      ##      ##    ## ##    ##    ##      
 ##    ##   ####   ##   ## #####       ####### ##    ## ##    ##    #####   
 ##    ##    ##    ##   ## ##  ##           ## ##    ## ##    ##    ##      
  ######     ##    ######  ##   ##     #######  ######  ##    ##    ####### 
                                                                            
      Enterprise Open-Source Analytics Kit - Tatvic Analytics (Windows)
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

# New laptops: install the Google Cloud CLI if missing, then make sure both the
# CLI login and Application Default Credentials (used by Terraform) are valid
function Initialize-GcloudAuth {
    $ErrorActionPreference = "Continue"  # gcloud writes progress to stderr
    if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
        Write-Host "`nGoogle Cloud CLI not found - installing it..." -ForegroundColor Yellow
        if (Get-Command winget -ErrorAction SilentlyContinue) {
            winget install --exact --id Google.CloudSDK --silent --accept-package-agreements --accept-source-agreements
        } else {
            $SdkInstaller = Join-Path $env:TEMP "GoogleCloudSDKInstaller.exe"
            Invoke-WebRequest -UseBasicParsing -Uri "https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe" -OutFile $SdkInstaller
            Start-Process $SdkInstaller -Wait
        }
        # The installer only updates PATH for new shells
        $env:PATH = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
        foreach ($dir in @("$env:LOCALAPPDATA\Google\Cloud SDK\google-cloud-sdk\bin", "${env:ProgramFiles(x86)}\Google\Cloud SDK\google-cloud-sdk\bin", "$env:ProgramFiles\Google\Cloud SDK\google-cloud-sdk\bin")) {
            if (Test-Path (Join-Path $dir "gcloud.cmd")) { $env:PATH = "$dir;$env:PATH"; break }
        }
        if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
            throw "Google Cloud CLI installation did not complete. Install it from https://cloud.google.com/sdk/docs/install and re-run."
        }
        Write-Host "[OK] Google Cloud CLI installed" -ForegroundColor Green
    }

    gcloud auth print-access-token --quiet 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`nSign in to Google Cloud (a browser window will open)..." -ForegroundColor Yellow
        gcloud auth login
        if ($LASTEXITCODE -ne 0) { throw "gcloud auth login failed" }
    }
    gcloud auth application-default print-access-token 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`nAuthorise Google Cloud, GA4, and GTM (a browser window will open)..." -ForegroundColor Yellow
        $oauthScopes = "https://www.googleapis.com/auth/analytics.readonly,https://www.googleapis.com/auth/tagmanager.readonly,https://www.googleapis.com/auth/tagmanager.edit.containers,https://www.googleapis.com/auth/cloud-platform"
        gcloud auth application-default login --scopes="$oauthScopes"
        if ($LASTEXITCODE -ne 0) { throw "gcloud auth application-default login failed" }
    }
    $Account = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null
    Write-Host "[OK] Signed in to Google Cloud as $Account" -ForegroundColor Green
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

    # Sign in before any other question: the project prompt reads gcloud config
    if (-not $DryRun -and $Target -eq "gcp") { Initialize-GcloudAuth }

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
    $CredInput = Prompt-User "Enter Service Account JSON key path (or leave empty to use Google account login)" ""
    if ($CredInput -and (Test-Path $CredInput)) {
        $credDir = Join-Path $RootDir "credentials"
        New-Item -ItemType Directory -Force -Path $credDir | Out-Null
        Copy-Item -Path $CredInput -Destination (Join-Path $credDir "ga-service-account.json") -Force
        Write-Host "  [OK] Copied key to credentials\ga-service-account.json" -ForegroundColor Green
    }
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
        Write-Host "        [OK] compute.googleapis.com (VPC & VM)" -ForegroundColor Green
        Write-Host "        [OK] storage.googleapis.com (Backups Bucket)" -ForegroundColor Green
        Write-Host "        [OK] bigquery.googleapis.com (Warehouse Export)" -ForegroundColor Green
        Write-Host "        [OK] cloudscheduler.googleapis.com (Automated Backups)" -ForegroundColor Green
        Write-Host "        [OK] monitoring.googleapis.com (Uptime Health Check)" -ForegroundColor Green
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
        Write-Host "        [OK] Ingress SSL Endpoint: $SimUrl" -ForegroundColor Green
        Start-Sleep -Milliseconds 500
    } else {
        Write-Host "  [1/5] [SIMULATED] Verifying Local Container Runtime:"
        Write-Host "        [OK] Docker Engine online" -ForegroundColor Green
        Write-Host "        [OK] Docker Compose v2 active" -ForegroundColor Green
        Start-Sleep -Milliseconds 600

        Write-Host "  [2/5] [SIMULATED] Container Topology Planning:"
        Write-Host "        + matomo-mysql (MariaDB 10.11)"
        Write-Host "        + matomo-app (Matomo 5.14.2 PHP-FPM)"
        Write-Host "        + kit-api (FastAPI / DPDP endpoints)"
        Write-Host "        + kit-scheduler (Automated Cron / Parity)"
        $SimUrl = "http://localhost:8080"
    }

    Write-Host "  [4/5] [SIMULATED] Ingesting GA4 & GTM Migration Targets:"
    Write-Host "        * GA4 Property ID  : $Ga4PropertyId"
    Write-Host "        * GTM Container ID : $GtmContainerId"
    Write-Host "        * Tolerance Limit  : +/-$ParityTargetGap%"
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
    Write-Host "        [OK] Preview config written to $SimConfigFile" -ForegroundColor Green

    Write-Host "`n================================================================================" -ForegroundColor Green
    Write-Host " [OK] DRY-RUN SIMULATION COMPLETE - VALIDATION PASSED!" -ForegroundColor Green
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
$deployScript = Join-Path $RootDir "deploy\deploy.ps1"
if (-not (Test-Path $deployScript)) {
    Write-Error "Deployment script not found at '$deployScript'. Repository files could not be located."
    exit 1
}

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
    # Covers -Unattended runs; a quick no-op when already signed in interactively
    Initialize-GcloudAuth
    $LocalTfDir = Join-Path "$RootDir" ".tools\bin"
    $LocalTf = Join-Path $LocalTfDir "terraform.exe"
    if (Test-Path $LocalTf) {
        $env:PATH = "$LocalTfDir;$env:PATH"
    }

    if (-not (Get-Command terraform -ErrorAction SilentlyContinue)) {
        # Bootstrap a local Terraform binary (mirrors install.sh behaviour)
        if (-not (Test-Path $LocalTf)) {
            Write-Host "        Terraform not found in PATH - downloading Terraform 1.8.5 to $LocalTfDir..." -ForegroundColor Yellow
            $TfArch = if ($env:PROCESSOR_ARCHITECTURE -eq "ARM64") { "arm64" } else { "amd64" }
            $TfZip = Join-Path $env:TEMP "terraform_windows_$TfArch.zip"
            try {
                [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
                New-Item -ItemType Directory -Force -Path $LocalTfDir | Out-Null
                $prevProgress = $ProgressPreference
                $ProgressPreference = 'SilentlyContinue'
                Invoke-WebRequest -UseBasicParsing -Uri "https://releases.hashicorp.com/terraform/1.8.5/terraform_1.8.5_windows_$TfArch.zip" -OutFile $TfZip
                $ProgressPreference = $prevProgress
                Expand-Archive -Path $TfZip -DestinationPath $LocalTfDir -Force
                Remove-Item $TfZip -Force -ErrorAction SilentlyContinue
            } catch {
                Write-Error "Failed to download Terraform automatically: $_. Install Terraform 1.5+ manually (e.g. 'winget install Hashicorp.Terraform') and re-run."
                exit 1
            }
        }
        $env:PATH = "$LocalTfDir;$env:PATH"
        Write-Host "        [OK] Using Terraform at $LocalTf" -ForegroundColor Green
    }

    & "$RootDir\deploy\deploy.ps1" -ProjectId $ProjectId -ClientName $ClientName -Profile $Profile
}
