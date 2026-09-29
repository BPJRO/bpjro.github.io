@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo [timeline] node not found. Install Node.js first: https://nodejs.org/
  pause
  exit /b 1
)
echo [timeline] scanning... answer the prompts below.
node "%~dp0scripts\add-timeline.mjs" %*
echo.
echo [timeline] done.
pause
