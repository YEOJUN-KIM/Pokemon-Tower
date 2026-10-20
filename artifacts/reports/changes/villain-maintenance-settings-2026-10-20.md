# 빌런 조우·정비·출전 준비 설정 통일 (2026-10-20)

## 빌런 조우

`RunEventPanel`의 빌런/히든 보스 조우 자동 제출 타이머를 제거했다. ! 연출이 끝나도 NPC와 메시지를 유지한다. 기존 배틀 시작과 영입 결과의 확인 영역을 `GameDialogueConfirm`으로 추출하여 동일한 Z/Enter·게임패드 결정키·메시지 클릭 경로를 재사용한다. 별도의 계속/다음 버튼은 추가하지 않았다.

공통 확인 영역은 ref 잠금과 disabled 상태로 키·클릭 중복을 차단한다. 열린 모달에서는 바깥 확인 입력을 처리하지 않고, 길게 누른 반복 결정키와 선택된 텍스트의 클릭도 처리하지 않는다. 요청 실패 후 busy가 해제되면 다시 확인할 수 있다. 배틀 시작의 기존 introContinue는 실행 시 참조를 비우는 구조를 유지한다.

히든 보스 전투 시작에 있던 별도의 자동 intro 대기도 제거했다. 조우 메시지 확인 → 트레이너 등장 메시지 확인 → 포켓몬 내보내기 순서이며 각 확인 단계에서 입력을 기다린다. 이벤트 확률·보상·조직/상대 스냅샷·전투 밸런스는 바꾸지 않았다.

## 통합 포켓몬 설정

정비에서 포켓몬 선택 뒤 뜨던 기술배치/능력치 조정/포켓몬 선택으로 메뉴와 actions/moves/stats 화면 상태를 제거했다. 정비 포켓몬을 클릭하거나 Z/Enter로 선택하면 기존 `PokemonSettings`를 바로 연다.

`RunPokemonSettings`는 별도 편집 UI를 구현하지 않는 저장 어댑터다. 도감과 동일한 PokemonSettings에 기존 PokedexEntry·TrainingView·profile을 전달하고, 저장을 기존 adjust-run → TowerStore.train → saveTrainingForm 경로로 보낸다. 비용·리비전·스냅샷 검증은 그대로 사용한다. 정비 설정에는 저장한 설정이 이번 출전부터 적용된다는 안내를 사용한다.

`PokemonSettings`에 `allowFormChange` 옵션(기본 true)과 적용 시점 안내용 `inRun` 옵션을 추가했다. 도감에서는 기존처럼 폼체인지를 표시하며 도전 중에는 false로 전달한다. 폼 행만 숨기고 draft.forme를 초기화하지 않는다. 서버의 도전 중 폼 변경 거부도 유지한다.

일반 층 출전 준비에서도 실제 저장이 가능하도록 기존 adjustment 스냅샷을 이벤트가 없는 select 상태에 제공하고 adjust-run 허용 범위를 같은 상태로 확장했다. 현재 층·파티 소속·스냅샷·리비전·합법 기술/개체값·성장 비용 검증, 전투/미완료 이벤트 중 저장 차단은 유지했다.

## X키와 포커스

출전 준비의 현재 포켓몬 카드에서 X를 누르면 설정을 연다. Z/Enter는 기존 출전 선택/해제를 유지한다. 출전 3마리가 이미 선택되어 선택 불가능한 다른 카드도 공통 data-game-focusable을 이용해 커서를 올리고 X로 설정을 확인할 수 있다. 선택 제한 자체는 유지한다.

정비 포켓몬 목록도 X로 같은 설정을 연다. 공통 game-menu-key 이벤트를 현재 모달에서 처리하고, 설정을 닫을 때 기존 PokedexDialog의 returnFocus로 원래 data-party-species/data-adjust-partner 카드에 게임 커서와 포커스를 복원한다. 내부 설정의 Esc/X는 기존처럼 현재 picker 또는 설정을 닫는다.

출전 준비 footer는 이동/출전 선택/X 포켓몬 설정, 정비 목록은 이동/선택/X 설정/Esc 닫기, 정비 기본 메뉴는 이동/선택, 상점은 탭/상품/구매/뒤로, 빌런 조우는 Enter/Z 계속으로 맞췄다. 설정 화면은 기존 설정 footer를 쓴다.

## 정비 상점 정리

정비 상점 헤더의 배낭 버튼과 B 배낭 안내를 제거했다. 정비 기본 메뉴와 출전 준비의 기존 배낭 진입은 유지한다. 정비 메뉴의 지닌 도구·배틀 아이템·기술머신 및 기술배치·능력치 보조 문구를 제거하고, 사용되지 않는 설명문 CSS와 두 줄 메뉴 배치를 정리했다. 상점 구매·가격·리롤 규칙은 유지했다.

## 수정 파일

구현:
- src/web/game-dialogue-confirm.tsx (기존 확인 동작을 공유하는 영역)
- src/web/run-pokemon-settings.tsx (기존 설정의 run 저장 어댑터)
- src/web/pokemon-settings.tsx
- src/web/run-maintenance.tsx
- src/web/tower-controls.tsx
- src/web/battle-stage.tsx
- src/web/game-keyboard.ts
- src/web/run-event.tsx
- src/web/battle-messages.tsx
- src/web/battle-game.tsx
- src/web/tower-shop.tsx
- src/web/styles/run-maintenance.module.css
- src/server/tower-store.ts
- src/web/encounter-presentation.ts (Node ESM에서 JSON을 읽는 import attribute 보완)

검증:
- tests/run-settings.test.ts (신규)
- tests/form-equipment.test.ts
- e2e/maintenance-settings.spec.ts (신규)
- e2e/villain-confirm.spec.ts (신규)
- e2e/maintenance-items.spec.ts
- e2e/shop-bag-ux.spec.ts
- e2e/bag.spec.ts
- e2e/hidden-boss-events.spec.ts
- e2e/villain-campaign.spec.ts
- e2e/villain-tracks.spec.ts
- e2e/run-events.spec.ts (일반 이벤트 뒤 수동 빌런 후속 대기 검증)

## 검증 결과

프로덕션 빌드, TypeScript, CSS 구조 검사, diff 공백 검사를 통과했다. 도메인 테스트 22개가 통과했다. 브라우저 테스트 78개가 최종 통과했다(중복 실행 제외).

| 브라우저 검증 범위 | 통과 수 |
|---|---:|
| 도감 PokemonSettings | 8 |
| 새 빌런 확인·중복 입력 | 2 |
| 기존 출전·배틀 입력 | 6 |
| 히든 보스 조우·전투 | 4 |
| 정비 설정·실제 배틀 아이템 | 2 |
| 일반 층/정비 폼 유지·X 복원 | 4 |
| 배낭 | 8 |
| 상점·정비 배낭·사용 대상 | 3 |
| 영입·다음 화면 순서 | 12 |
| 일반 이벤트 | 15 |
| 로켓단 기존 캠페인 | 6 |
| 로켓단/스컬단 연속 조우·교환권 | 8 |
| 합계 | 78 |

CSS 구조 검사는 3876개의 bounded rule을 확인했다. 기존 테스트의 옛 정비 메뉴·상점 배낭·자동 조우 가정을 현재 동작으로 바꾸었고, 교환권은 이미 직접 열리는 기존 동작에 맞춰 중복 사용 버튼 클릭을 제거했다. 새 설정 테스트는 실제 수치 반영과 저장 완료를 기다린 후 DB를 확인한다.

대표 검사: 4배속에서도 연출 시간 이후 입력 대기, 키/클릭 동시 입력 한 번 처리, 히든 조우 수동 진행, 도감의 폼체인지 유지, 일반 2층/정비 11층의 공통 설정 저장과 X 복원, 스카이폼 유지, 능력치·성격·성별·기술·특성·테라 수정 저장, 상점 구매와 배낭, 배틀 아이템 무턴 사용, 스냅샷/리비전/전투/이벤트 접근 검증.

## 사람이 직접 확인할 UI

1280px 데스크톱과 390px 모바일 Chrome에서 대표 화면을 확인했다. 실제 휴대폰의 터치 스크롤 및 텍스트 길게 선택, 컨트롤러 물리 버튼, 모든 폼과 빌런 NPC의 스프라이트 크기는 직접 기기에서 추가 확인할 수 있다. 설정 화면 캡처는 test-results/run-settings-{floor}-{width}.png, 빌런 연속 이벤트 캡처는 artifacts/qa/screenshots/villain-tracks와 rocket-campaign에 기록한다.
