$ErrorActionPreference = "Stop"

. "$PSScriptRoot\build-mobile-common.ps1"

Write-Step "============================================================"
Write-Step " SUBMIT LATEST iOS BUILD TO TESTFLIGHT"
Write-Step "============================================================"

Ensure-NodeModules
Ensure-EasLogin

Invoke-Eas submit --platform ios --profile preview-ios --latest

Write-Step "Submitted. Check App Store Connect -> TestFlight for review status."
