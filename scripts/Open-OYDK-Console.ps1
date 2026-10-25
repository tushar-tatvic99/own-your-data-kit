# Start OYDK demo console in the background and open the browser (no terminal for judges).
$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path $PSScriptRoot -Parent
$PidFile = Join-Path $RepoRoot "output\demo-console\demo-ui.pid"
$Port = if ($env:OYDK_DEMO_PORT) { $env:OYDK_DEMO_PORT } else { "8765" }
$Url = "http://127.0.0.1:$Port"
$StopScript = Join-Path $PSScriptRoot "Stop-OYDK-Console.ps1"

function Test-ConsoleUp {
    try {
        $r = Invoke-WebRequest -Uri "$Url/api/console/meta" -UseBasicParsing -TimeoutSec 3
        return $r.StatusCode -eq 200
    } catch {
        return $false
    }
}

function Test-ConsoleCurrent {
    try {
        $meta = Invoke-RestMethod -Uri "$Url/api/console/meta" -TimeoutSec 5
        if ($meta.routes -contains "deploy/start-terminal") { return $true }
        if ($meta.ui_version -and $meta.ui_version -ge "20261025t") { return $true }
        return $false
    } catch {
        return $false
    }
}

function Get-ListenerPid {
    $line = netstat -ano | Select-String "127.0.0.1:$Port\s+.*LISTENING"
    if (-not $line) { return $null }
    return [int]($line.ToString().Trim().Split()[-1])
}

function Start-ConsoleProcess {
    $env:OYDK_DEMO_OPEN_BROWSER = "1"
    $env:OYDK_DEMO_QUIET = "1"
    New-Item -ItemType Directory -Force -Path (Split-Path $PidFile) | Out-Null
    return Start-Process -FilePath "py" `
        -ArgumentList "-3", "-m", "kit.cli", "demo-ui", "-q", "--open-browser" `
        -WorkingDirectory $RepoRoot `
        -WindowStyle Hidden `
        -PassThru
}

function Wait-ConsoleReady {
    param($LauncherProc)
    $deadline = (Get-Date).AddSeconds(25)
    while ((Get-Date) -lt $deadline) {
        Start-Sleep -Milliseconds 500
        if (Test-ConsoleUp -and (Test-ConsoleCurrent)) {
            $lp = Get-ListenerPid
            if ($lp) { $lp | Set-Content -Path $PidFile -Encoding ascii }
            elseif ($LauncherProc) { $LauncherProc.Id | Set-Content -Path $PidFile -Encoding ascii }
            return $true
        }
        if ($LauncherProc -and $LauncherProc.HasExited) {
            throw "Demo console exited before port $Port was ready. Run: py -3 -m kit.cli demo-ui"
        }
    }
    return $false
}

if (Test-ConsoleUp) {
    if (-not (Test-ConsoleCurrent)) {
        Write-Host "Demo console is an older build (missing deploy API). Restarting..."
        & $StopScript
        Start-Sleep -Seconds 2
    } else {
        Start-Process $Url
        $lp = Get-ListenerPid
        Write-Host "Console already running on $Url (listener PID $lp). Opened browser."
        if ($lp) { $lp | Set-Content -Path $PidFile -Encoding ascii }
        exit 0
    }
}

$proc = Start-ConsoleProcess
if (-not (Wait-ConsoleReady -LauncherProc $proc)) {
    throw "Timed out waiting for $Url - run: py -3 -m kit.cli demo-ui"
}
Write-Host "OYDK console ready at $Url (launcher PID $($proc.Id))."
