# 코드 구조

기준: 2026-10-20. 현재 지원 DB 스키마는 **46**, 기본 새 전투 정책은 **tower-policy-v13**이다. 이벤트 규칙은 새 런 v2/기존 런 v1, 공통 NPC 생성 표식은 run_npc_rules v1이며 서로 다른 버전 체계다.

| 위치 | 현재 책임 |
|---|---|
| `src/app` | Next.js 페이지·API 진입, 요청 파싱과 서비스 호출 |
| `src/data` | 밸런스·콘텐츠 정의, 공통 포켓몬/폼 카탈로그, 런타임 JSON |
| `src/game` | DB·React 없는 이벤트/보상/알 풀 선택 규칙 |
| `src/battle` | Showdown 실행 어댑터·공개 프로토콜 해석·버전별 AI 판단 |
| `src/server` | 인증·소유권·상대 생성·DB 저장·진행·보상/구매 트랜잭션 |
| `src/shared` | 브라우저에 공개 가능한 DTO·도감 타입 |
| `src/web` | 서버 상태 표시·입력·포켓몬 이미지·소리·연출·CSS Modules |
| `scripts/data/npc` | 사람이 검토·수정하는 NPC 샘플 입력; runtime JSON과 구분 |
| `scripts` | 검토 입력·런타임 export·검증·시뮬레이션·개인 실행/배포 |
| `artifacts` | 리뷰 CSV·보고서·실험·QA 출력. 게임 런타임에서는 읽지 않음. 일부 테스트·실험은 고정 입력으로 읽음 |

## 실행과 저장 경계

브라우저 → API → `TowerService` → `TowerStore`/`BattleSession` → Showdown. `TowerService`는 실행 세션·복구·캐시, `TowerStore`는 파티·층 진행·작업 트랜잭션의 진입점이다. 이벤트는 `server/run-events.ts`, 도전자·레이드·빌런·히든보스는 각각 서버 모듈에서 저장된 snapshot을 처리한다. 영구 상품은 `server/permanent-shop.ts`, 배낭은 `server/run-bag.ts`다.

코인 차감/지급은 `server/player-wallet.ts`, 보상 결과 계산은 `game/rewards.ts`, 효과 적용은 `server/rewards.ts`, 아이템·성장·장비 지급은 `server/inventory-grants.ts`를 재사용한다. 실제 작업이 소유권/재화/영수증/상태 변경을 하나의 `BEGIN IMMEDIATE` 트랜잭션에서 커밋한다. 단순 지급 함수만 별도 트랜잭션으로 감싸지 않는다.

`data/pokemon-catalog.ts`가 포켓몬 이름·타입·폼·스프라이트 키의 기준이다. `web/catalog.ts`는 재수출과 화면용 문구를 제공한다. `battle/public-field.ts`·`public-types.ts`는 공개 프로토콜 해석이며, UI가 숨겨진 상대 정보나 실제 데미지를 별도 계산하지 않는다. 실제 효과·승패·난수는 Showdown과 기존 battle 어댑터가 담당한다.

게임/데이터/서버/공유 타입은 web 구현을 import하지 않는다. 일부 data의 server 타입 참조와 기존 기술 합법성 조회는 남아 있으나 UI 의존은 아니다. `tests/architecture-boundaries.test.ts`가 게임→UI 역참조를 검사한다. `web/contracts.ts` 등 기존 재수출 경로는 호환용으로 유지한다.

## 자주 바꾸는 설정의 기준

| 설정 | 수정 위치 |
|---|---|
| 전체 이벤트 20%·통과 횟수 쿨다운 2 | `data/run-events.ts`의 `eventEncounterSettings` |
| 이벤트 종류 weight·선택지·비용 | `data/run-events.ts` registry와 각 이벤트의 data 설정 |
| v1/v2 상자 내부 결과 | 같은 파일의 `legacyChestRewards` / `mysteryChestResults` |
| 독립 빌런 등장·간격·보상 | `data/villain-tracks.ts`의 villainTrackSettings·villainStageMinFloor·villainRewardSettings |
| Raid 보스·HP·육성 | `data/raids.ts`·`raid-bosses.ts`·`raid-training.ts` |
| 50층 주요 보스 최종 구성·낮춘 육성 | `server/npc-templates.ts`·`opponent-team.ts` (일반층 곡선과 구분) |
| 층별 성장 지급·재접속 차액 정산 | `server/tower-store.ts`·`run_growth_progress` |
| NPC stage/기믹 층 | `data/normal-mode-stages.ts`의 `normalNpcFloorRules`·선택 함수 |
| 일반 상대 전설/환상·육성 곡선 | `data/tower-progression.ts`의 `towerDifficulty` |
| NPC Rank/도구 슬롯·AI tier | `data/npc-ranks.ts` / `data/npc-ai.ts` |
| 소모품·TM·지닌 도구 가격/희귀도 | `data/shop.ts`, `data/held-item-shop.ts`, `data/held-items.ts` |
| 히든상점·도전자 보상 | `data/hidden-shop.ts`, `data/challenger-rewards.ts` |
| 일반 승리 코인·Rank/핵심 도구 가격 배율·영구 육성 비용 | `data/floors.ts`·`data/economy.ts`·`data/training.ts` |
| 영구 업그레이드·부화 가격·확률 | `data/permanent-upgrades.ts`, `data/egg-grades.ts`, `data/egg-kinds.ts` |

실제 saved 팀·시드·AI 버전·선택 후보·보상은 재접속이나 콘텐츠 수정으로 다시 추첨하지 않는다. 기존 진행/정책 호환 분기를 단순 dead code로 삭제하지 않는다.

## 콘텐츠 추가와 검증

이벤트 등록/outcome 저장/표시는 [이벤트 개발](EVENT_SYSTEM.md), NPC 입력→export→런타임 경로는 [NPC 데이터](NPC_DATA.md), 마이그레이션은 [DB](DATABASE.md)를 따른다. 신규 이벤트 ID를 추가할 때 기존 run_events 테이블을 재작성할 필요는 없다. 새로운 저장 구조가 필요한 경우에만 스키마·이전 경로를 함께 확장한다.

TowerStore·BattleGame·Pokedex는 큰 편이나 현재 저장·연출·편집 경계가 있다. 파일 크기만으로 나누지 않으며, 실제 독립 책임을 확장할 때 해당 경계를 검증한다. 실험/시뮬레이션 도구와 과거 AI 정책도 참조가 있는 한 유지한다. 과거 중간점검의 분류와 검증은 [중간점검](../../artifacts/reports/changes/REFACTORING-2026-10-18.md)을 참고한다.
