$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host ""
Write-Host "============================================"
Write-Host " Soulmate AI - Expo Go (same Wi-Fi)"
Write-Host "============================================"
Write-Host ""
Write-Host "Tunnel mode is on, so your phone does NOT need the same Wi-Fi as this PC."
Write-Host "For same Wi-Fi (recommended), use scripts\start-phone.cmd instead."
Write-Host ""

if (-not (Test-Path "node_modules")) {
    npm install
}

npx expo start --lan --clear
