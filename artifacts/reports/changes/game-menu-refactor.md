# 게임 메뉴 UI 통일 (2026-10-19)

기존 화면 구성과 서버 요청을 유지하면서 선택 효과, 메뉴 행, 팝업 프레임, 조작 안내, 가격·상태 표시를 통합했다. 서버·배틀 엔진·데이터 파일은 변경하지 않았다.

## 공통 규칙과 컴포넌트

`src/web/game-menu.tsx`

| 컴포넌트 | 용도 |
| --- | --- |
| `GameChoice` | 전체 행·카드가 하나의 선택 대상인 명령. 네이티브 button의 접근성과 기존 이벤트·data 속성을 유지 |
| `GameChoiceList` | 공통 간격과 높이를 쓰는 목록·그리드. 기존 키보드 목록·그리드 탐색과 연결 |
| `GameAdjustRow` | 한 행의 좌우 클릭 및 방향키·패드 입력을 같은 조정 이벤트로 처리 |
| `GameMenuFooter` | 키캡·설명·간격·색상을 공유하는 조작 안내. 화면별 controls 지정 및 hidden 지원 |
| `GameStatus` | 보유·장착·구매 완료 등을 표시하는 비대화형 텍스트 |
| `GamePrice` | 상품 동작과 분리된 비대화형 가격·단위 표시 |

기존 `ShopProduct`는 전체 상품이 선택되는 공통 컴포넌트로, `PokedexDialog`는 고정 헤더·스크롤 가능한 본문·고정 조작 안내를 갖는 공통 팝업으로 변경했다. 전문 화면이 자체 공통 footer를 제공하면 팝업의 기본 footer는 숨긴다.

`src/web/styles/game-menu.module.css`와 `tokens.css`가 공통 표현을 소유한다.

- 청록 테두리 `#98efd1`, 내부 선택 배경 `#405d59`, 내부 1px 강조선.
- 브라우저 outline 대신 같은 게임 선택 표시를 사용하며 네이티브 Tab 접근성은 유지.
- 커서 모드에서는 정지한 마우스의 hover와 이전 네이티브 포커스가 이중 커서를 만들지 않음.
- 선택 전환 80ms. reduced-motion에서는 전환 제거.
- 팝업 선택지 높이 48px, 좌우 padding 12px, 간격 6px, 테두리 1px. 정보가 많은 상품·포켓몬 카드는 내용 크기를 유지.
- 탭 최소 높이 36px. 단순한 사각 패널과 공통 테두리 사용.
- 가격과 상태는 별도 클릭 대상이 없는 텍스트로 표현. 타입 색상은 정보 배지에 유지.
- 화면별 선택·hover·focus 표현 264개 선언을 제거해 공통 규칙과의 중복을 줄임.

## 화면별 적용

| 화면 | 적용 내용 |
| --- | --- |
| 확인·선택 팝업 | 공통 헤더·본문·footer, 선택 행 크기·간격·선택 효과 통합. 필터·설정 선택지는 공통 Choice 컴포넌트 사용 |
| 상점 | 지닌 도구·소모품·TM 상품 전체가 하나의 구매 대상. 내부 가격 버튼 제거. 가격과 보유/장착/구매 완료는 정보 텍스트. 3열 탭과 고정 footer, 상품 영역 내부 스크롤 |
| 가방 | 기존 전체 항목 선택 유지. 소모품도 항목 자체로 사용 단계에 진입. TM·도구·소모품이 같은 실행 문법 사용. 공통 조작 안내와 상태 표시 |
| TM | 상점의 전체 상품 선택, 가방의 전체 대상 포켓몬·교체 기술 행 선택, 공통 팝업과 선택 표현 적용. 기존 구매·학습 요청 유지 |
| 도감 | 기존 카드·페이지 탐색 유지. 출발 파티 슬롯을 전체 선택 버튼으로 변경. 공통 포커스·사각 패널·footer·필터 선택지 적용 |
| 능력치·특성 | 작은 +/− 버튼, 숫자 input, range 슬라이더 제거. 능력치 전체 행을 선택하고 좌우 조절. 행 왼쪽 클릭은 감소, 오른쪽 클릭은 증가. 빠른 연속 입력도 최신 상태에 누적하며 기존 32/66 상한 유지. 특성·성격·테라 팝업에 공통 선택 규칙 적용 |
| 기술 배치 | 기존 전체 기술 칸·기술 행 선택 유지. 목록만 내부 스크롤하고 공통 footer 고정. TrainingEditor의 보조 기술 편집도 select를 전체 행 선택 팝업으로 변경 |
| 영입 | 기존 전체 후보 카드 선택 유지. 영입 확인을 공통 팝업으로 이동. 상태 라벨과 선택 효과 통일. 확인/취소와 개체값 비교 기능 유지 |
| 배틀 | 루트·기술·교체·도구·설정 메뉴의 선택 표현 통일. 화면별 footer를 GameMenuFooter로 교체. 타입 정보 배지는 유지 |

키보드·마우스와 함께 표준 패드 D-pad/왼쪽 스틱도 동일한 커서를 사용한다. 아래 버튼(표준 index 0)은 결정, 오른쪽 버튼(index 1)은 뒤로, index 2는 기믹, L/R(index 4/5)은 탭 이동이다. 결정 버튼은 누르는 동안 한 번만 처리하고 방향 입력은 반복한다.

## 제거된 웹 UI 요소

- 상품 안의 작은 가격 버튼과 그 버튼만 클릭하는 구조.
- 능력치의 작은 +/− 버튼 12개와 숫자 입력·슬라이더 조합.
- TrainingEditor 보조 기술 배치의 브라우저 select.
- 출발 파티 슬롯 안의 별도 선택 버튼/투명 오버레이.
- 화면마다 달랐던 선택 색상·outline·hover 효과와 일부 둥근 패널.
- 배틀·도감·상점·가방·기술 배치마다 별도로 작성한 키 안내 마크업.
- 능력치 개체값 정보의 입체적인 버튼 모양과 상태 라벨의 버튼 배경.

## 검증

- 프로덕션 빌드 및 TypeScript 검사 통과.
- CSS 경계·토큰 구조 검사 통과.
- 단위/도메인 테스트 17개 통과: architecture-boundaries, training, bag, shop-usability.
- Chrome E2E 11개 통과: 신규 game-menu 7개 + 기존 recruit-compact 4개.
- 1280×900, 390×740에서 실제 상품 구매, 코인 차감, TM 구매 완료/중복 방지, 가방 TM 사용, 능력치 연속 조정·32/66 상한·저장, 특성 저장, 배틀/교체/설정 메뉴, 영입/도감 등록 확인.
- 마우스 hover, 게임 커서, 네이티브 Tab의 계산된 색상·테두리·outline을 비교. 표준 패드 API 모의 입력으로 이동과 단일 결정 확인.
- 모바일·데스크톱 상점/기술 배치 스크린샷을 확인하고 footer가 화면 안에 남는지 검사.

처음 시도한 구형 battle-commands/menu-navigation 테스트 묶음은 과거 tower_session 준비 방식으로 로그인 화면에 이동해 중단했다. 현재 tower_auth 인증을 사용하는 신규 테스트에서 해당 핵심 메뉴 경로를 검증했다. 전체 E2E 묶음 전체를 통과했다고 주장하지 않는다. 실물 패드는 연결해 검증하지 않았다.

## 남은 개선 후보

- 도감 즐겨찾기 별, 검색 초기화, 팝업 닫기 같은 작은 보조 조작은 마우스·터치 접근성을 위해 유지했다. 향후 보조 명령 메뉴로 이동 여부를 별도로 검토할 수 있다.
- 검색 input과 '해금한 기술만' checkbox는 기능을 유지하고 공통 색상·선택 표현을 적용했다. 화면 키보드/게임식 토글로 완전히 대체하는 작업은 별도 범위다.
- 배틀 결과·영입 축하·보상 공개 같은 연출 전용 dialog는 기존 생명주기와 배치를 유지한다. 내부 명령은 공통 선택 효과를 받으며, 공통 팝업 본문으로 완전히 이동하는 것은 후속 후보다.
- 기존 레이아웃 CSS에는 테마별 기본 색상과 오래된 stepper/overlay 선택자가 일부 남아 있다. 이번에 제거한 중복 선택 효과 외의 사용하지 않는 레이아웃 규칙은 후속 정리 후보다.
- 물리 패드의 기종별 버튼 표기, 비표준 매핑, 모바일 가상 패드 안내는 별도 검증이 필요하다.
- 구형 E2E의 인증 준비 및 이번에 사라진 작은 버튼/input을 찾는 테스트 선택자 갱신이 필요하다.

## 변경 파일 전체

신규:

- `src/web/game-menu.tsx`
- `src/web/styles/game-menu.module.css`
- `e2e/game-menu.spec.ts`
- `artifacts/reports/changes/game-menu-refactor.md`

화면·컴포넌트·입력:

- `src/web/bag.tsx`
- `src/web/battle-game.tsx`
- `src/web/dex-filter-dialog.tsx`
- `src/web/game-keyboard.ts`
- `src/web/held-item-controls.tsx`
- `src/web/hidden-shop.tsx`
- `src/web/move-editor.tsx`
- `src/web/move-learning-panel.tsx`
- `src/web/pokedex-dialog.tsx`
- `src/web/pokedex.tsx`
- `src/web/recruit-dialog.tsx`
- `src/web/settings-choice.tsx`
- `src/web/shop-product.tsx`
- `src/web/tower-shop.tsx`
- `src/web/training-editor.tsx`

스타일 적용·토큰 및 기존 중복 선택 효과 제거:

- `src/web/styles/screen-styles.tsx`
- `src/web/styles/tokens.css`
- `src/web/styles/account.module.css`
- `src/web/styles/bag.module.css`
- `src/web/styles/battle-focus.module.css`
- `src/web/styles/battle-layout.module.css`
- `src/web/styles/challenger-candidates.module.css`
- `src/web/styles/foundation.module.css`
- `src/web/styles/game-theme.module.css`
- `src/web/styles/hidden-shop.module.css`
- `src/web/styles/item-target-list.module.css`
- `src/web/styles/mobile-ui.module.css`
- `src/web/styles/permanent-shop.module.css`
- `src/web/styles/pokedex-center.module.css`
- `src/web/styles/pokedex-editors.module.css`
- `src/web/styles/pokedex.module.css`
- `src/web/styles/retro-theme.module.css`
- `src/web/styles/reward-panel.module.css`
- `src/web/styles/run-event.module.css`
- `src/web/styles/settings-screen.module.css`
- `src/web/styles/tera-theme.module.css`
