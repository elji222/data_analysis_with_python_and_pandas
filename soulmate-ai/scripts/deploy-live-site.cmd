@echo off
cd /d "%~dp0.."

echo.
echo ============================================================
echo  DEPLOY WEB APP TO https://soulmate-ai.expo.app
echo ============================================================
echo.

set CACHE_BUST=2026-07-11g

echo Downloading latest scripts from GitHub...
powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/elji222/data_analysis_with_python_and_pandas/master/soulmate-ai/scripts/quick-phone-update.ps1?%CACHE_BUST%' -OutFile 'scripts\quick-phone-update.ps1' -UseBasicParsing"
if errorlevel 1 (
  echo Download failed. Check your internet.
  pause
  exit /b 1
)

echo Updating project files...
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\quick-phone-update.ps1"
if errorlevel 1 (
  echo Update failed.
  pause
  exit /b 1
)

echo Downloading latest deploy script (must be last)...
powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/elji222/data_analysis_with_python_and_pandas/master/soulmate-ai/scripts/deploy-live-site.ps1?%CACHE_BUST%' -OutFile 'scripts\deploy-live-site.ps1' -UseBasicParsing"
if errorlevel 1 (
  echo Deploy script download failed.
  pause
  exit /b 1
)

set SKIP_SOURCE_SYNC=1
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\deploy-live-site.ps1"
pause
