# One-command deployment for Own-Your-Data Analytics Kit (Windows)
# Usage: .\deploy\deploy.ps1 -ProjectId <gcp-project-id> [-ClientName demo] [-Profile standard]
param(
    [Parameter(Mandatory=$true)][string]$ProjectId,
    [string]$ClientName = "demo",
    [ValidateSet("small", "standard", "enterprise")]
    [string]$Profile = "standard",
    [string]$MachineType = "",
    [int]$DiskSizeGb = 0
)

$ErrorActionPreference = "Stop"
$Region = "asia-south1"
$Zone = "asia-south1-a"
$RootDir = Split-Path -Parent $PSScriptRoot
$KitRemote = "/opt/own-your-data-kit"

# gcloud.ps1 writes progress to stderr; with Stop that aborts even when exit code is 0.
function Invoke-GcloudCli {
    param(
        [Parameter(Mandatory = $true)][string[]]$GcloudArgs,
        [string]$PipelineInput = $null
    )
    $prev = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $lines = if ($null -ne $PipelineInput) {
            $PipelineInput | & gcloud @GcloudArgs 2>&1
        } else {
            & gcloud @GcloudArgs 2>&1
        }
        foreach ($line in @($lines)) {
            if ($null -eq $line) { continue }
            if ($line -is [System.Management.Automation.ErrorRecord]) {
                Write-Host $line.ToString()
            } else {
                Write-Host $line.ToString()
            }
        }
        if ($LASTEXITCODE -ne 0) {
            throw ("gcloud {0} failed with exit code {1}" -f ($GcloudArgs -join " "), $LASTEXITCODE)
        }
    } finally {
        $ErrorActionPreference = $prev
    }
}

Write-Host "========================================"
Write-Host " Own-Your-Data Analytics Kit - Deploy"
Write-Host " Project: $ProjectId"
Write-Host " Client:  $ClientName"
Write-Host " Profile: $Profile (see docs/scaling.md)"
Write-Host " Region:  $Region - Mumbai, India"
Write-Host "========================================"

function Get-MatomoPublicHost([string]$Ip) {
    return "matomo.$($Ip.Replace('.', '-')).nip.io"
}

# Local dev mode - skip GCP, start Docker stack locally
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
Write-Host "[1/7] Enabling GCP APIs..."
Invoke-GcloudCli @(
    "services", "enable",
    "compute.googleapis.com", "storage.googleapis.com",
    "secretmanager.googleapis.com", "monitoring.googleapis.com",
    "cloudscheduler.googleapis.com", "bigquery.googleapis.com",
    "tagmanager.googleapis.com", "analyticsadmin.googleapis.com",
    "--project=$ProjectId"
)
Write-Host "[OK] GCP APIs enabled (or already on)."

# 2. Terraform
Write-Host "[2/7] Provisioning infrastructure (profile: $Profile)..."
Push-Location "$PSScriptRoot\terraform"
terraform init -input=false
$tfVars = @(
    "-var=project_id=$ProjectId",
    "-var=client_name=$ClientName",
    "-var=region=$Region",
    "-var=zone=$Zone",
    "-var=scale_profile=$Profile"
)
if ($MachineType) { $tfVars += "-var=machine_type=$MachineType" }
if ($DiskSizeGb -gt 0) { $tfVars += "-var=disk_size_gb=$DiskSizeGb" }
if ($env:OYDK_DRY_RUN -eq "1") {
    Write-Host "[DRY-RUN] terraform plan (no resources will be created)..."
    terraform plan @tfVars
    Pop-Location
    Write-Host "[DRY-RUN] Complete. Re-run enterprise-deploy.ps1 and choose GCP live execution to apply."
    exit 0
}
terraform apply -auto-approve @tfVars
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "Terraform apply failed" }
$AnalyticsIp = terraform output -raw analytics_ip
$BackupBucket = terraform output -raw backup_bucket
$MatomoUrl = terraform output -raw matomo_url
$EffectiveMachine = terraform output -raw machine_type
$EffectiveDisk = terraform output -raw disk_size_gb
if (-not $AnalyticsIp) { Pop-Location; throw "Terraform did not return analytics_ip" }
Pop-Location

$MatomoHost = Get-MatomoPublicHost $AnalyticsIp
$KitApiUrl = "http://${AnalyticsIp}:8090"

Write-Host "[3/7] Copying kit to server ($KitRemote)..."
Invoke-GcloudCli @(
    "compute", "ssh", "${ClientName}-analytics",
    "--zone=$Zone", "--project=$ProjectId",
    "--command=sudo mkdir -p $KitRemote && sudo chown -R `$(whoami):`$(whoami) $KitRemote"
)

Invoke-GcloudCli @(
    "compute", "scp", "--recurse",
    "$RootDir\deploy", "$RootDir\kit", "$RootDir\agents",
    "$RootDir\dpdp", "$RootDir\connectors", "$RootDir\config",
    "$RootDir\requirements.txt", "$RootDir\docs",
    "${ClientName}-analytics:${KitRemote}/",
    "--zone=$Zone", "--project=$ProjectId"
)

Write-Host "[4/7] Configuring environment and TLS..."
$DeployEnv = @"
GCP_PROJECT_ID=$ProjectId
GCS_BACKUP_BUCKET=$BackupBucket
MATOMO_PUBLIC_HOST=$MatomoHost
OYDK_SCALE_PROFILE=$Profile
"@
Invoke-GcloudCli -PipelineInput $DeployEnv -GcloudArgs @(
    "compute", "ssh", "${ClientName}-analytics",
    "--zone=$Zone", "--project=$ProjectId",
    "--command=cat > ${KitRemote}/.deploy.env"
)

$remoteSetup = @"
set -e
cd ${KitRemote}/deploy/docker
cp -n .env.example .env || true
grep -q MATOMO_PUBLIC_HOST .env || echo MATOMO_PUBLIC_HOST=$MatomoHost >> .env
chmod +x backup-to-gcs.sh update-stack.sh matomo-https-config.sh 2>/dev/null || true
if command -v docker-compose >/dev/null; then DC=docker-compose; else DC='docker compose'; fi
sudo `$DC up -d --build
if [ -f matomo-https-config.sh ]; then sudo ./matomo-https-config.sh || true; fi
"@
Invoke-GcloudCli @(
    "compute", "ssh", "${ClientName}-analytics",
    "--zone=$Zone", "--project=$ProjectId",
    "--command=$remoteSetup"
)

Write-Host "[5/7] Waiting for Matomo (HTTPS)..."
$ok = $false
for ($i = 1; $i -le 36; $i++) {
    try {
        Invoke-WebRequest -Uri $MatomoUrl -UseBasicParsing -TimeoutSec 10 | Out-Null
        $ok = $true
        Write-Host "Matomo is up at $MatomoUrl"
        break
    } catch {
        Write-Host "  Waiting... ($i/36)"
        Start-Sleep -Seconds 10
    }
}
if (-not $ok) { Write-Host "[yellow]Matomo HTTPS not ready yet - complete setup wizard in browser[/yellow]" }

Write-Host "[6/7] Smoke test Kit API..."
try {
    Invoke-WebRequest -Uri "$KitApiUrl/health" -UseBasicParsing -TimeoutSec 10 | Out-Null
    Write-Host "Kit API: OK"
} catch {
    Write-Host "[yellow]Kit API not responding yet on :8090[/yellow]"
}

Write-Host "[7/7] Deployment complete!"
Write-Host ""
Write-Host "Matomo:  $MatomoUrl"
Write-Host "Kit API: $KitApiUrl"
Write-Host "VM:      $EffectiveMachine, ${EffectiveDisk} GB disk (profile: $Profile)"
Write-Host "Backups: gs://$BackupBucket/matomo/"
Write-Host ""

. "$PSScriptRoot\Write-PostDeployChecklist.ps1" `
    -ProjectId $ProjectId `
    -ClientName $ClientName `
    -Profile $Profile `
    -MachineType $EffectiveMachine `
    -DiskGb $EffectiveDisk `
    -AnalyticsIp $AnalyticsIp `
    -MatomoUrl $MatomoUrl `
    -BackupBucket $BackupBucket `
    -KitApiUrl $KitApiUrl `
    -RootDir $RootDir
