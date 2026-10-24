# 개발 이어받기

기준: 2026-10-24 · beta.5 공개 완료. 현재 기능은 [STATUS](STATUS.md), 다음 우선순위는 **사운드 → VFX → UI·콘텐츠 완성도 → 플레이 피드백 기반 밸런스**다. 상세 계획은 [ROADMAP](current/ROADMAP.md), 파일 책임은 [WORKSPACE](engineering/WORKSPACE.md)를 따른다.

## 실행과 저장

| 경로 | 용도 |
|---|---|
| GitHub Windows Release ZIP → PokemonTower.exe | 일반 사용자 production 실행. Node.js 24+ 필요 |
| `%LOCALAPPDATA%/PokemonTower/saves/tower.sqlite` | Windows 사용자 저장. ZIP·설치 package와 분리 |
| `.env.local`의 TOWER_DB_PATH, 기본 `.data/tower.sqlite` | 개발 서버 저장 |
| Docker 볼륨의 `/data/tower.sqlite` | 개인 서버/임시 터널 저장 |

위 DB는 자동 동기화·병합하지 않는다. 실제 DB·WAL/SHM·환경 파일·백업을 임시 산출물로 정리하지 않는다. 저장 이동은 [BACKUPS](operations/BACKUPS.md)·[COMPUTER_MOVE](operations/COMPUTER_MOVE.md)를 따른다. 개인 서버용 `포켓몬타워 실행.exe`는 공개 플레이어 EXE와 별도다.

## 빌드와 검증 진입점

- 개발 clone: [DEVELOPER_COMMANDS](development/DEVELOPER_COMMANDS.md)의 의존성·Python/Pillow 준비 → `pnpm assets:setup` → `pnpm assets:verify` → 개발/build/test.
- Windows 배포: `pnpm player:package`, `pnpm player:package:verify`, `pnpm player:package:test`. 출력은 `dist/PokemonTower-Windows-v<버전>/`와 ZIP/SHA256이며 기존 출력은 덮어쓰지 않는다.
- package 버전과 `scripts/player/config.json`을 함께 관리한다. 현재 appVersion beta.5, launcherVersion 1.0.2, buildVersion `1.0.0-beta.5-player.1`, marker schema 1이다.
- QA는 별도 `--home`/DB를 사용한다. 사용자 저장을 시험용으로 초기화하지 않는다. 공개 파일·해시·검증 범위는 [beta.5 완료 기록](releases/WINDOWS_BETA_5.md)에 있다.

## 유지할 구조와 계약

- 브라우저 → API → TowerService → TowerStore/BattleSession → Showdown. DB schema 47, 새 일반 전투 정책 tower-policy-v13. 이벤트/NPC snapshot 버전은 DB·AI 버전과 별개다.
- 팀·시드·보상·정책·영수증은 저장 당시 snapshot으로 복구한다. 호환 분기를 옛 코드라는 이유로 삭제하지 않는다.
- 초기 성장포인트 256P는 튜토리얼 선택 전에 한 번 지급한다. `initial-growth.ts`와 기존 `reward_granted` 영수증을 재사용하며 진행·스킵·반복 요청으로 추가 지급하지 않는다.
- `/pokedex`는 정보·성장·기술 관리, `/battle?prepare=1`은 출전 파티 편성이다. 같은 Pokedex의 mode와 계정 저장을 공유하되 기본 필터·메뉴·파티 표시를 분리한다. [COLLECTION](gameplay/COLLECTION.md)·[TUTORIAL](gameplay/TUTORIAL.md).
- 인증은 로그인 중심 링크 이동·30일 세션·완료 화면 단일 게임 시작 버튼을 유지한다. 화면 이동/next 정책과 API 계약은 [ACCOUNTS](operations/ACCOUNTS.md)를 따른다.
- 일반 이벤트 20%·통과 순서 쿨다운 2, 빌런 독립 판정, 층별 성장 즉시 지급과 차액 정산을 유지한다. [EVENT_SYSTEM](engineering/EVENT_SYSTEM.md)·[PROGRESSION](gameplay/PROGRESSION.md).
- NPC 검토 입력은 `scripts/data/npc/normal-npc-samples.json`, runtime export와 구분한다. 알의 지역/타입 선택·연구 UI는 현재 제공하지 않는다.
- 외부 runtime은 Git 제외이며 고정 lock/recipe/golden으로 복원한다. project-original과 출처·고지는 보존한다. [ASSETS](assets/README.md).
- game-menu·game-keyboard·GameDialogue·PokemonSettings 및 기존 자산/음향 경계를 재사용한다. Windows 종료 소유권은 [WINDOWS_PLAYER](operations/WINDOWS_PLAYER.md)를 따른다.

## 작업 전후

1. Git 변경과 담당 문서를 확인한다. Next.js 수정 전 설치된 `node_modules/next/dist/docs/`의 관련 가이드를 읽는다.
2. 변경 범위에 맞는 테스트·타입·빌드·화면 검사를 선택하고, 자동 검사와 실제 플레이를 구별한다.
3. 현재 설명은 담당 docs를 갱신한다. 과거 결정은 releases/history, 일회성 QA·실험 출력은 Git 제외 artifacts에 둔다.
4. `pnpm check:workspace`, `pnpm typecheck`로 확인한다. commit/tag/Release 공개는 별도 명시 요청에 따른다.
