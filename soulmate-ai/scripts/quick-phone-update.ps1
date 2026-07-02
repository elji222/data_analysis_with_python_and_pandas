$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$Base = "https://raw.githubusercontent.com/elji222/data_analysis_with_python_and_pandas/master/soulmate-ai"

$Files = @(
    "app/_layout.tsx",
    "app/(auth)/login.tsx",
    "app/(tabs)/chat.tsx",
    "app.json",
    "components/attach-popover.tsx",
    "components/build-version-banner.tsx",
    "components/chat-bubble.tsx",
    "components/chat-composer.tsx",
    "components/chat-panel.tsx",
    "components/composer-attachments.tsx",
    "components/conversation-sidebar.tsx",
    "components/mobile-chat-header.tsx",
    "components/mobile-quick-suggestions.tsx",
    "components/production-site-warning.tsx",
    "components/voice-waveform.tsx",
    "constants/chat-theme.ts",
    "constants/ai.ts",
    "hooks/use-mobile-chat-layout.ts",
    "hooks/use-voice-input.ts",
    "hooks/use-wide-layout.ts",
    "lib/attachments.ts",
    "lib/auth.ts",
    "lib/enforce-build-version.ts",
    "lib/web-file-picker.ts",
    "metro.config.js",
    "scripts/start-phone.ps1",
    "scripts/start-phone-web.ps1",
    "scripts/start-phone-web.cmd",
    "scripts/fix-and-update-phone.cmd",
    "scripts/check-pc-build.cmd",
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

$ComposerFile = Join-Path $Root "components\chat-composer.tsx"
$ComposerText = Get-Content $ComposerFile -Raw

if ($ComposerText -notmatch "voiceModeButton") {
    throw "Download failed. chat-composer.tsx is missing the phone mic button."
}

if ($ComposerText -notmatch "layout\?: 'default' \| 'mobile'") {
    throw "Download failed. chat-composer.tsx is missing mobile layout support."
}

$HeaderFile = Join-Path $Root "components\mobile-chat-header.tsx"
if (-not (Test-Path $HeaderFile)) {
    throw "Download failed. mobile-chat-header.tsx is missing."
}

Write-Host ""
Write-Host "SUCCESS. Phone build $uiVersion is on disk."
Write-Host ""
Write-Host "On phone you should see:"
Write-Host "  - Blue pill at top: PHONE BUILD $uiVersion"
Write-Host "  - Header center: Soulmate AI with Build $uiVersion"
Write-Host "  - Bottom bar: + button (left), mic, blue voice button (right)"
Write-Host ""
Write-Host "Next: scripts\start-phone-web.cmd"
Write-Host "On phone Safari/Chrome open the http link shown there."
Write-Host ""
