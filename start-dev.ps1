#Requires -Version 5.1
<#
.SYNOPSIS
  One-shot local dev: deps, DB migrations, optional Redis (Docker), then backend + frontend in new terminals.

.DESCRIPTION
  - Redis: runs `docker compose up -d redis` only if `docker` is on PATH (skipped if Docker is not installed).
  - Creates backend/.env and frontend/.env.local from *.example if missing.
  - Backend: Python venv, pip install, alembic upgrade head, then uvicorn via run_backend.py (default port 8001).
  - Frontend: npm install if node_modules missing, then next dev (port 3000).

.PARAMETER SkipDocker
  Do not attempt Docker / Redis.

.EXAMPLE
  .\start-dev.ps1
  .\start-dev.ps1 -SkipDocker
#>
param(
    [switch]$SkipDocker
)

$ErrorActionPreference = "Stop"
$RepoRoot = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
Set-Location $RepoRoot

Write-Host ""
Write-Host "Talent Map — dev bootstrap ($RepoRoot)" -ForegroundColor Cyan
Write-Host ""

function Test-Cmd {
    param([string]$Name)
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

# --- Optional Redis (requires Docker Desktop / CLI) ---
if (-not $SkipDocker) {
    if (Test-Cmd "docker") {
        Write-Host "Starting Redis (docker compose)..." -ForegroundColor Green
        docker compose up -d redis
    }
    else {
        Write-Host "Docker not found — skipping Redis. The app runs without it for most flows; add Redis later if you need queues/cache." -ForegroundColor Yellow
    }
}

# --- Env stubs ---
if (-not (Test-Path "$RepoRoot\backend\.env")) {
    Copy-Item "$RepoRoot\backend\.env.example" "$RepoRoot\backend\.env"
    Write-Warning "Created backend\.env from .env.example — set DATABASE_URL, JWT_SECRET_KEY, APP_SECRET_KEY before the API will work."
}
if (-not (Test-Path "$RepoRoot\frontend\.env.local")) {
    Copy-Item "$RepoRoot\frontend\.env.example" "$RepoRoot\frontend\.env.local"
    Write-Host "Created frontend\.env.local from .env.example" -ForegroundColor Yellow
}

# --- Python ---
$Py = if (Test-Cmd "python") { "python" } elseif (Test-Cmd "py") { "py" } else { $null }
if (-not $Py) {
    Write-Error "Python not found. Install Python 3.12 or 3.13 and ensure it is on PATH."
}

Push-Location "$RepoRoot\backend"
if (-not (Test-Path ".\.venv\Scripts\Activate.ps1")) {
    Write-Host "Creating Python virtual environment..." -ForegroundColor Green
    & $Py -m venv .venv
}
. .\.venv\Scripts\Activate.ps1
Write-Host "Installing Python dependencies..." -ForegroundColor Green
python -m pip install -q -r requirements.txt
Write-Host "Running database migrations (Alembic)..." -ForegroundColor Green
python -m alembic upgrade head
Pop-Location

# --- Node ---
if (-not (Test-Cmd "npm")) {
    Write-Error "npm not found. Install Node.js 20+ (LTS)."
}
Push-Location "$RepoRoot\frontend"
if (-not (Test-Path ".\node_modules")) {
    Write-Host "npm install (first run)..." -ForegroundColor Green
    npm install
}
else {
    Write-Host "npm install (sync)..." -ForegroundColor Green
    npm install --no-fund --no-audit 2>$null
}
Pop-Location

# --- Launch servers in new windows (matches next.config proxy default port 8001) ---
$Shell = if (Test-Cmd "pwsh") { "pwsh" } else { "powershell" }

$BackendCmd = @"
Set-Location "$RepoRoot\backend"
. .\.venv\Scripts\Activate.ps1
`$host.UI.RawUI.WindowTitle = 'Talent Map — Backend :8001'
python run_backend.py
"@

$FrontendCmd = @"
Set-Location "$RepoRoot\frontend"
`$host.UI.RawUI.WindowTitle = 'Talent Map — Frontend :3000'
npm run dev
"@

Start-Process $Shell -ArgumentList @("-NoExit", "-Command", $BackendCmd)
Start-Process $Shell -ArgumentList @("-NoExit", "-Command", $FrontendCmd)

Write-Host ""
Write-Host "Opened two terminals: backend (8001) and frontend (3000)." -ForegroundColor Green
Write-Host "  App:      http://localhost:3000" -ForegroundColor Gray
Write-Host "  API docs: http://127.0.0.1:8001/docs" -ForegroundColor Gray
Write-Host "  Health:   http://127.0.0.1:8001/health" -ForegroundColor Gray
Write-Host ""
