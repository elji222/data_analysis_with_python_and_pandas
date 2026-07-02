$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

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

function Ensure-EasLogin {
    $whoami = npx eas-cli whoami 2>$null
    if ($LASTEXITCODE -eq 0 -and $whoami) {
        Write-Host "Logged in to Expo as $whoami"
        return
    }

    Write-Host ""
    Write-Host "You need to log in to Expo (browser will open)."
    Write-Host "Create a free account at https://expo.dev/signup if needed."
    Write-Host ""
    npx eas-cli login
    if ($LASTEXITCODE -ne 0) {
        throw "Expo login failed or was cancelled."
    }
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
        npx eas-cli env:create production `
            --name $name `
            --value $value `
            --visibility $item.Visibility `
            --environment production `
            --non-interactive `
            --force | Out-Host

        if ($LASTEXITCODE -ne 0) {
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

Write-Host "Step 1: Install dependencies..."
if (-not (Test-Path "node_modules")) {
    npm install
}

Write-Host ""
Write-Host "Step 2: Log in to Expo..."
Ensure-EasLogin

Write-Host ""
Write-Host "Step 3: Upload production environment variables..."
Sync-ProductionEnv -EnvVars $envVars

Write-Host ""
Write-Host "Step 4: Build web app..."
npx expo export --platform web
if ($LASTEXITCODE -ne 0) {
    throw "Web export failed."
}

Write-Host ""
Write-Host "Step 5: Deploy to EAS Hosting (production)..."
Write-Host "If this is your first deploy, choose subdomain: soulmate-ai"
Write-Host ""
npx eas-cli deploy --prod --environment production
if ($LASTEXITCODE -ne 0) {
    throw "Deploy failed."
}

Write-Host ""
Write-Host "============================================================"
Write-Host " DEPLOYED!"
Write-Host " Open on your phone:"
Write-Host " https://soulmate-ai.expo.app/chat"
Write-Host "============================================================"
Write-Host ""
