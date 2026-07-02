@echo off
cd /d "%~dp0.."

echo Updating Soulmate AI from GitHub master...

if not exist "app\api" mkdir "app\api"
if not exist "lib" mkdir "lib"
if not exist "constants" mkdir "constants"
if not exist "components" mkdir "components"
if not exist "hooks" mkdir "hooks"
if not exist "services" mkdir "services"

set BASE=https://raw.githubusercontent.com/elji222/data_analysis_with_python_and_pandas/master/soulmate-ai

curl -L -o "app\(tabs)\_layout.tsx" "%BASE%/app/(tabs)/_layout.tsx"
curl -L -o "app\(tabs)\chat.tsx" "%BASE%/app/(tabs)/chat.tsx"
curl -L -o "app\api\chat+api.ts" "%BASE%/app/api/chat%%2Bapi.ts"
curl -L -o "app\api\title+api.ts" "%BASE%/app/api/title%%2Bapi.ts"
curl -L -o "components\chat-bubble.tsx" "%BASE%/components/chat-bubble.tsx"
curl -L -o "components\chat-composer.tsx" "%BASE%/components/chat-composer.tsx"
curl -L -o "components\chat-panel.tsx" "%BASE%/components/chat-panel.tsx"
curl -L -o "components\conversation-sidebar.tsx" "%BASE%/components/conversation-sidebar.tsx"
curl -L -o "components\formatted-message-text.tsx" "%BASE%/components/formatted-message-text.tsx"
curl -L -o "constants\ai.ts" "%BASE%/constants/ai.ts"
curl -L -o "constants\chat-theme.ts" "%BASE%/constants/chat-theme.ts"
curl -L -o "hooks\use-conversations.ts" "%BASE%/hooks/use-conversations.ts"
curl -L -o "lib\conversation-title.ts" "%BASE%/lib/conversation-title.ts"
curl -L -o "services\chat-api.ts" "%BASE%/services/chat-api.ts"
curl -L -o "services\conversation-storage.ts" "%BASE%/services/conversation-storage.ts"
curl -L -o "services\title-api.ts" "%BASE%/services/title-api.ts"

echo.
echo Done. Now run: npx expo start --clear
pause
