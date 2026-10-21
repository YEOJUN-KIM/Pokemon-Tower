@echo off
chcp 65001 >nul
setlocal DisableDelayedExpansion
set "TOWER_SETUP_STAGE=프로젝트 폴더 확인"
set "TOWER_SETUP_EXIT=1"
cd /d "%~dp0"
if errorlevel 1 goto :failed
set "TOWER_SETUP_NODE="
set "TOWER_SETUP_NPM="
set "TOWER_SETUP_NPX="
set "TOWER_SETUP_NODE_VERSION="

echo ========================================
echo  Pokémon Tower 설치
echo ========================================
echo.
set "TOWER_SETUP_STAGE=Node.js와 설치 도구 확인"
echo [1/3] Node.js와 설치 도구 확인...
for /f "delims=" %%N in ('where node.exe 2^>nul') do if not defined TOWER_SETUP_NODE set "TOWER_SETUP_NODE=%%N"
if not defined TOWER_SETUP_NODE goto :node_missing
for /f "delims=" %%V in ('""%TOWER_SETUP_NODE%" -p "process.versions.node""') do set "TOWER_SETUP_NODE_VERSION=%%V"
"%TOWER_SETUP_NODE%" -e "process.exit(Number(process.versions.node.split('.')[0]) >= 24 ? 0 : 1)"
set "TOWER_SETUP_EXIT=%errorlevel%"
if not "%TOWER_SETUP_EXIT%"=="0" goto :node_old
echo Node.js v%TOWER_SETUP_NODE_VERSION% 확인 완료
set "TOWER_SETUP_EXIT=1"
for /f "delims=" %%N in ('where npm.cmd 2^>nul') do if not defined TOWER_SETUP_NPM set "TOWER_SETUP_NPM=%%N"
if not defined TOWER_SETUP_NPM goto :npm_missing
call "%TOWER_SETUP_NPM%" --version >nul
set "TOWER_SETUP_EXIT=%errorlevel%"
if not "%TOWER_SETUP_EXIT%"=="0" goto :npm_missing
set "TOWER_SETUP_EXIT=1"
for /f "delims=" %%N in ('where npx.cmd 2^>nul') do if not defined TOWER_SETUP_NPX set "TOWER_SETUP_NPX=%%N"
if not defined TOWER_SETUP_NPX goto :npx_missing
call "%TOWER_SETUP_NPX%" --version >nul
set "TOWER_SETUP_EXIT=%errorlevel%"
if not "%TOWER_SETUP_EXIT%"=="0" goto :npx_missing

echo.
set "TOWER_SETUP_STAGE=프로젝트 파일 설치"
echo [2/3] 프로젝트 파일 설치...
call "%TOWER_SETUP_NPX%" --yes pnpm@11.19.0 install --frozen-lockfile
set "TOWER_SETUP_EXIT=%errorlevel%"
if not "%TOWER_SETUP_EXIT%"=="0" goto :failed
echo.
echo Pokémon Tower 설치가 완료되었습니다.
echo 다음부터는 '포켓몬타워 로컬 실행.cmd'만 실행하면 됩니다.
echo.
set "TOWER_SETUP_STAGE=게임 실행"
echo [3/3] 이제 Pokémon Tower를 실행합니다.
call "%~dp0포켓몬타워 로컬 실행.cmd"
set "TOWER_SETUP_EXIT=%errorlevel%"
if not "%TOWER_SETUP_EXIT%"=="0" goto :launch_failed
exit /b 0

:node_missing
echo Node.js 24 이상이 필요합니다.
echo Node.js를 설치한 뒤 '포켓몬타워 설치.cmd'를 다시 실행해 주세요.
echo https://nodejs.org/
goto :failed

:node_old
echo 현재 Node.js 버전: v%TOWER_SETUP_NODE_VERSION%
echo 현재 Node.js 버전은 지원되지 않습니다.
echo Node.js 24 이상으로 업데이트한 뒤 다시 실행해 주세요.
goto :failed

:npm_missing
echo npm을 찾을 수 없거나 실행할 수 없습니다.
echo Node.js 공식 설치 프로그램으로 Node.js를 다시 설치해 주세요.
goto :failed

:npx_missing
echo npx를 찾을 수 없거나 실행할 수 없습니다.
echo Node.js 공식 설치 프로그램으로 Node.js를 다시 설치해 주세요.
goto :failed

:failed
echo.
echo 프로젝트 설치에 실패했습니다.
goto :error_details

:launch_failed
echo.
echo 게임 실행에 실패했습니다.

:error_details
echo 실패 단계: %TOWER_SETUP_STAGE%
echo 오류 코드: %TOWER_SETUP_EXIT%
echo 위 오류 내용을 확인해 주세요.
echo 창을 닫기 전에 오류 메시지를 복사하거나 캡처해 주세요.
pause
exit /b %TOWER_SETUP_EXIT%
