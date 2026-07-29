$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

# EAS prints "new version available" to stderr; PowerShell treats that as a fatal error.
$env:npm_config_update_notifier = "false"

function Import-ExpoTokenFromDotEnv {
    if ($env:EXPO_TOKEN) {
        return
    }

    $envFile = Join-Path $Root ".env"
    if (-not (Test-Path $envFile)) {
        return
    }

    foreach ($line in Get-Content $envFile) {
        $trimmed = $line.Trim()
        if ($trimmed -match '^EXPO_TOKEN=(.+)$') {
            $env:EXPO_TOKEN = $Matches[1].Trim().Trim('"').Trim("'")
            return
        }
    }
}

Import-ExpoTokenFromDotEnv

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host $Message
}

function Ensure-NodeModules {
    if (Test-Path (Join-Path $Root "node_modules\expo")) {
        return
    }

    Write-Step "Installing dependencies..."
    npm install
    if ($LASTEXITCODE -ne 0) {
        throw "npm install failed."
    }
}

function Get-EasBin {
    $local = Join-Path $Root "node_modules\.bin\eas.cmd"
    if (Test-Path $local) {
        return $local
    }

    return "npx"
}

function Get-EasOutput {
    param(
        [Parameter(ValueFromRemainingArguments = $true)]
        [string[]]$EasArgs
    )

    $easBin = Get-EasBin
    $prev = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        if ($easBin -eq "npx") {
            return (& npx eas @EasArgs 2>&1 | Out-String)
        }
        return (& $easBin @EasArgs 2>&1 | Out-String)
    } finally {
        $ErrorActionPreference = $prev
    }
}

function Get-EasAccountName {
    $output = Get-EasOutput whoami
    if ($output -match 'Not logged in') {
        return $null
    }

    foreach ($line in ($output -split "`r?`n")) {
        $line = $line.Trim()
        if (
            $line -and
            $line -notmatch 'eas-cli@' -and
            $line -notmatch 'upgrade' -and
            $line -notmatch 'Proceeding' -and
            $line -notmatch 'To upgrade' -and
            $line -notmatch 'npm install'
        ) {
            return $line
        }
    }

    return $null
}

function Invoke-EasNative {
    param(
        [Parameter(Mandatory = $true)]
        [string]$EasBin,
        [Parameter(ValueFromRemainingArguments = $true)]
        [string[]]$EasArgs
    )

    $prev = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        if ($EasBin -eq "npx") {
            & npx eas @EasArgs
        } else {
            & $EasBin @EasArgs
        }
        return $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $prev
    }
}

function Invoke-Eas {
    param(
        [Parameter(ValueFromRemainingArguments = $true)]
        [string[]]$EasArgs
    )

    $exitCode = Invoke-EasNative -EasBin (Get-EasBin) @EasArgs
    if ($exitCode -ne 0) {
        throw "EAS command failed: eas $($EasArgs -join ' ')"
    }
}

function Test-EasLoggedIn {
    return [bool](Get-EasAccountName)
}

function Ensure-EasLogin {
    if ($env:EXPO_TOKEN) {
        Write-Host "Using EXPO_TOKEN from environment."
        return
    }

    $account = Get-EasAccountName
    if ($account) {
        Write-Host "Logged in to Expo as $account"
        return
    }

    Write-Step "Not logged in to Expo command line yet."
    Write-Host "Run LOGIN-EAS.cmd, or add EXPO_TOKEN to your .env file."
    Write-Host "Create a token: https://expo.dev/settings/access-tokens"
    Write-Host ""

    try {
        Start-Process "https://expo.dev/login"
    } catch {
        # Browser open is best-effort on Windows.
    }

    Invoke-Eas login

    $account = Get-EasAccountName
    if (-not $account) {
        throw "Expo login did not complete. Run LOGIN-EAS.cmd or set EXPO_TOKEN in .env."
    }

    Write-Host "Logged in as $account"
}

function Ensure-ProductionEnvSynced {
    $envFile = Join-Path $Root ".env"
    if (-not (Test-Path $envFile)) {
        Write-Host "Warning: .env not found. EAS will use variables already saved on expo.dev."
        return
    }

    Write-Host "Tip: run DEPLOY.cmd at least once so Expo production env has your Supabase keys."
}
