$ErrorActionPreference = "Stop"

. "$PSScriptRoot\build-mobile-common.ps1"

Write-Step "============================================================"
Write-Step " BUILD ANDROID APK (internal install link)"
Write-Step "============================================================"

Ensure-DiskSpaceForBuild
Ensure-NodeModules
Ensure-PackageLockSynced
Ensure-GitRepo
Ensure-EasLogin
Ensure-ProductionEnvSynced

Write-Step "Verifying Android bundle locally..."
& "$PSScriptRoot\verify-android-bundle.ps1"
if ($LASTEXITCODE -ne 0) {
    throw "Android bundle check failed."
}

Write-Step "Starting EAS build: Android APK (profile: preview)..."
Write-Host "This uses your Expo production environment variables."
Write-Host "When it finishes, Expo shows a download/install link for testers."
if ($env:EAS_NO_VCS -eq "1") {
    Write-Host "Running without git (EAS_NO_VCS=1). .easignore excludes node_modules from the upload."
}
Write-Host ""

# Long nested Downloads paths break EAS "Compressing project files" on Windows.
# Copy a lean tree to C:\soulmate-eas (real short path) before uploading.
$previousLocation = Get-Location
$buildRoot = $Root
$usedStaging = $false

try {
    if (Test-NeedsShortBuildPath) {
        $buildRoot = New-ShortEasBuildStaging
        $usedStaging = $true
        # Staging has no git history; use .easignore-based upload.
        $env:EAS_NO_VCS = "1"
        Write-Host "Using EAS_NO_VCS=1 for the short staging folder."
    }

    Set-Location $buildRoot
    Write-Host "Running EAS compress/upload from: $buildRoot"
    Invoke-Eas build --platform android --profile preview
}
finally {
    Set-Location $previousLocation
    if ($usedStaging -and (Test-Path "C:\soulmate-eas")) {
        Write-Host "Leaving C:\soulmate-eas in place for the next build (safe to delete later)."
    }
}

Write-Step "Done."
Write-Host "Share the install link from the Expo build page with Android users."
Write-Host "Open builds: https://expo.dev/accounts/[your-account]/projects/soulmate-ai/builds"
Write-Host ""
