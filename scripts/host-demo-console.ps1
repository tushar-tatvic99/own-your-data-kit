# Host OYDK demo console on the LAN so another PC can open it in a browser.
# Deploy button downloads OYDK-Deploy.cmd (runs on THEIR Windows PC, not this server).
param(
    [int]$Port = 8765,
    [string]$GitUrl = "https://github.com/tushar-tatvic99/own-your-data-kit.git"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
Set-Location $Root

$env:OYDK_DEMO_HOST = "0.0.0.0"
$env:OYDK_DEMO_PORT = "$Port"
$env:PORT = "$Port"
$env:OYDK_HOSTED_UI = "1"
$env:OYDK_GIT_URL = $GitUrl
$env:OYDK_HOSTED_CONSOLE_URL = "http://$((Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.PrefixOrigin -ne 'WellKnown' } | Select-Object -First 1).IPAddress):$Port"

$ips = Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |
    Select-Object -ExpandProperty IPAddress -Unique

Write-Host "========================================" -ForegroundColor Green
Write-Host " OYDK demo console - HOSTED for other PCs" -ForegroundColor Green
Write-Host " Keep this window open while testing." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "On THIS PC:   http://127.0.0.1:$Port"
foreach ($ip in $ips) {
    Write-Host "On OTHER PC:  http://${ip}:$Port" -ForegroundColor Cyan
}
Write-Host ""
Write-Host "Other PC flow: open URL -> Deploy tab -> fill GCP project -> Deploy"
Write-Host "  -> downloads OYDK-Deploy.cmd -> double-click on THEIR Windows PC"
Write-Host "  -> clones/finds repo, gcloud browser login, deploys Matomo to THEIR GCP"
Write-Host "Repo clone URL: $GitUrl"
Write-Host "========================================" -ForegroundColor Green

py -3 -m demo.console.server
