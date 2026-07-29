$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

# EAS prints "new version available" to stderr; PowerShell treats that as a fatal error.
$env:npm_config_update_notifier = "false"

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
    $exitCode = Invoke-EasNative -EasBin (Get-EasBin) whoami
    return $exitCode -eq 0
}

function Ensure-EasLogin {
    if ($env:EXPO_TOKEN) {
        Write-Host "Using EXPO_TOKEN from environment."
        return
    }

    if (Test-EasLoggedIn) {
        return
    }

    Write-Step "Log in to Expo (browser will open)..."
    Invoke-Eas login
}

function Ensure-ProductionEnvSynced {
    $envFile = Join-Path $Root ".env"
    if (-not (Test-Path $envFile)) {
        Write-Host "Warning: .env not found. EAS will use variables already saved on expo.dev."
        return
    }

    Write-Host "Tip: run DEPLOY.cmd at least once so Expo production env has your Supabase keys."
}
