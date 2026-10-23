# Windows standalone 플레이어 구조

기준: 2026-10-24. source 개발, Windows 플레이어, 서버/Docker 배포를 분리한다. 게임 UI/DB schema는 변경하지 않는다.

## 진입점과 두 설치 경로

`PokemonTower.exe`는 .NET Framework WinForms 얇은 실행기다. C# source는 scripts/player-launcher.cs, 빌드는 scripts/build-player-launcher.ps1이다. 프로젝트 제작 branding PNG를 보존하고 16/32/48/64/128/256 크기의 ICO를 build 중 artifacts에 생성한다. EXE/ICO는 build 산출물이며 Git에 넣지 않는다.

C#은 Node를 찾고 버전을 검사한 뒤 콘솔 없는 자식으로 scripts/player-launcher.mjs를 실행한다. Node 엔진은 설치 판단·로그·복원/패키징·서버/health/브라우저를 담당한다. 첫 설치에는 진행 단계를 보여주고, 준비 이후에는 작은 시작 창을 숨긴 뒤 알림 영역에서 종료할 수 있다. 사용자가 실행하는 파일은 하나지만 주변 scripts/게임 파일을 EXE 안에 모두 내장한 형식은 아니다.

- 소스 폴더 최초 실행: 실행 도구 검사 → pinned pnpm 의존성 설치 → 필요한 자산 통합 복원 → 전체 verify → production build → 기존 package-deploy로 사용자 package 생성 → Node 실행 파일 보관 → marker 마지막 생성 → production 서버 → health → 브라우저.
- 완성된 Windows 배포 묶음 최초 실행: 동봉된 외부 자산 전체 verify → 사용자 package 위치로 복사 → Node 실행 파일 보관 → marker → production 서버 → health → 브라우저. 이 경우 Python/Pillow/pnpm/build가 필요 없다.
- 이후 실행: marker와 버전, server.js/BUILD_ID/시작 스크립트, asset root와 대표 파일 6개, Node 파일, saves 쓰기 가능 여부만 확인 → production 서버. 의존성 설치·전체 SHA·build·package를 반복하지 않는다.

Python은 PokéRogue 변환이 필요할 때만 3.10+/Pillow 12.3.0을 검사하며 누락 시 안내한다. Node 자체가 없는 최초 PC에는 설치 안내가 나온다. Node/Python까지 포함하는 self-contained installer는 이번 구현이 아니다.

## 설치·저장·로그

기본 home은 `%LOCALAPPDATA%/PokemonTower`다.

| 경로 | 용도 |
|---|---|
| .install-complete.json | 성공한 설치만 게시한 marker |
| packages/tower-UUID/ | 재사용하는 immutable standalone package |
| runtime/node.exe | 성공한 설치 때 보관한 Node 실행 파일 |
| saves/tower.sqlite | 플레이어 저장 DB |
| logs/setup-*.log | 최초 설치·복구 단계/세부 오류 |
| logs/launcher-*.log | 실행, health, 브라우저, 서버 exit |
| logs/bootstrap-*.log | EXE 초기 도구 검사 |
| .launcher.lock | 같은 home의 중복 실행 방지 |

설치 실패 시 marker를 새로 게시하지 않는다. 기존 marker가 잘못됐거나 복구를 시작하면 previous-UUID 이름으로 보존한다. 이전 package와 saves를 자동 삭제하지 않는다. marker는 schemaVersion, launcherVersion, appVersion, assetVersion, buildVersion, installedAt, package 상대 경로, node 상대 경로를 포함한다. 상대 경로는 home 밖으로 나갈 수 없다.

개발 `.data`·`.env.local`을 플레이어 저장으로 재사용하지 않는다. production 자식 환경에 HOSTNAME=127.0.0.1, PORT=3000, TOWER_ORIGIN, TOWER_DB_PATH를 명시하고 NODE_OPTIONS를 제거한다. logs는 token/password 등 민감한 환경 값과 URL 자격증명을 redact한다.

## 패키징과 실행

Next `output: standalone`과 기존 의존성 junction 복구 로직을 유지한다. package-deploy는 신규 `--output <새 디렉터리>`를 받아 설치기가 지정한 immutable package를 생성할 수 있다. 기존 디렉터리는 덮어쓰지 않고 source/data 경로를 출력으로 사용하지 않는다. public/.next/static, 서버, 필요한 의존성, 크레딧, 검사용 recipe/golden, player 엔진을 포함한다. Windows는 package 안에 새 EXE를 컴파일하므로 현재 실행 중인 source EXE를 덮어쓰지 않는다.

실행은 항상 `node scripts/start-deploy.mjs` → 패키지 `server.js`다. source의 Next CLI, next dev, next start는 플레이어 실행 경로에 없다. 포트가 이미 사용 중이면 다른 서비스와 구분할 수 없으므로 명확히 실패한다. 준비되지 않은 서비스의 브라우저를 열지 않는다. 다른 포트로 임의 이동하지 않는다.

## 진단과 복구

- 설치 CMD: 같은 player 엔진의 --repair 경로를 호출하는 진단용 fallback.
- 로컬 실행 CMD: 같은 production player 엔진의 일반 경로. 개발 서버가 아니다.
- 개발 서버: 별도로 pnpm dev.
- `PokemonTower.exe --verify`: 설치된 package의 전체 외부 SHA 확인.
- `PokemonTower.exe --repair`: 원래 배포/소스 폴더에서 새 package 준비. 기존 saves 보존.
- `--check`: 전체 SHA 없이 marker/필수 파일 검사. 누락/손상/버전 변경 시 nonzero.
- `--home <별도 경로>`: QA용 설치/저장 격리.

일반 실행의 대표 파일 검사는 임의의 모든 부분 손상을 발견한다는 의미가 아니다. 대표 파일 외 손상은 명시적 verify로 확인하고 원래 온전한 배포 묶음에서 repair한다. 원래 배포 묶음 자체가 손상됐으면 다시 받아야 한다. 파일 검사/복구 UI 버튼과 자동 업데이트 서버는 추가하지 않았다.

## 검증 기록

2026-10-24 Windows 실제 검증. 개인 개발 DB 대신 `.local-backups` 아래 독립 설치 위치만 사용했다. 실행 로그는 `artifacts/player-integration`과 각 QA home의 logs에 보존한다.

| 검증 | 결과 |
|---|---|
| 개발자 clean 환경 | node_modules/cache/runtime/.next/dist/.data 없이 시작, frozen install → Pillow 12.3.0 → assets setup/verify → production build → package 성공 |
| 전체 외부 자산 | 8,578개 복원·검증, 6개 aggregate 모두 OK. 완성된 배포 묶음은 cache/Python 없이 offline setup에서 모두 skip |
| 소스 EXE 최초 실행 | 실제 컴파일한 EXE의 headless 모드로 다운로드·검증·build·package·marker·production health 성공 |
| 완성된 배포 EXE 최초 실행 | Python 없는 조건에서 verify·사용자 package 복사·marker·health 성공. 한글/공백/`&`/괄호 설치 경로도 성공 |
| 두 번째 실행 | marker 내용과 setup 로그 수 불변. install/full hash/build/package 없이 health 성공 |
| 개발 환경 독립 | QA 소스의 node_modules/.next를 일시 격리하고 PATH에서 Node를 제외해도 보관된 Node/package로 실행. 개발 DB/origin 환경변수를 전달해도 플레이어 저장 위치 유지 |
| 종료와 브라우저 | health 이후 Windows 브라우저 실행 요청 확인. 명시적 stop은 서버를 종료하고 launcher exit 0 |
| 오류 | marker 없음/손상, server.js/대표 자산 누락, 포트 충돌, DB 읽기 전용, Node 없음/구버전, Python 없음, 실제 의존성 다운로드 실패 확인. 실패 설치에 완료 marker 없음 |
| 타입/문서/패키징 검사 | typecheck, workspace check, diff check, package-deploy --check 통과 |
| 플레이어/CMD 단위 테스트 | 10/10 통과. 종료 회귀 테스트 포함 |
| 관련 회귀 테스트 | 자산 복원/ownership/플레이어/타워 관련 31/31 통과(종료 회귀 추가 전). 최종 ownership/플레이어/타워 재검사 12/12 통과 |
| 전체 단위 테스트 | 1,522개 중 1,521개 통과. 기존 tower 보상 테스트에서 338≠225 한 번 실패; 해당 파일 별도 재실행 통과. 게임 보상 코드는 변경하지 않음 |
| E2E | 자산 ownership/HTTP와 move visuals 19/19 통과 |
| production 배포 검증 | 페이지·정적 파일·폰트·인증/cookie/origin·배틀·재시작·백업/복원·이벤트 중복 처리 통과 |

clean build 중 중첩 QA 폴더가 tracing root에 포함되는 문제가 발견되어 Next의 outputFileTracingRoot와 Turbopack root를 프로젝트 자체 경로로 고정했다. 실패 시 marker가 생성되지 않았으며 수정 후 build/EXE 재시도가 성공했다. production 검증 스크립트의 오래된 익명 인증/schema/상점 가격 fixture도 현재 소스 기준으로 정정했다.

WinForms 창/트레이의 외관은 자동 시각 검사를 수행하지 않았다. 실제 EXE 설치·실행 검증은 창을 생략하는 headless 모드로 수행했고, Windows 브라우저 실행 요청은 별도로 확인했다. Node/Python 완전 번들 installer, 자동 업데이트와 복구 UI 버튼은 향후 개선 범위다. 현재 소스/패키지와 EXE를 함께 보관해야 한다.
