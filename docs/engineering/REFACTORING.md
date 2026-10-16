# 확장을 위한 구조 정리

## 수정 전 분석과 범위

루트의 Next.js·TypeScript·Playwright 설정과 `package.json`이 앱·CLI·검사를 실행한다. `public`은 로컬 스프라이트·폰트·음원을 보관하고, `scripts`는 데이터 가져오기·NPC 생성·시뮬레이션·배포·실행기를 담당한다. `docs`는 현재 규칙·운영·개발 문서, `artifacts`는 실험·보고서·QA 결과다. `.data`의 SQLite 저장은 소스 데이터와 분리된다. `compose*.yaml`과 Dockerfile은 실행·배포용이며 이번 책임 분리 때문에 수정할 필요가 없다.

실행 흐름은 `app` 페이지 → `web` 화면 → `/api/battle` → `TowerService` → `TowerStore` / `BattleSession` → Showdown이다. CLI와 시뮬레이션도 `battle/run.ts`를 사용한다. 데미지·기술·특성·상태이상의 실제 계산은 Showdown과 기존 `battle` 확장에 있으며 UI에서 다시 구현하지 않는다. NPC 정책은 `battle/*policy.ts`, 팀 구성은 `server/opponent-team.ts`와 `data`의 템플릿이 담당한다.

정적 데이터는 대부분 `data`의 JSON·TypeScript로 분리되어 있다. 예외는 `web/catalog.ts`의 포켓몬 이름·폼·타입 카탈로그다. 이를 서버의 도감·저장소와 전투 타입 해석기까지 참조하여 화면 연출 코드에 역방향 의존한다. DTO도 `web/contracts.ts`에 있어 서버와 트레이너 데이터가 화면 폴더를 참조한다. 공통 요청 오류는 배틀 세션에 있어 이벤트·계정·저장소가 전투 실행 모듈까지 불러온다.

플레이어·파티·수집·재화는 SQLite가 기준이고 화면은 서버 응답을 로컬 React 상태로 표시한다. `TowerStore`의 트랜잭션, 구매 영수증, 입력 이력과 소유권 검증이 중복 지급과 잘못된 진행을 막는다. 전역 `TowerService`는 세션 캐시이며 별도 클라이언트 저장소로 교체할 필요가 없다. 브라우저 저장소는 음량·재생 속도 등의 설정에 사용한다.

주요 과밀 파일은 `server/tower-store.ts`(약 94KB), `web/battle-game.tsx`(약 42KB), `web/pokedex.tsx`(약 30KB)다. 저장소에는 마이그레이션, 상점, 파티, 부화, 정산이 함께 있다. 전투 화면에는 표시 컴포넌트와 비동기 연출·입력·요청 제어가 함께 있다. 상점과 이벤트의 조건부 코인 차감 SQL이 반복된다. 이벤트는 세 종류이며 텍스트·가중치는 데이터에 있으나 구매 비용과 보상 분기는 저장 모듈에 있다.

기존 분리를 유지하면서 다음 순서로 정리한다.

1. 브라우저에서도 안전한 공통 DTO와 포켓몬 카탈로그를 화면 밖으로 옮긴다. 기존 경로는 재수출하여 호출자 호환성을 유지한다.
2. 공통 요청 오류와 재화 변경 함수를 분리한다. 기존 트랜잭션·영수증의 경계는 유지한다.
3. 이벤트 비용·보상 데이터를 정의하고 선택·보상 추첨을 순수 함수로 추출한다. 기존 확률, 경계값, 난수 호출 순서를 보존한다.
4. 저장소의 스키마 초기화를 별도 모듈로 추출하고 공개 전투 상태 해석을 UI 밖으로 옮긴다.
5. 전투 화면의 독립적인 표시 컴포넌트를 분리한다. 연출 타이밍과 요청 잠금은 변경하지 않는다.
6. 기존 전체 테스트, 타입 검사, 빌드와 주요 브라우저 회귀 검사로 검증한다.

새 콘텐츠·라이브러리·저장 형식·AI 버전 변경은 범위에 포함하지 않는다. 실험용 AI 정책은 CLI와 분석 도구에서 사용될 수 있으므로 유사하다는 이유로 삭제하지 않는다. 기존 실행기·운영 문서의 미커밋 변경은 유지한다.

## 적용한 변경

| 새 담당 파일 | 추출한 책임·호환 경로 |
|---|---|
| `shared/contracts.ts`, `shared/pokedex.ts` | 공개 응답과 도감 타입. 기존 `web/contracts.ts`, `web/pokedex-data.ts`가 재수출한다. |
| `data/pokemon-catalog.ts` | 기존 `web/catalog.ts`의 포켓몬·폼 카탈로그와 이름 조회를 그대로 추출했다. 기존 이름·타입·폼 적용 순서는 같다. |
| `battle/public-field.ts`, `battle/public-types.ts` | 공개 전투 프로토콜의 필드·능력치·타입 해석. 기존 `web` 경로는 같은 구현을 재수출한다. |
| `server/request-error.ts` | 기존 `BattleRequestError`와 번들 간 오류 인식을 위한 Symbol 브랜드. 기존 배틀 세션 경로도 재수출한다. |
| `server/player-wallet.ts` | 상점·이벤트의 조건부 코인 차감과 전투·이벤트 코인 지급, 이벤트 보상 적용을 공통화했다. |
| `game/run-events.ts` | 이벤트 선택과 보상 추첨. `data/run-events.ts`에 비용과 보상 표를 모으고 `server/run-events.ts`는 저장·소유권·재처리를 담당한다. |
| `server/storage/migrations.ts`, `transaction.ts` | DB 초기화와 기존 마이그레이션 순서, BEGIN IMMEDIATE/COMMIT/ROLLBACK. 기존 수집·폼 복구 콜백도 동일한 트랜잭션에서 실행한다. |
| `server/permanent-shop.ts` | 영구 상품·알 부화·교환·영수증 처리. 컬렉션 조회는 기존 저장소에 맡기며 공개 `TowerStore` 메서드는 유지한다. |
| `web/battle-pokemon.tsx` | 볼·등장·이로치·스프라이트·HP 카드 표시. 전투 화면의 입력·재생·요청 조율과 분리했다. |

서버와 트레이너 데이터의 import를 새 담당 경로로 변경했다. 새 외부 의존성은 없다. `tower-store.ts`는 약 94KB에서 75KB, `battle-game.tsx`는 약 42KB에서 36KB로 줄었다. 수정한 파일에서 확인된 미사용 import만 정리했다.

## 검증

- 수정 전 테스트: 479개 중 478개 통과. `gender.test.ts`의 재현 비교가 실제 벽시계 `|t:|` 차이로 한 번 실패했다. 게임 엔진과 해당 비교 테스트는 변경하지 않았다.
- 최종 전체 검사: `node --import tsx --test --test-concurrency=2 tests/*.test.ts` — 483개 모두 통과. 기본 병렬 실행 중 상세 오류 없이 종료됐던 트레이너 테스트 7개도 단독 실행과 전체 재실행에서 통과했다.
- 새 검사 4개: 게임→UI 역방향 의존성, 이벤트 100개 가중치 구간, 체크포인트·쿨다운·미발생 시 난수 소비, 보상 100개 구간과 고정 선물의 난수 소비·데이터 불변성.
- 전체 기존 검사에는 실제 전투·기술·특성·기믹·아이템 효과·파티·영입·도감·부화·이벤트·상점·재화·소유권·중복 요청·트랜잭션 롤백·디스크 복구·과거 스키마 마이그레이션이 포함된다.
- `pnpm typecheck`, `pnpm build`, `pnpm check:css`, `pnpm check:workspace` 통과. Windows junction 생성 권한 때문에 빌드는 승인된 일반 프로세스로 실행했다.
- Chrome E2E는 현재 로그인 흐름에 맞는 24개 시나리오가 통과했다. `battle-request-fixes.spec.ts`의 기술배치 교환·자동 저장·실패 복원·현재 타입·PC/모바일 정비 3개, `egg-kinds.spec.ts`의 PC/모바일 부화 2개, `run-events.spec.ts`의 선택·거절·보상·재접속·중복 지급 방지 15개, `trainer-equipment.spec.ts`의 PC/모바일 구매·장비 HUD·다이맥스·테라스탈·교체·재접속 4개를 확인했다.
- 브라우저 검사 실행에는 기존 JSON import의 Node ESM 호환을 위해 프로세스에 `NODE_OPTIONS=--import tsx`를 지정했다. 한 번에 계정을 20개 넘게 만들면 기존 회원가입 제한에 걸리므로 장비 4개는 제한 창이 지난 뒤 별도 실행했다. 게임의 인증 제한은 변경하지 않았다.
- 최초 선택한 구형 `battle.spec.ts`는 비로그인 진입 후 도감이 나타난다고 가정하지만 실제로는 로그인 화면으로 이동해 실패했다. 같은 전제의 구형 시나리오 전체를 통과했다고 간주하지 않는다. 이들 테스트의 로그인 준비 정비는 후속 과제다.

콘텐츠 추가 위치와 의도적으로 남긴 구조적 문제는 [현재 구조 문서](ARCHITECTURE.md)에 정리했다.
