# 설치와 실행

2026-10-16 기준. 현재 결과물은 615개 도감 항목·100층 타워·여섯 룰 선택·1~9세대 랜덤 테마·타이틀·설정과 터미널 배틀이다. 지갑·도감·도전·배틀 행동은 SQLite에 저장하며 Node.js 서버가 전투 엔진을 실행한다.

## Windows에서 더블클릭으로 플레이

이 PC처럼 Node.js 24와 Docker Desktop이 준비되어 있으면 프로젝트 루트의 **`포켓몬타워 실행.cmd`를 더블클릭**한다. 실행 폴더로 이동하거나 명령어를 입력할 필요가 없다.

[포켓몬타워 실행.cmd](../../포켓몬타워%20실행.cmd) **하나**로 통합 실행기 창을 연다. 창이 열리면 현재 서버 상태와 주소를 자동 확인한다.

| 버튼 | 동작 |
|---|---|
| 서버 켜기 / 업데이트 | Docker 자동 시작 → 최신 게임 빌드 → 기존 DB 백업 → 서버·임시 터널 실행 |
| 서버 끄기 | 게임과 터널 종료. 저장 볼륨 보존 |
| 상태 새로고침 | 현재 실행 상태와 게임 주소 재확인 |
| 게임 열기 | 현재 게임 주소를 브라우저로 열기 |
| 주소 복사 | 현재 주소를 복사. 카톡·문자 등에 붙여넣어 전달 가능 |

QR코드나 별도 주소 단축 서비스는 사용하지 않는다. 처음 실행하거나 코드가 바뀌었으면 빌드에 시간이 걸린다. 이미 최신이면 Docker 빌드 캐시를 사용한다. 진행 상황은 창 아래에서 확인하며, 작업 중 중복 실행과 이전 주소 복사를 막는다. 창을 닫아도 게임 서버는 유지된다. 종료할 때에는 창을 다시 열고 「서버 끄기」를 누른다. SQLite DB는 서버가 함께 열며 별도 DB 프로그램을 켜지 않는다.

주소는 `.data/preview-url.txt`에도 저장된다. PC와 휴대폰에서 그 주소로 접속한다. PC와 Docker가 켜져 있어야 하며, 터널을 다시 만들면 주소가 달라질 수 있다. 기존 `tower-preview` 저장을 유지하며 로컬 개발의 `.env.local` DB와 자동으로 복사·병합하지 않는다. 실행 전 백업은 Docker 볼륨의 `/data/backups/before-launch-*.sqlite`에 보관한다.

화면은 Windows 기본 WinForms를 사용하는 [launcher-window.ps1](../../scripts/launcher-window.ps1)이다. 별도 GUI 라이브러리를 설치하지 않는다. 서버 실행은 [launch-preview.mjs](../../scripts/launch-preview.mjs), 서버·터널 절차는 [preview.mjs](../../scripts/preview.mjs)다. Node.js가 일반 PATH에 없으면 이 PC의 Codex 런타임도 찾아서 사용한다. 새 PC에서 두 런타임 모두 없으면 Node.js 24를 설치한다. Docker는 PATH·사용자 설치·Program Files 설치를 확인한다.

## 새 PC의 준비물

기존 작업·계정을 다른 PC로 옮길 때는 [컴퓨터 이전 안내](COMPUTER_MOVE.md)를 먼저 따른다. 폴더 복사만으로 Docker 볼륨이 이전되지는 않는다.

1. [Node.js 공식 다운로드](https://nodejs.org/en/download)에서 Node.js를 설치한다. 프로젝트 검증 환경은 24.19.0이며 package.json은 24 이상을 요구한다. 가능한 한 검증 버전에 맞춘다.
2. [Git](https://git-scm.com/downloads)을 설치하고 저장소를 받는다.
3. 터미널을 새로 열어 아래 명령으로 확인한다. Node 설치 시 npm이 포함된 배포본을 사용한다.

```powershell
node --version
npm.cmd --version
git --version
```

Node.js만 시스템에 설치하면 TypeScript·tsx·Showdown은 프로젝트 의존성으로 설치된다.
로컬 개발에는 Docker가 필요 없다. 현재 무료 인터넷 테스트를 이어갈 경우 Docker Desktop과 Linux 엔진이 필요하다. PostgreSQL·별도 게임 엔진 프로그램은 설치하지 않는다.

## 의존성 설치

저장소 루트에서 실행한다. pnpm 11.19.0을 고정해 사용한다.

```powershell
npm.cmd install --global pnpm@11.19.0
pnpm.cmd install --frozen-lockfile
```

pnpm-workspace.yaml은 TypeScript 실행 도구에 필요한 esbuild 빌드만 허용한다.
Showdown이 선택적으로 사용하는 SQLite 네이티브 모듈은 사용하지 않아 빌드를 비활성화했다. 우리 저장 계층은 Node.js 내장 `node:sqlite`를 사용하므로 별도 DB 설치나 네이티브 패키지 빌드가 필요 없다.
향후 DB 기능을 추가할 때 필요한 의존성과 라이선스를 다시 확인한다.

## 실행과 검증

```powershell
# 브라우저로 플레이: 실행 후 http://127.0.0.1:3000 접속
pnpm.cmd dev
```

개발 서버는 파일 변경을 반영한다. 터미널을 닫거나 Ctrl+C를 누르면 서버가 종료된다.
실행 중인 서버 하나가 웹 화면 제공과 전투 API 처리를 모두 담당한다.

프로덕션 빌드와 브라우저 자동 검증:

```powershell
pnpm.cmd build
pnpm.cmd start
# 별도 테스트 서버를 자동 실행. 현재 E2E 설정은 설치된 Google Chrome 사용.
pnpm.cmd test:e2e
```

2026-10-12 Windows 빌드: `pnpm build`는 프로젝트의 `scripts/windows-build-links.cjs`를 빌드 프로세스에만 적용한다. pnpm의 상대 경로 폴더 링크를 Next standalone에 복사할 때 권한 오류가 나면 Windows junction으로 생성한다. 관리자 실행·Windows 개발자 모드를 요구하지 않으며 Linux 빌드에는 영향을 주지 않는다.

포켓몬 이미지는 `public/vendor/pokeapi/pokemon/`와 기존 Showdown·기믹·트레이너 폴더에서 제공한다. 정상 플레이 중 외부 이미지 사이트에 접속할 필요가 없다. 원본을 다시 가져올 때만 `node --import tsx scripts/import-local-pokemon-sprites.ts`를 실행하며 네트워크가 필요하다.

E2E는 3001번 포트에 전용 서버를 시작하고 `.data/e2e.sqlite`를 사용한다. 실제 플레이용 3000번 서버와 DB는 건드리지 않는다.
서버 재시작 테스트는 3002번 포트와 `.data/restart-tests/`의 별도 DB를 사용한다.
테스트 전에 최신 코드를 빌드하고 3001·3002번 포트를 비워 둔다. Chrome이 없다면 설치하거나
Playwright 설정의 channel을 제거한 후 `pnpm.cmd exec playwright install chromium`으로 테스트 브라우저를 설치한다.

기존 CLI와 타입·핵심 테스트:

```powershell
# 사람이 번호를 입력해 AI와 대결
pnpm.cmd battle

# 양쪽 모두 규칙 AI로 한 경기 실행
pnpm.cmd battle:auto

# 타입 검사와 테스트
pnpm.cmd typecheck
pnpm.cmd test

# 경기 종료 시 출력된 실제 로그 파일 경로 사용
pnpm.cmd battle --replay logs/battle-실제파일명.json
```

처음에는 고정된 3마리 순서를 확인하고, 각 요청에서 표시된 행동 번호를 입력한다.
기절한 포켓몬은 교대가 필요하다. 종료는 Ctrl+C다.
경기 완료 시 logs/에 초기 팀·시드·엔진 버전·관측·행동·결과 JSON이 생성된다.
이 로그에는 양쪽 초기 팀 정보가 있으므로 향후 웹 클라이언트나 AI에 그대로 제공하면 안 된다.
웹 완료 로그는 이제 SQLite의 battles.log에 저장한다. 이전 버전의 logs/web 파일은 그대로 남겨 둔다.
CLI 로그 재현과 별개로, 웹은 저장된 초기 팀·시드·엔진/AI 버전·행동을 사용해 중단된 배틀을 복구한다.

## 웹 배틀의 현재 범위와 저장 한계

- 도감에서 3마리 선택 → 배틀 → 승리 보상 → 1마리 영입/생략 → 다음 층 3마리 선택.
- 최초 해금은 1~9세대 스타팅 일반 최종 진화형 27종. 기존 저장에도 추가되며 능력치·재화·진행을 유지한다. 영입한 종이 다음 도전의 선택지에 추가된다.
- 현재 콘텐츠는612종·100층. 50층은 중간 관문이고51~60층에서 완화한 뒤100층까지 재상승한다. 층 사이 HP·PP·상태를 회복하고10층마다 상점/정비를 제공한다. 기존 저장은 당시 목표 층과 규칙을 유지한다. 타워 코인과 영구 성장 포인트는 별개다. 현재 규칙은 [STATUS](../STATUS.md)를 따른다.
- 보유 최대 6마리. 보유한 종의 중복 영입은 거부하며, 가득 차면 기존 멤버를 지정해 교체한다.
- 1개의 브라우저 쿠키마다 활성 도전 1개. 쿠키는 1년으로 갱신하며 서버에는 토큰의 SHA-256 값으로 소유자를 구분한다.
- 새로고침·서버 재시작 후 같은 쿠키와 DB 파일, 동일한 엔진·AI 버전이면 마지막 저장된 입력까지 복구한다.
- 게스트 쿠키를 삭제하면 해당 게스트 저장에 바로 접근할 수 없다. 회원가입하면 게스트 저장을 계정에 연결하고, 다른 기기에서도 로그인해 이어서 플레이할 수 있다. 계정 복구 키와 기존 저장 이전은 [ACCOUNTS](ACCOUNTS.md)를 참고한다.
- 30분 유휴 메모리 캐시는 정리할 수 있고, 최대 128개 배틀을 메모리에 유지한다. DB 기록은 지우지 않는다.
- 로컬 단일 서버 검증용이다. 여러 서버 인스턴스의 동시 엔진 실행·서버리스 운영은 지원하지 않는다.
- 외부 이미지 로딩이 실패하면 포켓몬 이름·대체 아이콘을 표시하며 배틀은 계속 가능하다.
- 영구 성장·세팅, 10층 정비·상점, 100층 타워, 메가/다이맥스/테라/Z기술과 여섯 룰, 공개 무효 학습과 Z기술 사용을 지원하는 상대 v9, 계정 로그인을 구현했다. 온라인 대전은 미구현/보류다. Z기술은 타입/전용 크리스탈 장착과 팀당 배틀 1회 제한으로 구현했다. 실제 조작은 [UI_FLOW](../gameplay/CONTROLS.md)를 따른다.
- 역방향 프록시를 붙일 때는 `TOWER_ORIGIN`을 실제 접속 출처(예: https://game.example.com)로 지정한다. 임의의 forwarded-host를 신뢰하지 않는다.

## DB 파일과 백업

- 기본 파일: `.data/tower.sqlite`. 첫 접속 시 스키마와 게스트 데이터가 생성된다.
- 변경 위치: `TOWER_DB_PATH`. 이 경로를 바꾸면 다른 저장 파일을 사용한다. 예시는 `.env.example` 참고.
- SQLite WAL을 사용한다. 가장 단순한 백업은 서버를 정상 종료한 뒤 `.data` 폴더를 복사하는 것이다. 실행 중 본체 파일만 복사하지 않는다.
- `.data`는 Git과 배포 파일 추적에서 제외된다. 테스트 DB 역시 커밋하지 않는다.
- 현재 스키마는 v32이며 트레이너 장비·배틀별 장비 스냅샷과 상자 이벤트 규칙·선택·보상 영수증을 저장한다. 이벤트는 새 도전에서 적용하며 기존 진행은 유지한다. 기존 장비는 실제 구매 영수증이 있는 경우만 인정하며, v29의 자동 지급을 정정한다. 이미 시작한 배틀 기록은 보존한다. 같은 층의 챔피언/히든 보스 배틀은 stage로 구분하고 후반 테마는 run_routes에 저장한다. 마이그레이션은 `src/server/schema.ts`와 `tower-store.ts`에 있다. 초기 v1 도전의 목표 층 수는 3으로 보존한다. 지원 버전보다 새 DB는 거부한다.
- 저장 파일 초기화/삭제는 자동으로 하지 않는다. 엔진 버전 불일치 시 자동 재계산하지 않고 복구를 거부한다.

## 환경별 실행 경로 예시

이 환경은 Node.js와 pnpm을 번들로 제공하지만 일반 터미널의 PATH에 pnpm·npm이 없을 수 있다.
아래는 로컬 번들 경로를 사용한 예시다. 설치 업데이트에 따라 바뀔 수 있으므로 파일 존재를 먼저 확인한다. 사용자 PC별 경로를 배포 코드에 넣지 않는다.

```powershell
$towerNode = 'C:\Users\82105\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$towerPnpm = 'C:\Users\82105\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\pnpm\bin\pnpm.cjs'
$env:Path = (Split-Path $towerNode) + ';' + $env:Path
& $towerNode $towerPnpm battle:auto
& $towerNode $towerPnpm battle
& $towerNode $towerPnpm dev
```

## 문제 해결과 검증 범위

- `npm`을 찾지 못하면 Node 설치와 PATH를 확인한다. PowerShell 실행 정책으로 `.ps1`이 막히면 `.cmd` 명령을 사용한다.
- 제한된 실행 환경에서 레지스트리 접근 EACCES가 발생하면 네트워크 허용이 필요하다.
- 이 Codex 제한 환경에서 tsx의 사용자 정보 조회가 ENOMEM으로 실패했다. 승인된 일반 실행 환경에서는 실행됐다.
- 현재 PC의 설치와 실행은 검증하되, 새 PC 전체 설치 절차는 아직 별도 깨끗한 PC에서 검증하지 않았다.

포켓몬에게 장착하며 산 과거 밴드는 트레이너 장비 구매로 인정하지 않습니다. 포켓몬 대상이 없는 트레이너 장비 구매 영수증만 인정합니다.
