param(
    [switch]$NoBuild
)

$ErrorActionPreference = "Stop"
$DeployDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $DeployDir

function Invoke-Checked {
    param(
        [Parameter(Mandatory = $true)]
        [scriptblock]$Command
    )

    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed with exit code $LASTEXITCODE"
    }
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "docker command was not found. Please install Docker Desktop and use Linux containers."
}

if (-not (Test-Path ".env")) {
    throw ".env was not found. Copy .env.example to .env and update passwords/secrets first."
}

Invoke-Checked { docker compose version | Out-Null }

if (-not $NoBuild) {
    Invoke-Checked { docker compose pull }
}

Invoke-Checked { docker compose up -d }

Write-Host ""
Write-Host "System started." -ForegroundColor Green
Write-Host "Open the BASE_URL from .env, default: http://127.0.0.1:8000"
Write-Host "On first visit, follow the page prompts to create the admin account."
