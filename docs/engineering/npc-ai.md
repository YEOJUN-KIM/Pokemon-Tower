# NPC AI와 저장 정책

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

Basic/Tactical/Expert는 판단 능력이며 레벨·IV·능력 포인트·기술·도구와 별개다. 공통 층 기준은 1~19 Basic, 20~49 Tactical, 50+ Expert이지만 일반 NPC 상한, 네임드/보스/도전자와 지역별 설정이 우선한다. 명시한 aiCeiling도 보존한다.

v13은 v12 기반에 등장 우선기 판단을 조합하고, 저장된 NpcAi 설정에 따라 가라르 운영·에이스 보존·팔데아 테라·피벗/교체 정책을 사용한다. 지역별 조건은 data/npc-ai.ts와 해당 지역 데이터, 실제 행동 점수와 제약은 battle의 정책 클래스가 기준이다. 모든 NPC가 모든 기능을 사용하는 것은 아니다.

AI는 자신의 팀과 공개 관측만 전달받는다. 실제 상대 비공개 도구·기술·선택 행동을 읽어 판단하지 않는다. 이전 AI와 Raid/특수 전투의 저장 정책도 그대로 재생한다.

관련 검증은 tests/npc-ai.test.ts·지역별 NPC 검사와 tests/npc-ai.test.ts 등 실제 저장/공개 관측 검사다. 현재 존재하는 테스트 목록과 명령은 [개발 도구](../../scripts/README.md)에서 확인한다. 실험 승률은 사람의 난이도 검증을 대체하지 않는다.

[NPC 입력](NPC_DATA.md) · [DB와 버전](DATABASE.md) · [현재 NPC 규칙](../gameplay/NPC.md)
