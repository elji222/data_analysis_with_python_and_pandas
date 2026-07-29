@echo off
cd /d "%~dp0\.."
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\login-eas.ps1"
if errorlevel 1 (
  echo.
  echo LOGIN FAILED
  pause
  exit /b 1
)
echo.
pause
