$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$ExpoPort = 8081
$NgrokApi = "http://127.0.0.1:4040/api/tunnels"

function Stop-NgrokIfRunning {
    Get-Process -Name "ngrok" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
}

function Get-NgrokPublicUrl {
    $response = Invoke-RestMethod -Uri $NgrokApi -TimeoutSec 2
    $tunnel = $response.tunnels | Where-Object { $_.proto -eq "https" } | Select-Object -First 1
    return $tunnel.public_url
}

Write-Host ""
Write-Host "============================================"
Write-Host " Soulmate AI - Expo Go via ngrok tunnel"
Write-Host "============================================"
Write-Host ""
Write-Host "Use this when your phone is NOT on the same Wi-Fi as this PC."
Write-Host ""

if (-not (Get-Command ngrok -ErrorAction SilentlyContinue)) {
    Write-Host "ngrok is not installed."
    Write-Host ""
    Write-Host "Setup (free, one time):"
    Write-Host "  1. Download ngrok: https://ngrok.com/download"
    Write-Host "  2. Sign up at https://ngrok.com"
    Write-Host "  3. Run: ngrok config add-authtoken YOUR_TOKEN"
    Write-Host ""
    Write-Host "Then run this script again."
    Write-Host ""
    Write-Host "Or use scripts\start-phone.cmd if phone and PC share the same Wi-Fi."
    exit 1
}

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing npm packages. First time only."
    npm install
    Write-Host ""
}

Stop-NgrokIfRunning

Write-Host "Starting ngrok tunnel on port $ExpoPort..."
$ngrokProcess = Start-Process -FilePath "ngrok" -ArgumentList "http $ExpoPort --host-header=localhost" -PassThru -WindowStyle Hidden

$publicUrl = $null
for ($attempt = 1; $attempt -le 15; $attempt++) {
    Start-Sleep -Seconds 1
    try {
        $publicUrl = Get-NgrokPublicUrl
        if ($publicUrl) { break }
    } catch {
        # ngrok API not ready yet
    }
}

if (-not $publicUrl) {
    Stop-NgrokIfRunning
    Write-Host ""
    Write-Host "Could not start ngrok tunnel."
    Write-Host "Check: ngrok config add-authtoken YOUR_TOKEN"
    Write-Host "Status: https://status.ngrok.com/"
    exit 1
}

$env:EXPO_PACKAGER_PROXY_URL = $publicUrl

Write-Host ""
Write-Host "Tunnel ready: $publicUrl"
Write-Host ""
Write-Host "Scan the QR code below with Expo Go."
Write-Host "Keep this window open while you use the app."
Write-Host ""

try {
    npx expo start --lan --clear --port $ExpoPort
} finally {
    if ($ngrokProcess -and -not $ngrokProcess.HasExited) {
        Stop-Process -Id $ngrokProcess.Id -Force -ErrorAction SilentlyContinue
    } else {
        Stop-NgrokIfRunning
    }
}
