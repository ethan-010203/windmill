param(
    [switch]$NoBuild
)

$ErrorActionPreference = "Stop"
$DeployDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $DeployDir

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "未找到 docker 命令。请先安装 Docker Desktop，并确认已启用 Linux containers。"
}

if (-not (Test-Path ".env")) {
    throw "未找到 .env。请先运行：copy .env.example .env，然后修改其中的密码和密钥。"
}

docker compose version | Out-Null

if ($NoBuild) {
    docker compose up -d
} else {
    docker compose up -d --build
}

Write-Host ""
Write-Host "系统已启动。" -ForegroundColor Green
Write-Host "访问地址：请查看 .env 中的 BASE_URL，默认 http://127.0.0.1:8000"
Write-Host "首次访问时请按页面提示创建管理员账号。"
