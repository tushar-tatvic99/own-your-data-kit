# Pull latest Matomo API token from GCP Secret Manager into repo-root .env
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$token = (gcloud secrets versions access latest --secret=aurablush-matomo-api-token --project=tvc-int-matomo).Trim()
if ($token.Length -lt 16) { throw "Secret aurablush-matomo-api-token looks invalid" }
$envPath = Join-Path $Root ".env"
$line = "MATOMO_API_TOKEN=$token"
if (Test-Path $envPath) {
    $content = Get-Content $envPath -Raw
    if ($content -match "(?m)^MATOMO_API_TOKEN=") {
        $content = [regex]::Replace($content, "(?m)^MATOMO_API_TOKEN=.*", $line)
    } else {
        $content = $content.TrimEnd() + "`n$line`n"
    }
    Set-Content -Path $envPath -Value $content -NoNewline
} else {
    Set-Content -Path $envPath -Value "$line`n"
}
Write-Host "Updated $envPath (token length $($token.Length)). Clear session override: Remove-Item Env:MATOMO_API_TOKEN -ErrorAction SilentlyContinue"
