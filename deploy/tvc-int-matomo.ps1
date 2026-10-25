# Tatvic Matomo deploy — project tvc-int-matomo, account tushar@tatvic.com
# One-time: gcloud auth login tushar@tatvic.com  (browser sign-in)
$ErrorActionPreference = "Stop"

$ProjectId = "tvc-int-matomo"
$Account = "tushar@tatvic.com"
$ClientName = "aurablush"

if (-not (gcloud config configurations describe tvc-int-matomo 2>$null)) {
    gcloud config configurations create tvc-int-matomo
}
gcloud config configurations activate tvc-int-matomo
gcloud config set account $Account
gcloud config set project $ProjectId
gcloud config set compute/region asia-south1
gcloud config set compute/zone asia-south1-a

Write-Host "Active account: $(gcloud config get-value account)"
Write-Host "Active project: $(gcloud config get-value project)"

try {
    gcloud projects describe $ProjectId --format="value(projectId)" | Out-Null
} catch {
    throw "Cannot access $ProjectId. Run in your terminal: gcloud auth login $Account"
}

Write-Host "Enabling required APIs on $ProjectId..."
gcloud services enable compute.googleapis.com storage.googleapis.com `
    secretmanager.googleapis.com monitoring.googleapis.com `
    cloudscheduler.googleapis.com bigquery.googleapis.com `
    --project=$ProjectId --quiet

& "$PSScriptRoot\deploy.ps1" -ProjectId $ProjectId -ClientName $ClientName
