# 코드 구조

| 위치 | 책임 |
|---|---|
| `src/app` | Next.js 페이지·레이아웃·API 진입점 |
| `src/web` | 게임 화면, 조작, 이미지·소리·연출 |
| `src/web/styles` | 화면·기능별 CSS Modules와 공통 변수 |
| `src/battle` | 배틀 어댑터, 행동 정책, 공개 정보 기반 판단 |
| `src/server` | 계정, 요청 검증, 상대 팀 생성, 저장·복구·정산 |
| `src/data` | 실제 게임에서 읽는 데이터·규칙·템플릿 |
| `scripts/data/npc` | NPC 템플릿 생성기의 입력 자료 |
| `tests` / `e2e` | 코드 기능 검사 / 실제 브라우저 검사 |

브라우저 → Next.js API → 게임 서비스·저장소 → Showdown 배틀 엔진으로 연결됩니다. 화면은 서버가 제공한 공개 상태와 합법 행동을 사용합니다. 저장소가 소유권·재화·진행 상태를 검증하고 보상 중복을 막습니다.

실제 배틀은 초기 팀·시드·행동·버전을 저장해 복구합니다. 새로운 팀 생성 정책을 기존 배틀에 소급 적용하지 않습니다. 현재 새 상대 정책은 `tower-policy-v10`, 저장 스키마는 28입니다. 버전 근거는 `src/server/tower-store.ts`를 따릅니다.

[DB](DATABASE.md) · [CSS](CSS_STRUCTURE.md) · [NPC 입력](NPC_DATA.md)
