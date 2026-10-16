# 이벤트 확장 방법

기준: 2026-10-16. 선택지·연출 분리 위에 v2 미스터리 상자와 목록형 공통 Reward 기반을 추가했습니다. 전체 등장·종류 가중치·쿨다운과 브리더·상인의 비용·보상·무추첨 동작을 유지하고, 기존 v1 런의 상자 규칙도 보존합니다.

## 책임과 흐름

| 파일 | 책임 |
|---|---|
| `src/data/run-events.ts` | 이벤트 정의·가중치·문구·선택지 ID·코인 비용·보상 후보와 타입 |
| `src/game/run-events.ts` | DB·React 없이 이벤트 추첨, 선택지 조회, 보상 추첨 |
| `src/server/run-events.ts` | 활성화 여부·소유권·진행·등록된 종류와 선택지 검증, 선택 ID 저장, 재요청 처리 |
| `src/server/player-wallet.ts` | 기존 코인 차감과 코인·알 티켓 지급. 이번 변경에서는 기존 구현 유지 |
| `src/server/schema.ts`, `storage/migrations.ts` | 저장 제약과 v35 이전, 런별 규칙 버전 보존 |
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
- `web/reward-panel.tsx`와 전용 CSS: 서버에 저장된 제목·목록을 표시하고 확인을 요청합니다. 자체 추첨·지급은 없으며 GameDialogue와 기존 키보드 선택 경로를 사용합니다.

v35는 v1·v2를 허용하도록 `run_event_rules`를 이전하고, 기존 결과 열을 유지하면서 `run_events.result_json`을 추가합니다. 테이블 복사·인덱스 복원·외래키 검사는 기존 초기화 트랜잭션 안에서 실행합니다. 기존 활성화 규칙·선택 ID·결제·완료 기록은 보존하고 이미 지급한 보상을 재적용하지 않습니다.

새 이벤트는 `outcome: 'reward-result'` 선택지에 가중치가 있는 `results`와 공통 `RewardOption`을 정의하면 같은 추첨·적용·저장·표시 경로를 쓸 수 있습니다. 단 현재 정의된 동작은 가중치 결과 추첨이며, 플레이어가 보상 후보 중 하나를 고르는 API/UI는 아직 구현하지 않았습니다. 향후에는 옵션 ID를 서버에서 검증하고 기존 `applyRewardOption`을 한 번 호출한 결과를 해당 이벤트의 영수증과 저장하는 방식으로 확장합니다. 클라이언트가 임의 항목·수량을 제출해 지급하게 만들지 않습니다.

## 검증 위치

- `tests/run-event-rules.test.ts`: 기존 가중치 경계·전체 난수 호출 순서·고정 보상 무추첨.
- `tests/run-events.test.ts`: 기존 동작·복구·결제 롤백, 3개 선택지 fixture·새 ID 저장·중복 요청·알 수 없는 ID·v33 전체 상태 보존.
- `tests/run-event-ui.test.ts`: 실제 선택 버튼의 개수·표시·ID 전달과 기존 보상 문구·연출 등록.
- `tests/architecture-boundaries.test.ts`: data/game/server와 web 의존 경계.
- `e2e/run-events.spec.ts`, `e2e/run-event-preview.spec.ts`: 실제 API·브라우저의 진행·복구·레이아웃.

[이벤트와 보상 기획](../gameplay/EVENTS.md) · [저장 데이터](DATABASE.md)

추가 검증: `tests/mystery-chest.test.ts`는 v2 전체 확률 구간·손실 경계·중복·복구·롤백·v34 호환을, `e2e/mystery-chest.spec.ts`는 결과 6종의 PC·모바일 UI와 API 재요청·확인 흐름을 검증합니다.

[이번 확장의 검증 결과·변경 파일·남은 문제](../../artifacts/reports/changes/MYSTERY_CHEST_REWARDS.md)
