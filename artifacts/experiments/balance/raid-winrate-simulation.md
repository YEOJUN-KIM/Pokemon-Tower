# Raid Winrate Simulation — current data, no tuning

실제 Battle/Raid 엔진으로 **20,000전**을 완료했다. 기준 커밋: `955036ccc70aab737fd4a74bca6d57b201a095f9`. 아래 값은 명시한 팀·육성·행동 가정의 자동 정책 승률이며, 실측 사람 승률이 아니다. 80%/70%/60% 목표로 보스를 재분류하거나 데이터를 조정하지 않았다.

## 재현 조건

- 기본 실행: `npm run raid:simulate -- --runs 1000`. 빠른 확인: `--runs 10 --boss garchomp --workers 1 --out .data/raid-smoke`.
- Seed base: `raid-winrate-v1`. SHA-256(seed base + boss ID + zero-based run index + domain)의 앞 8바이트를 4개 UInt16 seed로 사용한다. snapshot/battle/policy RNG를 분리한다. 팀 RNG에는 boss ID를 넣지 않아 보스 간 같은 index의 floor/team을 짝지었다.
- 목록은 `raidBossDefinitions`에서 읽는다. 실제 `createRaidSnapshot()`의 가중 route/Phase 추첨, IV/성격/이로치, 실제 `runBattle()`과 Raid Adapter를 재사용한다. 보스는 현재 서버의 `tower-policy-v10`과 동일한 `ZMovePolicy`. 보스 Policy 입력에 대한 변경은 없다.
- Player는 `CautiousSwitchingPolicy`를 얇게 감싼 `RaidSimulationPlayerPolicy`. 기존 공격/상성/회복/상태/강화/강제 교체 판단을 재사용한다. 불리한 공개 타입 또는 HP 30% 미만일 때 55%의 결정 확률로 기존 자발 교체 판단을 허용한다. 기존 정책의 교체 상한·쿨다운·교체 이득 조건도 유지한다. 완벽한 예측이나 상대의 비공개 기술·특성·IV·미래 Phase를 읽지 않는다.
- 1차 기준은 실제 기본 룰 `basic`, 양측 Lv50, Tera ticket 0, player run bonus/소모품/트레이너 장비 없음. 보스의 강제 Mega/Primal/G-Max/Stellar/Ultra 등은 룰과 별개로 실제 Raid 엔진 그대로 발동한다. 플레이어 기믹이 없는 기본 룰의 결과이므로 다른 룰로 일반화하지 않는다. 정책은 합법 기믹 action을 기존 구현대로 처리할 수 있다.
- 층은 5/15/25/35/45/55/65/75/85/95를 순환하는 동일 표본. 각 보스의 minFloor를 확인한다. 실제 유저의 층별 생존/도전 선택률로 가중한 분포가 아니다. 모든 전투는 3마리 완전 회복 상태로 시작한다.
- 20개 일반 팀 중 eligible 팀을 seed로 균등 선택한다. 처음 10개는 실제 초기 해금 `initialPartners` 기반이며, 나머지 10개는 일반 수집 가능 종 조합이다. 수집 팀은 현행 `towerDifficulty().bstCeiling`이 팀 최대 BST를 허용하는 층 이후부터 사용한다. 보스별 카운터 구성이나 상대 기반 선발 최적화는 없다. 첫 멤버로 고정 선발한다.
- 육성 가정: floor<=10 IV0/포인트0, 11..60 IV15/포인트33, 61..100 IV25/포인트50. 기존 balance simulation의 fresh/mid/trained 개념을 사용한 가정이며 유저 데이터로 보정된 평균은 아니다. 성격 Serious, 기존 defaultProfile의 합법 기본 기술·특성·주 타입 Tera, 공격48%/스피드32%/나머지HP 배분. 종별 공격 성향만 반영한다. 15층부터 첫 멤버 Sitrus Berry, 50층부터 두 번째 Muscle Band/Wise Glasses·세 번째 Leftovers를 보유했다고 가정한다. 상점/성장 경제를 시뮬레이션하거나 수정하지 않는다.
- 보상 스냅샷 생성을 위해 worker당 메모리 DB/run 하나만 초기화한다. 매 전투 UI/서버/DB 전투 생성·승리·영입 처리는 실행하지 않는다. 난수 추첨과 보상 정책 코드는 원본을 사용한다.
- Source SHA-256: `0c39645a19405fe64c9e8ad11899376d8ef204bfa8943a278850b050994762b0`. 보호 대상 전체 src와 manifest의 파일 해시, 엔진 버전, 풀/정책 해시를 JSON에 기록했다. 실행 전후 src 해시가 같아야 보고서를 쓴다. worker 수가 seed나 출력 순서에 영향을 주지 않는다.

## 결과 — 승률 낮은 순

| Rank | Boss | Runs | Player Wins | Win Rate | Avg Turns | Avg Survivors | Avg HP Left | Effective HP |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Mewtwo | 1000 | 0 | 0.00% | 5.89 | N/A | N/A | 562.20 |
| 2 | Rayquaza | 1000 | 0 | 0.00% | 4.01 | N/A | N/A | 484.60 |
| 3 | Groudon | 1000 | 1 | 0.10% | 4.24 | 1.00 | 0.18% | 471.80 |
| 4 | Zamazenta | 1000 | 4 | 0.40% | 4.79 | 1.50 | 21.24% | 433.80 |
| 5 | Zygarde | 1000 | 4 | 0.40% | 7.79 | 1.25 | 26.95% | 782.20 |
| 6 | Arceus | 1000 | 5 | 0.50% | 6.07 | 1.20 | 13.58% | 604.20 |
| 7 | Zacian | 1000 | 6 | 0.60% | 4.26 | 1.83 | 35.98% | 433.80 |
| 8 | Snorlax | 1000 | 7 | 0.70% | 6.20 | 1.00 | 23.66% | 860.30 |
| 9 | Kyogre | 1000 | 8 | 0.80% | 4.14 | 1.50 | 48.46% | 471.80 |
| 10 | Terapagos | 1000 | 15 | 1.50% | 5.59 | 1.00 | 3.83% | 575.90 |
| 11 | Kyurem | 1000 | 29 | 2.90% | 5.55 | 1.28 | 20.26% | 516.20 |
| 12 | Necrozma | 1000 | 37 | 3.70% | 6.22 | 1.05 | 13.65% | 535.20 |
| 13 | Ogerpon | 1000 | 68 | 6.80% | 6.67 | 1.00 | 11.12% | 451.60 |
| 14 | Garchomp | 1000 | 70 | 7.00% | 5.13 | 1.14 | 20.92% | 370.52 |
| 15 | Shaymin | 1000 | 133 | 13.30% | 5.83 | 1.90 | 41.56% | 362.80 |
| 16 | Metagross | 1000 | 226 | 22.60% | 6.08 | 1.63 | 33.44% | 354.70 |
| 17 | Palafin | 1000 | 337 | 33.70% | 5.01 | 1.21 | 22.51% | 362.80 |
| 18 | Diancie | 1000 | 422 | 42.20% | 5.25 | 1.82 | 41.07% | 289.50 |
| 19 | Hoopa | 1000 | 428 | 42.80% | 4.67 | 1.77 | 42.11% | 354.70 |
| 20 | Volcarona | 1000 | 439 | 43.90% | 5.10 | 1.73 | 43.05% | 363.63 |

## 결과 — 승률 높은 순

| Rank | Boss | Runs | Player Wins | Win Rate | Avg Turns | Avg Survivors | Avg HP Left | Effective HP |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Volcarona | 1000 | 439 | 43.90% | 5.10 | 1.73 | 43.05% | 363.63 |
| 2 | Hoopa | 1000 | 428 | 42.80% | 4.67 | 1.77 | 42.11% | 354.70 |
| 3 | Diancie | 1000 | 422 | 42.20% | 5.25 | 1.82 | 41.07% | 289.50 |
| 4 | Palafin | 1000 | 337 | 33.70% | 5.01 | 1.21 | 22.51% | 362.80 |
| 5 | Metagross | 1000 | 226 | 22.60% | 6.08 | 1.63 | 33.44% | 354.70 |
| 6 | Shaymin | 1000 | 133 | 13.30% | 5.83 | 1.90 | 41.56% | 362.80 |
| 7 | Garchomp | 1000 | 70 | 7.00% | 5.13 | 1.14 | 20.92% | 370.52 |
| 8 | Ogerpon | 1000 | 68 | 6.80% | 6.67 | 1.00 | 11.12% | 451.60 |
| 9 | Necrozma | 1000 | 37 | 3.70% | 6.22 | 1.05 | 13.65% | 535.20 |
| 10 | Kyurem | 1000 | 29 | 2.90% | 5.55 | 1.28 | 20.26% | 516.20 |
| 11 | Terapagos | 1000 | 15 | 1.50% | 5.59 | 1.00 | 3.83% | 575.90 |
| 12 | Kyogre | 1000 | 8 | 0.80% | 4.14 | 1.50 | 48.46% | 471.80 |
| 13 | Snorlax | 1000 | 7 | 0.70% | 6.20 | 1.00 | 23.66% | 860.30 |
| 14 | Zacian | 1000 | 6 | 0.60% | 4.26 | 1.83 | 35.98% | 433.80 |
| 15 | Arceus | 1000 | 5 | 0.50% | 6.07 | 1.20 | 13.58% | 604.20 |
| 16 | Zygarde | 1000 | 4 | 0.40% | 7.79 | 1.25 | 26.95% | 782.20 |
| 17 | Zamazenta | 1000 | 4 | 0.40% | 4.79 | 1.50 | 21.24% | 433.80 |
| 18 | Groudon | 1000 | 1 | 0.10% | 4.24 | 1.00 | 0.18% | 471.80 |
| 19 | Rayquaza | 1000 | 0 | 0.00% | 4.01 | N/A | N/A | 484.60 |
| 20 | Mewtwo | 1000 | 0 | 0.00% | 5.89 | N/A | N/A | 562.20 |

## 전투 길이 및 승리/패배 상태

Survivors/HP Left는 Player 승리 표본만의 통계다. Team HP%는 기절한 멤버도 분모에 넣은 전체 3마리 현재 HP 합 / 최대 HP 합이다. Boss Phase HP%는 패배 시 현재 Phase의 잔여 HP이며 후속 미진입 Phase는 포함하지 않는다. 승리 표본이 없으면 N/A다. 운영 로그의 % 반올림 대신 각 side의 실제 private HP 이벤트를 분석하되 정책에는 상대 private 정보가 전달되지 않는다. 마지막 보스를 쓰러뜨리고 반동으로 마지막 아군도 기절하면 실제 엔진이 Player 승리로 판정할 수 있어 0 survivor 승리도 그대로 집계한다.

| Boss | Boss Wins | Median Turns | Min | Max | Median HP Left | 0 survivors | 1 survivor | 2 survivors | 3 survivors | Boss Phase HP on loss |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Garchomp | 930 | 5.00 | 3 | 8 | 29.96% | 12.86% | 60.00% | 27.14% | 0.00% | 62.68% |
| Mewtwo | 1000 | 6.00 | 3 | 10 | N/A | N/A | N/A | N/A | N/A | 65.54% |
| Metagross | 774 | 6.00 | 2 | 11 | 32.44% | 0.00% | 47.35% | 42.48% | 10.18% | 55.38% |
| Palafin | 663 | 5.00 | 2 | 11 | 12.31% | 0.00% | 80.71% | 17.21% | 2.08% | 38.45% |
| Snorlax | 993 | 6.00 | 4 | 21 | 30.14% | 0.00% | 100.00% | 0.00% | 0.00% | 57.90% |
| Hoopa | 572 | 5.00 | 3 | 8 | 36.20% | 0.93% | 36.45% | 46.96% | 15.65% | 50.20% |
| Shaymin | 867 | 6.00 | 3 | 13 | 34.75% | 1.50% | 21.05% | 63.16% | 14.29% | 66.66% |
| Volcarona | 561 | 5.00 | 2 | 14 | 36.52% | 2.51% | 45.79% | 27.56% | 24.15% | 62.53% |
| Ogerpon | 932 | 7.00 | 3 | 12 | 7.52% | 5.88% | 88.24% | 5.88% | 0.00% | 65.70% |
| Diancie | 578 | 5.00 | 2 | 11 | 41.19% | 0.71% | 20.14% | 75.83% | 3.32% | 75.32% |
| Groudon | 999 | 4.00 | 3 | 9 | 0.18% | 0.00% | 100.00% | 0.00% | 0.00% | 67.26% |
| Kyogre | 992 | 4.00 | 3 | 11 | 47.68% | 0.00% | 50.00% | 50.00% | 0.00% | 52.66% |
| Rayquaza | 1000 | 4.00 | 3 | 8 | N/A | N/A | N/A | N/A | N/A | 60.78% |
| Arceus | 995 | 6.00 | 3 | 11 | 7.66% | 0.00% | 80.00% | 20.00% | 0.00% | 58.91% |
| Kyurem | 971 | 5.00 | 3 | 9 | 11.22% | 3.45% | 65.52% | 31.03% | 0.00% | 53.76% |
| Zygarde | 996 | 8.00 | 4 | 13 | 20.76% | 0.00% | 75.00% | 25.00% | 0.00% | 59.05% |
| Necrozma | 963 | 6.00 | 3 | 11 | 12.16% | 0.00% | 94.59% | 5.41% | 0.00% | 56.90% |
| Zacian | 994 | 4.00 | 3 | 8 | 35.83% | 0.00% | 16.67% | 83.33% | 0.00% | 61.70% |
| Zamazenta | 996 | 5.00 | 3 | 8 | 24.90% | 0.00% | 50.00% | 50.00% | 0.00% | 70.50% |
| Terapagos | 985 | 6.00 | 3 | 10 | 3.52% | 0.00% | 100.00% | 0.00% | 0.00% | 58.36% |

## Branch 결과

Route 표는 상호 배타적이며 합계가 보스 전투 수와 같다. Arceus의 `appeared` 표는 P2/P3 중 해당 타입이 나타난 전투 집합이며 한 전투가 두 타입 집계에 들어간다. type appearance 합계는 보스 전투 수의 두 배다. 표본 100 미만은 참고용으로 표시한다.

| Boss | Branch | Runs | Player Win Rate | Avg Turns | Sample |
| --- | --- | --- | --- | --- | --- |
| Mewtwo | x | 514 | 0.00% | 6.55 | 100+ |
| Mewtwo | y | 486 | 0.00% | 5.21 | 100+ |
| Volcarona | iron-moth | 503 | 28.03% | 4.85 | 100+ |
| Volcarona | slither-wing | 497 | 59.96% | 5.35 | 100+ |
| Arceus | Arceus-Bug appeared | 131 | 1.53% | 6.09 | 100+ |
| Arceus | Arceus-Dark appeared | 107 | 0.93% | 6.08 | 100+ |
| Arceus | Arceus-Dragon appeared | 108 | 0.00% | 5.81 | 100+ |
| Arceus | Arceus-Electric appeared | 133 | 0.00% | 6.23 | 100+ |
| Arceus | Arceus-Fairy appeared | 127 | 0.00% | 6.08 | 100+ |
| Arceus | Arceus-Fighting appeared | 117 | 0.00% | 6.19 | 100+ |
| Arceus | Arceus-Fire appeared | 133 | 0.00% | 6.13 | 100+ |
| Arceus | Arceus-Flying appeared | 110 | 0.00% | 5.94 | 100+ |
| Arceus | Arceus-Ghost appeared | 120 | 0.00% | 6.10 | 100+ |
| Arceus | Arceus-Grass appeared | 118 | 1.69% | 5.97 | 100+ |
| Arceus | Arceus-Ground appeared | 117 | 1.71% | 6.03 | 100+ |
| Arceus | Arceus-Ice appeared | 101 | 0.99% | 5.99 | 100+ |
| Arceus | Arceus-Poison appeared | 119 | 0.00% | 5.95 | 100+ |
| Arceus | Arceus-Psychic appeared | 118 | 0.85% | 6.23 | 100+ |
| Arceus | Arceus-Rock appeared | 97 | 0.00% | 5.97 | 참고용 (<100) |
| Arceus | Arceus-Steel appeared | 136 | 0.74% | 6.24 | 100+ |
| Arceus | Arceus-Water appeared | 108 | 0.00% | 5.97 | 100+ |
| Kyurem | black | 501 | 3.79% | 5.89 | 100+ |
| Kyurem | white | 499 | 2.00% | 5.22 | 100+ |
| Necrozma | dawn-wings | 488 | 3.69% | 6.24 | 100+ |
| Necrozma | dusk-mane | 512 | 3.71% | 6.21 | 100+ |

## Phase Death

Loss Share의 분모는 해당 보스에 대한 전체 Player 패배 수다. All Battles의 분모는 보스 전체 전투 수다. 최대 손실 비중은 그 Phase에 도달한 표본의 조건부 패배 확률과 다르다.

| Boss | Phase | Player Losses | Loss Share | All Battles |
| --- | --- | --- | --- | --- |
| Garchomp | 1 | 319 | 34.30% | 31.90% |
| Garchomp | 2 | 611 | 65.70% | 61.10% |
| Mewtwo | 1 | 423 | 42.30% | 42.30% |
| Mewtwo | 2 | 533 | 53.30% | 53.30% |
| Mewtwo | 3 | 44 | 4.40% | 4.40% |
| Metagross | 1 | 154 | 19.90% | 15.40% |
| Metagross | 2 | 620 | 80.10% | 62.00% |
| Palafin | 1 | 10 | 1.51% | 1.00% |
| Palafin | 2 | 653 | 98.49% | 65.30% |
| Snorlax | 1 | 69 | 6.95% | 6.90% |
| Snorlax | 2 | 924 | 93.05% | 92.40% |
| Hoopa | 1 | 35 | 6.12% | 3.50% |
| Hoopa | 2 | 537 | 93.88% | 53.70% |
| Shaymin | 1 | 244 | 28.14% | 24.40% |
| Shaymin | 2 | 623 | 71.86% | 62.30% |
| Volcarona | 1 | 245 | 43.67% | 24.50% |
| Volcarona | 2 | 316 | 56.33% | 31.60% |
| Ogerpon | 1 | 93 | 9.98% | 9.30% |
| Ogerpon | 2 | 261 | 28.00% | 26.10% |
| Ogerpon | 3 | 487 | 52.25% | 48.70% |
| Ogerpon | 4 | 91 | 9.76% | 9.10% |
| Diancie | 1 | 65 | 11.25% | 6.50% |
| Diancie | 2 | 513 | 88.75% | 51.30% |
| Groudon | 1 | 611 | 61.16% | 61.10% |
| Groudon | 2 | 388 | 38.84% | 38.80% |
| Kyogre | 1 | 822 | 82.86% | 82.20% |
| Kyogre | 2 | 170 | 17.14% | 17.00% |
| Rayquaza | 1 | 753 | 75.30% | 75.30% |
| Rayquaza | 2 | 247 | 24.70% | 24.70% |
| Arceus | 1 | 452 | 45.43% | 45.20% |
| Arceus | 2 | 517 | 51.96% | 51.70% |
| Arceus | 3 | 26 | 2.61% | 2.60% |
| Kyurem | 1 | 565 | 58.19% | 56.50% |
| Kyurem | 2 | 406 | 41.81% | 40.60% |
| Zygarde | 1 | 65 | 6.53% | 6.50% |
| Zygarde | 2 | 702 | 70.48% | 70.20% |
| Zygarde | 3 | 229 | 22.99% | 22.90% |
| Necrozma | 1 | 208 | 21.60% | 20.80% |
| Necrozma | 2 | 535 | 55.56% | 53.50% |
| Necrozma | 3 | 220 | 22.85% | 22.00% |
| Zacian | 1 | 844 | 84.91% | 84.40% |
| Zacian | 2 | 150 | 15.09% | 15.00% |
| Zamazenta | 1 | 496 | 49.80% | 49.60% |
| Zamazenta | 2 | 500 | 50.20% | 50.00% |
| Terapagos | 1 | 658 | 66.80% | 65.80% |
| Terapagos | 2 | 327 | 33.20% | 32.70% |

## Effective HP

모든 수치는 해당 보스의 실행 스냅샷 평균이며 괄호는 최소..최대다. Phase HP는 현행 trainedStat + raidPhaseHP 함수를 사용하며 G-Max의 native 2배를 반영한다. 실제 도달한 모든 Phase의 boss private request max HP와 매 전투 대조해 불일치 시 실행을 중단한다. 미도달 Phase도 저장된 폼의 정상 HP로 계산해 Total Effective HP에 포함한다. Effective multiplier는 각 전투 Total / 같은 IV·포인트의 기본종 Normal HP 비율의 평균이다. 회복기·방어 특성·상성·랭크의 간접 효과는 HP 합에 포함하지 않는다.

| Boss | Configured | Actual Phase Max HP (mean [min..max]) | Total Effective HP | Base Normal HP | Effective Multiplier |
| --- | --- | --- | --- | --- | --- |
| Garchomp | 2 | P1: 185.26 [172..191]<br>P2: 185.26 [172..191] | 370.52 | 185.26 | 2.00x |
| Mewtwo | 3 | P1: 187.40 [185..189]<br>P2: 187.40 [185..189]<br>P3: 187.40 [185..189] | 562.20 | 187.40 | 3.00x |
| Metagross | 2.2 | P1: 195.30 [192..197]<br>P2: 159.40 [157..161] | 354.70 | 161.40 | 2.20x |
| Palafin | 2 | P1: 145.10 [143..146]<br>P2: 217.70 [215..220] | 362.80 | 181.40 | 2.00x |
| Snorlax | 2.3 | P1: 249.70 [247..252]<br>P2: 610.60 [604..614] | 860.30 | 241.40 | 3.56x |
| Hoopa | 2.2 | P1: 159.40 [157..161]<br>P2: 195.30 [192..197] | 354.70 | 161.40 | 2.20x |
| Shaymin | 2 | P1: 181.40 [179..183]<br>P2: 181.40 [179..183] | 362.80 | 181.40 | 2.00x |
| Volcarona | 2.2 | P1: 183.30 [180..185]<br>P2: 180.33 [175..185] | 363.63 | 166.40 | 2.19x |
| Ogerpon | 2.8 | P1: 112.90 [111..114]<br>P2: 112.90 [111..114]<br>P3: 112.90 [111..114]<br>P4: 112.90 [111..114] | 451.60 | 161.40 | 2.80x |
| Diancie | 2.2 | P1: 159.10 [156..161]<br>P2: 130.40 [128..132] | 289.50 | 131.40 | 2.20x |
| Groudon | 2.6 | P1: 235.90 [233..238]<br>P2: 235.90 [233..238] | 471.80 | 181.40 | 2.60x |
| Kyogre | 2.6 | P1: 235.90 [233..238]<br>P2: 235.90 [233..238] | 471.80 | 181.40 | 2.60x |
| Rayquaza | 2.6 | P1: 242.30 [239..244]<br>P2: 242.30 [239..244] | 484.60 | 186.40 | 2.60x |
| Arceus | 3 | P1: 205.40 [203..207]<br>P2: 199.40 [197..201]<br>P3: 199.40 [197..201] | 604.20 | 201.40 | 3.00x |
| Kyurem | 2.5 | P1: 258.10 [255..260]<br>P2: 258.10 [255..260] | 516.20 | 206.40 | 2.50x |
| Zygarde | 3 | P1: 193.40 [191..195]<br>P2: 294.40 [292..296]<br>P3: 294.40 [292..296] | 782.20 | 189.40 | 4.13x |
| Necrozma | 3 | P1: 182.40 [180..184]<br>P2: 176.40 [174..178]<br>P3: 176.40 [174..178] | 535.20 | 178.40 | 3.00x |
| Zacian | 2.5 | P1: 216.90 [214..219]<br>P2: 216.90 [214..219] | 433.80 | 173.40 | 2.50x |
| Zamazenta | 2.5 | P1: 216.90 [214..219]<br>P2: 216.90 [214..219] | 433.80 | 173.40 | 2.50x |
| Terapagos | 2.8 | P1: 271.80 [268..274]<br>P2: 304.10 [301..306] | 575.90 | 171.40 | 3.36x |

## Player team 사용 통계

| Team ID | Pokémon | Min Floor | Uses | Win Rate |
| --- | --- | --- | --- | --- |
| starter-1 | Charizard / Blastoise / Venusaur | 2 | 1280 | 8.20% |
| starter-2 | Meganium / Typhlosion / Feraligatr | 2 | 1100 | 12.27% |
| starter-3 | Sceptile / Blaziken / Swampert | 2 | 1320 | 7.65% |
| starter-4 | Torterra / Infernape / Empoleon | 2 | 1620 | 9.20% |
| starter-5 | Serperior / Emboar / Samurott | 2 | 1440 | 9.93% |
| starter-6 | Chesnaught / Delphox / Greninja | 2 | 1320 | 8.86% |
| starter-7 | Decidueye / Incineroar / Primarina | 2 | 1160 | 11.03% |
| starter-8 | Rillaboom / Cinderace / Inteleon | 2 | 1440 | 24.72% |
| starter-9 | Meowscarada / Skeledirge / Quaquaval | 2 | 1440 | 11.32% |
| starter-10 | Charizard / Feraligatr / Sceptile | 2 | 1560 | 14.55% |
| collected-1 | Pikachu / Gyarados / Alakazam | 27 | 720 | 4.17% |
| collected-2 | Arcanine / Lapras / Golem | 33 | 740 | 13.38% |
| collected-3 | Gengar / Snorlax / Scizor | 27 | 840 | 8.81% |
| collected-4 | Jolteon / Dragonite / Lucario | 50 | 400 | 10.50% |
| collected-5 | Garchomp / Gardevoir / Blastoise | 50 | 500 | 17.20% |
| collected-6 | Tyranitar / Venusaur / Metagross | 50 | 560 | 10.00% |
| collected-7 | Lucario / Lapras / Arcanine | 33 | 680 | 6.47% |
| collected-8 | Scizor / Gengar / Gyarados | 27 | 640 | 15.16% |
| collected-9 | Snorlax / Alakazam / Jolteon | 27 | 740 | 1.62% |
| collected-10 | Dragonite / Golem / Gardevoir | 50 | 500 | 15.00% |

## 층별 결과

| Floor | Runs | Player Win Rate | Avg Turns |
| --- | --- | --- | --- |
| 5 | 2000 | 2.85% | 4.85 |
| 15 | 2000 | 11.50% | 5.37 |
| 25 | 2000 | 11.30% | 5.36 |
| 35 | 2000 | 10.20% | 5.38 |
| 45 | 2000 | 8.90% | 5.39 |
| 55 | 2000 | 9.00% | 5.37 |
| 65 | 2000 | 15.80% | 5.69 |
| 75 | 2000 | 13.55% | 5.66 |
| 85 | 2000 | 13.95% | 5.57 |
| 95 | 2000 | 14.90% | 5.62 |

## 이상치 — 기록만, 밸런스 변경 없음

- Garchomp: Player WR 7.00%.
- Mewtwo: Player WR 0.00%.
- Metagross: Player WR 22.60%.
- Metagross: P2 accounts for 80.10% of player losses (620/774).
- Palafin: Player WR 33.70%.
- Palafin: P2 accounts for 98.49% of player losses (653/663).
- Snorlax: Player WR 0.70%.
- Snorlax: P2 accounts for 93.05% of player losses (924/993).
- Hoopa: P2 accounts for 93.88% of player losses (537/572).
- Shaymin: Player WR 13.30%.
- Shaymin: P2 accounts for 71.86% of player losses (623/867).
- Volcarona: route WR gap 31.93 percentage points.
- Ogerpon: Player WR 6.80%.
- Diancie: P2 accounts for 88.75% of player losses (513/578).
- Groudon: Player WR 0.10%.
- Kyogre: Player WR 0.80%.
- Kyogre: P1 accounts for 82.86% of player losses (822/992).
- Rayquaza: Player WR 0.00%.
- Rayquaza: P1 accounts for 75.30% of player losses (753/1000).
- Arceus: Player WR 0.50%.
- Kyurem: Player WR 2.90%.
- Zygarde: Player WR 0.40%.
- Zygarde: P2 accounts for 70.48% of player losses (702/996).
- Necrozma: Player WR 3.70%.
- Zacian: Player WR 0.60%.
- Zacian: P1 accounts for 84.91% of player losses (844/994).
- Zamazenta: Player WR 0.40%.
- Terapagos: Player WR 1.50%.

## 파일과 검증

- `.csv`: 보스별 전체 요약. `.battles.csv`: 전투별 seed·팀·층·route·Phase·잔여 전력·HP·프로토콜 해시. `.branches.csv`, `.phases.csv`, `.teams.csv`: 세부 집계. `.json`: 재현 manifest와 모든 집계.
- 일반 단위 테스트는 1 boss × 6 runs를 두 번 실행해 결과 및 프로토콜 해시, Phase 합계와 branch 합계, 실제 전투/replay 일치를 검사한다. 20,000전은 CLI에서 별도로 실행한다.
