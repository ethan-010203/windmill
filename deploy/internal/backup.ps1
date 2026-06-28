param(
    [string]$OutputDir = ".\backups"
)

$ErrorActionPreference = "Stop"
$DeployDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $DeployDir

if (-not (Test-Path ".env")) {
    throw "未找到 .env，无法确定部署配置。"
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupName = "windmill-$Timestamp.dump"
$BackupFile = Join-Path $OutputDir $BackupName

Write-Host "开始备份数据库到 $BackupFile"
docker compose exec -T postgres pg_dump -U postgres -d windmill -Fc -f "/backups/$BackupName"
Write-Host "备份完成：$BackupFile" -ForegroundColor Green
