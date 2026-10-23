# 다른 컴퓨터에서 작업 이어가기

코드는 Git으로, 개인 저장은 별도 백업으로 옮깁니다. 로컬 개발 저장과 통합 실행기의 Docker 저장은 서로 독립적입니다. 설치는 [설치와 실행](SETUP.md), 백업은 [저장과 백업](BACKUPS.md)을 참고하세요.

## 1. 옮길 자료 확인

| 자료 | 내용 | 새 PC에서 둘 위치 |
|---|---|---|
| `포켓몬타워 실행.exe` | 개인용 Windows 실행기 진입점. Git 제외 | 최신 프로젝트의 최상위 폴더 (`package.json` 옆) |
| `.env.local` | 로컬 개발 환경 설정 | 사용할 저장을 정한 뒤 프로젝트 루트 |
| `.data/dev-migrated.sqlite` | 개발용 계정·도감·진행 | `TOWER_DB_PATH` 위치 |
| `.data/docker-preview.sqlite` | Docker 저장의 이전용 스냅샷 | 검증·보관 후 Docker 볼륨에 별도 복원 |
| `.data/preview.env` | 통합 실행기의 포트·접속 출처 | 프로젝트의 `.data/` |
| `transfer-manifest.json`, `transfer-notes.txt` | 파일 크기·SHA-256·생성 당시 스키마·이전 설명 | 개인 저장 묶음과 함께 보관 |

코드·이미지·실행기 소스·문서와 범용 `포켓몬타워 설치.cmd`·`포켓몬타워 로컬 실행.cmd`는 Git으로 받습니다. `포켓몬타워 실행.exe`와 개인 실행기용 `포켓몬타워 실행.cmd`는 Git에서 제외하므로 필요하면 별도로 챙깁니다. 개인 저장 묶음은 `.data/transfers/pokemon-private-save-날짜-식별자/`에 보관합니다. 받은 ZIP은 먼저 이곳에 풀어 검사하고 기존 저장·설정과 비교합니다. 프로젝트 루트에 바로 풀어 기존 파일을 덮어쓰지 않습니다.

`node_modules/`, `.next/`, `.pnpm-store/`, `dist/`, 테스트 DB·결과는 다시 생성할 수 있습니다. Git에서 제외된 과거 실험 원자료는 재생·감사가 필요할 때만 추가로 옮깁니다. 계정 ID·비밀번호·복구 정보는 따로 챙깁니다.

## 실행 환경이 준비된 다른 PC에서 EXE 사용

Windows PC에 Node.js 24 이상과 Docker Desktop의 Linux 엔진이 준비되어 있고, GitHub에서 최신 프로젝트를 받았다면 **같은 EXE를 프로젝트 최상위 폴더에 넣고 실행하면 됩니다.** 컴퓨터마다 EXE를 다시 만들거나 PC 경로에 맞게 수정할 필요는 없습니다. 실행기는 자신이 있는 프로젝트 폴더를 기준으로 파일을 찾습니다.

1. 다른 PC에서 프로젝트를 최신 코드로 갱신합니다.
2. 따로 가져온 `포켓몬타워 실행.exe`를 `package.json` 옆에 넣습니다. 실행기 진입점 자체가 변경됐다면 최신 EXE를 가져옵니다.
3. 기존 플레이 기록을 이어갈 경우, **서버를 켜기 전에** 아래 Docker 저장 복원 절차를 완료합니다. 해당 PC에서 이미 쓰던 저장을 유지할 때는 복원하지 않습니다.
4. EXE를 더블클릭하고 「서버 켜기」 또는 「업데이트」를 누릅니다. 준비가 끝나면 A로 게임을 열고 B로 링크를 복사합니다.

EXE는 프로젝트의 PowerShell 실행기 창을 콘솔 없이 여는 작은 진입점입니다. 게임 코드·이미지·글꼴·Node.js·Docker·개인 저장을 안에 담은 독립 실행 패키지가 아닙니다. EXE만 빈 폴더나 바탕화면으로 옮겨 실행하지 않습니다. 프로젝트의 실행기 화면과 동작은 최신 `scripts/` 파일을 사용합니다.

EXE를 가져오지 못했다면 [개발 도구 안내의 실행 파일 생성 명령](../../scripts/README.md)으로 해당 PC에서 만들 수 있습니다. 개인 EXE·개인 실행기용 CMD는 Git에서 제외되지만 소스와 빌드 스크립트는 포함됩니다. 공개용 설치·로컬 실행 CMD는 Git에 포함됩니다. Node.js 24 이상을 준비한 새 PC의 일반 로컬 플레이는 `포켓몬타워 설치.cmd`로 시작할 수 있습니다.

서버 실행을 완료한 뒤 EXE 창을 닫아도 Docker의 게임과 터널은 계속 동작합니다. 종료할 때는 실행기를 다시 열어 「서버 끄기」를 누릅니다. PC와 Docker가 켜져 있어야 외부 접속이 유지됩니다. 학교·회사망의 인증서 문제는 EXE 재생성으로 해결되지 않습니다. 다른 네트워크에서 다시 시도하거나 전산 담당자가 제공한 신뢰 CA를 [Docker 공식 인증서 설정](https://docs.docker.com/engine/network/ca-certs/)에 따라 설정합니다.

## 2. 이전 직전 백업

백업 뒤에 플레이한 내용은 해당 백업에 없습니다. 이전 직전에 [수동 백업](BACKUPS.md#수동-백업)으로 새 스냅샷을 만듭니다. Docker 백업을 PC로 복사한 뒤 이전 PC의 게임과 터널을 중지합니다.

두 DB를 각각 검사하고 어떤 저장을 이어갈지 선택합니다. DB 크기나 스키마 번호만으로 최신 진행을 판단하지 않습니다. SQLite backup API로 만든 스냅샷에는 원본 WAL/SHM 파일을 붙이지 않습니다.

## 3. 새 PC에서 로컬 개발 이어가기

1. 최신 코드를 받고 [공개 설치 안내](SETUP.md#처음-설치)을 설치합니다.
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
