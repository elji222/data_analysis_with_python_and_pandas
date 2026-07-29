$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

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

function Invoke-Eas {
    param(
        [Parameter(ValueFromRemainingArguments = $true)]
        [string[]]$EasArgs
    )

    $easBin = Get-EasBin
    if ($easBin -eq "npx") {
        & npx eas @EasArgs
    } else {
        & $easBin @EasArgs
    }

    if ($LASTEXITCODE -ne 0) {
        throw "EAS command failed: eas $($EasArgs -join ' ')"
    }
}

function Ensure-EasLogin {
    if ($env:EXPO_TOKEN) {
        Write-Host "Using EXPO_TOKEN from environment."
        return
    }

    $easBin = Get-EasBin
    if ($easBin -eq "npx") {
        & npx eas whoami 2>$null | Out-Null
    } else {
        & $easBin whoami 2>$null | Out-Null
    }

    if ($LASTEXITCODE -eq 0) {
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
