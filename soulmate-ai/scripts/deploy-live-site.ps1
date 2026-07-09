$ErrorActionPreference = "Stop"

$DeployScriptVersion = "2026-07-11j"

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$script:EasBin = Join-Path $Root "node_modules\.bin\eas.cmd"

function Invoke-External {
    param(
        [Parameter(Mandatory = $true)]
        [scriptblock]$Command
    )

    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"

    try {
        & $Command
        return $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousPreference
    }
}

function Invoke-ExternalOutput {
    param(
        [Parameter(Mandatory = $true)]
        [scriptblock]$Command
    )

    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"

    try {
        $lines = & $Command 2>&1 | ForEach-Object { "$_" } | Where-Object {
            $_ -notmatch '^npm warn' -and
            $_ -notmatch 'Unexpected end of JSON input' -and
            $_ -notmatch 'SyntaxError' -and
            $_.Trim() -ne ""
        }

        return @{
            ExitCode = $LASTEXITCODE
            Output = ($lines -join "`n").Trim()
        }
    } finally {
        $ErrorActionPreference = $previousPreference
    }
}

function Clear-NpmCaches {
    Write-Host "Clearing broken npx cache only..."

    $npxCache = Join-Path $env:LOCALAPPDATA "npm-cache\_npx"
    if (Test-Path $npxCache) {
        Remove-Item -LiteralPath $npxCache -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "Removed $npxCache"
    }
}

function Test-DependenciesInstalled {
    return (
        (Test-Path (Join-Path $Root "node_modules\expo")) -and
        (Test-Path (Join-Path $Root "node_modules\expo-router"))
    )
}

function Install-EasCliOnly {
    Write-Host "Installing eas-cli only (no full npm install)..."

    $attempts = @(
        { npm install eas-cli --save-dev --ignore-scripts --legacy-peer-deps --no-fund --no-audit },
        { npm install eas-cli --save-dev --legacy-peer-deps --no-fund --no-audit }
    )

    foreach ($attempt in $attempts) {
        $result = Invoke-ExternalOutput -Command $attempt
        if (Test-Path $script:EasBin) {
            return
        }
        if ($result.Output) {
            Write-Host $result.Output
        }
    }

    if (-not (Test-Path $script:EasBin)) {
        throw "Could not install eas-cli. Run: npm install eas-cli --save-dev --ignore-scripts --legacy-peer-deps"
    }
}

function Install-ProjectDependencies {
    if ($env:SKIP_NPM_INSTALL -eq '1') {
        Write-Host "SKIP_NPM_INSTALL is set. Not running npm install."

        if (-not (Test-Path $script:EasBin)) {
            Install-EasCliOnly
        }

        return
    }

    if (Test-DependenciesInstalled) {
        Write-Host "Expo packages already installed. Skipping full npm install."

        if (-not (Test-Path $script:EasBin)) {
            Install-EasCliOnly
        }

        return
    }

    Write-Host "Installing npm packages (first time only, may take a few minutes)..."

    $attempts = @(
        { npm install --no-fund --no-audit --legacy-peer-deps },
        { npm install --no-fund --no-audit --legacy-peer-deps --ignore-scripts }
    )

    foreach ($attempt in $attempts) {
        $result = Invoke-ExternalOutput -Command $attempt

        if (Test-DependenciesInstalled) {
            if (-not (Test-Path $script:EasBin)) {
                Install-EasCliOnly
            }
            return
        }

        if ($result.Output) {
            Write-Host ""
            Write-Host $result.Output
            Write-Host ""
        }
    }

    throw @"
npm install failed.

Your app may still work locally. Try in CMD:
  cd $Root
  npm install eas-cli --save-dev --ignore-scripts --legacy-peer-deps
  scripts\deploy-live-site.cmd
"@
}

function Ensure-EasInstalled {
    if (Test-Path $script:EasBin) {
        return
    }

    Install-ProjectDependencies

    if (-not (Test-Path $script:EasBin)) {
        throw "eas-cli is still missing after npm install."
    }
}

function Invoke-Eas {
    param(
        [Parameter(ValueFromRemainingArguments = $true)]
        [string[]]$EasArgs
    )

    Ensure-EasInstalled
    $exitCode = Invoke-External -Command { & $script:EasBin @EasArgs }
    return $exitCode
}

function Invoke-EasOutput {
    param(
        [Parameter(ValueFromRemainingArguments = $true)]
        [string[]]$EasArgs
    )

    Ensure-EasInstalled
    return Invoke-ExternalOutput -Command { & $script:EasBin @EasArgs }
}

function Read-DotEnv {
    param([string]$Path)

    $vars = @{}

    if (-not (Test-Path $Path)) {
        return $vars
    }

    foreach ($line in Get-Content $Path) {
        if ($line -match '^\s*#' -or $line -match '^\s*$') { continue }
        if ($line -match '^([^=]+)=(.*)$') {
            $rawValue = $Matches[2].Trim()
            if ($rawValue.StartsWith('"') -and $rawValue.EndsWith('"')) {
                $rawValue = $rawValue.Substring(1, $rawValue.Length - 2)
            }
            if ($rawValue.StartsWith("'") -and $rawValue.EndsWith("'")) {
                $rawValue = $rawValue.Substring(1, $rawValue.Length - 2)
            }
            $vars[$Matches[1].Trim()] = $rawValue
        }
    }

    return $vars
}

function Get-UiVersion {
    $themeFile = Join-Path $Root "constants\chat-theme.ts"
    if (-not (Test-Path $themeFile)) {
        return "missing"
    }

    $themeText = Get-Content $themeFile -Raw
    if ($themeText -match "UI_VERSION\s*=\s*'([^']+)'") {
        return $Matches[1]
    }

    return "unknown"
}

function Sync-LatestSource {
    if ($env:SKIP_SOURCE_SYNC -eq '1') {
        Write-Host "Skipping GitHub download (already updated by deploy-live-site.cmd)."
        return
    }

    $updateScript = Join-Path $PSScriptRoot "quick-phone-update.ps1"
    if (-not (Test-Path $updateScript)) {
        throw "Missing scripts/quick-phone-update.ps1"
    }

    $beforeVersion = Get-UiVersion
    if ($beforeVersion -match '^\d{4}-\d{2}-\d{2}$' -and $beforeVersion -ge '2026-07-11') {
        Write-Host "Source already at build $beforeVersion. Skipping GitHub download."
        return
    }

    Write-Host "Downloading latest app files from GitHub..."
    & $updateScript

    $afterVersion = Get-UiVersion
    if ($afterVersion -eq "missing" -or $afterVersion -eq "unknown") {
        throw "Could not verify UI_VERSION after GitHub download."
    }

    Write-Host "Source updated to build $afterVersion"
}

function Invoke-ExpoWebExport {
    param(
        [string]$OutputDir,
        [string]$WorkingDir
    )

    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"

    try {
        Push-Location $WorkingDir
        try {
            $lines = & npx expo export --platform web --output-dir $OutputDir --clear 2>&1 | ForEach-Object { "$_" }
            return @{
                ExitCode = $LASTEXITCODE
                Output = ($lines -join "`n").Trim()
            }
        } finally {
            Pop-Location
        }
    } finally {
        $ErrorActionPreference = $previousPreference
    }
}

function Invoke-EasDeployProduction {
    param([string]$WorkingDir)

    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"

    try {
        Push-Location $WorkingDir
        $lines = & $script:EasBin deploy --prod --environment production --non-interactive --export-dir dist 2>&1 |
            ForEach-Object { "$_" }
        return @{
            ExitCode = $LASTEXITCODE
            Output = ($lines -join "`n").Trim()
        }
    } finally {
        Pop-Location
        $ErrorActionPreference = $previousPreference
    }
}

function Enable-ShortProjectDrive {
    param([string]$DriveLetter = "S")

    $driveRoot = $DriveLetter.TrimEnd(':')
    $drive = $driveRoot + ':'

    cmd /c "subst ${driveRoot}: /d" 2>$null | Out-Null
    cmd /c "subst ${driveRoot}: `"$Root`""
    if ($LASTEXITCODE -ne 0) {
        throw @"
Could not create short drive $drive for your project folder.

Move the project to a simpler path and try again, for example:
  C:\soulmate-ai
"@
    }

    Write-Host "Mapped $drive to your project folder (fixes Windows path limits)."
    return $drive
}

function Disable-ShortProjectDrive {
    param([string]$DriveLetter = "S")

    $driveRoot = $DriveLetter.TrimEnd(':')
    cmd /c "subst ${driveRoot}: /d" 2>$null | Out-Null
}

function Clear-DistFolder {
    param([string]$DistPath)

    if (-not (Test-Path $DistPath)) {
        return
    }

    Write-Host "Moving old dist/ out of the way..."
    $staleName = "dist-old-$(Get-Date -Format 'yyyyMMddHHmmss')"
    $stalePath = Join-Path (Split-Path $DistPath -Parent) $staleName

    try {
        Rename-Item -LiteralPath $DistPath -NewName $staleName -ErrorAction Stop
        Write-Host "Old build moved to $staleName/"
        Write-Host "You can delete $staleName/ later to free disk space."
        return
    } catch {
        Write-Host "Rename failed. Trying Windows rmdir..."
    }

    $rmdirCode = Invoke-External -Command { cmd /c "rmdir /s /q `"$DistPath`"" }
    if ($rmdirCode -eq 0 -and -not (Test-Path $DistPath)) {
        Write-Host "Old dist/ removed."
        return
    }

    throw @"
Could not clear the old dist/ folder.

Close File Explorer windows in soulmate-ai, then delete this folder manually:
  $DistPath

After that, run scripts\deploy-live-site.cmd again.
"@
}

function Test-ExportedBundleVersion {
    param(
        [string]$ExpectedVersion,
        [string]$ExportDir
    )

    $bundle = Get-ChildItem -Path $ExportDir -Recurse -Filter "entry*.js" -ErrorAction SilentlyContinue |
        Select-Object -First 1

    if (-not $bundle) {
        throw "Web export finished but no bundle was found in $ExportDir."
    }

    $content = Get-Content $bundle.FullName -Raw
    if ($content -notmatch [regex]::Escape($ExpectedVersion)) {
        throw @"
The exported bundle is still old (expected build $ExpectedVersion).

Try:
  scripts\deploy-live-site.cmd
"@
    }

    Write-Host "Bundle check passed: export contains build $ExpectedVersion"
}

function Test-ExportStructure {
    param([string]$ExportDir)

    $routesFile = Join-Path $ExportDir "server\_expo\routes.json"
    if (-not (Test-Path $routesFile)) {
        throw "Export is missing server routes at $routesFile"
    }

    Write-Host "Export structure check passed (server routes found)."
}

function Repair-EasJson {
    $easFile = Join-Path $Root "eas.json"
    $validJson = @'
{
  "cli": {
    "version": ">= 16.32.0",
    "appVersionSource": "remote"
  }
}
'@

    $needsRepair = $true

    if (Test-Path $easFile) {
        $current = Get-Content $easFile -Raw
        if ($current -notmatch '"deploy"' -and $current -match '"cli"') {
            $needsRepair = $false
        }
    }

    if ($needsRepair) {
        Write-Host "Fixing eas.json (removed invalid deploy section)..."
        Set-Content -Path $easFile -Value $validJson -Encoding UTF8
    }
}

function Ensure-EasLogin {
    if ($env:EXPO_TOKEN) {
        Write-Host "Using EXPO_TOKEN from environment."
        return
    }

    $result = Invoke-EasOutput whoami
    $whoami = ($result.Output -split "`n" | Where-Object {
        $_.Trim() -ne "" -and
        $_ -notmatch "Not logged in" -and
        $_ -notmatch "SyntaxError"
    } | Select-Object -Last 1)

    if ($result.ExitCode -eq 0 -and $whoami) {
        Write-Host "Logged in to Expo as $whoami"
        return
    }

    Write-Host ""
    Write-Host "You need to log in to Expo (browser will open)."
    Write-Host "Create a free account at https://expo.dev/signup if needed."
    Write-Host "Complete the login in the browser, then return here."
    Write-Host ""

    $loginCode = Invoke-Eas login
    if ($loginCode -ne 0) {
        throw @"
Expo login failed.

Try this manually in CMD:
  cd $Root
  npm install
  npx eas login

If you see spinners.json errors, run:
  npm cache clean --force
  rmdir /s /q "%LOCALAPPDATA%\npm-cache\_npx"
"@
    }

    $verify = Invoke-EasOutput whoami
    if ($verify.ExitCode -ne 0 -or -not $verify.Output) {
        throw "Login command finished but Expo still is not logged in."
    }

    Write-Host "Logged in to Expo as $($verify.Output)"
}

function Invoke-EasWithOutput {
    param(
        [Parameter(ValueFromRemainingArguments = $true)]
        [string[]]$EasArgs
    )

    Ensure-EasInstalled
    return Invoke-ExternalOutput -Command { & $script:EasBin @EasArgs }
}

function Test-AnthropicKey {
    param([string]$Value)

    if (-not $Value) {
        return $false
    }

    if ($Value -match 'your-key-here|your-project-id|sk-ant-your') {
        return $false
    }

    if ($Value.Length -lt 20) {
        return $false
    }

    return $Value.StartsWith('sk-ant-')
}

function Get-EasProjectId {
    $appJsonPath = Join-Path $Root "app.json"
    $content = Get-Content $appJsonPath -Raw

    if ($content -match '"projectId"\s*:\s*"([^"]+)"') {
        return $Matches[1]
    }

    return "8d2d0e08-3c3d-4b39-8771-a0cf812a4325"
}

function Ensure-EasProject {
    $projectId = Get-EasProjectId

    Write-Host "Linking this folder to Expo project $projectId ..."

    $initResult = Invoke-EasWithOutput init --id $projectId --force --non-interactive
    if ($initResult.ExitCode -ne 0) {
        throw "Could not link EAS project.`n$($initResult.Output)"
    }

    $info = Invoke-EasWithOutput project:info
    if ($info.ExitCode -ne 0) {
        throw "EAS project is still not configured.`n$($info.Output)"
    }

    Write-Host "EAS project linked."
}

function Set-EasProductionVariable {
    param(
        [string]$Name,
        [string]$Value,
        [string]$Visibility
    )

    $result = Invoke-EasWithOutput env:create `
        --name $Name `
        --value $Value `
        --visibility $Visibility `
        --environment production `
        --non-interactive `
        --force

    if ($result.ExitCode -eq 0) {
        return
    }

    $details = if ($result.Output) { $result.Output } else { "No details returned." }
    throw "Failed to set $Name on Expo.`n$details"
}

function Get-SupabasePublishableKey {
    param([hashtable]$EnvVars)

    $publishableKey = $EnvVars['EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY']
    $anonKey = $EnvVars['EXPO_PUBLIC_SUPABASE_ANON_KEY']

    if ($publishableKey -and $publishableKey -notmatch 'your-key-here|your-supabase') {
        return $publishableKey
    }

    if ($anonKey -and $anonKey -notmatch 'your-key-here|your-supabase') {
        return $anonKey
    }

    return $null
}

function Sync-ProductionEnv {
    param([hashtable]$EnvVars)

    Ensure-EasProject

    $anthropicKey = $EnvVars['ANTHROPIC_API_KEY']
    if (Test-AnthropicKey $anthropicKey) {
        Write-Host "Syncing production env: ANTHROPIC_API_KEY"
        Set-EasProductionVariable -Name "ANTHROPIC_API_KEY" -Value $anthropicKey -Visibility "secret"
    } else {
        Write-Host ""
        Write-Host "Skipping ANTHROPIC_API_KEY (still the default placeholder in .env)."
        Write-Host "The new phone UI will deploy, but chat AI will not reply until you:"
        Write-Host "  1. Get a key from https://console.anthropic.com"
        Write-Host "  2. Put it in .env as ANTHROPIC_API_KEY=sk-ant-..."
        Write-Host "  3. Run scripts\deploy-live-site.cmd again"
        Write-Host ""
    }

    $tavilyKey = $EnvVars['TAVILY_API_KEY']
    if ($tavilyKey -and $tavilyKey -notmatch 'your-key-here|tvly-your') {
        Write-Host "Syncing production env: TAVILY_API_KEY"
        Set-EasProductionVariable -Name "TAVILY_API_KEY" -Value $tavilyKey -Visibility "secret"
    } else {
        Write-Host ""
        Write-Host "Skipping TAVILY_API_KEY (missing or still the placeholder in .env)."
        Write-Host "Chat will still work, but live web search/news will be unavailable until you:"
        Write-Host "  1. Get a free key from https://tavily.com"
        Write-Host "  2. Put it in .env as TAVILY_API_KEY=tvly-..."
        Write-Host "  3. Run scripts\deploy-live-site.cmd again"
        Write-Host ""
    }

    $supabaseUrl = $EnvVars['EXPO_PUBLIC_SUPABASE_URL']
    $supabaseKey = Get-SupabasePublishableKey -EnvVars $EnvVars

    if (-not $supabaseUrl -or $supabaseUrl -match 'your-project-id') {
        throw "Missing EXPO_PUBLIC_SUPABASE_URL in .env"
    }

    if (-not $supabaseKey) {
        throw @"
Missing Supabase key in .env.

Open .env and add ONE of these lines (from Supabase Dashboard -> Project Settings -> API):
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
or
  EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...

Your EXPO_PUBLIC_SUPABASE_URL line should already be there.
"@
    }

    Write-Host "Syncing production env: EXPO_PUBLIC_SUPABASE_URL"
    Set-EasProductionVariable -Name "EXPO_PUBLIC_SUPABASE_URL" -Value $supabaseUrl -Visibility "plaintext"

    Write-Host "Syncing production env: EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
    Set-EasProductionVariable -Name "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY" -Value $supabaseKey -Visibility "sensitive"

    Write-Host "Syncing production env: EXPO_PUBLIC_SUPABASE_ANON_KEY"
    Set-EasProductionVariable -Name "EXPO_PUBLIC_SUPABASE_ANON_KEY" -Value $supabaseKey -Visibility "sensitive"
}

Write-Host ""
Write-Host "============================================================"
Write-Host " DEPLOY SOULMATE AI WEB TO https://soulmate-ai.expo.app"
Write-Host " Deploy script version $DeployScriptVersion"
Write-Host "============================================================"
Write-Host ""

if (-not (Test-Path "package.json")) {
    throw "Run this from the soulmate-ai folder."
}

if (-not (Test-Path ".env")) {
    throw "Missing .env file. Copy .env.example to .env and fill in your keys."
}

$envVars = Read-DotEnv -Path ".env"

Write-Host "Step 1: Check build on disk..."
Sync-LatestSource
$uiVersion = Get-UiVersion
Write-Host ""
Write-Host ">>> BUILD ON DISK: $uiVersion <<<"
Write-Host ""

if ($uiVersion -eq "missing" -or $uiVersion -eq "unknown") {
    throw "Could not read UI_VERSION. Run scripts\quick-phone-update.cmd first."
}

Write-Host "Step 2: Clear cache, fix eas.json, install dependencies..."
Clear-NpmCaches
Repair-EasJson
Install-ProjectDependencies
Ensure-EasInstalled

Write-Host ""
Write-Host "Step 3: Log in to Expo..."
Ensure-EasLogin

Write-Host ""
Write-Host "Step 4: Upload production environment variables..."
Sync-ProductionEnv -EnvVars $envVars

Write-Host ""
Write-Host "Step 5: Build web app..."
$shortDrive = Enable-ShortProjectDrive
$exportDir = Join-Path $shortDrive "dist"

try {
    Write-Host "Export folder: $exportDir"
    Write-Host ""

    Clear-DistFolder -DistPath $exportDir

    $exportResult = Invoke-ExpoWebExport -OutputDir $exportDir -WorkingDir $shortDrive
    if ($exportResult.Output) {
        Write-Host $exportResult.Output
        Write-Host ""
    }

    $bundle = Get-ChildItem -Path $exportDir -Recurse -Filter "entry*.js" -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if (-not $bundle) {
        $exportDetails = if ($exportResult.Output) {
            "`n`nExport output:`n$($exportResult.Output)"
        } else {
            ""
        }

        throw @"
Web export failed. No bundle was created.$exportDetails

Your project folder is very deep inside Downloads. Either:
  1. Run GET-LATEST.cmd and DEPLOY.cmd again (this script now exports from drive S:)
  2. Or move the whole soulmate-ai folder to a short path, for example:
       C:\soulmate-ai
"@
    }

    if ($exportResult.ExitCode -ne 0) {
        Write-Host "Export reported a warning, but bundle was created. Continuing..."
    }

    Test-ExportedBundleVersion -ExpectedVersion $uiVersion -ExportDir $exportDir
    Test-ExportStructure -ExportDir $exportDir

    Write-Host ""
    Write-Host "Step 6: Deploy to EAS Hosting (production)..."
    $easText = Get-Content "eas.json" -Raw
    if ($easText -match '"deploy"') {
        throw "eas.json is still invalid. Delete eas.json and run this script again."
    }
    Write-Host "Uploading build $uiVersion to production..."
    Write-Host ""

    $deployResult = Invoke-EasDeployProduction -WorkingDir $shortDrive

    if ($deployResult.Output) {
        Write-Host $deployResult.Output
        Write-Host ""
    }

    if ($deployResult.ExitCode -ne 0) {
        throw @"
Deploy failed. See the error details above.

You can also try manually in CMD:
  cd /d $Root
  npx eas deploy --prod --environment production --export-dir dist
"@
    }
}
finally {
    Disable-ShortProjectDrive -DriveLetter $shortDrive
}

Write-Host ""
Write-Host "============================================================"
Write-Host " DEPLOYED!"
Write-Host " Open on your phone:"
Write-Host " https://soulmate-ai.expo.app/chat"
Write-Host ""
Write-Host " You MUST see: LIVE BUILD $uiVersion"
Write-Host " If you still see an older build, deploy did not finish."
Write-Host " Run scripts\deploy-live-site.cmd again."
Write-Host "============================================================"
Write-Host ""
