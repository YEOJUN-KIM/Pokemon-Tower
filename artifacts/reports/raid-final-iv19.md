# Raid final — Mewtwo / Zacian

1,000전: 두 보스 각 500전, 85/95층 각 250전. 동일 seed/player team/policy/AI. 결과를 보고 추가 조정하지 않았다.

## 승률

| Boss | Tune1 | Tune2 | Final |
| --- | --- | --- | --- |
| Mewtwo | 5.60% | 7.80% | 40.60% |
| Zacian | 13.60% | 20.40% | 23.60% |

Mewtwo는 Tune2 IV23/육성43%를 유지하고 3 Phase → 2 Phase(.5/.5)로 변경했다. P3 Aura/Rank/메시지만 제거했고 Mega 메시지는 유지한다. 공용 Aura 코드는 유지한다.

Zacian 실제 전투의 Intrepid Sword는 최초 등장 때 공격+1을 한 번 적용했다. Crowned 및 synthetic switch 후에도 누적+1이며 중복 강화는 없다. 특성/폼 전환 로직은 수정하지 않았다. 전투 Atk/Spe IV21 →19, elite 대비 포인트43% →34%로 한 번만 조정하고 HP/Def/SpD를 유지했다.

## Mewtwo branches

| Route | Runs | WR | Avg Turns |
| --- | --- | --- | --- |
| x | 249 | 40.96% | 5.49 |
| y | 251 | 40.24% | 4.96 |

## Phase loss

| Boss | Phase | Losses | Share of losses |
| --- | --- | --- | --- |
| Mewtwo | 1 | 46 | 15.49% |
| Mewtwo | 2 | 251 | 84.51% |
| Zacian | 1 | 86 | 22.51% |
| Zacian | 2 | 296 | 77.49% |

## Reward

모든 1,000개 보상 IV/포인트/성격/종이 Tune2와 동일하다. Mewtwo X: 6V/Jolly/Atk32 Spe32 HP2, Y: 6V/Timid/SpA32 Spe32 HP2. Zacian: 6V/Adamant/Atk32 Spe32 HP2. 기존 지급 구현은 수정하지 않았다.

## 보존 검증

- 다른18종 정의 전부 동일. Tune2 commit에서 공용 HP/clamp/변신/AI/player policy/team pool/보상/NPC/Shop 등 source 변경이 없는지 검사했다.
- 다른18종 전투는 요청대로 재실행하지 않았다. 동일 seed 9,000개 snapshot의 route/IV/포인트/reward/HP/분기 signature가 Tune2 row와 일치한다. 실제 SimulationRow 전체 hash의 재측정 비교는 하지 않았다.
- 이전 보고서를 덮어쓰지 않고 실행 전후 해시를 검증한다. 원시 battles.csv는 로컬 보존한다. npm run raid:simulate:final로 재실행한다.

## 종료 후보 판단

- Mewtwo >=25%: 충족. Zacian >=30%: 미충족.
- 기준 미달이어도 이번 작업에서 재조정하지 않는다. 추가 변경 여부는 사용자가 결정한다.
