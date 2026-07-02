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
    "components/attach-menu.tsx",
    "components/chat-bubble.tsx",
    "components/chat-composer.tsx",
    "components/chat-panel.tsx",
    "components/composer-attachments.tsx",
    "components/conversation-sidebar.tsx",
    "components/formatted-message-text.tsx",
    "components/streaming-cursor.tsx",
    "constants/ai.ts",
    "constants/chat-theme.ts",
    "hooks/use-conversations.ts",
    "hooks/use-smooth-streaming-text.ts",
    "hooks/use-voice-input.ts",
    "lib/attachments.ts",
    "lib/build-chat-api-messages.ts",
    "lib/conversation-title.ts",
    "lib/strip-attachments-for-storage.ts",
    "services/chat-api.ts",
    "services/conversation-storage.ts",
    "services/title-api.ts",
    "types/chat.ts"
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
$ChatFile = Join-Path $Root "app\(tabs)\chat.tsx"
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
if ($ThemeText -notmatch "2025-07-06") {
    throw "constants/chat-theme.ts is still old after download. Expected UI 2025-07-06."
}

$StorageText = Get-Content $ConversationStorageFile -Raw
if ($StorageText -notmatch "stripConversationsForStorage") {
    throw "services/conversation-storage.ts is still old after download."
}

$ChatText = Get-Content $ChatFile -Raw
if ($ChatText -notmatch "handleAttachPress") {
    throw "app/(tabs)/chat.tsx or chat-panel is still old after download."
}

Write-Host ""
Write-Host "SUCCESS. Files updated."
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Run: npm install"
Write-Host "  2. Run: npx expo start --clear"
Write-Host "  3. Open: http://localhost:8081/chat"
Write-Host "  4. Look for UI 2025-07-06b under Soulmate AI in the left sidebar"
Write-Host ""
