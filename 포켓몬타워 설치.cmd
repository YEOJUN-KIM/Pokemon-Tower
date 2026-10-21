@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
if errorlevel 1 goto :failed
set "TOWER_SETUP_NODE="
set "TOWER_SETUP_NPM="
set "TOWER_SETUP_PNPM="
set "TOWER_SETUP_NODE_VERSION="
set "TOWER_SETUP_PNPM_VERSION="
set "TOWER_SETUP_NPM_PREFIX="
set "TOWER_SETUP_PNPM_REQUIRED=11.19.0"

echo ========================================
echo  Pokémon Tower 설치
echo ========================================
echo.
echo [1/4] Node.js와 npm 확인...
for /f "delims=" %%N in ('where node.exe 2^>nul') do if not defined TOWER_SETUP_NODE set "TOWER_SETUP_NODE=%%N"
if not defined TOWER_SETUP_NODE goto :node_missing
for /f "delims=" %%V in ('""%TOWER_SETUP_NODE%" -p "process.versions.node""') do set "TOWER_SETUP_NODE_VERSION=%%V"
"%TOWER_SETUP_NODE%" -e "process.exit(Number(process.versions.node.split('.')[0]) >= 24 ? 0 : 1)"
if errorlevel 1 goto :node_old
echo Node.js v%TOWER_SETUP_NODE_VERSION% 확인 완료
for /f "delims=" %%N in ('where npm.cmd 2^>nul') do if not defined TOWER_SETUP_NPM set "TOWER_SETUP_NPM=%%N"
if not defined TOWER_SETUP_NPM goto :npm_missing
call "%TOWER_SETUP_NPM%" --version
if errorlevel 1 goto :npm_missing

echo.
echo [2/4] pnpm 확인...
for /f "delims=" %%P in ('where pnpm.cmd 2^>nul') do if not defined TOWER_SETUP_PNPM set "TOWER_SETUP_PNPM=%%P"
for /f "delims=" %%P in ('where pnpm.exe 2^>nul') do if not defined TOWER_SETUP_PNPM set "TOWER_SETUP_PNPM=%%P"
if not defined TOWER_SETUP_PNPM goto :install_pnpm
for /f "delims=" %%V in ('call "%TOWER_SETUP_PNPM%" --version 2^>nul') do set "TOWER_SETUP_PNPM_VERSION=%%V"
if "%TOWER_SETUP_PNPM_VERSION%"=="%TOWER_SETUP_PNPM_REQUIRED%" goto :install_dependencies

:install_pnpm
echo pnpm %TOWER_SETUP_PNPM_REQUIRED%을 준비합니다...
call "%TOWER_SETUP_NPM%" install --global pnpm@%TOWER_SETUP_PNPM_REQUIRED%
if errorlevel 1 goto :pnpm_failed
rem The npm global bin directory may not be in this window's PATH yet.
for /f "delims=" %%P in ('call "%TOWER_SETUP_NPM%" prefix --global') do set "TOWER_SETUP_NPM_PREFIX=%%P"
if not defined TOWER_SETUP_NPM_PREFIX goto :pnpm_failed
set "TOWER_SETUP_PNPM=%TOWER_SETUP_NPM_PREFIX%\pnpm.cmd"
if not exist "%TOWER_SETUP_PNPM%" goto :pnpm_failed
set "TOWER_SETUP_PNPM_VERSION="
for /f "delims=" %%V in ('call "%TOWER_SETUP_PNPM%" --version 2^>nul') do set "TOWER_SETUP_PNPM_VERSION=%%V"
if not "%TOWER_SETUP_PNPM_VERSION%"=="%TOWER_SETUP_PNPM_REQUIRED%" goto :pnpm_failed

:install_dependencies
echo pnpm %TOWER_SETUP_PNPM_REQUIRED% 확인 완료
echo.
echo [3/4] 프로젝트 의존성 설치...
call "%TOWER_SETUP_PNPM%" install --frozen-lockfile
if errorlevel 1 goto :dependencies_failed
echo.
echo [4/4] Pokémon Tower 설치가 완료되었습니다.
echo 다음부터는 '포켓몬타워 로컬 실행.cmd'만 실행하면 됩니다.
echo 이제 Pokémon Tower를 실행합니다.
call "%~dp0포켓몬타워 로컬 실행.cmd"
exit /b %errorlevel%

:node_missing
echo Node.js 24 이상이 필요합니다.
echo Node.js를 설치한 뒤 이 파일을 다시 실행해 주세요.
echo https://nodejs.org/
goto :failed

:node_old
echo 현재 Node.js 버전: v%TOWER_SETUP_NODE_VERSION%
echo 현재 Node.js 버전은 지원되지 않습니다.
echo Node.js 24 이상으로 업데이트한 뒤 다시 실행해 주세요.
goto :failed

:npm_missing
echo npm을 찾을 수 없습니다.
echo Node.js 공식 설치 프로그램으로 Node.js를 다시 설치해 주세요.
goto :failed

:pnpm_failed
echo pnpm %TOWER_SETUP_PNPM_REQUIRED% 준비에 실패했습니다.
echo 위 오류 내용을 확인해 주세요.
goto :failed

:dependencies_failed
echo 프로젝트 의존성 설치에 실패했습니다.
echo 위 오류 내용을 확인해 주세요.

:failed
pause
exit /b 1
