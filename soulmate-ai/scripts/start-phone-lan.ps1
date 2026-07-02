$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host ""
Write-Host "Use this when your phone and PC are on the same Wi-Fi."
Write-Host "For different Wi-Fi, run scripts\start-phone-ngrok.cmd instead."
Write-Host ""

if (-not (Test-Path "node_modules")) {
    npm install
}

npx expo start --lan --clear
