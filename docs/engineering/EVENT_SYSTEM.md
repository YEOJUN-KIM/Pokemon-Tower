# 이벤트 확장 방법

기준: 2026-10-20. 일반 랜덤 이벤트는 전체 발생 판정, 종류 선택, 내부 결과 선택을 별도로 관리한다. 로켓단 전용 후보 제한·3층부터 강제 Raid 같은 수동 QA 우회는 제거했다.

## 세 단계 확률의 기준

| 단계 | 수정 위치 | 의미 |
|---|---|---|
| 전체 발생 15%·쿨다운 2 | `src/data/run-events.ts`의 `eventEncounterSettings` | 적격 일반층에서 이벤트를 만들지 판정 |
| 이벤트 종류 weight | 같은 파일의 `eventDefinitions`, 각 이벤트 data 설정 | 발생한 이벤트 중 종류를 상대 가중치로 추첨 |
| 선택 후 내부 결과 | `legacyChestRewards`, `mysteryChestResults`, 각 콘텐츠의 보상/후보 표 | 해당 이벤트를 골랐을 때의 결과·팀·보상 추첨 |

`game/run-events.ts`의 `selectRunEvent`가 5의 배수 통과 층 제외, 통과 순서 쿨다운, 15% 판정, minFloor/minRulesVersion 및 적격 조건을 순서대로 처리한다. minFloor는 이미 통과한 afterFloor 기준이다. 쿨다운은 `order - previousOrder <= 2`에서 만남을 막는다. 순간이동으로 층 숫자가 줄거나 재방문해도 서버의 cleared_count/encounter_order를 사용한다. 같은 층 재도전은 새 통과로 중복 집계하지 않는다.

신규 런의 빌런은 data/villain-tracks.ts의 독립 확률/간격으로 판정한다. 일반 registry의 villain-campaign은 weight 0이며, 신규 캠페인이 있는 런은 옛 rocket-* 종류를 일반 후보에서 제외한다. [독립 트랙](VILLAIN_CAMPAIGNS.md)과 과거 로켓단 v1 경로를 혼동하지 않는다.

서버는 이미 대기 중인 이벤트를 다시 만들지 않으며 조직 진행·구간별 포탈 사용 여부를 적격 조건으로 추가한다. 고정 선물은 별도 난수를 소비하지 않는다. 기존 난수 소비 순서와 저장 결과를 보존한다.

## 종류와 조건

기본 비중은 상자 50, 브리더 15, 여행 상인 20다. v2에는 도전자 20, 히든상점 12, Raid 20, 순간이동 10, 조건을 만족한 로켓단 단계 100이 추가된다. **항상 이 합계로 나누는 것이 아니라 현재 적격한 종류끼리만 정규화**한다. 전역 확률과 종류 weight를 같은 퍼센트로 읽지 않는다.

- `data/challengers.ts`, `hidden-shop.ts`, `raids.ts`, `teleport.ts`는 각 콘텐츠의 종류 weight와 최소 조건을 제공한다.
- `data/villain-campaigns.ts`의 단계별 weight와 조건은 저장된 단서/간부/보스 상태로 필터링된다. 이 정의는 과거 로켓단 v1 캠페인 호환용이며 신규 독립 트랙의 발생률이 아니다.
- 포탈은 같은 챕터의 목적지를 snapshot하고 구간별 한 번만 등장한다. 49/50/99/100 통과 지점은 포탈 후보가 아니다.
- `hidden-boss`는 weight 0인 확정 챕터 완료 이벤트다. `TowerStore.scheduleHiddenBoss`/`server/hidden-boss-events.ts`에서 생성하며 일반 15% 추첨을 적용하지 않는다.
- Mirror는 별도 이벤트가 아니라 도전자 후보 생성 후 3%로 최대 한 슬롯을 교체한다.

## 규칙 버전과 기존 저장

`currentEventRulesVersion=2`는 **새 런**의 이벤트 규칙이다. 서버가 run_event_rules의 저장 버전을 선택기와 선택지 조회에 넘긴다. 기본 pure 함수 인자는 과거 v1이며 임의로 v2로 바꾸지 않는다.

v1 상자는 legacyChestRewards(80% 150코인 / 20% 티켓 1장), v2 상자는 mysteryChestResults(꽝/손실/보상 표)를 사용한다. minRulesVersion=2 종류는 v1에서 제외한다. DB schema 46와 이벤트 rules version 1/2는 별개다. 기존 대기·지급·완료 이벤트, 선택 ID·결과·영수증을 재작성하지 않는다.

## 처리 책임

| 위치 | 책임 |
|---|---|
| `data/run-events.ts` | registry·안내·선택지·cost·weight·내부 보상 표·공개 타입 |
| `game/run-events.ts` | DB·React 없는 선택·보상 추첨 |
| `server/run-events.ts` | 활성화·소유권·선택 ID·적격 조건·결제/결과/완료 저장·재요청 |
| `server/tower-store.ts` | 작업 트랜잭션·추가 전투 진입·승패/영입/층 진행 연결 |
| `server/challenger-events.ts`, `raid-events.ts`, `villain-campaigns.ts`, `hidden-boss-events.ts` | 각각 팀/보상 snapshot·battle 연결·진행 상태 |
| `game/rewards.ts` / `server/rewards.ts` | 순수 결과 계산 / 실제 공통 지급과 선택형 영수증 |
| `server/player-wallet.ts`, `inventory-grants.ts` | 기존 재화·아이템·TM·장비·티켓 지급 |
| `web/event-presentation.ts` | 이벤트 ID별 그림/초상화/연출 종류 매핑 |
| `web/run-event.tsx` | 하단 대화·선택지·연출과 서버 결과 표시 |
| `web/reward-modal.tsx`, `reward-panel.tsx` | 공통 보상 팝업·포커스·선택 표시. 실제 지급/추첨 없음 |

## 일반 이벤트를 추가하는 절차

1. registry에 고유 ID·title/intro/summary·weight·최소 조건·고유 선택 ID를 정의한다. 새 런 전용이라면 minRulesVersion=2를 지정한다.
2. 기존 `leave`, `reward`, `reward-result`로 표현되면 공통 경로를 재사용한다. 무료 고정 보상·유료 선택·다중 결과는 데이터만으로 연결할 수 있다.
3. `event-presentation.ts`에 그림/연출 매핑을 넣고 기본 run-event 화면에서 선택 ID가 전달되는지 검사한다.
4. ID 자체는 DB의 고정 CHECK 목록이 아니므로 새 ID만을 위한 migration은 필요 없다. 새 테이블/필드/제약이 필요한 경우에는 schema와 migration을 함께 추가한다.
5. rules/registry·재요청/롤백·v1 저장·PC/모바일 E2E를 실행한다. 임시 확인을 위해 운영 상수를 올리거나 후보를 강제하지 말고 테스트 registry/fixture를 주입한다.

## 새 outcome 또는 추가 전투를 넣을 때

`EventChoice` union → `findEventChoice` → `RunEvents.choose`의 상태/결제 처리 → `TowerStore.chooseEvent`의 배틀 진입/승패 후처리 → 공개 RunEventView/presentation/화면을 확인한다. 추가 전투는 기존 Showdown 세션·retry·공통 보상 경로를 재사용하고, 발생 시 팀/시드/보상을 snapshot한다. `outcome` 이름만 추가하고 서버의 owned/view/currentBattle/완료 처리 분기를 빠뜨리지 않는다.

새 보상 effect는 `data/rewards.ts`, `game/rewards.ts`, `server/rewards.ts`와 공통 inventory grant를 확장한다. 호출자는 소유권·트랜잭션·영수증을 소유한다. 비용 차감·결과 선택·지급·선택 ID 저장은 한 번에 커밋하고, 같은 요청에는 저장 결과를 반환하며 다른 선택으로 바꾸려는 요청은 거절한다.

## 자동 검사

- `tests/maintenance-settings.test.ts`: 15% 발생 경계·설정 범위·weight·선택 ID/결과 ID·비용 무결성.
- `tests/run-event-rules.test.ts`: v1 100개 weight 구간·난수 호출 순서·체크포인트·쿨다운·고정 선물 무추첨.
- `tests/raid-playtest.test.ts`: 실제 registry에서 강제 Raid/빌런 필터 없이 전체 발생률과 쿨다운 사용.
- `run-events.test.ts`, `mystery-chest.test.ts`, `challenger-events.test.ts`, `raid-events.test.ts`, `teleport.test.ts`, `rocket-campaign.test.ts`, `hidden-boss-events.test.ts`: 소유권·저장·복구·과거 migration·반복 요청·롤백 및 콘텐츠별 조건.
- `e2e/run-events.spec.ts`, `villain-campaign.spec.ts`, `teleport.spec.ts`, `named-pilot.spec.ts`: 실제 화면·API·조작·추가 전투 전환. 시뮬레이션 완료 fixture와 실제 엔진 실행 검사는 구분한다.
- `tests/architecture-boundaries.test.ts`: 게임→UI 구현 의존 차단.

[이벤트 규칙](../gameplay/EVENTS.md) · [DB/저장](DATABASE.md) · [NPC 입력](NPC_DATA.md) · [도전자](NPC_TRAINING.md) · [Mirror](MIRROR_CHALLENGER.md) · [Raid](RAID_EVENTS.md)
