# 다른 컴퓨터에서 작업 이어가기

갱신: 2026-10-11. 이 문서는 이번 대화의 최신 UI·계정·무료 배포 상태와 Windows 컴퓨터 이전 절차를 담는다. 기존 AI 실험 자료는 삭제하거나 덮어쓰지 않는다.

## 새 컴퓨터의 GPT가 먼저 읽을 순서

1. 루트 `AGENTS.md` — Next.js 코드를 수정하기 전에 설치된 `node_modules/next/dist/docs/`의 해당 문서를 읽는다.
2. 이 문서와 [작업 인계](../SESSION_HANDOFF.md).
3. [화면 조작](UI_FLOW.md), [계정](ACCOUNTS.md), [배포](DEPLOYMENT.md).
4. AI/난이도 작업을 실제로 요청받을 때 [현재 상태](../STATUS.md)와 실험 문서를 추가로 읽는다.

사용자 결정: 실제 휴대폰에서 길게 누르기·더블 터치 스킵·로그인 유지·화면 잘림을 확인했고 잘 동작한다고 답했다. 지금은 **PC + Docker + 무료 Quick Tunnel로 테스트**한다. 유료 서버·도메인 구매, PWA, 정기 백업 자동화는 미실행이다. 자동으로 구매하거나 새 호스팅으로 옮기지 않는다. 다음 기능은 사용자의 후속 요청을 따른다.

## 최신 화면 상태 — 되돌리지 말 것

- 타이틀 새로하기: 브라우저 confirm 대신 종료/새 시작 질문과 받을 성장 포인트만 표시하는 팝업. X는 우상단, 두 버튼 글자는 중앙.
- 도감: 설명성 구현 문구 정리, 선택 해제는 Z 메뉴로, X는 타이틀 복귀 확인. 기본 정보에 내 포켓몬 능력치 표를 넣지 않는다.
- 기본 정보: 메가/거다이맥스 모습·타입·종족값·특성 미리보기. 성격은 이름만, 특성 설명은 마우스/포커스 툴팁.
- 기술배치: 내 기술 칸에서 Z를 눌러야 아래 기술 목록으로 진입. 아래 키는 저장 버튼으로. 목록 맨 위에서 위를 눌러도 내 기술 칸으로 넘어가지 않으며, 선택 Z 또는 X로 돌아온다.
- 능력치 조정: 능력치 / 성격·특성·테라스탈 두 탭. 좌우 키로 탭 내용을 즉시 바꾸고 Z로 세부 진입. 능력치는 위아래로 항목, 좌우로 노력치 조정. 성격·특성·테라스탈은 각각 선택 팝업.
- 정비: 상위 메뉴에서 상점/포켓몬 조정. 6마리 모두 같은 크기의 스프라이트 카드, HP 표시 없음. 상점은 지닌 도구/배틀 아이템/기술머신/육성으로 분리. 탭에서 Z는 상품 목록, 아래 키는 관리/리롤. 정비 팝업 크기 통일.
- 모바일: 키보드 안내·커서 표시·스킵 버튼·포켓몬 내보내기 버튼 숨김. 등장 연출에서 화면 아무 곳이나 터치하면 진행.
- 모바일 기술 4칸은 설명 영역까지 확장. **450ms 길게 누르는 동안만** 설명 툴팁, 손을 떼거나 취소하면 즉시 닫힘. 길게 누른 뒤 공격을 실행하지 않는다.
- 모바일 경기 화면을 누르고 있는 동안 날씨·양쪽 랭크 상태 표시, 손을 떼면 닫힘. 공격 연출 중 빠른 두 번 터치로 스킵, 한 번 터치는 유지.
- 영입 확인: PC·모바일 모두 **배울 기술 목록과 기술 저장/장착 선택 없음**. 개체값 비교는 접힌 상태. 취소 30% / 확인 70% 한 줄 배치.
- 영입 선택은 “도감에 등록” / “동료로 데려가기” (꽉 찬 팀은 교체). 도감 등록은 이번 팀을 유지한다. 기술 수집은 자동 처리하며 **새 기술 목록은 등록/영입 완료 화면에서만** 표시한다.

주요 파일: `src/web/recruit-dialog.tsx`, `tower-controls.tsx`, `battle-game.tsx`, `battle-commands.tsx`, `use-touch-hold.ts`, `game-keyboard.ts`, `mobile-ui.css`, `title-screen.css`.

## 무엇을 옮겨야 하나

현재 대부분의 프로젝트 파일이 Git에서 untracked다. **git clone만 하면 최신 작업을 가져올 수 없다.** 아직 커밋/푸시했다고 가정하지 말고 이 프로젝트 폴더를 직접 복사한다.

- 코드와 설정: `src/`, `public/`, `vendor/`, `scripts/`, `tests/`, `e2e/`, `docs/`, 루트 설정 파일, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, Dockerfile·Compose 파일.
- 이전 연구까지 이어갈 경우 `artifacts/`와 문서 아카이브도 그대로 보존한다.
- 대용량 실험 trace와 일부 audit는 GitHub 크기 제한 때문에 Git에서 제외한다. 커밋/푸시 후에도 해당 원자료는 직접 복사해야 한다.
- 개인 데이터는 별도 복사: `.data/backups/`, 필요한 `.env.local`, `.data/preview.env`. Git에서 무시되므로 직접 챙긴다.
- `node_modules/`, `.next/`, `dist/`, 테스트 결과는 새 컴퓨터에서 다시 만든다. 이전 Windows 의존성을 다른 OS로 복사해 사용하지 않는다.
- 백업은 모든 계정의 저장을 포함한 개인 파일이다. 공개 Git 저장소에 올리지 않는다.
- Docker 볼륨은 프로젝트 폴더 복사에 포함되지 않는다. 아래 백업 복원이 필요하다.

## 현재 저장 위치와 최신 백업

- 인터넷 서버: Compose 프로젝트 `tower-preview`, 볼륨 `tower-preview_tower-data`, 컨테이너 내부 `/data/tower.sqlite`.
- 로컬 개발 저장: `.env.local`의 `TOWER_DB_PATH`를 확인한다. 기본 `.data/tower.sqlite`나 예전 `local-preview-20261011.sqlite`는 인터넷 서버와 자동 동기화되지 않는다.
- 이번 인계용 최신 백업: `.data/backups/handoff-2026-10-11T14-15-08-743Z.sqlite` — SQLite backup API 생성 후 PC 복사 및 integrity_check 통과.
- 인계 백업 이후 플레이한 진행은 이 파일에 없다. **실제 이전 직전에 기존 PC에서 다시 백업**해야 한다.
- 현재 인터넷 주소: https://begun-defence-defined-taking.trycloudflare.com (고정 주소 아님).
- 두 컴퓨터를 동시에 운영하면 저장이 갈라진다. 기존 PC는 최신 백업 후 공개 서버를 중지하고 새 PC 하나만 운영한다.

## Windows 준비와 로컬 개발

PowerShell 7(아래 명령 기준), Node.js 24 이상, pnpm 11.19.0, 브라우저 E2E를 할 경우 Google Chrome을 설치한다. 외부 테스트까지 할 경우 Docker Desktop의 Linux 엔진도 준비한다. Docker가 Virtual Machine Platform 오류를 표시하면 관리자 PowerShell에서 해당 Windows 기능을 켜고 재부팅한다. Linux 엔진이 Running인지 확인한다.

프로젝트를 새 경로에 복사한 후 루트에서:

```powershell
node --version
npm.cmd install --global pnpm@11.19.0
pnpm.cmd install --frozen-lockfile
docker info
```

개발용으로 최신 인터넷 저장의 **별도 복사본**을 만든다. 기존 개발 DB를 덮어쓰지 않도록 새 파일명을 사용한다.

```powershell
Copy-Item -LiteralPath '.data/backups/handoff-2026-10-11T14-15-08-743Z.sqlite' -Destination '.data/dev-migrated.sqlite'
```

`.env.local`을 확인하여 `TOWER_DB_PATH=.data/dev-migrated.sqlite`로 설정한다. 로컬 자동 로그인이 필요하면 `TOWER_LOCAL_ACCOUNT=기존계정아이디`를 설정한다. 개발 모드의 loopback에서만 적용되고 인터넷/프로덕션은 일반 로그인이다. 로컬 개발에 외부 `TOWER_ORIGIN`을 남기지 않는다.

```powershell
pnpm.cmd dev
# http://127.0.0.1:3000
```

개발 DB와 인터넷 DB를 자동 병합하지 않는다. 실제 서버의 최신 플레이 진행 위에 오래된 개발 저장을 복원하지 않는다.

## 기존 PC에서 이전 직전 백업하고 중지

PowerShell, 프로젝트 루트에서 실행한다. 파일명은 매번 새로 만든다.

```powershell
$towerCompose = @('compose','-p','tower-preview','--env-file','.data/preview.env','-f','compose.yaml','-f','compose.preview.yaml')
$transferName = 'transfer-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.sqlite'
docker @towerCompose exec -T game node scripts/backup-db.mjs "/data/backups/$transferName"
docker @towerCompose cp "game:/data/backups/$transferName" ".data/backups/$transferName"
# 백업 성공을 확인한 후 이전 PC의 공개 서버를 중지한다. 볼륨은 보존됨.
docker @towerCompose stop game tunnel
```

중지 전에 계정·진행을 확인한다. 실패하면 이후 단계로 넘어가지 않는다. 마지막 백업 파일과 프로젝트 폴더를 새 PC로 복사한다. `down -v`, volume prune은 사용하지 않는다.

## 새 PC에서 인터넷 서버 복원

`.data/preview.env`가 없으면 다음 내용으로 생성한다. 기존 임시 주소가 복사되어 있어도 새 터널 연결 후 실제 주소로 갱신해야 한다.

```text
TOWER_PORT=3004
TOWER_ORIGIN=https://preview.invalid
```

아래는 **새 PC의 비어 있는 볼륨** 전용 복원이다. 먼저 백업 파일명을 실제 최종 파일로 바꾼다. 기존 DB가 발견되면 명령은 중단한다. 기존 DB도 백업하고 어느 저장을 사용할지 확인하기 전에는 덮어쓰지 않는다.

```powershell
$towerCompose = @('compose','-p','tower-preview','--env-file','.data/preview.env','-f','compose.yaml','-f','compose.preview.yaml')
docker @towerCompose stop game tunnel
docker @towerCompose build game
$transferBackupPath = (Resolve-Path '.data/backups/handoff-2026-10-11T14-15-08-743Z.sqlite').Path
docker @towerCompose run --rm --no-deps --user root --volume "${transferBackupPath}:/restore/tower.sqlite:ro" --entrypoint node game -e 'const fs=require("node:fs");const {DatabaseSync}=require("node:sqlite");const source="/restore/tower.sqlite";const dest="/data/tower.sqlite";const db=new DatabaseSync(source,{readOnly:true});if(db.prepare("PRAGMA integrity_check").get().integrity_check!=="ok")throw Error("Invalid backup");db.close();if(fs.existsSync(dest))throw Error("Target DB already exists; back it up and choose the intended save before restoring");fs.copyFileSync(source,dest);fs.chownSync("/data",1000,1000);fs.chownSync(dest,1000,1000);fs.chmodSync(dest,0o600);console.log("Restored backup to new volume");'
node scripts/preview.mjs start --no-build
```

터널 재시작 시 `preview:start`가 이전 로그의 주소를 먼저 읽는 경우가 있었다. 출력 주소를 그대로 믿지 말고 `docker @towerCompose logs --since 3m --tail 100 tunnel`의 가장 최근 `trycloudflare.com` 주소와 `.data/preview.env`를 비교한다. 다르면 `node scripts/preview.mjs start --no-build`를 다시 실행하여 현재 주소로 갱신한다. 터널을 불필요하게 재시작하지 않는다.

새 주소에서 로그인하고 원래 포켓몬·재화·진행을 확인한다. 주소 변경으로 브라우저 쿠키가 사라져 보일 수 있지만, 복원된 같은 계정으로 로그인하면 저장을 읽는다. 게임 파일만 옮기고 DB를 복원하지 않으면 초기 상태가 된다.

## 검증과 아직 하지 않은 일

- 최근 Next 프로덕션 빌드, PC/모바일 영입·도감 등록 4개, 모바일 길게 누르기/손 떼기/두 번 터치와 PC 키보드 2개 검증 통과. 사용자는 실제 휴대폰 동작도 확인했다.
- `node scripts/verify-public-release.mjs`는 검증 계정을 만들고 인터넷 게임 컨테이너를 재시작한다. 실제 운영 데이터에는 불필요하게 반복하지 않는다.
- E2E는 `pnpm.cmd build` 후 `node --import tsx node_modules/@playwright/test/cli.js test e2e/recruit-compact.spec.ts e2e/mobile-battle-touch.spec.ts`로 실행한다. 기존 데이터 import 때문에 tsx 로더가 필요한 검사를 확인했다. 전체 과거 E2E가 모두 최신 UI/계정에 맞는 것은 아니므로 전체 통과를 주장하지 않는다.
- 정기 백업은 아직 미설정. 게임은 `restart: unless-stopped`, 터널은 `restart: "no"`라 PC/Docker 재시작 후 공개 연결을 다시 켜야 한다.
- 고정 주소·24시간 외부 서버·PWA는 미구현/미선택. 사용자는 비용 없이 현재 테스트를 유지하기로 했다.
- 현재 DB 복원 없이 새 DB를 만들거나, 구 로컬 DB로 최신 서버 저장을 덮어쓰지 않는다. 임의 가격·확률·AI 난이도 변경은 하지 않는다.

## 새 컴퓨터에서 GPT에게 보낼 요청

> `AGENTS.md`, `docs/current/COMPUTER_MOVE.md`, `docs/SESSION_HANDOFF.md`를 읽고 이 프로젝트의 작업을 이어가줘. 먼저 최신 백업 파일과 DB 경로를 확인하고 기존 계정·진행을 유지한 채 로컬 개발 서버를 켜줘. 인터넷 테스트가 필요하면 새 PC Docker 볼륨을 복원하고 현재 터널 주소를 확인해줘. 유료 서비스는 쓰지 말고, 기존 저장을 덮어쓰기 전에는 사용할 데이터가 맞는지 확인해줘.



