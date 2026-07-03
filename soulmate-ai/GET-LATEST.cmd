@echo off
cd /d "%~dp0"

echo.
echo ============================================================
echo  DOWNLOAD LATEST FILES FROM GITHUB
echo ============================================================
echo.

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
