# 신규 유저 튜토리얼

문구·단계·지급액은 `src/data/tutorial.ts`, 서버 진행 관리는 `src/server/tutorial-service.ts`, 화면 대상과 공통 오버레이는 `src/web/tutorial-manager.tsx`에서 관리합니다. 실제 전투·성장·상성·영입 규칙은 기존 함수를 사용합니다.

## 파일 구성

신규 파일:

- `src/data/tutorial.ts`: 단계 상수, 문구, 8P 지급 설정.
- `src/server/tutorial-service.ts`: 저장 기본값, 단계 전환, 지급 중복 방지.
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
| NotStarted | 최초 접속 질문. 처음이에요 또는 건너뛰기 |
| Introduction | 목표 설명 확인. 시작을 수락할 때 일반 성장 포인트 8P를 딱 한 번 지급 |
| StartGame | 메인 게임 시작 강조, 선택 화면 진입 |
| SelectPokemon | 도감 카드와 선택 버튼, 실제 파티에 1마리 추가 |
| RemovePokemon | 출발 파티와 제외 버튼, 실제 제외 |
| PokemonInfo / PokemonInfoViewed | 목록의 기본 정보 열기, 설명 확인 |
| StatUpgrade | 정보 닫기 → 포켓몬 설정 → 능력치 +1 적용 → 실제 유료 저장 성공 |
| CompleteTeam / StartBattle | 설정 닫기, 3마리 편성, 도전 확인 후 실제 시작 성공 |
| TypeGuide | 싸운다 → 기술의 효과 배지. 첫 기술 요청 성공 |
| AwaitVictory | 일반 전투. 패배해도 안내는 건너뛰지 않고 이후 첫 승리를 기다림 |
| RecruitmentGuide / RecruitmentChoice | 영입 선택과 상대 카드. 도감 등록 / 동료 영입 설명 후 실제 획득 성공 |
| Completion / Completed | 마지막 메시지 확인, 이후 안내 없음 |

## 저장과 호환

기존 SQLite 세이브에 `player_tutorial` 테이블을 멱등 생성합니다. 플레이어당 `step`, `reward_granted`, `party`를 저장합니다. 숫자 대신 의미 있는 단계 문자열을 사용하며, 선택 중 새로고침해도 파티를 복원합니다. 이미 진행·성장 설정·수집·재화 기록이 있는 기존 사용자는 필드가 없을 때 `Completed`, 진행 없는 사용자는 `NotStarted`로 초기화합니다. 지급은 기존 `players.growth_points`를 사용하며 기본 강화 비용인 +1당 8P를 그대로 따릅니다.

단계 변경은 예상 현재 단계와 비교하고, 실제 강화·전투·영입은 기존 서버 동작 성공 후 갱신합니다. 보상 지급과 시작 단계 전환은 같은 트랜잭션이며 재요청으로 재화가 늘지 않습니다. 첫 질문에서 건너뛰면 지급하지 않습니다. 중도 건너뛰기는 진행 중인 편성과 세이브를 변경하지 않습니다.

진행 관리가 한곳에 있으므로 추후 도움말의 다시 보기 기능은 단계 재시작 API와 버튼을 연결하여 추가할 수 있습니다. 이 경우에도 `reward_granted`를 유지해야 반복 지급을 방지할 수 있습니다. 현재는 다시 보기 버튼을 추가하지 않습니다.

기존 `reset-local-player.ts`는 외래키로 플레이어별 데이터를 추적하므로 튜토리얼 테이블도 함께 초기화합니다. 초기화 전 자동 백업, 계정 정보·콘텐츠 보존 정책은 동일합니다.

## UI와 검증

공통 오버레이는 실제 DOM 위치를 측정해 화면을 가리고 대상을 강조합니다. 기존 네이티브 dialog가 열려 있으면 그 안에 포털을 배치해 클릭·키보드 입력과 건너뛰기가 작동하도록 합니다. 화면 크기·스크롤·대화상자 변화에 맞춰 위치를 재계산하며, 저장 실패 시 같은 안내 동작을 재시도합니다.

`tests/tutorial.test.ts`는 기본값·지급 중복 방지·실제 8P 강화·단계 순서·재시작·건너뛰기·기존 저장 호환을 검증합니다. `e2e/tutorial.spec.ts`는 실제 신규 계정으로 화면을 이동해 선택·제외·정보·강화·전투 기술·획득 완료·모바일 크기 변경을 검증합니다. 승리 이후 경계 테스트에서는 실제 엔진으로 생성한 별도 테스트 전투 결과를 사용하며, 실제 로컬 계정이나 콘텐츠는 수정하지 않습니다.

검증 결과: 관련 단위 테스트 42개, 브라우저 시나리오 6개(전체 진행·처음/중도 건너뛰기·기존 계정·모바일·기존 설정·스타팅 회귀), 실제 로컬 계정 최초 진입 확인 1개가 통과했습니다. 타입 검사, 프로덕션 빌드, CSS/워크스페이스 검사도 통과했습니다. 실제 계정은 `NotStarted`, 미지급, 0코인/0P, 진행 런 없음, 기본 스타팅 27종 상태를 유지합니다.
