$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Get-LanIpAddress {
    try {
        $ip = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
            Where-Object {
                $_.IPAddress -match '^192\.168\.' -or
                $_.IPAddress -match '^10\.' -or
                $_.IPAddress -match '^172\.(1[6-9]|2[0-9]|3[0-1])\.'
            } |
            Select-Object -First 1 -ExpandProperty IPAddress

        if ($ip) { return $ip }
    } catch { }

    $ipconfig = ipconfig 2>$null
    if ($ipconfig -match '(?:IPv4|IP Address)[^\d]*(\d+\.\d+\.\d+\.\d+)') {
        return $Matches[1]
    }

    return $null
}

function Test-PortFree {
    param([int]$Port)

    try {
        $inUse = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        return -not $inUse
    } catch {
        return $true
    }
}

function Stop-MetroOnPort {
    param([int]$Port)

    try {
        $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        foreach ($connection in $connections) {
            Stop-Process -Id $connection.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    } catch { }
}

function Clear-FolderQuietly {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) { return }

    try {
        Remove-Item -LiteralPath $Path -Recurse -Force -ErrorAction Stop
    } catch {
        cmd /c "rmdir /s /q `"$Path`"" 2>$null | Out-Null
    }
}

function Pick-PhonePort {
    $candidates = 8091..8099 | Sort-Object { Get-Random }
    foreach ($port in $candidates) {
        if (Test-PortFree -Port $port) {
            return $port
        }
    }

    throw "Could not find a free port between 8091 and 8099. Close other Expo windows and try again."
}

$ThemeFile = Join-Path $Root "constants\chat-theme.ts"
if (-not (Test-Path $ThemeFile)) {
    throw "Missing constants/chat-theme.ts. Run from the soulmate-ai folder."
}

$ThemeText = Get-Content $ThemeFile -Raw
$versionMatch = [regex]::Match($ThemeText, "UI_VERSION\s*=\s*'([^']+)'")
$BuildId = if ($versionMatch.Success) { $versionMatch.Groups[1].Value } else { "unknown" }

$ComposerFile = Join-Path $Root "components\chat-composer.tsx"
$ComposerText = Get-Content $ComposerFile -Raw
if ($ComposerText -notmatch "voiceModeButton") {
    throw "Your PC files are OLD (no phone mic button). Run scripts\emergency-fix.cmd first."
}

$LayoutFile = Join-Path $Root "app\_layout.tsx"
$LayoutText = Get-Content $LayoutFile -Raw
if ($LayoutText -notmatch "StaleBundleGate") {
    throw "Your PC files are OLD (no cache fix). Run scripts\emergency-fix.cmd first."
}

Write-Host ""
Write-Host "============================================================"
Write-Host " SOULMATE AI - OPEN ON PHONE"
Write-Host " Build $BuildId"
Write-Host "============================================================"
Write-Host ""

Stop-MetroOnPort -Port 8081
Clear-FolderQuietly -Path "node_modules\.cache"
Clear-FolderQuietly -Path ".expo"

if (-not (Test-Path "node_modules")) {
    npm install
}

$PhonePort = Pick-PhonePort
$lanIp = Get-LanIpAddress
$sessionId = Get-Date -Format "HHmmss"

$pcUrl = "http://localhost:${PhonePort}/chat?v=${BuildId}&s=${sessionId}"
$phoneUrl = if ($lanIp) { "http://${lanIp}:${PhonePort}/chat?v=${BuildId}&s=${sessionId}" } else { $null }

$env:REACT_NATIVE_PACKAGER_CACHE_KEY = "soulmate-$BuildId-$sessionId"
$env:EXPO_NO_CACHE = "1"

Write-Host "Using port $PhonePort (a NEW port so your phone won't use old cache)."
Write-Host ""
Write-Host "STEP 1 - On your PC browser, open this link FIRST:"
Write-Host " $pcUrl"
Write-Host ""
Write-Host " You must see: PHONE BUILD $BuildId (blue pill at top)"
Write-Host " and + / mic buttons at the bottom."
Write-Host ""

if ($phoneUrl) {
    Write-Host "STEP 2 - On your PHONE Chrome, open this NEW link:"
    Write-Host " $phoneUrl"
    Write-Host ""
    Write-Host " Do NOT reuse an old bookmark or old 8081 link."
    Write-Host " This link uses port $PhonePort on purpose."
} else {
    Write-Host "STEP 2 - Could not detect Wi-Fi IP."
    Write-Host " Run ipconfig, find IPv4 Address, then open:"
    Write-Host " http://YOUR-IP:${PhonePort}/chat?v=${BuildId}&s=${sessionId}"
}

Write-Host ""
Write-Host "Keep this window open while you use the app."
Write-Host "============================================================"
Write-Host ""

npx expo start --lan --port $PhonePort --clear --reset-cache
