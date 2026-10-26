# Enterprise Open-Source Analytics Kit - interactive provisioner (Windows)
# Wraps deploy\deploy.ps1 with Tatvic-style prompts. Non-interactive: -NonInteractive + parameters.
param(
    [switch]$NonInteractive,
    [ValidateSet("Gcp", "OnPrem", "DryRun")]
    [string]$Mode = "",
    [string]$ProjectId = "",
    [string]$ClientName = "",
    [ValidateSet("small", "standard", "enterprise")]
    [string]$Profile = "",
    [string]$Ga4PropertyId = "",
    [string]$GtmContainerId = "",
    [string]$AlertEmails = ""
)

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent $PSScriptRoot
$DeployScript = Join-Path $PSScriptRoot "deploy.ps1"

function Write-Banner {
    Write-Host "================================================================================"
    Write-Host " Enterprise Open-Source Analytics Kit - Tatvic Analytics (Windows)"
    Write-Host " One-Command Enterprise Deployment & Architecture Provisioner (PowerShell)"
    Write-Host "================================================================================"
    Write-Host ""
}

function Ensure-GcloudAuth {
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = "SilentlyContinue"
    $prevPrompt = $env:CLOUDSDK_CORE_DISABLE_PROMPTS
    $env:CLOUDSDK_CORE_DISABLE_PROMPTS = "1"
    $acct = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null | Select-Object -First 1
    $token = $null
    $cmd = Get-Command "gcloud.cmd" -ErrorAction SilentlyContinue
    if ($cmd) { $token = & $cmd.Source auth print-access-token 2>$null }
    else { $token = gcloud auth print-access-token 2>$null }
    $tokenOk = ($LASTEXITCODE -eq 0 -and $token -and (($token | Out-String).Trim().Length -gt 20))
    $ErrorActionPreference = $prevEap
    if ($null -eq $prevPrompt) { Remove-Item Env:CLOUDSDK_CORE_DISABLE_PROMPTS -ErrorAction SilentlyContinue }
    else { $env:CLOUDSDK_CORE_DISABLE_PROMPTS = $prevPrompt }

    if (-not $acct -or -not $tokenOk) {
        Remove-Item Env:CLOUDSDK_CORE_DISABLE_PROMPTS -ErrorAction SilentlyContinue
        Write-Host "[!] Google Cloud browser sign-in required (no password in this window)..."
        gcloud auth login --update-adc --force
        $acct = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null | Select-Object -First 1
    }
    if ($acct) {
        Write-Host "[OK] Signed in to Google Cloud as $acct"
    } else {
        throw "gcloud authentication required for GCP deploy - complete browser login."
    }
}

function Read-Choice {
    param([string]$Prompt, [string[]]$Options, [int]$Default = 1)
    if ($NonInteractive) { return $Default }
    for ($i = 0; $i -lt $Options.Length; $i++) {
        Write-Host "  $($i + 1)) $($Options[$i])"
    }
    $raw = Read-Host "$Prompt (default: $Default)"
    if ([string]::IsNullOrWhiteSpace($raw)) { return $Default }
    $n = 0
    if ([int]::TryParse($raw, [ref]$n) -and $n -ge 1 -and $n -le $Options.Length) { return $n }
    return $Default
}

function Read-Line {
    param([string]$Prompt, [string]$Default = "")
    if ($NonInteractive) { return $(if ($Default) { $Default } else { "" }) }
    $raw = Read-Host $Prompt
    if ([string]::IsNullOrWhiteSpace($raw)) { return $Default }
    return $raw.Trim()
}

Write-Banner

# [1/5] Mode
Write-Host "[1/5] Select Deployment Mode & Target Infrastructure:"
$modeChoice = if ($Mode) {
    switch ($Mode) { "Gcp" { 1 } "OnPrem" { 2 } "DryRun" { 3 } default { 3 } }
} else {
    Read-Choice "Enter choice [1-3]" @(
        "Google Cloud Platform (VPC + VM in India asia-south1)",
        "On-Premise / Bare Metal (Local Docker Compose stack)",
        "Instantaneous Dry-Run Simulation (Billing Impact)"
    ) 3
}

$targetPlatform = switch ($modeChoice) {
    1 { "GCP" }
    2 { "On-Premise" }
    default { "Dry-Run" }
}

$liveGcp = ($modeChoice -eq 1)
$dryRun = ($modeChoice -eq 3)

if ($liveGcp -or $dryRun) {
    Ensure-GcloudAuth
    Write-Host ""
}

# [2/5] GCP project
Write-Host "[2/5] Google Cloud Configuration:"
if ($liveGcp -or $dryRun) {
    $defaultProject = if ($env:GOOGLE_CLOUD_PROJECT) { $env:GOOGLE_CLOUD_PROJECT } else { "tvc-int-matomo" }
    if (-not $ProjectId) {
        $ProjectId = Read-Line "Enter GCP Project ID" $defaultProject
    }
    if (-not $ProjectId) { throw "GCP Project ID is required." }
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    gcloud config set project $ProjectId 2>&1 | Out-Null
    $ErrorActionPreference = $prevEap
}

# [3/5] Client
Write-Host ""
Write-Host "[3/5] Client Identification:"
if (-not $ClientName) {
    $slugDefault = "client-{0}" -f (Get-Random -Minimum 1000 -Maximum 9999)
    $ClientName = Read-Line "Enter Client Slug" $slugDefault
}
if (-not $ClientName) { $ClientName = "client-demo" }

# [4/5] Profile
Write-Host ""
Write-Host "[4/5] Select Hardware & Scaling Profile (see docs/scaling.md):"
$profileChoice = if ($Profile) {
    switch ($Profile) { "standard" { 1 } "small" { 2 } "enterprise" { 3 } default { 1 } }
} else {
    Read-Choice "Enter choice [1-3]" @(
        "standard   [e2-standard-4 (4 vCPU, 16 GB RAM), 100 GB SSD] - Recommended for up to 10M events/mo",
        "small      [e2-standard-2 (2 vCPU, 8 GB RAM), 50 GB SSD]   - Dev/POC mode",
        "enterprise [c2-standard-8 (8 vCPU, 32 GB RAM), 250 GB SSD] - Enterprise BFSI / High Traffic"
    ) 1
}
$Profile = switch ($profileChoice) { 2 { "small" } 3 { "enterprise" } default { "standard" } }

# [5/5] GA4/GTM
Write-Host ""
Write-Host "[5/5] GA4 & GTM Migration Source (Press Enter for practice property):"
if (-not $Ga4PropertyId) { $Ga4PropertyId = Read-Line "Enter GA4 Property ID" "560630351" }
if (-not $GtmContainerId) { $GtmContainerId = Read-Line "Enter GTM Container ID" "283402441" }
if (-not $AlertEmails) { $AlertEmails = Read-Line "Enter alert notification email(s)" "tushar@tatvic.com" }

$executionMode = if ($dryRun) { "DRY-RUN (terraform plan only)" } elseif ($modeChoice -eq 2) { "LOCAL DOCKER" } else { "LIVE EXECUTION" }

Write-Host ""
Write-Host "Deployment Configuration Summary:"
Write-Host "--------------------------------------------------"
Write-Host "  Target Platform : $targetPlatform"
Write-Host "  Client Name     : $ClientName"
Write-Host "  Analytics Stack : MATOMO"
if ($ProjectId) { Write-Host "  GCP Project     : $ProjectId" }
Write-Host "  Cloud Region    : asia-south1 (Mumbai, India)"
Write-Host "  Scale Profile   : $Profile"
Write-Host "  GA4 Property    : $Ga4PropertyId"
Write-Host "  GTM Container   : $GtmContainerId"
Write-Host "  Alert Email(s)  : $AlertEmails"
Write-Host "  Execution Mode  : $executionMode"
Write-Host "--------------------------------------------------"
Write-Host ""

# Persist client profile for OYDK console / agents
$fieldsPath = Join-Path $RootDir "output\demo-console\enterprise-fields.json"
New-Item -ItemType Directory -Force -Path (Split-Path $fieldsPath) | Out-Null
$fieldsObj = @{
    gcp_project_id = $ProjectId
    client_name = $ClientName
    profile = $Profile
    ga4_property_id = $Ga4PropertyId
    gtm_container_id = $GtmContainerId
    alert_emails = $AlertEmails
    parity_threshold = 5
    bq_dataset = "matomo_export"
}
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($fieldsPath, ($fieldsObj | ConvertTo-Json), $utf8NoBom)
Push-Location $RootDir
try {
    py -3 -c "import json; from pathlib import Path; from demo.console.deploy_wizard import save_client_config; save_client_config(json.loads(Path('output/demo-console/enterprise-fields.json').read_text(encoding='utf-8')))" 2>$null
    Write-Host "[OK] Saved OYDK client profile to output/demo-console/generated-client.yaml"
} catch {
    Write-Host "[yellow]Could not write generated-client.yaml (pip install -r requirements.txt)[/yellow]"
}
Pop-Location

if ($modeChoice -eq 2) {
    Write-Host "Executing On-Premise Docker stack..."
    $env:OYDK_LOCAL = "1"
    & $DeployScript -ProjectId "local" -ClientName $ClientName -Profile $Profile
    exit $LASTEXITCODE
}

if ($dryRun) {
    Write-Host "Dry-run: estimating infrastructure (terraform plan, no apply)..."
    Write-Host "[info] See docs/scaling.md for monthly VM/disk ballparks by profile."
    $env:OYDK_DRY_RUN = "1"
    & $DeployScript -ProjectId $ProjectId -ClientName $ClientName -Profile $Profile
    exit $LASTEXITCODE
}

Write-Host "Executing GCP Cloud Deployment in India (asia-south1)..."
Ensure-GcloudAuth
& $DeployScript -ProjectId $ProjectId -ClientName $ClientName -Profile $Profile
exit $LASTEXITCODE
