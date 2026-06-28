param(
    [switch]$NoBuild
)

$ErrorActionPreference = "Stop"
$DeployDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $DeployDir

& "$DeployDir\stop.ps1"
& "$DeployDir\start.ps1" -NoBuild:$NoBuild
