<#
Stops the backend API and frontend processes started by start.ps1, killing
each one's full process tree (npm/cmd spawn child node processes that would
otherwise be left running).
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

Stop-App -name 'Backend API' -pidFile (Join-Path $runDir 'backend.pid')
Stop-App -name 'Frontend' -pidFile (Join-Path $runDir 'frontend.pid')
