@echo off
cd /d "%~dp0.."

echo.
echo ============================================================
echo  SOULMATE AI - ONE COMMAND TO OPEN ON YOUR PHONE
echo ============================================================
echo.

echo Downloading latest files from GitHub...
powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/elji222/data_analysis_with_python_and_pandas/master/soulmate-ai/scripts/quick-phone-update.ps1' -OutFile 'scripts\quick-phone-update.ps1' -UseBasicParsing; Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/elji222/data_analysis_with_python_and_pandas/master/soulmate-ai/scripts/open-on-phone.ps1' -OutFile 'scripts\open-on-phone.ps1' -UseBasicParsing"
if errorlevel 1 (
  echo Download failed. Check your internet connection.
  pause
  exit /b 1
)

echo Updating project files...
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\quick-phone-update.ps1"
if errorlevel 1 (
  echo Update failed. Read the error above.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\open-on-phone.ps1"
pause
