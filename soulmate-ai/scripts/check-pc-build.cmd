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
echo your PC files are out of date. Run scripts\open-on-phone.cmd
echo.
echo BEST permanent fix: scripts\deploy-live-site.cmd
echo Then open https://soulmate-ai.expo.app/chat on your phone.
echo.
echo Wi-Fi testing: scripts\open-on-phone.cmd
echo Use the NEW port link it prints (8091-8099). Not old 8081 links.
echo.
pause
