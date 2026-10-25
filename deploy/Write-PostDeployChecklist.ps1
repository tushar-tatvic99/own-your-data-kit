# Emits short client-onboarding note after deploy (platform is already live).
param(
    [string]$ProjectId,
    [string]$ClientName,
    [string]$Profile,
    [string]$MachineType,
    [int]$DiskGb,
    [string]$AnalyticsIp,
    [string]$MatomoUrl,
    [string]$BackupBucket,
    [string]$KitApiUrl,
    [string]$RootDir,
    [switch]$Healthy
)

$status = if ($Healthy) { "platform is up" } else { "health checks FAILED - Matomo and/or Kit API not reachable" }

$outDir = Join-Path $RootDir "output\deploy"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$path = Join-Path $outDir "$ClientName-post-deploy-checklist.md"

$body = @"
# $ClientName - deploy complete

**One-command deploy finished** $(Get-Date -Format "yyyy-MM-dd HH:mm") - $status.

| | |
|--|--|
| Matomo | $MatomoUrl |
| Kit API | $KitApiUrl |
| Profile | $Profile (`$MachineType`, ${DiskGb} GB) |
| Backups | ``gs://$BackupBucket/matomo/`` |

## Client onboarding only (3 steps)

1. **Matomo wizard** at $MatomoUrl -> API token -> VM ``deploy/docker/.env`` -> restart kit-api
2. **``config/client.yaml``** + ``credentials/ga-service-account.json`` (client GA4/GTM)
3. **Site tags** + consent -> ``py -3 -m kit.cli migrate`` / ``parity``

Details: [docs/post-deploy-checklist.md](../docs/post-deploy-checklist.md)
"@

Set-Content -Path $path -Value $body -Encoding utf8

Write-Host ""
if ($Healthy) {
    Write-Host "========================================" -ForegroundColor Green
    Write-Host " ONE-COMMAND DEPLOY: COMPLETE" -ForegroundColor Green
    Write-Host " Platform live (VM, Matomo, kit, backups, schedulers)" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
} else {
    Write-Host "========================================" -ForegroundColor Red
    Write-Host " ONE-COMMAND DEPLOY: INFRA CREATED, HEALTH CHECKS FAILED" -ForegroundColor Red
    Write-Host " Matomo and/or Kit API did not respond. Inspect the VM:" -ForegroundColor Red
    Write-Host "   gcloud compute ssh $ClientName-analytics --zone=asia-south1-a --project=$ProjectId" -ForegroundColor Red
    Write-Host "   sudo docker ps; sudo journalctl -u google-startup-scripts" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
}
Write-Host ""
Write-Host "Matomo:  $MatomoUrl"
Write-Host "Kit API: $KitApiUrl"
Write-Host ""
Write-Host "Client onboarding (~15 min, needs their Google/Matomo login):" -ForegroundColor Cyan
Write-Host "  1. Matomo wizard + API token on VM"
Write-Host "  2. config/client.yaml + GA service account JSON"
Write-Host "  3. Site tracking + consent -> migrate / parity"
Write-Host ""
Write-Host "Saved: $path"
Write-Host "========================================"
