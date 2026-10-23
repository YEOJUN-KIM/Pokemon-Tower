# 문서 현재 상태 동기화 — 2026-10-23

기능 수정 없이 문서와 색인만 정리했다. 코드·데이터·테스트·스크립트·package.json·락 파일은 변경하지 않았다.

## 확인 근거

- 1차 플레이 피드백: `41b20ab0aa04f75137014dfcb93212892f17b04b`.
- 후속 피드백 및 현재 HEAD: `e5dc2fa842770c90c1af19280c10620451c67c28` (`Beta.4수정`).
- 실제 설정·로직: `src/data/run-events.ts`, `src/game/run-events.ts`, `economy.ts`, `held-items.ts`, `server/tower-store.ts`, `schema.ts`, `npc-templates.ts`, `opponent-team.ts`, 배틀·이벤트·보상·기믹·설명 UI와 관련 테스트를 대조했다.
- GitHub 공개 Release API를 읽기 전용으로 조회했다. 공개 목록은 `v1.0.0-beta.3`, `v.1.0.0-beta.2`이며 beta.4는 없었다. [공개 beta.3](https://github.com/YEOJUN-KIM/Pokemon-Tower/releases/tag/v1.0.0-beta.3)는 2026-10-23 게시된 프리릴리즈다.
- 로컬 태그에는 beta.1·beta.2·beta.3이 있고 beta.4는 없다. `package.json`은 `1.0.0-beta.1`이다. 개발 기준 beta.4는 현재 커밋의 작업 기준이며, 공개 릴리즈·패키지 버전과 구별했다.

## 확인·수정한 문서

README·STATUS·ROADMAP·문서 안내·개발 인계·게임 규칙(진행/이벤트/도구/배틀/조작/수집/NPC)·이벤트 및 데이터 구조 개발 문서·배포 안내·변경 기록 색인을 확인했다. 기존 릴리즈 노트와 날짜별 변경/실험 보고서는 역사적 기록으로 구분했다.

오래된 내용은 현재 버전/기준일, 일반 이벤트 15%, 일반 상점 장비 5,000코인, 메가스톤 개수, 층별 성장 지급·중복 정산 설명 누락, 50층 예외 누락, 기믹/Z설명/도망 안내 누락이었다. 현재 문서에 기록한 숫자는 실제 코드에서 확인했다. 핵심 규칙은 [현재 상태](../../../docs/STATUS.md)와 [게임 안내](../../../docs/gameplay/README.md)에 둔다.

## 역할과 위치

| 문서 | 역할 |
|---|---|
| README | 외부 소개·주요 기능·실행·향후 방향. 개발 beta.4/공개 beta.3와 PC 우선 방향 표시 |
| STATUS | 2026-10-23 현재 구현·주요 설정·서로 다른 버전의 구분 |
| ROADMAP | 완료된 두 차례 피드백은 색인 참조, 앞으로의 UI/VFX/사운드/콘텐츠/추가 밸런스/모바일/Hard Mode/ML 연구만 유지 |
| gameplay / engineering | 현재 규칙과 설정 책임·저장 호환 설명 |
| artifacts/reports/changes | 변경의 이유·범위·당시 검증을 보존하고 색인으로 연결 |
| artifacts/qa | 자동 테스트 로그·화면·QA 결과. 게임 현황이나 앞으로의 계획을 누적하지 않음 |

두 플레이 피드백 보고서를 `docs/` 루트에서 `artifacts/reports/changes/`로 옮겼다. 이는 기존 `scripts/check-workspace.mjs`의 폴더 책임 규칙에 맞춘 이동이다. 보고서 본문·수치·검증 결과는 원본과 동일하며 이미지 상대 경로만 수정했다. 색인과 NPC 가이드의 참조도 갱신했다. 자동 테스트 로그와 이미지는 옮기거나 복제하지 않았다.

## 보존한 기록·남은 구분

- 과거 릴리즈 노트의 beta.1 및 과거 보고서/실험의 당시 이벤트 15%·가격·테스트 횟수는 수정하지 않았다.
- 현재 상자의 내부 결과 15%, 히든상점의 별도 5,000~8,000코인 가격표는 실제 데이터와 일치하므로 유지했다. 일반 이벤트 발생률·일반 상점 할인과 다른 설정이다.
- 패키지 메타데이터 beta.1은 코드 변경 금지 범위로 그대로 두고 문서에서 이유를 설명했다. 공개 beta.3와 개발 beta.4의 차이는 문서 충돌이 아니라 명시한 버전 구분이다.
- 모바일 입력 경로나 과거 모바일 QA 기록은 보존하되, 현재 완전 최적화를 보장하는 표현은 쓰지 않았다.
- 점검한 현재 문서 사이에서 이번 변경과 관련된 미해결 규칙 충돌은 발견하지 않았다.

## 검증

- `node scripts/check-workspace.mjs`: 현재 문서 폴더 경계·버전 참조·전체 Markdown 로컬 링크 검사 통과.
- `git diff --check`: 통과.
- 이동한 두 보고서는 HEAD 원문과 비교해 상대 이미지 경로를 제외한 본문 동일성을 확인했다.
- Git diff의 모든 변경 파일이 Markdown이며 코드·데이터·테스트·스크립트·package/락 파일 diff가 없음을 확인했다.
- 문서 전용 작업이므로 게임 테스트·빌드를 새로 실행하거나 과거 보고서의 결과를 이번 검증으로 재사용하지 않았다.

## 수정 파일 목록

- `README.md`
- `artifacts/reports/changes/DOCUMENTATION_SYNC_2026_10_23.md`
- `artifacts/reports/changes/README.md`
- `artifacts/reports/changes/play-feedback-2026-10-23.md`
- `artifacts/reports/changes/play-feedback-followup-2026-10-23.md`
- `docs/README.md`
- `docs/SESSION_HANDOFF.md`
- `docs/STATUS.md`
- `docs/current/ROADMAP.md`
- `docs/engineering/ARCHITECTURE.md`
- `docs/engineering/DATABASE.md`
- `docs/engineering/EVENT_SYSTEM.md`
- `docs/engineering/HIDDEN_SHOP.md`
- `docs/engineering/MIRROR_CHALLENGER.md`
- `docs/engineering/NPC_DATA.md`
- `docs/engineering/RAID_EVENTS.md`
- `docs/engineering/VILLAIN_CAMPAIGNS.md`
- `docs/gameplay/BATTLE.md`
- `docs/gameplay/COLLECTION.md`
- `docs/gameplay/CONTROLS.md`
- `docs/gameplay/EVENTS.md`
- `docs/gameplay/EVENT_CANDIDATES.md`
- `docs/gameplay/ITEMS.md`
- `docs/gameplay/NPC.md`
- `docs/gameplay/PROGRESSION.md`
- `docs/operations/DEPLOYMENT.md`
