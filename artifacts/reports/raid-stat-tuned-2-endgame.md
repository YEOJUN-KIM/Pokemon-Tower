# Raid stat tuning 2 — one adjustment

10000 battles. 20 bosses × 500; 85/95층 각 250전(500전 실행). baseline 2806594fda121aa8256d1e2b4892927a0aa00552. 같은 seed/player pool/policy/AI.

## 승률

| Boss | Old | Threshold | Tune1 | Tune2 | Delta pp |
| --- | --- | --- | --- | --- | --- |
| Mewtwo | 0.00% | 5.00% | 5.60% | 7.80% | 2.20 |
| Zacian | 0.40% | 10.80% | 13.60% | 20.40% | 6.80 |
| Rayquaza | 0.00% | 19.40% | 26.60% | 28.00% | 1.40 |
| Kyogre | 0.60% | 13.80% | 28.80% | 31.60% | 2.80 |
| Groudon | 1.00% | 21.00% | 34.20% | 36.80% | 2.60 |
| Arceus | 0.40% | 29.40% | 41.20% | 41.20% | 0.00 |
| Kyurem | 6.40% | 41.80% | 41.80% | 41.80% | 0.00 |
| Ogerpon | 7.80% | 44.60% | 44.60% | 44.60% | 0.00 |
| Shaymin | 16.80% | 36.00% | 47.00% | 47.00% | 0.00 |
| Zygarde | 1.40% | 47.20% | 47.20% | 47.20% | 0.00 |
| Necrozma | 9.20% | 48.20% | 48.20% | 48.20% | 0.00 |
| Garchomp | 11.20% | 54.20% | 54.20% | 54.20% | 0.00 |
| Terapagos | 3.40% | 30.00% | 54.80% | 54.80% | 0.00 |
| Zamazenta | 1.20% | 60.00% | 60.00% | 60.00% | 0.00 |
| Metagross | 26.80% | 60.40% | 60.40% | 60.40% | 0.00 |
| Volcarona | 56.40% | 61.00% | 61.00% | 61.00% | 0.00 |
| Diancie | 44.20% | 62.20% | 62.20% | 62.20% | 0.00 |
| Snorlax | 1.40% | 63.60% | 63.60% | 63.60% | 0.00 |
| Palafin | 38.00% | 82.40% | 82.40% | 82.40% | 0.00 |
| Hoopa | 61.20% | 82.40% | 82.40% | 82.40% | 0.00 |

## 조정값

보호 IV는 랜덤값이 아닌 지정 보장값이다. Mewtwo 23/23, Zacian 21/21, Rayquaza 24/24, Kyogre SpA24, Groudon Atk25. Kyogre/Groudon Speed는 기존 비보호 추첨(무작위 31 슬롯에 선택될 가능성 포함)을 유지하며 Perfect를 보장하지 않는다. HP 하한16, HP/Def/SpD 포인트 보존. 기존 IV 추첨 순서를 유지한 뒤 보호 핵심값만 덮어쓰므로 다른 IV와 이후 RNG는 동일하다. perfect는 기존 selection slot 수이며 지정 IV가 있으면 실제 31 개수와 다르다.

| Boss | Core IV Before → After | Training elite ratio Before → After |
| --- | --- | --- |
| Mewtwo | Atk(X)/SpA(Y), Spe:31 →23 | 57% →43% |
| Zacian | Atk/Spe:31 →21 | 63% →43% |
| Rayquaza | Atk/Spe:31 →24 | 57% →48% |
| Kyogre | SpA:31 →24; Spe random unchanged | 63% →50% |
| Groudon | Atk:31 →25; Spe random unchanged | 63% →54% |

## 실제 battle/reward 표본

벡터 순서 HP/Atk/Def/SpA/SpD/Spe. 각 route/층의 첫 실제 seed 표본. 모든 10,000전 reward를 검사했다.

| Boss/Route/Floor/Index | Battle IV | Battle Points before → after | Reward IV | Nature | Reward Points |
| --- | --- | --- | --- | --- | --- |
| Mewtwo/x/85/2 | 31/23/17/8/8/23 | 8/9/0/0/0/6 → 8/5/0/0/0/5 | 31/31/31/31/31/31 | Jolly | 2/32/0/0/0/32 |
| Mewtwo/x/95/1 | 16/23/26/31/20/23 | 8/10/0/0/0/7 → 8/5/0/0/0/5 | 31/31/31/31/31/31 | Jolly | 2/32/0/0/0/32 |
| Mewtwo/y/85/0 | 16/6/31/23/7/23 | 8/0/0/9/0/6 → 8/0/0/5/0/5 | 31/31/31/31/31/31 | Timid | 2/0/0/32/0/32 |
| Mewtwo/y/95/5 | 16/18/12/23/31/23 | 8/0/0/10/0/7 → 8/0/0/5/0/5 | 31/31/31/31/31/31 | Timid | 2/0/0/32/0/32 |
| Groudon/primal/85/0 | 23/25/5/31/31/27 | 8/11/0/0/0/7 → 8/8/0/0/0/6 | 31/31/31/31/31/31 | Adamant | 2/32/0/0/0/32 |
| Groudon/primal/95/1 | 16/25/31/14/4/31 | 8/11/0/0/0/8 → 8/8/0/0/0/7 | 31/31/31/31/31/31 | Adamant | 2/32/0/0/0/32 |
| Kyogre/primal/85/0 | 16/31/9/24/31/2 | 8/0/0/11/0/7 → 8/0/0/7/0/6 | 31/31/31/31/31/31 | Modest | 2/0/0/32/0/32 |
| Kyogre/primal/95/1 | 31/31/7/24/23/17 | 8/0/0/11/0/8 → 8/0/0/8/0/6 | 31/31/31/31/31/31 | Modest | 2/0/0/32/0/32 |
| Rayquaza/mega/85/0 | 16/24/18/31/26/24 | 8/9/0/0/0/6 → 8/7/0/0/0/5 | 31/31/31/31/31/31 | Adamant | 2/32/0/0/0/32 |
| Rayquaza/mega/95/1 | 16/24/27/31/17/24 | 8/10/0/0/0/7 → 8/7/0/0/0/6 | 31/31/31/31/31/31 | Adamant | 2/32/0/0/0/32 |
| Zacian/crowned/85/0 | 27/21/25/29/31/21 | 8/11/0/0/0/7 → 8/5/0/0/0/5 | 31/31/31/31/31/31 | Adamant | 2/32/0/0/0/32 |
| Zacian/crowned/95/1 | 16/21/26/31/21/21 | 8/11/0/0/0/8 → 8/5/0/0/0/5 | 31/31/31/31/31/31 | Adamant | 2/32/0/0/0/32 |

## Lv50 final native stats

성격·포인트 반영 후, Phase entry rank와 공격 중 Bulk Up/Calm Mind/특성 boost 이전 값. 실제 버프는 JSON boosts 필드와 기존 엔진을 사용한다.

| Boss/Route/Floor | Phase / Form | HP/Atk/Def/SpA/SpD/Spe | Entry boosts |
| --- | --- | --- | --- |
| Mewtwo/x/85 | 1 Mewtwo | 189/131/103/146/99/166 | {} |
| Mewtwo/x/85 | 2 Mewtwo-Mega-X | 189/211/113/146/109/166 | {} |
| Mewtwo/x/85 | 3 Mewtwo-Mega-X | 189/211/113/146/109/166 | {"atk":1} |
| Mewtwo/x/95 | 1 Mewtwo | 182/131/108/156/105/166 | {} |
| Mewtwo/x/95 | 2 Mewtwo-Mega-X | 182/211/118/156/115/166 | {} |
| Mewtwo/x/95 | 3 Mewtwo-Mega-X | 182/211/118/156/115/166 | {"atk":1} |
| Mewtwo/y/85 | 1 Mewtwo | 182/106/110/175/98/166 | {} |
| Mewtwo/y/85 | 2 Mewtwo-Mega-Y | 182/142/90/215/128/177 | {} |
| Mewtwo/y/85 | 3 Mewtwo-Mega-Y | 182/142/90/215/128/177 | {"spa":1} |
| Mewtwo/y/95 | 1 Mewtwo | 182/111/101/175/110/166 | {} |
| Mewtwo/y/95 | 2 Mewtwo-Mega-Y | 182/147/81/215/140/177 | {} |
| Mewtwo/y/95 | 3 Mewtwo-Mega-Y | 182/147/81/215/140/177 | {"spa":1} |
| Groudon/primal/85 | 1 Groudon | 179/192/147/108/110/114 | {} |
| Groudon/primal/85 | 2 Groudon-Primal | 179/225/167/153/110/114 | {} |
| Groudon/primal/95 | 1 Groudon | 176/192/160/100/97/117 | {} |
| Groudon/primal/95 | 2 Groudon-Primal | 176/225/180/145/97/117 | {} |
| Kyogre/primal/85 | 1 Kyogre | 176/108/99/191/160/102 | {} |
| Kyogre/primal/85 | 2 Kyogre-Primal | 176/153/99/224/180/102 | {} |
| Kyogre/primal/95 | 1 Kyogre | 183/108/98/192/156/109 | {} |
| Kyogre/primal/95 | 2 Kyogre-Primal | 183/153/98/225/176/109 | {} |
| Rayquaza/mega/85 | 1 Rayquaza | 181/191/104/153/108/117 | {} |
| Rayquaza/mega/85 | 2 Rayquaza-Mega | 181/224/114/180/118/137 | {} |
| Rayquaza/mega/95 | 1 Rayquaza | 181/191/108/153/103/118 | {} |
| Rayquaza/mega/95 | 2 Rayquaza-Mega | 181/224/118/180/113/138 | {} |
| Zacian/crowned/85 | 1 Zacian | 173/154/132/89/135/158 | {} |
| Zacian/crowned/85 | 2 Zacian-Crowned | 173/187/132/89/135/168 | {} |
| Zacian/crowned/95 | 1 Zacian | 168/154/133/90/130/158 | {} |
| Zacian/crowned/95 | 2 Zacian-Crowned | 168/187/133/90/130/168 | {} |

## Mewtwo X/Y

| Route | Runs | Tune1 | Tune2 |
| --- | --- | --- | --- |
| x | 249 | 6.02% | 8.43% |
| y | 251 | 5.18% | 7.17% |

P3 Aura는 공격계+1을 유지하고 Speed+1만 제거했다. Phase 구조·메시지는 같다.

## Phase loss

Share는 해당 보스 전체 패배 중 각 Phase 비율이다. IV/육성/Aura를 함께 바꿨으므로 Speed 제거만의 독립 효과로 해석하지 않는다.

| Boss | Phase | Tune1 losses/share | Tune2 losses/share |
| --- | --- | --- | --- |
| Mewtwo | 1 | 35 / 7.42% | 33 / 7.16% |
| Mewtwo | 2 | 189 / 40.04% | 187 / 40.56% |
| Mewtwo | 3 | 248 / 52.54% | 241 / 52.28% |
| Zacian | 1 | 177 / 40.97% | 97 / 24.37% |
| Zacian | 2 | 255 / 59.03% | 301 / 75.63% |
| Rayquaza | 1 | 89 / 24.25% | 84 / 23.33% |
| Rayquaza | 2 | 278 / 75.75% | 276 / 76.67% |
| Kyogre | 1 | 69 / 19.38% | 58 / 16.96% |
| Kyogre | 2 | 287 / 80.62% | 284 / 83.04% |
| Groudon | 1 | 115 / 34.95% | 110 / 34.81% |
| Groudon | 2 | 214 / 65.05% | 206 / 65.19% |

## 검증과 다음 판단

- 변경하지 않은 15종의 정의와 7500개 전투 전체 row(IV/포인트/프로토콜/결과)가 baseline replay와 동일하다. baseline replay 승률도 기존 Tune1 20종과 일치한다.
- 모든 전투의 seed·층·팀·분기·reward IV/포인트/성격/종을 baseline replay와 비교했다. 이전 보고서 해시를 보존했다. 원시 battles.csv는 로컬 결과물이다.
- Mewtwo <20%: 해당. 다음 단계에서 P3 공격계+1 제거 검토 가능. 이번에는 유지.
- Zacian <25%: 해당. 다음 단계에서 Intrepid Sword/Crowned 진입 방식 검토 가능. 이번에는 유지.
- 목표값을 위한 반복 조정은 하지 않았다. 재실행: npm run raid:simulate:stats2 -- --runs 500. 비교용 baseline은 raid-stat-tuned-2-baseline.json에 정의·표본·전투별 해시로 보존한다. 원시 데이터는 .data에 보존한다.
