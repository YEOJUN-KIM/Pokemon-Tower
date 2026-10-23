# Raid 이벤트 개발

기준: 2026-10-20. 현재 보스는 **20종**, route별 2~4 phase를 사용한다. 초기 한카리아스/뮤츠 두 종의 구현 보고와 과거 튜닝 수치는 밸런스 보고서 (로컬 전용: `artifacts/experiments/balance/README.md`)에 분리했다.

## 설정과 처리 경로

| 위치 | 책임 |
|---|---|
| src/data/raids.ts | 이벤트 weight/최소 조건, 공통 타입, 기본 보스, 전체 raidBossDefinitions |
| src/data/raid-bosses.ts | 추가 보스·route·phase·영입 정책 |
| src/data/raid-training.ts | 현재 raidBattleTuning, IV·능력 포인트 프로필 |
| src/server/raid-events.ts | 등장 시 route·개체·팀·보상 snapshot과 battle 연결 |
| src/server/raid-phases.ts | 랜덤 phase 분기를 저장 전에 한 번 결정 |
| src/server/raid-training.ts | Raid 전용 능력 포인트 예산 계산 |
| src/server/raid-recruitment.ts | 기본 종/지정 phase의 영입 대상·폼 검증 |
| src/battle/raid.ts | Raid 설치와 기존 전투 경로 연결 |
| src/battle/raid-threshold.ts·raid-hp.ts | 현재 HP bar와 phase 경계·피해 제한 |
| src/battle/raid-transformation.ts | 폼·메가·원시·다이맥스·테라 등 실제 변신 |
| src/web/raid-scene.tsx·styles/raid.module.css | 장면·오라·phase 표시 |

일반 이벤트 전체 발생률 **20%·쿨다운 2**는 eventEncounterSettings가 담당한다. Raid 자체의 weight 20·minFloor 1·minRulesVersion 2는 raidEventSettings다. 각 보스/route의 weight와 최소 층은 별도다. 강제 Raid QA 설정은 없다.

## HP·변신·영입

현재 threshold-v1은 하나의 살아 있는 보스가 전체 HP bar를 소유하고 phase 경계에서 전환한다. 후속 슬롯은 빌드 템플릿이며 추가 목숨이 아니다. hpMode·raidHpMultiplier·hpRatio와 실제 변신 처리는 저장 snapshot을 따른다. 과거 replacement/unversioned 설치기는 기존 전투 재생용으로 유지한다.

보스별 분기는 정의의 routes/phases·transformation·randomBranch·recruitment로 표현한다. randomBranch는 snapshot 생성 시 고정하므로 재접속으로 다시 추첨하지 않는다. 전투의 특수 폼과 영입할 포켓몬은 별개다. baseSpecies 또는 phaseSpecies 정책을 검증해 수집 가능한 대상/폼으로 영입한다. 전투용 HP·육성을 영구 성장으로 복사하지 않는다.

이벤트는 같은 층의 추가 전투다. 영입·보상 확인 뒤 기존 일반층 흐름으로 돌아가며, 패배/재도전은 저장된 상대·보상·정책을 사용한다. 소유권·원자적 지급·영수증·중복 완료 방지는 공통 TowerStore 경로를 유지한다.

## 보스 추가와 검증

1. 기존 정의와 같은 RaidBossDefinition을 추가하고 전체 raidBossDefinitions에 연결한다. ID·분류·최소 층·weight·route·phase·영입 정책을 지정한다.
2. 기존 엔진이 지원하는 종·폼·특성·기술·변신을 사용하고 필요하면 raidBattleTuning에 현재 육성을 정의한다.
3. snapshot 시 분기 고정, phase HP 경계, 실제 변신 효과, 영입 대상과 재접속/재도전을 검사한다.
4. 새 저장 필드가 필요하면 기존 snapshot의 기본 처리와 DB 변경 필요성을 따로 검토한다. 이벤트 ID나 보스 추가만으로 schema version을 올리지 않는다.

주요 자동 검사는 tests/raid-events.test.ts·raid-threshold.test.ts·raid-final.test.ts·raid-floor-simulation.test.ts 및 raid 관련 테스트다. 실제 존재하는 목록은 tests/에서 확인한다. 자동 승률은 사람의 체감 난이도와 구별한다.

공용 측정은 pnpm raid:simulate, 층 구간 비교는 pnpm raid:simulate --floor-brackets를 사용한다. --runs·--workers·--boss·--out을 지정할 수 있다. 새 실험에는 --out artifacts/temporary/raid-새실험 처럼 별도 경로를 지정한다. 과거 단계별 stats/stats2/threshold/final 튜닝 명령은 삭제했다. 보관한 보고서의 source hash는 당시 측정값이며 현재 코드로 덮어쓰지 않는다.

[이벤트 추가](EVENT_SYSTEM.md) · [DB](DATABASE.md) · [공용 개발 도구](../../scripts/README.md)
