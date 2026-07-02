@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0update-local.ps1"
if errorlevel 1 (
  echo.
  echo Update failed.
  pause
  exit /b 1
)
pause
