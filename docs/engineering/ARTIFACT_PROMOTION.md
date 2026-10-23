# 공식 문서 승격 판단 · 2026-10-23

기준 HEAD: `853b1a223f82a0dd02564edab13a85a0f8853818`. 기존 docs의 gameplay/engineering/operations/references/releases 구조를 유지하고 assets/manifests와 history만 추가했다. 원문을 읽고 현재 안내 및 구현과 대조했다. 이 작업은 게임 규칙·런타임 데이터·외부 자산 구조를 변경하지 않는다.

## 후보 분류와 중복 판단

| 원래 artifacts 파일 | 분류 | 공식 위치 / 판단 |
|---|---|---|
| reports/planning/BATTLE_REBALANCE_PLAN.md | OUTDATED | 현재 gameplay/NPC·EVENTS·ITEMS와 engineering/NPC_DATA가 우선. 옛 빌런 15%, 10개 조직, 미구현 육성·영양제 설명이 현재와 충돌한다. 일반 < 엘리트 < 보스라는 목표와 공개 정보 원칙은 기존 docs에 이미 있다. 원본은 당시 논의 기록으로 유지 |
| reports/planning/NORMAL_MODE_PLAN.md | CURRENT_DOC (정책 부분만 통합) | gameplay/NPC.md. 50/55/100 기믹·플레이어 룰과 NPC 파티 분리 원칙을 보존. 두 단계 328팀·옛 75층 빌런 조건·옛 50층 팀/IV는 현 allFloors/독립 캠페인/50층 예외로 대체. 과거 시뮬 기록은 원본 유지 |
| reports/planning/PERMANENT_PROGRESS_UI.md | COMPLETED_PLAN | 현재 gameplay/COLLECTION·EGGS·PROGRESSION·CONTROLS가 우선. 보라 PC→빨간 도감 등 반복 시안·옛 612종/가격·schema24를 현재 정책으로 승격하지 않음 |
| reports/planning/EVENT_REWARDS.md | OUTDATED | 내용 자체가 gameplay/EVENTS.md로 옮겼다는 포인터. 현재 EVENTS·EVENT_CANDIDATES로 대체되어 복제하지 않음 |
| reports/changes/BATTLE_GIMMICKS.md | OUTDATED | 현 gameplay/BATTLE.md의 트레이너 장비·기믹별 횟수·가격이 우선. 초기 공용 메가/다이맥스 1회·2500코인·AI v4를 현재로 복사하지 않음 |
| reports/changes/MOVE_EFFECTS.md | CURRENT_DOC | engineering/MOVE_EFFECTS.md로 전체 승격. 구조·스킵·동작 감소·HP 표시 경계 유지. 검증 횟수는 당시 기록으로 명시 |
| reports/changes/BATTLE_AUDIO.md | HISTORICAL_DECISION | history/BATTLE_AUDIO.md로 전체 승격. 음악 교체·합성·측정·페이드 결정 보존. 현재 음원 목록은 public/audio/music-sources.json이 기준 |
| reports/changes/OPPONENT_EVOLUTION_POLICY.md | CURRENT_DOC (정책 부분만 통합) | gameplay/COLLECTION.md. 수집/상대 후보 기준·기존 packed/legacy 보존 통합. 옛 schema28·328팀·재생성/테스트 기록은 원본 유지 |
| reports/changes/REFACTORING-2026-10-18.md | HISTORICAL_DECISION | history/REFACTORING-2026-10-18.md로 전체 승격. 저장 호환·원자성·명시적 QA 우회 제거 근거. 당시 schema45·10%는 현재값이 아님 |
| reports/changes/NONCOMBAT_EVENTS_RELEASE.md | HISTORICAL_DECISION | releases/NONCOMBAT_EVENTS_RELEASE.md로 전체 승격. 패키징 필수 입력. 현재 운영 안내와 분리하여 옛 수치 보존 |
| reports/changes/play-feedback-2026-10-23.md | CURRENT_DOC (확정 결정은 기존 문서에 이미 통합) | gameplay/BATTLE·EVENTS·PROGRESSION·ITEMS: 20%·쿨다운·보상/가격 배율·BeforeMove·보상 공개·강제 빌런/선택 Raid. PC QA 수치·파일별 변경표·캡처는 원본 유지 |
| reports/changes/play-feedback-followup-2026-10-23.md | CURRENT_DOC (확정 결정은 기존 문서에 이미 통합) | gameplay/BATTLE·PROGRESSION·NPC와 engineering/NPC_DATA: 즉시 성장 지급·차액 정산·50층 IV24/포인트46·기믹/긴 설명·무상태 도망. 튜토리얼 정책 변경 없음; 기존 gameplay/TUTORIAL 유지. 고정 seed 구성·QA 결과는 원본 유지 |
| reports/npc/named-trainer-selection-rules.md | CURRENT_DOC (정책 부분만 통합) | engineering/NPC_SELECTION.md. 실제 npc-selection-rules 구현과 export/load 검증을 대조. 옛 16개 ID/26개 템플릿·311개 감사 표는 원본 유지 |
| reports/npc/npc-sprite-review.json | HISTORICAL_DECISION / 장기 출처 | assets/manifests/npc-sprite-review.json. 현재 THIRD_PARTY에서 참조하는 반입/보류·크레딧 근거. 생성기의 실행 원본은 유지 |
| reports/references/REFERENCE_GAMES.md | HISTORICAL_DECISION | references/REFERENCE_GAMES.md로 전체 승격. 영감·미채택 규칙·기술 전환 후보의 당시 판단 보존. 옛 미연동 상태는 현재 기능이 아님 |
| reports/references/POKEROGUE_REFERENCE.md | HISTORICAL_DECISION | references/POKEROGUE_REFERENCE.md로 전체 승격. 확인 범위·미검증 항목·코드와 자산 조건 구분 보존. 외부 조건 재검증은 이번 작업 범위 아님 |

초기 도감 시안의 Nintendo DS 참고는 초기 요구/완료 시안의 기록이며 현재 UI 지침을 대체하지 않는다. 공식 문서의 QA 링크는 로컬 전용 경로로 명시해 새 clone에서 필수 링크가 되지 않도록 했다.

## 전체 승격과 중복 제거 대상

새 공식본·참조·Git 제외 여부와 링크를 확인한 뒤 아래 원본만 제거한다. 자동 생성 원본은 [자산 manifest 안내](../assets/README.md)의 역할에 따라 유지한다.

| 기존 경로 | 새 공식 경로 | 이유 |
|---|---|---|
| `artifacts/reports/changes/NONCOMBAT_EVENTS_RELEASE.md` | [NONCOMBAT_EVENTS_RELEASE.md](../releases/NONCOMBAT_EVENTS_RELEASE.md) | 전체 문서/고정 출처의 공식 위치를 하나로 통일 |
| `artifacts/reports/changes/MOVE_EFFECTS.md` | [MOVE_EFFECTS.md](MOVE_EFFECTS.md) | 전체 문서/고정 출처의 공식 위치를 하나로 통일 |
| `artifacts/reports/changes/BATTLE_AUDIO.md` | [BATTLE_AUDIO.md](../history/BATTLE_AUDIO.md) | 전체 문서/고정 출처의 공식 위치를 하나로 통일 |
| `artifacts/reports/changes/REFACTORING-2026-10-18.md` | [REFACTORING-2026-10-18.md](../history/REFACTORING-2026-10-18.md) | 전체 문서/고정 출처의 공식 위치를 하나로 통일 |
| `artifacts/reports/references/REFERENCE_GAMES.md` | [REFERENCE_GAMES.md](../references/REFERENCE_GAMES.md) | 전체 문서/고정 출처의 공식 위치를 하나로 통일 |
| `artifacts/reports/references/POKEROGUE_REFERENCE.md` | [POKEROGUE_REFERENCE.md](../references/POKEROGUE_REFERENCE.md) | 전체 문서/고정 출처의 공식 위치를 하나로 통일 |
| `artifacts/qa/assets/reports/resource-manifest.json` | [resource-manifest.json](../assets/manifests/resource-manifest.json) | 전체 문서/고정 출처의 공식 위치를 하나로 통일 |
| `artifacts/qa/assets/reports/move-data-source.json` | [move-data-source.json](../assets/manifests/move-data-source.json) | 전체 문서/고정 출처의 공식 위치를 하나로 통일 |
| `artifacts/qa/assets/reports/move-effects-integration.json` | [move-effects-integration.json](../assets/manifests/move-effects-integration.json) | 전체 문서/고정 출처의 공식 위치를 하나로 통일 |

## 유지하는 로컬 자료

- 일부 정책만 통합한 계획·피드백·NPC 선출·수집 보고서는 당시 결과·검증 범위가 별도로 필요하므로 유지한다.
- 자동 가져오기 6종의 JSON은 실행 결과, docs JSON은 검토 완료 공식 스냅샷이다. 현재 내용이 같더라도 갱신 주체·역할이 다르며 공식 입력은 docs만 읽는다.
- 실험 원자료·로그·CSV는 재현성 자료다. 테스트에는 10개 작은 fixture만 보존하고 거대 보고서는 승격하지 않는다.

## 필수 입력과 선택 실험의 경계

배포 스크립트는 docs 릴리스 기록을 사용한다. battle:audit·sprites:audit의 revision 입력은 공식 local-pokemon-sprites manifest로 고정한다. 기본 테스트의 mega 출처 입력도 docs를 사용하며 과거 sample/raid 입력은 tests/fixtures로 분리했다. 출력 디렉터리는 실행 시 생성한다. [전체 참조 파일별 목록](ARTIFACT_DEPENDENCIES.md)을 함께 확인한다.

## 검증 기록

- artifacts·.data·.next가 없는 별도 소스 사본에서 관련 테스트 25개와 TypeScript `--noEmit --incremental false` 검사를 통과했다. 테스트가 만드는 DB는 해당 검증 사본에만 생성했다.
- 공식 문서 64개·로컬 링크 333개, 남은 artifacts 보고서의 링크 569개를 검사했다. 전체 승격본 15개의 Git 포함 가능 여부와 JSON 9개의 원본 SHA-256 일치를 확인했다.
- `package-deploy.mjs --check`와 `git diff --check` 통과. 실제 프로덕션 빌드·배포·서버 실행은 수행하지 않았다. 원래 프로젝트의 .next·.data를 변경하지 않기 위해 검증 사본을 사용했다.
- 중복 파일 9개만 제거하고 남은 로컬 보고서 5개의 이동 링크를 갱신했다. 그 밖의 .data·.next·artifacts 파일 추가·삭제·크기/수정시각 변경은 없었다. src·public·vendor diff도 없다.
- 새 파일은 Git ignore 대상이 아니며 아직 `??` 상태다. 커밋 전에 docs·fixture와 스크립트 변경을 함께 추가해야 새 clone에도 반영된다. 이번 작업에서는 staging·커밋·푸시를 하지 않았다.

## 다음 단계 제안

.data에는 현재 스키마의 공식 원본이 없고 기존 schema.ts·NPC JSON 사본은 테스트 기준 checkout이다. 새 seed로 옮길 필요를 확인하지 못했으며 실제 저장·WAL/SHM·백업·transfers는 그대로 보존한다. 외부 asset 구조 설계는 시작할 수 있다. 먼저 이 공식 manifest를 바탕으로 URL·해시·누락/현재 사용 여부를 대조하고 별도 생성기·업데이트 정책을 정한다. 과거 manifest가 현재 모든 파일을 보장하지는 않는다.
