> 이 문서는 작성 당시의 결정·조사·검증 기록이다. 수치와 지원 범위는 현재 규칙이 아니다. 현재 기능은 [STATUS](../STATUS.md), 운영은 [배포 안내](../operations/DEPLOYMENT.md)를 따른다. 외부 링크의 조건을 이번 정리에서 새로 검증하지 않았다.

# 2026-10-18 중간점검

감사 기준 커밋: `296cbbb1`. 수정 전 작업 트리는 깨끗했다. 먼저 src 전체 244개 TS/TSX의 import 방향과 파일 책임, 최근 Git 이력, 이벤트/NPC 생성·저장 경로, 상점·재화·전투 버전·마이그레이션·테스트·기준 문서를 확인했다. 과거 리팩터링 보고는 Git history를 참고한다.

## Phase 1 분류 (구현 전)

| 분류 | 발견 사항 | 처리 기준 |
|---|---|---|
| A 지금 수정 | 전체 이벤트 확률 90% | `af9780ea`가 확인용 10→90 임시 변경을 명시. 10% 복구 |
| A 지금 수정 | 로켓단만 후보, 3층부터 강제 Raid | `c223d25a`, `c909a9b7`의 수동 QA 우회. 정상 선택 경로로 복구 |
| A 지금 수정 | `mysteryChest`가 전체 만남과 v1 상자 보상 설정을 함께 소유 | 전체 만남 설정과 상자 내부 설정 분리 |
| A 지금 수정 | NPC 단계/기믹 50·55·75·100 경계가 런타임·리뷰 도구에 반복 | 단계 담당 모듈에서 재사용, 경계 동작 보존 |
| A 지금 수정 | 6개 allFloors 후보 빌드 추가 후 옛 재생성/CSV가 고정 3마리·2단계 가정 | 후보 원본 보존과 runtime 일치 검증, 리뷰 출력 호환 보완 |
| A 지금 수정 | 기준 문서의 스키마 33/39/40·AI v10·옛 이벤트 제약 설명 | 현재 코드의 v45/v11·동적 이벤트 ID·snapshot 설명으로 갱신 |
| B 보류 | TowerStore 829줄, BattleGame 367줄, Pokedex 212줄 | 책임별 모듈이 이미 존재. 실제 추가 책임 없이 재분할하지 않음 |
| B 보류 | data→server type import 3개와 기존 합법 기술 조회 1개 | UI 역참조는 아님. 광범위 카탈로그 이동은 이번 작업에서 하지 않음 |
| B 보류 | 로켓단 weight=100, Raid 보스 minFloor=1 등 최초 임시 튜닝 | 이전 안정값·설계 근거가 없어 임의 복원 금지 |
| C 유지 | v1/v2 이벤트·NPC snapshot, AI v1~v11 복구 분기 | 저장된 팀·seed·보상·영수증과 버전 호환을 보존 |
| C 유지 | 공통 지갑/보상/인벤토리 지급 및 호출자 트랜잭션 | 원자성·소유권·중복 지급 방지를 바꾸지 않음 |
| C 유지 | 무료 리롤·종료된 영양제 가격 함수·분석 AI 정책 | 무료 리롤은 의도됨. 가격·정책은 과거 실험 도구가 참조하므로 dead code 아님 |
| C 유지 | 알 85/12/3%, 이로치 0.24%, Rank·층 육성 곡선 | 최근 이력에서 확인용 변경 근거 없음. 별도 밸런스 재설계 금지 |

전역 발생률 → 적격 이벤트 상대 weight → 내부 결과 weight를 구분한다. 0 weight 히든보스는 별도 강제 진행용이며 잘못된 극단값으로 취급하지 않는다. 이벤트 체크포인트 제외와 보상 지급은 각각 game 선택기와 서버 트랜잭션의 책임이다.

## 적용 결과와 근거

전체 구조는 게임/UI 경계·순수 규칙·호출자 트랜잭션·snapshot 호환이 이미 분리되어 있었다. 이번에는 새 엔진/대형 서비스 계층/전면 파일 재배치 없이 확인된 설정·생성 도구·문서 문제만 수정했다.

| 밸런스 항목 | 이전 상태 | 최종 상태 | Git 근거 |
|---|---|---|---|
| 전체 랜덤 이벤트 확률 | 90% | 10% | af9780eaad102f59fc12280993f87bee5be45324: “확인을 위해 이벤트발생확률을 10% -> 90%로 임의 수정함”; 이전 f7b5e35f의 10%와 기존 문서/경계 테스트 일치 |
| 로켓단 전용 후보 제한 | onlyVillainEvents=true | QA 설정·우회 코드 제거 | c223d25a59ca74a5f37e8fbc9354882bb345cae8에서 Temporary manual QA로 추가 |
| 3층부터 Raid 강제 출현 | enabled=true,startFloor=3 | QA 설정·우회 코드 제거 | c909a9b7ab6bb4514f05ddd1a8d00b9dc035e668에서 Temporary manual playtest override로 추가 |

쿨다운 2, 종류 weight, 내부 결과/보상, 알 85/12/3%·이로치 0.24%, Rank·육성·가격은 변경하지 않았다. 로켓단 단계 weight 100·Raid 보스 minFloor 1은 초기 튜닝이며 복구할 이전 정상값이 없으므로 후속 실측 대상으로 유지했다. 숨은 보스 weight 0은 챕터 완료용 확정 생성이므로 유지한다.

## 이벤트 변경

- `data/run-events.ts`: 전체 만남은 eventEncounterSettings, 기존 v1 상자 보상은 legacyChestRewards, v2 결과는 mysteryChestResults로 구분했다.
- `game/run-events.ts`: 전체 gate/쿨다운과 종류 선택의 기준이다. 5배수 제외는 이 경로에서 관리하고 서버의 중복 조건을 제거했다. 기존 난수 호출 순서·v1/v2 선택을 유지했다.
- `server/run-events.ts`, `data/raids.ts`, `data/villain-campaigns.ts`: 수동 QA 코드만 삭제했다. 서버는 정상 선택기와 조직/포탈 적격 조건을 사용하며 이미 발생한 이벤트·배틀·보상은 그대로 처리한다.
- 테스트는 라이브 registry의 일반 만남 복귀와 완료 캠페인 뒤 다른 이벤트의 정상 등장, 미발생 경계, 과거 보상과 저장 호환을 검증한다.

## NPC 변경

- `data/normal-mode-stages.ts`: normalNpcFloorRules와 normalNpcStageRange를 제공한다. 기존 50/55/75/100 의미·실제 경계값은 유지했다.
- `server/npc-templates.ts`, `data/villain-organizations.ts`: 빌런 보스 기준을 같은 설정에서 읽는다. runtime 팀/기술/IV/EV는 바꾸지 않았다.
- `scripts/lib/npc-runtime.mjs`, `export-normal-npc-runtime.mjs`: 검토 입력 projection과 무결성 검사, --check 비쓰기 검증을 추가했다. 현재 320개 runtime 행은 수정 전과 동일하다. 두 번 export한 SHA-256도 동일하다.
- `build-normal-npc-samples.ts`: 6종 allFloors 검토 입력을 재구성하지 못하는 옛 부트스트랩이 덮어쓰지 못하도록 쓰기 전 거부한다. 현재 입력을 옛 참조 데이터로 다시 만드는 시스템 재설계는 보류한다.
- `export-npc-review-csv.mjs`: 단일 5~6마리 후보·빈 에이스/기믹·참고 EV 예산을 지원한다. summary에 candidate_count/species_4~6을 추가한 schema v2(28열), details v2(31열)를 생성한다. 단계별 범위와 기믹 개방은 공통 설정을 참조한다.
- 기존 normal/reference CSV 4개만 재생성했다. normal 320행/977행, reference 164행/492행이며 모든 셀이 CSV 왕복 일치했다. 원본·runtime JSON은 새 팀으로 재작성하지 않았다.

## 기타 정리와 유지

실제 재화/보상/아이템 지급은 기존 player-wallet/rewards/inventory-grants와 호출자 트랜잭션을 유지했다. DB schema 45, 이벤트 v1/v2, NPC snapshot v1/v2, 이전 AI 버전을 변경하지 않았다. 실제 사용자 DB에는 접근하거나 마이그레이션을 실행하지 않았다.

`tests/npc-ai.test.ts`의 replay 비교만 기존 battleEvents 방식으로 바꿨다. 전체 기본 검사에서 게임 내용과 무관한 엔진 벽시계 |t:| 차이로 실패한 것이 근거다. 팀·행동·전투 내용·정책 동등성 검사는 그대로 유지했다.

TowerStore/BattleGame/Pokedex는 파일 크기로 나누지 않았다. data→server 타입/기술 조회, 공통 카탈로그·폼 처리, 과거 API 재수출, 무료 리롤·판매 종료 영양제 가격·AI 분석/시뮬레이션은 실제 참조가 있어 유지했다. 삭제한 dead code는 수동 QA 상수·분기뿐이다.

## 최종 검증

| 실제 실행 | 결과 |
|---|---|
| 수정 전 pnpm test | 757개 중 756 통과; npc-ai의 벽시계 비교 1개 실패 |
| 최종 pnpm test | 761/761 통과 (약 172초) |
| pnpm typecheck | 통과 |
| pnpm build | 통과; Windows junction 권한으로 승인된 프로세스 사용 |
| pnpm check:css | 통과; 3578개 bounded rule, 14개 token |
| pnpm check:workspace | 통과; 문서 링크·출력 위치 검사 |
| node scripts/export-normal-npc-runtime.mjs --check | 320개 검토 원본/runtime 일치 |
| runtime export 두 번 + SHA-256 비교 | 두 번 모두 수정 전 runtime과 동일 |
| 옛 단계 bootstrap 실행 | 의도된 allFloors 보호 오류로 종료, 입력 해시 보존 |
| node scripts/export-npc-review-csv.mjs normal-npc-samples.json normal-npc | 320/977행, 전체 셀 왕복 검증 통과 |
| node scripts/export-npc-review-csv.mjs | 164/492행, 전체 셀 왕복 검증 통과 |

관련 E2E 실제 명령:

```sh
node --import tsx node_modules/@playwright/test/cli.js test e2e/run-events.spec.ts e2e/villain-campaign.spec.ts e2e/teleport.spec.ts e2e/named-pilot.spec.ts --grep 'Rocket chain|teleport portal|canonical named entry and reload 1280|mystery chest open|breeder-gift decline at 390|traveling-merchant .*390'
```

17/17 통과. PC/모바일 상자·브리더/상인·포탈 1/4배속·동작 감소·거절, 로켓단 진행/복구/레이아웃, 대표 네임드 3종/새로고침을 확인했다. 전체 E2E 모음을 실행했다고 주장하지 않는다. 자동 완료 fixture는 실제 전투를 통한 사람의 난이도 검증과 구분한다.

현재 문서의 명시된 src/scripts/tests/e2e 경로를 확인했고, DB 45·AI v11을 코드와 대조했다. 문서·생성 도구의 새 이름에서 제거한 mysteryChest.encounterPercent/QA 상수를 현재 설정으로 안내하는 참조도 정리했다.

## 수정 문서와 이후 변경 기준

| 문서 | 갱신 내용 |
|---|---|
| STATUS / current/ROADMAP | 현재 이벤트/NPC/배낭·DB/AI 상태, 구현된 후속 콘텐츠와 남은 튜닝 |
| engineering/ARCHITECTURE | data/game/battle/server/shared/web·scripts/artifacts 책임, 주요 설정 source of truth |
| engineering/DATABASE | schema 45·migration·각 규칙 버전 구분·snapshot/영수증 보존 |
| engineering/EVENT_SYSTEM | 전체 발생/종류/내부 결과 분리, 새 ID/outcome/보상 추가 절차와 검사 |
| engineering/NPC_DATA | 현재 검토 입력→export→runtime 경로, stage/기믹/전설/Rank/AI 기준, CSV v2와 안전한 생성 명령 |
| SESSION_HANDOFF | 실제 지원 버전·실행 저장 경계·기준 문서 연결 |
| gameplay/EVENTS / NPC / named-trainer-sample-pilot | 정상 등장 규칙·캠페인·현재 320행 후보 구조·수정/검증 경로 |
| engineering/RAID_EVENTS, rocket-campaign-implementation, teleport-event-implementation, hidden-boss-events | 폐기된 QA 안내 제거·정상/확정 이벤트 구분 |
| operations/DEPLOYMENT | 옛 v33 패키지 설명을 현재 schema 45·최신 빌드/백업 기준으로 교체 |
| scripts/README, artifacts/reports/npc/README | 현재 export/check·CSV 명령과 옛 비교 표의 범위 명시 |

전체 확률/쿨다운은 eventEncounterSettings, 종류 weight는 registry/각 data 모듈, 상자 결과는 legacyChestRewards/mysteryChestResults에서 수정한다. NPC 팀은 검토 원본 normal-npc-samples.json, 단계/기믹 층은 normal-mode-stages.ts, 일반 전설/환상 풀은 tower-progression.ts, Rank/AI는 npc-ranks.ts/npc-ai.ts를 따른다. 명령과 자동 검증 범위는 NPC_DATA/EVENT_SYSTEM에서 유지한다. 작은 변경마다 새 기준 문서를 만들지 않는다.
