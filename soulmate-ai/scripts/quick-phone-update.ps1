$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$Base = "https://raw.githubusercontent.com/elji222/data_analysis_with_python_and_pandas/master/soulmate-ai"
$CacheBust = "2026-07-29v"

$Files = @(
    "app/_layout.tsx",
    "app/(auth)/login.tsx",
    "app/(tabs)/_layout.tsx",
    "app/(tabs)/chat.tsx",
    "app/(tabs)/memory.tsx",
    "app/(tabs)/matches.tsx",
    "app/(tabs)/invites.tsx",
    "app/(tabs)/settings.tsx",
    "app/api/access+api.ts",
    "app/api/billing/access-mode+api.ts",
    "app/api/admin/usage+api.ts",
    "app/api/billing/checkout+api.ts",
    "app/api/billing/portal+api.ts",
    "app/api/billing/status+api.ts",
    "app/api/billing/webhook+api.ts",
    "app/api/chat+api.ts",
    "app/api/generate-image+api.ts",
    "app/api/memories+api.ts",
    "app/api/matches+api.ts",
    "app.json",
    "app.config.js",
    "package.json",
    "package-lock.json",
    "components/attach-popover.tsx",
    "components/app-error-boundary.tsx",
    "components/artifact-card.tsx",
    "components/artifact-preview-panel.tsx",
    "components/internet-status-banner.tsx",
    "components/chat-bubble.tsx",
    "components/shimmer-text.tsx",
    "components/chat-composer.tsx",
    "components/chat-panel.tsx",
    "components/composer-attachments.tsx",
    "components/conversation-sidebar.tsx",
    "components/logout-button.tsx",
    "components/mobile-chat-header.tsx",
    "components/mobile-quick-suggestions.tsx",
    "components/native-mobile-chat-shell.tsx",
    "components/match-card.tsx",
    "components/match-profile-modal.tsx",
    "components/production-site-warning.tsx",
    "components/stale-bundle-gate.tsx",
    "components/ui/icon-symbol.tsx",
    "components/voice-waveform.tsx",
    "constants/app-urls.ts",
    "constants/chat-theme.ts",
    "constants/ai.ts",
    "contexts/auth-context.tsx",
    "contexts/chat-intent-context.tsx",
    "hooks/use-mobile-chat-layout.ts",
    "hooks/use-conversations.ts",
    "hooks/use-billing.ts",
    "hooks/use-invites.ts",
    "hooks/use-matches.ts",
    "hooks/use-smooth-streaming-text.ts",
    "hooks/use-online-status.ts",
    "hooks/use-user-memories.ts",
    "hooks/use-voice-input.ts",
    "hooks/use-wide-layout.ts",
    "lib/access/admin.ts",
    "lib/access/invite-code.ts",
    "lib/access/pending-invite.ts",
    "lib/access/repository.ts",
    "lib/billing/app-settings.ts",
    "lib/admin/usage-stats.ts",
    "lib/billing/repository.ts",
    "lib/billing/status.ts",
    "lib/billing/stripe.ts",
    "lib/billing/webhook.ts",
    "lib/api-origin.ts",
    "lib/anthropic.ts",
    "lib/attachments.ts",
    "lib/auth.ts",
    "lib/current-date.ts",
    "lib/agent/run-chat-agent.ts",
    "lib/agent/types.ts",
    "lib/image-generation/intent.ts",
    "lib/image-generation/service.ts",
    "lib/tools/datetime.ts",
    "lib/tools/registry.ts",
    "lib/tools/generate-image.ts",
    "lib/tools/types.ts",
    "lib/tools/web-search.ts",
    "lib/enforce-build-version.ts",
    "lib/browser-capabilities.ts",
    "lib/build-version.ts",
    "lib/chat-scroll.ts",
    "lib/confirm.ts",
    "lib/conversations/repository.ts",
    "lib/conversations/sync.ts",
    "lib/matches/match-labels.ts",
    "lib/matches/match-prompts.ts",
    "lib/matches/mock-matches.ts",
    "lib/matches/profile-repository.ts",
    "lib/matches/build-match-card.ts",
    "lib/memory/categories.ts",
    "lib/memory/extract.ts",
    "lib/memory/intent.ts",
    "lib/memory/process.ts",
    "lib/memory/prompt.ts",
    "lib/memory/repository.ts",
    "lib/memory/search.ts",
    "lib/memory/trivial.ts",
    "lib/network-host.ts",
    "lib/parse-artifacts.ts",
    "lib/recover-stale-web-bundle.ts",
    "lib/streaming-text.ts",
    "lib/supabase-server.ts",
    "services/access-api.ts",
    "services/billing-api.ts",
    "services/admin-api.ts",
    "services/chat-api.ts",
    "services/conversation-cloud.ts",
    "services/memory-api.ts",
    "services/matches-api.ts",
    "supabase/migrations/20260706143000_memory_categories_visibility.sql",
    "supabase/migrations/20260711120000_user_subscriptions.sql",
    "supabase/migrations/20260728120000_app_settings.sql",
    "supabase/migrations/20260710120000_invite_access.sql",
    "supabase/migrations/20260709120000_user_profiles.sql",
    "types/access.ts",
    "types/billing.ts",
    "types/admin-usage.ts",
    "types/stripe-api.ts",
    "types/memory.ts",
    "types/preview-artifact.ts",
    "types/match.ts",
    "types/user-profile.ts",
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
    "LOGIN-EAS.cmd",
    "BUILD-ANDROID.cmd",
    "BUILD-IOS.cmd",
    "BUILD-IOS-SUBMIT.cmd",
    "DEPLOY.cmd",
    "scripts/login-eas.ps1",
    "scripts/login-eas.cmd",
    "scripts/build-android.ps1",
    "scripts/build-android.cmd",
    "scripts/verify-android-bundle.ps1",
    "scripts/verify-android-bundle.cmd",
    "scripts/build-ios.ps1",
    "scripts/build-ios.cmd",
    "scripts/build-ios-submit.ps1",
    "scripts/build-ios-submit.cmd",
    "scripts/build-mobile-common.ps1",
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
    $Url = if ($RelativePath -match '^(app\.config\.js|package-lock\.json|scripts/(deploy-live-site|build-mobile-common|login-eas|build-android|verify-android-bundle|build-ios|build-ios-submit)\.(ps1|cmd)|LOGIN-EAS\.cmd|BUILD-.*\.cmd)$') {
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

if ($LayoutText -match "BuildVersionBanner") {
    throw "Download failed. app/_layout.tsx still shows the old version banner."
}

if ($LayoutText -notmatch "document\.title = 'Soulmate AI'") {
    throw "Download failed. app/_layout.tsx is missing the minimal Soulmate AI title."
}

$SidebarFile = Join-Path $Root "components\conversation-sidebar.tsx"
$SidebarText = Get-Content $SidebarFile -Raw

if ($SidebarText -notmatch "LogoutButton") {
    throw "Download failed. conversation-sidebar.tsx is missing the logout option."
}

$LoginFile = Join-Path $Root "app\(auth)\login.tsx"
$LoginText = Get-Content $LoginFile -Raw

if ($LoginText -match "EXPO GO BUILD") {
    throw "Download failed. login.tsx still shows the old build badge."
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

$MemoryText = Get-Content $MemoryTabFile -Raw
if ($MemoryText -notmatch "Saved memories") {
    throw "Download failed. memory.tsx is missing the new Saved memories screen."
}

$TabLayoutFile = Join-Path $Root "app\(tabs)\_layout.tsx"
$TabLayoutText = Get-Content $TabLayoutFile -Raw
if ($TabLayoutText -notmatch "brain.head.profile") {
    throw "Download failed. Memory tab is missing from app/(tabs)/_layout.tsx."
}

$ConversationsHookFile = Join-Path $Root "hooks\use-conversations.ts"
$ConversationsHookText = Get-Content $ConversationsHookFile -Raw
if ($ConversationsHookText -notmatch "syncConversationsFromCloud") {
    throw "Download failed. Cloud chat sync is missing from hooks/use-conversations.ts."
}

$StreamingTextFile = Join-Path $Root "lib\streaming-text.ts"
if (-not (Test-Path $StreamingTextFile)) {
    throw "Download failed. lib/streaming-text.ts is missing."
}

$ChatApiFile = Join-Path $Root "services\chat-api.ts"
$ChatApiText = Get-Content $ChatApiFile -Raw
if ($ChatApiText -match "@/lib/sse-parser") {
    throw "Download failed. services/chat-api.ts still imports the removed lib/sse-parser module. Run GET-LATEST.cmd again."
}

$ChatPanelFile = Join-Path $Root "components\chat-panel.tsx"
$ChatPanelText = Get-Content $ChatPanelFile -Raw
if ($ChatPanelText -notmatch "lib/streaming-text") {
    throw "Download failed. chat-panel.tsx is missing the streaming-text helper import."
}

if ($uiVersion -eq "unknown") {
    throw "Download failed. Could not read UI_VERSION from constants/chat-theme.ts."
}

$DeployScriptFile = Join-Path $Root "scripts\deploy-live-site.ps1"
$DeployScriptText = Get-Content $DeployScriptFile -Raw
if ($DeployScriptText -notmatch 'Remove-EasProductionVariable') {
    throw "Download failed. deploy-live-site.ps1 is missing the Expo env migration fix. Run GET-LATEST.cmd again."
}

$ImageIntentFile = Join-Path $Root "lib\image-generation\intent.ts"
if (-not (Test-Path $ImageIntentFile)) {
    throw "Download failed. lib/image-generation/intent.ts is missing."
}

$GenerateImageApiFile = Join-Path $Root "app\api\generate-image+api.ts"
if (-not (Test-Path $GenerateImageApiFile)) {
    throw "Download failed. app/api/generate-image+api.ts is missing."
}

Write-Host ""
Write-Host "SUCCESS. Phone build $uiVersion is on disk."
Write-Host "Stale web-file-picker.ts removed (if it existed)."
Write-Host ""
Write-Host "On phone you should see:"
Write-Host "  - Clean Soulmate AI header (no blue build pill)"
Write-Host "  - Log out at the bottom of the menu sidebar"
Write-Host "  - Memory tab with Saved memories screen"
Write-Host "  - Chats sync across phone and laptop when signed in"
Write-Host "  - Bottom bar: + button (left), mic, blue voice button (right)"
Write-Host ""
Write-Host "Next: scripts\start-phone-web.cmd"
Write-Host "On phone Safari/Chrome open the http link shown there."
Write-Host ""

exit 0
