param(
    [string]$Image = "",
    [switch]$NoCache,
    [string[]]$BuildArg = @()
)

$ErrorActionPreference = "Stop"
$DeployDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $DeployDir "..\..")).Path
Set-Location $RepoRoot

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

function Get-DotEnvValue {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    $EnvPath = Join-Path $DeployDir ".env"
    if (-not (Test-Path $EnvPath)) {
        return ""
    }

    $Line = Get-Content $EnvPath | Where-Object { $_ -match "^\s*$Name\s*=" } | Select-Object -First 1
    if (-not $Line) {
        return ""
    }

    return ($Line -replace "^\s*$Name\s*=\s*", "").Trim().Trim('"').Trim("'")
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "未找到 docker 命令。请先安装 Docker Desktop，并确认正在使用 Linux containers。"
}

Invoke-Checked { docker version | Out-Null }

if ([string]::IsNullOrWhiteSpace($Image)) {
    $Image = Get-DotEnvValue "WINDMILL_IMAGE"
}

if ([string]::IsNullOrWhiteSpace($Image)) {
    $Image = "internal-windmill:ce-source"
}

$DockerArgs = @("build", "-t", $Image, "-f", (Join-Path $RepoRoot "Dockerfile"))

if ($NoCache) {
    $DockerArgs += "--no-cache"
}

foreach ($Arg in $BuildArg) {
    $DockerArgs += @("--build-arg", $Arg)
}

$DockerArgs += $RepoRoot

Write-Host "开始构建内部运行镜像：$Image" -ForegroundColor Cyan
Write-Host "源码目录：$RepoRoot"
Invoke-Checked { docker @DockerArgs }
Write-Host "镜像构建完成：$Image" -ForegroundColor Green
Write-Host "下一步可以运行：cd deploy\internal; .\start.ps1"
