# Raid Threshold HP — Endgame first measurement

기준 커밋 `f3976bfee1f097e33bf00c4374c86b8709827b36`에서 HP 구조만 이식한 첫 결과다. **10,000전**, 보스별 500전, 85/95층 균등. Player policy·팀·육성·아이템·Boss AI·기술·특성·보상·등장 조건을 유지했다. 목표 승률에 맞춘 추가 조정이나 Rank Up은 하지 않았다.

## 구현

- 구형 스냅샷은 hpMode가 없으므로 기존 독립 Phase HP pool과 raidHpMultiplier로 실행한다. 새 스냅샷은 hpMode=threshold-v1이며 multiplier를 저장·적용하지 않는다. 등록 데이터의 옛 multiplier 필드는 legacy 참고값으로만 남긴다.
- 같은 개체 하나가 기본 native Max HP 100%로 시작한다. hpRatio를 누적한 남은 바 비율을 경계로 사용한다. 2 Phase는 50%, 3 Phase는 기존 .34/.33/.33 또는 Mewtwo의 1/3, 4 Phase는 75/50/25%다.
- 실제 Pokemon.damage 및 직접 faint 효과에서 경계까지 피해를 제한한다. 다단 공격과 반동을 포함한 하나의 action이 끝나면 한 번만 전환한다. 초과 피해는 버리고 다음 Phase에 전달하지 않는다. 잔여 스케줄의 이미 선택한 행동은 유지한다.
- 동일 Pokemon의 상태·랭크·volatile을 유지한다. 새 Phase의 정상 기술/특성/장비/폼을 적용하고 native Max HP에 이전 HP 비율을 반올림해 이어간다. 새 입장이나 추가 생명을 만들지 않는다. Mewtwo Aura의 기존 공격 계열+1·Speed+1은 유지한다.
- G-Max는 실제 native 2배만 적용하고 persistent를 유지한다. Complete/Mega Zygarde 및 Stellar Terapagos는 실제 폼 HP로 resize한다. Terapagos 최초 Tera Shift와 native Stellar 동작을 재사용한다.
- Volcarona는 hpMode=replacement-v1이다. P1을 완전 KO한 뒤 저장된 Slither Wing/Iron Moth P2가 native HP 100%로 입장한다. 실제 P2 보상 정책도 유지한다. Hoopa는 별도 상향하지 않았다.
- 실제 기본 룰 Lv50, 기존 Endgame IV25/포인트50·일반 팀 20개·일반 아이템 가정이다. seed base와 bracket/index 도메인은 이전 Endgame과 같아 같은 팀·층·초기 RNG 조건을 비교한다. 전투가 달라지면서 이후 damage RNG 소비는 달라질 수 있다. 사람의 실제 승률을 측정한 값은 아니다.

## Endgame before / after

| Boss | Before WR | After WR | Delta (pp) | Avg Turns | Effective HP x |
| --- | --- | --- | --- | --- | --- |
| Mewtwo | 0.00% | 5.00% | 5.00 | 5.44 | 1.00 |
| Zacian | 0.40% | 10.80% | 10.40 | 3.98 | 1.00 |
| Kyogre | 0.60% | 13.80% | 13.20 | 3.92 | 1.00 |
| Rayquaza | 0.00% | 19.40% | 19.40 | 3.73 | 1.00 |
| Groudon | 1.00% | 21.00% | 20.00 | 4.25 | 1.00 |
| Arceus | 0.40% | 29.40% | 29.00 | 5.96 | 1.00 |
| Terapagos | 3.40% | 30.00% | 26.60 | 5.25 | 1.22 |
| Shaymin | 16.80% | 36.00% | 19.20 | 5.25 | 1.00 |
| Kyurem | 6.40% | 41.80% | 35.40 | 4.78 | 1.00 |
| Ogerpon | 7.80% | 44.60% | 36.80 | 5.59 | 1.00 |
| Zygarde | 1.40% | 47.20% | 45.80 | 5.90 | 1.37 |
| Necrozma | 9.20% | 48.20% | 39.00 | 5.23 | 1.00 |
| Garchomp | 11.20% | 54.20% | 43.00 | 4.10 | 1.00 |
| Zamazenta | 1.20% | 60.00% | 58.80 | 4.31 | 1.00 |
| Metagross | 26.80% | 60.40% | 33.60 | 4.48 | 1.00 |
| Volcarona | 56.40% | 61.00% | 4.60 | 5.04 | 1.99 |
| Diancie | 44.20% | 62.20% | 18.00 | 4.17 | 1.00 |
| Snorlax | 1.40% | 63.60% | 62.20 | 4.74 | 1.50 |
| Hoopa | 61.20% | 82.40% | 21.20 | 3.20 | 1.00 |
| Palafin | 38.00% | 82.40% | 44.40 | 3.74 | 1.00 |

## Native HP budget

Base HP는 같은 IV/포인트의 기본종 정상 HP다. Effective Total은 회복과 경계에서 버린 과잉 피해를 제외한 HP interval 합이다. 폼 변경 시 최대 HP가 커지면 현재 비율을 유지해 증가한 실제 HP만 포함한다. Phase Max/interval은 대표 첫 스냅샷이며 Total/Multiplier는 전체 표본 평균이다. Volcarona는 두 별도 종 native HP 합이다.

| Boss | Base HP | Native Phase Max HP | Phase HP intervals | Effective Total HP | Effective Multiplier |
| --- | --- | --- | --- | --- | --- |
| Mewtwo | 189.00 | 189 / 189 / 189 | 63 / 63 / 63 | 189.00 | 1.00 |
| Zacian | 175.00 | 175 / 175 | 87 / 88 | 175.00 | 1.00 |
| Kyogre | 183.00 | 183 / 183 | 91 / 92 | 183.00 | 1.00 |
| Rayquaza | 188.00 | 188 / 188 | 94 / 94 | 188.00 | 1.00 |
| Groudon | 183.00 | 183 / 183 | 91 / 92 | 183.00 | 1.00 |
| Arceus | 203.00 | 203 / 203 / 203 | 69 / 67 / 67 | 203.00 | 1.00 |
| Terapagos | 173.00 | 178 / 243 | 89 / 122 | 211.00 | 1.22 |
| Shaymin | 183.00 | 183 / 183 | 91 / 92 | 183.00 | 1.00 |
| Kyurem | 208.00 | 208 / 208 | 104 / 104 | 208.00 | 1.00 |
| Ogerpon | 163.00 | 163 / 163 / 163 / 163 | 41 / 40 / 41 / 41 | 163.00 | 1.00 |
| Zygarde | 191.00 | 191 / 299 / 299 | 65 / 98 / 99 | 262.00 | 1.37 |
| Necrozma | 180.00 | 180 / 180 / 180 | 61 / 60 / 59 | 180.00 | 1.00 |
| Garchomp | 187.24 | 191 / 191 | 95 / 96 | 187.24 | 1.00 |
| Zamazenta | 175.00 | 175 / 175 | 87 / 88 | 175.00 | 1.00 |
| Metagross | 163.00 | 163 / 163 | 81 / 82 | 163.00 | 1.00 |
| Volcarona | 168.00 | 168 / 163 | 168 / 163 | 333.59 | 1.99 |
| Diancie | 133.00 | 133 / 133 | 66 / 67 | 133.00 | 1.00 |
| Snorlax | 243.00 | 243 / 486 | 121 / 244 | 365.00 | 1.50 |
| Hoopa | 163.00 | 163 / 163 | 81 / 82 | 163.00 | 1.00 |
| Palafin | 183.00 | 183 / 183 | 91 / 92 | 183.00 | 1.00 |

## Random branches

Arceus의 타입별 presence는 P2/P3가 겹쳐 합계가 보스 전투 수의 2배다. 작은 타입별 표본은 참고용이다.

| Boss | Branch | Runs | Before WR | After WR | Avg Turns |
| --- | --- | --- | --- | --- | --- |
| Mewtwo | x | 249 | 0.00% | 6.83% | 5.63 |
| Mewtwo | y | 251 | 0.00% | 3.19% | 5.24 |
| Arceus | Arceus-Bug | 62 | 0.00% | 20.97% | 5.84 |
| Arceus | Arceus-Dark | 56 | 0.00% | 32.14% | 5.80 |
| Arceus | Arceus-Dragon | 46 | 0.00% | 23.91% | 6.02 |
| Arceus | Arceus-Electric | 61 | 0.00% | 13.11% | 5.74 |
| Arceus | Arceus-Fairy | 52 | 0.00% | 28.85% | 5.81 |
| Arceus | Arceus-Fighting | 56 | 0.00% | 37.50% | 5.88 |
| Arceus | Arceus-Fire | 61 | 0.00% | 32.79% | 6.13 |
| Arceus | Arceus-Flying | 73 | 0.00% | 34.25% | 5.90 |
| Arceus | Arceus-Ghost | 63 | 0.00% | 36.51% | 5.98 |
| Arceus | Arceus-Grass | 56 | 0.00% | 25.00% | 5.80 |
| Arceus | Arceus-Ground | 57 | 0.00% | 33.33% | 5.44 |
| Arceus | Arceus-Ice | 51 | 1.96% | 27.45% | 6.08 |
| Arceus | Arceus-Poison | 59 | 0.00% | 33.90% | 5.73 |
| Arceus | Arceus-Psychic | 62 | 0.00% | 30.65% | 6.13 |
| Arceus | Arceus-Rock | 63 | 3.17% | 30.16% | 6.13 |
| Arceus | Arceus-Steel | 67 | 1.49% | 26.87% | 6.43 |
| Arceus | Arceus-Water | 55 | 0.00% | 30.91% | 6.45 |
| Kyurem | black | 254 | 9.45% | 48.82% | 5.11 |
| Kyurem | white | 246 | 3.25% | 34.55% | 4.44 |
| Necrozma | dawn-wings | 278 | 8.63% | 48.56% | 5.06 |
| Necrozma | dusk-mane | 222 | 9.91% | 47.75% | 5.44 |
| Volcarona | iron-moth | 241 | 39.42% | 45.23% | 4.89 |
| Volcarona | slither-wing | 259 | 72.20% | 75.68% | 5.17 |

## Endgame Phase loss

| Boss | Phase | Losses | Loss Share |
| --- | --- | --- | --- |
| Mewtwo | 1 | 47 | 9.89% |
| Mewtwo | 2 | 200 | 42.11% |
| Mewtwo | 3 | 228 | 48.00% |
| Zacian | 1 | 245 | 54.93% |
| Zacian | 2 | 201 | 45.07% |
| Kyogre | 1 | 132 | 30.63% |
| Kyogre | 2 | 299 | 69.37% |
| Rayquaza | 1 | 133 | 33.00% |
| Rayquaza | 2 | 270 | 67.00% |
| Groudon | 1 | 155 | 39.24% |
| Groudon | 2 | 240 | 60.76% |
| Arceus | 1 | 33 | 9.35% |
| Arceus | 2 | 154 | 43.63% |
| Arceus | 3 | 166 | 47.03% |
| Terapagos | 1 | 95 | 27.14% |
| Terapagos | 2 | 255 | 72.86% |
| Shaymin | 1 | 19 | 5.94% |
| Shaymin | 2 | 301 | 94.06% |
| Kyurem | 1 | 54 | 18.56% |
| Kyurem | 2 | 237 | 81.44% |
| Ogerpon | 1 | 48 | 17.33% |
| Ogerpon | 2 | 34 | 12.27% |
| Ogerpon | 3 | 118 | 42.60% |
| Ogerpon | 4 | 77 | 27.80% |
| Zygarde | 1 | 41 | 15.53% |
| Zygarde | 2 | 19 | 7.20% |
| Zygarde | 3 | 204 | 77.27% |
| Necrozma | 1 | 0 | 0.00% |
| Necrozma | 2 | 19 | 7.34% |
| Necrozma | 3 | 240 | 92.66% |
| Garchomp | 1 | 71 | 31.00% |
| Garchomp | 2 | 158 | 69.00% |
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

## 이상치 — 이번 작업에서는 기록만

- After WR >85%: 없음
- After WR <40%: Mewtwo, Zacian, Kyogre, Rayquaza, Groudon, Arceus, Terapagos, Shaymin
- Route WR gap >15pp: Volcarona 30.45pp

## 파일

`scripts/simulate-raid-threshold.ts --runs 500`으로 같은 측정을 실행한다. 기존 simulateRaid/runBattle/worker를 사용하고 원래 결과 파일의 실행 전후 해시를 검사한다. `.csv`는 비교 요약, `.branches.csv`와 `.phases.csv`는 세부 표, `.battles.csv`는 seed·팀·층·Phase native HP·budget·프로토콜 해시 원본, `.json`은 전체 집계와 manifest다. 원시 대용량 CSV는 로컬 결과물이다.
