# 개발환경·개인 서버의 컴퓨터 이전

이 문서는 소스 개발환경과 개인 Docker/터널 서버의 이전을 다룹니다. 일반 플레이어는 [Release ZIP 실행](SETUP.md), Windows 사용자 저장 이전은 [백업 안내](BACKUPS.md#일반-windows-사용자-저장)를 따릅니다.

코드는 Git으로, 개인 저장은 별도 백업으로 옮깁니다. 개발 DB·Windows 사용자 DB·Docker 볼륨은 독립적입니다.

## 1. 옮길 자료 확인

| 자료 | 내용 | 새 PC에서 둘 위치 |
|---|---|---|
| `포켓몬타워 실행.exe` | 개인용 Windows 실행기 진입점. Git 제외 | 최신 프로젝트의 최상위 폴더 (`package.json` 옆) |
| `.env.local` | 로컬 개발 환경 설정 | 사용할 저장을 정한 뒤 프로젝트 루트 |
| `.data/dev-migrated.sqlite` | 개발용 계정·도감·진행 | `TOWER_DB_PATH` 위치 |
| `.data/docker-preview.sqlite` | Docker 저장의 이전용 스냅샷 | 검증·보관 후 Docker 볼륨에 별도 복원 |
| `.data/preview.env` | 통합 실행기의 포트·접속 출처 | 프로젝트의 `.data/` |
| `transfer-manifest.json`, `transfer-notes.txt` | 파일 크기·SHA-256·생성 당시 스키마·이전 설명 | 개인 저장 묶음과 함께 보관 |

코드·이미지·실행기 소스·문서는 Git으로 받습니다. `포켓몬타워 실행.exe`와 개인 실행기용 `포켓몬타워 실행.cmd`는 Git에서 제외하므로 필요하면 별도로 챙깁니다. 개인 저장 묶음은 `.data/transfers/pokemon-private-save-날짜-식별자/`에 보관합니다. 받은 ZIP은 먼저 이곳에 풀어 검사하고 기존 저장·설정과 비교합니다. 프로젝트 루트에 바로 풀어 기존 파일을 덮어쓰지 않습니다.

`node_modules/`, `.next/`, `.pnpm-store/`, `dist/`, 테스트 DB·결과는 다시 생성할 수 있습니다. Git에서 제외된 과거 실험 원자료는 재생·감사가 필요할 때만 추가로 옮깁니다. 계정 ID·비밀번호·복구 정보는 따로 챙깁니다.

## 개인 Docker/터널 실행기

`포켓몬타워 실행.exe`는 공개 플레이어 `PokemonTower.exe`와 다른 개인용 도구입니다. 개발 clone·Docker Desktop의 Linux 엔진·개인 환경 설정을 사용하며 게임/터널 서버를 관리합니다. 필요한 경우 Git 제외 EXE를 프로젝트 루트에 두거나 [개발 도구 안내](../../scripts/README.md)의 개인 실행기 빌드 명령으로 만듭니다. 일반 사용자가 다운로드하는 Release ZIP의 필수 구성은 아닙니다.

이 실행기의 창을 닫아도 Docker 서버·터널은 남습니다. 종료는 개인 실행기의 서버 끄기 또는 preview:stop을 사용합니다. 공개 PokemonTower.exe의 트레이 종료와 혼동하지 않습니다. Node/개발 설치 절차는 [개발자 명령어](../development/DEVELOPER_COMMANDS.md), Docker·네트워크 설정은 [서버 배포](DEPLOYMENT.md)를 따릅니다.

## 2. 이전 직전 백업

백업 뒤에 플레이한 내용은 해당 백업에 없습니다. 이전 직전에 [수동 백업](BACKUPS.md#수동-백업)으로 새 스냅샷을 만듭니다. Docker 백업을 PC로 복사한 뒤 이전 PC의 게임과 터널을 중지합니다.

두 DB를 각각 검사하고 어떤 저장을 이어갈지 선택합니다. DB 크기나 스키마 번호만으로 최신 진행을 판단하지 않습니다. SQLite backup API로 만든 스냅샷에는 원본 WAL/SHM 파일을 붙이지 않습니다.

## 3. 새 PC에서 로컬 개발 이어가기

1. 최신 코드를 받고 [개발자 clone 절차](../development/DEVELOPER_COMMANDS.md#처음-clone한-pc)로 의존성과 외부 자산을 준비합니다.
2. 기존 저장이 있으면 먼저 백업합니다. 선택한 개발 스냅샷을 **새 파일명**으로 복사합니다. 예: `.data/dev-restored-20261016.sqlite`.
3. `.env.local`의 `TOWER_DB_PATH`를 그 파일로 지정합니다. 로컬 개발에 예전 터널의 `TOWER_ORIGIN`을 남기지 않습니다.
4. `pnpm.cmd dev`로 실행하고 기존 계정의 도감·재화·진행을 확인합니다. 서버가 지원하는 이전 스키마는 실행 시 마이그레이션됩니다.

브라우저 쿠키는 다른 PC에 자동 이전되지 않습니다. 같은 계정으로 로그인해야 저장을 이어갈 수 있습니다. 개발용 설정 변경만으로 Docker 볼륨의 저장이 바뀌지는 않습니다.

## 4. 새 PC의 Docker 저장 복원

Docker Desktop의 Linux 엔진을 준비합니다. 복원 전에는 통합 실행기의 「서버 켜기」로 빈 저장을 만들지 않습니다. 아래 명령은 프로젝트 루트의 PowerShell에서, **중지된 서버의 비어 있는 새 볼륨에만** 사용합니다.

`.data/preview.env`가 없으면 아래 내용으로 준비합니다. 실행기가 실제 터널 주소를 갱신합니다.

```text
TOWER_PORT=3004
TOWER_ORIGIN=https://preview.invalid
```

복원할 파일 경로를 실제 검증한 스냅샷으로 바꿉니다. 아래 예시는 보관한 개인 저장 묶음의 Docker 스냅샷입니다.

```powershell
$towerCompose = @('compose','-p','tower-preview','--env-file','.data/preview.env','-f','compose.yaml','-f','compose.preview.yaml')
docker @towerCompose stop game tunnel
if ($LASTEXITCODE -ne 0) { throw 'Stop failed' }
docker @towerCompose build game
if ($LASTEXITCODE -ne 0) { throw 'Build failed' }
$towerRestorePath = (Resolve-Path -LiteralPath '.data/transfers/pokemon-private-save-20261016-f40a40da/.data/docker-preview.sqlite').Path
docker @towerCompose run --rm --no-deps --user root --volume "${towerRestorePath}:/restore/tower.sqlite:ro" --entrypoint node game -e 'const fs=require("node:fs");const {DatabaseSync}=require("node:sqlite");const db=new DatabaseSync("/restore/tower.sqlite",{readOnly:true});if(db.prepare("PRAGMA integrity_check").get().integrity_check!=="ok"||db.prepare("PRAGMA foreign_key_check").all().length)throw Error("Invalid backup");db.close();const dest="/data/tower.sqlite";if([dest,dest+"-wal",dest+"-shm"].some(p=>fs.existsSync(p)))throw Error("Existing save: back it up and choose the intended save first");fs.copyFileSync("/restore/tower.sqlite",dest,fs.constants.COPYFILE_EXCL);fs.chownSync("/data",1000,1000);fs.chownSync(dest,1000,1000);fs.chmodSync(dest,0o600);console.log("Restored backup to new volume");'
if ($LASTEXITCODE -ne 0) { throw 'Restore failed' }
```

기존 DB 또는 WAL/SHM이 있으면 중단합니다. 기존 저장을 백업하고 복원 대상을 다시 결정하기 전에는 덮어쓰지 않습니다.

복원이 성공하면 `포켓몬타워 실행.exe`를 열고 「서버 켜기」 또는 「업데이트」를 누릅니다. 새 주소에서 기존 계정의 도감·재화·진행을 확인합니다. 현재 주소는 실행기 또는 `pnpm.cmd preview:status`로 확인합니다. 예전 문서나 백업 설정의 임시 주소를 재사용하지 않습니다.

`down -v`나 볼륨 삭제·정리는 저장을 없애므로 이전 절차에 사용하지 않습니다. 이전 PC와 새 PC를 동시에 운영하면 진행이 갈라질 수 있으므로 확인을 마친 한쪽에서 이어갑니다.

## 작업을 이어받을 때 읽을 문서

1. 루트 `AGENTS.md`와 [작업 인계](../SESSION_HANDOFF.md).
2. [현재 상태](../STATUS.md)와 [다음 작업](../current/ROADMAP.md).
3. [폴더 관리](../engineering/WORKSPACE.md), 수정할 영역의 개발 문서.
4. 조작 변경은 [화면과 조작](../gameplay/CONTROLS.md), 실험 근거는 보고서 목록 (로컬 전용: `artifacts/README.md`).

Next.js 코드 수정 전에는 설치된 `node_modules/next/dist/docs/`의 해당 가이드를 읽습니다. 과거 이전 기록은 Git 이력에서 확인하고, 현재 절차에 옛 백업명·접속 주소·로컬 Git 인덱스 설정을 다시 누적하지 않습니다.
