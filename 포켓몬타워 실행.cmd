@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
set "TOWER_LAUNCH_NODE="
for /f "delims=" %%N in ('where node.exe 2^>nul') do if not defined TOWER_LAUNCH_NODE set "TOWER_LAUNCH_NODE=%%N"
if not defined TOWER_LAUNCH_NODE set "TOWER_LAUNCH_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%TOWER_LAUNCH_NODE%" (
  echo Node.js 24 or later is required. Install Node.js and try again.
  pause
  exit /b 1
)
start "" "%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -STA -WindowStyle Hidden -File "%~dp0scripts\launcher-window.ps1" -NodePath "%TOWER_LAUNCH_NODE%"
exit /b 0
