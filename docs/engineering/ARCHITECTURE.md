# 코드 구조

| 위치 | 책임 |
|---|---|
| `src/app` | Next.js 페이지·레이아웃·API 진입점 |
| `src/web` | 게임 화면, 조작, 이미지·소리·연출 |
| `src/web/styles` | 화면·기능별 CSS Modules와 공통 변수 |
| `src/battle` | 배틀 어댑터, 행동 정책, 공개 정보 기반 판단 |
| `src/game` | 저장소·UI에 의존하지 않는 게임 규칙, 이벤트 선택·보상 추첨 |
| `src/shared` | 서버와 브라우저가 공유하는 공개 응답·도감 타입 |
| `src/server` | 계정, 요청 검증, 상대 팀 생성, 저장·복구·정산 |
| `src/server/storage` | DB 초기화·마이그레이션과 동기 트랜잭션 |
| `src/data` | 실제 게임에서 읽는 데이터·규칙·템플릿 |
| `scripts/data/npc` | NPC 템플릿 생성기의 입력 자료 |
| `tests` / `e2e` | 코드 기능 검사 / 실제 브라우저 검사 |

브라우저 → Next.js API → 게임 서비스·저장소 → Showdown 배틀 엔진으로 연결됩니다. 화면은 서버가 제공한 공개 상태와 합법 행동을 사용합니다. 저장소가 소유권·재화·진행 상태를 검증하고 보상 중복을 막습니다.

실제 배틀은 초기 팀·시드·행동·버전을 저장해 복구합니다. 새로운 팀 생성 정책을 기존 배틀에 소급 적용하지 않습니다. 현재 새 상대 정책은 `tower-policy-v10`, 저장 스키마는 33입니다. 정책 버전은 `src/server/tower-store.ts`, 스키마는 `src/server/schema.ts`와 `src/server/storage/migrations.ts`를 따릅니다.

## 책임과 의존성

`TowerService`는 전투 세션 생성·캐시·복구를, `TowerStore`는 소유권·파티·층 진행과 정산을 담당합니다. 영구 상품·부화·영수증은 `server/permanent-shop.ts`, 이벤트 저장·선택 확정·중복 지급 방지는 `server/run-events.ts`가 담당합니다. 모듈 추출 후에도 기존 `TowerStore` 공개 메서드는 유지됩니다.

`server/player-wallet.ts`의 `spendCoins`, `grantCoins`, `applyReward`는 공통 재화 변경 지점입니다. 호출하는 작업의 트랜잭션 안에서 사용합니다. 구매 영수증·이벤트 상태·보상 변경을 함께 커밋해야 하므로 이 함수만 별도로 호출해 트랜잭션을 쪼개지 않습니다. 성장 포인트·티켓 소비와 영구 구매 검증은 영구 상점에서 처리하고, 수집·파티 변경은 기존 저장소의 검증을 거칩니다.

실제 데미지·기술·특성·상태이상 계산은 Showdown과 `battle/run.ts`, `battle/gimmicks.ts`, `battle/battle-items.ts`에 있습니다. `battle/public-field.ts`와 `battle/public-types.ts`는 공개 프로토콜을 해석하며 서버 응답과 브라우저 연출이 같은 함수를 사용합니다. 숨겨진 상대 정보를 조회하지 않습니다. NPC AI는 `battle/*policy.ts`에 별도로 있으며 팀 생성과 구분됩니다.

`data/pokemon-catalog.ts`는 이름·타입·폼·스프라이트 식별자의 공통 카탈로그입니다. `web/catalog.ts`는 이를 재수출하고 화면용 문구·이미지 선택을 제공합니다. `shared/contracts.ts`, `shared/pokedex.ts`는 브라우저에서 안전한 공개 타입만 포함합니다. 기존 `web/contracts.ts`, `web/pokedex-data.ts`, `web/battle-field.ts`, `web/battle-types.ts` 경로도 호환됩니다. 서버·데이터·게임 규칙에서 UI를 import하지 않는 원칙은 `tests/architecture-boundaries.test.ts`가 검사합니다.

전투 화면의 요청 잠금·재생·입력 조율은 `web/battle-game.tsx`, 포켓몬 표시·HP 카드는 `web/battle-pokemon.tsx`, 메시지·기술 연출·명령 UI는 기존 기능별 모듈에 있습니다.

## 콘텐츠 추가 위치

| 콘텐츠 | 수정 지점과 확인 사항 |
|---|---|
| 일반 랜덤 이벤트 | `data/run-events.ts`의 `eventKinds`와 `eventDefinitions`에 텍스트·가중치·비용·보상 표를 정의합니다. 선택·추첨은 `game/run-events.ts`, 지급은 `server/run-events.ts`가 공통 처리합니다. 새로운 종류는 DB CHECK 제약에 포함해야 하므로 `schema.ts`와 기존 저장의 마이그레이션도 추가합니다. NPC 그림·문구는 `web/run-event.tsx`에서 지정합니다. |
| 새로운 보상 종류 | `EventReward` 타입과 `server/player-wallet.ts`의 `applyReward`를 확장하고 저장 제약·화면 표시·롤백 검사를 함께 갱신합니다. 현재 지원 보상은 코인과 알 뽑기권입니다. |
| 아이템 | 용도에 따라 `data/held-items.ts`, `additional-held-items.ts`, `battle-items.ts`와 상점의 `held-item-shop.ts` / `shop.ts`를 수정합니다. 새로운 실제 전투 효과는 `battle` 어댑터에 추가하고 실제 엔진 테스트로 확인합니다. 트레이너 장비는 `data/trainer-equipment.ts` 경로를 사용합니다. |
| 포켓몬·폼 | `data/battle-roster.json`, `pokedex.json`, `move-learnsets.json` 및 폼 종류에 맞는 데이터에 추가합니다. `data/teams.ts`, `pokedex-roster.ts`가 전투·수집 자격을 정하므로 표시 데이터만 추가해서는 전투 대상이 되지 않습니다. 스프라이트·합법 기술·폼별 장비·알 풀도 검사합니다. |
| 기술·특성 | `data/move-catalog.json`, `move-info.ts`, 특성 현지화 JSON과 배울 수 있는 기술 데이터를 갱신합니다. 실제 효과는 Showdown의 지원 여부를 확인하고 필요한 게임 전용 확장만 `battle`에 둡니다. UI에서 효과를 재구현하지 않습니다. |
| NPC·AI | `data/trainer-catalog.ts`, `normal-npc-templates.json` 등의 데이터와 `server/opponent-team.ts`의 팀 생성을 사용합니다. 의사결정은 `battle/*policy.ts`에서 확장합니다. 저장된 전투의 정책·팀을 새 규칙으로 바꾸지 않습니다. |

이벤트 추첨은 고정 선물에 난수를 소비하지 않으며 현재 가중치 합계·호출 순서를 보존합니다. 이벤트를 늘릴 때 기존 플레이에 어떤 확률 변화가 생기는지 검사해야 합니다.

## 남은 개선 지점

`TowerStore`에는 상점별 검증·파티/성장 처리·공개 상태 조립이 여전히 많습니다. `BattleGame`의 비동기 연출·키보드·오디오 조율과 `Pokedex`의 편집 흐름도 큰 편입니다. 이후 해당 기능을 실제로 확장할 때 트랜잭션과 연출 순서를 검증하며 분리합니다. 저장 데이터 보존을 위해 기존 마이그레이션 순서와 수집 복구 루틴은 변경하지 않았습니다. 실험용 AI 정책과 미래 전투 시스템을 위한 새 추상 계층은 추가·삭제하지 않았습니다.

[DB](DATABASE.md) · [CSS](CSS_STRUCTURE.md) · [NPC 입력](NPC_DATA.md) · [리팩터링 분석과 검증](REFACTORING.md)
