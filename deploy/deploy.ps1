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

# Ensure Terraform is available (system PATH or bootstrapped in .tools\bin)
$LocalTfDir = Join-Path "$RootDir" ".tools\bin"
if (Test-Path (Join-Path $LocalTfDir "terraform.exe")) {
    $env:PATH = "$LocalTfDir;$env:PATH"
}
if (-not (Get-Command terraform -ErrorAction SilentlyContinue)) {
    $LocalTf = Join-Path $LocalTfDir "terraform.exe"
    if (-not (Test-Path $LocalTf)) {
        Write-Host "Terraform not found in PATH - downloading Terraform 1.8.5 to $LocalTfDir..." -ForegroundColor Yellow
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
            throw "Failed to download Terraform automatically: $_. Please install Terraform 1.5+ manually."
        }
    }
    $env:PATH = "$LocalTfDir;$env:PATH"
    Write-Host "[OK] Using Terraform at $LocalTf" -ForegroundColor Green
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
gcloud services enable compute.googleapis.com storage.googleapis.com `
    secretmanager.googleapis.com monitoring.googleapis.com `
    cloudscheduler.googleapis.com bigquery.googleapis.com `
    tagmanager.googleapis.com analyticsadmin.googleapis.com `
    --project=$ProjectId

# 2. Terraform
Write-Host "[2/7] Provisioning infrastructure (profile: $Profile)..."
Push-Location "$PSScriptRoot\terraform"
terraform init -input=false
# One Terraform workspace per client: with a single shared state, deploying a
# new client slug destroyed the previously deployed client
$Workspaces = (terraform workspace list) -replace '^[\s*]+', ''
if ($Workspaces -contains $ClientName) {
    terraform workspace select $ClientName
} else {
    $DefaultState = Join-Path (Get-Location) "terraform.tfstate"
    if ((Test-Path $DefaultState) -and ((Get-Content $DefaultState -Raw) -match "`"$ClientName-analytics`"")) {
        # Client deployed before per-client workspaces: move its state over
        terraform workspace new "-state=$DefaultState" $ClientName
        if ($LASTEXITCODE -eq 0) { Move-Item $DefaultState "$DefaultState.migrated-$ClientName" -Force }
    } else {
        terraform workspace new $ClientName
    }
}
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "Could not select Terraform workspace '$ClientName'" }
$tfVars = @(
    "-var=project_id=$ProjectId",
    "-var=client_name=$ClientName",
    "-var=region=$Region",
    "-var=zone=$Zone",
    "-var=scale_profile=$Profile"
)
if ($MachineType) { $tfVars += "-var=machine_type=$MachineType" }
if ($DiskSizeGb -gt 0) { $tfVars += "-var=disk_size_gb=$DiskSizeGb" }
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

$VmName = "${ClientName}-analytics"
# gcloud.ps1 forwards $args as-is, so pass a flat array via splatting; --quiet and
# --strict-host-key-checking=no keep keygen and host-key prompts from blocking the run
$VmFlags = @("--zone=$Zone", "--project=$ProjectId", "--quiet", "--strict-host-key-checking=no")

Write-Host "[3/7] Copying kit to server ($KitRemote)..."
# A freshly created VM refuses SSH until it has finished booting
for ($i = 1; $i -le 18; $i++) {
    gcloud compute ssh $VmName @VmFlags `
        --command="sudo mkdir -p $KitRemote && sudo chown -R `$(whoami):`$(whoami) $KitRemote"
    if ($LASTEXITCODE -eq 0) { break }
    if ($i -eq 18) { throw "SSH to $VmName failed after 3 minutes" }
    Write-Host "  VM not accepting SSH yet, retrying in 10s... ($i/18)"
    Start-Sleep -Seconds 10
}

$ScpSources = @("deploy", "kit", "agents", "dpdp", "connectors", "config", "requirements.txt", "docs") |
    ForEach-Object { Join-Path $RootDir $_ } | Where-Object { Test-Path $_ }
$ScpArgs = @("compute", "scp", "--recurse") + $ScpSources + @("${VmName}:${KitRemote}/") + $VmFlags
gcloud @ScpArgs
if ($LASTEXITCODE -ne 0) { throw "Copying kit to $VmName failed" }

Write-Host "[4/7] Configuring environment and TLS..."
# Remote content is piped over stdin with CRs stripped: here-strings carry the
# script file's CRLF endings, which bash rejects
$DeployEnv = @"
GCP_PROJECT_ID=$ProjectId
GCS_BACKUP_BUCKET=$BackupBucket
MATOMO_PUBLIC_HOST=$MatomoHost
OYDK_SCALE_PROFILE=$Profile
"@
$DeployEnv | gcloud compute ssh $VmName @VmFlags --command="tr -d '\r' > ${KitRemote}/.deploy.env"

$RemoteSetup = @"
# The VM startup script may still be installing Docker
for i in `$(seq 1 60); do sudo docker compose version >/dev/null 2>&1 && break; echo "Waiting for Docker install on VM... (`$i/60)"; sleep 5; done
set -e
cd ${KitRemote}/deploy/docker
cp -n .env.example .env || true
grep -q MATOMO_PUBLIC_HOST .env || echo MATOMO_PUBLIC_HOST=$MatomoHost >> .env
chmod +x backup-to-gcs.sh update-stack.sh matomo-https-config.sh 2>/dev/null || true
if command -v docker-compose >/dev/null; then DC=docker-compose; else DC='docker compose'; fi
sudo `$DC up -d --build
if [ -f matomo-https-config.sh ]; then sudo ./matomo-https-config.sh || true; fi
"@
$RemoteSetup | gcloud compute ssh $VmName @VmFlags --command="tr -d '\r' | bash -s"
if ($LASTEXITCODE -ne 0) { throw "Remote environment setup on $VmName failed" }

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
$kitOk = $false
try {
    Invoke-WebRequest -Uri "$KitApiUrl/health" -UseBasicParsing -TimeoutSec 10 | Out-Null
    $kitOk = $true
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
    -RootDir $RootDir `
    -Healthy:($ok -and $kitOk)
