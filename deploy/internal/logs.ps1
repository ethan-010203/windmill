param(
    [string]$Service = ""
)

$ErrorActionPreference = "Stop"
$DeployDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $DeployDir

if ([string]::IsNullOrWhiteSpace($Service)) {
    docker compose logs -f --tail=200
} else {
    docker compose logs -f --tail=200 $Service
}
