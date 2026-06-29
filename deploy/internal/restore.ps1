param(
    [Parameter(Mandatory = $true)]
    [string]$BackupFile,

    [switch]$Force
)

$ErrorActionPreference = "Stop"
$DeployDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $DeployDir

if (-not (Test-Path $BackupFile)) {
    throw "备份文件不存在：$BackupFile"
}

Write-Host "准备从备份恢复数据库：$BackupFile" -ForegroundColor Yellow
Write-Host "恢复操作会覆盖当前数据库。请确认当前数据已经备份。"
if (-not $Force) {
    $Confirm = Read-Host "输入 RESTORE 继续"
    if ($Confirm -ne "RESTORE") {
        Write-Host "已取消恢复。"
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
Write-Host "恢复完成，服务已重新启动。" -ForegroundColor Green
