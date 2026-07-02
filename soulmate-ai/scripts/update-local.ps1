$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$Base = "https://raw.githubusercontent.com/elji222/data_analysis_with_python_and_pandas/master/soulmate-ai"

$Files = @(
    "app/(tabs)/index.tsx",
    "app/(tabs)/_layout.tsx",
    "app/(tabs)/chat.tsx",
    "app/_layout.tsx",
    "app/api/chat+api.ts",
    "app/api/title+api.ts",
    "app.json",
    "package.json",
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
    "scripts/start-phone-lan.cmd"
)

Write-Host ""
Write-Host "============================================"
Write-Host " Soulmate AI - Update from GitHub"
Write-Host "============================================"
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
$ComposerFile = Join-Path $Root "components\chat-composer.tsx"
$AttachmentsFile = Join-Path $Root "lib\attachments.ts"
$StripStorageFile = Join-Path $Root "lib\strip-attachments-for-storage.ts"
$ConversationStorageFile = Join-Path $Root "services\conversation-storage.ts"

if (-not (Test-Path $ComposerFile)) {
    throw "Missing components/chat-composer.tsx after download."
}

if (-not (Test-Path $AttachmentsFile)) {
    throw "Missing lib/attachments.ts after download."
}

if (-not (Test-Path $StripStorageFile)) {
    throw "Missing lib/strip-attachments-for-storage.ts after download. GitHub master may still be updating - wait 1 minute and run again."
}

if (-not (Test-Path $ConversationStorageFile)) {
    throw "Missing services/conversation-storage.ts after download."
}

$ThemeText = Get-Content $ThemeFile -Raw
if ($ThemeText -notmatch "2026-07-02") {
    throw "constants/chat-theme.ts is still old after download. Expected UI 2026-07-02."
}

if ($ThemeText -notmatch "threadContentMaxWidth:\s*768") {
    throw "constants/chat-theme.ts is missing the balanced ChatGPT layout (768px column)."
}

$StorageText = Get-Content $ConversationStorageFile -Raw
if ($StorageText -notmatch "stripConversationsForStorage") {
    throw "services/conversation-storage.ts is still old after download."
}

$ComposerText = Get-Content $ComposerFile -Raw
if ($ComposerText -notmatch "handleAttachPress") {
    throw "components/chat-composer.tsx is still old after download."
}

Write-Host ""
Write-Host "SUCCESS. Files updated."
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Run: npm install"
Write-Host "  2. Run: npx expo start --clear"
Write-Host "  3. Open: http://localhost:8081/chat"
Write-Host "  4. Look for UI 2026-07-02 under Soulmate AI in the left sidebar"
Write-Host ""
Write-Host "To open on your phone with Expo Go:"
Write-Host "  1. Run: scripts\start-phone.cmd"
Write-Host "  2. Scan the QR code with Expo Go (Android) or Camera (iPhone)"
Write-Host ""
