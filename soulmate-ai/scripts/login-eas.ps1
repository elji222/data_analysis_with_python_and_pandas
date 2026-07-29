$ErrorActionPreference = "Stop"

. "$PSScriptRoot\build-mobile-common.ps1"

Write-Step "============================================================"
Write-Step " LOG IN TO EXPO (command line)"
Write-Step "============================================================"
Write-Host ""
Write-Host "Note: being logged in at expo.dev in Chrome is NOT enough."
Write-Host "This step logs in the build tools on your PC."
Write-Host ""

Ensure-NodeModules

if (Test-EasLoggedIn) {
    $prev = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        if ((Get-EasBin) -eq "npx") {
            & npx eas whoami
        } else {
            & (Get-EasBin) whoami
        }
    } finally {
        $ErrorActionPreference = $prev
    }
    Write-Host ""
    Write-Host "Already logged in. You can run BUILD-ANDROID.cmd now."
    exit 0
}

Write-Host "Opening https://expo.dev/login in your browser..."
try {
    Start-Process "https://expo.dev/login"
} catch {
    Write-Host "Could not open browser automatically. Open https://expo.dev/login yourself."
}

Write-Host ""
Write-Host "Next, this window will ask you to log in for the command line."
Write-Host "If no new tab opens, watch for a URL in this window and paste it into Chrome."
Write-Host ""

Invoke-Eas login

Write-Host ""
Write-Host "Success. Now run BUILD-ANDROID.cmd"
Write-Host ""
