param(
    [string]$OutputDir = ".\backups"
)

$ErrorActionPreference = "Stop"
$DeployDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $DeployDir

if (-not (Test-Path ".env")) {
    throw ".env was not found; deployment configuration cannot be determined."
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupName = "windmill-$Timestamp.dump"
$BackupFile = Join-Path $OutputDir $BackupName

Write-Host "Backing up database to $BackupFile"
docker compose exec -T postgres pg_dump -U postgres -d windmill -Fc -f "/backups/$BackupName"
Write-Host "Backup completed: $BackupFile" -ForegroundColor Green
