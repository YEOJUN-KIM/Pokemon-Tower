@echo off
setlocal DisableDelayedExpansion
set "TOWER_SETUP_LOG_DIR=%~dp0.data\setup-logs"
if not exist "%TOWER_SETUP_LOG_DIR%\" mkdir "%TOWER_SETUP_LOG_DIR%" 2>nul
:project_log_name
set "TOWER_SETUP_LOG=%TOWER_SETUP_LOG_DIR%\setup-%RANDOM%-%RANDOM%.log"
if exist "%TOWER_SETUP_LOG%" goto :project_log_name
>"%TOWER_SETUP_LOG%" echo Pokemon Tower Windows Setup
if exist "%TOWER_SETUP_LOG%" goto :log_ready
set "TOWER_SETUP_LOG_DIR=%TEMP%\Pokemon-Tower"
if not exist "%TOWER_SETUP_LOG_DIR%\" mkdir "%TOWER_SETUP_LOG_DIR%" 2>nul
:temp_log_name
set "TOWER_SETUP_LOG=%TOWER_SETUP_LOG_DIR%\setup-%RANDOM%-%RANDOM%.log"
if exist "%TOWER_SETUP_LOG%" goto :temp_log_name
>"%TOWER_SETUP_LOG%" echo Pokemon Tower Windows Setup
if not exist "%TOWER_SETUP_LOG%" goto :no_log
:log_ready
>>"%TOWER_SETUP_LOG%" echo [STEP] bootstrap
>>"%TOWER_SETUP_LOG%" echo Started: %DATE% %TIME%
>>"%TOWER_SETUP_LOG%" echo Working directory: "%CD%"
>>"%TOWER_SETUP_LOG%" echo Script directory: "%~dp0"
>>"%TOWER_SETUP_LOG%" ver
>>"%TOWER_SETUP_LOG%" echo ComSpec: "%ComSpec%"
>>"%TOWER_SETUP_LOG%" echo PATH: omitted for privacy
chcp 65001 >nul
set "TOWER_SETUP_NODE="
for /f "delims=" %%N in ('where node.exe 2^>nul') do if not defined TOWER_SETUP_NODE set "TOWER_SETUP_NODE=%%N"
if not defined TOWER_SETUP_NODE goto :node_missing
echo Pokemon Tower setup is starting...
echo Setup log: "%TOWER_SETUP_LOG%"
"%TOWER_SETUP_NODE%" "%~dp0scripts\setup-windows.mjs" "%TOWER_SETUP_LOG%" 2>"%TOWER_SETUP_LOG%.stderr"
set "TOWER_SETUP_EXIT=%errorlevel%"
type "%TOWER_SETUP_LOG%.stderr" >>"%TOWER_SETUP_LOG%"
del /q "%TOWER_SETUP_LOG%.stderr" 2>nul
if "%TOWER_SETUP_EXIT%"=="0" goto :finished
findstr /c:"SETUP RESULT:" "%TOWER_SETUP_LOG%" >nul
if not errorlevel 1 goto :show_error
>>"%TOWER_SETUP_LOG%" echo SETUP RESULT: FAILED
>>"%TOWER_SETUP_LOG%" echo Stage: bootstrap or Node setup; see preceding diagnostics
>>"%TOWER_SETUP_LOG%" echo Exit code: %TOWER_SETUP_EXIT%
>>"%TOWER_SETUP_LOG%" echo Reason: Node setup did not complete successfully
:show_error
type "%TOWER_SETUP_LOG%"
goto :finished
:node_missing
set "TOWER_SETUP_EXIT=1"
type "%~dp0scripts\setup-node-required.txt" 2>nul
echo Node.js 24 or later is required. https://nodejs.org/
>>"%TOWER_SETUP_LOG%" echo Node path: not found
>>"%TOWER_SETUP_LOG%" echo SETUP RESULT: FAILED
>>"%TOWER_SETUP_LOG%" echo Stage: bootstrap
>>"%TOWER_SETUP_LOG%" echo Exit code: 1
>>"%TOWER_SETUP_LOG%" echo Reason: Node.js not found on PATH
goto :finished
:no_log
echo Unable to create a setup log. Check folder and TEMP permissions.
pause
exit /b 1
:finished
echo.
echo Setup log: "%TOWER_SETUP_LOG%"
echo Please share this log when reporting a problem.
pause
exit /b %TOWER_SETUP_EXIT%
