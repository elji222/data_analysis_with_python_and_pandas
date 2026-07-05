@echo off
cd /d "%~dp0"

echo.
echo ============================================================
echo  DOWNLOAD LATEST FILES FROM GITHUB
echo ============================================================
echo.

echo Step 1: Downloading latest update script...
powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/elji222/data_analysis_with_python_and_pandas/master/soulmate-ai/scripts/quick-phone-update.ps1?v=%RANDOM%' -OutFile 'scripts\quick-phone-update.ps1' -UseBasicParsing"
if errorlevel 1 (
  echo.
  echo Could not download the latest update script. Check your internet.
  pause
  exit /b 1
)

echo Step 2: Downloading app files...
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\quick-phone-update.ps1"
if errorlevel 1 (
  echo.
  echo DOWNLOAD FAILED
  pause
  exit /b 1
)

echo.
echo DONE. Now double-click DEPLOY.cmd
pause
