$ErrorActionPreference = "Stop"

# Use TLS 1.2+ (needed on some Windows setups)
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$Base = "https://raw.githubusercontent.com/elji222/data_analysis_with_python_and_pandas/master/soulmate-ai"

$Files = @(
    "app/(tabs)/index.tsx",
    "app/(tabs)/_layout.tsx",
    "app/(tabs)/chat.tsx",
    "app/_layout.tsx",
    "app/(auth)/login.tsx",
    "app/api/chat+api.ts",
    "app/api/title+api.ts",
    "app.json",
    "package.json",
    "metro.config.js",
    "components/build-version-banner.tsx",
    "components/attach-popover.tsx",
    "components/chat-bubble.tsx",
    "components/chat-scroll-rail.tsx",
    "components/chat-composer.tsx",
    "components/scroll-to-bottom-button.tsx",
    "components/chat-panel.tsx",
    "components/composer-attachments.tsx",
    "components/conversation-sidebar.tsx",
    "components/formatted-message-text.tsx",
    "components/streaming-cursor.tsx",
    "components/voice-waveform.tsx",
    "constants/ai.ts",
    "constants/chat-theme.ts",
    "hooks/use-conversations.ts",
    "hooks/use-smooth-streaming-text.ts",
    "hooks/use-voice-input.ts",
    "lib/attachments.ts",
    "lib/auth.ts",
    "lib/enforce-build-version.ts",
    "lib/build-chat-api-messages.ts",
    "lib/chat-scroll.ts",
    "lib/conversation-title.ts",
    "lib/strip-attachments-for-storage.ts",
    "services/chat-api.ts",
    "services/conversation-storage.ts",
    "services/title-api.ts",
    "types/chat.ts",
    "scripts/start-phone.ps1",
    "scripts/start-phone.cmd",
    "scripts/start-phone-lan.ps1",
    "scripts/start-phone-lan.cmd",
    "scripts/start-phone-ngrok.ps1",
    "scripts/start-phone-ngrok.cmd",
    "scripts/force-phone-reload.cmd",
    "scripts/quick-phone-update.ps1",
    "scripts/quick-phone-update.cmd",
    "scripts/update-local.ps1",
    "scripts/update-local.cmd"
)

function Download-File {
    param(
        [string]$RelativePath
    )

    $Url = "$Base/$RelativePath"
    $Destination = Join-Path $Root ($RelativePath -replace "/", [IO.Path]::DirectorySeparatorChar)
    $Directory = Split-Path $Destination -Parent

    if (-not (Test-Path $Directory)) {
        New-Item -ItemType Directory -Path $Directory -Force | Out-Null
    }

    try {
        Invoke-WebRequest -Uri $Url -OutFile $Destination -UseBasicParsing -TimeoutSec 60
    } catch {
        throw "Download failed for $RelativePath`nURL: $Url`nError: $($_.Exception.Message)"
    }

    if (-not (Test-Path $Destination)) {
        throw "File missing after download: $RelativePath"
    }

    $size = (Get-Item $Destination).Length
    if ($size -lt 10) {
        throw "Download looks empty for $RelativePath (only $size bytes). Check your internet connection."
    }
}

Write-Host ""
Write-Host "============================================"
Write-Host " Soulmate AI - Update from GitHub"
Write-Host "============================================"
Write-Host "Folder: $Root"
Write-Host ""

$failed = $false
foreach ($RelativePath in $Files) {
    try {
        Download-File -RelativePath $RelativePath
        Write-Host "OK: $RelativePath"
    } catch {
        $failed = $true
        Write-Host "FAIL: $RelativePath"
        Write-Host $_.Exception.Message
    }
}

if ($failed) {
    throw "One or more files failed to download. Fix the errors above and run again."
}

$ThemeFile = Join-Path $Root "constants\chat-theme.ts"
$ComposerFile = Join-Path $Root "components\chat-composer.tsx"
$ConversationStorageFile = Join-Path $Root "services\conversation-storage.ts"

$ThemeText = Get-Content $ThemeFile -Raw
if ($ThemeText -notmatch "export const UI_VERSION") {
    throw "constants/chat-theme.ts download looks wrong (no UI_VERSION found)."
}

$versionMatch = [regex]::Match($ThemeText, "UI_VERSION\s*=\s*'([^']+)'")
$uiVersion = if ($versionMatch.Success) { $versionMatch.Groups[1].Value } else { "unknown" }

if ($ThemeText -notmatch "threadContentMaxWidth:\s*768") {
    throw "constants/chat-theme.ts is missing the balanced layout settings."
}

$StorageText = Get-Content $ConversationStorageFile -Raw
if ($StorageText -notmatch "stripConversationsForStorage") {
    throw "services/conversation-storage.ts is still old after download."
}

$ComposerText = Get-Content $ComposerFile -Raw
if ($ComposerText -notmatch "handleAttachPress") {
    throw "components/chat-composer.tsx is still old after download."
}

$AuthFile = Join-Path $Root "lib\auth.ts"
$AuthText = Get-Content $AuthFile -Raw
if ($AuthText -notmatch "openBrowserAsync") {
    throw "lib/auth.ts is still old after download."
}

Write-Host ""
Write-Host "SUCCESS. Files updated."
Write-Host "UI version: $uiVersion"
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Run: npm install"
Write-Host "  2. Run: npx expo start --clear"
Write-Host "  3. Open: http://localhost:8081/chat"
Write-Host "  4. Look for UI $uiVersion under Soulmate AI in the left sidebar"
Write-Host ""
Write-Host "To open on your phone with Expo Go (same Wi-Fi as this PC):"
Write-Host "  1. Run: scripts\start-phone.cmd"
Write-Host "  2. Scan the QR code with Expo Go (Android) or Camera (iPhone)"
Write-Host ""
Write-Host "Different Wi-Fi? Install ngrok from https://ngrok.com/download then run:"
Write-Host "  scripts\start-phone-ngrok.cmd"
Write-Host ""
