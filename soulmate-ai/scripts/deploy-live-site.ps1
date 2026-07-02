$ErrorActionPreference = "Stop"

$DeployScriptVersion = "2026-07-09"

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

Write-Host "Step 1: Clear cache, fix eas.json, install dependencies..."
Clear-NpmCaches
Repair-EasJson
Install-ProjectDependencies
Ensure-EasInstalled

Write-Host ""
Write-Host "Step 2: Log in to Expo..."
Ensure-EasLogin

Write-Host ""
Write-Host "Step 3: Upload production environment variables..."
Sync-ProductionEnv -EnvVars $envVars

Write-Host ""
Write-Host "Step 4: Build web app..."
$exportCode = Invoke-External -Command { npx expo export --platform web }
if ($exportCode -ne 0) {
    throw "Web export failed."
}

Write-Host ""
Write-Host "Step 5: Deploy to EAS Hosting (production)..."
$easText = Get-Content "eas.json" -Raw
if ($easText -match '"deploy"') {
    throw "eas.json is still invalid. Delete eas.json and run this script again."
}
Write-Host "If this is your first deploy, choose subdomain: soulmate-ai"
Write-Host ""

$deployCode = Invoke-Eas deploy --prod --environment production
if ($deployCode -ne 0) {
    throw "Deploy failed."
}

Write-Host ""
Write-Host "============================================================"
Write-Host " DEPLOYED!"
Write-Host " Open on your phone:"
Write-Host " https://soulmate-ai.expo.app/chat"
Write-Host "============================================================"
Write-Host ""
