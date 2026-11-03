# NPC AI와 저장 정책

- Status: Active
- Updated: 2026-11-03
- Baseline Commit: `1c05b6f5079143ba4be7df3f3745155aee483ce7`
- Applies To: beta.6 개발 / 문서 담당 영역 (공개 패키지 표기는 beta.5)

새 일반 전투의 기본 정책은 src/server/tower-store.ts의 AI_VERSION = tower-policy-v13이다. 저장된 전투는 해당 ai_version으로 복구하며 v12/v11 및 이전 정책 파일도 실제 재생에 사용한다. 이름에 버전이 있다는 이유로 삭제하지 않는다.

## 설정과 책임

| 위치 | 책임 |
|---|---|
| src/data/npc-ai.ts | 층·역할·Rank·aiCeiling·지역에 따른 tier/전술 설정 |
| src/battle/npc-policy.ts | 현재 v13 정책 조합 |
| src/battle/npc-policy-v12.ts | v12 조합과 v13이 재사용하는 기반 |
| src/battle/npc-policy-v11.ts | v11 보관 경로 |
| src/server/battle-session.ts | 저장 버전별 실제 정책 선택 |
| src/server/tower-service.ts | 지원 버전 확인·저장 전투 복구 |

Basic/Tactical/Expert는 육성 수치와 별개다. 신규 v2는 1–10 basic, 11–30 tactical, 31–40 tactical(Master expert), 41층 이후 Normal tactical/강한 Rank expert, 81층 이후 공통 Normal도 expert다. 50/100 Champion은 expert이며 후기 네임드의 명시적 aiCeiling은 유지한다. v1의 1–19 basic/20–49 tactical/50+ expert 곡선은 보존 참조다.

v2는 저장 descriptor의 `buildSupport:'v1'`로 `BuildSupportPolicy`를 선택한다. screen·설치기·상태이상·회복·날씨를 HP/위험/KO 가능성/이미 전개한 필드에 따라 사용하며 허용 tier에서는 advancedSwitch를 연결한다. 모든 팀에 설치/날씨를 강제하지 않는다. [층별 정책](opponent-progression.md).

v13은 v12 기반에 등장 우선기 판단을 조합하고, 저장된 NpcAi 설정에 따라 가라르 운영·에이스 보존·팔데아 테라·피벗/교체 정책을 사용한다. 지역별 조건은 data/npc-ai.ts와 해당 지역 데이터, 실제 행동 점수와 제약은 battle의 정책 클래스가 기준이다. 모든 NPC가 모든 기능을 사용하는 것은 아니다.

AI는 자신의 팀과 공개 관측만 전달받는다. 실제 상대 비공개 도구·기술·선택 행동을 읽어 판단하지 않는다. 이전 AI와 Raid/특수 전투의 저장 정책도 그대로 재생한다.

관련 검증은 tests/npc-ai.test.ts·지역별 NPC 검사와 tests/npc-ai.test.ts 등 실제 저장/공개 관측 검사다. 현재 존재하는 테스트 목록과 명령은 [개발 도구](../../scripts/README.md)에서 확인한다. 실험 승률은 사람의 난이도 검증을 대체하지 않는다.

[NPC 입력](NPC_DATA.md) · [DB와 버전](DATABASE.md) · [현재 NPC 규칙](../gameplay/NPC.md)
