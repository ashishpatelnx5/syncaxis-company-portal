<#
Stops the app process started by start.ps1, killing its full process tree
(npm/cmd spawn a child node process that would otherwise be left running).
#>

$root = Split-Path -Parent $PSScriptRoot
$runDir = Join-Path $root '.run'

function Stop-App($name, $pidFile) {
    if (-not (Test-Path $pidFile)) {
        Write-Host "${name}: not running (no PID file)."
        return
    }

    $processId = Get-Content $pidFile -ErrorAction SilentlyContinue
    if ($processId -and (Get-Process -Id $processId -ErrorAction SilentlyContinue)) {
        taskkill /PID $processId /T /F | Out-Null
        Write-Host "$name stopped (PID $processId)."
    } else {
        Write-Host "${name}: process already gone."
    }
    Remove-Item $pidFile -ErrorAction SilentlyContinue
}

Stop-App -name 'App' -pidFile (Join-Path $runDir 'app.pid')

# Clean up PID files from the older two-process version of this script, if
# a machine still has one of those running.
Stop-App -name 'Backend API (legacy)' -pidFile (Join-Path $runDir 'backend.pid')
Stop-App -name 'Frontend (legacy)' -pidFile (Join-Path $runDir 'frontend.pid')
