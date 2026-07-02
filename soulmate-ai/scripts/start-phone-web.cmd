@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-phone-web.ps1"
if errorlevel 1 (
  echo.
  echo Could not start Soulmate AI for your phone browser.
  pause
  exit /b 1
)
