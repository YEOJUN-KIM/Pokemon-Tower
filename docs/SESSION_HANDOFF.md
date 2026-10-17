# 개발 이어받기

기준: 2026-10-18. 현재 구현은 [STATUS](STATUS.md), 남은 작업은 [ROADMAP](current/ROADMAP.md), 수정 위치는 담당 gameplay/engineering 문서를 기준으로 한다. 과거 완료 내역은 Git·reports/artifacts에 맡긴다.

## 다음 작업의 방향

대규모 기반 구축과 중간점검 리팩터링은 완료했다. **콘텐츠 → 밸런스 → UI/UX → 비주얼/연출 → 사운드 → 실제 장기 플레이 → 최종 QA**를 진행한다. 전체 구조 리팩터링을 다시 주요 목표로 잡지 않으며 실제 문제가 드러난 영역만 최소 수정한다.

- 네임드 6종 파일럿을 기준으로 필요한 NPC부터 팀/기술/도구/특성/성격/포인트/기믹/에이스/AI tier·ceiling을 검토한다. 일괄 후보형 전환은 계획하지 않는다.
- 구현된 이벤트 구조를 재작성하지 않는다. Raid 보스/패턴/보상, 조직별 NPC/보스, 도전자 Sample 등 콘텐츠와 빈도·가치를 보강한다.
- 이벤트 10%·쿨다운 2는 측정의 출발점이다. 전체 발생·종류 weight·내부 결과와 코인/성장 포인트/티켓의 획득·소비를 함께 검토한다. 알 확률/가격 등은 근거 없이 변경하지 않는다.
- 기본·혼합·대표 기믹 룰부터 사람이 실제 100층을 플레이한다. 자동 검사/시뮬레이션 통과와 사람의 난이도·UX 검증을 구분한다.
- 1차 완성 이후 적극적인 후보는 Hard Mode·ML AI다. 150/200층·온라인 대전·PWA는 현재 계획이 없다. 위험 선택 배틀/연승/라이벌/교환은 후순위 아이디어다.

## 현재 유지할 기술 기준

- 지원 DB schema **45**, 기본 새 전투 AI **tower-policy-v11**, 이벤트 rules v1/v2와 NPC snapshot v1/v2 호환을 유지한다. 정책·스키마·이벤트 규칙 버전은 같은 개념이 아니다.
- 이미 생성된 팀·시드·기믹·보상·선택/구매 영수증은 재접속이나 데이터 수정으로 다시 추첨하지 않는다. 트랜잭션·소유권·중복 지급 방지를 약화하지 않는다.
- 이벤트 전체 발생/쿨다운은 `data/run-events.ts`의 eventEncounterSettings, 종류/결과는 각각 registry와 보상 표다. 수동 QA 강제 등장은 없다. [이벤트 추가/검증](engineering/EVENT_SYSTEM.md).
- 네임드 입력은 `scripts/data/npc/normal-npc-samples.json`, runtime은 export 생성물이다. 옛 단계 bootstrap은 allFloors 입력 덮어쓰기를 거부한다. Sample/Rank/AI·층 기준·검증은 [NPC 데이터](engineering/NPC_DATA.md)를 따른다.
- 공통 포켓몬/폼·타입·기술 데이터, game-keyboard/dialog, 기존 VFX/음향 경로를 재사용한다. 같은 규칙을 UI에 다시 구현하지 않는다. [구조](engineering/ARCHITECTURE.md).

## 저장·개인 실행 실사용

로컬 개발은 `.env.local`의 TOWER_DB_PATH, 통합 실행기는 Docker 볼륨 `/data/tower.sqlite`를 사용하며 별개 저장이다. 받은 개인 저장은 보관만으로 실행 DB를 교체하지 않는다. [백업](operations/BACKUPS.md)·[컴퓨터 이전](operations/COMPUTER_MOVE.md)을 따른다.

루트 `포켓몬타워 실행.exe`는 서버 켜기/끄기·주소 복사·게임 열기를 제공한다. 업데이트 전 Docker DB를 백업한다. EXE·로컬 CMD·개인 저장/환경변수의 Git 제외 정책은 [설치](operations/SETUP.md)와 이전 안내를 따른다. 실제 실행기/재접속의 장기 사용 검증은 아직 남은 작업이다.

## 작업 전후 확인

1. `git status`와 STATUS/ROADMAP, 해당 기능의 문서를 읽는다. Next.js 코드를 수정할 때는 설치된 `node_modules/next/dist/docs/`의 관련 안내를 읽는다.
2. 필요한 영역만 수정하고 관련 회귀·타입·빌드·브라우저 검사를 선택한다. 문서만 수정한 경우에는 경로/링크·현재 코드와의 일치·`pnpm check:workspace`·diff를 확인한다.
3. 실제로 실행한 검증과 사람의 플레이 여부를 구분해 기록한다. 근거 없이 기능/플레이 검증 완료로 표시하지 않는다.
4. 현재 기능은 STATUS/담당 문서에 반영하고 완료된 작업을 ROADMAP에서 정리한다. 상세 로그·숫자는 Git/reports에 둔다.

[폴더 책임](engineering/WORKSPACE.md) · [현재 DB](engineering/DATABASE.md) · [기술/VFX 계획](gameplay/MOVE_EFFECTS_PLAN.md) · [조작](gameplay/CONTROLS.md)
