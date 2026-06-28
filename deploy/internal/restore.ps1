param(
    [Parameter(Mandatory = $true)]
    [string]$BackupFile,

    [switch]$Force
)

$ErrorActionPreference = "Stop"
$DeployDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $DeployDir

if (-not (Test-Path $BackupFile)) {
    throw "Backup file does not exist: $BackupFile"
}

Write-Host "About to restore database from: $BackupFile" -ForegroundColor Yellow
Write-Host "Restore will overwrite the current database. Confirm that current data is backed up."
if (-not $Force) {
    $Confirm = Read-Host "Type RESTORE to continue"
    if ($Confirm -ne "RESTORE") {
        Write-Host "Restore cancelled."
        exit 0
    }
}

docker compose up -d postgres
docker compose stop windmill_worker_native windmill_worker windmill_server

docker compose exec -T postgres psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS windmill WITH (FORCE);"
docker compose exec -T postgres psql -U postgres -d postgres -c "CREATE DATABASE windmill;"
docker compose cp $BackupFile postgres:/tmp/windmill-restore.dump
docker compose exec -T postgres pg_restore -U postgres -d windmill --clean --if-exists /tmp/windmill-restore.dump
docker compose exec -T postgres rm -f /tmp/windmill-restore.dump

docker compose up -d
Write-Host "Restore completed; services restarted." -ForegroundColor Green
