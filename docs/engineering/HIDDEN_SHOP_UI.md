# 히든상점 UI 리팩터링

이 문서는 이전 카드 UI의 구현 기록입니다. 현재 세로 목록/우측 상세/하단 상인 대화와 공통 배낭 규칙은 [BAG](BAG.md)을 따릅니다.

기준: 2026-10-17. 기존 히든상점의 상품·가격·재화·구매 제한·snapshot·transaction·exact-once를 유지하고 Web UI와 입력 연결을 변경했습니다.

## 구현 보고

| 요청 항목 | 결과 |
|---|---|
| 1. 새 UI 구조 | 상단 상인/지갑/구매 횟수, 중앙 간결한 상품 목록, 하단 선택 상품 상세와 작은 구매/나가기 동작 |
| 2. 카드 정보 | 번호·기존 아이콘·상품명/수량·재화 아이콘과 가격. 상품 설명·큰 구매 버튼 제거 |
| 3. 하단 이동 | 상품명·snapshot description·전체 재화 이름/가격·남은 구매·현재 가능 여부. 고정된 장문 재화 안내 제거 |
| 4. PC 배치 | 1050px 초과는 최대 5개 한 줄, 761–1050px는 최대 3개씩 가운데 wrap. 4개도 가운데 정렬 |
| 5. 모바일 | 760px 이하 2열, 남은 한 장 가운데 정렬, 목록 안 스크롤. 상세/구매/나가기는 별도 하단 메시지창. 키보드 안내 숨김 |
| 6. 선택 강조 | aria-pressed, 공통 data-game-cursor, 밝은 테두리·배경. 첫 상품부터 기본 선택 |
| 7. 숫자키 | 1–5는 해당 저장 상품을 selectGameCursor로 선택하고 목록 안에서 보이도록 스크롤. 구매 API 호출 없음. 4개 진열에서 5는 무동작 |
| 8. 방향키 | 공통 useGameKeyboard의 opt-in data-keyboard-grid=directional. 기존 공간 방향 계산을 재사용해 실제 행/열 이동. 일반 화면/대화상자는 기존 동작 유지 |
| 9. Z/Enter | 카드 또는 구매 동작에서 현재 상품을 기존 hidden-shop-purchase API로 구매. 상품 ID·run/event ID만 전달, 확인 모달 없음 |
| 10. X | 기존 event-choice의 leave로 종료. 구매 0회/1회/2회 모두 가능. 나가기 버튼에 커서가 있으면 Z/Enter도 나가기 |
| 11. 마우스 | 공통 pointer 이동으로 hover 상세, 클릭은 선택만. 작은 구매 버튼으로 확정. 실제 터치도 동일. Tab/native focus도 선택 상태와 동기화 |
| 12. 구매 완료 | 가격 대신 구매 완료, 아이콘 어둡게. 선택/열람 유지, 구매 버튼과 단축키에서 재구매 요청 차단 |
| 13. 재화 부족 | 카드 배경/문자 톤과 하단의 해당 재화 부족 문구. 선택·상세 확인 유지, 구매 버튼/단축키 차단 |
| 14. 2회 제한 | 상단 구매 N / 2, 하단 남은 구매 N회. 2회 후 미구매 상품은 더 이상 구매할 수 없다는 상태 표시. 열람·나가기 유지 |
| 15. 설명 재사용 | 기존 서버 snapshot의 offer.description/name/icon/quantity/currency/price 그대로 사용. 효과 설명이나 별도 상품 DB 생성 없음 |
| 16. 서버 재사용 | 생성·가중치·RNG·가격·snapshot·DB·grant·receipt·transaction 파일 변경 없음. 화면의 availability는 입력 차단/표시용이며 서버 검증은 기존 경로 |
| 17. 복구 | 저장된 상품/가격/재화/구매 상태/횟수를 그대로 복구. 로컬 미리보기 선택만 첫 상품으로 초기화. 새 snapshot 생성 없음 |
| 18. 테스트 | 아래 검증 결과 참조 |
| 19. 변경 파일 | 아래 목록 참조 |

아이콘은 40→60px(1.5배), 기존 TM SVG와 이미지의 object-fit: contain/image-rendering: pixelated를 사용합니다. 카드의 숫자는 상품 순서이며 모바일에 숫자키 조작 안내는 표시하지 않습니다. 구매 후 현재 상품의 선택을 유지하며 새로고침 전까지 자동으로 다른 상품으로 이동하지 않습니다.

UI에서 보유 여부를 별도로 추정하지 않습니다. 유일 장비·룰 적격성·지급 정책은 기존 서버 상품 후보와 지급 검증에 맡깁니다. 이미 구매한 카드도 선택 가능한 버튼이므로 aria-disabled로 열람까지 막지 않고, 실제 구매 동작의 native disabled를 사용합니다.

## 검증 결과

테스트 DB는 `.data/e2e.sqlite`이며 실제 사용자 저장과 분리합니다.

| 검증 | 결과 |
|---|---|
| 히든상점 UI/서버·공통 이벤트 UI·도전자·Rank 보상·상자·Reward UI 7개 파일 | 90/90 통과 |
| Chrome: 히든상점 13개 + 도전자 11개 + Rank 보상 5개 + 상자 1개 | 30/30 통과 |
| TypeScript / Next production build | 통과 |
| CSS 구조 / 문서 링크 / git diff --check | 통과 |

히든상점 서버 테스트 19개는 기존 구현 그대로 실행했습니다. 전체 저장소 테스트를 모두 다시 실행한 것은 아니며 변경 UI와 공통 이벤트·상점·보상 경로를 검증했습니다.

- PC 1280px, 중간 폭 900px, 모바일 390px에서 각각 4/5개 배치·가로 넘침·wrap 중앙 정렬.
- 초기 선택, 숫자키 1–5의 구매 없음, ←→/↑↓, hover/click, Tab, 실제 touch, 3→Z와 Enter 구매.
- 두 재화 혼합 구매, UI 중복 구매 요청 차단, 구매 한도 후 열람, 재화 부족, X/나가기.
- snapshot 재접속, 저장 구매 상태, 기존 직접 API 중복·동시 요청/세 번째 구매 거절.
- 기존 Vitamin·Epic Held Item·Unique/Epic TM·일반/슈퍼레어 티켓·Trainer Equipment 서버 지급과 롤백 테스트.
- 기존 도전자·Rank 보상·상자·정비 상품 구매 회귀.

[입장 PC](../../artifacts/qa/screenshots/hidden-shop/entry-1280.png) · [입장 모바일](../../artifacts/qa/screenshots/hidden-shop/entry-390.png) · [구매 후 PC](../../artifacts/qa/screenshots/hidden-shop/purchased-1280.png) · [구매 후 모바일](../../artifacts/qa/screenshots/hidden-shop/purchased-390.png)

## 이번 작업 변경 파일

- [hidden-shop.tsx](../../src/web/hidden-shop.tsx): 간결한 카드·상세창·표시용 구매 상태.
- [hidden-shop.module.css](../../src/web/styles/hidden-shop.module.css): 반응형 배치·선택·재화·구매 상태.
- [battle-game.tsx](../../src/web/battle-game.tsx): 이벤트별 선택과 단축키/공통 커서 동기화.
- [run-event.tsx](../../src/web/run-event.tsx): 상점 scene과 하단 상세창 연결.
- [game-keyboard.ts](../../src/web/game-keyboard.ts): opt-in 화면 그리드 방향 이동.
- [hidden-shop.spec.ts](../../e2e/hidden-shop.spec.ts): 기존 회귀 유지 및 새 UI/조작/배치/실제 touch 검증.
- [hidden-shop-ui.test.ts](../../tests/hidden-shop-ui.test.ts): 설명 이동·기본 선택·상태별 열람/구매 차단.
- [HIDDEN_SHOP.md](HIDDEN_SHOP.md), [EVENTS.md](../gameplay/EVENTS.md), [CONTROLS.md](../gameplay/CONTROLS.md), 이 보고서.

앞선 도전자/Mirror 등 미커밋 작업은 그대로 유지합니다. 밸런스 조정은 이번 변경에 포함하지 않습니다.
