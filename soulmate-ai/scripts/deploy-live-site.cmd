@echo off
cd /d "%~dp0.."

echo.
echo ============================================================
echo  DEPLOY SOULMATE AI TO soulmate-ai.expo.app
echo ============================================================
echo.

echo Step A - download latest update script...
powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/elji222/data_analysis_with_python_and_pandas/master/soulmate-ai/scripts/quick-phone-update.ps1?v=%RANDOM%' -OutFile 'scripts\quick-phone-update.ps1' -UseBasicParsing"
if errorlevel 1 goto failed

echo Step B - download latest files from GitHub...
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\quick-phone-update.ps1"
if errorlevel 1 goto failed

echo.
echo Step C - deploy to production...
set SKIP_SOURCE_SYNC=1
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\deploy-live-site.ps1"
if errorlevel 1 goto failed

goto done

:failed
echo.
echo DEPLOY FAILED - see error above.
pause
exit /b 1

:done
pause
