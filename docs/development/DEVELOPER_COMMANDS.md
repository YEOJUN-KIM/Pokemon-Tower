# 개발자 명령어

이 문서는 source tree에서 작업하는 개발자용이다. 일반 플레이어는 [Windows 실행 안내](../operations/SETUP.md)의 PokemonTower.exe를 사용한다. Node.js 24 이상과 pnpm 11.19.0(packageManager 고정)을 사용한다.

## 처음 clone한 PC

```sh
pnpm install --frozen-lockfile
python -m pip install Pillow==12.3.0
pnpm assets:setup
pnpm assets:verify
```

Python 3.10 이상과 정확한 Pillow 12.3.0은 PokéRogue 원본→runtime 변환에 필요하다. 이미 완성된 자산이나 일반 플레이어용 완성 패키지는 변환 도구를 요구하지 않는다. `PYTHON` 환경변수 또는 `assets:setup --python <실행파일>`로 경로를 지정할 수 있다.

`assets:setup`은 PokéRogue → Showdown Pokémon → PokeAPI → trainers → gimmicks → items 순서로 복원한다. 완성된 그룹은 해시 확인 후 skip하므로 캐시가 없어도 다시 다운로드하지 않는다. 미완성/손상 그룹은 기존 독립 recipe의 안전 정책을 그대로 따른다. 캐시가 완전하면 `pnpm assets:setup --offline`을 사용할 수 있다. 기존 provider별 명령은 부분 복구용으로 유지한다.

## 개발 실행

Windows 사용자용 완성 ZIP은 자산 복원 후 `pnpm player:package`로 만든다. production build·launcher 컴파일·배포 파일 수집·README·ZIP·무결성 검증을 포함한다. `pnpm player:package:verify`는 현재 버전의 폴더/ZIP을 다시 검사한다. 출력은 `dist/PokemonTower-Windows-v<package.json version>/` 및 `.zip`, `.zip.sha256`이며 기존 출력은 덮어쓰지 않는다. 일반 사용자에게는 이 ZIP만 전달하고 Git/pnpm/Python 설치를 요구하지 않는다. [beta.5 배포 절차](../releases/WINDOWS_BETA_5.md) 참조.

`pnpm player:package:test`는 생성된 실제 EXE를 `artifacts/windows-release`의 별도 home에서 실행한다. 첫 설치·빠른 재실행·임시 회원가입/256P·중복 실행·EXE 강제 종료·stale lock 복구·beta.4 marker에서 갱신/저장 보존을 확인한다. 포트 3000이 이미 사용 중이면 기존 게임을 건드리지 않고 실패한다. `TOWER_RELEASE_DIRECTORY`로 압축 해제한 배포 폴더를 선택할 수 있다. `TOWER_TEST_EXE`는 `node --test tests/windows-player-process.test.mjs`가 검사할 EXE를 지정한다.

```sh
pnpm dev
```

개발 소스와 `.data`/`.env.local`은 개인 개발 환경이다. 플레이어 EXE는 이 개발 서버를 사용하지 않으며, 별도의 저장 경로를 사용한다.

## 빌드와 배포

```sh
pnpm build
node scripts/package-deploy.mjs --check
node scripts/package-deploy.mjs
```

빌드부터 새로 수행하려면 `pnpm deploy:package` 한 번으로 build→package를 실행한다. 이미 build를 했다면 Node packaging 명령을 사용해 중복 build를 피한다. `dist/tower-날짜/`가 standalone 배포 묶음이다. Windows packaging은 PokemonTower.exe도 빌드해 포함하고 Linux/Docker packaging은 서버만 포함한다. 원본 소스에서 실행할 EXE만 만들려면 Windows에서 `pnpm launcher:build`를 실행한다. 생성 EXE와 ICO는 Git 제외다.

EXE는 초기 실행 도구가 필요하다. 현재 Node는 첫 설치에 사전 설치해야 하며, 최초 설치가 끝나면 선택한 Node 실행 파일을 사용자 설치 위치에 보관한다. Python/Pillow는 source 설치 시 필요한 경우에만 검사·안내한다. 완성된 Windows 배포 묶음의 첫 실행은 의존성 설치/변환/build를 생략하고 동봉 자산 검증→사용자 위치 복사→marker→production 실행으로 이어진다. Node까지 포함하는 완전 self-contained 배포는 후속 범위다.

## 테스트와 점검

| 목적 | 명령 |
|---|---|
| 외부 자산 전체 SHA 확인 | pnpm assets:verify |
| TypeScript | pnpm typecheck |
| unit/battle | pnpm test |
| Windows CMD wrappers | node --test tests/windows-setup.test.mjs |
| Windows EXE 프로세스 트리 (launcher:build 후) | node --test tests/windows-player-process.test.mjs |
| player/aggregate 단위 회귀 | node --import tsx --test tests/player-launcher.test.ts |
| E2E (production build 후, 별도 검증 DB) | pnpm test:e2e |
| CSS 구조 | pnpm check:css |
| 문서/파일 구조 | pnpm check:workspace |
| 패키지 실제 서버/배틀/재시작 | pnpm deploy:verify |
| 설치 marker 빠른 확인 | pnpm player:check |
| 명시적 플레이어 파일 검사 | node scripts/player-launcher.mjs --verify |
| 플레이어 다시 준비 | node scripts/player-launcher.mjs --repair |

실행기 QA는 `--home <별도 폴더>`로 저장·marker·로그를 개인 폴더와 분리한다. `--headless --no-browser --stop-after-health`는 실제 EXE 엔진을 무인 검증하고 health 확인 후 종료한다. 자동화에서 브라우저 열기를 생략했다면 보고서에서 실제 브라우저 렌더링과 구분한다.

## DB 백업

```sh
node --env-file=.env.local scripts/backup-db.mjs
```

현재 스크립트의 기본 backup 위치/저장 선택은 [백업 안내](../operations/BACKUPS.md)를 따른다. 플레이어 DB는 기본 `%LOCALAPPDATA%/PokemonTower/saves/tower.sqlite`이며 개발 `.data`를 자동 복사하거나 병합하지 않는다. 설치/복구는 saves 폴더를 삭제하지 않는다.

## release 버전

`scripts/player/config.json`의 appVersion/assetVersion/buildVersion/launcherVersion을 release와 함께 갱신한다. 기존 marker와 다르면 다시 준비하며, 자동 업데이트 서버는 없다. package version만 바꾸고 player config를 그대로 두지 않는다. 현재 marker schema는 1이다. 파일별 상세 흐름은 [플레이어 설치 구조](../operations/WINDOWS_PLAYER.md)에 있다.
