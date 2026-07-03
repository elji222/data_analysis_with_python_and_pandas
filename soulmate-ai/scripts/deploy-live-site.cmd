@echo off
cd /d "%~dp0.."

echo.
echo ============================================================
echo  DEPLOY SOULMATE AI TO soulmate-ai.expo.app
echo ============================================================
echo.

echo Step A - download latest files from GitHub...
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\quick-phone-update.ps1"
if errorlevel 1 goto failed

echo.
echo Step B - deploy to production...
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
