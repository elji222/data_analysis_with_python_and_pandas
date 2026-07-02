@echo off
setlocal
cd /d "%~dp0.."

set BASE=https://raw.githubusercontent.com/elji222/data_analysis_with_python_and_pandas/master/soulmate-ai

echo.
echo Quick phone update - downloading latest auth and UI files...
echo.

curl -L -o "constants\chat-theme.ts" "%BASE%/constants/chat-theme.ts"
curl -L -o "lib\auth.ts" "%BASE%/lib/auth.ts"
curl -L -o "app\(auth)\login.tsx" "%BASE%/app/(auth)/login.tsx"
curl -L -o "components\chat-panel.tsx" "%BASE%/components/chat-panel.tsx"
curl -L -o "metro.config.js" "%BASE%/metro.config.js"
curl -L -o "scripts\start-phone.ps1" "%BASE%/scripts/start-phone.ps1"
curl -L -o "scripts\update-local.cmd" "%BASE%/scripts/update-local.cmd"
curl -L -o "scripts\update-local.ps1" "%BASE%/scripts/update-local.ps1"

echo.
echo Done. Now run: scripts\start-phone.cmd
echo.
pause
