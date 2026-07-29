$ErrorActionPreference = "Stop"

. "$PSScriptRoot\build-mobile-common.ps1"

Write-Step "============================================================"
Write-Step " BUILD ANDROID APK (internal install link)"
Write-Step "============================================================"

Ensure-NodeModules
Ensure-GitRepo
Ensure-EasLogin
Ensure-ProductionEnvSynced

Write-Step "Starting EAS build: Android APK (profile: preview)..."
Write-Host "This uses your Expo production environment variables."
Write-Host "When it finishes, Expo shows a download/install link for testers."
Write-Host ""

Invoke-Eas build --platform android --profile preview

Write-Step "Done."
Write-Host "Share the install link from the Expo build page with Android users."
Write-Host "Open builds: https://expo.dev/accounts/[your-account]/projects/soulmate-ai/builds"
Write-Host ""
