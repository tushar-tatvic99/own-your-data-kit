# Stop the background OYDK demo console started by Open-OYDK-Console.ps1
$ErrorActionPreference = "SilentlyContinue"
$RepoRoot = Split-Path $PSScriptRoot -Parent
$PidFile = Join-Path $RepoRoot "output\demo-console\demo-ui.pid"
$Port = if ($env:OYDK_DEMO_PORT) { $env:OYDK_DEMO_PORT } else { "8765" }

$stopped = @()
if (Test-Path $PidFile) {
    $stored = Get-Content $PidFile
    Stop-Process -Id $stored -Force
    $stopped += $stored
    Remove-Item $PidFile -Force
}

$lines = netstat -ano | Select-String "127.0.0.1:$Port\s+.*LISTENING"
foreach ($line in $lines) {
    $listenerPid = [int]($line.ToString().Trim().Split()[-1])
    if ($listenerPid -gt 0) {
        Stop-Process -Id $listenerPid -Force
        $stopped += $listenerPid
    }
}

if ($stopped.Count) {
    Write-Host "Stopped demo console (PIDs: $($stopped -join ', '))."
} else {
    Write-Host "No listener on port $Port."
}
