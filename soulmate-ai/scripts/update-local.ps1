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
    "components/chat-bubble.tsx",
    "components/chat-composer.tsx",
    "components/chat-panel.tsx",
    "components/conversation-sidebar.tsx",
    "components/formatted-message-text.tsx",
    "constants/ai.ts",
    "constants/chat-theme.ts",
    "hooks/use-conversations.ts",
    "lib/conversation-title.ts",
    "services/chat-api.ts",
    "services/conversation-storage.ts",
    "services/title-api.ts"
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

if (-not (Test-Path $ComposerFile)) {
    throw "Missing components/chat-composer.tsx after download."
}

$ThemeText = Get-Content $ThemeFile -Raw
if ($ThemeText -notmatch "UI_VERSION") {
    throw "constants/chat-theme.ts is still old after download."
}

$ChatText = Get-Content $ChatFile -Raw
if ($ChatText -notmatch "ConversationSidebar") {
    throw "app/(tabs)/chat.tsx is still old after download."
}

Write-Host ""
Write-Host "SUCCESS. Files updated."
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Close the browser tab completely"
Write-Host "  2. Run: npx expo start --clear"
Write-Host "  3. Open: http://localhost:8081/chat"
Write-Host "  4. Look for UI 2025-07-02 under Soulmate AI in the left sidebar"
Write-Host ""
