# 이벤트 확장 방법

기준: 2026-10-16. 선택지·연출 분리 위에 v2 미스터리 상자, 도전자 선택전 1차 및 공통 Reward Popup·서버 선택 보상을 구현했습니다. 전체 등장 10%·쿨다운과 브리더·상인의 비용·보상·무추첨 동작을 유지합니다. v2는 도전자 가중치 20을 기존 50/30/20에 추가하며, 기존 v1 런의 규칙은 보존합니다.

## 책임과 흐름

| 파일 | 책임 |
|---|---|
| `src/data/run-events.ts` | 이벤트 정의·가중치·문구·선택지 ID·코인 비용·보상 후보와 타입 |
| `src/game/run-events.ts` | DB·React 없이 이벤트 추첨, 선택지 조회, 보상 추첨 |
| `src/server/run-events.ts` | 활성화 여부·소유권·진행·등록된 종류와 선택지 검증, 선택 ID 저장, 재요청 처리 |
| `src/server/player-wallet.ts` | 기존 코인 차감과 코인·알 티켓 지급. 이번 변경에서는 기존 구현 유지 |
| `src/server/schema.ts`, `storage/migrations.ts` | 저장 제약과 v36 이전, 런별 규칙 버전 보존 |
| `src/web/event-presentation.ts` | 이벤트 ID별 상자 또는 트레이너 스프라이트 설정 |
| `src/web/run-event.tsx` | 공통 화면, 선택지 목록 렌더링, 선택 ID 전송과 보상 문구 표시 |

일반층 승리·영입 후 기존 위치에서 추첨하고 선택 대기 상태를 저장합니다. 선택 요청은 기존 API의 `choice` 문자열로 전달합니다. 서버는 해당 이벤트의 선택지인지 확인하고, 보상형 선택이면 비용 차감·보상 지급·선택 ID와 결과 저장을 기존 TowerStore 트랜잭션 안에서 처리합니다. 떠나기는 보상 없이 완료합니다. 보상 확인 전 다음 배틀은 기존과 같이 차단합니다.

동일 선택을 재전송하면 재지급·재차감하지 않습니다. 이미 확정한 것과 다른 선택은 거절합니다. 등록되지 않은 이벤트 종류가 저장돼 있으면 표시·선택·계속하기 단계에서 명시적인 오류로 거절하며, 기록이나 지갑을 임의로 변경하지 않습니다.

## 일반 이벤트 추가 예시

아래 `mysterious-scientist`는 설명용 예시이며 실제 콘텐츠로 추가하지 않았습니다.

1. `data/run-events.ts`의 `eventDefinitions`에 추가합니다. 이벤트 ID 목록은 이 객체에서 자동으로 만듭니다. 각 이벤트 안에 필요한 개수의 `choices`를 정의합니다.

```ts
'mysterious-scientist': {
  title: '연구원의 부탁', summary: '연구원이 도움을 요청한다.',
  intro: '연구를 도와줄까?', weight: 10,
  choices: [
    {
      id: 'help', label: '연구원을 도와준다', outcome: 'reward', cost: 0,
      rewards: [{weight: 1, reward: {kind: 'egg-ticket', amount: 1}}],
      message: '연구원에게 알 뽑기권 1장을 받았다!',
    },
    {id: 'leave', label: '떠난다', outcome: 'leave'},
  ],
},
```

2. `web/event-presentation.ts`에 같은 ID의 연출 설정을 추가합니다.

```ts
'mysterious-scientist': {
  artwork: 'trainer', sprite: '사용할-기존-스프라이트-ID', alt: '연구원',
},
```

기존 코인·알 티켓 보상과 떠나기만 사용하면 서버 처리·DB 스키마·UI 조건문을 추가하지 않습니다. 새 그림이 필요하면 연출 레지스트리와 web의 공통 artwork 종류를 확장합니다. 특별 배틀·포켓몬 거래 등 새로운 동작이나 보상은 해당 기능을 별도로 구현해야 합니다.

선택지 ID는 이벤트 안에서 유일하고, 출시 후에는 저장된 선택이 참조하므로 안정적으로 유지해야 합니다. 기존 `open`·`skip`도 그대로 유지했습니다. 비용은 0 이상, 보상 수량과 보상 가중치는 양수로 정의합니다. 여러 보상 후보의 가중치를 합쳐 한 번 추첨하며, 후보가 하나면 난수를 소비하지 않습니다. 이벤트 등장 확률과 쿨다운은 종류별 가중치와 별도입니다.

보상 문구의 `{reward}`는 지급 수량을 포함한 이름, `{detail}`은 코인·알 티켓의 안내로 치환합니다. React 컴포넌트나 서버 함수를 data에 넣지 않습니다.

## 저장 호환: v33 → v34

- `run_events.kind`의 개별 콘텐츠 ID `CHECK`를 없애고 `TEXT NOT NULL`로 저장합니다. 유효성은 서버에서 레지스트리를 조회해 검사합니다.
- 선택 확정에 쓰는 `choice_id TEXT`를 추가합니다. 대기 중은 NULL, 이전에 보상을 받은 기록은 `open`, 이전에 지나간 기록은 `skip`으로 복원합니다.
- 테이블 재생성·복사는 기존 초기화 트랜잭션에서 실행합니다. ID·도전·층·종류·상태·보상·수량은 그대로 복사하고, 비용이나 보상을 다시 정산하지 않습니다.
- 상태·보상·수량 제약, 도전/층 유일성, 도전당 대기 이벤트 하나의 인덱스와 외래키를 유지합니다.
- 기존 도전에 이벤트를 소급 활성화하지 않습니다. 새 콘텐츠 ID 추가에는 다음 마이그레이션이 필요하지 않습니다.

## v2 상자와 공통 Reward 기반

- `data/rewards.ts`: 적용 전 `RewardOption`·`RewardEffect`, 적용 후 `RewardResult`·`RewardEntry`. 옵션 ID·제목·표시 성격과 여러 항목을 지원합니다. 코인/티켓, 비율 손실, 메시지만 현재 구현합니다.
- `data/run-events.ts`: v1 상자 정의와 v2 결과표를 분리합니다. 새 활성 런은 규칙 v2이며, 동일한 100 범위의 보상 난수를 한 번 사용해 6개 결과 중 하나를 고릅니다. 고정 보상인 브리더·상인은 난수를 추가 소비하지 않습니다.
- `game/rewards.ts`: 서버가 제공한 잔액으로 손실을 계산하고 실제 적용 항목으로 변환하는 순수 함수. 설정을 검증하고 소수점 버림·잔액 상한을 적용합니다.
- `server/rewards.ts`: 기존 지갑 함수로 결과의 모든 항목을 적용합니다. 호출자가 소유권·트랜잭션·영수증을 담당합니다. 다른 이벤트도 이 경로를 재사용할 수 있습니다.
- `server/run-events.ts`: 선택·난수 결과·지갑 변경·`result_json`을 기존 TowerStore 트랜잭션 안에서 함께 처리합니다. 동일 선택은 즉시 재사용하며 확인은 완료 상태만 기록합니다.
- `web/reward-modal.tsx`: 실제 `dialog.showModal()`로 중앙 top layer·배경 비활성화·포커스 복원·ESC 차단·Tab 순환·Space 입력을 담당합니다. 기존 game keyboard는 열린 dialog로 입력 범위를 제한합니다.
- `web/reward-panel.tsx`: 팝업 콘텐츠를 담당하고 `RewardEntryList`와 `RewardChoiceList`를 분리했습니다. 자체 지급·추첨은 하지 않습니다. `heading`으로 사용하는 콘텐츠의 제목을 지정할 수 있습니다.
- `web/styles/reward-panel.module.css`: 픽셀풍 테두리·tone·중앙 배치·최대 높이·내용 스크롤·확인 영역을 담당합니다. 기존 화면 footer 스타일이 간섭하지 않도록 확인 영역은 별도 group입니다.
- `web/run-event.tsx`: 하단에는 짧은 상황 안내만 유지하고 열림 연출 약 650ms 후 RewardModal을 연결합니다. 동작 감소 시 지연을 생략합니다. 기존 저장 결과를 표시하며 확인은 기존 `event-continue` API를 그대로 호출합니다.

v35는 v1·v2를 허용하도록 `run_event_rules`를 이전하고, 기존 결과 열을 유지하면서 `run_events.result_json`을 추가합니다. 테이블 복사·인덱스 복원·외래키 검사는 기존 초기화 트랜잭션 안에서 실행합니다. 기존 활성화 규칙·선택 ID·결제·완료 기록은 보존하고 이미 지급한 보상을 재적용하지 않습니다.

새 이벤트는 `outcome: 'reward-result'` 선택지에 가중치가 있는 `results`와 공통 `RewardOption`을 정의하면 같은 추첨·적용·저장·표시 경로를 쓸 수 있습니다. 도전자 선택전에서는 아래 선택형 서버 저장 경로도 사용합니다.

## 선택형 Reward 확장 기반

`RewardResult.entries`는 기존에 이미 적용된 즉시 결과 목록 그대로입니다. 선택형은 선택적인 `selections` 필드로 구분하므로 기존 저장 JSON과 호환됩니다. 실제 서버 선택 정의는 DB v36의 별도 테이블에 보관합니다.

- `RewardCandidate`: 안정적인 후보 ID·표시 이름·선택적인 설명. 클라이언트에 지급할 효과 자체를 맡기지 않습니다.
- `RewardSelection`: 선택 ID·제목·후보 목록과 `state: 'pending'` 또는 `state: 'selected'`를 표현합니다. 완료 상태에는 `selectedId`가 있습니다.
- `RewardChoiceList`: 콜백이 있으면 선택하기→후보 버튼을 열고 `(selectionId, candidateId)`만 전달합니다. 선택 완료는 전달받은 결과 상태로 표시하며 클릭만으로 완료·지급했다고 가정하지 않습니다.
- 선택 대기가 하나라도 있으면 최종 확인은 비활성화합니다. 콜백이 없는 대기 항목은 '선택 기능 준비 중'으로 표시합니다. 현재 미스터리 상자는 selections가 없으므로 기존 확인 동작과 같습니다.

`server/rewards.ts`의 `selectEventReward`는 서버 후보 정의를 조회하고 공통 `applyRewardOption`으로 지급합니다. `event-reward-select`는 이벤트·선택·후보 ID만 사용합니다. HTTP에 효과를 추가해도 사용하지 않습니다. `TowerStore` 트랜잭션 안에서 효과 지급과 결과 entries 추가 및 selectedId 저장이 함께 커밋됩니다. 동일 후보 중복은 무효 처리, 다른 후보 재선택은 409입니다. 실제 에픽 도구·영양제 후보는 미구현입니다.

## 도전자 배틀과 DB v36

- `data/challengers.ts`: ChallengerDefinition 배열·공개 후보 projection·등장 가중치/최소 통과 층. 공통 NPC 20개 Sample에서 minFloor·pool·weight로 ID/표시명 중복 없이 3명을 추첨하고 각 후보 Rank를 독립 결정합니다. 실제 육성 팀·기믹·시드까지 발생 시 snapshot합니다. [공통 육성 구조](NPC_TRAINING.md)를 사용합니다. 기존 trainer catalog의 TrainerSample 형태와 보유 스프라이트를 사용합니다.
- `game/run-events.ts`: 전체 10%와 쿨다운 유지. 층·규칙 버전별로 후보 이벤트를 필터링하고 가중치 추첨합니다. 기본 규칙 인자는 legacy v1이며 서버는 저장 버전을 명시합니다.
- `challenger_encounters`: event_id 고유, 실제 추첨한 후보 3개의 정의 JSON, selected_id, 현재 battle_id, phase(choice/battle/reward). 후보와 효과 정의는 발생 시 저장해 재접속·데이터 변경으로 바뀌지 않습니다. API view는 공개 표시 필드만 전달합니다.
- `event_reward_selections`: (event_id,selection_id) 고유, 지급 효과가 있는 서버 정의 JSON. 승리 기본 보상과 pending 선택을 같은 트랜잭션에 저장합니다. 기존 result_json에 최종 선택·실제 지급 결과를 저장합니다.
- run_events는 choice/reward/complete를 유지하고 중간 배틀은 sidecar phase로 표현합니다. 선택 저장+배틀 생성, 배틀 완료+즉시 보상+pending 후보, 추가 선택 지급+selected 상태 각각 원자적으로 처리합니다. 신규 테이블만 추가하므로 기존 이벤트·배틀을 재작성하거나 재지급하지 않습니다.
- TowerStore.createBattle의 선택적 도전자 정의로 기존 팀 생성·패킹·규칙·아이템·BattleSession을 재사용합니다. 같은 floor/stage의 다음 attempt를 배정해 이후 일반층 배틀도 보존합니다. attempt는 배틀 슬롯 식별이며 실제 재도전 소모량은 run_retries.used만 사용합니다. 숨은 보스 stage와 충돌하지 않습니다.
- currentBattle은 진행 중 이벤트 battle_id를 우선 조회합니다. 승리 콜백은 공통 아이템 정산 후 이벤트 보상을 적용하고 runs.state=select로 바꿉니다. 일반 rewards/recruitments를 만들지 않으므로 영입·일반층 승리 수·층 증가가 없습니다. 확인 뒤 기존 enter로 같은 층 일반전을 생성합니다.
- 패배는 기존 lost/재도전/성장 정산 정책을 유지합니다. 재도전 준비에서는 이벤트 화면을 숨기고 기존 정비 창을 표시합니다. 새 시도에 연결 battle_id를 갱신하며 상대 팀·시드·엔진 버전을 그대로 복사합니다.
- 기본 팀은 직전 출전 팀의 suggestedTeam입니다. 새 AI 엔진이나 별도 출전 선택 UI는 추가하지 않았습니다. 통과 층 최소값 1, v2 가중치 20이며 기존 50/30/20의 상대 비중은 유지합니다. 규칙 v1에서는 제외됩니다.
- `web/challenger-candidates.tsx`: PC 3열·모바일 스크롤·현재 게임 커서. RewardModal/RewardPanel/RewardChoiceList를 재사용하며 미선택 항목이 남으면 확인과 서버 continue/enter를 차단합니다. 후보를 추가하는 것 외에 새로운 효과 종류는 공통 reward 처리에서 확장해야 합니다.

## 검증 위치

- `tests/run-event-rules.test.ts`: 기존 가중치 경계·전체 난수 호출 순서·고정 보상 무추첨.
- `tests/run-events.test.ts`: 기존 동작·복구·결제 롤백, 3개 선택지 fixture·새 ID 저장·중복 요청·알 수 없는 ID·v33 전체 상태 보존.
- `tests/run-event-ui.test.ts`: 실제 이벤트 선택 버튼·ID 전달과 기존 보상 문구·연출 등록. `tests/reward-ui.test.ts`는 즉시 결과 호환과 선택 대기·완료 타입/화면을 검증합니다.
- `tests/architecture-boundaries.test.ts`: data/game/server와 web 의존 경계.
- `e2e/run-events.spec.ts`, `e2e/run-event-preview.spec.ts`: 실제 API·브라우저의 진행·복구·레이아웃.

[이벤트와 보상 기획](../gameplay/EVENTS.md) · [저장 데이터](DATABASE.md)

추가 검증: `tests/mystery-chest.test.ts`는 v2 전체 확률 구간·손실 경계·중복·복구·롤백·v34 호환을, `e2e/mystery-chest.spec.ts`는 결과 6종의 PC·모바일 UI와 API 재요청·확인 흐름을 검증합니다.

[이번 확장의 검증 결과·변경 파일·남은 문제](../../artifacts/reports/changes/MYSTERY_CHEST_REWARDS.md)

- `tests/challenger-events.test.ts`·`tests/challenger-fixture.ts`: 결정론적 만남, 복구, 세 배틀의 엔진 진입, 영입 제외, 보상/선택 롤백·재지급 방지, 재도전, 능력 한도.
- `e2e/challenger-events.spec.ts`: 실제 Chrome PC/모바일 후보·키보드·돌아가기, 배틀 표시, 내부 완료 fixture 후 팝업, 서버 선택 API·동시 중복 및 화면 저장. 전체 전투 승리는 테스트 전용 내부 callback fixture이며 클라이언트 승패 입력 API는 추가하지 않습니다.

새 일반층과 도전자의 공통 구조·v38 런별 규칙·스냅샷 호환·도구/기믹 정책은 [NPC Sample·Rank](NPC_TRAINING.md)를 따릅니다. 신규 보상은 `data/challenger-rewards.ts`, Sample은 `data/npc-samples.ts`, 과거 후보 해석은 `data/legacy-challengers.ts`로 분리합니다.
