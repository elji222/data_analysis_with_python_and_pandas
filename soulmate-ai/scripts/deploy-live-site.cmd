@echo off
cd /d "%~dp0.."

echo.
echo ============================================================
echo  DEPLOY WEB APP TO soulmate-ai.expo.app
echo ============================================================
echo.

echo Downloading latest scripts from GitHub...
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\download-deploy-scripts.ps1"
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

echo Downloading latest deploy script again...
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\download-deploy-scripts.ps1"
if errorlevel 1 (
  echo Deploy script download failed.
  pause
  exit /b 1
)

set SKIP_SOURCE_SYNC=1
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\deploy-live-site.ps1"
pause
