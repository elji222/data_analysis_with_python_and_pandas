$ErrorActionPreference = "Stop"

. "$PSScriptRoot\build-mobile-common.ps1"

Write-Step "============================================================"
Write-Step " BUILD iOS APP (TestFlight / App Store Connect)"
Write-Step "============================================================"

Ensure-NodeModules
Ensure-GitRepo
Ensure-EasLogin
Ensure-ProductionEnvSynced

Write-Step "Starting EAS build: iOS (profile: preview-ios)..."
Write-Host ""
Write-Host "Requirements:"
Write-Host "  - Apple Developer account ($99/year)"
Write-Host "  - First build may ask for Apple credentials in the terminal/browser"
Write-Host "  - Add this redirect URL in Supabase Auth settings:"
Write-Host "      soulmateai://login"
Write-Host ""

Invoke-Eas build --platform ios --profile preview-ios

Write-Step "Next step for TestFlight:"
Write-Host "  npx eas submit --platform ios --profile preview-ios --latest"
Write-Host "Or run BUILD-IOS-SUBMIT.cmd after the build completes."
Write-Host ""
