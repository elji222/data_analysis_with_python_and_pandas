@echo off
cd /d "%~dp0.."

echo.
echo ============================================================
echo  QUICK DEPLOY - downloads latest code, then deploys
echo ============================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/elji222/data_analysis_with_python_and_pandas/master/soulmate-ai/scripts/deploy-live-site.ps1' -OutFile 'scripts\deploy-live-site.ps1' -UseBasicParsing; Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/elji222/data_analysis_with_python_and_pandas/master/soulmate-ai/scripts/quick-phone-update.ps1' -OutFile 'scripts\quick-phone-update.ps1' -UseBasicParsing"

echo Downloading latest app files from GitHub...
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\quick-phone-update.ps1"
if errorlevel 1 (
  echo Update failed.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$env:SKIP_NPM_INSTALL='1'; $env:SKIP_SOURCE_SYNC='1'; & 'scripts\deploy-live-site.ps1'"

pause
