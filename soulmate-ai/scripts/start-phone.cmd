@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-phone.ps1"
if errorlevel 1 (
  echo.
  echo Could not start Expo for your phone.
  pause
  exit /b 1
)
