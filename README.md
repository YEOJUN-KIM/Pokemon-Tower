# Pokémon Tower

2026-10-11 기준. 포켓몬 수집·육성·팀 편성과 Showdown 기반 3대3 싱글 배틀을 연결한 웹 게임이다. 현재 **612종 도감·100층 타워·1~9세대 랜덤 테마**를 지원한다.

새 도전에서 기본룰·메진룰·다맥룰·테라룰·혼합룰을 선택하며 양쪽에 같은 제한을 적용한다. 일반 트레이너는 기믹을 사용하지 않는다. 10층 클리어마다 상점과 정비를 제공하고, 도구/TM 상점은 각각 무료 리롤 1회다. 실제 적 AI는 v8의 공개 무효·흡수 학습을 사용하며 기존 배틀은 저장된 버전을 유지한다.

## 시작하기

**다른 컴퓨터에서 작업을 이어갈 때:** [컴퓨터 이전 안내](docs/current/COMPUTER_MOVE.md)와 [최신 작업 인계](docs/SESSION_HANDOFF.md)를 먼저 읽는다. 최신 파일은 Git untracked가 많고 개인 DB는 별도 백업이 필요하므로 clone만으로 옮기지 않는다.

Node.js 24 이상과 pnpm을 준비한 뒤 저장소 루트에서 실행한다.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

http://127.0.0.1:3000 에서 먼저 로그인·회원가입 후 게임 시작 또는 이어하기를 선택한다. 한 번 로그인하면 같은 브라우저에서 30일 동안 유지된다. 1~9세대 스타팅 최종 진화형 27종이 기본 해금된다. 회원가입하면 현재 게스트 저장을 연결한다. 다른 기기에서도 로그인하면 이어서 플레이할 수 있다. 기본 DB는 `.data/tower.sqlite`다. 설치·테스트 서버·백업은 [SETUP](docs/current/SETUP.md), 계정·기존 저장 복구는 [ACCOUNTS](docs/current/ACCOUNTS.md)를 참고한다.

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

## 문서와 자료

- [현재 상태](docs/STATUS.md): 실제 게임 규칙과 검증 범위.
- [작업 인계](docs/SESSION_HANDOFF.md), [다음 작업](docs/current/ROADMAP.md).
- [화면·키 조작](docs/current/UI_FLOW.md), [전체 문서 목록](docs/README.md).
- [실험 흐름과 결과](docs/experiments/README.md), [원자료 목록](artifacts/README.md), [스크립트 안내](scripts/README.md).
- [포트폴리오](docs/references/PORTFOLIO.md), [요구사항](docs/current/PRD.md), [원본 기획](pokemon-tower-plan.md).

최근에는 트릭룸 테스트 팀의 실패하는 기술을 수정하고 같은 코스에서 비교했다. 수정된 팀은 **실험용 시작 샘플**이며 실제 도감의 기술배치나 게임 가격 변경과 구분한다. 전체 게임 난이도는 추가 검증이 필요하고 자동 등반 결과는 사람 승률이 아니다.

전투 엔진·포켓몬 데이터·이미지·음원 출처는 [THIRD_PARTY](docs/references/THIRD_PARTY.md)를 따른다. Neo둥근모 웹폰트를 로컬 제공하며 [OFL 라이선스](public/fonts/NEODGM-LICENSE.txt)를 포함한다. 온라인 대전·Z기술은 현재 제공하지 않는다.
## 배포 준비

Docker와 독립 실행 패키지 사용법은 [배포 안내](docs/current/DEPLOYMENT.md)를 참고하세요.

