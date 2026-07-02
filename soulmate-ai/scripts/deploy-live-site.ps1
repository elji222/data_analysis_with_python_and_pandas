$ErrorActionPreference = "Stop"

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
    Write-Host "Clearing corrupted npm/npx cache..."

    $npxCache = Join-Path $env:LOCALAPPDATA "npm-cache\_npx"
    if (Test-Path $npxCache) {
        Remove-Item -LiteralPath $npxCache -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "Removed $npxCache"
    }

    Invoke-External -Command { npm cache clean --force } | Out-Null
}

function Ensure-EasInstalled {
    if (-not (Test-Path $script:EasBin)) {
        Write-Host "Installing eas-cli locally (avoids broken npx cache)..."
        $installCode = Invoke-External -Command { npm install }
        if ($installCode -ne 0) {
            throw "npm install failed."
        }
    }

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
            $vars[$Matches[1].Trim()] = $Matches[2].Trim()
        }
    }

    return $vars
}

function Repair-EasJson {
    $easFile = Join-Path $Root "eas.json"
    $validJson = @'
{
  "cli": {
    "version": ">= 16.0.0",
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

function Sync-ProductionEnv {
    param([hashtable]$EnvVars)

    $required = @(
        @{ Name = "ANTHROPIC_API_KEY"; Visibility = "secret" },
        @{ Name = "EXPO_PUBLIC_SUPABASE_URL"; Visibility = "plaintext" },
        @{ Name = "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY"; Visibility = "sensitive" }
    )

    foreach ($item in $required) {
        $name = $item.Name
        $value = $EnvVars[$name]

        if (-not $value -or $value -match 'your-key-here|your-project-id') {
            throw "Missing or placeholder value for $name in .env"
        }

        Write-Host "Syncing production env: $name"
        $exitCode = Invoke-Eas env:create production `
            --name $name `
            --value $value `
            --visibility $item.Visibility `
            --environment production `
            --non-interactive `
            --force

        if ($exitCode -ne 0) {
            throw "Failed to set EAS production variable: $name"
        }
    }
}

Write-Host ""
Write-Host "============================================================"
Write-Host " DEPLOY SOULMATE AI WEB TO https://soulmate-ai.expo.app"
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

$installCode = Invoke-External -Command { npm install }
if ($installCode -ne 0) {
    throw "npm install failed."
}

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
