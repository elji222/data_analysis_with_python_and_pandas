$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$BuildId = "2026-07-11"

function Get-LanIpAddress {
    try {
        $ip = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
            Where-Object {
                $_.IPAddress -match '^192\.168\.' -or
                $_.IPAddress -match '^10\.' -or
                $_.IPAddress -match '^172\.(1[6-9]|2[0-9]|3[0-1])\.'
            } |
            Select-Object -First 1 -ExpandProperty IPAddress

        if ($ip) {
            return $ip
        }
    } catch {
        # Fall back to ipconfig below.
    }

    $ipconfig = ipconfig 2>$null
    if ($ipconfig -match '(?:IPv4|IP Address)[^\d]*(\d+\.\d+\.\d+\.\d+)') {
        return $Matches[1]
    }

    return $null
}

function Stop-MetroOnPort {
    param([int]$Port)

    try {
        $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        foreach ($connection in $connections) {
            Stop-Process -Id $connection.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    } catch {
        # Ignore on older Windows versions.
    }
}

function Clear-FolderQuietly {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return
    }

    try {
        Remove-Item -LiteralPath $Path -Recurse -Force -ErrorAction Stop
    } catch {
        Write-Host "Note: partial cleanup for $Path (continuing anyway)."
        cmd /c "rmdir /s /q `"$Path`"" 2>$null | Out-Null
    }
}

Write-Host ""
Write-Host "============================================"
Write-Host " Soulmate AI - Open on phone browser"
Write-Host "============================================"
Write-Host "Project folder: $Root"
Write-Host "Build: $BuildId"
Write-Host ""
Write-Host "This uses the SAME web app as your PC."
Write-Host "You do NOT need Expo Go."
Write-Host ""
Write-Host "Phone and PC must be on the SAME Wi-Fi."
Write-Host ""

$ThemeFile = Join-Path $Root "constants\chat-theme.ts"
$ThemeText = Get-Content $ThemeFile -Raw
if ($ThemeText -notmatch $BuildId) {
    throw "This folder is still on an old build. Run scripts\quick-phone-update.cmd first."
}

Write-Host "PC files confirmed: build $BuildId"
Write-Host ""
Write-Host "Clearing old Metro cache..."
Stop-MetroOnPort -Port 8081
Clear-FolderQuietly -Path "node_modules\.cache"

if (-not (Test-Path "node_modules")) {
    npm install
}

$env:REACT_NATIVE_PACKAGER_CACHE_KEY = "soulmate-$BuildId"

$lanIp = Get-LanIpAddress
if ($lanIp) {
    Write-Host ""
    Write-Host "============================================"
    Write-Host " ON YOUR PHONE, open Safari or Chrome:"
    Write-Host " http://${lanIp}:8081/chat"
    Write-Host "============================================"
    Write-Host ""
    Write-Host "Bookmark that address on your phone."
    Write-Host "Keep this window open while you use the app."
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "Could not detect your PC Wi-Fi IP automatically."
    Write-Host "After Expo starts, run ipconfig and look for IPv4 Address."
    Write-Host "Then open http://YOUR-IP:8081/chat on your phone."
    Write-Host ""
}

npx expo start --lan --clear --reset-cache
