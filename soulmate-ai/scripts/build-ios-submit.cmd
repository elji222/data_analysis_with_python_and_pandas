@echo off
cd /d "%~dp0\.."
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\build-ios-submit.ps1"
if errorlevel 1 (
  echo.
  echo SUBMIT FAILED
  pause
  exit /b 1
)
echo.
pause
