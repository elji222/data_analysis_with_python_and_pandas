@echo off
cd /d "%~dp0.."

echo.
echo ============================================
echo  Soulmate AI - EMERGENCY FIX
echo ============================================
echo.
echo This fixes the red "Duplicate declaration" error.
echo.

echo Step 1: Downloading latest fix script...
powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/elji222/data_analysis_with_python_and_pandas/master/soulmate-ai/scripts/quick-phone-update.ps1' -OutFile 'scripts\quick-phone-update.ps1' -UseBasicParsing"
if errorlevel 1 (
  echo Download failed. Check your internet.
  pause
  exit /b 1
)

echo Step 2: Updating files and removing broken file...
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\quick-phone-update.ps1"
if errorlevel 1 (
  echo.
  echo Update failed. Read the error above.
  pause
  exit /b 1
)

echo Step 3: Starting server...
call "scripts\start-phone-web.cmd"
pause
