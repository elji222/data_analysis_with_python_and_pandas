$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Root = Split-Path -Parent $PSScriptRoot
$ScriptsDir = Join-Path $Root "scripts"
$Version = "2026-07-11h"
$Base = "https://raw.githubusercontent.com/elji222/data_analysis_with_python_and_pandas/master/soulmate-ai/scripts"

$Downloads = @(
    @{ Name = "quick-phone-update.ps1"; Url = "$Base/quick-phone-update.ps1?v=$Version" },
    @{ Name = "deploy-live-site.ps1"; Url = "$Base/deploy-live-site.ps1?v=$Version" }
)

foreach ($item in $Downloads) {
    $destination = Join-Path $ScriptsDir $item.Name
    Invoke-WebRequest -Uri $item.Url -OutFile $destination -UseBasicParsing
    Write-Host "Downloaded $($item.Name)"
}

Write-Host "Deploy scripts version $Version"

exit 0
