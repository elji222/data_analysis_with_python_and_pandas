@echo off
echo.
echo Downloading latest quick-phone-update script...
curl -L -o "%~dp0quick-phone-update.ps1" "https://raw.githubusercontent.com/elji222/data_analysis_with_python_and_pandas/master/soulmate-ai/scripts/quick-phone-update.ps1"
if errorlevel 1 (
  echo.
  echo Could not download update script.
  pause
  exit /b 1
)
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0quick-phone-update.ps1"
if errorlevel 1 (
  echo.
  echo Quick phone update failed.
  pause
  exit /b 1
)
pause
