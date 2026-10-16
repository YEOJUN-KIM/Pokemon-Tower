# 미스터리 상자·공통 Reward 기반 검증

작성: 2026-10-16. 현재 동작·테스트용 보상표는 [이벤트 규칙](../../../docs/gameplay/EVENTS.md), 책임과 재사용 방법은 [개발 안내](../../../docs/engineering/EVENT_SYSTEM.md)를 따릅니다. 이 기록은 이번 변경 범위와 검증 결과를 남깁니다.

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
- [모바일 복합 보상](../../qa/screenshots/mystery-chest/treasure-390.png)
- [PC 손실 결과](../../qa/screenshots/mystery-chest/trap-1280.png)

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
