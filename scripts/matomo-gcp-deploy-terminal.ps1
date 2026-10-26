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

function Test-GcloudAccessToken {
    # Quiet check only. Never password-prompt; never throw (Stop + gcloud.ps1 stderr).
    # False means caller must open browser login.
    $prevPrompt = $env:CLOUDSDK_CORE_DISABLE_PROMPTS
    $prevEap = $ErrorActionPreference
    $env:CLOUDSDK_CORE_DISABLE_PROMPTS = "1"
    $ErrorActionPreference = "SilentlyContinue"
    try {
        # gcloud.cmd avoids PowerShell wrapping python stderr as NativeCommandError
        $exe = $null
        $cmd = Get-Command "gcloud.cmd" -ErrorAction SilentlyContinue
        if ($cmd) { $exe = $cmd.Source } else {
            $g = Get-Command "gcloud" -ErrorAction SilentlyContinue
            if ($g) { $exe = $g.Source }
        }
        if (-not $exe) { return $false }

        $raw = & $exe auth print-access-token 2>$null
        if ($LASTEXITCODE -ne 0) { return $false }
        $text = (($raw | Out-String) -replace '\s', '').Trim()
        if ([string]::IsNullOrWhiteSpace($text)) { return $false }
        if ($text -match 'ERROR|Reauthentication|cannotprompt') { return $false }
        return ($text.Length -gt 20)
    } catch {
        return $false
    } finally {
        $ErrorActionPreference = $prevEap
        if ($null -eq $prevPrompt) { Remove-Item Env:CLOUDSDK_CORE_DISABLE_PROMPTS -ErrorAction SilentlyContinue }
        else { $env:CLOUDSDK_CORE_DISABLE_PROMPTS = $prevPrompt }
    }
}

function Invoke-GcloudBrowserLogin {
    # Browser flow must be interactive - prompts must NOT be disabled.
    Remove-Item Env:CLOUDSDK_CORE_DISABLE_PROMPTS -ErrorAction SilentlyContinue
    Write-Host "Opening Google sign-in in your browser (required - no password in this window)." -ForegroundColor Cyan
    Write-Host "Complete the browser flow for the Google account that owns your GCP project."
    Write-Host "Waiting for browser login to finish..." -ForegroundColor Yellow
    & gcloud auth login --update-adc --force
    if ($LASTEXITCODE -ne 0) { throw "gcloud auth login failed - complete the browser sign-in and re-run Deploy." }
    if (-not (Test-GcloudAccessToken)) {
        throw "gcloud still has no valid token after browser login."
    }
    Write-Host "[OK] Browser sign-in complete." -ForegroundColor Green
}

function Ensure-GcloudAuth {
    Write-Step "Google Cloud sign-in (browser)"
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = "SilentlyContinue"
    $acct = $null
    try {
        $acct = (& gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null | Select-Object -First 1)
        if ($acct) { $acct = $acct.ToString().Trim() }
        if ([string]::IsNullOrWhiteSpace($acct) -or $acct -match 'ERROR') { $acct = $null }
    } catch { $acct = $null }
    $ErrorActionPreference = $prevEap

    $tokenOk = Test-GcloudAccessToken
    if (-not $acct -or -not $tokenOk) {
        if ($acct -and -not $tokenOk) {
            Write-Host "Saved login for $acct is expired. Opening browser to re-authenticate..." -ForegroundColor Yellow
        } else {
            Write-Host "No valid Google Cloud login. Opening browser..." -ForegroundColor Yellow
        }
        Invoke-GcloudBrowserLogin
        $acct = (& gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null | Select-Object -First 1)
    } else {
        Write-Host "[OK] Signed in as $acct (token valid)" -ForegroundColor Green
    }

    Write-Host "Setting project to $ProjectId ..."
    # Keep prompts enabled so a failed set can fall through to browser login.
    & gcloud config set project $ProjectId
    if ($LASTEXITCODE -ne 0 -or -not (Test-GcloudAccessToken)) {
        Write-Host "Project set needs a fresh Google login - opening browser..." -ForegroundColor Yellow
        Invoke-GcloudBrowserLogin
        & gcloud config set project $ProjectId
        if ($LASTEXITCODE -ne 0) { throw "gcloud config set project failed" }
    }
    if (-not (Test-GcloudAccessToken)) {
        throw "gcloud token check failed after project set - re-run Deploy and finish browser login."
    }
    Write-Host "[OK] gcloud ready for project $ProjectId" -ForegroundColor Green
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
Write-Host " OYDK - ONE-COMMAND DEPLOY (your GCP)" -ForegroundColor Green
Write-Host " Steps: tools -> gcloud auth -> Terraform VM + Matomo + kit" -ForegroundColor Green
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
Write-Host " ONE-COMMAND DEPLOY: COMPLETE" -ForegroundColor Green
Write-Host " Matomo is on your GCP. Return to the OYDK console -" -ForegroundColor Green
Write-Host " it will continue: Migration -> Parity -> DPDP -> Connectors." -ForegroundColor Green
Write-Host " If Matomo shows the install wizard, finish it and set MATOMO_API_TOKEN." -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Green
