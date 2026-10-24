# Sync parity daily-report SMTP on the OYDK VM (GCP secret) + upload config/client.yaml.
param(
  [string]$Project = "tvc-int-matomo",
  [string]$VmUser = "tushar_tatvic_com",
  [string]$VmName = "aurablush-analytics",
  [string]$Zone = "asia-south1-a",
  [string]$KitRemote = "/home/tushar_tatvic_com/own-your-data-kit",
  [string]$FromEmail = "tushar@tatvic.com",
  [string]$SmtpUser = "tushar@tatvic.com"
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path $PSScriptRoot -Parent

$pass = (gcloud secrets versions access latest --secret=dpdp-smtp-pass --project=$Project).Trim()

$lines = @(
  "OYDK_EMAIL_FROM=$FromEmail",
  "OYDK_SMTP_HOST=smtp.gmail.com",
  "OYDK_SMTP_PORT=587",
  "OYDK_SMTP_USER=$SmtpUser",
  "OYDK_SMTP_PASS=$pass"
)
$snippet = ($lines -join "`n") + "`n"
$snippetFile = [System.IO.Path]::GetTempFileName()
[System.IO.File]::WriteAllText($snippetFile, $snippet)

Write-Host "Uploading SMTP snippet to VM..."
gcloud compute scp --project=$Project --zone=$Zone $snippetFile "${VmUser}@${VmName}:/tmp/oydk-smtp.env"

$remoteCmd = @'
set -e
ENV="/home/tushar_tatvic_com/own-your-data-kit/deploy/docker/.env"
touch "$ENV"
grep -v '^OYDK_EMAIL_FROM=' "$ENV" | grep -v '^OYDK_SMTP_' > "$ENV.tmp" || true
mv "$ENV.tmp" "$ENV"
cat /tmp/oydk-smtp.env >> "$ENV"
rm -f /tmp/oydk-smtp.env
cd /home/tushar_tatvic_com/own-your-data-kit/deploy/docker
sudo docker-compose up -d kit-api kit-scheduler
echo SMTP and containers updated.
'@

gcloud compute ssh "${VmUser}@${VmName}" --project=$Project --zone=$Zone --command=$remoteCmd
Remove-Item $snippetFile -Force

Write-Host "Copying config/client.yaml (alert_emails)..."
gcloud compute scp --project=$Project --zone=$Zone `
  (Join-Path $RepoRoot "config\client.yaml") `
  "${VmUser}@${VmName}:${KitRemote}/config/client.yaml"

Write-Host "VM ready: daily parity at 6:00 IST emails parity.alert_emails."
