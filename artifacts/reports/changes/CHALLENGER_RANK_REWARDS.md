# Normal / Elite / Master 도전자 Reward 확장

기준: 2026-10-16. 시작 커밋 `2ab9605`. NPC Sample·Rank·전투 난이도·팀 생성·AI는 유지하고 보상만 별도 확장했습니다. 추가 요청에 따라 10층 정비의 영양제 판매도 제거했습니다.

## 1. Normal 최종 풀

소소한 보상. 300 타워 코인 70% / 기존 공통 알 뽑기권 1장 30%. 하나만 자동 지급하며 선택 UI는 없습니다. 별도 일반 알 화폐를 만들지 않고 기존 알 뽑기권을 사용합니다.

## 2. Elite 최종 풀

희귀한 보상. 6개 보상 묶음 중 하나를 자동 지급합니다. 영양제 묶음만 서로 다른 1~2개 항목이며 플레이어가 보상 후보를 고르지 않습니다.

## 3. Elite 가중치

| 보상 묶음 | 가중치·확률 |
|---|---|
| 타워 코인 | 30 / 30% |
| 공통 알 뽑기권 | 25 / 25% |
| 영양제 세트 | 15 / 15% |
| 성장 포인트 | 10 / 10% |
| 에픽 지닌 도구 교환권 | 8 / 8% |
| 기술머신 | 12 / 12% |

합계 100. UI·NPC Sample에 지급 수치를 분산하지 않고 `rankRewardProfiles`에서 조정합니다.

## 4. Elite 코인

1,500 타워 코인입니다. 일반 소모품 300코인, unique/epic TM 600/975코인 및 상위 도구 가격을 참고한 테스트값입니다. Normal 300코인보다 5배 높습니다. 적격 TM이 없을 때의 대체 보상도 snapshot 당시 1,500코인입니다.

## 5. Elite 영양제

종류 수 1/2를 각 50%로 추첨합니다. 맥스업(hp)·타우린(atk)·사포닌(def)·리보플라빈(spa)·키토산(spd)·알칼로이드(spe) 6종에서 중복 없이 뽑고 각각 1개만 지급합니다.

이번 런 보관함에 저장하며 출전 준비에서 대상을 선택합니다. 기존 +5 포인트·한 포켓몬당 도전 중 총 3개·과거 섭취 기록과 런 보너스를 유지합니다. 기존 ledger의 층/종류 중복 제약도 유지하므로 같은 층에서 같은 종류를 다시 쓰려면 다음 층 준비까지 기다립니다. 영구 도감의 기본 육성값을 덮어쓰지 않습니다.

10층 정비 상점의 영양제 상품·육성 탭을 삭제했습니다. 이전 purchase-vitamin 요청도 코인 차감/효과 없이 409로 거절합니다. 기존 상품/구매 기록을 삭제하거나 이미 사용한 효과를 되돌리지 않습니다. 일반 지닌 도구·소모품·TM 판매와 포켓몬 조정은 그대로입니다.

## 6. Elite 영구재화

기존 **성장 포인트 300P**를 지급합니다. 알 1회 200P, 리롤/재도전 확장 500~1,500P를 참고했습니다. IV·성격·특성용 신규 교환권은 없습니다. 기존 성장 포인트 사용 규칙을 그대로 따릅니다.

## 7. Elite 에픽 도구

교환권 1장을 런 보관함에 자동 지급합니다. 효과 snapshot에 실제 에픽 도구 후보 ID 목록과 모두 보유 시 대체 코인 수량도 저장합니다. 출전 준비에서 한 도구를 골라 기존 run_item_bag에 넣고 기존 지닌 도구 관리에서 장착합니다.

기존 `itemShopRule(...).rarity === 'epic'`에서 유도하는 실제 풀: Life Orb, Choice Band, Choice Specs, Choice Scarf, Focus Sash, Assault Vest, Eviolite, Booster Energy, Loaded Dice, Power Herb, Weakness Policy (11개). 현재 룰 부적격 도구는 제외합니다. 이미 가방/포켓몬이 보유한 도구는 교환 선택에서 제외하며 전부 보유하면 저장된 1,500코인 대체 보상을 한 번 지급합니다. 트레이너 장비는 이 풀에 넣지 않습니다.

## 8. Elite 기술머신

기존 Machine Shop의 unique/epic 등급에서 현재 파티가 배울 수 있는 미수집 기술 1개를 후보 생성 시 확정합니다. 보관함에서 합법적인 대상을 고르면 기존 move_unlocks로 영구 해금하고 정비에서 장착할 수 있습니다. 새 TM 재화는 없습니다. 사용할 대상이 당장 없어져도 보관하며 이후 멤버가 배우면 사용할 수 있습니다.

필터 전 풀(24개): Substitute, Toxic, Will-O-Wisp, Swords Dance, Calm Mind, Bulk Up, Flamethrower, Fire Blast, Thunderbolt, Ice Beam, Scald, Giga Drain, Sludge Bomb, Psychic, Shadow Ball, Earthquake, Stone Edge, U-turn, Volt Switch, Close Combat, Draco Meteor, Overheat, Leaf Storm, Nasty Plot. 현재 폼의 합법성·현재/기본 기술·기존 수집 기록을 검사합니다. 후보 생성 시 적격 기술이 하나도 없으면 1,500코인으로 고정합니다.

## 9. Master 후보 생성

특별한 보상. 기본 코인 별도 지급 없이 **알 / 영구재화 / 장비**의 실제 후보 3개 중 하나만 선택합니다. 선택 전에는 지급하지 않습니다. 카테고리·후보 수는 데이터에서 관리하고 효과 생성은 카테고리별로 분리했습니다. 향후 카테고리가 늘면 서로 다른 카테고리를 가중 비복원 추첨하는 정책을 추가할 수 있습니다. 현재는 세 카테고리를 하나씩 보장합니다.

## 10. Master 알 가중치

| 알 후보 | 가중치·확률 |
|---|---|
| 공통 알 뽑기권 10장 | 60 / 60% |
| 슈퍼레어 알 티켓 1장 | 35 / 35% |
| 이로치 알 티켓 1장 | 5 / 5% |

이 비율은 Master의 알 후보를 정하는 비율이며 공통 알 기계의 등급/이로치 확률을 변경하지 않습니다. 특수 티켓은 플레이어별로 영구 보관합니다. 기존 영구 상점 알 탭에서 티켓 1장으로 기존 superRare/shiny 알을 무료 부화하며 성장 포인트나 공통 티켓을 소비하지 않습니다. 부화는 기존 풀·IV·기술·이로치·수집·결과 화면과 permanent_receipts를 사용합니다. 전용 티켓 판매·알 시스템 리팩터링은 없습니다.

## 11. Master 영구재화

성장 포인트 **1,500P**, Elite의 5배입니다. 선택했을 때만 지급합니다. 재도전 3단계의 높은 가격 및 여러 알/육성 선택을 참고한 테스트값입니다.

## 12. Master 장비와 중복

현재 룰에서 사용 가능한 미보유 **Dynamax Band(다이맥스밴드), Tera Orb(테라스탈오브)** 중 하나를 서버에서 확정합니다. 선택하면 기존 run_trainer_equipment에 직접 지급합니다. 지닌 도구 가방이나 포켓몬 슬롯을 차지하지 않습니다.

발생 뒤 다른 경로로 같은 장비를 먼저 얻었다면 저장된 대체값 1,500P를 지급하고 실제 결과도 성장 포인트 항목으로 표시합니다. 모두 보유했거나 해당 룰에 적격 장비가 없으면 발생 시 장비 후보를 5,000 타워 코인으로 고정합니다. 현재 폼·룰 기믹/사용권은 기존 정책을 따릅니다.

## 13. Snapshot 시점과 NPC 유지

ChallengerEvents.create에서 후보 3명·Rank·팀을 기존과 동일하게 만든 다음 실제 보상을 생성해 **같은 candidates_json**에 저장합니다. 신규 snapshot에 rewardSnapshotVersion=2를 표시합니다. reward 난수는 `eventId:reward:sampleId` 해시로 분리하므로 기존 NPC 추첨과 팀 난수를 소비하지 않습니다. 기존 룰 런에서 앞으로 생성하는 레거시 NPC 후보도 전투 경로는 유지하고 기존 보상 tier를 새 Rank 보상에 대응합니다.

Normal은 코인/티켓, Elite는 종류·수량·중복 없는 영양제·구체 TM·교환 풀, Master는 세 후보와 각 효과를 모두 발생 때 확정합니다. 승리/재도전/새로고침 시 새 추첨이나 최신 경제 데이터 재적용을 하지 않습니다. 실제 부화 포켓몬은 기존 티켓처럼 사용할 때 기존 알 엔진이 정합니다.

## 14. 카드 문구

Normal: **소소한 보상**. Elite: **희귀한 보상**. Master: **특별한 보상**. 헤더는 짧게 '보상'입니다. 수량·보상 종류·효과·내부 reward ID는 공개 projection과 카드에서 숨깁니다. 과거 저장 후보 카드도 표시 문구만 축약하고 지급 내용은 변경하지 않습니다.

## 15. RewardModal

기존 RewardModal/RewardPanel/RewardChoiceList를 재사용했습니다. 새 항목 종류의 한국어 출력과 선택 그룹의 optional expanded만 추가했습니다. Normal/Elite는 실제 결과 후 확인만, Master는 세 후보가 펼쳐져 보이고 하나를 선택해야 확인할 수 있습니다. 기존 키보드·모달 차단·모바일 내부 스크롤을 유지합니다.

추가 UI는 출전 준비의 작은 보상 보관함과 기존 알 탭의 보상 티켓 사용 버튼입니다. 별도의 이벤트 전용 보상창을 만들지 않았습니다.

## 16. Exactly-once·트랜잭션

승리 기본 보상·결과/선택 상태·배틀 완료는 기존 TowerStore 트랜잭션에서 커밋합니다. Master 선택은 event_reward_selections의 서버 정의와 result_json의 selectedId를 사용하며 클라이언트는 ID만 제출합니다. 같은 선택은 재지급하지 않고 다른 선택은 거절합니다. HTTP effects 필드는 무시합니다.

보관함도 entryId/choiceId/requestId만 받습니다. 효과 적용·quantity 감소·reward_use_receipts를 같은 트랜잭션에서 저장합니다. 잘못된 대상·이미 수집한 기술·한도 초과·소진 항목은 거절합니다. 영양제·도구·TM 지급/장비 지급에 작은 공통 grant 함수를 사용하고 기존 상점의 도구·TM·장비 지급도 이를 재사용합니다. 알 전용 티켓 사용도 기존 영수증과 소비·수집을 같은 트랜잭션에서 저장합니다.

## 17. 기존 저장 호환

DB v39는 런 보관함·사용 영수증·플레이어별 전용 알 티켓 테이블만 추가합니다. 기존 challenger_encounters JSON이나 이미 지급한 결과를 수정하지 않습니다. 진행 중 low 300 / medium 700+티켓 / high 옛 선택 보상 및 초기 easy/medium/hard/8종 후보는 원래 보상을 지급합니다. 기존 영양제 효과·배틀·일반 이벤트·도구·장비·알 영수증을 유지합니다. v38 복구 시 후보 JSON byte 보존과 원래 700+티켓 지급을 검사했습니다.

## 18. 검증

- 새 보상 검사 21개 통과: 가중치 전 범위, Normal 2종, Elite 6종, 수량 범위, 영양제 비복원·한도, 실제 가방/TM/장비/성장/전용 티켓, Master 3카테고리·1회 지급·선택 거절·복구, 티켓 부화, 장비/도구 대체, 지급/사용 영수증 롤백, 판매 종료, 생산 후보 snapshot/원래 팀 난수 유지, 경제 데이터 변경 격리, v38 호환.
- 관련 이벤트·NPC·상점·기존 알·지닌 도구 회귀 묶음 93개 통과. 영양제 회귀는 보상 사용으로 옮겨 기존 실제 배틀 능력치·리플레이·포켓몬당 3개·정비 보존을 유지했습니다.
- Chrome: 기존/Rank 도전자·상자 21개와 새 Reward 5개 통과. 최종 새 Reward 5개 및 정비 상점 PC/모바일 2개도 모두 통과해 고유 28개 화면/API 경로를 확인했습니다. 화면에서 보상 비공개, 승리 결과, 실제 보관함 사용, 슈퍼레어 무료 부화, 중복 API, 영양제 판매 제거와 TM/도구 리롤 보존을 검사했습니다. 초반 QA의 구형 보상 fixture·옛 버튼명·게스트 인증 가정은 현재 흐름에 맞춰 수정한 뒤 재검증했습니다.
- 배포 빌드·타입·CSS·워크스페이스·diff 검사를 통과했습니다.
- 전체 테스트 1차 병렬 실행은 604개 중 603개 통과, trainer-catalog 파일 worker가 상세 assertion 없이 실패했습니다. 파일 단독 재실행 7개는 모두 통과했습니다. 동시 실행 2로 줄인 재검사는 보고된 602개 중 601개 통과, run-events 파일 worker가 같은 식으로 실패했고 파일 단독 13개는 모두 통과했습니다. 전체 묶음이 안정적으로 전부 통과했다고 보고하지 않습니다. worker 종료 원인은 이번 출력만으로 확정하지 못했습니다.

QA 이미지는 [PC 기대 문구](../../qa/screenshots/rank-rewards/previews-1280.png), [모바일 기대 문구](../../qa/screenshots/rank-rewards/previews-390.png), [PC Master](../../qa/screenshots/rank-rewards/master-1280.png), [모바일 Master](../../qa/screenshots/rank-rewards/master-390.png), [Elite 영양제](../../qa/screenshots/rank-rewards/elite-vitamin.png), [Elite 교환권](../../qa/screenshots/rank-rewards/elite-epic.png), [Elite TM](../../qa/screenshots/rank-rewards/elite-machine.png)에 있습니다. UI 승리는 테스트 전용 내부 완료 callback fixture를 사용했으며 클라이언트 승패 입력 API는 없습니다.

## 19. 변경 파일

- [docs/STATUS.md](../../../docs/STATUS.md)
- [docs/current/ROADMAP.md](../../../docs/current/ROADMAP.md)
- [docs/engineering/DATABASE.md](../../../docs/engineering/DATABASE.md)
- [docs/engineering/EVENT_SYSTEM.md](../../../docs/engineering/EVENT_SYSTEM.md)
- [docs/engineering/NPC_TRAINING.md](../../../docs/engineering/NPC_TRAINING.md)
- [docs/gameplay/EGGS.md](../../../docs/gameplay/EGGS.md)
- [docs/gameplay/EVENTS.md](../../../docs/gameplay/EVENTS.md)
- [docs/gameplay/EVENT_CANDIDATES.md](../../../docs/gameplay/EVENT_CANDIDATES.md)
- [docs/gameplay/ITEMS.md](../../../docs/gameplay/ITEMS.md)
- [e2e/challenger-events.spec.ts](../../../e2e/challenger-events.spec.ts)
- [e2e/hundred-floor.spec.ts](../../../e2e/hundred-floor.spec.ts)
- [e2e/rank-rewards.spec.ts](../../../e2e/rank-rewards.spec.ts)
- [e2e/shop-reroll.spec.ts](../../../e2e/shop-reroll.spec.ts)
- [src/app/api/battle/route.ts](../../../src/app/api/battle/route.ts)
- [src/data/challenger-rewards.ts](../../../src/data/challenger-rewards.ts)
- [src/data/challengers.ts](../../../src/data/challengers.ts)
- [src/data/permanent-upgrades.ts](../../../src/data/permanent-upgrades.ts)
- [src/data/reward-inventory.ts](../../../src/data/reward-inventory.ts)
- [src/data/rewards.ts](../../../src/data/rewards.ts)
- [src/server/challenger-events.ts](../../../src/server/challenger-events.ts)
- [src/server/challenger-rewards.ts](../../../src/server/challenger-rewards.ts)
- [src/server/inventory-grants.ts](../../../src/server/inventory-grants.ts)
- [src/server/permanent-shop.ts](../../../src/server/permanent-shop.ts)
- [src/server/reward-inventory.ts](../../../src/server/reward-inventory.ts)
- [src/server/rewards.ts](../../../src/server/rewards.ts)
- [src/server/schema.ts](../../../src/server/schema.ts)
- [src/server/storage/migrations.ts](../../../src/server/storage/migrations.ts)
- [src/server/tower-service.ts](../../../src/server/tower-service.ts)
- [src/server/tower-store.ts](../../../src/server/tower-store.ts)
- [src/shared/contracts.ts](../../../src/shared/contracts.ts)
- [src/web/challenger-candidates.tsx](../../../src/web/challenger-candidates.tsx)
- [src/web/permanent-shop.tsx](../../../src/web/permanent-shop.tsx)
- [src/web/reward-inventory.tsx](../../../src/web/reward-inventory.tsx)
- [src/web/reward-panel.tsx](../../../src/web/reward-panel.tsx)
- [src/web/run-maintenance.tsx](../../../src/web/run-maintenance.tsx)
- [src/web/tower-controls.tsx](../../../src/web/tower-controls.tsx)
- [src/web/tower-shop.tsx](../../../src/web/tower-shop.tsx)
- [tests/battle-items-maintenance.test.ts](../../../tests/battle-items-maintenance.test.ts)
- [tests/battle-retry.test.ts](../../../tests/battle-retry.test.ts)
- [tests/boss.test.ts](../../../tests/boss.test.ts)
- [tests/consumable-shop.test.ts](../../../tests/consumable-shop.test.ts)
- [tests/form-moves.test.ts](../../../tests/form-moves.test.ts)
- [tests/held-items.test.ts](../../../tests/held-items.test.ts)
- [tests/hundred-floor.test.ts](../../../tests/hundred-floor.test.ts)
- [tests/mystery-chest.test.ts](../../../tests/mystery-chest.test.ts)
- [tests/npc-ranks.test.ts](../../../tests/npc-ranks.test.ts)
- [tests/playtest-oct13.test.ts](../../../tests/playtest-oct13.test.ts)
- [tests/rank-reward-fixture.ts](../../../tests/rank-reward-fixture.ts)
- [tests/rank-rewards.test.ts](../../../tests/rank-rewards.test.ts)
- [tests/reward-inventory-fixture.ts](../../../tests/reward-inventory-fixture.ts)
- [tests/run-events.test.ts](../../../tests/run-events.test.ts)
- [tests/shop-economy.test.ts](../../../tests/shop-economy.test.ts)
- [tests/shop-reroll.test.ts](../../../tests/shop-reroll.test.ts)
- [tests/trainer-catalog.test.ts](../../../tests/trainer-catalog.test.ts)
- [tests/villain-campaign.test.ts](../../../tests/villain-campaign.test.ts)

이 보고서와 ignored QA 이미지/실행 로그도 생성했습니다. 일부 기존 마이그레이션 테스트는 기대 스키마 버전만 39로 갱신했습니다.

## 20. 후속 밸런싱

- Normal 300코인 및 70/30, Elite 1,500코인·300P·6종 가중치.
- Master 10장/특수 알 60/35/5, 1,500P, 장비 중복 1,500P·적격 장비 없음 5,000코인.
- 총 이벤트 10%·도전자 기존 가중치는 변경하지 않았습니다. 고정 영양제 판매 제거로 런 전체 수급량이 줄 수 있으므로 실제 100층 플레이에서 Elite 15% 영양제 수급·도전 선택 빈도·장비 획득 시점을 함께 확인해야 합니다.
- 향후 Master 카테고리를 늘릴 때 가중 비복원 추첨, 추가 장비/보상 풀을 검토합니다. 현재는 서로 다른 세 카테고리를 보장합니다.
- 레이드·미러·빌런·새 AI·NPC Rank 밸런스·알 시스템 리팩터링은 구현하지 않았습니다. 새 영양제 상인 이벤트도 후속입니다.
