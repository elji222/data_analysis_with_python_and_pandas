@echo off
cd /d "%~dp0"

echo.
echo ============================================================
echo  PUSH LIVE - updates code and deploys to soulmate-ai.expo.app
echo ============================================================
echo.
echo After this finishes, open:
echo   https://soulmate-ai.expo.app/chat
echo.
echo You should see: LIVE BUILD 2026-07-11
echo.

call scripts\deploy-live-site.cmd
