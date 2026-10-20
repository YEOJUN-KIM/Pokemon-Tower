# Raid 전투 스탯 1차 완화 및 premium 보상 검증

10,000전, 20 Boss × 500전, Endgame 85/95층 균등. 기존 threshold simulator의 runRaidSimulationJobs·seed·Player policy·팀·Boss AI를 그대로 사용했다. 결과를 보고 재조정하지 않았다.

## 변경 범위

- Top: Mewtwo / Arceus / Rayquaza 3V, elite 총 포인트의 57% (반올림). Very Strong: Zacian / Kyogre / Groudon / Terapagos 3V, 63%. Strong: Shaymin 4V, 68%. 나머지 12종 전투 스탯 유지.
- 기존 elite 포인트에서 공격/특공을 Speed보다 먼저 줄인다(감점 2:1). HP/Def/SpD 포인트는 유지한다. 비보호 IV는 기존 0–30 추첨, 조정 8종 HP IV 하한 16. 보호 IV 및 나머지 추첨으로 정확한 3V/4V를 만든다. Mewtwo는 route 주공격/Spe를 보호한다.
- threshold-v1 / replacement-v1 / native HP resize / clamp / Mega / Primal / G-Max / Stellar / Ultra / Mewtwo 3 Phase·Aura / random branch / 기술·특성·전용도구를 유지한다. HP IV 차이에 따른 정상 Max HP 차이만 있다.
- Pokémon rewardProfile=raid-premium을 전투 프로필 및 기존 elite 아이템·돈 보상표에서 분리했다. 플레이어 기본종/선택 폼 기본 build, 6V, 기존 좋은 route 성격(Serious는 공격 역할에 맞춰 교체), 66포인트(주공격32/Speed32/HP2; Snorlax HP32/Atk32/SpD2). Zygarde는 물리 성격/육성이다.
- Volcarona와 Kyurem만 실제 P2 보상. 나머지는 기본종. 기존 shiny 추첨을 유지하며 추가 랜덤 draw 없이 recruitTeam에 보상 전체를 고정 저장한다. 구형 스냅샷은 기존 저장 보상을 유지한다.
- 평균 생존 수 / 잔여 HP는 승리 표본 기준이다. 모의 AI 결과이며 사람의 실제 승률은 아니다.

## 세 모델 비교

| Boss | Old multiplier WR | Threshold WR | Stat-Tuned WR | Delta (pp) | Avg Turns | Avg Survivors (wins) | Avg HP Left (wins) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Mewtwo | 0.00% | 5.00% | 5.60% | 0.60 | 5.56 | 1.29 | 21.70% |
| Zacian | 0.40% | 10.80% | 13.60% | 2.80 | 4.03 | 2.09 | 46.74% |
| Rayquaza | 0.00% | 19.40% | 26.60% | 7.20 | 3.74 | 1.73 | 32.68% |
| Kyogre | 0.60% | 13.80% | 28.80% | 15.00 | 3.82 | 1.89 | 55.41% |
| Groudon | 1.00% | 21.00% | 34.20% | 13.20 | 4.37 | 1.40 | 38.54% |
| Arceus | 0.40% | 29.40% | 41.20% | 11.80 | 5.95 | 1.43 | 27.59% |
| Kyurem | 6.40% | 41.80% | 41.80% | 0.00 | 4.78 | 1.86 | 45.76% |
| Ogerpon | 7.80% | 44.60% | 44.60% | 0.00 | 5.59 | 1.34 | 22.73% |
| Shaymin | 16.80% | 36.00% | 47.00% | 11.00 | 5.16 | 1.96 | 44.82% |
| Zygarde | 1.40% | 47.20% | 47.20% | 0.00 | 5.90 | 1.62 | 37.93% |
| Necrozma | 9.20% | 48.20% | 48.20% | 0.00 | 5.23 | 1.66 | 35.17% |
| Garchomp | 11.20% | 54.20% | 54.20% | 0.00 | 4.10 | 1.86 | 42.71% |
| Terapagos | 3.40% | 30.00% | 54.80% | 24.80 | 5.02 | 1.44 | 31.66% |
| Zamazenta | 1.20% | 60.00% | 60.00% | 0.00 | 4.31 | 1.50 | 31.64% |
| Metagross | 26.80% | 60.40% | 60.40% | 0.00 | 4.48 | 1.85 | 43.22% |
| Volcarona | 56.40% | 61.00% | 61.00% | 0.00 | 5.04 | 1.80 | 45.18% |
| Diancie | 44.20% | 62.20% | 62.20% | 0.00 | 4.17 | 1.80 | 40.62% |
| Snorlax | 1.40% | 63.60% | 63.60% | 0.00 | 4.74 | 1.50 | 40.63% |
| Hoopa | 61.20% | 82.40% | 82.40% | 0.00 | 3.20 | 2.24 | 58.30% |
| Palafin | 38.00% | 82.40% | 82.40% | 0.00 | 3.74 | 1.40 | 33.90% |

## 전투 / 보상 검증

스탯 벡터 순서: HP / Atk / Def / SpA / SpD / Spe. IV는 각 route/층 첫 실제 개체이며 전체 10,000개 실제 IV·포인트·seed는 battles.csv에 기록했다. JSON profiles[].ivRanges는 관측 최솟값/최댓값이다. 모든 보상 표본을 6V·총66·각 스탯32 이하로 검사했다.

| Boss / Route / Floor | Battle Perfect IV | Battle Training | Protected IV | Actual IV (first) | Battle Points | Reward IV | Reward Nature | Reward Points | Reward Species/Form |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Mewtwo / y / 85 | 3 | raid-top | spa/spe | 16/6/31/31/7/31 | 8/0/0/9/0/6 | 6V | Timid | 2/0/0/32/0/32 | Mewtwo |
| Mewtwo / x / 95 | 3 | raid-top | atk/spe | 16/31/26/31/20/31 | 8/10/0/0/0/7 | 6V | Jolly | 2/32/0/0/0/32 | Mewtwo |
| Mewtwo / x / 85 | 3 | raid-top | atk/spe | 31/31/17/8/8/31 | 8/9/0/0/0/6 | 6V | Jolly | 2/32/0/0/0/32 | Mewtwo |
| Mewtwo / y / 95 | 3 | raid-top | spa/spe | 16/18/12/31/31/31 | 8/0/0/10/0/7 | 6V | Timid | 2/0/0/32/0/32 | Mewtwo |
| Zacian / crowned / 85 | 3 | raid-very-strong | atk/spe | 27/31/25/29/31/31 | 8/11/0/0/0/7 | 6V | Adamant | 2/32/0/0/0/32 | Zacian |
| Zacian / crowned / 95 | 3 | raid-very-strong | atk/spe | 16/31/26/31/21/31 | 8/11/0/0/0/8 | 6V | Adamant | 2/32/0/0/0/32 | Zacian |
| Rayquaza / mega / 85 | 3 | raid-top | atk/spe | 16/31/18/31/26/31 | 8/9/0/0/0/6 | 6V | Adamant | 2/32/0/0/0/32 | Rayquaza |
| Rayquaza / mega / 95 | 3 | raid-top | atk/spe | 16/31/27/31/17/31 | 8/10/0/0/0/7 | 6V | Adamant | 2/32/0/0/0/32 | Rayquaza |
| Kyogre / primal / 85 | 3 | raid-very-strong | spa | 16/31/9/31/31/2 | 8/0/0/11/0/7 | 6V | Modest | 2/0/0/32/0/32 | Kyogre |
| Kyogre / primal / 95 | 3 | raid-very-strong | spa | 31/31/7/31/23/17 | 8/0/0/11/0/8 | 6V | Modest | 2/0/0/32/0/32 | Kyogre |
| Groudon / primal / 85 | 3 | raid-very-strong | atk | 23/31/5/31/31/27 | 8/11/0/0/0/7 | 6V | Adamant | 2/32/0/0/0/32 | Groudon |
| Groudon / primal / 95 | 3 | raid-very-strong | atk | 16/31/31/14/4/31 | 8/11/0/0/0/8 | 6V | Adamant | 2/32/0/0/0/32 | Groudon |
| Arceus / plates / 85 | 3 | raid-top | spa | 27/21/5/31/31/31 | 8/0/0/9/0/6 | 6V | Modest | 2/0/0/32/0/32 | Arceus |
| Arceus / plates / 95 | 3 | raid-top | spa | 28/31/21/31/22/31 | 8/0/0/10/0/7 | 6V | Modest | 2/0/0/32/0/32 | Arceus |
| Kyurem / black / 85 | 6 | elite | hp/spe | 31/31/31/31/31/31 | 8/21/0/0/0/12 | 6V | Adamant | 2/32/0/0/0/32 | Kyurem-Black |
| Kyurem / white / 95 | 6 | elite | hp/spe | 31/31/31/31/31/31 | 8/0/0/22/0/13 | 6V | Modest | 2/0/0/32/0/32 | Kyurem-White |
| Kyurem / black / 95 | 6 | elite | hp/spe | 31/31/31/31/31/31 | 8/22/0/0/0/13 | 6V | Adamant | 2/32/0/0/0/32 | Kyurem-Black |
| Kyurem / white / 85 | 6 | elite | hp/spe | 31/31/31/31/31/31 | 8/0/0/21/0/12 | 6V | Modest | 2/0/0/32/0/32 | Kyurem-White |
| Ogerpon / masks / 85 | 4 | elite | hp/spe | 31/31/9/31/9/31 | 8/21/0/0/0/12 | 6V | Adamant | 2/32/0/0/0/32 | Ogerpon |
| Ogerpon / masks / 95 | 4 | elite | hp/spe | 31/25/27/31/31/31 | 8/22/0/0/0/13 | 6V | Adamant | 2/32/0/0/0/32 | Ogerpon |
| Shaymin / sky / 85 | 4 | raid-strong | spa/spe | 16/3/31/31/31/31 | 8/0/0/12/0/8 | 6V | Modest | 2/0/0/32/0/32 | Shaymin |
| Shaymin / sky / 95 | 4 | raid-strong | spa/spe | 31/3/31/31/10/31 | 8/0/0/12/0/9 | 6V | Modest | 2/0/0/32/0/32 | Shaymin |
| Zygarde / mega / 85 | 6 | elite | hp/spe | 31/31/31/31/31/31 | 8/0/0/21/0/12 | 6V | Adamant | 2/32/0/0/0/32 | Zygarde |
| Zygarde / mega / 95 | 6 | elite | hp/spe | 31/31/31/31/31/31 | 8/0/0/22/0/13 | 6V | Adamant | 2/32/0/0/0/32 | Zygarde |
| Necrozma / dawn-wings / 85 | 6 | elite | hp/spe | 31/31/31/31/31/31 | 8/0/0/21/0/12 | 6V | Modest | 2/0/0/32/0/32 | Necrozma |
| Necrozma / dusk-mane / 95 | 6 | elite | hp/spe | 31/31/31/31/31/31 | 8/0/0/22/0/13 | 6V | Modest | 2/0/0/32/0/32 | Necrozma |
| Necrozma / dusk-mane / 85 | 6 | elite | hp/spe | 31/31/31/31/31/31 | 8/0/0/21/0/12 | 6V | Modest | 2/0/0/32/0/32 | Necrozma |
| Necrozma / dawn-wings / 95 | 6 | elite | hp/spe | 31/31/31/31/31/31 | 8/0/0/22/0/13 | 6V | Modest | 2/0/0/32/0/32 | Necrozma |
| Garchomp / mega / 85 | 4 | elite | atk/spe | 31/31/21/31/7/31 | 8/21/0/0/0/12 | 6V | Jolly | 2/32/0/0/0/32 | Garchomp |
| Garchomp / mega / 95 | 4 | elite | atk/spe | 31/31/2/31/15/31 | 8/22/0/0/0/13 | 6V | Jolly | 2/32/0/0/0/32 | Garchomp |
| Terapagos / stellar / 85 | 3 | raid-very-strong | spa | 16/31/20/31/31/11 | 8/0/0/11/0/7 | 6V | Modest | 2/0/0/32/0/32 | Terapagos |
| Terapagos / stellar / 95 | 3 | raid-very-strong | spa | 16/18/31/31/31/6 | 8/0/0/11/0/8 | 6V | Modest | 2/0/0/32/0/32 | Terapagos |
| Zamazenta / crowned / 85 | 6 | elite | hp/spe | 31/31/31/31/31/31 | 8/21/0/0/0/12 | 6V | Adamant | 2/32/0/0/0/32 | Zamazenta |
| Zamazenta / crowned / 95 | 6 | elite | hp/spe | 31/31/31/31/31/31 | 8/22/0/0/0/13 | 6V | Adamant | 2/32/0/0/0/32 | Zamazenta |
| Metagross / mega / 85 | 4 | elite | hp/spe | 31/31/31/10/22/31 | 8/21/0/0/0/12 | 6V | Adamant | 2/32/0/0/0/32 | Metagross |
| Metagross / mega / 95 | 4 | elite | hp/spe | 31/4/31/31/6/31 | 8/22/0/0/0/13 | 6V | Adamant | 2/32/0/0/0/32 | Metagross |
| Volcarona / iron-moth / 85 | 4 | elite | hp/spe | 31/31/2/31/4/31 | 8/0/0/21/0/12 | 6V | Modest | 2/0/0/32/0/32 | Iron Moth |
| Volcarona / iron-moth / 95 | 4 | elite | hp/spe | 31/31/31/6/11/31 | 8/0/0/22/0/13 | 6V | Modest | 2/0/0/32/0/32 | Iron Moth |
| Volcarona / slither-wing / 85 | 4 | elite | hp/spe | 31/4/31/31/30/31 | 8/21/0/0/0/12 | 6V | Adamant | 2/32/0/0/0/32 | Slither Wing |
| Volcarona / slither-wing / 95 | 4 | elite | hp/spe | 31/26/31/31/17/31 | 8/22/0/0/0/13 | 6V | Adamant | 2/32/0/0/0/32 | Slither Wing |
| Diancie / mega / 85 | 6 | elite | hp/spe | 31/31/31/31/31/31 | 8/0/0/21/0/12 | 6V | Modest | 2/0/0/32/0/32 | Diancie |
| Diancie / mega / 95 | 6 | elite | hp/spe | 31/31/31/31/31/31 | 8/0/0/22/0/13 | 6V | Modest | 2/0/0/32/0/32 | Diancie |
| Snorlax / gigantamax / 85 | 4 | elite | hp/spe | 31/31/31/12/21/31 | 8/21/0/0/0/12 | 6V | Adamant | 32/32/0/0/2/0 | Snorlax |
| Snorlax / gigantamax / 95 | 4 | elite | hp/spe | 31/31/14/16/31/31 | 8/22/0/0/0/13 | 6V | Adamant | 32/32/0/0/2/0 | Snorlax |
| Hoopa / unbound / 85 | 6 | elite | hp/spe | 31/31/31/31/31/31 | 8/0/0/21/0/12 | 6V | Modest | 2/0/0/32/0/32 | Hoopa |
| Hoopa / unbound / 95 | 6 | elite | hp/spe | 31/31/31/31/31/31 | 8/0/0/22/0/13 | 6V | Modest | 2/0/0/32/0/32 | Hoopa |
| Palafin / hero / 85 | 4 | elite | hp/spe | 31/31/17/26/31/31 | 8/21/0/0/0/12 | 6V | Adamant | 2/32/0/0/0/32 | Palafin |
| Palafin / hero / 95 | 4 | elite | hp/spe | 31/31/31/14/8/31 | 8/22/0/0/0/13 | 6V | Adamant | 2/32/0/0/0/32 | Palafin |

## Random branches

Arceus typePresence는 P2/P3가 겹치며 표본 합이 전투 수의 2배다. 작은 branch 표본의 승률은 참고용이다. Branch의 Before는 original multiplier 비교다.

| Boss | Branch | Runs | Old multiplier WR | Stat-Tuned WR | Avg Turns |
| --- | --- | --- | --- | --- | --- |
| Mewtwo | x | 249 | 0.00% | 6.02% | 5.71 |
| Mewtwo | y | 251 | 0.00% | 5.18% | 5.41 |
| Arceus | Arceus-Bug | 62 | 0.00% | 27.42% | 6.03 |
| Arceus | Arceus-Dark | 56 | 0.00% | 42.86% | 5.80 |
| Arceus | Arceus-Dragon | 46 | 0.00% | 41.30% | 6.04 |
| Arceus | Arceus-Electric | 61 | 0.00% | 22.95% | 5.77 |
| Arceus | Arceus-Fairy | 52 | 0.00% | 42.31% | 5.63 |
| Arceus | Arceus-Fighting | 56 | 0.00% | 39.29% | 5.70 |
| Arceus | Arceus-Fire | 61 | 0.00% | 40.98% | 6.02 |
| Arceus | Arceus-Flying | 73 | 0.00% | 39.73% | 5.93 |
| Arceus | Arceus-Ghost | 63 | 0.00% | 49.21% | 5.79 |
| Arceus | Arceus-Grass | 56 | 0.00% | 39.29% | 5.75 |
| Arceus | Arceus-Ground | 57 | 0.00% | 43.86% | 5.58 |
| Arceus | Arceus-Ice | 51 | 1.96% | 49.02% | 6.06 |
| Arceus | Arceus-Poison | 59 | 0.00% | 49.15% | 5.75 |
| Arceus | Arceus-Psychic | 62 | 0.00% | 43.55% | 6.10 |
| Arceus | Arceus-Rock | 63 | 3.17% | 38.10% | 6.14 |
| Arceus | Arceus-Steel | 67 | 1.49% | 46.27% | 6.31 |
| Arceus | Arceus-Water | 55 | 0.00% | 47.27% | 6.65 |
| Kyurem | black | 254 | 9.45% | 48.82% | 5.11 |
| Kyurem | white | 246 | 3.25% | 34.55% | 4.44 |
| Necrozma | dawn-wings | 278 | 8.63% | 48.56% | 5.06 |
| Necrozma | dusk-mane | 222 | 9.91% | 47.75% | 5.44 |
| Volcarona | iron-moth | 241 | 39.42% | 45.23% | 4.89 |
| Volcarona | slither-wing | 259 | 72.20% | 75.68% | 5.17 |

## Phase loss share

| Boss | Phase | Losses | Loss Share |
| --- | --- | --- | --- |
| Mewtwo | 1 | 35 | 7.42% |
| Mewtwo | 2 | 189 | 40.04% |
| Mewtwo | 3 | 248 | 52.54% |
| Zacian | 1 | 177 | 40.97% |
| Zacian | 2 | 255 | 59.03% |
| Rayquaza | 1 | 89 | 24.25% |
| Rayquaza | 2 | 278 | 75.75% |
| Kyogre | 1 | 69 | 19.38% |
| Kyogre | 2 | 287 | 80.62% |
| Groudon | 1 | 115 | 34.95% |
| Groudon | 2 | 214 | 65.05% |
| Arceus | 1 | 26 | 8.84% |
| Arceus | 2 | 116 | 39.46% |
| Arceus | 3 | 152 | 51.70% |
| Kyurem | 1 | 54 | 18.56% |
| Kyurem | 2 | 237 | 81.44% |
| Ogerpon | 1 | 48 | 17.33% |
| Ogerpon | 2 | 34 | 12.27% |
| Ogerpon | 3 | 118 | 42.60% |
| Ogerpon | 4 | 77 | 27.80% |
| Shaymin | 1 | 11 | 4.15% |
| Shaymin | 2 | 254 | 95.85% |
| Zygarde | 1 | 41 | 15.53% |
| Zygarde | 2 | 19 | 7.20% |
| Zygarde | 3 | 204 | 77.27% |
| Necrozma | 1 | 0 | 0.00% |
| Necrozma | 2 | 19 | 7.34% |
| Necrozma | 3 | 240 | 92.66% |
| Garchomp | 1 | 71 | 31.00% |
| Garchomp | 2 | 158 | 69.00% |
| Terapagos | 1 | 53 | 23.45% |
| Terapagos | 2 | 173 | 76.55% |
| Zamazenta | 1 | 86 | 43.00% |
| Zamazenta | 2 | 114 | 57.00% |
| Metagross | 1 | 4 | 2.02% |
| Metagross | 2 | 194 | 97.98% |
| Volcarona | 1 | 63 | 32.31% |
| Volcarona | 2 | 132 | 67.69% |
| Diancie | 1 | 1 | 0.53% |
| Diancie | 2 | 188 | 99.47% |
| Snorlax | 1 | 36 | 19.78% |
| Snorlax | 2 | 146 | 80.22% |
| Hoopa | 1 | 1 | 1.14% |
| Hoopa | 2 | 87 | 98.86% |
| Palafin | 1 | 0 | 0.00% |
| Palafin | 2 | 88 | 100.00% |

## 이상치 — 추가 자동 수정 없음

- <35%: Mewtwo, Zacian, Rayquaza, Kyogre, Groudon
- >85%: 없음

## 재현

`pnpm exec tsx scripts/simulate-raid-stat-tuning.ts --runs 500 --workers 4`. 기존 multiplier / threshold 보고서를 덮어쓰지 않으며 실행 전후 해시를 검증한다. source·pool·policy 해시와 실행 manifest는 JSON metadata에 포함한다. CSV 요약/branch/phase 및 실제 전투별 데이터는 같은 파일명 prefix를 사용한다.
