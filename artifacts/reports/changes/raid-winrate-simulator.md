# Raid Winrate Simulator 구현·검증

기준 커밋 `955036ccc70aab737fd4a74bca6d57b201a095f9`의 Raid 20종을 측정한다. `src/`의 Raid 데이터, HP, 기술, 특성, 변신, AI, 등장 조건, 보상, 성장, 상점 코드는 수정하지 않았다.

## 실행

```sh
npm run raid:simulate -- --runs 1000
npm run raid:simulate -- --runs 10 --boss volcarona --workers 1 --out .data/raid-smoke
npm run raid:simulate -- --runs 100 --seed raid-winrate-v1 --workers 4 --out .data/raid-check
```

기본값은 등록 데이터 전체, 보스당 1,000전, seed base `raid-winrate-v1`, 최대 4개 worker다. `--boss`는 등록 ID 하나를 선택하며, `--out`은 확장자를 제외한 출력 경로다. 존재하지 않는 보스와 잘못된 옵션·횟수는 오류로 종료한다. 오류·무승부를 임의로 보스 승리로 세거나 표본에서 조용히 제외하지 않는다.

## 추가 파일

| 파일 | 역할 |
|---|---|
| `scripts/simulate-raids.ts` | CLI, 등록 보스 조회, worker 실행, 소스 보존 검사, manifest |
| `scripts/lib/raid-simulation.ts` | 실제 스냅샷·전투 실행, terminal HP 계측, 통계 |
| `scripts/lib/raid-simulation-player.ts` | 기존 CautiousSwitchingPolicy 기반의 제한된 일반 플레이어 모델 |
| `scripts/lib/raid-simulation-pool.ts` | 20개 일반 팀, 층별 육성·일반 아이템 가정 |
| `scripts/lib/raid-simulation-report.ts` | Markdown, 보스 요약·개별 전투·분기·Phase·팀 CSV, JSON |
| `tests/raid-simulation.test.ts` | 실제 smoke, 결정성·replay, 합계·파일 출력, 합법 팀과 HP 이벤트 검사 |

`package.json`에는 `raid:simulate` 명령만 추가했다. `.gitignore`에는 생성된 요약·branch·phase·team CSV의 보관 예외만 추가했다. 약 4MB의 개별 전투 CSV는 재현 가능한 로컬 결과물로 남긴다.

## 실제 게임과 연결

`createRaidSnapshot()`이 등록 데이터의 route/랜덤 Phase를 확정하고 `runBattle()`이 Raid Adapter·Showdown을 실행한다. 보스 AI는 현재 `createRaidBattle()`이 저장하는 `tower-policy-v10`에 대응하는 `ZMovePolicy`다. 상대에게 허용된 move/switch action 제한은 실제 `runBattle()`이 적용한다.

플레이어는 자신의 팀과 공개된 상대 정보만 받는다. 기존 공격·상성·상태·회복·강화 판단을 사용하고, 불리한 공개 상성이나 낮은 HP에서만 55% 확률로 기존 자발 교체 판단을 허용한다. 첫 멤버로 선발하며 상대 전용 카운터나 숨겨진 상대 세트를 읽지 않는다. 실제 기본 룰 Lv50를 사용한다.

팀은 초기 해금 10조합과 일반 수집 10조합이다. seed 기반 선택에는 보스 ID를 넣지 않아 동일 run index는 모든 보스에서 같은 층·팀을 사용한다. 수집 팀의 등장 시점은 기존 `towerDifficulty()`의 BST 상한을 확인한다. 육성·아이템·완전 회복 가정과 층별 표본은 [측정 보고서](../raid-winrate-simulation.md)에 공개한다. 이는 실제 유저 데이터를 이용해 보정한 사람 승률이나 실제 도전 빈도로 가중한 승률이 아니다.

각 전투는 `seed base : boss ID : zero-based run index : snapshot/battle/policy`를 SHA-256으로 해시해 독립적인 난수열을 사용한다. 같은 코드·엔진·설정·seed에서는 worker 수와 무관하게 같은 결과다. Phase 분기를 승리나 통계 집계에서 다시 추첨하지 않는다.

## 계측 정의

- 승리 시 Survivors와 Team HP는 전투 종료 이벤트까지 반영한다. HP% 분모에는 기절한 멤버를 포함한 3마리의 최대 HP 합을 사용한다.
- 실제 엔진은 마지막 보스 KO 후 반동으로 마지막 아군이 기절해도 Player 승리를 반환할 수 있다. Garchomp run index 312, seed `33625/61966/27702/58264`에서 Wave Crash 반동과 `win|Player`를 직접 확인했다. 이런 승리는 0 survivors로 기록하고 0/1/2/3 비중을 모두 표시한다.
- 패배 Phase는 마지막 보스 Phase, 보스 잔여 HP%는 그 Phase의 private HP다. 미진입 Phase까지 합한 남은 전체 보스 HP%와는 구분한다.
- Phase Loss Share 분모는 보스별 패배 수다. 전체 전투 대비 비중도 별도로 출력한다.
- 실제 HP 계산은 기존 `trainedStat()`과 `raidPhaseHP()`를 사용한다. 도달해 행동 요청이 나온 모든 Phase의 최대 HP를 실제 boss request와 대조하며 불일치 시 실패한다. 통계용 private HP는 플레이어 정책에 전달하지 않는다.
- Arceus는 타입별 등장 전투를 집계하므로 P2/P3의 타입 등장 합계가 2,000이다. 다른 보스의 상호 배타적인 route 합계는 1,000이다.

## 검증 결과

- 기존 Raid 이벤트·보상 폼·20종 명단·변신 회귀와 신규 시뮬레이터 테스트: **111/111 통과**.
- 단위 smoke: Volcarona 6전 두 번 실행의 결과·프로토콜 해시 일치, 실제 로그 replay 일치. 단위 테스트에서 1,000전 배치는 실행하지 않는다.
- 별도 전체 보스 smoke: 20종 × 10전. 단일 worker와 4 worker의 보스·개별 전투·branch·phase·team CSV 5종이 모두 바이트 단위로 일치했다.
- 본 측정: **20종 × 1,000전 = 20,000전** 실제 실행. 전투 행 수와 승패·Phase·route·Arceus 타입·팀·층별 합계를 교차 검증했다.
- 보고서에 0 survivors 승리를 명시한 뒤 동일 20,000전을 재실행했으며 개별 전투 CSV가 SHA-256까지 동일했다. 두 실행을 합쳐 2,000전 표본으로 해석하지 않고 보스별 최초 1,000개의 동일 seed 표본을 보고한다. 0 survivors 승리는 34건이었다.
- TypeScript 및 `git diff --check` 통과. 기준 커밋 대비 `src/` diff가 없고 실행 전후 전체 `src` 해시도 동일하다.

[전체 결과 Markdown](../raid-winrate-simulation.md), [보스별 CSV](../raid-winrate-simulation.csv), [재현 manifest와 세부 집계](../raid-winrate-simulation.json), [검증 기록](../raid-winrate-simulation.validation.json).

원시 실행 로그는 `.data/raid-winrate-run.log`, 회귀 로그는 `.data/raid-winrate-tests.log`에 보관한다. 극단적인 결과도 기록만 하며 이번 작업에는 승률을 목표값에 맞추는 수정이 없다.
