# 일반상점 배낭 접근과 대상 선택 UX

2026-10-17. 기준 커밋 `0149828578017ad7c4c35b1444d523ce6d7c0b03` 이후의 UX 보완.

## 구현 보고

1. **배치**: 일반상점 `shop-heading` 오른쪽 `shop-heading-actions`에 작은 `secondary-button` 배낭과 코인 지갑을 배치. 정비 첫 메뉴의 배낭도 유지.
2. **PC**: 왼쪽 조작 안내, 오른쪽 배낭 → 지갑. 상품 카테고리 버튼 세 개와 별도 영역.
3. **모바일**: header와 actions 모두 wrap 가능. 390px에서는 안내 아래 배낭·지갑을 배치하고 상품 탭/카드 폭은 변경하지 않음.
4. **B 단축키**: 기존 game keyboard helper에서 현재 열린 최상위 dialog 안의 일반상점 배낭만 찾아 클릭. 중첩 Bag에서는 이 분기를 적용하지 않으며 X와 Pocket 등 기존 Bag 조작을 사용. 반복 B 입력으로 중복 창을 열지 않음.
5. **상태 보존**: TowerShop을 유지한 채 BagButton 내부 상태로 중첩 Bag만 표시. category, 서버 상품 snapshot, 리롤 revision/사용 여부, 구매 상태, 코인은 그대로 유지. Bag에서 실제 수행한 사용/장착만 반영.
6. **초기 커서**: ItemTargetList에서 disabled 및 disabledReason을 모두 통과한 첫 roster 멤버를 찾아 `data-initial-focus` 지정. 목록 진입 시 기존 selectGameCursor로 선택. Held/Vitamin/TM 및 구매 직후 대상 선택에 공통 적용.
7. **모두 불가**: 대상에는 초기 커서를 붙이지 않음. 안내 `사용할 수 있는 포켓몬이 없습니다.` 표시 후 취소 버튼으로 커서 이동. 비활성 대상의 클릭 handler에도 추가 방어.
8. **영양제**: 기존 vitamin_purchases 기록을 읽어 포켓몬별 사용 횟수와 이번 층 사용 stat을 전달. 사용 가능 대상은 `사용 가능`, 총 제한은 `영양제 한도 도달`, 기존 같은 층/종류 제한은 `이번 층에서 이미 사용한 영양제`로 표시. Bag과 구매 직후 사용이 같은 helper를 사용.
9. **사유 구조**: ItemTargetList의 선택적 `disabledReason(name)`이 사유 표시와 비활성화를 함께 제공. TM 세 상태와 현재 지닌 도구 아이콘/이름, 스프라이트·이름·레벨·모바일 배치 유지.
10. **서버 검증**: 기존 applyVitamin, 구매 transaction/rollback/receipt 검증 유지. RunView의 vitaminUsage는 기존 기록을 읽는 DTO이며 Bag 모델·DB schema·재고 lifecycle을 변경하지 않음. 기존 Bag target eligibility도 실제 서버의 층/종류 제한과 일치시킴.
11. **복귀**: BagButton마다 useId로 진입 버튼을 구별하고 기존 PokedexDialog returnFocus에 전달. 같은 화면에 여러 배낭 버튼이 있어도 연 버튼으로 커서와 DOM focus 복귀.
12. **검증**: 아래 테스트 결과 참조.
13. **유의점**: 다른 요청이나 재접속 사이에 재고/한도가 바뀌면 서버가 다시 검증하고 기존 오류 표시를 사용. 기존 같은 층/영양제 종류 제한은 유지되므로 한도가 남아 있어도 다음 층 준비까지 사용할 수 없는 경우가 있음. 가격·확률·리롤·상품 생성·snapshot/exact-once 규칙 변경 없음.

## 변경 파일

- 서버: [inventory-grants.ts](../../../src/server/inventory-grants.ts), [run-bag.ts](../../../src/server/run-bag.ts), [tower-store.ts](../../../src/server/tower-store.ts).
- 공유: [contracts.ts](../../../src/shared/contracts.ts), [vitamin-eligibility.ts](../../../src/shared/vitamin-eligibility.ts).
- UI: [tower-shop.tsx](../../../src/web/tower-shop.tsx), [shop-heading.module.css](../../../src/web/styles/shop-heading.module.css), [bag.tsx](../../../src/web/bag.tsx), [item-target-list.tsx](../../../src/web/item-target-list.tsx), [item-acquisition-dialog.tsx](../../../src/web/item-acquisition-dialog.tsx), [game-keyboard.ts](../../../src/web/game-keyboard.ts), [pokedex-dialog.tsx](../../../src/web/pokedex-dialog.tsx).
- 테스트: [shop-bag-ux.spec.ts](../../../e2e/shop-bag-ux.spec.ts), [bag.spec.ts](../../../e2e/bag.spec.ts), [item-targets.test.ts](../../../tests/item-targets.test.ts).
- 문서: 이 보고서와 [BAG.md](../../../docs/engineering/BAG.md), [ITEMS.md](../../../docs/gameplay/ITEMS.md), [CONTROLS.md](../../../docs/gameplay/CONTROLS.md).

같은 영양제가 이미 Bag에 있을 때 구매 후 바로 사용이 실패하던 문제도 수정했습니다. 새로 추가된 마지막 재고 행 대신 Bag이 합산 대표로 사용하는 첫 번째 유효 행을 기존 트랜잭션 안에서 선택합니다. 구매 1개 지급과 즉시 1개 사용의 순수량, 실패 시 전액 롤백, 중복 receipt 정책은 유지합니다. 사전 보유 2개에서 구매·즉시 사용·동일 구매 재요청 후에도 재고 2개, 효과 1회, 결제 1회임을 검증합니다.

## 테스트 결과

- 전체 단위·통합 테스트 666/666 통과. 이후 발견한 기존 영양제 중복 보유 문제 수정과 추가 회귀 테스트를 포함한 관련 단위·통합 재검증 34/34 통과.
- 최종 Chrome 25/25 통과: 일반상점 utility PC1280/모바일390, B/X·반복 B·진입 버튼 focus 복귀, TM 사용 전후 category/상품/구매 상태/코인 유지, 리롤 상태 유지, Held/Vitamin/TM의 첫 두 대상 불가→셋째 초기 커서, 영양제 즉시 사용 한도와 취소·효과/결제, 서버 위조 요청 거절, 모든 대상 불가 시 Z/Enter POST 없음. 기존 Bag/Hidden Shop/Rank 보상 회귀 포함.
- TypeScript, Next 프로덕션 빌드, CSS 구조, 문서 링크, git diff --check 통과.
- UI 테스트는 별도의 테스트 SQLite 계정에서 실행. 실제 사용자 저장 데이터는 변경하지 않음.

[일반상점 PC](../../qa/screenshots/bag/shop-utility-1280.png) · [일반상점 모바일](../../qa/screenshots/bag/shop-utility-390.png)

## 상품 카드 가격 버튼 정리

일반상점의 지닌 도구·배틀 아이템·TM 카드에서 구매 버튼은 가격(예: `300코인`)만 표시합니다. 이름을 첫 줄, 라벨/위력/PP와 오른쪽 가격 버튼을 둘째 줄, 상품/기술 설명을 아래 전체 폭에 배치합니다. TM 설명은 기존 moveInfo를 사용합니다. 구매 완료·보유/장착 중·자금 부족 안내는 카드의 별도 상태 줄에 표시하며 기존 비활성화 및 구매 처리는 유지합니다. 모바일은 한 줄에 카드 하나를 배치해 가격 버튼과 설명을 읽기 쉽게 했습니다.

검증: 실제 Chrome 20/20 통과(PC1280/모바일390의 세 상품 카테고리 가격 전용 버튼·설명·옆 배치·가로 넘침, 구매/배낭/리롤/히든상점 회귀). TypeScript·빌드·CSS·문서 검사 통과.

[TM 카드 PC](../../qa/screenshots/bag/shop-products-machine-1280.png) · [TM 카드 모바일](../../qa/screenshots/bag/shop-products-machine-390.png) · [도구 카드 모바일](../../qa/screenshots/bag/shop-products-held-390.png)
