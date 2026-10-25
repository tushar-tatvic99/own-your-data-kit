[CmdletBinding()]
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$CliArgs
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# 1. Check existing virtual environments
$PyExe = ""
if (Test-Path "$ScriptDir\.venv\Scripts\python.exe") {
    $PyExe = "$ScriptDir\.venv\Scripts\python.exe"
} elseif (Test-Path "$ScriptDir\venv\Scripts\python.exe") {
    $PyExe = "$ScriptDir\venv\Scripts\python.exe"
}

# 2. If no virtualenv found, check if global py/python has 'click'
if (-not $PyExe) {
    $hasClick = $false
    try {
        & py -3 -c "import click" 2>$null
        if ($LASTEXITCODE -eq 0) {
            $hasClick = $true
            $PyExe = "py"
        }
    } catch {}

    # If click is missing, auto-create .venv and install requirements
    if (-not $hasClick) {
        Write-Host "Python dependencies not found. Initializing .venv and installing requirements..." -ForegroundColor Yellow
        $created = $false
        try {
            & py -3 -m venv "$ScriptDir\.venv"
            $created = $true
        } catch {
            try {
                & python -m venv "$ScriptDir\.venv"
                $created = $true
            } catch {}
        }

        if (Test-Path "$ScriptDir\.venv\Scripts\python.exe") {
            $PyExe = "$ScriptDir\.venv\Scripts\python.exe"
            Write-Host "Installing requirements from requirements.txt (one-time setup)..." -ForegroundColor Cyan
            & $PyExe -m pip install --quiet --upgrade pip
            & $PyExe -m pip install --quiet -r "$ScriptDir\requirements.txt"
            Write-Host "✓ Dependencies installed successfully." -ForegroundColor Green
        } else {
            Write-Host "Please install dependencies manually: py -3 -m pip install -r requirements.txt" -ForegroundColor Red
        }
    }
}

# 3. Execute kit.cli with arguments
if ($PyExe -and $PyExe -ne "py") {
    & $PyExe -m kit.cli $CliArgs
} else {
    py -3 -m kit.cli $CliArgs
}
