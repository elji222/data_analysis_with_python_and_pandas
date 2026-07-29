@echo off
cd /d "%~dp0.."
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0verify-android-bundle.ps1"
if errorlevel 1 (
  echo.
  echo Android bundle check failed.
  pause
  exit /b 1
)
