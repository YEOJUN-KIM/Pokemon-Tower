# 로켓단 Run Event 캠페인

현재 모든 적격 이벤트가 공통 10%·통과 횟수 쿨다운 2를 따른다. 로켓단만 후보로 남기던 수동 QA 설정과 3층부터 Raid를 강제하던 설정은 제거했다. 캠페인 단계별 weight와 단서 조건은 `src/data/villain-campaigns.ts`, 공통 발생률은 `src/data/run-events.ts`의 `eventEncounterSettings`를 따른다. 기존 이벤트/배틀 snapshot은 변경하지 않는다. 테스트는 명시적 registry/fixture로 특정 캠페인을 재현한다.

## 동작 및 기존 샘플

`rocket-intro → rocket-ambush × 2 → rocket-officer → rocket-boss → 완료`.
첫 조우는 타워 관리/물류 구역, 간부는 폐쇄 보안 구역, 비주기는 임시 지휘실이다.
일반 랜덤 층을 생성하던 `TowerStore.createBattle`의 `villainEncounter`/`villainGrunt` 호출을 제거했다.
일반 샘플 선택에도 기존 `role !== 'villain'` 분류를 적용한다. 이름 비교를 사용하지 않는다.
5층 네임드·기존 보스·Challenger·Raid의 샘플 선택은 변경하지 않는다.

기존 조직 registry의 조무래기 정의를 `organizationGrunt('rocket')`로 공유한다.
동일한 `rocket-grunt` ID/파티/초상화를 사용하며, 간부는 `villainLeaders.rocket.executive`
(`named-archer`, 아폴로), 최종 상대는 `.boss` (`named-giovanni`, 비주기)를 그대로 사용한다.
기존 트레이너 데이터, 팀 구성, 초상화, 랭크 및 다른 조직의 샘플은 삭제하지 않았다.
옛 독립 추첨 helper는 보관된 샘플/테스트 호환용으로 남지만 라이브 일반 전투에서는 호출하지 않는다.

## 영속 상태와 migration

DB v43 → v44는 다음 두 테이블을 추가한다. `initializeTowerDatabase`의 기존 transaction 안에서 생성하며 재실행에 안전하다.

- `run_organization_campaigns`: 복합 PK `(run_id, organization)`, `started`, `clues`, `officer_defeated`, `boss_location_known`, `boss_defeated`, `completed`.
- `villain_event_encounters`: `event_id` PK/FK, `snapshot_json`, 현재 시도의 `battle_id` UNIQUE/FK, `claimed`.

미시작 상태는 행 없음/모든 값 0이다. 첫 승리 때 상태 행을 생성한다.
기존 `run_villain_campaigns`는 과거 일반 층 빌런 전투의 보스 격파 receipt용으로 보존한다.
기존 전투/지갑/인벤토리/receipt는 다시 지급하거나 새 체인의 진행도로 변환하지 않는다.
기존 런 중 Run Event v2가 활성화된 런에서도 새 체인을 발견할 수 있다. v1 이벤트 정의는 유지한다.

진행도 조회는 상태 테이블을 직접 사용한다. floor나 전투 이력으로 추론하지 않는다.
Teleport 후에도 상태가 유지되며 cooldown은 기존 `cleared_count`/이벤트 `encounter_order`를 사용한다.

## Eligibility 및 임시 밸런스

설정: `src/data/villain-campaigns.ts`의 `rocketCampaignSettings`.
전체 이벤트 구현 완료 후 확률과 보상을 재조정할 예정이다.

| 이벤트 | 조건 (공통: 완료되지 않음) | weight | minFloor | 추가 제한 | 승리 코인 |
| --- | --- | ---: | ---: | --- | ---: |
| rocket-intro | 시작 전 | 100 | 1 | afterFloor ≤ 30 | 300 |
| rocket-ambush | 시작됨, clues < 2 | 100 | 1 | 기습 승리마다 단서 +1 | 100 |
| rocket-officer | 시작됨, clues ≥ 2, 간부 미격파 | 100 | 1 | 승리 후 보스 위치 공개 | 500 |
| rocket-boss | 간부 격파, 보스 위치 공개, 보스 미격파 | 100 | 1 | 승리 후 완료 | 1,000 |

완료 후 네 이벤트 모두 제외한다. 첫 조우를 지나가면 미시작 상태를 유지하므로 cooldown 후 재등장한다.
기존 일반 이벤트 weight, 전역 encounter chance/cooldown 및 Raid 수동 QA 강제 출현 설정은 유지한다.
별도 로켓단 roll은 없다. `RunEvents.encounter`가 조건부 후보를 기존 `selectRunEvent`에 전달하고 하나만 선택한다.

## Special battle / retry / snapshot / exact-once

이벤트 생성 때 조직/단계, 원본 트레이너, 16비트 battle seed, 파티 구성과 packed team,
초상화/대사/기믹 표시/상대 Tera 횟수, 룰, 보상과 승리 후 상태를 snapshot한다.
상대 팀은 기존 `generateOpponentTeam`과 훈련/템플릿/`packTeam`을 사용한다.
화면에는 필요한 조직/단계/이름/초상화만 전달하고 보상·다음 상태는 서버에 보관한다.

전투는 Challenger와 같은 `TowerStore.createBattle` 경로에서 저장된 snapshot으로 생성한다.
승리 시 기존 `applyRewardOption`으로 이벤트 보상을 지급하고 상태를 변경한 뒤 `select`로 복귀한다.
일반 rewards receipt, recruitment, 층 증가, `cleared_count` 증가 및 추가 이벤트 추첨을 거치지 않는다.
HP/로스터/소모품/장비 지속 규칙은 기존 특수 전투와 같은 경로를 사용한다.

패배는 기존 lost/retry UI와 런의 남은 재시도 횟수를 사용한다. 첫 조우 패배로 캠페인이 시작되지 않는다.
`createRetryBattle`은 기존 상대/seed/rule/설정을 복사하고 이벤트의 현재 battle ID만 새 시도로 연결한다.
이벤트 보상/다음 상태 snapshot은 다시 생성하지 않는다.

선택·전투 생성·완료·보상·진행·claimed가 TowerStore transaction에 포함된다.
완료된 battle은 재처리하지 않으며, 선택 중복은 기존 battle ID를 재사용하고 `claimed`가 지급을 보호한다.
이벤트 receipt 저장 실패 시 battle 완료·지갑·캠페인 변경을 모두 rollback한다.
기습마다 저장된 단서 결과를 한 번 적용하므로 retry/reload/중복 요청으로 단서가 증가하지 않는다.

## UI 및 수동 QA

기존 RunEventScene/Panel과 RewardModal, trainer entrance를 사용한다.
첫 조우는 CSS 관리구역 출입문, 기습은 위치가 고정된 짧은 `!`, 간부/비주기는 기존 초상화를 표시한다.
기습 애니메이션은 저장된 playback speed에 따라 450/225/112.5ms이며 reduced-motion에서는 움직이지 않는다.

운영 확률을 바꾸지 않고 재현하려면 다음 명령을 실행한다.

```powershell
node --import tsx node_modules/@playwright/test/cli.js test e2e/villain-campaign.spec.ts
```

테스트는 `tests/rocket-fixture.ts`의 explicit Rocket registry와 내부 완료 fixture를 사용한다.
Raid 강제 출현이 있는 운영 registry와 충돌하지 않는다. fixture는 HTTP로 노출되지 않는다.
스크린샷은 `artifacts/qa/screenshots/rocket-campaign/`에 생성된다.

수동 확인 순서:

1. 첫 조우에서 관리구역 설명과 들어감/지나감 선택을 확인한다. 지나간 뒤 재조우가 가능해야 한다.
2. 들어가서 조직원 대사·초상화와 전투를 확인한다. 전투 중 reload로 상대가 바뀌지 않아야 한다.
3. 패배 후 기존 다시하기를 사용한다. 보상/단서가 먼저 지급되지 않고 상대가 유지되어야 한다.
4. 첫 승리의 물품/표적 안내, 기습 두 번의 `!`와 단서 1/2·2/2를 확인한다.
5. 아폴로·비주기와 완료 안내를 확인한다. 각 승리 후 일반 영입 화면이 나오면 안 된다.
6. 390px/1280px, 1/2/4배속, OS reduced-motion에서 화면 넘침과 선택 버튼 접근성을 확인한다.
7. Teleport로 낮은 층으로 이동한 뒤에도 단서/단계가 유지되어야 한다.

## 자동 테스트

`tests/rocket-campaign.test.ts` (9 tests)는 다음을 검증한다.

- legacy/common 일반 추첨 및 실제 층 생성에서 빌런 제외.
- 최초 eligibility, 범위, 거절, 전역 확률/cooldown/단일 이벤트.
- 5회 승리 체인, 원본 샘플 재사용, reload/reconnect, 보상/단서 exact-once.
- intro/ambush 패배와 중복 retry, 동일 파티/seed/설정/보상 유지.
- 보상 receipt 실패의 transaction rollback.
- 층/일반 승리 수/영입/cleared_count 유지, 승리 직후 추가 이벤트 없음.
- 실제 backward Teleport 후 상태 유지 및 restart.
- 새 테이블이 없는 실제 v43 DB의 추가 migration, 기존 전투 보존.
- 실제 전투 엔진과 TeamValidator에서 조직원·간부·비주기 검증.

`e2e/villain-campaign.spec.ts`는 1280/390px × 일반/reduced-motion의 4가지 환경에서 전체 체인,
기습 애니메이션/배속, snapshot, 선택·보상 모달, recruitment 없음, 가로 overflow 없음을 검증한다.
기존 일반층 출현 테스트는 새 체인 테스트로 대체했고, 다른 조직 팀/Primal Groudon 검증은 직접 샘플 생성으로 유지했다.
기존 migration 테스트의 최신 버전 기대값을 44로 갱신했다.

## 재사용 범위

조직별 상태 PK, snapshot/receipt 테이블, 특수 전투 생성·완료·retry 및 보상 경로는 다른 조직에도 재사용할 수 있다.
마그마단 추가 시 조직 설정/단계 eligibility·승리 상태 전이와 기존 조직 샘플 참조를 추가한다.
현재 Rocket 단계 수나 단서 2개를 전역 퀘스트 규칙으로 고정하지 않았으며, 범용 퀘스트 엔진은 도입하지 않았다.

## 실제 실행 결과 (2026-10-17)

| 실행 | 결과 |
| --- | --- |
| `node node_modules/tsx/dist/cli.mjs --test tests/*.test.ts` | **726/726 통과** (약 162초) |
| 최종 `tests/rocket-campaign.test.ts` 재검증 | **9/9 통과** |
| 로켓단 + Run Event UI + battle presentation 집중 검증 | **19/19 통과** |
| `tsc --noEmit` | 통과 |
| `next build` (저장소 Windows build-links preload 사용) | 통과 |
| `node scripts/check-css-structure.mjs` | 통과 |
| `node scripts/check-workspace.mjs` | 통과 |
| `git diff --check` | 통과 |
| 로켓단 1280/390px × 일반/reduced-motion E2E | **4/4 통과** |
| Challenger / Raid / Chest / Breeder / Merchant / Teleport / Rocket E2E | **42개 항목 모두 통과 확인** (분할 재실행 포함) |

통합 E2E 첫 실행은 37/42 통과했다. 나머지 5개는 기능 오류가 아니라 공유 E2E DB의
`signup` 제한(60초에 20회)에 걸려 계정 fixture 생성에서 실패했다.
실패 항목 5개와 Teleport/Rocket 전체를 포함한 12개를 제한 기간 이후 별도 실행하여 **12/12 통과**했다.
운영 인증 제한은 변경하지 않았다. Rocket 화면의 모바일 관리구역 문 및 데스크톱 비주기 초상화도 이미지로 확인했다.

재실행 명령:

```powershell
node --import tsx node_modules/@playwright/test/cli.js test e2e/villain-campaign.spec.ts e2e/teleport.spec.ts e2e/raid-events.spec.ts e2e/challenger-events.spec.ts e2e/run-events.spec.ts
node --import tsx node_modules/@playwright/test/cli.js test e2e/villain-campaign.spec.ts e2e/teleport.spec.ts e2e/run-events.spec.ts --grep 'Rocket chain|teleport portal|breeder-gift decline at 390|traveling-merchant .*390'
```

한 번에 많은 계정 fixture를 생성하면 위 테스트 전용 속도 제한에 도달할 수 있으므로 파일별로 실행하거나 간격을 둔다.

## 변경 파일

신규:

- `src/data/villain-campaigns.ts`
- `src/server/villain-campaigns.ts`
- `tests/rocket-campaign.test.ts`
- `tests/rocket-fixture.ts`
- `docs/rocket-campaign-implementation.md`

구현 수정:

- `src/data/run-events.ts`, `src/data/villain-organizations.ts`
- `src/game/run-events.ts`
- `src/server/opponent-team.ts`, `src/server/run-events.ts`, `src/server/tower-store.ts`
- `src/server/schema.ts`, `src/server/storage/migrations.ts`
- `src/web/battle-game.tsx`, `src/web/event-presentation.ts`, `src/web/run-event.tsx`
- `src/web/styles/run-event.module.css`

테스트 수정:

- `e2e/villain-campaign.spec.ts`
- `tests/villain-campaign.test.ts`, `tests/encounter-diversity-villains.test.ts`, `tests/npc-templates.test.ts`
- `tests/raid-events.test.ts`, `tests/hidden-shop.test.ts`
- migration 기대값: `tests/bag.test.ts`, `tests/battle-retry.test.ts`, `tests/boss.test.ts`, `tests/consumable-shop.test.ts`,
  `tests/form-moves.test.ts`, `tests/held-items.test.ts`, `tests/hundred-floor.test.ts`, `tests/mystery-chest.test.ts`,
  `tests/npc-ranks.test.ts`, `tests/rank-rewards.test.ts`, `tests/run-events.test.ts`, `tests/teleport.test.ts`, `tests/trainer-catalog.test.ts`.
