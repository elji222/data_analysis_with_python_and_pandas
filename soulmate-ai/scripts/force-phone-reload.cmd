@echo off
echo.
echo Force refresh for Expo Go on your phone...
echo.
call "%~dp0update-local.cmd"
if errorlevel 1 exit /b 1
echo.
call "%~dp0start-phone.cmd"
