<#
Starts the Syncaxis Company Portal locally as a single service: builds the
frontend, then starts the backend API, which serves both the API and the
built frontend on one port. Run stop.ps1 to shut it down again.
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

$pidFile = Join-Path $runDir 'app.pid'
if (Test-Path $pidFile) {
    $existingId = Get-Content $pidFile -ErrorAction SilentlyContinue
    if ($existingId -and (Get-Process -Id $existingId -ErrorAction SilentlyContinue)) {
        Write-Host "Already running (PID $existingId) - skipping." -ForegroundColor Yellow
        exit 0
    }
}

Write-Host 'Building frontend...'
Push-Location $root
try {
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host 'Frontend build failed - see errors above.' -ForegroundColor Red
        exit 1
    }
} finally {
    Pop-Location
}

$logFile = Join-Path $runDir 'app.log'
if (Test-Path $logFile) { Remove-Item $logFile -Force }

$proc = Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', 'npm start' `
    -WorkingDirectory (Join-Path $root 'server') -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput $logFile -RedirectStandardError "$logFile.err"
Set-Content -Path $pidFile -Value $proc.Id
Write-Host "Starting (PID $($proc.Id))..."

Write-Host 'Waiting for it to come up...'
Start-Sleep -Seconds 6

$port = Get-EnvValue (Join-Path $root 'server\.env') 'PORT' '8050'

$ok = $false
try {
    $r = Invoke-WebRequest -Uri "http://localhost:$port/api/health" -UseBasicParsing -TimeoutSec 5
    $ok = $r.StatusCode -eq 200
} catch {}

Write-Host ''
if ($ok) {
    Write-Host "Syncaxis Company Portal:  http://localhost:$port  [OK]  <-- open this in your browser" -ForegroundColor Green
} else {
    Write-Host "Not responding yet - check $logFile and $logFile.err" -ForegroundColor Yellow
}
Write-Host ''
Write-Host 'Run scripts\stop.ps1 to stop it.'
