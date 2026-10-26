# Windows standalone 플레이어 구조

기준: 2026-10-24 · beta.5 공개본. 일반 사용자 실행은 [SETUP](SETUP.md), 공개 asset·해시·검증 결과는 [완료 기록](../releases/WINDOWS_BETA_5.md)를 따른다. 이 문서는 런처 내부와 유지보수 경계를 설명한다.

## 진입점과 두 설치 경로

`PokemonTower.exe`는 .NET Framework WinForms 얇은 실행기다. C# source는 scripts/player-launcher.cs, 빌드는 scripts/build-player-launcher.ps1이다. 프로젝트 제작 branding PNG를 보존하고 16/32/48/64/128/256 크기의 ICO를 build 중 artifacts에 생성한다. EXE/ICO는 build 산출물이며 Git에 넣지 않는다.

C#은 Node를 찾고 버전을 검사한 뒤 콘솔 없는 자식으로 scripts/player-launcher.mjs를 실행한다. Node 엔진은 설치 판단·로그·복원/패키징·서버/health/브라우저를 담당한다. 첫 설치에는 진행 단계를 보여주고, 준비 이후에는 작은 시작 창을 숨긴 뒤 알림 영역에서 종료할 수 있다. 사용자가 실행하는 파일은 하나지만 주변 scripts/게임 파일을 EXE 안에 모두 내장한 형식은 아니다.

- 소스 폴더 최초 실행: 실행 도구 검사 → pinned pnpm 의존성 설치 → 필요한 자산 통합 복원 → 전체 verify → production build → 기존 package-deploy로 사용자 package 생성 → Node 실행 파일 보관 → marker 마지막 생성 → production 서버 → health → 브라우저.
- 완성된 Windows 배포 묶음 최초 실행: 동봉된 외부 자산 전체 verify → 사용자 package 위치로 복사 → Node 실행 파일 보관 → marker → production 서버 → health → 브라우저. 이 경우 Python/Pillow/pnpm/build가 필요 없다.
- 이후 실행: marker와 버전, server.js/BUILD_ID/시작 스크립트, asset root와 대표 파일 6개, Node 파일, saves 쓰기 가능 여부만 확인 → production 서버. 의존성 설치·전체 SHA·build·package를 반복하지 않는다.

Python은 PokéRogue 변환이 필요할 때만 3.10+/Pillow 12.3.0을 검사하며 누락 시 안내한다. Node 자체가 없는 최초 PC에는 설치 안내가 나온다. Node/Python까지 포함하는 self-contained installer는 이번 구현이 아니다.

## 트레이와 한국어 출력

현재 beta.5 배포 빌드는 launcherVersion `1.0.2`, appVersion `1.0.0-beta.5`, buildVersion `1.0.0-beta.5-player.1`이다. 이전 설치 marker와 다르면 최초 한 번 새 standalone 묶음을 준비하므로, 소스 옆 EXE를 실행해도 이전 게임 UI를 계속 사용하는 일이 없도록 한다. 저장 DB는 그대로 보존하며 다음 실행부터 빠른 경로를 사용한다.

## 프로세스 소유와 종료

일반 실행 트리는 EXE → Node 실행기 → `start-deploy.mjs`/standalone 서버다. start-deploy는 같은 Node 프로세스에서 server.js를 require하므로 이 둘 사이에 별도 Node 프로세스를 만들지 않는다. 의존성/빌드 도구나 서버가 추가 자식을 만들면 실행기 하위 트리에 포함된다. 버전 검사용 `node --version`은 출력을 읽고 종료를 기다린 뒤 핸들을 해제하는 짧은 별도 호출이다.

트레이 종료는 기존 FormClosing → stdin `stop` → 서버 종료 요청·exit 대기 → Node 실행기 종료 → EXE의 child exit 확인 순서를 유지한다. 기존에도 서버 exit는 기다리고 있었지만, EXE 강제 종료와 child 시작 뒤 예외에서는 Process.Dispose만으로 자식 종료를 보장하지 못했다.

이 위험을 보강하기 위해 EXE가 non-inheritable Windows Job Object 핸들을 독점하고 `KILL_ON_JOB_CLOSE`로 Node 실행기와 이후 자식을 묶는다. Node 진입점은 stdin의 `start`를 받을 때까지 도구/서버를 시작하지 않으며, EXE는 Job 할당 후에만 이를 보낸다. 따라서 Job 할당 이전 자식 생성 경합도 차단한다. 초기 연결 종료/timeout은 시작하지 않고 실패한다. 개발용 NODE_OPTIONS preload도 EXE 실행 경로에서 제거한다. 정상 child exit 후 오류 창을 표시하기 전에 Job 핸들을 닫아 잔여 자식을 정리한다. 창 종료 후 8초를 넘어도 Node 실행기가 끝나지 않으면 Job 전체를 종료하고 child exit를 최대 5초 더 확인한다. EXE를 강제로 죽여 finally가 실행되지 않아도 Windows가 마지막 Job 핸들을 닫는다. [Microsoft Job Object 문서](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects).

브라우저는 게임의 Job 밖인 EXE에서 기본 앱으로 연다. Node는 기존 health 검사 뒤 허용된 localhost 주소의 browser 이벤트만 보내며 C#도 주소를 확인한다. 게임을 종료해도 브라우저는 유지한다. 직접 Node CLI를 실행하는 경우에는 기존 rundll32 경로를 유지한다. 중복 EXE는 기존 home lock과 포트 검사로 서버 생성을 거부하며, 강제 종료 뒤 남은 lock은 이전 PID 종료를 확인한 뒤 회수한다.

트레이 더블클릭과 우클릭 메뉴 `Pokemon Tower 열기`는 실행 중인 Node 엔진의 stdin에 `open` 한 줄을 보낸다. 엔진은 최초 실행과 같은 `/api/health` 검사 함수를 재사용한 뒤 기본 브라우저로 `http://127.0.0.1:3000/`을 연다. 이 명령에는 서버 생성/설치 경로가 없다. 검사 중 중복 요청은 합쳐 처리하며 실패하면 한국어 알림만 표시한다. 단일 클릭은 변경하지 않았다. 메뉴는 열기 → 구분선 → 종료이며, 종료는 기존 FormClosing → `stop` 경로를 유지한다.

C# source는 UTF-8이고 compiler의 `/codepage:65001`을 유지한다. 이 지정이 있으므로 source BOM은 필수가 아니다. Node는 JSON stdout과 stderr를 UTF-8로 보내지만 .NET Framework의 redirected stream은 인코딩을 생략하면 Windows 기본 코드페이지로 읽는다. `ProcessStartInfo.StandardOutputEncoding`과 `StandardErrorEncoding`을 UTF-8로 명시해 한글 안내/오류가 JSON 파싱 이후에도 보존되도록 했다. stdin 명령은 ASCII인 `open`/`stop`이며 콘솔 코드페이지 변경이나 source 문자열 재인코딩은 필요 없다.

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

일반 사용자 배포는 `pnpm player:package`로 생성하고 `pnpm player:package:verify`로 재검사한다. Windows x64에서 자산 전체 검증 → production build → 기존 package-deploy의 `--player` 경로 → EXE 컴파일 → 사용자 README/파일별 SHA256 manifest → ZIP → 압축 내부 전체 SHA 검증을 수행한다. `dist/PokemonTower-Windows-v1.0.0-beta.5/`와 같은 이름의 ZIP 및 `.zip.sha256`이 결과다. 출력은 덮어쓰지 않는다. 재생성이 필요하면 기존 결과를 먼저 별도 보관한다.

2026-10-26부터 ZIP 내부 최상위는 `PokemonTower/`이며 Release ZIP 파일명은 유지한다. Next standalone에 추적된 production 파일만 복사하고 pnpm의 긴 peer/version 저장 디렉터리를 `node_modules/.p/<짧은 슬롯>/`으로 바꾼다. dependency 내부 파일명과 버전별 연결 관계는 그대로다. 생성·folder verify·ZIP verify는 압축 해제 상위 경로 100자(UTF-16)를 예약하고, 최상위 폴더를 포함한 최종 파일 경로가 240자를 넘으면 실패한다. 세부 원인과 실기 범위는 [ZIP 경로 검증](WINDOWS_ZIP_PATHS.md)을 따른다.

기존 결과와 나란히 검증할 때는 `pnpm player:package --output-root dist/explorer-fix`와 `pnpm player:package:verify dist/explorer-fix/PokemonTower-Windows-v1.0.0-beta.5`를 사용한다. 이 옵션도 기존 출력은 덮어쓰지 않는다. 일반 사용자 절차는 다운로드 → 압축 해제 → PokemonTower.exe 그대로이며 짧은 드라이브 경로·Long Paths 설정·추가 압축 도구를 요구하지 않는다.

EXE 단독 배포는 불가능하다. 추적된 production 의존성, public/.next/static, 서버/실행기, 자산 검증 recipe/lock/manifest, 라이선스를 함께 배포한다. 개발 소스·테스트·전체 개발 node_modules·서버 운영 문서·환경 파일·Python 변환기는 player 묶음에서 제외한다. Next가 기록한 빌드 PC 절대 경로는 상대 경로로 바꾸고 source map은 제외한다. 파일 구조/해시 검사에서 DB·설치 기록·로그·비밀값 혼입을 거부한다. 자산 8,578개는 동봉하며 첫 실행에 다운로드/변환/빌드를 하지 않는다.

검증 대상은 Windows 11 x64 + Node.js 24 이상이다. C#은 Windows 기본 .NET Framework 4.x WinForms를 사용하므로 이 환경에서 별도 SDK/Visual Studio 설치가 필요 없다. [Microsoft Windows별 .NET Framework 안내](https://learn.microsoft.com/en-us/dotnet/framework/install/on-windows-10)에 Windows 11 포함 버전이 명시되어 있다. 제거·손상된 Windows 구성이나 Windows 10/ARM은 이번 배포의 별도 실기 검증 대상이 아니다. [Release 안내와 다른 PC 확인](../releases/WINDOWS_BETA_5.md)을 따른다.

Next `output: standalone`과 기존 의존성 junction 복구 로직을 유지한다. package-deploy는 신규 `--output <새 디렉터리>`를 받아 설치기가 지정한 immutable package를 생성할 수 있다. 기존 디렉터리는 덮어쓰지 않고 source/data 경로를 출력으로 사용하지 않는다. public/.next/static, 서버, 필요한 의존성, 크레딧, 검사용 recipe/golden, player 엔진을 포함한다. Windows는 package 안에 새 EXE를 컴파일하므로 현재 실행 중인 source EXE를 덮어쓰지 않는다.

실행은 항상 `node scripts/start-deploy.mjs` → 패키지 `server.js`다. source의 Next CLI, next dev, next start는 플레이어 실행 경로에 없다. 포트가 이미 사용 중이면 다른 서비스와 구분할 수 없으므로 명확히 실패한다. 준비되지 않은 서비스의 브라우저를 열지 않는다. 다른 포트로 임의 이동하지 않는다.

## 진단과 복구

- 개발자 복구 진단: `node scripts/setup-windows.mjs --home <별도 경로>`. 같은 엔진의 repair 경로를 호출한다.
- 개발자 실행 진단: `node scripts/launch-local.mjs --home <별도 경로>`. 같은 production 엔진을 사용하며 일반 사용자용 CMD는 제거했다.
- 개발 서버: 별도로 pnpm dev.
- `PokemonTower.exe --verify`: 설치된 package의 전체 외부 SHA 확인.
- `PokemonTower.exe --repair`: 원래 배포/소스 폴더에서 새 package 준비. 기존 saves 보존.
- `--check`: 전체 SHA 없이 marker/필수 파일 검사. 누락/손상/버전 변경 시 nonzero.
- `--home <별도 경로>`: QA용 설치/저장 격리.

일반 실행의 대표 파일 검사는 임의의 모든 부분 손상을 발견한다는 의미가 아니다. 대표 파일 외 손상은 명시적 verify로 확인하고 원래 온전한 배포 묶음에서 repair한다. 원래 배포 묶음 자체가 손상됐으면 다시 받아야 한다. 파일 검사/복구 UI 버튼과 자동 업데이트 서버는 추가하지 않았다.

## 검사와 검증 범위

- `tests/player-launcher.test.ts`: 설치 상태·health·명령·정상 종료.
- `tests/windows-player-process.test.mjs`: 실제 EXE와 하위 worker의 반복 종료·강제 종료·실패 시 전체 PID 정리.
- `tests/windows-player-release.test.mjs`: 배포 EXE의 독립 home 설치·빠른 실행·중복 차단·갱신과 저장 보존.

QA는 별도 `--home`/DB를 사용한다. beta.5의 자동 검사와 다른 PC 실사용 결과는 [공개·검증 완료 기록](../releases/WINDOWS_BETA_5.md)에 모은다. 다른 PC 정상 플레이 보고를 모든 트레이 마우스 동작·재부팅·장기 플레이의 개별 검증으로 확대하지 않는다.
