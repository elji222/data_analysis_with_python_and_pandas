@echo off
cd /d "%~dp0.."

echo.
echo ============================================
echo  PC build check
echo ============================================
echo.

findstr UI_VERSION constants\chat-theme.ts
echo.

if exist lib\web-file-picker.ts (
  echo WARNING: lib\web-file-picker.ts still exists - this causes the red error.
  echo Run scripts\emergency-fix.cmd to remove it.
  echo.
)

findstr pickFileViaWebInput lib\attachments.ts >nul
if errorlevel 1 (
  echo WARNING: lib\attachments.ts is old. Run scripts\emergency-fix.cmd
  echo.
)

echo If your PC browser sidebar shows a DIFFERENT UI version,
echo your PC files are out of date. Run scripts\fix-and-update-phone.cmd
echo.
echo On your phone, use ONLY the http://192.168.x.x:8081/chat?v=...
echo link printed by scripts\start-phone-web.cmd
echo.
echo Do NOT open soulmate-ai.expo.app on your phone.
echo.
pause
