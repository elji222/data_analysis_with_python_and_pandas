@echo off
echo.
echo Downloading latest update script from GitHub...
curl -L -o "%~dp0update-local.ps1" "https://raw.githubusercontent.com/elji222/data_analysis_with_python_and_pandas/master/soulmate-ai/scripts/update-local.ps1"
if errorlevel 1 (
  echo.
  echo Could not download update script. Check your internet connection.
  pause
  exit /b 1
)
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0update-local.ps1"
if errorlevel 1 (
  echo.
  echo Update failed. Read the red error message above.
  pause
  exit /b 1
)
pause
