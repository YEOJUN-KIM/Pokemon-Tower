> 문서 범위: 아래 내용과 검증 수치는 작성 당시 기록이다. 현재 기능·층수·가격·키 조작·상대 AI는 [STATUS](../STATUS.md), 후속 작업은 [ROADMAP](../current/ROADMAP.md), 실험 적용 상태는 [EXPERIMENTS](../experiments/README.md)를 먼저 확인한다.

# 구조

## 현재 구현

최종 문서 갱신: 2026-10-10. 현재607종·50층, SQLite 스키마v18이다. 아래 CLI·초기 고정 세팅 검사는 개발 단계 기록도 포함한다.

```text
src/cli.ts                 사람이 번호로 선택 / 자동 실행 / 로그 파일 저장
src/battle/run.ts          엔진 시작, 시점별 관측 생성, 행동 검증, 결과와 재현
src/battle/policy.ts       Policy 인터페이스, 합법 행동, 예상 데미지 규칙 AI
src/data/teams.ts          현재 포켓몬 세트와 선택 팀 직렬화
src/data/floors.ts         50층의 상대·보상 데이터
src/tower-audit.ts         고정 시드 난이도 측정·JSON 보고서
tests/battle.test.ts       종료·재현·정보 제한·행동 검증
src/server/battle-session.ts  사람 행동을 기다리는 세션·요청 번호·저장된 입력 재생
src/server/tower-service.ts   DB와 엔진 연결·복구·메모리 캐시
src/server/tower-store.ts     영구 지갑·도감·타워 상태·보상 트랜잭션
src/server/schema.ts          SQLite v18 스키마(도전·트레이너·상점/리롤·영양제 저장)
src/app/api/battle/route.ts   GET 상태/쿠키 발급, POST 시작/행동 검증
src/app/page.tsx              타이틀 진입점
src/app/battle/page.tsx       기존 배틀룸 진입점
src/app/settings/page.tsx     설정 진입점
src/web/title-screen.tsx      저장 상태 조회·게임 시작/이어하기
src/web/settings-screen.tsx   소리와 게스트 저장 안내
src/web/audio-settings.tsx    브라우저 설정 저장·Web Audio 메뉴 효과음
src/app/pokedex/page.tsx      서버에서 공개 세팅 DTO 생성
src/web/pokedex.tsx           도감 목록·검색/필터·상세·해금/보유 조회
src/web/pokedex-data.ts       브라우저 DTO·특성 한글 이름
src/web/battle-game.tsx       React 배틀 화면과 요청 상태
src/data/trainer-catalog.ts  타입별 일반/엘리트·세대별 네임드 66종
src/web/trainer-samples.ts    이전 경기의 배틀 ID 기반 일반 NPC 외형 복구
src/web/boss-dialog.tsx       네임드·일반 NPC 이미지와 지우 뒷모습
src/web/game-keyboard.ts      웹 초점과 독립된 게임 선택 커서
src/web/pokemon-image.tsx     GIF·PNG 대체와 크기 정규화·정지 프레임
src/web/retro-theme.css       레트로 테마·트레이너 등장과 투구
src/server/training.ts       개체값·능력 포인트·성격·합법 세팅
src/web/tower-controls.tsx    출발/층별 팀 선택·영입/교체·재도전
src/web/battle-result.tsx     승패 대화상자·결과 배너
src/web/contracts.ts          브라우저에 제공하는 데이터 형식
src/web/catalog.ts            소규모 한글 표시·이미지 경로·메시지 해석
src/app/globals.css           반응형 화면·연출
tests/session.test.ts         세션 격리·중복 거부·로그 저장
e2e/battle.spec.ts            브라우저 플레이·API·모바일 검증
tests/tower.test.ts           저장·보상 롤백·영입·교체·복구 검증
e2e/restart.spec.ts           실제 Node.js 프로세스 재시작 복구
e2e/title.spec.ts             타이틀·설정 저장·이어하기·모바일 검증
e2e/result.spec.ts            실제 패배 기록·모바일 결과 확인·재도전
tests/content.test.ts         20종 적법성·10층 완주·v1 마이그레이션
e2e/tower.spec.ts             10층 결과에서 클리어·새로고침 보존
e2e/pokedex.spec.ts           도감 상세/필터·해금/보유 구분·모바일 검증
```

CLI → runBattle → Showdown 스트림으로 연결한다.
AI는 Policy.choose(observation)만 구현하며 엔진 인스턴스를 받지 않는다.
Showdown의 getPlayerStreams로 플레이어별 비공개 정보를 분리하고,
다시 자체 관측 객체에 자기 팀과 상대 공개 종·HP 상태·합법 행동만 담는다.
상대 HP는 비율로 공개하고 실제 능력치·도구·기술 목록·이번 턴 선택을 전달하지 않는다.

실제 데미지와 승패는 Showdown이 계산한다. AI의 데미지 추정은 행동 순위를 매기는 근사치이며,
상대 방어는 종족값·레벨 50·중립 성격·IV 31·EV 0을 가정한다.
현재 추정은 날씨·능력치 변화·공개된 특성 효과 등을 반영하지 않는다.

BattleLog는 서버용 재현 자료다. 초기 팀과 각 측 관측·행동을 포함하므로 비공개다.
publicProtocol만 관전자 공개 메시지다. 저장된 팀을 사용하며 엔진 버전·규칙이 다른 로그는 재현을 거부한다.
로그의 벽시계 타임스탬프(`|t:|`)는 보존하되 재현 비교에서 제외한다. 전투 이벤트·승자·턴 수는 일치해야 한다.

## 현재 웹 연결 구조

```text
브라우저 React 화면
    ↕ HTTP
Next.js의 Node.js 서버
    ├─ 익명 브라우저 세션·요청 검증
    ├─ 타워·도감·영구 성장·영입·강화 상점 서비스
    ├─ 배틀 어댑터와 Policy
    └─ TowerStore → SQLite 파일 (PostgreSQL은 운영 단계 후보)
```

프론트 제공과 API는 같은 서버 프로그램으로 시작한다. 현재 SQLite는 Node.js 프로세스가 파일로 접근한다. 향후 PostgreSQL을 사용하면 DB는 별도 프로그램이 된다.
배틀 엔진을 브라우저에 포함하지 않고 서버에서만 실행한다.

### 배틀 세션과 API

- GET /api/battle: HttpOnly·SameSite=Strict 쿠키를 발급하거나 기존 세션 상태를 조회한다.
- POST /api/battle: 시작/진입/행동/영입/포기 및 성장·상점 등의 요청. 현재 전체 분기는 API 구현을 기준으로 한다. 행동에는 battleId, requestId, action이 필요하다.
- 무작위 세션 토큰은 쿠키에만 둔다. 클라이언트가 보내는 배틀 ID만으로 소유권을 인정하지 않는다.
- Origin·JSON 형식·세션 소유·현재 요청 번호·합법 행동을 검증한다.
- 행동을 받으면 대기 상태를 동기적으로 해제한다. 중복 요청은 409, 불법 행동은 400이다.
- 서버의 Policy는 플레이어 입력을 Promise로 기다린다. 기존 runBattle과 규칙 AI를 재사용한다.
- 웹 응답에는 자기 포켓몬 HP와 공개 상대 정보·메시지만 전달한다. AI 점수·상대 비공개 세팅·전체 재현 로그를 보내지 않는다.
- 시작 팀·상대 팀·시드·엔진과 AI 버전을 DB에 저장하고, 합법 입력을 커밋한 뒤 엔진을 진행한다.
- 완료 로그·화면 상태 저장과 보상 지급·도전 단계 변경을 하나의 DB 트랜잭션으로 처리한다.
- 메모리 캐시는 30분 유휴 정리, 최대 128개다. 캐시가 없어도 SQLite 기록에서 배틀을 복구한다.

현재 쿠키는 익명 배틀 격리용이며 계정 인증을 구현한 것이 아니다.
서버 재시작 복구는 동일 엔진·AI 버전에서 지원한다. 계정 로그인·다중 서버 운영은 후속 단계다.

## DB 구조와 후속 확장

- 구현: players/unlocks(영구), runs/members/battles/actions(도전), rewards/recruitments(한 번만 처리하는 기록).
- 보상 원장 battle_id 기본키와 완료 상태 검증으로 중복 지급 방지.
- 배틀+입력 번호 기본키로 중복 입력 방지.
- 배틀 초기 세팅은 서버가 선정한 고정 세팅의 스냅샷으로 저장.
- 마지막 저장된 사람 입력을 재생하고 규칙 AI를 재계산해 복구.
- 구현: pokemon_training·move_unlocks·favorites, run_upgrades·growth_rewards. 영구 성장 포인트와 도전용 코인은 분리한다. 상세 필드와 무결성은 DATABASE를 따른다.
- 구현: machine_shops·machine_purchases로 기술머신 상품과 구매 내역을 저장한다. 코인 차감·종별 기술 해금·선택적 도전 기술 교체를 같은 트랜잭션으로 처리하며, 상품 목록은 재접속 후에도 유지한다.
- 예정: 기술머신 등급제, 계정 인증, PostgreSQL 전환과 다중 서버 운영.

트레이너 등장 대기·0.55초 투구·공개 로그 재생은 클라이언트 표현이며 서버 전투 결과를 변경하지 않는다. 새 일반/엘리트 경기의 이름·그림·역할은 trainer 스냅샷, 보스는 boss 스냅샷을 따른다. trainer가 없는 이전 경기는 배틀 ID 기반 외형을 사용한다. 도감에서 바로 출발하면 sessionStorage의 `tower-pending-intro` ID를 한 번 소비해 등장 연출을 연결한다. 저장된 경기를 다시 열면 서버의 확정 상태를 보여 준다.

상세 테이블과 검증은 [DATABASE.md](DATABASE.md), 결정 이유는 [ADR 003](decisions/003-tower-persistence.md)을 참고한다.


2026-10-10 현재 상점은 전체 코인 리롤·랜덤 소모품3종/영양제4종·도전 전용 추가 포인트를 지원한다. DBv18 및 최신 검증 범위는 [현재 상태](../STATUS.md), 가격 비교768회는 [경제 보고서](../experiments/balance/SHOP_ECONOMY_50.md)를 따른다. 이전 수치/초기 단계 설명은 개발 당시 이력이다.
