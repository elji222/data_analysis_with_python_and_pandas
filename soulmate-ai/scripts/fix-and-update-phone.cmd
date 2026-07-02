@echo off
cd /d "%~dp0.."

echo.
echo ============================================
echo  Soulmate AI - Fix and update for phone
echo ============================================
echo.

echo Step 1: Downloading the latest update script from GitHub...
powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/elji222/data_analysis_with_python_and_pandas/master/soulmate-ai/scripts/quick-phone-update.ps1' -OutFile 'scripts\quick-phone-update.ps1' -UseBasicParsing"
if errorlevel 1 (
  echo.
  echo Could not download the update script. Check your internet.
  pause
  exit /b 1
)

echo Step 2: Running the update...
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\quick-phone-update.ps1"
if errorlevel 1 (
  echo.
  echo Update failed. Read the error above.
  pause
  exit /b 1
)

echo.
echo Step 3: Starting for phone browser...
call "scripts\start-phone-web.cmd"
pause
