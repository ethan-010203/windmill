param(
    [string]$Service = ""
)

$ErrorActionPreference = "Stop"
$DeployDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $DeployDir

Write-Host "正在跟随输出日志，按 Ctrl+C 停止。"

if ([string]::IsNullOrWhiteSpace($Service)) {
    docker compose logs -f --tail=200
} else {
    docker compose logs -f --tail=200 $Service
}
