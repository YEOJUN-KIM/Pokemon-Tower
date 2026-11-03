# 문서 안내

- Status: Active
- Updated: 2026-11-03
- Baseline Commit: `1c05b6f5079143ba4be7df3f3745155aee483ce7`
- Applies To: beta.6 개발 / 문서 담당 영역 (공개 패키지 표기는 beta.5)

게임 소개와 다운로드는 [프로젝트 README](../README.md), 현재 공개 버전과 검증 범위는 [STATUS](STATUS.md)에서 확인합니다.

| 찾는 정보 | 시작할 문서 |
|---|---|
| 게임 | [조작·규칙](gameplay/README.md) · [도감과 출전 편성](gameplay/COLLECTION.md) · [튜토리얼·초기 지급](gameplay/TUTORIAL.md) |
| 개발 | [개발 명령어](development/DEVELOPER_COMMANDS.md) · [구조·영역별 개발](engineering/README.md) · [작업 인계](SESSION_HANDOFF.md) |
| 실행/배포 | [일반 사용자 실행](operations/SETUP.md) · [운영 문서 색인](operations/README.md) |
| 자산 | [복원·검증·manifest](assets/README.md) · [출처·라이선스](references/README.md) |
| 현재 상태 | [STATUS](STATUS.md) · [앞으로 할 일](current/ROADMAP.md) |
| 과거 기록 | [결정·조사 기록](history/README.md) · [beta.5 공개·검증 완료 기록](releases/WINDOWS_BETA_5.md) · [beta.1](releases/v1.0.0-beta.1.md) · [비전투 이벤트 릴리스](releases/NONCOMBAT_EVENTS_RELEASE.md) |

## 문서별 책임

- root README: 외부 게임 소개·특징·스크린샷·실행·기술 개요.
- STATUS: 현재 구현·버전·공개/검증 상태. ROADMAP: 앞으로 할 작업.
- gameplay: 플레이 규칙. engineering/development: 코드 구조와 개발 절차.
- operations: 사용자 실행·런처 내부·서버 배포·저장/백업을 담당 문서로 구분.
- assets/references: 현재 자산 복원 정책과 출처·권리·고정 조사 기록.
- releases/history: 특정 시점의 변경과 검증 근거. 과거 수치를 현재 기준으로 덮어쓰지 않음.

`docs/`는 Git에 보존하는 공식 안내·설계·정책·출처 기록입니다. `artifacts/`는 Git 제외 QA 로그·캡처·자동 보고서·실험 결과입니다. 새 clone의 일반 실행·빌드·테스트·문서 검사는 로컬 artifacts를 필수 입력으로 요구하지 않습니다. 필요한 고정 입력은 `src/`, `scripts/data/`, `tests/fixtures/` 또는 검토한 manifest에 둡니다. 자세한 경계는 [폴더 관리](engineering/WORKSPACE.md), 과거 정리 근거는 [문서 승격 기록](engineering/ARTIFACT_PROMOTION.md)을 따릅니다.

## 2026-11-03 문서 전체 조사와 우선순위

기준은 위 main HEAD다. `STATUS`, 인계, ROADMAP, 육성/알/상점/NPC, DB/구조 문서는 최신화 필요로 분류한 뒤 이번에 갱신했다. 나머지는 역할·링크·현행/과거 범위를 검토했다. 아래는 **갱신 후 분류**이며 legacy/archive는 이동·삭제하지 않고 원위치에 남긴다. Active metadata의 날짜는 문서 검토일이며 과거 수치·소스 해시의 재측정일이 아니다.

현재 구현은 STATUS → gameplay → 담당 engineering, 계획은 ROADMAP, 과거 측정은 releases/history/ADR 순서로 읽는다. `NPC_TRAINING`의 v1 수치·가중치·기믹 설명은 `opponent-progression`으로 superseded다. 자산 JSON manifest는 고정 출처 snapshot으로 전부 보존하며 현재 구현 문서로 재해석하지 않는다.

| 기존 문서 | 갱신 후 분류 |
|---|---|
| [assets/ASSET_OWNERSHIP.md](assets/ASSET_OWNERSHIP.md) | 일부만 유효 / 구 규칙 superseded |
| [assets/EXTERNAL_ASSETS.md](assets/EXTERNAL_ASSETS.md) | 일부만 유효 / 구 규칙 superseded |
| [assets/MIXED_RUNTIME_ASSETS.md](assets/MIXED_RUNTIME_ASSETS.md) | 일부만 유효 / 구 규칙 superseded |
| [assets/POKEAPI_RESTORE.md](assets/POKEAPI_RESTORE.md) | 현재 유효 |
| [assets/POKEROGUE_RESTORE.md](assets/POKEROGUE_RESTORE.md) | 현재 유효 |
| [assets/README.md](assets/README.md) | 현재 유효 |
| [assets/SHOWDOWN_POKEMON_RESTORE.md](assets/SHOWDOWN_POKEMON_RESTORE.md) | 현재 유효 |
| [current/README.md](current/README.md) | 현재 유효 |
| [current/ROADMAP.md](current/ROADMAP.md) | 현재 유효 (계획 문서) |
| [development/DEVELOPER_COMMANDS.md](development/DEVELOPER_COMMANDS.md) | 현재 유효 |
| [engineering/ARCHITECTURE.md](engineering/ARCHITECTURE.md) | 현재 유효 |
| [engineering/ARTIFACT_DEPENDENCIES.md](engineering/ARTIFACT_DEPENDENCIES.md) | archive 후보 (원위치 보존) |
| [engineering/ARTIFACT_PROMOTION.md](engineering/ARTIFACT_PROMOTION.md) | archive 후보 (원위치 보존) |
| [engineering/BAG.md](engineering/BAG.md) | 현재 유효 |
| [engineering/CHALLENGER_SELECTION_UI.md](engineering/CHALLENGER_SELECTION_UI.md) | 현재 유효 |
| [engineering/CSS_STRUCTURE.md](engineering/CSS_STRUCTURE.md) | 현재 유효 |
| [engineering/DATABASE.md](engineering/DATABASE.md) | 현재 유효 |
| [engineering/decisions/001-initial-scope.md](engineering/decisions/001-initial-scope.md) | legacy (과거 ADR) |
| [engineering/decisions/002-web-battle.md](engineering/decisions/002-web-battle.md) | legacy (과거 ADR) |
| [engineering/decisions/003-tower-persistence.md](engineering/decisions/003-tower-persistence.md) | legacy (과거 ADR) |
| [engineering/decisions/README.md](engineering/decisions/README.md) | legacy (과거 ADR) |
| [engineering/EVENT_SYSTEM.md](engineering/EVENT_SYSTEM.md) | 현재 유효 |
| [engineering/HIDDEN_BOSS.md](engineering/HIDDEN_BOSS.md) | 현재 유효 |
| [engineering/HIDDEN_SHOP.md](engineering/HIDDEN_SHOP.md) | 현재 유효 |
| [engineering/MAINTENANCE.md](engineering/MAINTENANCE.md) | 현재 유효 |
| [engineering/MIRROR_CHALLENGER.md](engineering/MIRROR_CHALLENGER.md) | 현재 유효 |
| [engineering/MOVE_EFFECTS.md](engineering/MOVE_EFFECTS.md) | 현재 유효 |
| [engineering/npc-ai.md](engineering/npc-ai.md) | 현재 유효 |
| [engineering/NPC_DATA.md](engineering/NPC_DATA.md) | 현재 유효 |
| [engineering/NPC_SELECTION.md](engineering/NPC_SELECTION.md) | 현재 유효 |
| [engineering/NPC_TRAINING.md](engineering/NPC_TRAINING.md) | 일부만 유효 / 구 규칙 superseded |
| [engineering/opponent-progression.md](engineering/opponent-progression.md) | 현재 유효 |
| [engineering/RAID_EVENTS.md](engineering/RAID_EVENTS.md) | 현재 유효 |
| [engineering/README.md](engineering/README.md) | 현재 유효 |
| [engineering/TECH_STACK.md](engineering/TECH_STACK.md) | 현재 유효 |
| [engineering/VILLAIN_CAMPAIGNS.md](engineering/VILLAIN_CAMPAIGNS.md) | 현재 유효 |
| [engineering/WORKSPACE.md](engineering/WORKSPACE.md) | 현재 유효 |
| [gameplay/BATTLE.md](gameplay/BATTLE.md) | 현재 유효 |
| [gameplay/COLLECTION.md](gameplay/COLLECTION.md) | 현재 유효 |
| [gameplay/CONTROLS.md](gameplay/CONTROLS.md) | 현재 유효 |
| [gameplay/EGGS.md](gameplay/EGGS.md) | 현재 유효 |
| [gameplay/EVENT_CANDIDATES.md](gameplay/EVENT_CANDIDATES.md) | 현재 유효 (계획 문서) |
| [gameplay/EVENTS.md](gameplay/EVENTS.md) | 현재 유효 |
| [gameplay/ITEMS.md](gameplay/ITEMS.md) | 현재 유효 |
| [gameplay/MOVE_EFFECTS_PLAN.md](gameplay/MOVE_EFFECTS_PLAN.md) | 일부만 유효 / 구 규칙 superseded |
| [gameplay/NPC.md](gameplay/NPC.md) | 현재 유효 |
| [gameplay/PROGRESSION.md](gameplay/PROGRESSION.md) | 현재 유효 |
| [gameplay/README.md](gameplay/README.md) | 현재 유효 |
| [gameplay/STARTER_MOVES.md](gameplay/STARTER_MOVES.md) | 현재 유효 |
| [gameplay/TUTORIAL.md](gameplay/TUTORIAL.md) | 현재 유효 |
| [history/BATTLE_AUDIO.md](history/BATTLE_AUDIO.md) | archive 후보 (원위치 보존) |
| [history/README.md](history/README.md) | archive 후보 (원위치 보존) |
| [history/REFACTORING-2026-10-18.md](history/REFACTORING-2026-10-18.md) | archive 후보 (원위치 보존) |
| [images/README.md](images/README.md) | 일부만 유효 / 구 규칙 superseded |
| [operations/ACCOUNTS.md](operations/ACCOUNTS.md) | 현재 유효 |
| [operations/BACKUPS.md](operations/BACKUPS.md) | 현재 유효 |
| [operations/COMPUTER_MOVE.md](operations/COMPUTER_MOVE.md) | 현재 유효 |
| [operations/DEPLOYMENT.md](operations/DEPLOYMENT.md) | 현재 유효 |
| [operations/README.md](operations/README.md) | 현재 유효 |
| [operations/SETUP.md](operations/SETUP.md) | 현재 유효 |
| [operations/WINDOWS_PLAYER.md](operations/WINDOWS_PLAYER.md) | 일부만 유효 / 구 규칙 superseded |
| [operations/WINDOWS_ZIP_PATHS.md](operations/WINDOWS_ZIP_PATHS.md) | 현재 유효 |
| [README.md](README.md) | 현재 유효 |
| [references/POKEROGUE_REFERENCE.md](references/POKEROGUE_REFERENCE.md) | archive 후보 (원위치 보존) |
| [references/README.md](references/README.md) | 현재 유효 |
| [references/REFERENCE_GAMES.md](references/REFERENCE_GAMES.md) | 현재 유효 |
| [references/THIRD_PARTY.md](references/THIRD_PARTY.md) | 현재 유효 |
| [releases/NONCOMBAT_EVENTS_RELEASE.md](releases/NONCOMBAT_EVENTS_RELEASE.md) | archive 후보 (원위치 보존) |
| [releases/v1.0.0-beta.1.md](releases/v1.0.0-beta.1.md) | archive 후보 (원위치 보존) |
| [releases/WINDOWS_BETA_5.md](releases/WINDOWS_BETA_5.md) | archive 후보 (원위치 보존) |
| [SESSION_HANDOFF.md](SESSION_HANDOFF.md) | 현재 유효 |
| [STATUS.md](STATUS.md) | 현재 유효 |

README 계열 추가 검토: root README는 beta.6 개발/실행/진입 문서를 최신화했다. `scripts/README.md`는 도구 색인으로 유지하고 실제 명령/파일 존재를 workspace 검사한다. `external/README.md`·하위 원본 README·자산 옆 sources/라이선스는 출처 기록이므로 수정하지 않는다. `tests/fixtures/README.md`는 고정 과거 재생 입력 안내이며 최신 기능 소개로 사용하지 않는다.

### 남아 있는 문서 TODO

- 경제/Support/Scout 구현 후 계획을 실제 규칙으로 승격하고 가격·분포·첫 기믹 영수증을 확인한다.
- beta.6 package/player 버전·릴리스 검증은 실제 변경/배포 후에만 갱신한다.
- 잔존 E2E 정리 후 실제 실행 범위를 갱신한다. 전체 green을 추정하지 않는다.
- 경제/상점 이후 49→50·100층 재측정 결과를 담당 진행 문서에 반영한다.
- 자산·Drive 보존 분리는 별도 승인 작업이다. 현 위치는 [자산 안내](assets/README.md)에 기록했다.
