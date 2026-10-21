# 도전자 선택전 UI

공개 참조 안내: Git에서 제외한 로컬 캡처는 링크 대신 경로로 표기한다. 캡처 파일은 공개 저장소에 포함하지 않는다.

기준: 2026-10-17. 후보 생성·전투·Rank·보상·Mirror 확률을 유지하면서 선택 화면만 변경했습니다.

## 구조와 조작

| 항목 | 구현 |
|---|---|
| 1. 새 UI 구조 | 하단 메시지창의 후보 3명 + 돌아가기 목록, 배틀 영역의 상세창 한 개. 최초 후보 1번 선택 |
| 2. 숫자키 | 1/2/3은 기존 `selectGameCursor`로 포커스만 변경. 서버 요청 없음 |
| 3. 확정 | Z/Enter 또는 별도 도전한다 버튼 → 기존 `event-choice`에 저장된 후보 ID 전달 |
| 4. 방향키 | 기존 `data-keyboard-list`의 ↑↓로 후보 1→2→3→돌아가기 이동. 돌아가기 포커스는 상세창 숨김 |
| 5. 취소 | 4/X, 돌아간다 클릭, 돌아가기에서 Z/Enter → 기존 `choice: back` |
| 6. 마우스 | 기존 공통 keyboard helper의 pointer 이동으로 hover 미리보기. 이름 클릭은 선택만 하고 도전한다로 확정 |
| 7. 모바일 | 이름 터치로 상세 확인, 선택 강조 후 도전한다 터치로 확정. PC 상세창은 좌측, 760px 이하 모바일은 중앙 |
| 8. 일반 NPC 설명 | `battleStyle`은 유지하되 상세 컴포넌트에서 렌더링하지 않음 |
| 9. specialHint | 후보 view model의 optional `specialHint?: string`. 저장 정의에 값이 있으면 그대로 전달, 없으면 영역도 없음 |
| 10. Mirror | 기존 저장에도 view projection으로 힌트 제공. 이름 ???, 어딘가 익숙한 기분이 든다., 기존 정면 스프라이트와 얼굴 음영 유지 |
| 11. Rank/별 | difficulty + 기존 danger만 표시. 위험도 문구 제거, Mirror ★★★ 유지 |
| 12. Reward Preview | 기존 rewardPreview 범주만 표시. 실제 종류·수량은 승리 전 비공개 |
| 13. 제거 범위 | Challenger의 대형 3열 카드만 교체. Shop/Hidden Shop/Reward Card 변경 없음 |
| 14. 재사용 | API, DB snapshot, NPC 팀/AI/Rank/가중치, 재도전, 영입 없음, Reward Popup·Master·Mirror 선택/지급 경로 모두 유지 |

상세창은 모달이 아닌 aside이며 Tab 이동을 가두지 않습니다. 하나의 선택 ID를 BattleGame에서 공유하고 숫자키·공통 커서·native focus·포인터·터치를 동기화합니다. 후보 변경은 즉시 반영하며 애니메이션을 추가하지 않습니다. 선택 ID는 이벤트 ID에 묶여 다른 이벤트로 넘어가면 첫 후보가 기본값입니다. 새로고침 후 저장된 같은 후보를 복구하고 첫 후보부터 다시 미리봅니다.

하단 안내문만 Challenger 선택 중 간결한 높이로 표시합니다. 이벤트 공통 배치·다른 이벤트 안내문은 유지합니다. 상세 이미지의 object-fit: contain과 image-rendering: pixelated, Mirror SVG의 원본 viewBox로 비율과 픽셀 표현을 유지합니다.

## 15. 검증

브라우저 테스트는 실제 Chrome과 테스트 전용 SQLite DB를 사용합니다. 보상 승리는 기존 검증된 내부 완료 fixture로 진행하며 클라이언트 승리 API를 추가하지 않습니다.

| 검증 | 결과 |
|---|---|
| 관련 단위·통합 테스트 7개 파일 | 110/110 통과 |
| 도전자·Mirror·Rank 보상·Hidden Shop·일반 정비·상자 브라우저 회귀 5개 파일 | 29/29 통과 |
| 최종 CSS 경계 수정/빌드 후 PC 좌측·모바일 중앙, 조작·얼굴 음영·복구 재검증 | 4/4 통과 |
| TypeScript / Next production build | 통과 |
| CSS 구조 / 문서 링크 / git diff --check | 통과 |

전체 654개 테스트를 이번 UI 작업에서 다시 실행한 것은 아니며, 변경 화면과 공통 이벤트·상점·보상 경로를 중심으로 검증했습니다.

- `e2e/challenger-events.spec.ts`: 숫자키 미리보기, 2→Enter/3→Z로 실제 상대 확인, ↑↓/Tab/hover/click/실제 touch, 4/X/back, 새로고침 snapshot, 일반 NPC 설명 미표시, Rank/보상, 메시지창 겹침·화면 경계·돌아가기 가시성, 픽셀 렌더링, 기존 승리/영입 없음/Master 보상.
- `e2e/mirror-challenger.spec.ts`: PC/모바일 Mirror 음영·힌트·snapshot 및 1V/6V/이로치 보상 선택 복구/중복 지급 방지.
- `e2e/rank-rewards.spec.ts`: 범주별 미리보기, Master 실제 보상 선택, Elite 영양제·도구·TM 지급/사용.
- `tests/run-event-ui.test.ts`: 일반 battleStyle 비노출, optional specialHint 및 미래 특별 후보 projection, 돌아가기 상세창 없음.

PC 화면 — `../../artifacts/qa/screenshots/challengers/candidates-1280.png` (로컬 캡처, Git 미포함) · 모바일 화면 — `../../artifacts/qa/screenshots/challengers/candidates-390.png` (로컬 캡처, Git 미포함) · Mirror PC — `../../artifacts/qa/screenshots/mirror/candidates-1280.png` (로컬 캡처, Git 미포함) · Mirror 모바일 — `../../artifacts/qa/screenshots/mirror/candidates-390.png` (로컬 캡처, Git 미포함)

## 16. 이번 UI 변경 파일

- [battle-game.tsx](../../src/web/battle-game.tsx): 이벤트별 선택 상태와 단축키 연결.
- [run-event.tsx](../../src/web/run-event.tsx): 상세창/하단 목록 배치 및 기존 API 연결.
- [challenger-candidates.tsx](../../src/web/challenger-candidates.tsx): 상세 컴포넌트·선택 목록·확정 버튼.
- [challenger-candidates.module.css](../../src/web/styles/challenger-candidates.module.css): 크기·위치·선택 강조·모바일.
- [run-event.module.css](../../src/web/styles/run-event.module.css): Challenger 안내문 높이.
- [legacy-challengers.ts](../../src/data/legacy-challengers.ts), [challengers.ts](../../src/data/challengers.ts): optional specialHint와 표시용 projection.
- [run-event-ui.test.ts](../../tests/run-event-ui.test.ts).
- [challenger-events.spec.ts](../../e2e/challenger-events.spec.ts), [mirror-challenger.spec.ts](../../e2e/mirror-challenger.spec.ts), [rank-rewards.spec.ts](../../e2e/rank-rewards.spec.ts).
- [EVENTS.md](../gameplay/EVENTS.md), [CONTROLS.md](../gameplay/CONTROLS.md), [MIRROR_CHALLENGER.md](MIRROR_CHALLENGER.md), 이 문서.

앞선 Mirror 구현의 미커밋 변경과 별개로 이번 UI 리팩터링에서 서버 파일·DB 스키마·이미지 파일은 수정하지 않았습니다.
