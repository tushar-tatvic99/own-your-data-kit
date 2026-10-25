# Restart kit-api on Aurablush VM when :8090/health is down.
param(
  [string]$Project = "tvc-int-matomo",
  [string]$Vm = "aurablush-analytics",
  [string]$Zone = "asia-south1-a",
  [string]$User = "tushar_tatvic_com"
)

$ErrorActionPreference = "Stop"
Write-Host "Restarting kit-api on $Vm..."
$remoteCmd = @"
cd /home/tushar_tatvic_com/own-your-data-kit/deploy/docker
sudo docker-compose up -d kit-api
sleep 2
if ! curl -sf http://127.0.0.1:8090/health >/dev/null; then
  echo 'Health failed — rebuilding kit-api image (sync kit/ + dpdp/ from laptop if ModuleNotFoundError)...'
  sudo docker-compose build kit-api && sudo docker-compose up -d kit-api
  sleep 3
fi
curl -s http://127.0.0.1:8090/health || echo still_down_check_docker_logs_kit_api
"@
gcloud compute ssh "${User}@${Vm}" --project=$Project --zone=$Zone --command=$remoteCmd
if ($LASTEXITCODE -ne 0) {
  throw "SSH failed - run: gcloud auth login"
}
Write-Host "Test from laptop: http://35.234.210.199:8090/health"
