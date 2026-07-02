@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-phone-ngrok.ps1"
if errorlevel 1 (
  echo.
  echo Could not start Expo with ngrok.
  pause
  exit /b 1
)
