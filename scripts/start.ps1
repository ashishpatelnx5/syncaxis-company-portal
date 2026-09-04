<#
Starts the Syncaxis Company Portal locally: the backend API (server/) and
the frontend, each as a detached background process (survives this window
closing). Run stop.ps1 to shut them down again.

Frontend uses `npm start` (builds fresh, then serves on 0.0.0.0 so it's
reachable from other machines on the network, not just this one) and the
backend uses `npm start` (plain node, no file-watch) — matching how
DEPLOYMENT.md describes running this app day-to-day.
#>

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$runDir = Join-Path $root '.run'
New-Item -ItemType Directory -Force -Path $runDir | Out-Null

function Get-EnvValue($path, $key, $default) {
    if (Test-Path $path) {
        $line = Get-Content $path | Where-Object { $_ -match "^\s*$key\s*=" } | Select-Object -First 1
        if ($line) { return ($line -split '=', 2)[1].Trim() }
    }
    return $default
}

function Start-App($name, $workDir, $logFile, $pidFile) {
    if (Test-Path $pidFile) {
        $existingId = Get-Content $pidFile -ErrorAction SilentlyContinue
        if ($existingId -and (Get-Process -Id $existingId -ErrorAction SilentlyContinue)) {
            Write-Host "$name is already running (PID $existingId) - skipping."
            return
        }
    }

    if (Test-Path $logFile) { Remove-Item $logFile -Force }
    $proc = Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', 'npm start' `
        -WorkingDirectory $workDir -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput $logFile -RedirectStandardError "$logFile.err"
    Set-Content -Path $pidFile -Value $proc.Id
    Write-Host "$name starting (PID $($proc.Id))..."
}

Start-App -name 'Backend API' -workDir (Join-Path $root 'server') `
    -logFile (Join-Path $runDir 'backend.log') -pidFile (Join-Path $runDir 'backend.pid')

Start-App -name 'Frontend' -workDir $root `
    -logFile (Join-Path $runDir 'frontend.log') -pidFile (Join-Path $runDir 'frontend.pid')

Write-Host ''
Write-Host 'Waiting for both to come up (frontend rebuilds fresh on every start)...'
Start-Sleep -Seconds 10

$backendPort = Get-EnvValue (Join-Path $root 'server\.env') 'PORT' '4000'
$frontendPort = Get-EnvValue (Join-Path $root '.env') 'VITE_PORT' '5173'

$backendOk = $false
try {
    $r = Invoke-WebRequest -Uri "http://localhost:$backendPort/api/health" -UseBasicParsing -TimeoutSec 5
    $backendOk = $r.StatusCode -eq 200
} catch {}

$frontendOk = $false
try {
    $r = Invoke-WebRequest -Uri "http://localhost:$frontendPort/" -UseBasicParsing -TimeoutSec 5
    $frontendOk = $r.StatusCode -eq 200
} catch {}

Write-Host ''
if ($backendOk) {
    Write-Host "Backend API:  http://localhost:$backendPort  [OK]" -ForegroundColor Green
} else {
    Write-Host "Backend API:  not responding yet - check $(Join-Path $runDir 'backend.log')" -ForegroundColor Yellow
}
if ($frontendOk) {
    Write-Host "Frontend:     http://localhost:$frontendPort  [OK]  <-- open this in your browser" -ForegroundColor Green
} else {
    Write-Host "Frontend:     not responding yet - check $(Join-Path $runDir 'frontend.log')" -ForegroundColor Yellow
}
Write-Host ''
Write-Host 'Run scripts\stop.ps1 to stop both.'
