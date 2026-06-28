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

function Get-DotEnvValue {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    $Line = Get-Content ".env" | Where-Object { $_ -match "^\s*$Name\s*=" } | Select-Object -First 1
    if (-not $Line) {
        return ""
    }

    return ($Line -replace "^\s*$Name\s*=\s*", "").Trim().Trim('"').Trim("'")
}

function Test-LocalImageReference {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Image
    )

    $FirstPart = ($Image -split "/")[0]
    return ($Image -notmatch "/" -or ($FirstPart -notmatch "[.:]" -and $FirstPart -ne "localhost"))
}

if (-not $NoBuild) {
    $WindmillImage = Get-DotEnvValue "WINDMILL_IMAGE"
    if ($WindmillImage -and (Test-LocalImageReference $WindmillImage)) {
        docker image inspect $WindmillImage | Out-Null
        if ($LASTEXITCODE -ne 0) {
            throw "Local image '$WindmillImage' was not found. Build it first, or set WINDMILL_IMAGE to a pullable registry image."
        }

        Write-Host "Using local Windmill image: $WindmillImage"
    } else {
        Invoke-Checked { docker compose pull }
    }
}

Invoke-Checked { docker compose up -d }

Write-Host ""
Write-Host "System started." -ForegroundColor Green
Write-Host "Open the BASE_URL from .env, default: http://127.0.0.1:8000"
Write-Host "On first visit, follow the page prompts to create the admin account."
