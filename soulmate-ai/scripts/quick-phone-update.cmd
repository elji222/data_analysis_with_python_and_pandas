@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0quick-phone-update.ps1"
if errorlevel 1 (
  echo.
  echo Quick phone update failed.
  pause
  exit /b 1
)
pause
