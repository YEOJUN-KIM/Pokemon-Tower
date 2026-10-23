# 공통 배낭(Bag)과 상점 통합

공개 참조 안내: Git에서 제외한 로컬 캡처는 링크 대신 경로로 표기한다. 캡처 파일은 공개 저장소에 포함하지 않는다.

기준: 2026-10-20. 현재 Run의 도구·영양제·TM·배틀 소모품·트레이너 장비·Z크리스탈을 하나의 배낭에서 관리합니다. 배낭의 소유권은 모두 run_id에 묶여 새 도전에 복사되지 않습니다. 성장 포인트·알 티켓 등 기존 영구재화와 수집 포켓몬의 기존 성장/기술 지식은 별도 시스템입니다.

## 현재 화면과 실행 방식

팝업 크기는 PC/모바일에서 고정하고 목록·상세는 내부 스크롤을 사용합니다. 도구/TM은 목록 포커스·hover로 상세만 바꾸고 클릭·Z/Enter로 대상 선택에 들어갑니다. 상세의 ‘사용’(TM)/‘지니게 하기’ 버튼은 제거했으며 장착된 도구의 ‘해제’는 유지합니다. 영양제 등 다른 action의 사용 동작은 기존 경로를 따릅니다.

TM은 moveInfo의 type으로 18종 디스크를 선택합니다. `src/web/tm-icon.tsx`와 `public/assets/items/tm/`가 경로 기준이며 목록 28px·상세 64px와 pixelated 표시, 이미지 누락 대체 기호를 지원합니다. 상세에는 TypeBadge/분류·위력·명중률·PP·설명을 표시하고, 학습 가능 포켓몬은 기존 PokemonImage와 실제 선택 폼을 쓰는 칩으로 줄바꿈합니다.

## 구현 보고 1–10: 저장과 사용

| 항목 | 구현 |
|---|---|
| 1. 기존 구조 | 미장착 도구는 run_item_bag, 장착은 run_held_items, 영양제/TM/교환권은 run_reward_inventory, 배틀 소모품은 run_battle_items, 장비는 run_trainer_equipment. 과거 TM 사용은 move_unlocks 계정 해금 |
| 2. 통합 방식 | RunBag 서버 adapter가 BagView를 만들고 공통 Bag/BagButton이 사용. 도구는 미장착+장착 union, 영양제는 종류별 합산, TM은 수량 없는 소유권으로 표시. 별도 재고 저장소 없음 |
| 3. DB 변환 | v40→v41 의미 변환만 수행하며 새 Bag 테이블 없음. 기존 TM 구매 기록/소모 완료 TM 행을 Run TM 소유로 복원, 중복 TM 행과 도구 복제 수량 정리, 단일 도구 교환 보상을 기존 도구 가방으로 변환. 기존 receipt·snapshot 유지 |
| 4. Run 종료 | Run 전용 모든 재고·장착·TM 권한은 다음 Run으로 이월하지 않음. 역사/재현용 이전 Run DB 행은 보존. 영구재화는 기존 정산/보관 유지. 재도전 준비는 같은 Run이므로 재고 유지 |
| 5. Held unique | grantRunItem은 종류별 한 개만 유지. 공통 ownsRunItem이 미장착·장착·장비·확정 단일 교환 보상을 확인. 상점/랜덤 후보는 보유한 도구를 제외 |
| 6. 장착 표시 | Bag에 장착 도구를 계속 표시하고 행 오른쪽에 소지자 이름. ×1 표기 없음. 행 높이를 위해 포켓몬 이미지는 생략 |
| 7. 팀 이탈 | 영입 교체 시 기존 장착 해제 후 가방 반환. 일반 도구·메가스톤·Z 모두 같은 슬롯 처리. 고정 모습 도구는 기존 변경 금지를 유지하고 이탈 시 반환 |
| 8. Vitamin | 기존 보상 재고와 applyVitamin/+5 런 보너스·총 3개 제한·층/종류 사용 기록 제약 유지. 사용 성공 시만 한 개 감소. 취소·실패는 차감 없음. 기존 여러 행은 Bag에서 종류별 합산 |
| 9. TM 소유 | 기존 run_reward_inventory의 machine 행을 Run 등록부로 사용. 내부 quantity=1은 소유 sentinel이며 Bag에는 수량 없음. 사용해도 차감/삭제하지 않고 여러 멤버에게 반복 사용 |
| 10. TM 사용 | 소유→로스터→폼별 learnset→교체 칸→validateProfile을 서버에서 검증. 현재 Run profile의 기술만 변경. 계정 move_unlocks나 기본 빌드는 새 TM 사용으로 변경하지 않음 |

기존 계정 기술 지식은 영입과 과거 상점이 같은 move_unlocks 행을 공유해 출처를 완전히 구별할 수 없습니다. 이를 일괄 삭제하면 영입으로 얻은 기술도 잃을 수 있어 **기존 계정 지식은 보존**합니다. 이 호환 정책과 새 Bag TM의 Run 소유권은 별개입니다. 새 Run에 이전 Bag TM을 등록하거나 새 TM 사용을 계정에 영구 해금하는 경로는 없습니다.

## 구현 보고 11–19: 상점과 종류

| 항목 | 구현 |
|---|---|
| 11. 일반 TM 후보 | 기존 machineMoves/rarity/가격을 재사용. 현재 Run TM만 제외하며 현재 파티 compatibility/기존 계정 지식으로 상품을 거르지 않음 |
| 12. 리롤 | 같은 ownership helper로 중복 제외, 한 roll 내 unique sampling. 기존 MACHINE_COUNT=4 유지. 기존 저장 상품은 가능한 한 유지하면서 부족 슬롯 보충. 보유한 전체 풀이 소진된 극단적 경우에는 가능한 수만 표시 |
| 13. 히든 TM 후보 | 기존 unique/epic 풀에서 Run 미보유 TM을 추첨. 사용 가능 포켓몬이 0마리여도 진열/구매 가능 |
| 14. 히든 unique 필터 | Held/Important/TM의 기존 후보 필터와 공통 helper 연결. 구매 시에도 현재 소유를 재검증. 저장된 상품/가격/재화는 Bag 사용 때문에 다시 추첨하지 않음 |
| 15. Mega Stone | 도구 Pocket, 수량 없음, 일반 지닌 도구 슬롯. 기존 종족별 장착 적격성/변신 mechanics 유지 |
| 16. Battle Consumable | 기존 8종 X 아이템만 수량형으로 표시. 비전투에서는 조회/전투 중 사용 안내, 전투 중에는 기존 아이템 메뉴만 사용. 전체 Bag은 열 수 없음. 회복약 추가 없음 |
| 17. Important | Dynamax Band/Tera Orb는 중요한 도구 Pocket에 수량 없이 표시. 포켓몬 선택 없이 자동 등록, 소비/장착하지 않음 |
| 18. Z Crystal | z/chaos 룰에서만 별도 Pocket. 종류별 한 개·수량 없음. 일반 상점 구매 시 자동 Bag 등록 |
| 19. 공통 슬롯 | Z·Mega·일반 도구가 같은 run_held_items 슬롯을 사용. 다른 소지자의 도구를 옮기면 원 소지자는 자동 해제하고, 대상의 이전 도구는 가방으로 반환. 자동 교환으로 원 소지자에게 주지 않음 |

일반 도구/메가스톤과 히든상점 도구는 공통 획득 창의 바로 장착 / 배낭에 넣기 / 취소를 사용합니다. 히든 영양제는 바로 사용 / 배낭에 넣기 / 취소입니다. 일반 정비 상점에는 기존 제거된 고정 영양제 판매를 복원하지 않았습니다. TM은 구매 즉시 등록하고 대상 선택창을 강제하지 않습니다.

## 구현 보고 20–30: UI·호환·검증

| 항목 | 구현 |
|---|---|
| 20. 출전 준비 | 기존 별도 RewardInventory/도구 관리 진입을 공통 BagButton으로 통합. 최대 6마리에서 사용, 닫으면 선택한 출전 3마리 유지 |
| 21. 정비 배낭 | 정비 첫 메뉴에서 상점 / 포켓몬 조정 / 배낭 / 출전 팀 선택으로 진입. 일반 상점 상단 utility에도 배낭 진입 제공. 포켓몬 개별 조정 메뉴의 배낭 버튼은 제거. Bag을 사용해도 상품·리롤 revision은 유지 |
| 22. 히든상점 | 같은 BagButton과 B 단축키. 상품 Snapshot·가격·재화·구매 상태·한도를 유지하며 사용/장착 가능 |
| 23. 새 화면 | 좌측 세로 상품 목록, 우측 아이콘/이름/설명/가격/상태, 모바일은 세로 재배치. 상단 지갑/구매 N / 2 유지 |
| 24. 상인 대화 | 하단 GameDialogue는 상인 말 전용. 입장/첫 구매/한도/재화 부족 대화. 상품 설명은 우측 상세로 이동 |
| 25. 조작 | 상점 ↑↓/1–5 확인, Z/Enter 구매, B 배낭, X 나가기. Bag ↑↓ 항목, ←→/Q/E Pocket, Z/Enter 동작, X 뒤로. 기존 공통 keyboard helper에 opt-in Pocket 이동만 확장. hover는 상세 확인. Bag의 도구/TM 클릭은 대상 선택 진입이며, 상점 상품 클릭은 확인 후 구매 동작으로 확정. 터치도 각 action의 동일 경로 사용 |
| 26. 저장 호환 | 기존 pending 이벤트/상품/가격/재화·보상 정의·배틀 packed snapshot/receipt는 유지. v41 변환은 트랜잭션 안에서 한 번 수행하며 재접속 시 재지급하지 않음 |
| 27. Transaction | bag-use는 기존 reward_use_receipts와 BEGIN IMMEDIATE 사용. 동일 requestId/payload 재요청은 성공만 반환, 충돌은 거절. Hidden Shop은 기존 eventId/productId receipt, 일반 상점은 기존 revision/product receipt. 즉시 사용/장착 실패 시 결제·지급·구매 상태까지 롤백 |
| 28. 테스트 | 아래 실행 결과 참조 |
| 29. 변경 파일 | 아래 목록 참조 |
| 30. 한계/유의점 | 이전 계정 지식의 출처 혼합은 위 호환 정책을 따름. 기존 고정 모습 도구 잠금과 영양제 같은 층/종류 제약 유지. 전 TM 보유 등 풀 완전 소진 시 상품 수는 가능한 수로 제한. 새 가격·확률·회복약·Z/Mega 전투 mechanics 변경 없음 |

## 도입 당시 검증 기록

아래 숫자는 Bag 도입 당시 기록이며 현재 전체 테스트 개수/전체 화면의 사람 검증 완료를 뜻하지 않습니다. 최근 자동 검증 범위는 [중간점검](../history/REFACTORING-2026-10-18.md), 현재 남은 실사용 검증은 [ROADMAP](../current/ROADMAP.md)을 따릅니다. 브라우저는 실제 Chrome과 테스트 전용 SQLite를 사용합니다. 실제 사용자의 진행 DB에서 아이템 구매/사용 테스트를 하지 않습니다.

| 검증 | 결과 |
|---|---|
| 전체 단위·통합 테스트 | **664/664 통과** |
| Bag·일반/히든상점·Rank 보상·도전자·Mirror·상자 Chrome 회귀 | **39/39 통과** |
| 최종 표시 수정 후 Bag/상점/보상 Chrome 재검증 | **9/9 통과** |
| 최종 표시 수정 후 관련 단위 테스트 | **13/13 통과** |
| TypeScript / Next production build | 통과 |
| CSS 구조 / 문서 링크 / git diff --check | 통과 |

- tests/bag.test.ts: 8개. unique/장착 표시/자동 이동/해제·Mega·Z/Important, 반복 TM/기술 적용/새 Run, 즉시 구매 실패 롤백, 영양제 수량/중복/전투 잠금, TM 슬롯/리롤/compatibility 분리, v40 복구, 6마리·이탈 반환, receipt 실패 롤백.
- 기존 서버 전체 회귀: 상점·보상·기믹·전투·영입·DB 변환·계정·알 등.
- e2e/bag.spec.ts: PC/모바일 full-use Bag, snapshot 복귀·포켓몬 이동·영양제·두 포켓몬에게 동일 TM·전투 소모품/중요 도구/Z Pocket, 새로고침, 공통 키보드와 빈 Pocket/장착 해제 후 재장착.
- e2e/hidden-shop.spec.ts: 두 재화/취소/즉시 사용·가방 등록/중복·동시 API/2회 제한/4·5개 세로 목록/일반 정비 소모품·장비·TM 등록.
- e2e/rank-rewards.spec.ts 및 기존 도전자/상자/Mirror 회귀.

Bag PC — `../../artifacts/qa/screenshots/bag/bag-1280.png` (로컬 캡처, Git 미포함) · Bag 모바일 — `../../artifacts/qa/screenshots/bag/bag-390.png` (로컬 캡처, Git 미포함) · 새 히든상점 PC — `../../artifacts/qa/screenshots/bag/hidden-shop-1280.png` (로컬 캡처, Git 미포함) · 새 히든상점 모바일 — `../../artifacts/qa/screenshots/bag/hidden-shop-390.png` (로컬 캡처, Git 미포함)

## 변경 파일

- 모델: [data/bag.ts](../../src/data/bag.ts), [shared/contracts.ts](../../src/shared/contracts.ts).
- 공통 서버: [run-bag.ts](../../src/server/run-bag.ts), [run-ownership.ts](../../src/server/run-ownership.ts), [inventory-grants.ts](../../src/server/inventory-grants.ts).
- 연결: [tower-store.ts](../../src/server/tower-store.ts), [tower-service.ts](../../src/server/tower-service.ts), [battle API](../../src/app/api/battle/route.ts), [reward-inventory.ts](../../src/server/reward-inventory.ts), [challenger-rewards.ts](../../src/server/challenger-rewards.ts), [hidden-shop.ts](../../src/server/hidden-shop.ts).
- 저장: [schema.ts](../../src/server/schema.ts), [storage/migrations.ts](../../src/server/storage/migrations.ts), [run-bag-migration.ts](../../src/server/storage/run-bag-migration.ts).
- UI: [bag.tsx](../../src/web/bag.tsx), [bag.module.css](../../src/web/styles/bag.module.css), [item-acquisition-dialog.tsx](../../src/web/item-acquisition-dialog.tsx), [held-item-controls.tsx](../../src/web/held-item-controls.tsx), [reward-inventory.tsx](../../src/web/reward-inventory.tsx), [tower-controls.tsx](../../src/web/tower-controls.tsx), [tower-shop.tsx](../../src/web/tower-shop.tsx), [battle-game.tsx](../../src/web/battle-game.tsx), [run-event.tsx](../../src/web/run-event.tsx), [game-keyboard.ts](../../src/web/game-keyboard.ts), [hidden-shop.tsx](../../src/web/hidden-shop.tsx), [hidden-shop.module.css](../../src/web/styles/hidden-shop.module.css).
- 주요 테스트: [bag.test.ts](../../tests/bag.test.ts), [machine-shop.test.ts](../../tests/machine-shop.test.ts), [hidden-shop.test.ts](../../tests/hidden-shop.test.ts), [bag.spec.ts](../../e2e/bag.spec.ts), [hidden-shop.spec.ts](../../e2e/hidden-shop.spec.ts), [rank-rewards.spec.ts](../../e2e/rank-rewards.spec.ts). 기존 도구 이동/폼·장비/리롤 기대값 및 schema version 검증을 새 계약에 맞게 갱신했습니다. 성별 replay 테스트는 실시간 타임스탬프를 비교에서 제외해 실제 전투 로그만 비교하도록 수정했습니다.
- 문서: 이 문서, ITEMS/CONTROLS/EVENTS, HIDDEN_SHOP/HIDDEN_SHOP_UI 및 상태·인수인계 문서.

## 대상 선택 카드 개선 (2026-10-17)

도구 장착·TM 사용 시 공통 파티 카드를 사용합니다. 포켓몬 스프라이트·이름·레벨을 표시하고, HP 영역 대신 TM은 `배울 수 있음 / 배울 수 없음 / 이미 배우고 있음`을 구분합니다. 이미 아는 기술을 먼저 판별하며, 사용할 수 없는 대상은 선택을 막습니다. 도구는 현재 지닌 도구의 아이콘과 이름을 표시하고 미장착 영역은 비웁니다. 구매 직후 바로 장착도 같은 카드를 사용합니다. 모바일에서는 상태를 이름 아래로 배치합니다.

일반 상점의 반복 사용 안내 문구를 삭제하고 리롤 버튼은 `리롤`로 줄였습니다. 히든상점과 출전 팀 선택의 배낭 진입은 유지합니다.

검증: 관련 단위·통합 14/14, Bag·일반/히든상점·Rank 보상 Chrome 회귀 22/22 통과. PC/모바일에서 세 가지 TM 상태, 장착 도구 아이콘, 미장착 빈 영역, 정비 메뉴 진입과 기존 버튼 제거를 확인했습니다. TypeScript·프로덕션 빌드·CSS 구조·문서 링크 검사도 통과했습니다.

TM 대상 PC — `../../artifacts/qa/screenshots/bag/targets-machine-1280.png` (로컬 캡처, Git 미포함) · TM 대상 모바일 — `../../artifacts/qa/screenshots/bag/targets-machine-390.png` (로컬 캡처, Git 미포함) · 도구 대상 PC — `../../artifacts/qa/screenshots/bag/targets-held-1280.png` (로컬 캡처, Git 미포함) · 도구 대상 모바일 — `../../artifacts/qa/screenshots/bag/targets-held-390.png` (로컬 캡처, Git 미포함)

## 일반상점 접근성 보완

현재 정비 상점 상단의 배낭 버튼과 B 안내는 제거했습니다. 정비 기본 메뉴·출전 준비·히든상점의 배낭 진입을 사용합니다. 첫 사용 가능 대상 커서와 영양제 제한 표시는 공통 적용합니다. 상세 변경·검증·제약은 SHOP_BAG_UX (로컬 전용: `artifacts/reports/changes/SHOP_BAG_UX.md`)를 참조하세요.

## 도전자 unique 보상

신규 Elite 에픽 도구는 랜덤 단일 snapshot 후 교환권 없이 직접 Bag에 등록합니다. 신규 도구/TM은 지급 직전 중복이면 1,500코인으로 대체합니다. 상세 보고와 저장 호환 (로컬 전용: `artifacts/reports/changes/CHALLENGER_UNIQUE_REWARDS.md`).
