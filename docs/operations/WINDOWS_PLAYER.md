# Windows standalone 플레이어 구조

기준: 2026-10-24. source 개발, Windows 플레이어, 서버/Docker 배포를 분리한다. 게임 UI/DB schema는 변경하지 않는다.

## 진입점과 두 설치 경로

`PokemonTower.exe`는 .NET Framework WinForms 얇은 실행기다. C# source는 scripts/player-launcher.cs, 빌드는 scripts/build-player-launcher.ps1이다. 프로젝트 제작 branding PNG를 보존하고 16/32/48/64/128/256 크기의 ICO를 build 중 artifacts에 생성한다. EXE/ICO는 build 산출물이며 Git에 넣지 않는다.

C#은 Node를 찾고 버전을 검사한 뒤 콘솔 없는 자식으로 scripts/player-launcher.mjs를 실행한다. Node 엔진은 설치 판단·로그·복원/패키징·서버/health/브라우저를 담당한다. 첫 설치에는 진행 단계를 보여주고, 준비 이후에는 작은 시작 창을 숨긴 뒤 알림 영역에서 종료할 수 있다. 사용자가 실행하는 파일은 하나지만 주변 scripts/게임 파일을 EXE 안에 모두 내장한 형식은 아니다.

- 소스 폴더 최초 실행: 실행 도구 검사 → pinned pnpm 의존성 설치 → 필요한 자산 통합 복원 → 전체 verify → production build → 기존 package-deploy로 사용자 package 생성 → Node 실행 파일 보관 → marker 마지막 생성 → production 서버 → health → 브라우저.
- 완성된 Windows 배포 묶음 최초 실행: 동봉된 외부 자산 전체 verify → 사용자 package 위치로 복사 → Node 실행 파일 보관 → marker → production 서버 → health → 브라우저. 이 경우 Python/Pillow/pnpm/build가 필요 없다.
- 이후 실행: marker와 버전, server.js/BUILD_ID/시작 스크립트, asset root와 대표 파일 6개, Node 파일, saves 쓰기 가능 여부만 확인 → production 서버. 의존성 설치·전체 SHA·build·package를 반복하지 않는다.

Python은 PokéRogue 변환이 필요할 때만 3.10+/Pillow 12.3.0을 검사하며 누락 시 안내한다. Node 자체가 없는 최초 PC에는 설치 안내가 나온다. Node/Python까지 포함하는 self-contained installer는 이번 구현이 아니다.

## 트레이와 한국어 출력

현재 입력 가독성/인증 이동/타이틀 표시/도감·편성 분리/종료 보강 빌드는 launcherVersion `1.0.2`, buildVersion `1.0.0-beta.1-player.6`다. 이전 설치 marker와 다르면 최초 한 번 새 standalone 묶음을 준비하므로, 소스 옆 EXE를 실행해도 이전 게임 UI를 계속 사용하는 일이 없도록 한다. 저장 DB는 그대로 보존하며 다음 실행부터 빠른 경로를 사용한다.

## 프로세스 소유와 종료

일반 실행 트리는 EXE → Node 실행기 → `start-deploy.mjs`/standalone 서버다. start-deploy는 같은 Node 프로세스에서 server.js를 require하므로 이 둘 사이에 별도 Node 프로세스를 만들지 않는다. 의존성/빌드 도구나 서버가 추가 자식을 만들면 실행기 하위 트리에 포함된다. 버전 검사용 `node --version`은 출력을 읽고 종료를 기다린 뒤 핸들을 해제하는 짧은 별도 호출이다.

트레이 종료는 기존 FormClosing → stdin `stop` → 서버 종료 요청·exit 대기 → Node 실행기 종료 → EXE의 child exit 확인 순서를 유지한다. 기존에도 서버 exit는 기다리고 있었지만, EXE 강제 종료와 child 시작 뒤 예외에서는 Process.Dispose만으로 자식 종료를 보장하지 못했다.

이 위험을 보강하기 위해 EXE가 non-inheritable Windows Job Object 핸들을 독점하고 `KILL_ON_JOB_CLOSE`로 Node 실행기와 이후 자식을 묶는다. Node 진입점은 stdin의 `start`를 받을 때까지 도구/서버를 시작하지 않으며, EXE는 Job 할당 후에만 이를 보낸다. 따라서 Job 할당 이전 자식 생성 경합도 차단한다. 초기 연결 종료/timeout은 시작하지 않고 실패한다. 개발용 NODE_OPTIONS preload도 EXE 실행 경로에서 제거한다. 정상 child exit 후 오류 창을 표시하기 전에 Job 핸들을 닫아 잔여 자식을 정리한다. 창 종료 후 8초를 넘어도 Node 실행기가 끝나지 않으면 Job 전체를 종료하고 child exit를 최대 5초 더 확인한다. EXE를 강제로 죽여 finally가 실행되지 않아도 Windows가 마지막 Job 핸들을 닫는다. [Microsoft Job Object 문서](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects).

브라우저는 게임의 Job 밖인 EXE에서 기본 앱으로 연다. Node는 기존 health 검사 뒤 허용된 localhost 주소의 browser 이벤트만 보내며 C#도 주소를 확인한다. 게임을 종료해도 브라우저는 유지한다. 직접 Node CLI를 실행하는 경우에는 기존 rundll32 경로를 유지한다. 중복 EXE는 기존 home lock과 포트 검사로 서버 생성을 거부하며, 강제 종료 뒤 남은 lock은 이전 PID 종료를 확인한 뒤 회수한다.

Windows 전용 회귀 검사는 `pnpm launcher:build` 후 `node --test tests/windows-player-process.test.mjs`로 실행한다. 실제 EXE와 테스트용 서버/하위 worker를 사용해 정상 종료 3회, EXE 단독 강제 종료, Node 실행기 강제 종료, 서버 실패의 6가지 경우에서 기록한 전체 PID가 사라짐을 검사한다. 정상 stop 경로가 일부러 남긴 worker도 Job이 정리하는지 확인한다. 개인 DB는 사용하지 않는다. 트레이 마우스 조작과 별도로 종료 경로·강제 종료 보호를 검증한다.

이번 보강 검증에서는 실제 standalone EXE로 ready→stop을 3회 반복해 매번 EXE/Node 실행기/서버 PID 잔여 0과 포트 해제를 확인했다. 실행 중 두 번째 EXE는 실패 코드로 종료했고 기존 서버 PID는 유지됐다. EXE만 강제 종료해도 Node 트리와 포트가 정리됐으며 다음 실행의 stale lock 회수도 통과했다. 기본 브라우저 자동 열기·health와 게임 종료 후 브라우저 유지도 실제 확인했다. 결과는 `artifacts/launcher-readability/process-results.json`에 기록한다. 추가한 시작 확인 절차의 오류/빠른 검사 반환 시에는 stdin을 닫아 열린 Windows pipe가 Node 종료를 붙잡지 않도록 했고 별도 회귀 테스트로 검증했다.

최종 standalone 묶음의 실제 EXE를 `artifacts/auth-ux/player-home`에 두 번 실행해 검증했다. 첫 설치의 외부 자산 검증·복사·marker 게시·production health와 종료 코드 0을 확인했다. 두 번째는 marker 원문과 setup 로그 수가 그대로였으며 재설치/전체 해시/build/package 없이 health와 종료 코드 0을 확인했다. 이 실행은 `--headless --no-browser --stop-after-health`를 사용한 무인 검증이며, 트레이 마우스 동작 검증과 구분한다.

트레이 더블클릭과 우클릭 메뉴 `Pokemon Tower 열기`는 실행 중인 Node 엔진의 stdin에 `open` 한 줄을 보낸다. 엔진은 최초 실행과 같은 `/api/health` 검사 함수를 재사용한 뒤 기본 브라우저로 `http://127.0.0.1:3000/`을 연다. 이 명령에는 서버 생성/설치 경로가 없다. 검사 중 중복 요청은 합쳐 처리하며 실패하면 한국어 알림만 표시한다. 단일 클릭은 변경하지 않았다. 메뉴는 열기 → 구분선 → 종료이며, 종료는 기존 FormClosing → `stop` 경로를 유지한다.

C# source는 UTF-8이고 compiler의 `/codepage:65001`을 유지한다. 이 지정이 있으므로 source BOM은 필수가 아니다. Node는 JSON stdout과 stderr를 UTF-8로 보내지만 .NET Framework의 redirected stream은 인코딩을 생략하면 Windows 기본 코드페이지로 읽는다. `ProcessStartInfo.StandardOutputEncoding`과 `StandardErrorEncoding`을 UTF-8로 명시해 한글 안내/오류가 JSON 파싱 이후에도 보존되도록 했다. stdin 명령은 ASCII인 `open`/`stop`이며 콘솔 코드페이지 변경이나 source 문자열 재인코딩은 필요 없다.

최종 `player.4` 묶음으로 기존 QA 설치를 업데이트해 production health, 플레이어 저장 행 보존을 확인했다. 이어 두 번째 EXE 실행에서 marker 원문과 setup 로그 수가 바뀌지 않았고, 재설치 없이 health와 정상 종료를 통과했다. 설치 위치는 `artifacts/launcher-readability/player-home`이며 개인 저장은 사용하지 않았다.

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

### 트레이/한글 UX 수정 검증 (2026-10-24, 기준 42429152)

- `pnpm launcher:build` 성공. UTF-8 source와 `/codepage:65001` 조합으로 새 EXE 생성.
- 새 EXE와 QA 전용 대기 wrapper로 실제 WinForms 창을 관찰했다. Node가 보낸 `Pokemon Tower를 준비하고 있습니다. 게임을 시작합니다.`와 진행률 65가 화면/접근성 텍스트에서 정상 표시됐다. stderr의 `Node.js 24 이상이 필요합니다.`도 bootstrap 로그에서 정상 확인했다. wrapper는 UI 관찰을 위한 대기만 추가하며 이후 실제 player main과 설치 완료 QA home을 실행한다.
- 설치 완료 상태에서 실제 EXE → standalone `/api/health`의 `status: ok` → 브라우저 자동 실행을 확인했다. 개인 개발/플레이어 DB 대신 기존 격리 QA home만 사용했다.
- 실제 production 엔진에 트레이와 동일한 `open` 명령을 세 번 보내 모두 health OK 및 기본 브라우저 실행 요청을 확인했다. 서버 PID 4816이 유지됐으며 `stop` 명령 후 launcher exit 0을 확인했다.
- 플레이어 단위 테스트 8/8 통과. 분할된 stdin/CRLF, 반복 열기의 동일 서버 PID, health 실패 시 브라우저 미실행과 한국어 경고, 정상 종료를 포함한다. typecheck 통과.
- Windows 자동화 도구의 창 목록에는 알림 영역/숨겨진 트레이 창이 노출되지 않아 실제 아이콘 더블클릭·우클릭 열기·종료 메뉴 클릭은 자동으로 확인하지 못했다. 해당 UI 연결은 구현됐으나 이 세 가지 실제 마우스 동작은 수동 확인이 남아 있다. 위 반복 열기/종료 결과는 엔진 명령 검증이며 트레이 클릭 검증과 구분한다.
