@echo off
setlocal EnableExtensions

cd /d "%~dp0.."
echo.
echo ============================================
echo  Soulmate AI - Update from GitHub
echo ============================================
echo  Folder: %CD%
echo.

set BASE=https://raw.githubusercontent.com/elji222/data_analysis_with_python_and_pandas/master/soulmate-ai

if not exist "app" mkdir "app"
if not exist "app\(tabs)" mkdir "app\(tabs)"
if not exist "app\api" mkdir "app\api"
if not exist "lib" mkdir "lib"
if not exist "constants" mkdir "constants"
if not exist "components" mkdir "components"
if not exist "hooks" mkdir "hooks"
if not exist "services" mkdir "services"

call :download "app\(tabs)\index.tsx" "%BASE%/app/%%28tabs%%29/index.tsx"
call :download "app\(tabs)\_layout.tsx" "%BASE%/app/%%28tabs%%29/_layout.tsx"
call :download "app\(tabs)\chat.tsx" "%BASE%/app/%%28tabs%%29/chat.tsx"
call :download "app\_layout.tsx" "%BASE%/app/_layout.tsx"
call :download "app\api\chat+api.ts" "%BASE%/app/api/chat%%2Bapi.ts"
call :download "app\api\title+api.ts" "%BASE%/app/api/title%%2Bapi.ts"
call :download "components\chat-bubble.tsx" "%BASE%/components/chat-bubble.tsx"
call :download "components\chat-composer.tsx" "%BASE%/components/chat-composer.tsx"
call :download "components\chat-panel.tsx" "%BASE%/components/chat-panel.tsx"
call :download "components\conversation-sidebar.tsx" "%BASE%/components/conversation-sidebar.tsx"
call :download "components\formatted-message-text.tsx" "%BASE%/components/formatted-message-text.tsx"
call :download "constants\ai.ts" "%BASE%/constants/ai.ts"
call :download "constants\chat-theme.ts" "%BASE%/constants/chat-theme.ts"
call :download "hooks\use-conversations.ts" "%BASE%/hooks/use-conversations.ts"
call :download "lib\conversation-title.ts" "%BASE%/lib/conversation-title.ts"
call :download "services\chat-api.ts" "%BASE%/services/chat-api.ts"
call :download "services\conversation-storage.ts" "%BASE%/services/conversation-storage.ts"
call :download "services\title-api.ts" "%BASE%/services/title-api.ts"

echo.
echo Checking key files...
if not exist "components\chat-composer.tsx" (
  echo ERROR: chat-composer.tsx is missing. Download failed.
  goto :fail
)
if not exist "constants\chat-theme.ts" (
  echo ERROR: chat-theme.ts is missing. Download failed.
  goto :fail
)

findstr /C:"UI_VERSION" constants\chat-theme.ts >nul
if errorlevel 1 (
  echo ERROR: chat-theme.ts is old. Download failed.
  goto :fail
)

findstr /C:"ConversationSidebar" app\(tabs)\chat.tsx >nul
if errorlevel 1 (
  echo ERROR: chat.tsx is old. Download failed.
  goto :fail
)

echo.
echo SUCCESS. Files updated.
echo.
echo Next steps:
echo   1. Close the browser tab completely
echo   2. Run: npx expo start --clear
echo   3. Press w, then open: http://localhost:8081/chat
echo   4. Look for "UI 2025-06-30" under Soulmate AI in the left sidebar
echo.
pause
exit /b 0

:download
curl -fsSL -o "%~1" "%~2"
if errorlevel 1 (
  echo FAILED: %~1
) else (
  echo OK: %~1
)
exit /b 0

:fail
echo.
echo Update did not complete. Check your internet connection and try again.
pause
exit /b 1
