# 도전자 선택전 1차 구현 보고

공개 참조 안내: Git에서 제외한 로컬 캡처는 링크 대신 경로로 표기한다. 캡처 파일은 공개 저장소에 포함하지 않는다.

기준: 2026-10-16, 시작 커밋 `ecef4e2026a2f66bb0e3f89f6c161940f212393c`.

## 1. 수정 파일

아래 소스·문서·테스트를 변경했습니다. 기존 마이그레이션 검사의 버전 기대값만 변경한 테스트도 포함합니다. 이 보고서 자체와 ignored QA 이미지·실행 로그는 목록 밖에 있습니다.

- [docs/STATUS.md](../../../docs/STATUS.md)
- [docs/current/ROADMAP.md](../../../docs/current/ROADMAP.md)
- [docs/engineering/EVENT_SYSTEM.md](../../../docs/engineering/EVENT_SYSTEM.md)
- [docs/gameplay/EVENTS.md](../../../docs/gameplay/EVENTS.md)
- [docs/gameplay/EVENT_CANDIDATES.md](../../../docs/gameplay/EVENT_CANDIDATES.md)
- [e2e/challenger-events.spec.ts](../../../e2e/challenger-events.spec.ts)
- [src/app/api/battle/route.ts](../../../src/app/api/battle/route.ts)
- [src/data/challengers.ts](../../../src/data/challengers.ts)
- [src/data/rewards.ts](../../../src/data/rewards.ts)
- [src/data/run-events.ts](../../../src/data/run-events.ts)
- [src/game/run-events.ts](../../../src/game/run-events.ts)
- [src/server/challenger-events.ts](../../../src/server/challenger-events.ts)
- [src/server/rewards.ts](../../../src/server/rewards.ts)
- [src/server/run-events.ts](../../../src/server/run-events.ts)
- [src/server/schema.ts](../../../src/server/schema.ts)
- [src/server/storage/migrations.ts](../../../src/server/storage/migrations.ts)
- [src/server/tower-service.ts](../../../src/server/tower-service.ts)
- [src/server/tower-store.ts](../../../src/server/tower-store.ts)
- [src/web/battle-game.tsx](../../../src/web/battle-game.tsx)
- [src/web/challenger-candidates.tsx](../../../src/web/challenger-candidates.tsx)
- [src/web/event-presentation.ts](../../../src/web/event-presentation.ts)
- [src/web/reward-modal.tsx](../../../src/web/reward-modal.tsx)
- [src/web/reward-panel.tsx](../../../src/web/reward-panel.tsx)
- [src/web/run-event.tsx](../../../src/web/run-event.tsx)
- [src/web/styles/challenger-candidates.module.css](../../../src/web/styles/challenger-candidates.module.css)
- [src/web/trainer-samples.ts](../../../src/web/trainer-samples.ts)
- [tests/battle-retry.test.ts](../../../tests/battle-retry.test.ts)
- [tests/boss.test.ts](../../../tests/boss.test.ts)
- [tests/challenger-events.test.ts](../../../tests/challenger-events.test.ts)
- [tests/challenger-fixture.ts](../../../tests/challenger-fixture.ts)
- [tests/consumable-shop.test.ts](../../../tests/consumable-shop.test.ts)
- [tests/held-items.test.ts](../../../tests/held-items.test.ts)
- [tests/hundred-floor.test.ts](../../../tests/hundred-floor.test.ts)
- [tests/mystery-chest.test.ts](../../../tests/mystery-chest.test.ts)
- [tests/run-events.test.ts](../../../tests/run-events.test.ts)
- [tests/trainer-catalog.test.ts](../../../tests/trainer-catalog.test.ts)
- [tests/villain-campaign.test.ts](../../../tests/villain-campaign.test.ts)

## 2. 상태 흐름

일반층 승리·영입 완료 → 추가 이벤트 발생 → 후보 정의 저장(choice) → 후보 선택·기존 BattleSession 배틀 생성(battle) → 승리 기본 보상 지급·결과 저장(reward) → pending 추가 보상 선택 → selected → 확인(complete) → 같은 다음 층 일반전 준비.

돌아간다는 전투·지급·차감 없이 현재 이벤트만 완료합니다. 이벤트 배틀은 층을 증가시키거나 일반층 배틀을 대체하지 않습니다. 이벤트 승리는 일반층 승리 횟수·성장 정산에 추가하지 않습니다.

## 3. 트레이너 구성

| 후보 ID | 이름 | 위험·스타일 | 기존 스프라이트 |
|---|---|---|---|
| easy | 신중한 브리더 | 쉬움 ★, 기본 공격·낮은 육성 | aromalady-gen4 |
| medium | 부유한 신사 | 보통 ★★, 균형형 | faba |
| hard | 숙련 전술가 | 어려움 ★★★, 엘리트 생성·강화 기술·도구 | acetrainer-gen4 |

현재 고정 역할 3명을 제시합니다. 이름·성향·위험·예상 보상을 PC 3열과 모바일 스크롤 목록에 같은 데이터로 표시합니다. 새로운 이미지는 만들지 않았습니다.

## 4. 테스트용 보상·등장

| 후보 | 확정 승리 보상 | 추가 선택 |
|---|---|---|
| easy | 300코인 | 없음 |
| medium | 700코인 + 알 뽑기권 1장 | 없음 |
| hard | 1,000코인 | 1,000코인 / 티켓 3장 / 500코인+티켓 1장 중 하나 |

전체 이벤트 추첨 10%·기존 쿨다운은 유지합니다. v2의 종류 가중치는 기존 50:30:20에 도전자 20을 추가해 총 120입니다. 도전자는 대상 층 기준 약 1.67%, 첫 통과 층부터 대상입니다. v1은 기존 세 이벤트 비중을 유지합니다. 값은 `challengerSettings`와 `challengers`에 있으며 UI에 지급 수치를 넣지 않았습니다.

## 5. 난이도 차등

현재 층에 -3/+3/+8을 적용한 기존 생성 층을 사용하되, 50층 챕터 경계를 넘지 않습니다. normal/normal/elite 생성, physical/balanced/setup 전술 및 포인트·IV 배율 0.6/1.1/1.4와 추가 HP 포인트 0/3/7을 사용해 초반에도 격차를 둡니다. 쉬움은 공격 위주이고 어려움은 룰이 허용하는 기존 도구를 보완합니다. IV 31, 포인트 개별 32·합계 66 한도는 유지합니다. 종·기술·육성은 층에 따라 바뀌며 상성까지 포함한 승률 순서를 보장하는 완성 밸런스는 아닙니다.

## 6. 기존 배틀 연결

TowerStore.createBattle의 선택적인 ChallengerDefinition으로 기존 상대 생성·팀 패킹·룰·장비·소모품·로그·BattleSession을 재사용합니다. 직전 출전 팀을 초기 3마리로 사용합니다. 같은 floor/stage에 새 attempt 슬롯을 배정하여 도전자 배틀 뒤 일반전을 별도 ID로 생성합니다. 재도전 소모량은 기존 run_retries.used가 관리하므로 이 슬롯 번호 때문에 횟수가 차감되지 않습니다.

## 7. 영입 제외·패배

검증된 서버 배틀 완료 콜백에서 현재 이벤트 battle_id를 확인합니다. 승리 시 공통 아이템 정산 후 이벤트 보상을 저장하고 select로 돌아가며 일반 rewards/recruitments 경로를 실행하지 않습니다. 클라이언트가 승자·보상을 보내는 API는 추가하지 않았습니다.

패배는 기존 lost·재도전 횟수·성장 정산 규칙입니다. 재도전은 기존 정비 UI를 거쳐 같은 상대 팀·시드를 복구하고 연결 battle_id를 갱신합니다. 무료 후보 재선택은 구현하지 않았습니다.

## 8. Reward Popup 재사용

RunEventPanel에서 기존 RewardModal → RewardPanel → RewardEntryList/RewardChoiceList를 그대로 사용합니다. tone·모바일 내부 스크롤·키보드 커서·모달 입력 차단을 유지합니다. pending이면 확인 버튼을 비활성화하고 선택하기에 초기 커서를 둡니다. 새 전용 보상창은 없습니다.

## 9. 서버 선택 저장·중복 방지

`RewardSelectionDefinition`은 효과가 있는 신뢰된 서버 정의이며 공개 `RewardCandidate`와 구분합니다. 승리 시 event_reward_selections에 실제 후보 ID·효과를 저장합니다. API는 selectionId/candidateId만 참조하며 클라이언트의 effects는 무시합니다.

공통 `server/rewards.ts:selectEventReward`는 저장된 후보를 검증하고 지급 결과 entries와 selectedId를 지갑 변경과 같은 TowerStore 트랜잭션으로 저장합니다. 동일 ID는 재지급하지 않고 다른 재선택은 409입니다. 결과 저장 실패 시 코인·티켓도 롤백합니다. 보상 선택 전 continue와 enter는 서버에서도 차단합니다.

## 10. 재접속·호환

DB v36은 challenger_encounters와 event_reward_selections를 추가합니다. 기존 v1/v2 이벤트 기록·배틀·지갑은 다시 쓰거나 재정산하지 않습니다. 후보 정의와 보상 효과는 저장 스냅샷을 사용하고 공개 view에서는 표시 필드만 전달합니다. 선택한 트레이너·배틀 팀·시드·행동·기본 보상·추가 후보·선택 완료는 새로고침 후 동일하게 유지됩니다.

## 11. 테스트·빌드 결과

- 도전자 신규 로직 검사 18개 통과. 후보·돌아가기·소유권·실제 3 VS 3 엔진 진입·복구·영입 제외·세 승리 보상·추가 보상 3종·중복·롤백·재도전·정상 능력 한도·50층 충돌을 검사합니다.
- 5층·40층 × 세 역할, 총 6개 실제 엔진 배틀을 끝까지 실행하고 기존 완료 콜백으로 정산했습니다.
- 관련 이벤트·Reward·재도전·아키텍처 검사 52개 통과. 공통 지급 함수 이동 후 영향 범위 30개도 통과했습니다.
- Chrome E2E 34개 통과: 새 도전자 5개와 기존 미스터리 상자·v1·브리더·상인 29개. 최종 빌드에서 도전자 5개를 다시 확인해 모두 통과했습니다.
- 배포 빌드, 타입 검사, CSS 검사, 문서/워크스페이스 검사, diff 공백 검사를 통과했습니다.
- 전체 병렬 실행은 마지막 520개 중 518개 통과·2개 실패입니다. battle-items-maintenance의 복구 후 랭크 기대값(0 != 1), gender의 Attract(N) 리플레이 시간 로그(|t:|) 비교입니다. 두 파일을 단독 재실행하면 각각 4개·5개 모두 통과했습니다. 첫 전체 실행에서도 무작위 보스 후보 일치 검사가 1회 실패했고 단독 재실행은 통과했습니다. 따라서 전체 테스트가 항상 통과한다고 보고하지 않습니다. 범위 밖 전투 검사 안정화는 별도 과제입니다.

UI 승리 결과는 테스트 전용 내부 완료 callback fixture를 사용해 결정론적으로 촬영했습니다. 실제 플레이 입력으로 모든 전투를 이긴 E2E라는 의미는 아닙니다.

QA: PC 후보 — `../../qa/screenshots/challengers/candidates-1280.png` (로컬 캡처, Git 미포함), 모바일 후보 — `../../qa/screenshots/challengers/candidates-390.png` (로컬 캡처, Git 미포함), 강한 후보 정보 — `../../qa/screenshots/challengers/hard-info-390.png` (로컬 캡처, Git 미포함), 쉬움 보상 — `../../qa/screenshots/challengers/reward-easy.png` (로컬 캡처, Git 미포함), 보통 보상 — `../../qa/screenshots/challengers/reward-medium.png` (로컬 캡처, Git 미포함), 어려움 보상 — `../../qa/screenshots/challengers/reward-hard.png` (로컬 캡처, Git 미포함), 선택 후보 — `../../qa/screenshots/challengers/reward-candidates-mobile.png` (로컬 캡처, Git 미포함).

## 12. TODO

- 사람의 실제 플레이로 난이도·코인/티켓 경제·등장 구간 조정.
- 무작위 컨셉 풀과 개별 가중치, 동적 위험도, 후보 수 확대.
- 실제 고급 도구·영양제 지급 풀은 미구현.
- 무료 후보 재선택 등 패배 정책 변경은 별도 검토.
- 레이드·새 빌런 캠페인·미러 매치·히든 상인 등 요청에서 제외한 이벤트는 구현하지 않았습니다.

## 13. 이후 확장 위치

`src/data/challengers.ts`의 배열에 TrainerSample 설정·스프라이트·스타일·층/육성 보정·보상 정의를 추가합니다. 현재는 배열 전체를 저장하는 고정 후보 정책이며 무작위 컨셉 풀을 도입할 때는 이벤트 생성 시 후보 샘플링만 추가하고 결과 스냅샷을 저장하면 됩니다.

기존 코인/티켓 보상은 RewardOption과 RewardSelectionDefinition, 공통 서버 지급·선택 완료 처리, RewardModal/RewardChoiceList를 그대로 재사용합니다. 새로운 보상 효과 종류만 공통 effect 해석과 지급 경로를 별도로 확장합니다.
