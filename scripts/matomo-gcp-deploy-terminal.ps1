# Opens from OYDK demo console - installs missing tools, gcloud auth, deploys Matomo on user's GCP.
param(
    [Parameter(Mandatory = $true)][string]$ProjectId,
    [string]$ClientName = "client-demo",
    [ValidateSet("small", "standard", "enterprise")]
    [string]$Profile = "standard",
    [string]$Ga4PropertyId = "560630351",
    [string]$GtmContainerId = "283402441",
    [string]$AlertEmails = "tushar@tatvic.com",
    [string]$RepoRoot = ""
)

$ErrorActionPreference = "Stop"

if (-not $RepoRoot) {
    $RepoRoot = Split-Path $PSScriptRoot -Parent
}

$DeployLog = Join-Path $RepoRoot "output\demo-console\deploy.log"
$EnterpriseScript = Join-Path $RepoRoot "deploy\enterprise-deploy.ps1"

function Refresh-SessionPath {
    $machine = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
    $user = [System.Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path = "$machine;$user"
}

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "== $Message ==" -ForegroundColor Cyan
}

function Test-Command([string]$Name) {
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Ensure-WingetPackage {
    param(
        [string]$WingetId,
        [string]$Label
    )
    if (-not (Test-Command winget)) {
        Write-Host "[!] winget not found - install $Label manually." -ForegroundColor Yellow
        return $false
    }
    Write-Host "Installing $Label via winget ($WingetId)..."
    winget install --id $WingetId -e --accept-source-agreements --accept-package-agreements
    Refresh-SessionPath
    return $true
}

function Ensure-Gcloud {
    if (Test-Command gcloud) { return }
    Write-Step "Google Cloud SDK (gcloud)"
    Ensure-WingetPackage "Google.CloudSDK" "Google Cloud SDK" | Out-Null
    Refresh-SessionPath
    if (-not (Test-Command gcloud)) {
        throw "gcloud still not found. Install from https://cloud.google.com/sdk/docs/install then re-run Deploy Matomo on my GCP."
    }
}

function Ensure-Terraform {
    if (Test-Command terraform) { return }
    Write-Step "Terraform"
    Ensure-WingetPackage "Hashicorp.Terraform" "Terraform" | Out-Null
    Refresh-SessionPath
    if (-not (Test-Command terraform)) {
        throw "terraform still not found. Run: winget install Hashicorp.Terraform - then open a new PowerShell and retry."
    }
}

function Ensure-GcloudAuth {
    Write-Step "Google Cloud sign-in"
    $acct = $null
    try {
        $acct = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null | Select-Object -First 1
    } catch { }
    if (-not $acct) {
        Write-Host "No active gcloud account - complete sign-in in your browser when prompted."
        gcloud auth login
        if ($LASTEXITCODE -ne 0) { throw "gcloud auth login failed" }
        gcloud auth application-default login
        if ($LASTEXITCODE -ne 0) { throw "gcloud application-default login failed" }
    } else {
        Write-Host "[OK] Signed in as $acct" -ForegroundColor Green
    }
    Write-Host "Setting project to $ProjectId ..."
    gcloud config set project $ProjectId
    if ($LASTEXITCODE -ne 0) { throw "gcloud config set project failed" }
    $token = gcloud auth print-access-token 2>$null
    if (-not $token) { throw "gcloud token check failed - run gcloud auth login again" }
}

function Save-OydkClientYaml {
    Write-Step "Saving OYDK client profile"
    $fieldsPath = Join-Path $RepoRoot "output\demo-console\enterprise-fields.json"
    New-Item -ItemType Directory -Force -Path (Split-Path $fieldsPath) | Out-Null
    $obj = @{
        gcp_project_id   = $ProjectId
        client_name      = $ClientName
        profile          = $Profile
        ga4_property_id  = $Ga4PropertyId
        gtm_container_id = $GtmContainerId
        alert_emails     = $AlertEmails
        parity_threshold = 5
        bq_dataset       = "matomo_export"
    }
    $utf8 = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($fieldsPath, ($obj | ConvertTo-Json), $utf8)
    Push-Location $RepoRoot
    try {
        py -3 -c "import json; from pathlib import Path; from demo.console.deploy_wizard import save_client_config; save_client_config(json.loads(Path('output/demo-console/enterprise-fields.json').read_text(encoding='utf-8')))"
        Write-Host "[OK] output\demo-console\generated-client.yaml" -ForegroundColor Green
    } catch {
        Write-Host "Could not write generated-client.yaml (pip install -r requirements.txt)" -ForegroundColor Yellow
    } finally {
        Pop-Location
    }
}

# --- Main ---
New-Item -ItemType Directory -Force -Path (Split-Path $DeployLog) | Out-Null
Add-Content -Path $DeployLog -Value "`n--- deploy start (interactive terminal) ---`n"

Write-Host "========================================" -ForegroundColor Green
Write-Host " OYDK - Deploy Matomo on YOUR GCP" -ForegroundColor Green
Write-Host " Project: $ProjectId  Client: $ClientName  Profile: $Profile" -ForegroundColor Green
Write-Host " Log: $DeployLog" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

Ensure-Gcloud
Ensure-Terraform
Ensure-GcloudAuth
Save-OydkClientYaml

if (-not (Test-Path $EnterpriseScript)) {
    throw "Missing $EnterpriseScript - run from the full OYDK repo."
}

Write-Step "GCP deploy (15-25 min) - Terraform VM + Matomo + kit-api in asia-south1"
Push-Location $RepoRoot
try {
    $output = & $EnterpriseScript `
        -NonInteractive `
        -Mode Gcp `
        -ProjectId $ProjectId `
        -ClientName $ClientName `
        -Profile $Profile `
        -Ga4PropertyId $Ga4PropertyId `
        -GtmContainerId $GtmContainerId `
        -AlertEmails $AlertEmails 2>&1
    foreach ($line in $output) {
        $text = $line.ToString()
        Add-Content -Path $DeployLog -Value $text
        Write-Host $text
    }
    if ($LASTEXITCODE -ne 0) {
        throw "enterprise-deploy.ps1 exited with code $LASTEXITCODE"
    }
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " Deploy script finished." -ForegroundColor Green
Write-Host " Return to the OYDK console - it will pick up the Matomo URL." -ForegroundColor Green
Write-Host " Finish the Matomo install wizard in the browser if prompted." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
