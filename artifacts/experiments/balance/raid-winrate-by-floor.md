# Raid Winrate by Floor — unchanged model and data

기준 커밋 `93a372ba1bc219d8047c40355e7b583ebb767426`, **40,000전**. 보스별 구간당 500전이며 Endgame 승률 낮은 순으로 정렬했다. 기존 [전체 승률](raid-winrate-simulation.md) 파일을 보존하고 읽기 전용 비교 기준으로 사용한다.

## 실행과 보존

- `npm run raid:simulate -- --floor-brackets` (기본 구간당 500전). 명시 실행: `npm run raid:simulate -- --runs 500 --floor-brackets`. 빠른 실행은 `--runs 3 --boss volcarona --workers 1 --out .data/raid-floor-smoke`를 추가한다.
- 실제 runBattle / Raid snapshot / 변신 Adapter / 보스 ZMovePolicy / Player policy / 팀 풀 / 층별 육성·아이템 가정을 재사용한다. src의 전투·Raid·성장·상점·보상 데이터와 기존 정책·팀 풀 파일은 수정하지 않았다.
- Seed base `raid-winrate-v1`에 `:bracket:early|mid|late|endgame` 도메인을 붙인 뒤 기존 SHA-256 seed 생성기를 사용한다. 구간별 index는 0부터 시작한다. 같은 index의 팀/층은 보스 간 짝지으며, worker 수가 결과에 영향을 주지 않는다. 기존 전체 모드의 seed는 그대로 유지한다.
- Early 1..30: 5/15/25, Mid 31..60: 35/45/55, Late 61..80: 65/75, Endgame 81..100: 85/95. 구간 내 순환 배분으로 보스당 3개 층은 167/167/166전, 2개 층은 250/250전(500전 기준)이다. 팀과 보스의 minFloor를 모두 확인한다.
- 기존 Overall은 30% Early + 30% Mid + 20% Late + 20% Endgame의 1,000전 결과다. 이번 값은 각 구간 독립 seed의 500전 결과다. Difference는 정책 표본의 차이이며 동일 전투의 짝 비교나 인간 승률의 인과 추정이 아니다. 보스 육성도 실제 floor에 따라 함께 변한다.
- 기존 모델에서 Early의 5층은 IV0/0포인트, 15/25층은 IV15/33포인트다. Mid는 IV15/33포인트, Late와 Endgame은 모두 IV25/50포인트다. Endgame을 완벽 IV31/66포인트로 바꾸지 않았다. 따라서 Late→Endgame은 플레이어 육성 수치 자체가 증가하지 않으며, 보스 성장과 표본 차이가 반영된다.
- 기본 룰 Lv50, 3마리 완전 회복, 성격 Serious, 기본 합법 기술·특성, 기존 일반 아이템 가정. 포인트는 현재 게임의 stat points로 보고하며 카트리지 EV로 오인하지 않는다. 상대 비공개 정보를 Player에게 전달하지 않는다.

## 핵심표 — Endgame 낮은 순

| Boss | Overall WR | Early | Mid | Late | Endgame | End−Early (pp) |
| --- | --- | --- | --- | --- | --- | --- |
| Mewtwo | 0.00% | 0.00% | 0.00% | 0.00% | 0.00% | 0.00 |
| Rayquaza | 0.00% | 0.00% | 0.00% | 0.00% | 0.00% | 0.00 |
| Arceus | 0.50% | 0.00% | 0.00% | 2.40% | 0.40% | 0.40 |
| Zacian | 0.60% | 0.20% | 0.20% | 0.40% | 0.40% | 0.20 |
| Kyogre | 0.80% | 0.80% | 1.20% | 0.20% | 0.60% | -0.20 |
| Groudon | 0.10% | 0.00% | 0.40% | 1.20% | 1.00% | 1.00 |
| Zamazenta | 0.40% | 0.20% | 0.80% | 1.80% | 1.20% | 1.00 |
| Snorlax | 0.70% | 0.20% | 0.40% | 2.00% | 1.40% | 1.20 |
| Zygarde | 0.40% | 0.00% | 0.00% | 1.20% | 1.40% | 1.40 |
| Terapagos | 1.50% | 0.40% | 0.20% | 4.40% | 3.40% | 3.00 |
| Kyurem | 2.90% | 0.60% | 1.00% | 5.60% | 6.40% | 5.80 |
| Ogerpon | 6.80% | 4.00% | 2.60% | 10.60% | 7.80% | 3.80 |
| Necrozma | 3.70% | 0.00% | 0.40% | 9.20% | 9.20% | 9.20 |
| Garchomp | 7.00% | 4.40% | 3.60% | 14.80% | 11.20% | 6.80 |
| Shaymin | 13.30% | 12.80% | 9.00% | 19.00% | 16.80% | 4.00 |
| Metagross | 22.60% | 19.20% | 19.40% | 32.80% | 26.80% | 7.60 |
| Palafin | 33.70% | 27.80% | 28.20% | 46.40% | 38.00% | 10.20 |
| Diancie | 42.20% | 49.40% | 36.40% | 42.60% | 44.20% | -5.20 |
| Volcarona | 43.90% | 30.60% | 35.80% | 55.20% | 56.40% | 25.80 |
| Hoopa | 42.80% | 22.00% | 33.40% | 66.00% | 61.20% | 39.20 |

## Endgame 상태와 Effective HP

생존·잔여 HP는 승리 표본만의 평균이다. 잔여 HP는 기절 멤버를 포함한 팀 전체 현재 HP 합/최대 HP 합이다. 반동 동시 기절 후 엔진 Player 승리는 생존 0으로 기록한다. 승리 표본이 없으면 N/A다. HP는 기존 Effective HP 계산과 실제 request 대조를 그대로 사용한다. 표의 HP는 Endgame 평균이다.

| Boss | Endgame WR | Avg Turns | Avg Survivors | Avg HP Left | Effective HP | Configured HP x | Effective HP x | 분석용 상태 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Mewtwo | 0.00% | 6.09 | N/A | N/A | 567.00 | 3 | 3.00 | 너무 강함 |
| Rayquaza | 0.00% | 4.24 | N/A | N/A | 488.00 | 2.6 | 2.60 | 너무 강함 |
| Arceus | 0.40% | 6.35 | 1.00 | 8.23% | 609.00 | 3 | 3.00 | 너무 강함 |
| Zacian | 0.40% | 4.27 | 2.00 | 37.20% | 438.00 | 2.5 | 2.50 | 너무 강함 |
| Kyogre | 0.60% | 4.34 | 1.67 | 48.04% | 476.00 | 2.6 | 2.60 | 너무 강함 |
| Groudon | 1.00% | 4.46 | 2.00 | 38.72% | 476.00 | 2.6 | 2.60 | 너무 강함 |
| Zamazenta | 1.20% | 4.95 | 1.50 | 21.77% | 438.00 | 2.5 | 2.50 | 너무 강함 |
| Snorlax | 1.40% | 6.33 | 1.00 | 28.72% | 866.00 | 2.3 | 3.56 | 너무 강함 |
| Zygarde | 1.40% | 7.94 | 1.00 | 21.84% | 787.00 | 3 | 4.12 | 너무 강함 |
| Terapagos | 3.40% | 5.76 | 1.00 | 4.07% | 580.00 | 2.8 | 3.35 | 너무 강함 |
| Kyurem | 6.40% | 5.84 | 1.25 | 21.19% | 520.00 | 2.5 | 2.50 | 너무 강함 |
| Ogerpon | 7.80% | 6.63 | 1.00 | 11.55% | 456.00 | 2.8 | 2.80 | 너무 강함 |
| Necrozma | 9.20% | 6.94 | 1.17 | 17.86% | 540.00 | 3 | 3.00 | 너무 강함 |
| Garchomp | 11.20% | 5.16 | 1.38 | 24.71% | 374.48 | 2 | 2.00 | 너무 강함 |
| Shaymin | 16.80% | 6.13 | 1.90 | 41.75% | 366.00 | 2 | 2.00 | 너무 강함 |
| Metagross | 26.80% | 6.17 | 1.69 | 36.55% | 358.00 | 2.2 | 2.20 | 너무 강함 |
| Palafin | 38.00% | 5.09 | 1.26 | 26.65% | 366.00 | 2 | 2.00 | 너무 강함 |
| Diancie | 44.20% | 5.62 | 1.86 | 41.78% | 293.00 | 2.2 | 2.20 | 적당히 어려움 |
| Volcarona | 56.40% | 5.18 | 1.78 | 44.17% | 367.11 | 2.2 | 2.19 | 적당히 어려움 |
| Hoopa | 61.20% | 4.60 | 1.97 | 48.49% | 358.00 | 2.2 | 2.20 | 적당히 어려움 |

## 기존 전체 결과와 비교

| Boss | Overall WR | Endgame WR | Difference (pp) |
| --- | --- | --- | --- |
| Mewtwo | 0.00% | 0.00% | 0.00 |
| Rayquaza | 0.00% | 0.00% | 0.00 |
| Arceus | 0.50% | 0.40% | -0.10 |
| Zacian | 0.60% | 0.40% | -0.20 |
| Kyogre | 0.80% | 0.60% | -0.20 |
| Groudon | 0.10% | 1.00% | 0.90 |
| Zamazenta | 0.40% | 1.20% | 0.80 |
| Snorlax | 0.70% | 1.40% | 0.70 |
| Zygarde | 0.40% | 1.40% | 1.00 |
| Terapagos | 1.50% | 3.40% | 1.90 |
| Kyurem | 2.90% | 6.40% | 3.50 |
| Ogerpon | 6.80% | 7.80% | 1.00 |
| Necrozma | 3.70% | 9.20% | 5.50 |
| Garchomp | 7.00% | 11.20% | 4.20 |
| Shaymin | 13.30% | 16.80% | 3.50 |
| Metagross | 22.60% | 26.80% | 4.20 |
| Palafin | 33.70% | 38.00% | 4.30 |
| Diancie | 42.20% | 44.20% | 2.00 |
| Volcarona | 43.90% | 56.40% | 12.50 |
| Hoopa | 42.80% | 61.20% | 18.40 |

## 구간별 상세 결과

| Boss | Bracket | Runs | Wins | Win Rate | Avg Turns | Avg Survivors | Avg HP Left |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Garchomp | early | 500 | 22 | 4.40% | 5.08 | 0.73 | 11.87% |
| Garchomp | mid | 500 | 18 | 3.60% | 5.10 | 0.67 | 12.62% |
| Garchomp | late | 500 | 74 | 14.80% | 5.14 | 1.49 | 28.44% |
| Garchomp | endgame | 500 | 56 | 11.20% | 5.16 | 1.38 | 24.71% |
| Mewtwo | early | 500 | 0 | 0.00% | 5.58 | N/A | N/A |
| Mewtwo | mid | 500 | 0 | 0.00% | 6.00 | N/A | N/A |
| Mewtwo | late | 500 | 0 | 0.00% | 6.11 | N/A | N/A |
| Mewtwo | endgame | 500 | 0 | 0.00% | 6.09 | N/A | N/A |
| Metagross | early | 500 | 96 | 19.20% | 6.02 | 1.80 | 35.14% |
| Metagross | mid | 500 | 97 | 19.40% | 6.16 | 1.65 | 31.67% |
| Metagross | late | 500 | 164 | 32.80% | 6.23 | 1.64 | 35.31% |
| Metagross | endgame | 500 | 134 | 26.80% | 6.17 | 1.69 | 36.55% |
| Palafin | early | 500 | 139 | 27.80% | 4.64 | 1.35 | 24.30% |
| Palafin | mid | 500 | 141 | 28.20% | 5.20 | 1.22 | 22.63% |
| Palafin | late | 500 | 232 | 46.40% | 5.03 | 1.31 | 28.45% |
| Palafin | endgame | 500 | 190 | 38.00% | 5.09 | 1.26 | 26.65% |
| Snorlax | early | 500 | 1 | 0.20% | 5.84 | 1.00 | 36.55% |
| Snorlax | mid | 500 | 2 | 0.40% | 6.25 | 1.00 | 13.94% |
| Snorlax | late | 500 | 10 | 2.00% | 6.51 | 1.00 | 23.77% |
| Snorlax | endgame | 500 | 7 | 1.40% | 6.33 | 1.00 | 28.72% |
| Hoopa | early | 500 | 110 | 22.00% | 4.86 | 1.39 | 26.54% |
| Hoopa | mid | 500 | 167 | 33.40% | 4.75 | 1.66 | 38.40% |
| Hoopa | late | 500 | 330 | 66.00% | 4.43 | 1.93 | 50.96% |
| Hoopa | endgame | 500 | 306 | 61.20% | 4.60 | 1.97 | 48.49% |
| Shaymin | early | 500 | 64 | 12.80% | 5.55 | 1.66 | 35.56% |
| Shaymin | mid | 500 | 45 | 9.00% | 5.88 | 1.73 | 36.10% |
| Shaymin | late | 500 | 95 | 19.00% | 6.08 | 1.85 | 39.19% |
| Shaymin | endgame | 500 | 84 | 16.80% | 6.13 | 1.90 | 41.75% |
| Volcarona | early | 500 | 153 | 30.60% | 4.76 | 1.56 | 38.96% |
| Volcarona | mid | 500 | 179 | 35.80% | 5.35 | 1.68 | 40.70% |
| Volcarona | late | 500 | 276 | 55.20% | 5.12 | 1.85 | 45.96% |
| Volcarona | endgame | 500 | 282 | 56.40% | 5.18 | 1.78 | 44.17% |
| Ogerpon | early | 500 | 20 | 4.00% | 6.92 | 0.95 | 9.14% |
| Ogerpon | mid | 500 | 13 | 2.60% | 6.44 | 1.15 | 16.44% |
| Ogerpon | late | 500 | 53 | 10.60% | 6.71 | 0.96 | 10.74% |
| Ogerpon | endgame | 500 | 39 | 7.80% | 6.63 | 1.00 | 11.55% |
| Diancie | early | 500 | 247 | 49.40% | 4.67 | 1.83 | 41.40% |
| Diancie | mid | 500 | 182 | 36.40% | 5.20 | 1.84 | 40.98% |
| Diancie | late | 500 | 213 | 42.60% | 5.59 | 1.77 | 42.11% |
| Diancie | endgame | 500 | 221 | 44.20% | 5.62 | 1.86 | 41.78% |
| Groudon | early | 500 | 0 | 0.00% | 3.90 | N/A | N/A |
| Groudon | mid | 500 | 2 | 0.40% | 4.17 | 2.00 | 65.82% |
| Groudon | late | 500 | 6 | 1.20% | 4.46 | 1.50 | 41.68% |
| Groudon | endgame | 500 | 5 | 1.00% | 4.46 | 2.00 | 38.72% |
| Kyogre | early | 500 | 4 | 0.80% | 3.84 | 2.00 | 62.65% |
| Kyogre | mid | 500 | 6 | 1.20% | 4.11 | 2.33 | 67.96% |
| Kyogre | late | 500 | 1 | 0.20% | 4.30 | 1.00 | 32.20% |
| Kyogre | endgame | 500 | 3 | 0.60% | 4.34 | 1.67 | 48.04% |
| Rayquaza | early | 500 | 0 | 0.00% | 3.59 | N/A | N/A |
| Rayquaza | mid | 500 | 0 | 0.00% | 4.01 | N/A | N/A |
| Rayquaza | late | 500 | 0 | 0.00% | 4.28 | N/A | N/A |
| Rayquaza | endgame | 500 | 0 | 0.00% | 4.24 | N/A | N/A |
| Arceus | early | 500 | 0 | 0.00% | 5.51 | N/A | N/A |
| Arceus | mid | 500 | 0 | 0.00% | 6.04 | N/A | N/A |
| Arceus | late | 500 | 12 | 2.40% | 6.58 | 1.08 | 16.11% |
| Arceus | endgame | 500 | 2 | 0.40% | 6.35 | 1.00 | 8.23% |
| Kyurem | early | 500 | 3 | 0.60% | 5.04 | 1.33 | 34.85% |
| Kyurem | mid | 500 | 5 | 1.00% | 5.65 | 1.00 | 18.61% |
| Kyurem | late | 500 | 28 | 5.60% | 5.81 | 1.18 | 18.57% |
| Kyurem | endgame | 500 | 32 | 6.40% | 5.84 | 1.25 | 21.19% |
| Zygarde | early | 500 | 0 | 0.00% | 7.63 | N/A | N/A |
| Zygarde | mid | 500 | 0 | 0.00% | 7.63 | N/A | N/A |
| Zygarde | late | 500 | 6 | 1.20% | 7.98 | 1.33 | 30.27% |
| Zygarde | endgame | 500 | 7 | 1.40% | 7.94 | 1.00 | 21.84% |
| Necrozma | early | 500 | 0 | 0.00% | 5.68 | N/A | N/A |
| Necrozma | mid | 500 | 2 | 0.40% | 6.20 | 1.00 | 4.40% |
| Necrozma | late | 500 | 46 | 9.20% | 6.86 | 1.22 | 19.90% |
| Necrozma | endgame | 500 | 46 | 9.20% | 6.94 | 1.17 | 17.86% |
| Zacian | early | 500 | 1 | 0.20% | 4.12 | 2.00 | 34.32% |
| Zacian | mid | 500 | 1 | 0.20% | 4.29 | 2.00 | 37.29% |
| Zacian | late | 500 | 2 | 0.40% | 4.37 | 2.00 | 37.40% |
| Zacian | endgame | 500 | 2 | 0.40% | 4.27 | 2.00 | 37.20% |
| Zamazenta | early | 500 | 1 | 0.20% | 4.64 | 2.00 | 33.05% |
| Zamazenta | mid | 500 | 4 | 0.80% | 4.79 | 1.50 | 21.40% |
| Zamazenta | late | 500 | 9 | 1.80% | 5.08 | 1.78 | 29.36% |
| Zamazenta | endgame | 500 | 6 | 1.20% | 4.95 | 1.50 | 21.77% |
| Terapagos | early | 500 | 2 | 0.40% | 5.44 | 1.00 | 2.44% |
| Terapagos | mid | 500 | 1 | 0.20% | 5.64 | 1.00 | 0.21% |
| Terapagos | late | 500 | 22 | 4.40% | 5.75 | 1.00 | 4.81% |
| Terapagos | endgame | 500 | 17 | 3.40% | 5.76 | 1.00 | 4.07% |

## 실제 플레이어 강도와 아이템

IV는 사용 개체의 6개 능력 평균, 포인트는 개체당 총 배분량 평균이다. 아이템 표본 수는 전체 전투에서 보유한 개수이며 소모 후 남은 개수가 아니다. 동일 팀 선택 seed를 보스 간 공유하므로 사용 횟수를 독립적인 사람/팀 표본 수로 해석하지 않는다.

| Bracket | Avg IV [range] | Avg Points [range] | Avg held/team | Items (held count) | Eligible teams by floor | Used teams | Starter / Collected |
| --- | --- | --- | --- | --- | --- | --- | --- |
| early | 9.99 [0..15] | 21.98 [0..33] | 0.67 | Sitrus Berry: 6660 | 5: 10 / 15: 10 / 25: 10 | 10 | 10000 / 0 (starter 100.00%) |
| mid | 15.00 [15..15] | 33.00 [33..33] | 1.66 | Sitrus Berry: 10000<br>Muscle Band: 1820<br>Leftovers: 3320<br>Wise Glasses: 1500 | 35: 16 / 45: 16 / 55: 20 | 20 | 5880 / 4120 (starter 58.80%) |
| late | 25.00 [25..25] | 50.00 [50..50] | 3.00 | Sitrus Berry: 10000<br>Muscle Band: 6160<br>Leftovers: 10000<br>Wise Glasses: 3840 | 65: 20 / 75: 20 | 20 | 4960 / 5040 (starter 49.60%) |
| endgame | 25.00 [25..25] | 50.00 [50..50] | 3.00 | Sitrus Berry: 10000<br>Muscle Band: 6020<br>Leftovers: 10000<br>Wise Glasses: 3980 | 85: 20 / 95: 20 | 20 | 5000 / 5000 (starter 50.00%) |

## 실제 사용 팀

| Bracket | Team | Pokémon | Uses | Win Rate |
| --- | --- | --- | --- | --- |
| early | starter-1 | Charizard / Blastoise / Venusaur | 900 | 5.11% |
| early | starter-2 | Meganium / Typhlosion / Feraligatr | 1080 | 9.35% |
| early | starter-3 | Sceptile / Blaziken / Swampert | 1000 | 5.80% |
| early | starter-4 | Torterra / Infernape / Empoleon | 1260 | 6.27% |
| early | starter-5 | Serperior / Emboar / Samurott | 920 | 7.17% |
| early | starter-6 | Chesnaught / Delphox / Greninja | 1140 | 6.23% |
| early | starter-7 | Decidueye / Incineroar / Primarina | 980 | 8.88% |
| early | starter-8 | Rillaboom / Cinderace / Inteleon | 940 | 21.49% |
| early | starter-9 | Meowscarada / Skeledirge / Quaquaval | 960 | 7.50% |
| early | starter-10 | Charizard / Feraligatr / Sceptile | 820 | 9.88% |
| early | collected-1 | Pikachu / Gyarados / Alakazam | 0 | N/A |
| early | collected-2 | Arcanine / Lapras / Golem | 0 | N/A |
| early | collected-3 | Gengar / Snorlax / Scizor | 0 | N/A |
| early | collected-4 | Jolteon / Dragonite / Lucario | 0 | N/A |
| early | collected-5 | Garchomp / Gardevoir / Blastoise | 0 | N/A |
| early | collected-6 | Tyranitar / Venusaur / Metagross | 0 | N/A |
| early | collected-7 | Lucario / Lapras / Arcanine | 0 | N/A |
| early | collected-8 | Scizor / Gengar / Gyarados | 0 | N/A |
| early | collected-9 | Snorlax / Alakazam / Jolteon | 0 | N/A |
| early | collected-10 | Dragonite / Golem / Gardevoir | 0 | N/A |
| mid | starter-1 | Charizard / Blastoise / Venusaur | 580 | 5.17% |
| mid | starter-2 | Meganium / Typhlosion / Feraligatr | 700 | 11.29% |
| mid | starter-3 | Sceptile / Blaziken / Swampert | 460 | 6.09% |
| mid | starter-4 | Torterra / Infernape / Empoleon | 800 | 8.50% |
| mid | starter-5 | Serperior / Emboar / Samurott | 580 | 9.48% |
| mid | starter-6 | Chesnaught / Delphox / Greninja | 620 | 8.55% |
| mid | starter-7 | Decidueye / Incineroar / Primarina | 540 | 9.07% |
| mid | starter-8 | Rillaboom / Cinderace / Inteleon | 480 | 28.96% |
| mid | starter-9 | Meowscarada / Skeledirge / Quaquaval | 520 | 7.69% |
| mid | starter-10 | Charizard / Feraligatr / Sceptile | 600 | 10.50% |
| mid | collected-1 | Pikachu / Gyarados / Alakazam | 620 | 3.55% |
| mid | collected-2 | Arcanine / Lapras / Golem | 380 | 10.53% |
| mid | collected-3 | Gengar / Snorlax / Scizor | 560 | 8.21% |
| mid | collected-4 | Jolteon / Dragonite / Lucario | 140 | 7.86% |
| mid | collected-5 | Garchomp / Gardevoir / Blastoise | 240 | 10.83% |
| mid | collected-6 | Tyranitar / Venusaur / Metagross | 180 | 6.11% |
| mid | collected-7 | Lucario / Lapras / Arcanine | 500 | 7.00% |
| mid | collected-8 | Scizor / Gengar / Gyarados | 700 | 6.57% |
| mid | collected-9 | Snorlax / Alakazam / Jolteon | 640 | 0.47% |
| mid | collected-10 | Dragonite / Golem / Gardevoir | 160 | 13.13% |
| late | starter-1 | Charizard / Blastoise / Venusaur | 460 | 14.35% |
| late | starter-2 | Meganium / Typhlosion / Feraligatr | 280 | 20.00% |
| late | starter-3 | Sceptile / Blaziken / Swampert | 500 | 10.60% |
| late | starter-4 | Torterra / Infernape / Empoleon | 520 | 11.54% |
| late | starter-5 | Serperior / Emboar / Samurott | 440 | 12.27% |
| late | starter-6 | Chesnaught / Delphox / Greninja | 560 | 18.04% |
| late | starter-7 | Decidueye / Incineroar / Primarina | 440 | 20.91% |
| late | starter-8 | Rillaboom / Cinderace / Inteleon | 580 | 35.69% |
| late | starter-9 | Meowscarada / Skeledirge / Quaquaval | 560 | 18.39% |
| late | starter-10 | Charizard / Feraligatr / Sceptile | 620 | 26.13% |
| late | collected-1 | Pikachu / Gyarados / Alakazam | 520 | 6.35% |
| late | collected-2 | Arcanine / Lapras / Golem | 680 | 14.26% |
| late | collected-3 | Gengar / Snorlax / Scizor | 440 | 11.36% |
| late | collected-4 | Jolteon / Dragonite / Lucario | 440 | 10.23% |
| late | collected-5 | Garchomp / Gardevoir / Blastoise | 460 | 17.39% |
| late | collected-6 | Tyranitar / Venusaur / Metagross | 520 | 10.77% |
| late | collected-7 | Lucario / Lapras / Arcanine | 380 | 8.42% |
| late | collected-8 | Scizor / Gengar / Gyarados | 500 | 23.80% |
| late | collected-9 | Snorlax / Alakazam / Jolteon | 500 | 1.80% |
| late | collected-10 | Dragonite / Golem / Gardevoir | 600 | 17.33% |
| endgame | starter-1 | Charizard / Blastoise / Venusaur | 360 | 11.39% |
| endgame | starter-2 | Meganium / Typhlosion / Feraligatr | 500 | 20.40% |
| endgame | starter-3 | Sceptile / Blaziken / Swampert | 480 | 11.25% |
| endgame | starter-4 | Torterra / Infernape / Empoleon | 620 | 11.77% |
| endgame | starter-5 | Serperior / Emboar / Samurott | 680 | 13.38% |
| endgame | starter-6 | Chesnaught / Delphox / Greninja | 420 | 17.14% |
| endgame | starter-7 | Decidueye / Incineroar / Primarina | 500 | 16.60% |
| endgame | starter-8 | Rillaboom / Cinderace / Inteleon | 440 | 36.59% |
| endgame | starter-9 | Meowscarada / Skeledirge / Quaquaval | 380 | 16.58% |
| endgame | starter-10 | Charizard / Feraligatr / Sceptile | 620 | 22.10% |
| endgame | collected-1 | Pikachu / Gyarados / Alakazam | 480 | 6.46% |
| endgame | collected-2 | Arcanine / Lapras / Golem | 480 | 14.58% |
| endgame | collected-3 | Gengar / Snorlax / Scizor | 260 | 10.00% |
| endgame | collected-4 | Jolteon / Dragonite / Lucario | 500 | 11.20% |
| endgame | collected-5 | Garchomp / Gardevoir / Blastoise | 560 | 18.57% |
| endgame | collected-6 | Tyranitar / Venusaur / Metagross | 560 | 9.29% |
| endgame | collected-7 | Lucario / Lapras / Arcanine | 380 | 7.63% |
| endgame | collected-8 | Scizor / Gengar / Gyarados | 380 | 22.37% |
| endgame | collected-9 | Snorlax / Alakazam / Jolteon | 820 | 2.07% |
| endgame | collected-10 | Dragonite / Golem / Gardevoir | 580 | 15.86% |

## 층별 분포

| Bracket | Floor | Battles | Win Rate |
| --- | --- | --- | --- |
| early | 5 | 3340 | 3.23% |
| early | 15 | 3340 | 11.50% |
| early | 25 | 3320 | 11.17% |
| mid | 35 | 3340 | 8.32% |
| mid | 45 | 3340 | 8.68% |
| mid | 55 | 3320 | 8.95% |
| late | 65 | 5000 | 15.54% |
| late | 75 | 5000 | 16.04% |
| endgame | 85 | 5000 | 14.00% |
| endgame | 95 | 5000 | 14.78% |

## Endgame Phase Loss

Loss Share 분모는 해당 보스·구간의 Player 패배 수다. All Battles는 구간 전체 전투 대비 비중이다. 이는 그 Phase에 진입한 전투의 조건부 패배 확률과 다르다.

| Boss | Phase | Player Losses | Loss Share | All Battles |
| --- | --- | --- | --- | --- |
| Garchomp | 1 | 122 | 27.48% | 24.40% |
| Garchomp | 2 | 322 | 72.52% | 64.40% |
| Mewtwo | 1 | 175 | 35.00% | 35.00% |
| Mewtwo | 2 | 300 | 60.00% | 60.00% |
| Mewtwo | 3 | 25 | 5.00% | 5.00% |
| Metagross | 1 | 63 | 17.21% | 12.60% |
| Metagross | 2 | 303 | 82.79% | 60.60% |
| Palafin | 1 | 6 | 1.94% | 1.20% |
| Palafin | 2 | 304 | 98.06% | 60.80% |
| Snorlax | 1 | 43 | 8.72% | 8.60% |
| Snorlax | 2 | 450 | 91.28% | 90.00% |
| Hoopa | 1 | 2 | 1.03% | 0.40% |
| Hoopa | 2 | 192 | 98.97% | 38.40% |
| Shaymin | 1 | 95 | 22.84% | 19.00% |
| Shaymin | 2 | 321 | 77.16% | 64.20% |
| Volcarona | 1 | 82 | 37.61% | 16.40% |
| Volcarona | 2 | 136 | 62.39% | 27.20% |
| Ogerpon | 1 | 70 | 15.18% | 14.00% |
| Ogerpon | 2 | 80 | 17.35% | 16.00% |
| Ogerpon | 3 | 258 | 55.97% | 51.60% |
| Ogerpon | 4 | 53 | 11.50% | 10.60% |
| Diancie | 1 | 23 | 8.24% | 4.60% |
| Diancie | 2 | 256 | 91.76% | 51.20% |
| Groudon | 1 | 294 | 59.39% | 58.80% |
| Groudon | 2 | 201 | 40.61% | 40.20% |
| Kyogre | 1 | 373 | 75.05% | 74.60% |
| Kyogre | 2 | 124 | 24.95% | 24.80% |
| Rayquaza | 1 | 311 | 62.20% | 62.20% |
| Rayquaza | 2 | 189 | 37.80% | 37.80% |
| Arceus | 1 | 196 | 39.36% | 39.20% |
| Arceus | 2 | 270 | 54.22% | 54.00% |
| Arceus | 3 | 32 | 6.43% | 6.40% |
| Kyurem | 1 | 211 | 45.09% | 42.20% |
| Kyurem | 2 | 257 | 54.91% | 51.40% |
| Zygarde | 1 | 53 | 10.75% | 10.60% |
| Zygarde | 2 | 275 | 55.78% | 55.00% |
| Zygarde | 3 | 165 | 33.47% | 33.00% |
| Necrozma | 1 | 45 | 9.91% | 9.00% |
| Necrozma | 2 | 244 | 53.74% | 48.80% |
| Necrozma | 3 | 165 | 36.34% | 33.00% |
| Zacian | 1 | 412 | 82.73% | 82.40% |
| Zacian | 2 | 86 | 17.27% | 17.20% |
| Zamazenta | 1 | 193 | 39.07% | 38.60% |
| Zamazenta | 2 | 301 | 60.93% | 60.20% |
| Terapagos | 1 | 325 | 67.29% | 65.00% |
| Terapagos | 2 | 158 | 32.71% | 31.60% |

## 전체 구간 Phase Loss

| Boss | Bracket | Phase | Losses | Loss Share |
| --- | --- | --- | --- | --- |
| Garchomp | early | 1 | 214 | 44.77% |
| Garchomp | early | 2 | 264 | 55.23% |
| Garchomp | mid | 1 | 175 | 36.31% |
| Garchomp | mid | 2 | 307 | 63.69% |
| Garchomp | late | 1 | 98 | 23.00% |
| Garchomp | late | 2 | 328 | 77.00% |
| Garchomp | endgame | 1 | 122 | 27.48% |
| Garchomp | endgame | 2 | 322 | 72.52% |
| Mewtwo | early | 1 | 264 | 52.80% |
| Mewtwo | early | 2 | 231 | 46.20% |
| Mewtwo | early | 3 | 5 | 1.00% |
| Mewtwo | mid | 1 | 216 | 43.20% |
| Mewtwo | mid | 2 | 266 | 53.20% |
| Mewtwo | mid | 3 | 18 | 3.60% |
| Mewtwo | late | 1 | 133 | 26.60% |
| Mewtwo | late | 2 | 326 | 65.20% |
| Mewtwo | late | 3 | 41 | 8.20% |
| Mewtwo | endgame | 1 | 175 | 35.00% |
| Mewtwo | endgame | 2 | 300 | 60.00% |
| Mewtwo | endgame | 3 | 25 | 5.00% |
| Metagross | early | 1 | 92 | 22.77% |
| Metagross | early | 2 | 312 | 77.23% |
| Metagross | mid | 1 | 82 | 20.35% |
| Metagross | mid | 2 | 321 | 79.65% |
| Metagross | late | 1 | 38 | 11.31% |
| Metagross | late | 2 | 298 | 88.69% |
| Metagross | endgame | 1 | 63 | 17.21% |
| Metagross | endgame | 2 | 303 | 82.79% |
| Palafin | early | 1 | 9 | 2.49% |
| Palafin | early | 2 | 352 | 97.51% |
| Palafin | mid | 1 | 3 | 0.84% |
| Palafin | mid | 2 | 356 | 99.16% |
| Palafin | late | 1 | 5 | 1.87% |
| Palafin | late | 2 | 263 | 98.13% |
| Palafin | endgame | 1 | 6 | 1.94% |
| Palafin | endgame | 2 | 304 | 98.06% |
| Snorlax | early | 1 | 20 | 4.01% |
| Snorlax | early | 2 | 479 | 95.99% |
| Snorlax | mid | 1 | 42 | 8.43% |
| Snorlax | mid | 2 | 456 | 91.57% |
| Snorlax | late | 1 | 28 | 5.71% |
| Snorlax | late | 2 | 462 | 94.29% |
| Snorlax | endgame | 1 | 43 | 8.72% |
| Snorlax | endgame | 2 | 450 | 91.28% |
| Hoopa | early | 1 | 42 | 10.77% |
| Hoopa | early | 2 | 348 | 89.23% |
| Hoopa | mid | 1 | 12 | 3.60% |
| Hoopa | mid | 2 | 321 | 96.40% |
| Hoopa | late | 1 | 1 | 0.59% |
| Hoopa | late | 2 | 169 | 99.41% |
| Hoopa | endgame | 1 | 2 | 1.03% |
| Hoopa | endgame | 2 | 192 | 98.97% |
| Shaymin | early | 1 | 145 | 33.26% |
| Shaymin | early | 2 | 291 | 66.74% |
| Shaymin | mid | 1 | 147 | 32.31% |
| Shaymin | mid | 2 | 308 | 67.69% |
| Shaymin | late | 1 | 70 | 17.28% |
| Shaymin | late | 2 | 335 | 82.72% |
| Shaymin | endgame | 1 | 95 | 22.84% |
| Shaymin | endgame | 2 | 321 | 77.16% |
| Volcarona | early | 1 | 156 | 44.96% |
| Volcarona | early | 2 | 191 | 55.04% |
| Volcarona | mid | 1 | 137 | 42.68% |
| Volcarona | mid | 2 | 184 | 57.32% |
| Volcarona | late | 1 | 83 | 37.05% |
| Volcarona | late | 2 | 141 | 62.95% |
| Volcarona | endgame | 1 | 82 | 37.61% |
| Volcarona | endgame | 2 | 136 | 62.39% |
| Ogerpon | early | 1 | 3 | 0.63% |
| Ogerpon | early | 2 | 231 | 48.13% |
| Ogerpon | early | 3 | 210 | 43.75% |
| Ogerpon | early | 4 | 36 | 7.50% |
| Ogerpon | mid | 1 | 75 | 15.40% |
| Ogerpon | mid | 2 | 111 | 22.79% |
| Ogerpon | mid | 3 | 259 | 53.18% |
| Ogerpon | mid | 4 | 42 | 8.62% |
| Ogerpon | late | 1 | 53 | 11.86% |
| Ogerpon | late | 2 | 77 | 17.23% |
| Ogerpon | late | 3 | 248 | 55.48% |
| Ogerpon | late | 4 | 69 | 15.44% |
| Ogerpon | endgame | 1 | 70 | 15.18% |
| Ogerpon | endgame | 2 | 80 | 17.35% |
| Ogerpon | endgame | 3 | 258 | 55.97% |
| Ogerpon | endgame | 4 | 53 | 11.50% |
| Diancie | early | 1 | 36 | 14.23% |
| Diancie | early | 2 | 217 | 85.77% |
| Diancie | mid | 1 | 56 | 17.61% |
| Diancie | mid | 2 | 262 | 82.39% |
| Diancie | late | 1 | 27 | 9.41% |
| Diancie | late | 2 | 260 | 90.59% |
| Diancie | endgame | 1 | 23 | 8.24% |
| Diancie | endgame | 2 | 256 | 91.76% |
| Groudon | early | 1 | 329 | 65.80% |
| Groudon | early | 2 | 171 | 34.20% |
| Groudon | mid | 1 | 356 | 71.49% |
| Groudon | mid | 2 | 142 | 28.51% |
| Groudon | late | 1 | 275 | 55.67% |
| Groudon | late | 2 | 219 | 44.33% |
| Groudon | endgame | 1 | 294 | 59.39% |
| Groudon | endgame | 2 | 201 | 40.61% |
| Kyogre | early | 1 | 427 | 86.09% |
| Kyogre | early | 2 | 69 | 13.91% |
| Kyogre | mid | 1 | 442 | 89.47% |
| Kyogre | mid | 2 | 52 | 10.53% |
| Kyogre | late | 1 | 385 | 77.15% |
| Kyogre | late | 2 | 114 | 22.85% |
| Kyogre | endgame | 1 | 373 | 75.05% |
| Kyogre | endgame | 2 | 124 | 24.95% |
| Rayquaza | early | 1 | 487 | 97.40% |
| Rayquaza | early | 2 | 13 | 2.60% |
| Rayquaza | mid | 1 | 392 | 78.40% |
| Rayquaza | mid | 2 | 108 | 21.60% |
| Rayquaza | late | 1 | 289 | 57.80% |
| Rayquaza | late | 2 | 211 | 42.20% |
| Rayquaza | endgame | 1 | 311 | 62.20% |
| Rayquaza | endgame | 2 | 189 | 37.80% |
| Arceus | early | 1 | 253 | 50.60% |
| Arceus | early | 2 | 239 | 47.80% |
| Arceus | early | 3 | 8 | 1.60% |
| Arceus | mid | 1 | 291 | 58.20% |
| Arceus | mid | 2 | 200 | 40.00% |
| Arceus | mid | 3 | 9 | 1.80% |
| Arceus | late | 1 | 193 | 39.55% |
| Arceus | late | 2 | 249 | 51.02% |
| Arceus | late | 3 | 46 | 9.43% |
| Arceus | endgame | 1 | 196 | 39.36% |
| Arceus | endgame | 2 | 270 | 54.22% |
| Arceus | endgame | 3 | 32 | 6.43% |
| Kyurem | early | 1 | 361 | 72.64% |
| Kyurem | early | 2 | 136 | 27.36% |
| Kyurem | mid | 1 | 341 | 68.89% |
| Kyurem | mid | 2 | 154 | 31.11% |
| Kyurem | late | 1 | 186 | 39.41% |
| Kyurem | late | 2 | 286 | 60.59% |
| Kyurem | endgame | 1 | 211 | 45.09% |
| Kyurem | endgame | 2 | 257 | 54.91% |
| Zygarde | early | 1 | 14 | 2.80% |
| Zygarde | early | 2 | 434 | 86.80% |
| Zygarde | early | 3 | 52 | 10.40% |
| Zygarde | mid | 1 | 62 | 12.40% |
| Zygarde | mid | 2 | 334 | 66.80% |
| Zygarde | mid | 3 | 104 | 20.80% |
| Zygarde | late | 1 | 36 | 7.29% |
| Zygarde | late | 2 | 275 | 55.67% |
| Zygarde | late | 3 | 183 | 37.04% |
| Zygarde | endgame | 1 | 53 | 10.75% |
| Zygarde | endgame | 2 | 275 | 55.78% |
| Zygarde | endgame | 3 | 165 | 33.47% |
| Necrozma | early | 1 | 139 | 27.80% |
| Necrozma | early | 2 | 275 | 55.00% |
| Necrozma | early | 3 | 86 | 17.20% |
| Necrozma | mid | 1 | 118 | 23.69% |
| Necrozma | mid | 2 | 270 | 54.22% |
| Necrozma | mid | 3 | 110 | 22.09% |
| Necrozma | late | 1 | 24 | 5.29% |
| Necrozma | late | 2 | 260 | 57.27% |
| Necrozma | late | 3 | 170 | 37.44% |
| Necrozma | endgame | 1 | 45 | 9.91% |
| Necrozma | endgame | 2 | 244 | 53.74% |
| Necrozma | endgame | 3 | 165 | 36.34% |
| Zacian | early | 1 | 471 | 94.39% |
| Zacian | early | 2 | 28 | 5.61% |
| Zacian | mid | 1 | 423 | 84.77% |
| Zacian | mid | 2 | 76 | 15.23% |
| Zacian | late | 1 | 396 | 79.52% |
| Zacian | late | 2 | 102 | 20.48% |
| Zacian | endgame | 1 | 412 | 82.73% |
| Zacian | endgame | 2 | 86 | 17.27% |
| Zamazenta | early | 1 | 279 | 55.91% |
| Zamazenta | early | 2 | 220 | 44.09% |
| Zamazenta | mid | 1 | 272 | 54.84% |
| Zamazenta | mid | 2 | 224 | 45.16% |
| Zamazenta | late | 1 | 174 | 35.44% |
| Zamazenta | late | 2 | 317 | 64.56% |
| Zamazenta | endgame | 1 | 193 | 39.07% |
| Zamazenta | endgame | 2 | 301 | 60.93% |
| Terapagos | early | 1 | 321 | 64.46% |
| Terapagos | early | 2 | 177 | 35.54% |
| Terapagos | mid | 1 | 361 | 72.34% |
| Terapagos | mid | 2 | 138 | 27.66% |
| Terapagos | late | 1 | 321 | 67.15% |
| Terapagos | late | 2 | 157 | 32.85% |
| Terapagos | endgame | 1 | 325 | 67.29% |
| Terapagos | endgame | 2 | 158 | 32.71% |

## Endgame Random Branch

상호 배타적인 route 합계는 보스 구간 전투 수와 같다. Arceus는 P2/P3 타입 등장 전투를 집계하므로 타입 표본 합계는 구간 전투 수의 2배다. 타입별 상호작용을 분리한 인과 효과는 아니다. 100 미만은 참고용이다.

| Boss | Branch | Runs | Win Rate | Avg Turns | Sample |
| --- | --- | --- | --- | --- | --- |
| Mewtwo | x | 249 | 0.00% | 6.66 | 100+ |
| Mewtwo | y | 251 | 0.00% | 5.53 | 100+ |
| Volcarona | iron-moth | 241 | 39.42% | 4.97 | 100+ |
| Volcarona | slither-wing | 259 | 72.20% | 5.37 | 100+ |
| Arceus | Arceus-Bug appeared | 62 | 0.00% | 6.18 | 참고용 (<100) |
| Arceus | Arceus-Dark appeared | 56 | 0.00% | 6.36 | 참고용 (<100) |
| Arceus | Arceus-Dragon appeared | 46 | 0.00% | 6.26 | 참고용 (<100) |
| Arceus | Arceus-Electric appeared | 61 | 0.00% | 6.08 | 참고용 (<100) |
| Arceus | Arceus-Fairy appeared | 52 | 0.00% | 6.21 | 참고용 (<100) |
| Arceus | Arceus-Fighting appeared | 56 | 0.00% | 6.43 | 참고용 (<100) |
| Arceus | Arceus-Fire appeared | 61 | 0.00% | 6.48 | 참고용 (<100) |
| Arceus | Arceus-Flying appeared | 73 | 0.00% | 6.41 | 참고용 (<100) |
| Arceus | Arceus-Ghost appeared | 63 | 0.00% | 6.37 | 참고용 (<100) |
| Arceus | Arceus-Grass appeared | 56 | 0.00% | 6.13 | 참고용 (<100) |
| Arceus | Arceus-Ground appeared | 57 | 0.00% | 5.96 | 참고용 (<100) |
| Arceus | Arceus-Ice appeared | 51 | 1.96% | 6.47 | 참고용 (<100) |
| Arceus | Arceus-Poison appeared | 59 | 0.00% | 6.12 | 참고용 (<100) |
| Arceus | Arceus-Psychic appeared | 62 | 0.00% | 6.58 | 참고용 (<100) |
| Arceus | Arceus-Rock appeared | 63 | 3.17% | 6.56 | 참고용 (<100) |
| Arceus | Arceus-Steel appeared | 67 | 1.49% | 6.55 | 참고용 (<100) |
| Arceus | Arceus-Water appeared | 55 | 0.00% | 6.71 | 참고용 (<100) |
| Kyurem | black | 254 | 9.45% | 6.26 | 100+ |
| Kyurem | white | 246 | 3.25% | 5.40 | 100+ |
| Necrozma | dawn-wings | 278 | 8.63% | 6.95 | 100+ |
| Necrozma | dusk-mane | 222 | 9.91% | 6.94 | 100+ |

## 이상치 — 분석용 라벨만

경계: WR<40 너무 강함, 40≤WR≤65 적당히 어려움, 65<WR≤80 비교적 쉬움, WR>80 너무 쉬움. Raid 등급이나 HP를 자동으로 바꾸지 않는다.

- Endgame <40%: Mewtwo 0.00%, Rayquaza 0.00%, Arceus 0.40%, Zacian 0.40%, Kyogre 0.60%, Groudon 1.00%, Zamazenta 1.20%, Snorlax 1.40%, Zygarde 1.40%, Terapagos 3.40%, Kyurem 6.40%, Ogerpon 7.80%, Necrozma 9.20%, Garchomp 11.20%, Shaymin 16.80%, Metagross 26.80%, Palafin 38.00%
- Endgame >80%: 없음
- Endgame route 간 차이 >15pp: Volcarona 32.78pp
- Endgame Phase Loss Share >70%: Garchomp P2 72.52%, Metagross P2 82.79%, Palafin P2 98.06%, Snorlax P2 91.28%, Hoopa P2 98.97%, Shaymin P2 77.16%, Diancie P2 91.76%, Kyogre P1 75.05%, Zacian P1 82.73%

## 출력과 재현

`.csv`는 보스×구간 상세 80행, `.comparison.csv`는 기존 Overall과 네 구간·성장 차이, `.branches.csv`와 `.phases.csv`는 네 구간 전체 세부 통계, `.teams.csv`와 `.strength.csv`는 팀/육성, `.floors.csv`는 실제 표본 분포다. `.battles.csv`는 개별 seed·층·팀·전투 결과·프로토콜 해시 원본이며 대용량 로컬 결과물이다. `.json`에는 모든 집계와 코드·기존 결과 파일 해시를 보관한다.
기존 전체 모드는 기본 1,000전을 유지한다. `--floor-brackets`가 있을 때만 기본 500전과 별도 출력 경로를 사용한다. 기존 결과 파일의 실행 전후 해시와 전체 src 해시를 검사한다.
