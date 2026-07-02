$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$BuildId = "2026-07-08"

function Stop-MetroOnPort {
    param([int]$Port)

    try {
        $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        foreach ($connection in $connections) {
            Stop-Process -Id $connection.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    } catch {
        # Older Windows versions may not have Get-NetTCPConnection.
    }
}

function Clear-FolderQuietly {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return
    }

    try {
        Remove-Item -LiteralPath $Path -Recurse -Force -ErrorAction Stop
        return
    } catch {
        Write-Host "Note: partial cleanup for $Path (continuing anyway)."
    }

    # Windows sometimes fails on deep .expo paths; rmdir is more reliable.
    $previousErrorAction = $ErrorActionPreference
    $ErrorActionPreference = "SilentlyContinue"
    cmd /c "rmdir /s /q `"$Path`"" | Out-Null
    $ErrorActionPreference = $previousErrorAction
}

Write-Host ""
Write-Host "============================================"
Write-Host " Soulmate AI - Open in Expo Go (phone)"
Write-Host "============================================"
Write-Host "Project folder: $Root"
Write-Host "Phone build: $BuildId"
Write-Host ""
Write-Host "IMPORTANT: Phone and PC must be on the SAME Wi-Fi."
Write-Host ""
Write-Host "Before scanning:"
Write-Host "  1. On your phone, open Expo Go"
Write-Host "  2. Remove any old Soulmate AI project from Recents"
Write-Host "  3. Then scan the NEW QR code shown below"
Write-Host ""
Write-Host "After the app opens, you must see: Phone build $BuildId"
Write-Host "If not: shake phone -> Reload, or fully close Expo Go and scan again."
Write-Host ""

Write-Host "Clearing old Metro cache..."
Stop-MetroOnPort -Port 8081
Clear-FolderQuietly -Path ".expo"
Clear-FolderQuietly -Path "node_modules\.cache"

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing npm packages. First time only."
    npm install
    Write-Host ""
}

$env:REACT_NATIVE_PACKAGER_CACHE_KEY = "soulmate-$BuildId"

Write-Host "Starting fresh Expo server..."
Write-Host "Keep this window open while you use the app."
Write-Host ""

npx expo start --lan --clear --reset-cache
