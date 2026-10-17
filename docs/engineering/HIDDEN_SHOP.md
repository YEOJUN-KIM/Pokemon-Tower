# 히든상점 구현 보고

기준: 2026-10-16. 수치는 초기 테스트값입니다. 전체 이벤트 구현 후 경제 밸런스를 함께 조정합니다. 플레이 규칙과 가격표는 [이벤트](../gameplay/EVENTS.md)를 참고하세요.

## 1–4. ID·등장·진열·한도

ID `hidden-shop`, 제목 **수상한 상인**. `eventDefinitions`와 기존 `RunEvents.encounter`에 연결합니다. v2 이벤트 활성 런, 최소 통과 1층, 5의 배수 통과층 제외, 직전 이벤트로부터 2층 이내 제외 규칙을 유지합니다. 일반 전투를 대체하거나 층을 소모하지 않습니다. 기존 v1 런/저장 이벤트는 유지하고 기존 v2 런의 향후 만남부터 후보가 됩니다.

전체 이벤트 검사 10%를 통과한 뒤 가중치 50:30:20:20:12로 추첨합니다. 히든상점은 이벤트 중 12/132 ≈ 9.09%, 검사 가능한 층당 약 0.91%입니다. 진열 **4–5개 균등 추첨**, 구매는 재화 종류와 무관하게 **총 2개**입니다.

## 5–8. 전체 풀·가중치·허용 재화·가격

| 그룹 | 그룹 가중치 | 수량 | 코인 | 성장 포인트 |
|---|---:|---|---|---|
| 영양제 | 32 | 1 | 400–700 | 80–150 |
| 에픽 지닌 도구 | 20 | 1 | 1,500–2,500 | 250–450 |
| unique/epic TM | 20 | 1 | 1,200–2,000 | 200–400 |
| 일반 알 티켓 | 24 | 3 / 5 | 800–1,500 | 150–300 |
| 슈퍼레어 알 티켓 | 3 | 1 | 3,000–5,000 | 600–1,000 |
| 트레이너 장비 | 1 | 1 | 5,000–8,000 | 1,000–1,500 |

모든 개별 상품은 현재 `allowedCurrencies:['coins','growth-points']`이며 한 재화만 허용하는 배열도 지원합니다. 개별 예외는 같은 데이터 파일의 `hiddenShopProductOverrides[상품ID]`에서 `allowedCurrencies`/`prices`를 지정합니다. 가격은 재화별 범위에서 정수 균등 추첨합니다. ×3/×5 티켓은 현재 같은 가격 범위이며 후속 조정 대상입니다. 할인 상점을 보장하지 않습니다.

원본 풀은 최대 46종이며 룰/보유/파티 적격성에 따라 줄어듭니다:

- 영양제 6종: 맥스업(`vitamin-hp`), 타우린(`vitamin-atk`), 사포닌(`vitamin-def`), 리보플라빈(`vitamin-spa`), 키토산(`vitamin-spd`), 알칼로이드(`vitamin-spe`). 기존 `vitamins`/`statKeys` 사용.
- 에픽 도구 11종: Choice Band, Choice Specs, Choice Scarf, Focus Sash, Assault Vest, Eviolite, Life Orb, Booster Energy, Loaded Dice, Power Herb, Weakness Policy. ID `item-아이템명`. Elite의 `epicRewardItems`를 그대로 사용합니다.
- TM 24종: Substitute, Toxic, Will-O-Wisp, Swords Dance, Calm Mind, Bulk Up, Flamethrower, Fire Blast, Thunderbolt, Ice Beam, Scald, Giga Drain, Sludge Bomb, Psychic, Shadow Ball, Earthquake, Stone Edge, U-turn, Volt Switch, Close Combat, Draco Meteor, Overheat, Leaf Storm, Nasty Plot. ID `machine-기술명`. 기존 rarity에서 유도한 `eliteRewardMachines` 사용.
- 일반 알 티켓: `egg-ticket-3`, `egg-ticket-5`.
- 슈퍼레어 알 티켓: `super-rare-ticket` 1장.
- 장비: `equipment-Dynamax Band`, `equipment-Tera Orb` 각 1개.
- 이로치 알/티켓 제외.

가중치는 그룹 단위이며 **그룹 내 개별 후보 가중치는 모두 1**입니다. 큰 TM 풀이 다른 그룹을 압도하지 않습니다. 진열 후 상품 ID를 제거하고 해당 그룹 가중치를 매번 0.25배로 줄입니다. 영양제 6종은 첫 그룹 선택 후 각각 1/6, 도구 11종은 각각 1/11입니다. 카테고리 보장은 없고 적격 후보가 없는 그룹은 제외됩니다.

## 9–10. 재화 추첨·snapshot

각 상품의 허용 재화에서 균등 선택하므로 현재 코인/성장 포인트 각각 50%입니다. 독립 추첨이라 한 상점에 한 재화만 나올 수도 있습니다. 다른 이벤트에서는 같은 상품도 다른 재화/가격으로 나옵니다.

DB v40의 `hidden_shop_events(event_id PRIMARY KEY REFERENCES run_events(id),snapshot_json)`에 생성 트랜잭션 중 한 번 저장합니다. `HiddenShopSnapshot={version:1,purchaseLimit,offers}`이며 각 offer는 `id,name,category,quantity,icon,description,currency,price,effect,purchased`를 저장합니다. 재접속·새로고침·서버 재시작·향후 가격표 변경 시 다시 추첨하지 않습니다. 한도도 snapshot합니다.

상품 난수는 이벤트 UUID/카운터의 SHA-256으로 분리해 기존 공유 난수 호출을 늘리지 않습니다. 공개 `HiddenShopView`는 effect를 제외하고 구매 수를 저장된 구매 상태에서 계산합니다. 기존 이벤트/보상/진행은 마이그레이션에서 재정산하지 않습니다.

## 11. transaction / idempotency

기존 `/api/battle` POST의 `type:'hidden-shop-purchase'`는 `runId,eventId,productId`만 사용합니다. 추가 가격·재화·아이템·수량은 무시합니다. 기존 인증/Origin 검사도 유지합니다.

`TowerStore.purchaseHiddenShop` → 기존 `transaction()`의 **BEGIN IMMEDIATE** 안에서 소유권·층·상태·이벤트 종류·상품 존재·구매 여부·총 한도·중복 보유·잔액을 확인합니다. 지갑 조건부 차감 → 기존 지급 함수 → 구매 상태를 함께 커밋하고 실패 시 전부 롤백합니다.

**(eventId, productId)**가 영수증 키이며 `purchased=true`가 저장 영수증입니다. 같은 상품 재요청은 성공만 반환하며 재지급·재차감·구매 수 증가가 없습니다. UI는 품절로 막습니다. 별도 요청 UUID가 필요하지 않습니다. 동시 요청도 쓰기 잠금으로 직렬화해 총 한도를 넘지 않습니다. 나간 상점 구매 요청은 거절합니다.

## 12–18. 지급·보유 정책 재사용

| 상품 | 기존 처리 |
|---|---|
| 영양제 | Reward → `grantStoredReward` → `run_reward_inventory`. 출전 준비에서 기존 `RewardInventory.use` → `applyVitamin`. 포켓몬당 총 3개/같은 층 사용 제한 유지 |
| 에픽 도구 | 단일 item-exchange effect snapshot → `grantRunItem`으로 `run_item_bag` 직접 지급 → 기존 장착 UI. 신규 도구 DB 없음 |
| TM | Elite와 공유한 `eligibleRewardMachines`에서 현재 Run 소유권만 확인. compatibility는 Bag 사용 시 검사하며 한 번 등록한 TM은 Run 동안 반복 사용. 계정 해금 없음 |
| 일반 티켓 | egg-ticket effect → `permanent_upgrades.egg_tickets` ×3/×5 → 기존 Permanent Shop 부화 |
| 슈퍼레어 | typed-egg-ticket(superRare) → `grantEggTicket` → `reward_egg_tickets` → 기존 Permanent Shop 보상 티켓 부화 |
| 장비 | `allowsRuleItem`·`run_trainer_equipment` 미보유 검사 → 기존 Reward의 `grantEquipment`. Held Item과 구분하고 두 장비 동시 보유 유지 |

가방/장착 중인 같은 에픽 도구와 단일 도구로 예약된 보상은 진열에서 제외합니다. 적격 미보유 장비가 없으면 그룹을 제외합니다. 생성 후 동일 도구/장비를 보유하게 된 경우에도 차감 전에 거절합니다. 새 화폐/부화 시스템은 없습니다.

## 19–20. UI·Shop 재사용

기존 일반 상점 카드 표면을 `web/shop-product.tsx`로 추출해 소모품·TM·히든상점에서 공유합니다. 기존 `tower-shop/shop-products/shop-product/secondary-button` 스타일, 이벤트 화면과 키보드 조작을 재사용합니다. 전용 CSS는 배치·내부 스크롤·재화 구분을 담당합니다.

현재 UI는 좌측 세로 상품 목록·우측 상세·하단 상인 대화로 구성합니다. 공통 Bag에서 사용/장착하고, Held/Vitamin은 즉시 사용 또는 배낭 등록을 선택합니다. TM은 자동 등록합니다. 기존 4–5개 상품/두 재화/가격/최대 2개 구매/snapshot/exact-once를 유지합니다. [공통 배낭과 상점 통합](BAG.md)이 최신 규칙이며, 이전 카드 UI 보고서는 [HIDDEN_SHOP_UI](HIDDEN_SHOP_UI.md)에 남깁니다.

나가기는 기존 leave choice로 완료 처리합니다. 0개 구매도 가능하고 재입장하지 않습니다. 열린 이벤트만 복구합니다. 마지막 구매 후 자동 퇴장하지 않고 추가 확인 모달도 없습니다. 기존 10층 상점/관리와 영양제 고정 판매 제거 상태를 유지합니다.

## 21. 검증

`tests/hidden-shop.test.ts`와 fixture: 생성 수/중복/다양성/재화/가격/허용 재화 제한/적격성/6종 지급/실제 영양제·TM 사용/잔액 부족/동일·혼합 재화 구매/한도/롤백/소유권/재시작/퇴장/v39 이전.

`e2e/hidden-shop.spec.ts`: PC 1280·모바일 390 이미지·새로고침·혼합 구매·가격 위조 무시·구매 상태·미구매 퇴장·동시 중복·마지막 구매 슬롯 경쟁. 개인 DB 대신 격리 테스트 DB를 사용합니다.

실행 결과:

| 검증 | 결과 |
|---|---|
| 전체 단위 테스트 실행 | 629/629 통과. 이후 추가한 테스트는 아래 최종 선택 실행에 포함 |
| 최종 변경 영역 단위 테스트 | hidden-shop 19개 + event UI/기존 shop usability 포함 23/23 통과 |
| Chrome 회귀 | 상자·도전자·Rank Reward/Inventory·트레이너 장비·히든상점/현재 정비 UI 합계 35/35 통과 |
| 최종 빌드 후 히든상점 E2E | PC 키보드·모바일·동시 요청·정비 UI 5/5 통과 |
| 프로덕션 빌드/TypeScript | 통과 |
| CSS 구조/문서 링크·워크스페이스/공백 검사 | 통과 |

기존 `e2e/shop.spec.ts`/`machine-shop.spec.ts`는 게스트 쿠키와 이전 정비 화면을 전제로 해 로그인 화면에서 실패했습니다. 해당 과거 시나리오를 통과했다고 기록하지 않습니다. 대신 현재 계정 로그인·정비 메뉴를 사용하는 회귀 테스트에서 소모품·TM·트레이너 장비 구매를 직접 확인했습니다. 신규 정비 회귀 fixture는 소모품 진열까지 고정해 랜덤 상품에 의존하지 않습니다. QA 화면은 `artifacts/qa/screenshots/hidden-shop/purchased-1280.png`, `purchased-390.png`에 있습니다.

## 22. 변경 파일

- 신규: `src/data/hidden-shop.ts`, `src/server/hidden-shop.ts`, `src/web/hidden-shop.tsx`, `src/web/shop-product.tsx`, `src/web/styles/hidden-shop.module.css`.
- 이벤트/API: `src/data/run-events.ts`, `src/server/run-events.ts`, `src/server/tower-store.ts`, `src/app/api/battle/route.ts`.
- 공통 풀/저장: `src/server/challenger-rewards.ts`, `src/server/schema.ts`, `src/server/storage/migrations.ts`, `src/server/tower-service.ts`.
- 화면 연결: `src/web/tower-shop.tsx`, `src/web/run-event.tsx`, `src/web/battle-game.tsx`, `src/web/event-presentation.ts`.
- 신규 검증: `tests/hidden-shop.test.ts`, `tests/hidden-shop-fixture.ts`, `e2e/hidden-shop.spec.ts`.
- 기존 검증: `tests/challenger-fixture.ts`의 가중치 120 고정을 레지스트리 합산으로 변경. `battle-retry`, `boss`, `consumable-shop`, `form-moves`, `held-items`, `hundred-floor`, `mystery-chest`, `npc-ranks`, `rank-rewards`, `run-events`, `trainer-catalog`, `villain-campaign` 테스트의 최신 스키마 기대값만 39→40 갱신.
- 문서: 이 보고서, `docs/gameplay/EVENTS.md`, `docs/engineering/EVENT_SYSTEM.md`, `docs/STATUS.md`, `docs/SESSION_HANDOFF.md`.

## 23. 후속 조정 데이터

`src/data/hidden-shop.ts`의 **hiddenShopEventSettings**: 등장 가중치·최소층·진열 수·구매 한도·반복 감점. **hiddenShopProductPool**: 그룹 가중치·수량·허용 재화·가격 범위. 전체 이벤트 빈도/쿨다운은 기존 `src/data/run-events.ts`의 `mysteryChest`, 공통 아이템/TM 등급은 기존 `held-item-shop.ts`/`machine-rarities.ts`를 사용합니다. 리롤·할인·교환·저주·이로치 공급은 이번 범위 밖입니다.
