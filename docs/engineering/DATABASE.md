# 저장 데이터

Node.js의 `node:sqlite`를 사용합니다. `src/server/schema.ts`와 `tower-store.ts`가 테이블·SQL·마이그레이션을 관리하고 코드가 지원하는 현재 스키마는 **33**입니다. 개별 DB·백업의 버전은 `PRAGMA user_version`으로 따로 확인합니다.

계정·세션, 플레이어 재화, 도감·육성, 도전·팀·도구, 상대·배틀·행동, 보상·정산 상태를 저장합니다. 서버가 소유권을 확인하고 자원 소비와 보상을 트랜잭션으로 처리합니다.

DB 경로는 `TOWER_DB_PATH`로 지정하며 기본값은 `.data/tower.sqlite`입니다. 로컬 개발의 실제 경로는 `.env.local`, 통합 실행기는 Docker 볼륨의 `/data/tower.sqlite`를 확인합니다. WAL 모드에서 `-wal`·`-shm` 파일도 사용하므로 실행 중 DB 파일만 따로 이동하거나 부속 파일을 삭제하지 않습니다.

수동 백업 스크립트는 실행 환경의 `TOWER_DB_PATH`를 사용하고 기본 보관 위치는 DB 옆의 `backups/`입니다. SQLite backup API와 무결성 검사를 사용합니다. 환경 파일을 읽는 명령과 Docker 백업은 [저장과 백업](../operations/BACKUPS.md)을 따릅니다.

1차 완성 이후 정기 백업 주기·보관 개수를 정합니다. 지금은 자동 주기 백업을 추가하지 않습니다. 기존 실제 저장 백업과 테스트용 DB를 구분합니다.

[계정·가져오기](../operations/ACCOUNTS.md) · [배포·복구](../operations/DEPLOYMENT.md)
