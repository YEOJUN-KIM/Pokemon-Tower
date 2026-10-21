# 미스터리 상자·공통 Reward 기반 검증

공개 참조 안내: Git에서 제외한 로컬 캡처는 링크 대신 경로로 표기한다. 캡처 파일은 공개 저장소에 포함하지 않는다.

작성: 2026-10-16. 현재 동작·테스트용 보상표는 [이벤트 규칙](../../../docs/gameplay/EVENTS.md), 책임과 재사용 방법은 [개발 안내](../../../docs/engineering/EVENT_SYSTEM.md)를 따릅니다. 이 기록은 이번 변경 범위와 검증 결과를 남깁니다.

최신 UI 확장 내역은 하단의 **Reward Popup UI 확장**을 따릅니다. 앞부분은 최초 상자·보상 기반 구현 당시 기록입니다.

## 범위

새 이벤트 활성 런만 v2 미스터리 상자를 사용합니다. DB v35에서 기존 v1·대기 선택·지급 결과·완료 기록과 이벤트 비활성 런을 보존합니다. 브리더·상인의 콘텐츠는 변경하지 않았습니다. 다른 전투 이벤트와 아이템 선택형 Reward는 구현하지 않았습니다. TowerStore·BattleGame 전체 리팩터링과 NPC 수정은 하지 않았습니다.

공통 옵션·결과·항목 타입, 잔액 기반 결과 계산, 기존 지갑을 사용하는 트랜잭션 내 적용 함수, 목록형 RewardPanel을 분리했습니다. 이벤트의 선택 기록과 결과 JSON이 영수증 역할을 하며 같은 선택을 재처리해도 지급하지 않습니다. 확인 버튼은 상태만 완료하고 지급하지 않습니다.

## 검증 결과

| 검사 | 결과 |
|---|---|
| `pnpm build` | 통과. Windows junction 생성을 위해 sandbox 밖에서 실행 |
| `pnpm typecheck` | 통과 |
| `pnpm check:css` | 통과 |
| `pnpm check:workspace` | 통과 |
| `git diff --check` | 통과 |
| 이벤트·보상·UI·architecture boundary 관련 테스트 | 29개 통과 |
| 이벤트 E2E: mystery-chest, run-events, run-event-preview | 28개 통과 |
| `pnpm test` 전체 | 498개 중 497개 통과, NPC 폼 검사 1개 실패 |

새 서버 테스트는 전체 100개 보상 추첨 구간, 꽝·손실·획득·복합 보상, 0·소액 잔액과 버림 계산, 중복·재접속·결과 확인 전후, 지급 및 결과 저장 실패 롤백, v34 저장 호환을 검증합니다. 신규 E2E 12개는 결과 6종을 PC 1280px·모바일 390px에서 고정 fixture로 검증합니다. 기존 E2E 16개도 유지합니다.

### 발견한 실패와 처리

- 전체 테스트와 `trainer-catalog.test.ts` 단독 재실행에서 `boss identities vary by run...` 검사가 실패했습니다. 이벤트를 활성화하지 않은 진단에서도 `named-bede`의 기대 후보에는 `Rapidash`, 실제 상대에는 `Rapidash-Galar`가 들어가 재현됐습니다. 이번 변경은 해당 NPC 생성·후보 규칙을 수정하지 않았으며, 테스트의 스키마 기대값만 34에서 35로 갱신했습니다. NPC 폼 검사의 불일치는 별도 후속 항목입니다.
- 첫 E2E 실행에서는 새 계정 생성 횟수가 기존 테스트와 합산되어 브리더·상인 8개가 가입 제한에 걸렸습니다. 신규 mystery-chest 테스트의 각 fixture 시작 시 **테스트 전용 `.data/e2e.sqlite`의 signup 카운터만** 초기화하도록 분리한 뒤 28개가 모두 통과했습니다. 실제 계정 제한 로직은 변경하지 않았습니다.
- 초기 서버 테스트에서 '저장 복원은 난수를 소비하지 않는다'는 감시 함수를 다음 배틀 생성까지 적용해 실패했습니다. 결과 복구·재시도까지 감시하고 다음 배틀에는 정상 난수를 허용하도록 테스트 범위를 바로잡았습니다.

## 남은 항목

상자 값은 초기 테스트용이며 실제 경제 밸런스는 후속입니다. 도구 후보 중 하나를 고르는 선택 UI·서버 선택 영수증, 새 보상 종류, 도전자 선택전·레이드·빌런·상인·미러 연결은 미구현입니다. 기존 옵션 ID·결과 타입·적용 함수·목록 UI와 저장/확인 흐름은 재사용할 수 있습니다.

## 화면 자료

- [현재 상자 진행 GIF](../../qa/previews/events/chest-event.gif)
- 모바일 복합 보상 — `../../qa/screenshots/mystery-chest/treasure-390.png` (로컬 캡처, Git 미포함)
- PC 손실 결과 — `../../qa/screenshots/mystery-chest/trap-1280.png` (로컬 캡처, Git 미포함)

기존 촬영 스크립트와 GIF 인코더를 재사용했습니다. 결과 6종의 스크린샷은 `artifacts/qa/screenshots/mystery-chest/`에 있습니다.

## 변경 파일

- `artifacts/qa/previews/events/chest-event.gif`
- `artifacts/reports/changes/MYSTERY_CHEST_REWARDS.md`
- `docs/STATUS.md`
- `docs/current/ROADMAP.md`
- `docs/engineering/DATABASE.md`
- `docs/engineering/EVENT_SYSTEM.md`
- `docs/gameplay/EVENTS.md`
- `docs/gameplay/EVENT_CANDIDATES.md`
- `e2e/mystery-chest.spec.ts`
- `e2e/run-event-preview.spec.ts`
- `e2e/run-events.spec.ts`
- `src/data/rewards.ts`
- `src/data/run-events.ts`
- `src/game/rewards.ts`
- `src/game/run-events.ts`
- `src/server/rewards.ts`
- `src/server/run-events.ts`
- `src/server/schema.ts`
- `src/server/storage/migrations.ts`
- `src/web/reward-panel.tsx`
- `src/web/run-event.tsx`
- `src/web/styles/reward-panel.module.css`
- `tests/battle-retry.test.ts`
- `tests/boss.test.ts`
- `tests/consumable-shop.test.ts`
- `tests/held-items.test.ts`
- `tests/hundred-floor.test.ts`
- `tests/mystery-chest.test.ts`
- `tests/run-events.test.ts`
- `tests/trainer-catalog.test.ts`
- `tests/villain-campaign.test.ts`

기존 이벤트 회귀 테스트는 v1을 명시하고, 저장 관련 테스트 8개는 지원 스키마 버전 기대값을 v35로 갱신했습니다.

## Reward Popup UI 확장 (f6d2052 이후)

### 구조와 범위

하단 메시지 영역에 있던 RewardPanel을 독립 중앙 팝업으로 옮겼습니다. `RewardModal`은 실제 modal dialog의 top layer·backdrop·포커스 복원·Tab 순환·ESC 차단·Space 입력을 담당합니다. 기존 game keyboard가 열린 dialog 안으로 입력을 제한합니다. RewardPanel은 제목·tone·결과 목록·후보 선택 기반·확인 영역을 담당하며, RewardEntryList와 RewardChoiceList를 분리했습니다.

하단은 짧은 상황 문장만 보여주고 결과 목록을 중복 렌더링하지 않습니다. 열림 연출 약 650ms 뒤 팝업을 표시하며 동작 감소 설정에서는 지연을 생략합니다. 꽝·손실은 성공용 Glow와 별을 표시하지 않습니다. 확인 영역은 기존 전역 footer 스타일의 간섭을 피하도록 독립 group으로 구성합니다.

`RewardResult.entries`와 기존 JSON은 유지합니다. 선택적인 `selections`에 `RewardSelection`의 pending/selected 상태와 selectedId를 표현하고, 후보는 RewardCandidate의 안정적인 ID·표시 이름·설명으로 구분합니다. 콜백이 연결된 경우에만 선택하기→후보 목록을 열고 선택 ID·후보 ID를 전달합니다. 클릭 자체로 로컬 지급·완료 상태를 만들지 않습니다. 미선택 항목이 있으면 최종 확인은 비활성화합니다.

서버 지급·잔액 계산·DB v35·이벤트 결과 저장·재시도·트랜잭션·상자 확률과 보상 데이터는 수정하지 않았습니다. 실제 도구/영양제 후보 풀, 서버 선택 저장·지급 API, 도전자 선택전 등은 아직 미구현입니다.

### 이번 UI 작업의 변경 파일

- `src/data/rewards.ts`
- `src/web/reward-modal.tsx` (추가)
- `src/web/reward-panel.tsx`
- `src/web/run-event.tsx`
- `src/web/styles/reward-panel.module.css`
- `src/web/styles/run-event.module.css`
- `tests/reward-ui.test.ts` (추가)
- `e2e/mystery-chest.spec.ts`
- `docs/gameplay/EVENTS.md`
- `docs/gameplay/EVENT_CANDIDATES.md`
- `docs/engineering/EVENT_SYSTEM.md`
- `docs/STATUS.md`
- `docs/current/ROADMAP.md`
- `artifacts/reports/changes/MYSTERY_CHEST_REWARDS.md`
- `artifacts/qa/previews/events/chest-event.gif`

위 목록은 이번 Reward 작업의 변경만 포함합니다. 같은 작업 공간에서 별도로 변경 중인 배틀 메시지·설정 파일은 포함하지 않습니다.

### 화면 자료

- PC 대박 팝업 — `../../qa/screenshots/mystery-chest/treasure-1280.png` (로컬 캡처, Git 미포함)
- PC 손실 팝업 — `../../qa/screenshots/mystery-chest/trap-1280.png` (로컬 캡처, Git 미포함)
- 모바일 대박 팝업 — `../../qa/screenshots/mystery-chest/treasure-390.png` (로컬 캡처, Git 미포함)
- 모바일 꽝 팝업 — `../../qa/screenshots/mystery-chest/empty-390.png` (로컬 캡처, Git 미포함)
- [갱신한 상자 진행 GIF](../../qa/previews/events/chest-event.gif)

### 검증

- 빌드: 통과. 공유 `.next` 출력의 manifest 충돌을 피하기 위해 지정 커밋 `f6d2052`에 이번 Reward 변경만 얹은 `.data/reward-popup-qa`에서 별도 빌드·3307 포트로 검사했습니다. 작업 복사본의 테스트 origin만 해당 포트로 바꿨으며 실제 프로젝트 설정은 유지합니다.
- 타입·CSS·문서 링크·diff 검사: 통과.
- 이벤트·보상·UI·architecture boundary 관련 테스트: 30개 통과.
- 이벤트 E2E: 29개 통과. neutral/loss/good/great와 결과 6종의 1280px·390px, overlay 여부·중앙 정렬·목록 중복 없음·배경 클릭 차단·ESC/X 차단·Tab 순환·Enter/Z/Space 확인·재접속·중복 지급 방지와 작은 모바일 화면의 긴 목록 내부 스크롤을 검사했습니다.
- 초기 브라우저 검사에서 native dialog의 Shift+Tab이 컨텐츠 밖으로 포커스를 옮기는 경우를 확인해 명시적인 Tab 순환을 추가했습니다. 시각 검토에서 기존 footer 스타일 간섭으로 확인 버튼이 왼쪽에 붙는 문제를 확인해 구조를 보완하고 중앙 정렬 검사를 추가했습니다. 이후 E2E는 모두 통과했습니다.

전체 테스트 실행 결과는 아래 추가 기록을 참고합니다. 선택형 보상은 타입·UI·콜백 기반만 검증했으며 실제 서버 선택 저장을 검증한 것으로 해석하지 않습니다.

### 전체 검사에서 남은 실패

- 공유 작업 공간의 전체 검사는 다른 배틀 메시지 작업이 함께 진행되는 시점에 실행되어, 이 작업만의 결과와 구분합니다. 공유 빌드 출력에서는 route manifest 부재로 브라우저 서버 시작에도 실패해 QA 복사본으로 분리했습니다.
- QA 복사본의 첫 전체 검사는 실험 JSON fixture가 누락되어 실패했습니다. 기존 작업 공간의 필요한 읽기용 fixture 9개를 복사한 뒤 재검사했습니다.
- QA 복사본의 병렬 `pnpm test`: 493개 중 491개 통과, 2개 실패. Attract 재생 로그의 `|t:|` 타임스탬프 차이와 trainer-catalog 테스트 파일 단위 실패가 있었습니다.
- QA 복사본의 직렬 전체 검사: 497개 중 495개 통과, 2개 실패. battle-items-maintenance의 아이템 공격 강화 기대값이 1인데 0인 경우와 primal-player 테스트 파일 단위 실패가 있었습니다. 파일 단위 실패는 runner가 추가 원인을 출력하지 않아 단정하지 않습니다.
- 직렬 실행에서 실패한 두 파일만 별도로 재실행하니 7개 모두 통과했습니다. 전체 검사를 완전 통과했다고 기록하지 않으며, 이 항목을 해결하기 위해 Reward 범위 밖의 전투·아이템·NPC 로직을 수정하지 않았습니다.

전체 검사에서 파일 단위로 종료된 경우 하위 테스트 수가 집계되지 않아 실행별 전체 개수가 다릅니다. 이번 기능의 관련 테스트 30개와 이벤트 E2E 29개는 최종 통과했습니다. 재사용 가능한 부분은 중앙 modal·결과 목록·tone·확인 흐름·선택 상태/후보 타입·선택 콜백이며, 실제 서버 선택 저장은 다음 도전자 선택전 작업에서 추가해야 합니다.
