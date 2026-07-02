@echo off
cd /d "%~dp0.."

echo.
echo ============================================================
echo  DEPLOY LIVE SITE (permanent fix for phone)
echo ============================================================
echo.
echo This publishes the latest UI to https://soulmate-ai.expo.app
echo so your phone always gets the new version - no Wi-Fi tricks.
echo.
echo You only need to do this ONCE (or when you want updates).
echo.
echo REQUIREMENTS:
echo   1. Expo account (free) - https://expo.dev/signup
echo   2. Your .env file with Supabase keys filled in
echo.

where npx >nul 2>&1
if errorlevel 1 (
  echo npx not found. Install Node.js first.
  pause
  exit /b 1
)

echo Step 1: Log in to Expo (browser will open)...
call npx eas-cli login
if errorlevel 1 (
  echo Login failed or cancelled.
  pause
  exit /b 1
)

echo.
echo Step 2: Deploying to soulmate-ai.expo.app ...
call npx eas-cli deploy --prod
if errorlevel 1 (
  echo.
  echo Deploy failed. Common fixes:
  echo   - Run: npm install
  echo   - Make sure .env has your Supabase keys
  echo   - Run: npx eas-cli env:create for production vars
  pause
  exit /b 1
)

echo.
echo ============================================================
echo  DONE! On your phone open:
echo  https://soulmate-ai.expo.app/chat
echo ============================================================
echo.
pause
