@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
set "TOWER_LAUNCH_NODE="
for /f "delims=" %%N in ('where node.exe 2^>nul') do if not defined TOWER_LAUNCH_NODE set "TOWER_LAUNCH_NODE=%%N"
if not defined TOWER_LAUNCH_NODE (
  echo Node.js 24 or later is required. Install Node.js, add it to PATH, and try again.
  pause
  exit /b 1
)
"%TOWER_LAUNCH_NODE%" "%~dp0scripts\launch-local.mjs" %*
if errorlevel 1 pause
