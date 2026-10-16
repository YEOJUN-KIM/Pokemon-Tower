# 이벤트 확장 방법

기준: 2026-10-16. 기존 3종의 콘텐츠·확률·비용·보상·난수 소비 순서를 유지하면서 선택지와 연출을 데이터로 분리했습니다.

## 책임과 흐름

| 파일 | 책임 |
|---|---|
| `src/data/run-events.ts` | 이벤트 정의·가중치·문구·선택지 ID·코인 비용·보상 후보와 타입 |
| `src/game/run-events.ts` | DB·React 없이 이벤트 추첨, 선택지 조회, 보상 추첨 |
| `src/server/run-events.ts` | 활성화 여부·소유권·진행·등록된 종류와 선택지 검증, 선택 ID 저장, 재요청 처리 |
| `src/server/player-wallet.ts` | 기존 코인 차감과 코인·알 티켓 지급. 이번 변경에서는 기존 구현 유지 |
| `src/server/schema.ts`, `storage/migrations.ts` | 저장 제약과 v34 이전 |
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

## 검증 위치

- `tests/run-event-rules.test.ts`: 기존 가중치 경계·전체 난수 호출 순서·고정 보상 무추첨.
- `tests/run-events.test.ts`: 기존 동작·복구·결제 롤백, 3개 선택지 fixture·새 ID 저장·중복 요청·알 수 없는 ID·v33 전체 상태 보존.
- `tests/run-event-ui.test.ts`: 실제 선택 버튼의 개수·표시·ID 전달과 기존 보상 문구·연출 등록.
- `tests/architecture-boundaries.test.ts`: data/game/server와 web 의존 경계.
- `e2e/run-events.spec.ts`, `e2e/run-event-preview.spec.ts`: 실제 API·브라우저의 진행·복구·레이아웃.

[이벤트와 보상 기획](../gameplay/EVENTS.md) · [저장 데이터](DATABASE.md)
