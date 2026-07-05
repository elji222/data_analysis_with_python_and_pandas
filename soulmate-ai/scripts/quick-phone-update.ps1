$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$Base = "https://raw.githubusercontent.com/elji222/data_analysis_with_python_and_pandas/master/soulmate-ai"
$CacheBust = "2026-07-13a"

$Files = @(
    "app/_layout.tsx",
    "app/(auth)/login.tsx",
    "app/(tabs)/_layout.tsx",
    "app/(tabs)/chat.tsx",
    "app/(tabs)/memory.tsx",
    "app/api/chat+api.ts",
    "app/api/memories+api.ts",
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
    "components/stale-bundle-gate.tsx",
    "components/ui/icon-symbol.tsx",
    "components/voice-waveform.tsx",
    "constants/chat-theme.ts",
    "constants/ai.ts",
    "hooks/use-mobile-chat-layout.ts",
    "hooks/use-user-memories.ts",
    "hooks/use-voice-input.ts",
    "hooks/use-wide-layout.ts",
    "lib/anthropic.ts",
    "lib/attachments.ts",
    "lib/auth.ts",
    "lib/enforce-build-version.ts",
    "lib/browser-capabilities.ts",
    "lib/memory/extract.ts",
    "lib/memory/intent.ts",
    "lib/memory/process.ts",
    "lib/memory/prompt.ts",
    "lib/memory/repository.ts",
    "lib/memory/search.ts",
    "lib/memory/trivial.ts",
    "lib/recover-stale-web-bundle.ts",
    "lib/supabase-server.ts",
    "services/chat-api.ts",
    "services/memory-api.ts",
    "types/memory.ts",
    "eas.json",
    ".npmrc",
    "metro.config.js",
    "scripts/start-phone.ps1",
    "scripts/start-phone-web.ps1",
    "scripts/start-phone-web.cmd",
    "scripts/fix-and-update-phone.cmd",
    "scripts/emergency-fix.cmd",
    "scripts/open-on-phone.ps1",
    "scripts/open-on-phone.cmd",
    "GET-LATEST.cmd",
    "DEPLOY.cmd",
    "scripts/deploy-live-site.cmd",
    "scripts/deploy-live-site.ps1",
    "scripts/deploy-now.cmd",
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
    $Url = if ($RelativePath -eq "scripts/deploy-live-site.ps1" -or $RelativePath -eq "scripts/deploy-live-site.cmd") {
        "$Base/$RelativePath`?$CacheBust"
    } else {
        "$Base/$RelativePath"
    }
    $Destination = Join-Path $Root ($RelativePath -replace "/", [IO.Path]::DirectorySeparatorChar)
    $Directory = Split-Path $Destination -Parent

    if (-not (Test-Path $Directory)) {
        New-Item -ItemType Directory -Path $Directory -Force | Out-Null
    }

    Invoke-WebRequest -Uri $Url -OutFile $Destination -UseBasicParsing
    Write-Host "OK: $RelativePath"
}

$StalePicker = Join-Path $Root "lib\web-file-picker.ts"
if (Test-Path $StalePicker) {
    Remove-Item -LiteralPath $StalePicker -Force
    Write-Host "Removed stale lib/web-file-picker.ts"
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

$AttachmentsFile = Join-Path $Root "lib\attachments.ts"
$AttachmentsText = Get-Content $AttachmentsFile -Raw

if ($AttachmentsText -notmatch "function pickFileViaWebInput") {
    throw "Download failed. lib/attachments.ts is missing the phone upload picker."
}

if ($AttachmentsText -match "web-file-picker") {
    throw "Download failed. lib/attachments.ts still imports the old broken file."
}

if (Test-Path $StalePicker) {
    throw "Stale lib/web-file-picker.ts is still on disk. Delete it manually and run again."
}

$ComposerFile = Join-Path $Root "components\chat-composer.tsx"
$ComposerText = Get-Content $ComposerFile -Raw

if ($ComposerText -notmatch "voiceModeButton") {
    throw "Download failed. chat-composer.tsx is missing the phone mic button."
}

if ($ComposerText -notmatch "layout\?: 'default' \| 'mobile'") {
    throw "Download failed. chat-composer.tsx is missing mobile layout support."
}

if ($ComposerText -notmatch "syncInputHeight|scrollHeight") {
    throw "Download failed. chat-composer.tsx is missing auto-grow input."
}

if ($LayoutText -notmatch "StaleBundleGate") {
    throw "Download failed. app/_layout.tsx is missing the phone cache fix."
}

if ($ThemeText -notmatch "MOBILE_UI_MARKER") {
    throw "Download failed. constants/chat-theme.ts is missing the mobile UI marker."
}

$ChatFile = Join-Path $Root "app\(tabs)\chat.tsx"
$ChatText = Get-Content $ChatFile -Raw

if ($ChatText -notmatch "useShellLayout") {
    throw "Download failed. chat.tsx is not forcing phone layout."
}

$MobileLayoutFile = Join-Path $Root "hooks\use-mobile-chat-layout.ts"
$MobileLayoutText = Get-Content $MobileLayoutFile -Raw

if ($MobileLayoutText -notmatch "isMobileWebBrowser") {
    throw "Download failed. use-mobile-chat-layout.ts is not phone-aware."
}

$HeaderFile = Join-Path $Root "components\mobile-chat-header.tsx"
if (-not (Test-Path $HeaderFile)) {
    throw "Download failed. mobile-chat-header.tsx is missing."
}

$HeaderText = Get-Content $HeaderFile -Raw
if ($HeaderText -notmatch "mobile-chat-header") {
    throw "Download failed. mobile-chat-header.tsx is still old."
}

$MemoryTabFile = Join-Path $Root "app\(tabs)\memory.tsx"
if (-not (Test-Path $MemoryTabFile)) {
    throw "Download failed. memory.tsx is missing."
}

$TabLayoutFile = Join-Path $Root "app\(tabs)\_layout.tsx"
$TabLayoutText = Get-Content $TabLayoutFile -Raw
if ($TabLayoutText -notmatch "brain.head.profile") {
    throw "Download failed. Memory tab is missing from app/(tabs)/_layout.tsx."
}

if ($ThemeText -notmatch "2026-07-13") {
    throw "Download failed. constants/chat-theme.ts is not on build 2026-07-13."
}

Write-Host ""
Write-Host "SUCCESS. Phone build $uiVersion is on disk."
Write-Host "Stale web-file-picker.ts removed (if it existed)."
Write-Host ""
Write-Host "On phone you should see:"
Write-Host "  - Blue pill at top: PHONE BUILD $uiVersion"
Write-Host "  - Header center: Soulmate AI with Build $uiVersion"
Write-Host "  - Bottom bar: + button (left), mic, blue voice button (right)"
Write-Host ""
Write-Host "Next: scripts\start-phone-web.cmd"
Write-Host "On phone Safari/Chrome open the http link shown there."
Write-Host ""

exit 0
