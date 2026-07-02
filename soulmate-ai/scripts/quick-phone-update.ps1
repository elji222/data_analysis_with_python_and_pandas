$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$Base = "https://raw.githubusercontent.com/elji222/data_analysis_with_python_and_pandas/master/soulmate-ai"

$Files = @(
    "app/_layout.tsx",
    "app/(auth)/login.tsx",
    "app/(tabs)/chat.tsx",
    "components/build-version-banner.tsx",
    "components/chat-panel.tsx",
    "components/chat-composer.tsx",
    "constants/chat-theme.ts",
    "lib/auth.ts",
    "lib/enforce-build-version.ts",
    "metro.config.js",
    "scripts/start-phone.ps1",
    "scripts/start-phone-web.ps1",
    "scripts/start-phone-web.cmd",
    "scripts/fix-and-update-phone.cmd",
    "scripts/quick-phone-update.ps1",
    "scripts/quick-phone-update.cmd",
    "scripts/update-local.ps1",
    "scripts/update-local.cmd"
)

Write-Host ""
Write-Host "Downloading latest Soulmate AI files for phone..."
Write-Host "Folder: $Root"
Write-Host ""

foreach ($RelativePath in $Files) {
    $Url = "$Base/$RelativePath"
    $Destination = Join-Path $Root ($RelativePath -replace "/", [IO.Path]::DirectorySeparatorChar)
    $Directory = Split-Path $Destination -Parent

    if (-not (Test-Path $Directory)) {
        New-Item -ItemType Directory -Path $Directory -Force | Out-Null
    }

    Invoke-WebRequest -Uri $Url -OutFile $Destination -UseBasicParsing
    Write-Host "OK: $RelativePath"
}

$ThemeFile = Join-Path $Root "constants\chat-theme.ts"
$ThemeText = Get-Content $ThemeFile -Raw

if ($ThemeText -notmatch "export const UI_VERSION") {
    throw "Download failed. constants/chat-theme.ts looks wrong."
}

$versionMatch = [regex]::Match($ThemeText, "UI_VERSION\s*=\s*'([^']+)'")
$uiVersion = if ($versionMatch.Success) { $versionMatch.Groups[1].Value } else { "unknown" }

$LayoutFile = Join-Path $Root "app\_layout.tsx"
$LayoutText = Get-Content $LayoutFile -Raw

if ($LayoutText -notmatch "BuildVersionBanner") {
    throw "Download failed. app/_layout.tsx is still old."
}

Write-Host ""
Write-Host "SUCCESS. Phone build $uiVersion is on disk."
Write-Host ""
Write-Host "Next: scripts\start-phone-web.cmd"
Write-Host "On phone Safari/Chrome open the http link shown there."
Write-Host ""
