# 저장과 백업

## 저장 위치

| 구분 | 실제 저장 | 백업·이전 자료 |
|---|---|---|
| 로컬 개발 | `.env.local`의 `TOWER_DB_PATH` (미지정 시 `.data/tower.sqlite`) | `.data/backups/`의 수동 스냅샷 |
| 통합 실행기 | Docker `tower-preview_tower-data` 볼륨의 `/data/tower.sqlite` | 볼륨의 `/data/backups/` 및 PC로 복사한 스냅샷 |
| PC 이전 묶음 | 실행 중인 저장이 아닌 보관용 파일 | `.data/transfers/pokemon-private-save-날짜-식별자/` 또는 ZIP |
| 테스트 | `.data/tests/`, `.data/e2e.sqlite` 등 | 개인 진행 복원에 사용하지 않음 |

로컬·Docker 저장은 자동 동기화하거나 합치지 않습니다. 개인 저장과 환경 설정은 Git에서 제외됩니다. 프로젝트 폴더 복사에는 Docker 볼륨이 포함되지 않습니다.

## 받은 백업을 확인할 때

1. 묶음은 `.data/transfers/` 아래 별도 폴더에 둡니다. 원본 manifest·이전 설명·환경 설정과 DB의 파일명을 유지합니다.
2. manifest의 파일 크기와 SHA-256을 실제 파일과 비교합니다. PowerShell의 `Get-FileHash -Algorithm SHA256 -LiteralPath '파일경로'`로 해시를 확인할 수 있습니다.
3. 각 SQLite를 읽기 전용으로 열어 `PRAGMA integrity_check`가 `ok`인지, `PRAGMA foreign_key_check` 결과가 없는지 확인합니다. `PRAGMA user_version`으로 생성 당시 스키마도 확인합니다.
4. 기존 저장도 같은 방식으로 검사하고 계정·도전·배틀 등 진행을 비교합니다. 파일 크기·수정 시각·스키마 번호만으로 어느 쪽을 사용할지 결정하지 않습니다.
5. 검사 결과는 개인 묶음 옆의 `verification-날짜-식별자.json`과 `.data/transfers/README.md`에 기록합니다. 계정 정보·설정 원문은 공개 보고서에 싣지 않습니다.

검사 통과는 파일이 정상적으로 읽힌다는 뜻입니다. 게임 로그인·배틀 복구와 스키마 이전은 복사본에서 별도로 확인합니다. 백업 점검만으로 실제 저장을 교체하거나 서버를 시작하지 않습니다.

## 수동 백업

### 로컬 개발 저장

`backup-db.mjs`는 SQLite backup API로 일관된 스냅샷을 만들고 무결성을 검사합니다. 일반 Node 명령은 `.env.local`을 자동으로 읽지 않으므로 사용할 환경 파일을 명시합니다. 프로젝트 루트에서 실행합니다.

```powershell
node --env-file=.env.local scripts/backup-db.mjs
```

명령이 출력한 파일을 보관합니다. 경로를 명시할 경우 기존 파일과 겹치지 않는 이름을 사용합니다. 기존 파일이 있으면 백업 스크립트가 중단합니다.

### 통합 실행기의 Docker 저장

```powershell
$towerCompose = @('compose','-p','tower-preview','--env-file','.data/preview.env','-f','compose.yaml','-f','compose.preview.yaml')
$towerBackupName = 'transfer-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.sqlite'
New-Item -ItemType Directory -Force -Path '.data/backups' | Out-Null
docker @towerCompose exec -T game node scripts/backup-db.mjs "/data/backups/$towerBackupName"
if ($LASTEXITCODE -ne 0) { throw 'Docker backup failed' }
if (Test-Path -LiteralPath ".data/backups/$towerBackupName") { throw 'PC backup already exists' }
docker @towerCompose cp "game:/data/backups/$towerBackupName" ".data/backups/$towerBackupName"
if ($LASTEXITCODE -ne 0) { throw 'Backup copy failed' }
```

실행기가 업데이트 전에 만드는 백업은 같은 Docker 볼륨 안에 있습니다. PC 고장·볼륨 삭제에 대비하려면 위 절차로 밖에 복사해 보관합니다.

## 보관과 복원

SQLite backup API 스냅샷은 단독으로 복원할 수 있습니다. 실행 중인 원본 DB는 WAL에 최신 기록이 있을 수 있으므로 본체만 복사하지 않습니다. 원본 DB의 `-wal`·`-shm`을 임시 파일로 보고 지우지 않습니다.

과거 실제 DB 백업은 테스트 출력 정리와 구분해 보존합니다. 같은 건수라도 내용이 다를 수 있으므로 건수만 보고 중복 삭제하지 않습니다. 코드 이력은 Git으로 관리하고 프로젝트 전체 사본을 계속 늘리지 않습니다.

복원은 새 파일 또는 비어 있는 Docker 볼륨에서 시작합니다. 절차는 [컴퓨터 이전](COMPUTER_MOVE.md)을 따릅니다. 정기 백업은 미설정이며 1차 완성 이후 주기와 보관 개수를 정합니다.
