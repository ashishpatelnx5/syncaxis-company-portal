<#
Starts the Syncaxis Company Portal locally as a single service: builds the
frontend (only if it changed), then starts the backend API, which serves both
the API and the built frontend on one port. Run stop.ps1 to shut it down again.

  -Rebuild   force a frontend build even if dist/ looks up to date
#>
param([switch]$Rebuild)

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

$port = Get-EnvValue (Join-Path $root 'server\.env') 'PORT' '8050'
$healthUrl = "http://localhost:$port/api/health"

function Test-Healthy {
    try { return (Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200 } catch { return $false }
}

$pidFile = Join-Path $runDir 'app.pid'
if (Test-Path $pidFile) {
    $existingId = Get-Content $pidFile -ErrorAction SilentlyContinue
    if ($existingId -and (Get-Process -Id $existingId -ErrorAction SilentlyContinue)) {
        Write-Host "Already running (PID $existingId) - skipping. Use stop.ps1 first to restart." -ForegroundColor Yellow
        exit 0
    }
    Remove-Item $pidFile -ErrorAction SilentlyContinue
}

# Something else already answering on the port means the app would fail to
# bind - say so instead of starting a process that dies silently.
if (Test-Healthy) {
    Write-Host "Port $port is already serving the portal (not started by this script) - skipping." -ForegroundColor Yellow
    exit 0
}

# Rebuild only when a frontend input is newer than the last build.
$distIndex = Join-Path $root 'dist\index.html'
$needsBuild = $Rebuild -or -not (Test-Path $distIndex)
if (-not $needsBuild) {
    $builtAt = (Get-Item $distIndex).LastWriteTimeUtc
    $inputs = @(Get-ChildItem (Join-Path $root 'src') -Recurse -File) +
              @(Get-ChildItem $root -File | Where-Object { $_.Name -match '^(index\.html|package(-lock)?\.json|vite\.config\..*)$' }) +
              @(Get-ChildItem (Join-Path $root 'public') -Recurse -File -ErrorAction SilentlyContinue)
    $newest = ($inputs | Measure-Object -Property LastWriteTimeUtc -Maximum).Maximum
    $needsBuild = $newest -gt $builtAt
}

if ($needsBuild) {
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
} else {
    Write-Host 'Frontend is up to date - skipping build (use -Rebuild to force).'
}

$logFile = Join-Path $runDir 'app.log'
$errFile = "$logFile.err"
Remove-Item $logFile, $errFile -Force -ErrorAction SilentlyContinue

# Run node directly (not via `npm start` in cmd) so the saved PID is the
# server itself and stop.ps1 can identify it reliably.
$node = (Get-Command node -ErrorAction Stop).Source
$proc = Start-Process -FilePath $node -ArgumentList 'src/index.js' `
    -WorkingDirectory (Join-Path $root 'server') -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput $logFile -RedirectStandardError $errFile
Set-Content -Path $pidFile -Value $proc.Id
Write-Host "Starting (PID $($proc.Id))..."

# Poll instead of a fixed sleep: returns as soon as it's up, and notices an
# early crash immediately.
$ok = $false
for ($i = 0; $i -lt 30; $i++) {
    if ($proc.HasExited) { break }
    if (Test-Healthy) { $ok = $true; break }
    Start-Sleep -Milliseconds 500
}

Write-Host ''
if ($ok) {
    Write-Host "Syncaxis Company Portal:  http://localhost:$port  [OK]  <-- open this in your browser" -ForegroundColor Green
} else {
    Remove-Item $pidFile -ErrorAction SilentlyContinue
    if ($proc.HasExited) {
        Write-Host "The server exited during startup (code $($proc.ExitCode)). Last error output:" -ForegroundColor Red
    } else {
        Write-Host "Not responding after 15s - it may still be starting, or is stuck. Last error output:" -ForegroundColor Yellow
        Write-Host "(process left running; run stop.ps1 to stop it)"
        Set-Content -Path $pidFile -Value $proc.Id
    }
    if (Test-Path $errFile) { Get-Content $errFile -Tail 15 }
    Write-Host "Full logs: $logFile and $errFile"
}
Write-Host ''
Write-Host 'Run scripts\stop.ps1 to stop it.'
