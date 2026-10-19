# Raid 층 구간별 승률 측정 구현

기준 커밋 `93a372ba1bc219d8047c40355e7b583ebb767426`의 기존 Raid Simulator에 층 구간 선택과 별도 보고서를 추가했다. Raid와 플레이어의 밸런스·성장·정책·팀 데이터는 유지한다.

## 실행

```sh
npm run raid:simulate -- --floor-brackets
npm run raid:simulate -- --runs 500 --floor-brackets
npm run raid:simulate -- --runs 3 --floor-brackets --boss volcarona --workers 1 --out .data/raid-floor-smoke
```

구간 모드의 기본값은 보스×구간당 500전이다. 기존 전체 모드는 기본 1,000전과 기존 seed 생성 방식을 유지한다. 구간 모드의 기본 출력은 `artifacts/reports/raid-winrate-by-floor.*`이며 기존 `raid-winrate-simulation.*`을 출력 대상으로 지정하면 거부한다.

| 구간 | 범위 | 대표 층 | 보스별 500전 배분 |
|---|---|---|---|
| Early | 1~30 | 5 / 15 / 25 | 167 / 167 / 166 |
| Mid | 31~60 | 35 / 45 / 55 | 167 / 167 / 166 |
| Late | 61~80 | 65 / 75 | 250 / 250 |
| Endgame | 81~100 | 85 / 95 | 250 / 250 |

## 변경 파일

| 파일 | 역할 |
|---|---|
| `scripts/lib/raid-floor-brackets.ts` | 구간·대표 층 정의, Endgame 분석용 라벨 경계 |
| `scripts/lib/raid-floor-report.ts` | 구간별 승률·성장 차이·Phase·분기·팀·육성·아이템 집계와 별도 출력 |
| `scripts/lib/raid-simulation.ts` | 선택적 bracket, 표본 층 선택, 구간별 seed 도메인, 결과 행의 구간 표시 |
| `scripts/simulate-raids.ts` | CLI 플래그와 기본값, 보스별 네 구간 실행, 공용 worker runner, 기존 결과 보호 |
| `tests/raid-floor-simulation.test.ts` | 2종×4구간×3전 smoke, worker 결정성, 통계·자격·기존 모드 보존 |
| `.gitignore` | 새 요약 CSV 7종 보관 예외. 대용량 개별 전투 CSV는 로컬 결과물 |

`RaidSimulationPlayerPolicy`, `raid-simulation-pool.ts`, 기존 전체 보고서 생성기, `src/`의 모든 게임 코드는 수정하지 않았다. 새로운 공격·데미지 계산이나 다른 AI를 추가하지 않았다.

## 기존 모델을 유지한 해석

- Early 표본의 5층만 IV0/포인트0이고 15/25층은 IV15/포인트33이다. 따라서 Early 평균 자체가 모두 미육성 조건은 아니다.
- Mid는 IV15/포인트33, Late와 Endgame은 둘 다 IV25/포인트50이다. Endgame의 완성도를 높이려고 IV31/66포인트로 바꾸지 않았다. 두 구간의 차이는 플레이어 수치 성장보다 실제 보스 성장과 표본에 의해 달라진다.
- 기존 일반 수집 팀은 각 팀의 `minFloor`와 기존 progression BST 상한을 사용한다. Early 대표 층은 초기 팀 10개, Mid의 35/45층은 16개·55층은 20개, Late/Endgame은 모두 20개가 대상이다.
- 기본 룰 Lv50, 완전 회복, Serious 성격, 기존 합법 기본 기술·특성과 일반 아이템 가정을 그대로 사용한다. 실제 사용한 평균 IV·개체당 총 포인트·아이템·초기 팀/수집 팀 사용 비중은 결과 보고서에서 확인한다.
- 기존 전체 승률은 층 구간 비중이 30/30/20/20%인 다른 seed 표본이다. 이번 구간별 결과와의 차이를 동일 전투의 순수한 성장 효과로 해석하지 않는다. 보스의 육성도 실제 floor에 따라 성장한다.

## 결정성과 보호

구간 모드에서는 seed base 뒤에 `:bracket:early|mid|late|endgame`을 붙이고 기존 snapshot/battle/policy SHA-256 RNG를 재사용한다. 구간마다 index는 0부터 시작한다. 팀 seed에는 보스 ID를 넣지 않아 같은 구간/index는 보스 간 같은 팀과 층을 사용한다.

실행 전후 전체 `src/` 해시와 기존 `raid-winrate-simulation.*` 파일 해시를 검사한다. 기존 Overall manifest의 Raid 정의·팀 풀·게임 소스 해시도 현재 값과 대조해 서로 다른 밸런스 데이터를 비교하지 않도록 한다.

## 테스트

- 기존 Raid 이벤트·보상 폼·20종 명단·변신 회귀와 Simulator 검사: **114/114 통과**.
- 신규 smoke는 Volcarona/Kyurem × 4구간 × 3전이다. worker 1개와 2개 실행의 결과·프로토콜 해시와 CSV 8종이 일치한다. unit test에서 실제 40,000전은 실행하지 않는다.
- 기존 전체 모드의 Garchomp 첫 두 전투 프로토콜 해시가 과거 측정과 일치한다.
- bracket 범위, 층 균등 배분, 팀 minFloor, 구간별 전투 수, 승패·Phase·분기·팀 합계, Late/Endgame의 기존 육성값, CLI 기본값과 출력 보호를 검사한다.
- 별도로 합성 40,000행 보고서 부하 검사를 통과했다. 대량 IV/포인트 집계는 배열을 함수 인자로 펼치지 않고 reduce로 범위를 계산한다.
- TypeScript 및 `git diff --check` 통과. 기존 전체 결과와 플레이어 정책·팀 풀·게임 데이터의 기준 커밋 대비 diff가 없다.

## 실제 최종 측정

20종 × 4구간 × 500전 = **40,000전**을 실제 엔진으로 완료했다. 각 보스·구간 500전, 80개 집계, 중복 없는 전투 40,000행과 승패·Phase·분기·팀·층·실제 도달 Phase HP를 교차 검증했다. 실행 전후 기존 전체 결과 파일 8개와 게임 소스의 해시가 동일했다.

Endgame은 Hoopa 61.2%, Volcarona 56.4%, Diancie 44.2%이며 나머지 17종은 40% 미만이다. 80% 초과는 없다. Volcarona Endgame은 Slither Wing 72.20%, Iron Moth 39.42%로 차이는 32.78pp다.

Endgame에서 초기 팀 5,000회·수집 팀 5,000회(50:50), 20팀 모두 사용했다. IV25·포인트50·일반 아이템 3개라는 기존 모델을 유지했다. Late와 Endgame의 플레이어 육성 수치는 같으며, 현재 모델의 낮은 전체 승률을 초반 표본만의 영향으로 설명하기 어렵다. 실제 사람 승률이나 다른 육성·룰 조건에 대한 추정은 하지 않았다.

측정 결과와 개별 파일 검증은 [전체 보고서](../raid-winrate-by-floor.md), [상세 CSV](../raid-winrate-by-floor.csv), [Overall 비교 CSV](../raid-winrate-by-floor.comparison.csv), [manifest](../raid-winrate-by-floor.json), [최종 검증 기록](../raid-winrate-by-floor.validation.json)에 정리한다.

원시 로그: `.data/raid-floor-run.log`, `.data/raid-floor-tests.log`, `.data/raid-floor-final-tests.log`. Endgame 라벨과 이상치 표시는 분석용이며 등장층·등장 가중치·HP·보상 조정에는 사용하지 않는다.
