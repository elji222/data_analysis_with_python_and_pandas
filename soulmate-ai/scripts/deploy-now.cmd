@echo off
cd /d "%~dp0.."

echo.
echo ============================================================
echo  QUICK DEPLOY - skips npm install
echo ============================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/elji222/data_analysis_with_python_and_pandas/master/soulmate-ai/scripts/deploy-live-site.ps1' -OutFile 'scripts\deploy-live-site.ps1' -UseBasicParsing"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$env:SKIP_NPM_INSTALL='1'; & 'scripts\deploy-live-site.ps1'"

pause
