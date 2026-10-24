# 신규 유저 튜토리얼

문구·단계는 `src/data/tutorial.ts`, 신규 게임 지급액은 `src/data/training.ts`의 `INITIAL_GROWTH_POINTS`, 서버 진행 관리는 `src/server/tutorial-service.ts`, 화면 대상과 공통 오버레이는 `src/web/tutorial-manager.tsx`에서 관리합니다. 실제 전투·성장·상성·영입 규칙은 기존 함수를 사용합니다.

## 파일 구성

신규 파일:

- `src/data/tutorial.ts`: 단계 상수, 문구, TRAINING_POINT_PRICE × 32 지급 설정(현재 256P).
- `src/server/tutorial-service.ts`: 저장 기본값, 단계 전환, 지급 중복 방지.
- `src/server/initial-growth.ts`, `src/data/training.ts`: 튜토리얼 선택과 분리한 신규 게임 초기 성장포인트 및 영수증 처리.
- `src/app/api/tutorial/route.ts`: 로그인 계정의 안내 조회·진행·건너뛰기.
- `src/web/tutorial-manager.tsx`, `src/web/styles/tutorial.module.css`: 공통 오버레이, 대상 측정, 입력 제한, 서버 동기화.
- `tests/tutorial.test.ts`, `e2e/tutorial.spec.ts`: 서버 및 실제 브라우저 검증.
- `docs/gameplay/TUTORIAL.md`: 구조와 운영 안내.

수정 파일:

- `src/server/schema.ts`: 같은 세이브 DB에 튜토리얼 테이블 추가.
- `src/server/tower-service.ts`: 개발 서버의 기존 싱글턴이 새 저장 구조를 적용하도록 갱신.
- `src/server/tower-store.ts`, `src/app/api/battle/route.ts`: 기존 강화·전투·영입 성공에 안내 단계 연결.
- `src/app/layout.tsx`: 안내 관리자를 공통 레이아웃에 연결.
- `src/web/title-screen.tsx`, `src/web/pokedex.tsx`, `src/web/battle-game.tsx`, `src/web/battle-commands.tsx`: 강조 대상 및 실제 화면 동작 연결.
- `src/web/pokemon-settings.tsx`: 능력치 강조 대상 추가, 조절창 비용 표시를 기존 계산식의 +1당 8P와 일치시킴.
- `e2e/starter-moves.spec.ts`: 기존 스타팅 검증에서는 최초 안내를 명시적으로 건너뜀.
- `e2e/pokemon-settings.spec.ts`: 기존 1P 기준의 오래된 잔액 기대값을 현행 8P 비용에 맞춤. 실제 강화 공식 변경 없음.
- `docs/gameplay/README.md`: 이 문서로 연결.

| 단계 | 화면 / 완료 조건 |
|---|---|
| NotStarted | 신규 게임 초기 상태 준비 시 성장 포인트 256P(32포인트 분량)를 한 번 지급. 이후 처음이에요 또는 건너뛰기 선택 |
| Introduction | 목표 설명 확인. 추가 지급 없음 |
| StartGame | 메인 게임 시작 강조, 선택 화면 진입 |
| SelectPokemon | 도감 카드와 선택 버튼, 실제 파티에 1마리 추가 |
| RemovePokemon | 출발 파티와 제외 버튼, 실제 제외 |
| PokemonInfo / PokemonInfoViewed | 처음 파티에 넣었던 포켓몬 카드와 기본 정보 강조, 해당 포켓몬 정보 열기·설명 확인 |
| StatUpgrade | 동일한 포켓몬의 정보 닫기 → 포켓몬 설정 → 능력치 배분·적용 → 해당 포켓몬의 실제 수치 증가 저장 성공 |
| CompleteTeam / StartBattle | 설정 닫기, 3마리 편성, 도전 확인 후 실제 시작 성공 |
| TypeGuide | 싸운다 → 기술의 효과 배지. 첫 기술 요청 성공 |
| AwaitVictory | 일반 전투. 패배해도 안내는 건너뛰지 않고 이후 첫 승리를 기다림 |
| RecruitmentGuide / RecruitmentChoice | 영입 선택과 상대 카드. 도감 등록 / 동료 영입 설명 후 실제 획득 성공 |
| Completion / Completed | 마지막 메시지 확인, 이후 안내 없음 |

## 안내 대상 포켓몬

첫 실제 파티 추가 요청에서 이전 파티에 없던 species를 `selected_species`에 한 번 저장합니다. API는 이를 `selectedSpecies`로 반환합니다. 현재 커서·첫 스타터·카드 순번을 대체 대상으로 사용하지 않으며, 파티에서 제외해도 값을 지우지 않습니다.

정보 보기와 능력치 조정 단계는 이 species의 카드·메뉴·설정 화면을 강조합니다. 새로고침으로 기본 카드·페이지가 초기화되더라도 대상이 보이도록 보유 목록과 페이지를 복원합니다. 정보 열기 요청에는 실제 연 species를 함께 보내고, 서버는 저장된 대상과 일치할 때만 진행합니다. 능력치 조정은 같은 대상의 포인트가 실제 증가한 저장만 완료로 인정하며, 다른 포켓몬 저장이나 동일 수치 저장은 단계를 넘기지 않습니다.

구버전 진행 중인 세이브는 schema 47 이전 시 `RemovePokemon` 단계에 남아 있는 단일 파티에서 대상을 복구합니다. 이미 제외한 포켓몬은 옛 저장만으로 알아낼 수 없으므로 임의의 종으로 채우지 않습니다. 이 경우 사용자가 보유 목록에서 다음으로 직접 선택한 카드를 대상으로 한 번 연결하며, 기존 단계와 지급 상태는 유지합니다.

## 저장과 호환

초기 지급은 튜토리얼 `begin` 동작에서 분리해 `src/server/initial-growth.ts`의 `initializeStartingGrowth`로 옮겼습니다. 신규 플레이어의 `NotStarted` 상태를 준비할 때, 진행/건너뛰기 선택 전에 지급합니다. 기존 `TRAINING_POINT_PRICE × 32 = 256P`를 그대로 사용하며 `TUTORIAL_GROWTH_POINTS`는 호환 이름으로 유지합니다. 게스트 저장 연결·직접 가입·저장 복구는 같은 플레이어 초기화와 지급 기록을 재사용합니다. 도감 화면은 지급 기록을 처음 읽은 뒤 잔액을 다시 불러와 초기 조회와의 순서 차이도 반영합니다.

기존 `reward_granted`를 초기 지급 영수증으로 사용하고, 지급 표시와 잔액 변경을 같은 SQLite savepoint로 묶습니다. 진행·스킵·반복 요청·새로고침·재시작은 추가 지급하지 않습니다. 지급액을 사용해 잔액이 0이 되어도 보충하지 않습니다. 기존 `Completed` 저장과 지급 완료 저장에는 소급 지급하지 않으며, 이미 진행한 저장의 재화는 변경하지 않습니다. DB schema 변경은 없습니다.

기존 SQLite 세이브에 `player_tutorial` 테이블을 멱등 생성합니다. 플레이어당 `step`, `reward_granted`, `party`, `selected_species`를 저장합니다. 숫자 대신 의미 있는 단계 문자열을 사용하며, 선택 중 새로고침해도 파티를 복원합니다. 이미 진행·성장 설정·수집·재화 기록이 있는 기존 사용자는 필드가 없을 때 `Completed`, 진행 없는 사용자는 `NotStarted`로 초기화합니다. 지급은 기존 `players.growth_points`를 사용합니다. 지급량은 `TRAINING_POINT_PRICE * 32`이며 현재 256P입니다. 기본 강화 비용인 +1당 8P는 그대로 유지합니다. 한 능력치를 0 → 32로 올리거나 여러 능력치에 자유롭게 나눌 수 있으며, 다음 단계로 가기 위해 반드시 32를 올릴 필요는 없습니다. 이미 지급 완료된 저장에는 차액을 추가 지급하지 않습니다.

단계 변경은 예상 현재 단계와 비교하고, 실제 강화·전투·영입은 기존 서버 동작 성공 후 갱신합니다. 보상 지급과 시작 단계 전환은 같은 트랜잭션이며 재요청으로 재화가 늘지 않습니다. 첫 질문에서 건너뛰면 지급하지 않습니다. 중도 건너뛰기는 진행 중인 편성과 세이브를 변경하지 않습니다.

진행 관리가 한곳에 있으므로 추후 도움말의 다시 보기 기능은 단계 재시작 API와 버튼을 연결하여 추가할 수 있습니다. 이 경우에도 `reward_granted`를 유지해야 반복 지급을 방지할 수 있습니다. 현재는 다시 보기 버튼을 추가하지 않습니다.

기존 `reset-local-player.ts`는 외래키로 플레이어별 데이터를 추적하므로 튜토리얼 테이블도 함께 초기화합니다. 초기화 전 자동 백업, 계정 정보·콘텐츠 보존 정책은 동일합니다.

## UI와 검증

공통 오버레이는 실제 DOM 위치를 측정해 화면을 가리고 대상을 강조합니다. 기존 네이티브 dialog가 열려 있으면 그 안에 포털을 배치해 클릭·키보드 입력과 건너뛰기가 작동하도록 합니다. 화면 크기·스크롤·대화상자 변화에 맞춰 위치를 재계산하며, 저장 실패 시 같은 안내 동작을 재시도합니다.

`tests/tutorial.test.ts`는 기본값·지급 중복 방지·실제 32포인트 강화·자유 배분·단계 순서·재시작·건너뛰기·기존 저장 호환을 검증합니다. `tests/tutorial.test.ts`는 번치코·이상해꽃 대상 유지, 다른 종의 정보·강화로 진행 불가, 제외 후 재시작, v46 이전 호환도 검사합니다. `e2e/tutorial.spec.ts`는 번치코·이상해꽃 각각 라우드본을 선택하지 않은 실제 신규 계정으로 화면을 이동해 선택·제외·정보·강화·전투 기술·획득 완료·모바일 크기 변경을 검증합니다. 승리 이후 경계 테스트에서는 실제 엔진으로 생성한 별도 테스트 전투 결과를 사용하며, 실제 로컬 계정이나 콘텐츠는 수정하지 않습니다.

2026-10-24 초기 지급 수정 검증: 진행/첫 스킵 모두 256P, 반복 완료/스킵/재진입/사용 후 재지급 없음, 게스트 연결·직접 가입·복구 저장에서 중복 없음, 기존 완료/기지급 저장 잔액 보존을 확인했습니다. 실제 Chrome에서는 정상 안내 두 포켓몬, 첫 스킵 후 256P 성장 저장 및 잔액 0 유지, 중간 스킵의 파티 보존, 기존 세이브와 모바일 성장 화면을 통과했습니다. 모바일 성장 설명이 적용 버튼을 가리는 경우도 확인해 문구를 간결하게 줄였습니다. 테스트 수와 범위는 [계정 UX 검증](../operations/ACCOUNTS.md)을 참고합니다.

튜토리얼 지급량 변경은 신규 미지급 사용자부터 적용합니다. 기존 커스텀 기술배치·성장 공식·진행 중인 전투 스냅샷·플레이 진행은 변경하지 않습니다.
