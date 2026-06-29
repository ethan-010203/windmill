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
        throw "命令执行失败，退出码：$LASTEXITCODE"
    }
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "未找到 docker 命令。请先安装 Docker Desktop，并确认正在使用 Linux containers。"
}

if (-not (Test-Path ".env")) {
    throw "未找到 .env。请先复制 .env.example 为 .env，并修改密码和密钥。"
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
            throw "未找到本地镜像 '$WindmillImage'。请先运行 .\build-image.ps1，或把 WINDMILL_IMAGE 改成可拉取的远程镜像。"
        }

        Write-Host "使用本地运行镜像：$WindmillImage"
    } else {
        Invoke-Checked { docker compose pull }
    }
}

Invoke-Checked { docker compose up -d }

Write-Host ""
Write-Host "系统已启动。" -ForegroundColor Green
Write-Host "请打开 .env 中的 BASE_URL，默认地址：http://127.0.0.1:8000"
Write-Host "首次访问时，按页面提示创建管理员账号。"
