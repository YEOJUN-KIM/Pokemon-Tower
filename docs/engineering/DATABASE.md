# 저장 데이터

Node.js의 `node:sqlite`를 사용합니다. `src/server/schema.ts`와 `storage/migrations.ts`가 테이블·마이그레이션을 관리하고 코드가 지원하는 현재 스키마는 **39**입니다. 개별 DB·백업의 버전은 `PRAGMA user_version`으로 따로 확인합니다. v34는 이벤트 ID 제약을 애플리케이션으로 옮겼고, v35는 `result_json`과 이벤트 규칙 v2를 추가합니다. 기존 런의 v1과 대기·지급·완료 이벤트를 보존하며 새 활성 런만 v2를 사용합니다. [이벤트 확장 방법](EVENT_SYSTEM.md)을 참고하세요.

계정·세션, 플레이어 재화, 도감·육성, 도전·팀·도구, 상대·배틀·행동, 보상·정산 상태를 저장합니다. 서버가 소유권을 확인하고 자원 소비와 보상을 트랜잭션으로 처리합니다.

DB 경로는 `TOWER_DB_PATH`로 지정하며 기본값은 `.data/tower.sqlite`입니다. 로컬 개발의 실제 경로는 `.env.local`, 통합 실행기는 Docker 볼륨의 `/data/tower.sqlite`를 확인합니다. WAL 모드에서 `-wal`·`-shm` 파일도 사용하므로 실행 중 DB 파일만 따로 이동하거나 부속 파일을 삭제하지 않습니다.

수동 백업 스크립트는 실행 환경의 `TOWER_DB_PATH`를 사용하고 기본 보관 위치는 DB 옆의 `backups/`입니다. SQLite backup API와 무결성 검사를 사용합니다. 환경 파일을 읽는 명령과 Docker 백업은 [저장과 백업](../operations/BACKUPS.md)을 따릅니다.

1차 완성 이후 정기 백업 주기·보관 개수를 정합니다. 지금은 자동 주기 백업을 추가하지 않습니다. 기존 실제 저장 백업과 테스트용 DB를 구분합니다.

[계정·가져오기](../operations/ACCOUNTS.md) · [배포·복구](../operations/DEPLOYMENT.md)

선택 폼의 공통 성장·선택 상태는 `pokemon_training`을 사용합니다. `pokemon_form_training`은 `(player_id, form_species)`를 키로 기술 배치·선택 특성·테라 타입만 저장하며, IV·능력 포인트·성격·성별·이로치는 포함하지 않습니다. 읽을 때 공통 성장 데이터와 선택 폼의 설정을 조합합니다. 공통 revision으로 동시 저장을 검증하고 폼 변경·공통 육성·폼 설정 저장을 하나의 트랜잭션으로 처리합니다. v37은 현재 선택 폼의 기존 설정을 이전하며 생성된 배틀·행동·도전 스냅샷은 바꾸지 않습니다.

v38은 `run_npc_rules(run_id, version=1)`를 추가합니다. 새 런만 공통 NPC Sample·Normal/Elite/Master 생성 경로를 사용하며, 기존 런에는 표식을 부여하지 않습니다. 기존 배틀·도전자 후보·보상 snapshot을 재작성하지 않습니다. [NPC 저장 호환](NPC_TRAINING.md)을 참고하세요.

DB v39는 run_reward_inventory(이번 도전 보상 보관), reward_use_receipts(사용 요청별 영수증), reward_egg_tickets(플레이어별 슈퍼레어/이로치 알 티켓)를 추가합니다. 기존 snapshot JSON은 그대로 보존합니다. vitamin_purchases는 판매 종료 후에도 기존 섭취 한도·효과 복구와 보상 영양제 섭취 기록에 사용합니다.
