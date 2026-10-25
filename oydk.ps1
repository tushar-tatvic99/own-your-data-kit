[CmdletBinding()]
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$CliArgs
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (Test-Path "$ScriptDir\.venv\Scripts\python.exe") {
    & "$ScriptDir\.venv\Scripts\python.exe" -m kit.cli $CliArgs
} elseif (Test-Path "$ScriptDir\venv\Scripts\python.exe") {
    & "$ScriptDir\venv\Scripts\python.exe" -m kit.cli $CliArgs
} else {
    py -3 -m kit.cli $CliArgs
}
