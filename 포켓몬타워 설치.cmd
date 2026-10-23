@echo off
setlocal DisableDelayedExpansion
chcp 65001 >nul
cd /d "%~dp0"
where node.exe >nul 2>nul
if errorlevel 1 (
  echo Node.js 24 or later is required for this diagnostic CMD. https://nodejs.org/
  pause
  exit /b 1
)
node.exe "%~dp0scripts\setup-windows.mjs" %*
set "TOWER_RESULT=%errorlevel%"
if not "%TOWER_RESULT%"=="0" pause
exit /b %TOWER_RESULT%
