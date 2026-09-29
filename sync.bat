@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo [sync] node not found. Install Node.js first: https://nodejs.org/
  pause
  exit /b 1
)
echo [sync] scanning posts/md/ ...
node "%~dp0scripts\sync.mjs" %*
echo.
echo [sync] done. Look for new posts above.
pause
