$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host ""
Write-Host "Checking Android JavaScript bundle locally..."
Write-Host "If this fails, fix the error here before waiting on Expo's build queue."
Write-Host ""

$env:EAS_BUILD = "true"
$env:EAS_BUILD_PLATFORM = "android"

npx expo export:embed --eager --platform android --dev false
if ($LASTEXITCODE -ne 0) {
    throw "Android bundle failed locally. Run GET-LATEST.cmd, then try again."
}

Write-Host ""
Write-Host "Android bundle check passed."
