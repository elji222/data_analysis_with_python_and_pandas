@echo off
cd /d "%~dp0.."

echo.
echo ============================================================
echo  QUICK DEPLOY - downloads latest code, then deploys
echo ============================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\download-deploy-scripts.ps1"
if errorlevel 1 (
  echo Could not download deploy scripts.
  echo.
  echo Run this once in CMD to fix:
  echo   powershell -Command "Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/elji222/data_analysis_with_python_and_pandas/master/soulmate-ai/scripts/download-deploy-scripts.ps1?v=11h' -OutFile 'scripts\download-deploy-scripts.ps1'"
  pause
  exit /b 1
)

echo Downloading latest app files from GitHub...
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\quick-phone-update.ps1"
if errorlevel 1 (
  echo Update failed.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\download-deploy-scripts.ps1"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$env:SKIP_NPM_INSTALL='1'; $env:SKIP_SOURCE_SYNC='1'; & 'scripts\deploy-live-site.ps1'"

pause
