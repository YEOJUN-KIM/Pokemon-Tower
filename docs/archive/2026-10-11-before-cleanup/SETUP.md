# 설치와 실행

현재 결과물은 605종 도감·10층의 타워 흐름·타이틀·기본 설정과 터미널 배틀이다. 지갑·도감·도전·배틀 행동은 SQLite에 저장하며 Node.js 서버가 전투 엔진을 실행한다.

## 새 PC의 준비물

1. [Node.js 공식 다운로드](https://nodejs.org/en/download)에서 Node.js를 설치한다. 프로젝트 검증 환경은 24.19.0이며 package.json은 24 이상을 요구한다. 가능한 한 검증 버전에 맞춘다.
2. [Git](https://git-scm.com/downloads)을 설치하고 저장소를 받는다.
3. 터미널을 새로 열어 아래 명령으로 확인한다. Node 설치 시 npm이 포함된 배포본을 사용한다.

```powershell
node --version
npm.cmd --version
git --version
```

Node.js만 시스템에 설치하면 TypeScript·tsx·Showdown은 프로젝트 의존성으로 설치된다.
지금은 PostgreSQL·Docker·게임 엔진 프로그램을 직접 설치할 필요가 없다.

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
- 최초 해금은 리자몽·거북왕·이상해꽃. 영입한 종이 다음 도전의 선택지에 추가된다.
- 현재 콘텐츠는 605종·10층. 일반 보상은 층별로 증가하며 5층 관장/캡틴 보상은 450코인이다. 층 사이 HP·PP·상태이상을 완전 회복한다. 타워 코인과 영구 성장 포인트는 별개이며 종료/새로하기의 정산 안내를 따른다. 기존 3층 도전은 목표를 보존하고 새 도전은 10층이다.
- 보유 최대 6마리. 보유한 종의 중복 영입은 거부하며, 가득 차면 기존 멤버를 지정해 교체한다.
- 1개의 브라우저 쿠키마다 활성 도전 1개. 쿠키는 1년으로 갱신하며 서버에는 토큰의 SHA-256 값으로 소유자를 구분한다.
- 새로고침·서버 재시작 후 같은 쿠키와 DB 파일, 동일한 엔진·AI 버전이면 마지막 저장된 입력까지 복구한다.
- 쿠키를 삭제하거나 다른 브라우저를 쓰면 기존 게스트 저장에 접근할 수 없다. 계정 로그인/게스트 이전은 아직 없다.
- 30분 유휴 메모리 캐시는 정리할 수 있고, 최대 128개 배틀을 메모리에 유지한다. DB 기록은 지우지 않는다.
- 로컬 단일 서버 검증용이다. 여러 서버 인스턴스의 동시 엔진 실행·서버리스 운영은 지원하지 않는다.
- 외부 이미지 로딩이 실패하면 포켓몬 이름·대체 아이콘을 표시하며 배틀은 계속 가능하다.
- 영구 성장·세팅과 5층 강화 상점은 구현했다. 기술머신·도구 상점과 50층 타워를 구현했다. 계정 로그인·100층·고급 AI·특수 기믹은 후속 단계다. 등장 로그에서 Z/화면 버튼을 눌러 배틀을 시작하고 Shift로 생략할 수 있다.
- 역방향 프록시를 붙일 때는 `TOWER_ORIGIN`을 실제 접속 출처(예: https://game.example.com)로 지정한다. 임의의 forwarded-host를 신뢰하지 않는다.

## DB 파일과 백업

- 기본 파일: `.data/tower.sqlite`. 첫 접속 시 스키마와 게스트 데이터가 생성된다.
- 변경 위치: `TOWER_DB_PATH`. 이 경로를 바꾸면 다른 저장 파일을 사용한다. 예시는 `.env.example` 참고.
- SQLite WAL을 사용한다. 가장 단순한 백업은 서버를 정상 종료한 뒤 `.data` 폴더를 복사하는 것이다. 실행 중 본체 파일만 복사하지 않는다.
- `.data`는 Git과 배포 파일 추적에서 제외된다. 테스트 DB 역시 커밋하지 않는다.
- 현재 스키마는 v9이며 마이그레이션은 `src/server/schema.ts`와 `tower-store.ts`에 있다. 초기 v1 도전의 목표 층 수는 3으로 보존한다. 지원 버전보다 새 DB는 거부하며 이후 구조 변경에도 별도 마이그레이션이 필요하다.
- 저장 파일 초기화/삭제는 자동으로 하지 않는다. 엔진 버전 불일치 시 자동 재계산하지 않고 복구를 거부한다.

## 현재 Codex 환경의 경로

이 환경은 Node.js와 pnpm을 번들로 제공하지만 일반 터미널의 PATH에 pnpm·npm이 없을 수 있다.
현재 저장소에서는 아래처럼 직접 실행할 수 있다. 이 경로는 사용자 PC별로 다르므로 배포 코드에 넣지 않는다.

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
