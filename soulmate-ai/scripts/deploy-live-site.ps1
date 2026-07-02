$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$EasCli = "eas-cli@latest"

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
            $_ -notmatch '^npm warn' -and $_.Trim() -ne ""
        }

        return @{
            ExitCode = $LASTEXITCODE
            Output = ($lines -join "`n").Trim()
        }
    } finally {
        $ErrorActionPreference = $previousPreference
    }
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
    $result = Invoke-ExternalOutput -Command { npx --yes $EasCli whoami }
    $whoami = ($result.Output -split "`n" | Where-Object { $_.Trim() -ne "" } | Select-Object -Last 1)

    if ($result.ExitCode -eq 0 -and $whoami -and $whoami -notmatch "Not logged in") {
        Write-Host "Logged in to Expo as $whoami"
        return
    }

    Write-Host ""
    Write-Host "You need to log in to Expo (browser will open)."
    Write-Host "Create a free account at https://expo.dev/signup if needed."
    Write-Host ""

    $loginCode = Invoke-External -Command { npx --yes $EasCli login }
    if ($loginCode -ne 0) {
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
        $exitCode = Invoke-External -Command {
            npx --yes $EasCli env:create production `
                --name $name `
                --value $value `
                --visibility $item.Visibility `
                --environment production `
                --non-interactive `
                --force
        }

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

Write-Host "Step 1: Fix eas.json and install dependencies..."
Repair-EasJson

if (-not (Test-Path "node_modules")) {
    $installCode = Invoke-External -Command { npm install }
    if ($installCode -ne 0) {
        throw "npm install failed."
    }
}

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

$deployCode = Invoke-External -Command { npx --yes $EasCli deploy --prod --environment production }
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
