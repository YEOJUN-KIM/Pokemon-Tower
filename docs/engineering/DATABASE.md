# 저장 데이터

기준: 2026-10-23. Node.js `node:sqlite`를 사용하며 현재 코드가 지원하는 DB 스키마는 **47**다. `src/server/schema.ts`의 `PRAGMA user_version`과 `src/server/storage/migrations.ts`가 기준이다. 개별 저장·백업 버전은 `PRAGMA user_version`으로 별도 확인한다. 코드보다 새로운 DB는 열지 않는다.

## 서로 다른 버전

| 버전 | 의미·기준 |
|---|---|
| DB schema 47 | 테이블·제약·migration; 이벤트 종류 수나 AI 버전이 아님 |
| run_event_rules 1/2 | 런의 이벤트 규칙. 새 런은 `currentEventRulesVersion=2`, 과거 v1은 유지 |
| run_npc_rules 1 | 새 공통 Sample/Rank 생성 경로 표식. 기존 런에 소급 부여하지 않음 |
| NPC encounter snapshot 1/2 | 저장한 팀 구성/Rank의 직렬화 구조 |
| tower-policy-v13 및 이전 버전 | 배틀 행동 정책. 배틀 행의 버전을 그대로 복구 |

규칙 버전을 올리거나 현재 상수 값을 바꿨다는 이유로 기존 결과 JSON/팀/시드/영수증을 재작성하지 않는다. schema 46은 run_villain_tracks·run_event_followups·tool_voucher_draws를 포함한다. schema 47은 `player_tutorial.selected_species`를 추가하여 첫 선택 대상을 파티에서 제외한 뒤에도 보존한다. 기존 안내의 첫 선택이 파티에 남아 있으면 복구하며, 이미 사라진 대상은 임의의 스타터로 채우지 않는다.

## 저장 책임과 트랜잭션

계정·세션, 재화, 수집·성장·선택 폼, 런·파티·장비·배낭, 배틀·행동·진행 순서, 이벤트 상태·보상·구매 영수증을 저장한다. `storage/transaction.ts`의 `BEGIN IMMEDIATE`/COMMIT/ROLLBACK에서 소유권·결제·지급·영수증·완료 상태를 함께 처리한다. 잔액이 충분한 경우에만 갱신하는 SQL과 요청 ID를 함께 유지한다.

`storage/migrations.ts`는 테이블 보강·부모 테이블 재작성·데이터 복사·인덱스 복원·폼/수집 복구를 기존 순서로 실행한다. 필요한 구간에서만 트랜잭션 밖에서 외래키를 잠시 끄고, 복사 후 `foreign_key_check`와 재활성화를 수행한다. 초기화 콜백과 이전 순서를 임의로 바꾸지 않는다.

## 주요 현재 저장 구조

- `run_events`: `kind`는 콘텐츠 문자열이며 특정 이벤트 목록을 DB CHECK로 고정하지 않는다. 서버 registry가 종류와 선택 ID를 검증한다. 이벤트당 `choice_id`, `result_json`, 지급 상태와 실제 보상을 보존하고 런당 진행 중 이벤트 하나를 고유 인덱스로 보장한다.
- `challenger_encounters`, `raid_encounters`, `villain_event_encounters`, `hidden_boss_events`: 발생 시 팀·시드·보상 snapshot과 현재 시도 battle_id. 도전/승리/재도전 처리는 기존 snapshot을 사용한다.
- `event_reward_selections`, `run_reward_inventory`, `reward_use_receipts`, `reward_egg_tickets`: 서버 보상 후보·소모·반복 요청·전용 알 티켓. 클라이언트가 보상 효과를 정하지 않는다.
- `hidden_shop_events`: 상품·재화·가격·effect·구매 여부/한도를 하나의 JSON으로 보존한다.
- `run_encounter_progress`와 battles/run_events의 `encounter_order`: 순간이동으로 층을 재방문해도 통과 순서·쿨다운·전투 시도를 구분한다. 재도전 횟수는 `run_retries.used`이며 배틀 attempt와 혼동하지 않는다.
- `teleport_events`: 구간별 목적지와 원래 층을 고정 저장한다.
- `run_villain_tracks`, `run_event_followups`, `tool_voucher_draws`: 신규 독립 조직 트랙·이벤트 snapshot·도구 교환 후보/사용 회차를 저장한다. 45→46에서 추가하며 기존 snapshot을 다시 만들지 않는다. [빌런 트랙](VILLAIN_CAMPAIGNS.md).
- `run_organization_campaigns`: 과거 v1 로켓단 호환용. 런별 조직 단서·간부·보스 진행. 일반층의 옛 빌런 독립 추첨 대신 이벤트 캠페인이 사용한다.
- `pokemon_training`은 공통 성장/폼 선택, `pokemon_form_training`은 폼별 기술·특성·테라 타입을 보존한다. 공통 revision으로 동시 저장을 검증한다.
- 공통 배낭은 기존 인벤토리/영수증을 재사용한다. 영양제 판매가 종료돼도 섭취 ledger·효과·소모 기록을 삭제하지 않는다.

## 실제 저장·이전

DB 경로는 `TOWER_DB_PATH`, 기본값은 `.data/tower.sqlite`다. 개발은 `.env.local`, 개인 실행기는 Docker 볼륨 `/data/tower.sqlite`를 확인한다. 둘은 별개 저장이다. WAL에서 실행 중 DB만 복사하거나 `-wal`/`-shm`을 삭제하지 않는다.

백업은 SQLite backup API와 무결성 검사 경로를 사용한다. 실제 저장은 감사/테스트에 사용하지 않는다. [저장·백업](../operations/BACKUPS.md), [이전](../operations/COMPUTER_MOVE.md), [계정](../operations/ACCOUNTS.md)을 따른다.

## 자동 검증

`tests/run-events.test.ts`, `mystery-chest.test.ts`, `raid-events.test.ts`, `teleport.test.ts`, `rocket-campaign.test.ts`, `hidden-boss-events.test.ts`에서 과거 스키마 이전·재접속·같은 보상 중복 방지·오류 롤백을 검사한다. 일반 배틀·재도전·도전자·배낭·상점 검사도 각 저장 snapshot을 검증한다. [이벤트 개발](EVENT_SYSTEM.md)에서 수정 범위별 검사를 확인한다.
