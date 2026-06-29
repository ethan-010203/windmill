param(
    [string]$OutputDir = ".\backups"
)

$ErrorActionPreference = "Stop"
$DeployDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $DeployDir

if (-not (Test-Path ".env")) {
    throw "未找到 .env，无法读取部署配置。"
}

$MountedBackupDir = ".\backups"
New-Item -ItemType Directory -Force -Path $MountedBackupDir | Out-Null
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupName = "internal-platform-$Timestamp.dump"
$BackupFile = Join-Path $OutputDir $BackupName
$MountedBackupFile = Join-Path $MountedBackupDir $BackupName

Write-Host "正在备份数据库到：$BackupFile"
docker compose exec -T postgres pg_dump -U postgres -d windmill -Fc -f "/backups/$BackupName"
if ((Resolve-Path $OutputDir).Path -ne (Resolve-Path $MountedBackupDir).Path) {
    Copy-Item -Force $MountedBackupFile $BackupFile
}
Write-Host "备份完成：$BackupFile" -ForegroundColor Green
