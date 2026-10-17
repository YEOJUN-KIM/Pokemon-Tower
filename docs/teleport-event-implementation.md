# 랜덤 텔레포트 구현 보고

기준 커밋: `c909a9b7ab6bb4514f05ddd1a8d00b9dc035e668` (작업 시작 시 GitHub HEAD와 일치).

## 동작

- `random-teleport`를 기존 이벤트 registry, RunEvents, RunEventScene/Panel에 연결했다.
- 목적지는 서버에서 이벤트 생성과 같은 트랜잭션 안에 한 번만 추첨한다. 선택 전 응답에는 목적지 필드를 포함하지 않는다.
- 순간이동 선택 → 공간 왜곡 연출 → `N층에 도착했다!` → 계속하기 → 기존 출전 준비 화면 순서다.
- reduced-motion이면 연출 대기와 애니메이션을 생략한다.
- 이동은 `runs.floor`만 바꾼다. 멤버, 프로필, 코인, Bag, TM, 장비, 훈련, 구매 이력을 되돌리지 않는다. HP/상태/PP를 별도로 회복하는 동작도 없다.
- 이동 직후 이벤트를 추첨하거나 배틀을 생성하지 않는다. 이후 `enter/createBattle`을 사용한다.
- 같은 층도 재추첨하지 않는다. 도착 확인 후 새 조우로 시작한다.
- 50/100층도 그대로 허용하며 기존 theme/route/champion 및 필요한 후속 보스전을 이용한다.

## DB v43

| 대상 | 변경 |
| --- | --- |
| battles | `encounter_order` 저장. UNIQUE를 `(run_id, encounter_order, stage, attempt)`로 변경 |
| run_events | `encounter_order` 저장. `UNIQUE(run_id, after_floor)` 제거 |
| run_encounter_progress | 런별 정상 타워 전투 완료 횟수 `cleared_count` 저장 |
| teleport_events | event_id FK와 segment, origin_floor, destination_floor 저장 |

기존 ID와 모든 보상·영입·액션·특수 이벤트의 battle/event FK를 보존한 채 부모 테이블을 트랜잭션으로 재구축한다. FK는 트랜잭션 밖에서 잠시 비활성화하고, 재구축 후 `foreign_key_check`를 수행하고 다시 활성화한다. 오류는 롤백된다.

기존 저장 데이터는 당시 단조롭게 진행하던 floor/stage와 동일 seed/opponent 팀 정보를 이용해 조우 순서를 복원한다. 같은 seed/team의 retry는 같은 조우로 묶고, 같은 층의 Raid/Challenger와 일반 전투는 구분한다. 기존 이벤트 시점과 정상 진행 횟수는 당시 after_floor/floor에서 한 번만 이관한다. 이후 시간 계산에는 층을 쓰지 않는다.

## 조우 순서와 재방문

- 새 일반/네임드/Raid/Challenger 전투: 런의 최대 encounter_order + 1, attempt 0.
- retry: 직전 전투의 encounter_order/상대/seed를 유지하고 해당 조우의 attempt만 증가한다. 기존 재시도 비용·횟수·영입·보상 처리는 유지한다.
- currentBattle, 출전 추천 팀, 최근 기술/개체값 영입 결과는 encounter_order와 attempt로 조회한다.
- NPC 최근 이력은 `recentEncounters()`에서 encounter_order 내 최신 attempt 하나만 남기고 실제 최근 3개 조우를 가져온다. retry가 최근 이력 3칸을 차지하지 않는다.
- 기존 NPC·specialty 회피 규칙은 그대로 두고 위 이력을 전달한다.
- 일반층 재방문은 기존 생성기를 새 랜덤 seed로 실행한다. 5층 네임드는 기존 run + floor deterministic 배치를 그대로 사용한다.
- 보상과 영입은 기존 battle_id receipt에 연결되어 새 방문마다 정상 처리된다.
- Mirror의 동일 층 후보 조회도 encounter_order 우선으로 바꿨다.

## 이벤트 순서와 cooldown

이벤트의 encounter_order는 **정상 타워 전투 완료 횟수**를 snapshot한다. 전투 테이블의 encounter_order는 특수 전투도 포함하는 전체 조우 순서이고, cooldown용 정상 진행 횟수와는 별도의 시계다.

Raid 영입이나 Challenger 보상은 정상 타워 진행 횟수를 증가시키지 않는다. retry 역시 진행을 증가시키지 않으며, 정상 전투의 승리 후 영입 처리를 마쳐야 진행 횟수가 증가한다. 이벤트 간격은 현재 cleared_count와 과거 이벤트의 저장된 순서를 비교한다. 따라서 39층 이벤트 뒤 11층으로 이동해도 음수 층 차이로 막히지 않는다.

동일 floor의 과거 이벤트를 여러 건 저장할 수 있다. 한 런에 pending 이벤트 하나만 허용하는 partial unique index는 유지한다.

## 텔레포트 snapshot과 1회 제한

```ts
type TeleportEventSnapshot = {
  segment: 1 | 2;
  originFloor: number;
  destinationFloor: number;
};
```

- A: 발생층 1~48, 목적지 1~50.
- B: 발생층 51~98, 목적지 51~100.
- 49/50/99/100은 추첨 대상에서 제외한다.
- 목적지는 각 구간의 50개 층 중 균등 추첨하며 현재 층도 포함한다.
- `teleport_events JOIN run_events`의 run + segment 기록 존재 여부로 재출현을 막는다. 기록은 등장 시 생성되므로 거절도 소비된다.
- 새로고침·재접속·서버 재시작 후 snapshot과 소비 기록이 유지된다.
- 선택/계속 요청의 중복 전달은 재추첨하거나 다시 적용하지 않는다. 과거 텔레포트 요청은 저장된 정상 진행 순서도 검사한다.

## 확률 및 기존 설정

- 다른 이벤트 weight, 전체 encounterPercent, cooldown 설정값, Raid minFloor/weight, Shiny 확률, 보상 수치를 변경하지 않았다.
- 텔레포트 임시 weight 10은 `src/data/teleport.ts`에 분리했다. 기존 v1 이벤트 런은 그대로 유지하고 v2에서 추가한다.
- 기존 공통 규칙인 **5층 단위 클리어 직후 이벤트 생략**도 유지했다. 따라서 해당 층에서 snapshot을 계산할 수 있더라도 실제 이벤트 생성은 기존 공통 gate를 따른다.
- 현재 `raidEventTestSettings={enabled:true,startFloor:3}`가 남아 있어 기본 경로에서는 3층부터 Raid 수동 QA override가 우선한다. 이 설정은 변경하지 않았다. 텔레포트 및 일반 이벤트 테스트는 registry 주입으로 override와 분리했다.
- 기존 per-floor 상점/구매 이력과 층 구간형 강화 의미는 유지했다. 재방문 시 구매 이력을 초기화하지 않는다. 후속 경제 설계 시 별도로 검토할 부분이다.

## 검증

- 전체 `node node_modules/tsx/dist/cli.mjs --test tests/*.test.ts`: **721 통과, 0 실패**.
- 최종 텔레포트 전용 재검증 `tests/teleport.test.ts`: **18 통과, 0 실패**.
- 관련 이벤트 회귀 묶음: **147 통과, 0 실패** (전체 테스트와 중복 포함).
- `node node_modules/@playwright/test/cli.js test e2e/teleport.spec.ts`: **2 통과, 0 실패**.
- 텔레포트 전용 테스트: 목적지 전체 범위, 금지층, 동일층/전진/후진/50/100 도착, 재접속, 두 구간의 등장/거절 소비, retry와 재방문 구분, 실제 최근 NPC 순서, cooldown, 동일층 이벤트 이력, v42 마이그레이션.
- Mystery Chest, Challenger, Hidden Shop, Raid 보상/영입, Mirror, normal progression 및 50/100 보스 관련 기존 테스트 실행.
- 데스크톱 1280px / 모바일 390px E2E 2건 통과. 목적지 숨김, 새로고침, 연출 후 공개, 동일층 도착, 기존 출전 준비 복귀, 가로 넘침 방지를 확인했다.
- 화면 산출물: `artifacts/qa/screenshots/teleport/arrival-1280.png`, `arrival-390.png`, `preparation-1280.png`, `preparation-390.png`.
- 실제 `.data/tower.sqlite` 원본은 readOnly로 열어 SQLite backup API로 복사했다. 복사본의 **v24 → v43** 마이그레이션, integrity_check, foreign_key_check가 모두 통과했다. 원본 저장 DB는 수정하지 않았다.
- TypeScript, CSS 구조 검사, 프로덕션 빌드 통과.

## 변경 파일

기능/DB/UI:

- `src/data/teleport.ts`
- `src/data/run-events.ts`
- `src/game/run-events.ts`
- `src/server/encounter-history.ts`
- `src/server/run-events.ts`
- `src/server/tower-store.ts`
- `src/server/mirror-challenger.ts`
- `src/server/schema.ts`
- `src/server/storage/migrations.ts`
- `src/web/event-presentation.ts`
- `src/web/run-event.tsx`
- `src/web/styles/run-event.module.css`

테스트/픽스처:

- `tests/teleport.test.ts`, `e2e/teleport.spec.ts`
- `tests/challenger-fixture.ts`, `tests/raid-fixture.ts`
- `tests/hidden-shop.test.ts`, `tests/run-events.test.ts`, `tests/raid-events.test.ts`
- `tests/battle-retry.test.ts`, `tests/split-route.test.ts`
- 스키마 버전 기대값 갱신: `tests/bag.test.ts`, `tests/boss.test.ts`, `tests/consumable-shop.test.ts`, `tests/form-moves.test.ts`, `tests/held-items.test.ts`, `tests/hundred-floor.test.ts`, `tests/mystery-chest.test.ts`, `tests/npc-ranks.test.ts`, `tests/rank-rewards.test.ts`, `tests/trainer-catalog.test.ts`, `tests/villain-campaign.test.ts`.

문서: `docs/teleport-event-implementation.md`.
