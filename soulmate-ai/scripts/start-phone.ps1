$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host ""
Write-Host "============================================"
Write-Host " Soulmate AI - Open in Expo Go (phone)"
Write-Host "============================================"
Write-Host ""
Write-Host "Before you scan the QR code:"
Write-Host "  1. Install Expo Go on your phone (App Store or Google Play)"
Write-Host "  2. Make sure this folder has a .env file with your API keys"
Write-Host ""
Write-Host "How to scan:"
Write-Host "  - Android: open Expo Go, tap Scan QR code"
Write-Host "  - iPhone: open the Camera app and tap the Expo link"
Write-Host ""
Write-Host "Tunnel mode is on, so your phone does NOT need the same Wi-Fi as this PC."
Write-Host ""
Write-Host "Starting Expo (this window must stay open while you use the app)..."
Write-Host ""

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing npm packages (first time only)..."
    npm install
    Write-Host ""
}

npx expo start --tunnel --clear
