# NPC Rank · 컨셉 생성 검증

시드 [17,29,43,71], basic 룰. Rank는 비교용으로 명시했습니다. 평균 IV는 실제 팀 3마리의 18개 IV 평균, EV는 각 개체의 포인트입니다. 클래스 비율은 Normal/Elite/Master 순서입니다.

| 층 | Sample / Rank | 클래스 비율 | TeamConcept | 실제 타입 구성 | 평균 BST | 평균 IV | 개체별 EV | 도구 수 | fallback |
|---|---|---|---|---|---|---|---|---|---|
| 5 | 반바지 소년 / normal | 90.00 / 10.00 / 0.00 | Bug 3마리 | Bug/Dark · Bug/Flying · Bug | 408.00 | 4.78 | 2/2/2 | 0 | 없음 |
| 5 | 반바지 소년 / elite | 90.00 / 10.00 / 0.00 | Bug 3마리 | Bug/Steel · Bug/Flying · Bug/Psychic | 443.33 | 14.94 | 22/22/22 | 2 | 없음 |
| 5 | 낚시꾼 / normal | 85.00 / 15.00 / 0.00 | Water 3마리 | Water/Psychic · Water/Ground · Water/Ground | 461.00 | 4.78 | 2/2/2 | 0 | 없음 |
| 5 | 낚시꾼 / elite | 85.00 / 15.00 / 0.00 | Water 3마리 | Water/Ground · Water/Ice · Dragon/Water | 460.00 | 14.67 | 22/22/22 | 2 | 없음 |
| 5 | 태권왕 / normal | 30.00 / 65.00 / 5.00 | Fighting 3마리 | Grass/Fighting · Fighting · Fighting | 466.67 | 5.22 | 2/2/2 | 0 | 없음 |
| 5 | 태권왕 / elite | 30.00 / 65.00 / 5.00 | Fighting 3마리 | Fighting · Fighting · Grass/Fighting | 463.33 | 14.89 | 22/22/22 | 2 | 없음 |
| 5 | 초능력자 / normal | 25.00 / 60.00 / 15.00 | Psychic 3마리 | Water/Psychic · Psychic/Flying · Psychic/Flying | 457.67 | 5.00 | 2/2/2 | 0 | 없음 |
| 5 | 초능력자 / elite | 25.00 / 60.00 / 15.00 | Psychic 3마리 | Psychic/Flying · Psychic/Fairy · Water/Psychic | 469.33 | 15.06 | 22/22/22 | 2 | 없음 |
| 5 | 등산가 / normal | 75.00 / 25.00 / 0.00 | Rock/Ground 3마리 | Ground/Steel · Water/Ground · Ground/Electric | 457.33 | 4.78 | 2/2/2 | 0 | 없음 |
| 5 | 등산가 / elite | 75.00 / 25.00 / 0.00 | Rock/Ground 3마리 | Fire/Rock · Ground/Steel · Ground/Electric | 442.00 | 15.22 | 22/22/22 | 2 | 없음 |
| 5 | 에이스 트레이너 / elite | 0.00 / 70.00 / 30.00 | competitive | Fire/Rock · Bug/Poison · Water | 428.33 | 15.06 | 22/22/22 | 2 | 없음 |
| 5 | 에이스 트레이너 / master | 0.00 / 70.00 / 30.00 | competitive | Normal/Flying · Water/Grass · Fire/Ground | 470.00 | 21.22 | 45/45/45 | 3 | 없음 |
| 5 | 베테랑 / elite | 0.00 / 40.00 / 60.00 | competitive | Fire/Rock · Bug/Poison · Water | 428.33 | 15.06 | 22/22/22 | 2 | 없음 |
| 5 | 베테랑 / master | 0.00 / 40.00 / 60.00 | competitive | Normal/Flying · Water/Grass · Ghost/Fairy | 475.33 | 21.17 | 45/45/45 | 3 | 없음 |
| 20 | 반바지 소년 / normal | 90.00 / 10.00 / 0.00 | Bug 3마리 | Bug/Dark · Bug/Poison · Bug/Flying | 441.33 | 8.11 | 4/4/4 | 0 | 없음 |
| 20 | 반바지 소년 / elite | 90.00 / 10.00 / 0.00 | Bug 3마리 | Bug/Steel · Bug/Psychic · Bug/Grass | 490.00 | 17.50 | 25/25/25 | 2 | 없음 |
| 20 | 낚시꾼 / normal | 85.00 / 15.00 / 0.00 | Water 3마리 | Water/Psychic · Water/Electric · Water/Ground | 471.00 | 8.11 | 4/4/4 | 0 | 없음 |
| 20 | 낚시꾼 / elite | 85.00 / 15.00 / 0.00 | Water 3마리 | Rock/Water · Water/Poison · Dragon/Water | 495.00 | 17.06 | 25/25/25 | 2 | 없음 |
| 20 | 태권왕 / normal | 30.00 / 65.00 / 5.00 | Fighting 3마리 | Fighting · Fighting · Fighting/Dark | 480.00 | 8.22 | 4/4/4 | 0 | 없음 |
| 20 | 태권왕 / elite | 30.00 / 65.00 / 5.00 | Fighting 3마리 | Fighting · Flying/Fighting · Grass/Fighting | 478.33 | 17.22 | 25/25/25 | 2 | 없음 |
| 20 | 초능력자 / normal | 25.00 / 60.00 / 15.00 | Psychic 3마리 | Poison/Psychic · Water/Psychic · Psychic | 490.00 | 8.22 | 4/4/4 | 0 | 없음 |
| 20 | 초능력자 / elite | 25.00 / 60.00 / 15.00 | Psychic 3마리 | Water/Psychic · Psychic/Fairy · Psychic | 497.67 | 17.22 | 25/25/25 | 2 | 없음 |
| 20 | 등산가 / normal | 75.00 / 25.00 / 0.00 | Rock/Ground 3마리 | Rock/Electric · Steel/Ground · Bug/Rock | 496.67 | 8.33 | 4/4/4 | 0 | 없음 |
| 20 | 등산가 / elite | 75.00 / 25.00 / 0.00 | Rock/Ground 3마리 | Bug/Rock · Ice/Rock · Water/Rock | 504.67 | 17.17 | 25/25/25 | 2 | 없음 |
| 20 | 에이스 트레이너 / elite | 0.00 / 70.00 / 30.00 | competitive | Steel/Flying · Normal/Flying · Ground/Ghost | 475.67 | 17.33 | 25/25/25 | 2 | 없음 |
| 20 | 에이스 트레이너 / master | 0.00 / 70.00 / 30.00 | competitive | Ice/Rock · Water/Poison · Psychic/Fairy | 515.67 | 22.28 | 48/48/48 | 3 | 없음 |
| 20 | 베테랑 / elite | 0.00 / 40.00 / 60.00 | competitive | Steel/Flying · Ice/Rock · Ground/Ghost | 487.33 | 17.33 | 25/25/25 | 2 | 없음 |
| 20 | 베테랑 / master | 0.00 / 40.00 / 60.00 | competitive | Ice/Rock · Water/Poison · Psychic/Fairy | 515.67 | 22.28 | 48/48/48 | 3 | 없음 |
| 40 | 반바지 소년 / normal | 90.00 / 10.00 / 0.00 | Bug 3마리 | Bug/Dark · Bug/Steel · Bug/Grass | 471.67 | 14.11 | 6/6/6 | 1 | 없음 |
| 40 | 반바지 소년 / elite | 90.00 / 10.00 / 0.00 | Bug 3마리 | Bug/Steel · Bug/Flying · Bug/Steel | 463.33 | 20.22 | 30/30/30 | 2 | 없음 |
| 40 | 낚시꾼 / normal | 85.00 / 15.00 / 0.00 | Water 3마리 | Water · Rock/Water · Water | 495.00 | 13.61 | 6/6/6 | 1 | 없음 |
| 40 | 낚시꾼 / elite | 85.00 / 15.00 / 0.00 | Water 3마리 | Water · Electric/Water · Water/Dark | 524.33 | 20.17 | 30/30/30 | 2 | 없음 |
| 40 | 태권왕 / normal | 30.00 / 65.00 / 5.00 | Fighting 3마리 | Grass/Fighting · Fire/Fighting · Grass/Fighting | 513.33 | 14.17 | 6/6/6 | 1 | 없음 |
| 40 | 태권왕 / elite | 30.00 / 65.00 / 5.00 | Fighting 3마리 | Grass/Fighting · Fighting · Water/Fighting | 486.67 | 20.33 | 30/30/30 | 2 | 없음 |
| 40 | 초능력자 / normal | 25.00 / 60.00 / 15.00 | Psychic 3마리 | Poison/Psychic · Psychic · Psychic | 500.00 | 14.17 | 6/6/6 | 1 | 없음 |
| 40 | 초능력자 / elite | 25.00 / 60.00 / 15.00 | Psychic 3마리 | Psychic · Psychic/Fairy · Psychic/Flying | 517.67 | 20.17 | 30/30/30 | 2 | 없음 |
| 40 | 등산가 / normal | 75.00 / 25.00 / 0.00 | Rock/Ground 3마리 | Ground/Steel · Fire/Rock · Bug/Rock | 462.00 | 14.17 | 6/6/6 | 1 | 없음 |
| 40 | 등산가 / elite | 75.00 / 25.00 / 0.00 | Rock/Ground 3마리 | Water/Ground · Fire/Ground · Ground/Steel | 488.67 | 20.06 | 30/30/30 | 2 | 없음 |
| 40 | 에이스 트레이너 / elite | 0.00 / 70.00 / 30.00 | competitive | Water · Ground/Normal · Fire/Flying | 523.00 | 20.22 | 30/30/30 | 2 | 없음 |
| 40 | 에이스 트레이너 / master | 0.00 / 70.00 / 30.00 | competitive | Fire/Flying · Ground/Normal · Ice/Water | 539.67 | 24.28 | 52/52/52 | 3 | 없음 |
| 40 | 베테랑 / elite | 0.00 / 40.00 / 60.00 | competitive | Water · Ground/Normal · Fire/Flying | 523.00 | 20.22 | 30/30/30 | 2 | 없음 |
| 40 | 베테랑 / master | 0.00 / 40.00 / 60.00 | competitive | Fire/Flying · Ground/Normal · Ice/Water | 539.67 | 24.28 | 52/52/52 | 3 | 없음 |

## 실제 팀 상세

### 5층 반바지 소년 / normal

- Sample: youngster-balanced, concept: Bug 3마리, 테마 3/3, 후보 26종, fallback false, itemSlots 0
- Lokix (Bug/Dark): IV 7/2/7/6/5/6 · EV 1/1/0/0/0/0 · 없음 · First Impression, Throat Chop, Swords Dance, Lunge
- Ledian (Bug/Flying): IV 4/3/5/6/3/8 · EV 1/0/0/1/0/0 · 없음 · Bug Buzz, Air Slash, Uproar, Roost
- Kricketune (Bug): IV 2/0/7/3/4/8 · EV 1/1/0/0/0/0 · 없음 · Leech Life, Strength, Swords Dance, Frustration

### 5층 반바지 소년 / elite

- Sample: youngster-balanced, concept: Bug 3마리, 테마 3/3, 후보 26종, fallback false, itemSlots 2
- Forretress (Bug/Steel): IV 12/17/16/15/16/18 · EV 6/8/2/0/2/4 · Muscle Band · Lunge, Steel Beam, Hard Press, Toxic
- Butterfree (Bug/Flying): IV 15/16/13/18/12/11 · EV 6/0/2/8/2/4 · Wise Glasses · Bug Buzz, Hurricane, Silver Wind, Pollen Puff
- Rabsca (Bug/Psychic): IV 17/13/14/18/14/14 · EV 6/0/2/8/2/4 · 없음 · Bug Buzz, Future Sight, Sludge Bomb, Recover

### 5층 낚시꾼 / normal

- Sample: fisherman-bulk, concept: Water 3마리, 테마 3/3, 후보 30종, fallback false, itemSlots 0
- Veluza (Water/Psychic): IV 7/2/7/6/5/6 · EV 1/0/1/0/0/0 · 없음 · Liquidation, Psychic Fangs, Recover, Waterfall
- Quagsire (Water/Ground): IV 4/3/5/6/3/8 · EV 1/0/1/0/0/0 · 없음 · Liquidation, Stomping Tantrum, Recover, Aqua Tail
- Gastrodon (Water/Ground): IV 2/0/7/3/4/8 · EV 1/0/1/0/0/0 · 없음 · Surf, Stomping Tantrum, Recover, Sludge

### 5층 낚시꾼 / elite

- Sample: fisherman-bulk, concept: Water 3마리, 테마 3/3, 후보 30종, fallback false, itemSlots 2
- Quagsire (Water/Ground): IV 12/17/16/15/16/18 · EV 9/0/7/0/6/0 · Leftovers · Liquidation, Earthquake, Recover, Waterfall
- Dewgong (Water/Ice): IV 14/13/15/16/13/18 · EV 9/0/7/0/6/0 · Sitrus Berry · Surf, Ice Beam, Aqua Tail, Toxic
- Tatsugiri (Dragon/Water): IV 15/12/10/17/13/14 · EV 9/0/7/0/6/0 · 없음 · Draco Meteor, Surf, Take Down, Hydro Pump

### 5층 태권왕 / normal

- Sample: blackbelt-physical, concept: Fighting 3마리, 테마 3/3, 후보 12종, fallback false, itemSlots 0
- Lilligant-Hisui (Grass/Fighting): IV 7/6/5/6/8/7 · EV 0/1/0/0/0/1 · 없음 · Brick Break, Upper Hand, Low Sweep, Low Kick
- Hitmontop (Fighting): IV 5/6/3/8/2/1 · EV 0/1/0/0/0/1 · 없음 · Brick Break, Mega Punch, Drill Run, Low Sweep
- Throh (Fighting): IV 7/3/4/8/4/4 · EV 0/1/0/0/0/1 · 없음 · Brick Break, Stomping Tantrum, Revenge, Storm Throw

### 5층 태권왕 / elite

- Sample: blackbelt-physical, concept: Fighting 3마리, 테마 3/3, 후보 12종, fallback false, itemSlots 2
- Hitmontop (Fighting): IV 12/17/16/15/16/18 · EV 4/11/0/0/0/7 · Muscle Band · Close Combat, Double-Edge, Reversal, Seismic Toss
- Hitmonchan (Fighting): IV 15/16/13/18/12/11 · EV 4/11/0/0/0/7 · Expert Belt · Focus Punch, Double-Edge, Low Kick, Close Combat
- Lilligant-Hisui (Grass/Fighting): IV 13/14/18/14/14/16 · EV 4/11/0/0/0/7 · 없음 · Close Combat, Axe Kick, Petal Blizzard, Low Sweep

### 5층 초능력자 / normal

- Sample: psychic-setup, concept: Psychic 3마리, 테마 3/3, 후보 17종, fallback false, itemSlots 0
- Veluza (Water/Psychic): IV 7/2/7/6/5/6 · EV 0/1/0/0/0/1 · 없음 · Liquidation, Psychic Fangs, Recover, Waterfall
- Xatu (Psychic/Flying): IV 3/5/6/3/8/2 · EV 0/0/0/1/0/1 · 없음 · Expanding Force, Air Slash, Calm Mind, Psyshock
- Swoobat (Psychic/Flying): IV 7/3/4/8/4/4 · EV 0/0/0/1/0/1 · 없음 · Expanding Force, Air Slash, Nasty Plot, Heat Wave

### 5층 초능력자 / elite

- Sample: psychic-setup, concept: Psychic 3마리, 테마 3/3, 후보 17종, fallback false, itemSlots 2
- Xatu (Psychic/Flying): IV 17/16/15/16/18/17 · EV 4/0/0/11/0/7 · Lum Berry · Future Sight, Air Slash, Calm Mind, Air Cutter
- Mr. Mime (Psychic/Fairy): IV 16/13/18/12/11/12 · EV 4/0/0/11/0/7 · Wise Glasses · Future Sight, Dazzling Gleam, Nasty Plot, Psychic
- Veluza (Water/Psychic): IV 17/13/14/18/14/14 · EV 4/11/0/0/0/7 · 없음 · Liquidation, Psychic Fangs, Hydro Pump, Zen Headbutt

### 5층 등산가 / normal

- Sample: hiker-bulk, concept: Rock/Ground 3마리, 테마 3/3, 후보 22종, fallback false, itemSlots 0
- Stunfisk-Galar (Ground/Steel): IV 7/2/7/6/5/6 · EV 1/0/1/0/0/0 · 없음 · Flash Cannon, Stomping Tantrum, Thunder Wave, Earth Power
- Quagsire (Water/Ground): IV 4/3/5/6/3/8 · EV 1/0/1/0/0/0 · 없음 · Liquidation, Stomping Tantrum, Recover, Aqua Tail
- Stunfisk (Ground/Electric): IV 2/0/7/3/4/8 · EV 1/0/1/0/0/0 · 없음 · Earth Power, Thunderbolt, Thunder Wave, Uproar

### 5층 등산가 / elite

- Sample: hiker-bulk, concept: Rock/Ground 3마리, 테마 3/3, 후보 22종, fallback false, itemSlots 2
- Magcargo (Fire/Rock): IV 17/16/15/16/18/17 · EV 9/0/7/0/6/0 · Leftovers · Overheat, Power Gem, Recover, Flame Burst
- Dugtrio-Alola (Ground/Steel): IV 15/16/13/18/12/11 · EV 9/0/7/0/6/0 · Sitrus Berry · Earthquake, High Horsepower, Foul Play, Iron Head
- Stunfisk (Ground/Electric): IV 17/13/14/18/14/14 · EV 9/0/7/0/6/0 · 없음 · Earth Power, Thunderbolt, Uproar, Toxic

### 5층 에이스 트레이너 / elite

- Sample: ace-setup, concept: competitive, 테마 0/0, 후보 0종, fallback false, itemSlots 2
- Magcargo (Fire/Rock): IV 17/16/15/16/18/17 · EV 4/0/0/11/0/7 · Lum Berry · Overheat, Power Gem, Shell Smash, Flame Burst
- Beedrill (Bug/Poison): IV 16/13/18/12/11/12 · EV 4/11/0/0/0/7 · Muscle Band · X-Scissor, Poison Jab, Swords Dance, Facade
- Basculin (Water): IV 17/13/14/18/14/14 · EV 4/11/0/0/0/7 · 없음 · Wave Crash, Double-Edge, Scald, Thrash

### 5층 에이스 트레이너 / master

- Sample: ace-setup, concept: competitive, 테마 0/0, 후보 0종, fallback false, itemSlots 3
- Dodrio (Normal/Flying): IV 23/22/21/22/24/23 · EV 9/23/0/0/0/13 · Focus Sash · Double-Edge, Brave Bird, Swords Dance, Frustration
- Ludicolo (Water/Grass): IV 21/22/19/24/18/17 · EV 9/0/0/23/0/13 · Lum Berry · Surf, Leaf Storm, Swords Dance, Giga Drain
- Camerupt (Fire/Ground): IV 23/19/20/24/20/20 · EV 9/0/0/23/0/13 · Life Orb · Eruption, Earthquake, Stomping Tantrum, Toxic

### 5층 베테랑 / elite

- Sample: veteran-balanced, concept: competitive, 테마 0/0, 후보 0종, fallback false, itemSlots 2
- Magcargo (Fire/Rock): IV 17/16/15/16/18/17 · EV 6/0/2/8/2/4 · Wise Glasses · Overheat, Power Gem, Flame Burst, Burning Jealousy
- Beedrill (Bug/Poison): IV 16/13/18/12/11/12 · EV 6/8/2/0/2/4 · Muscle Band · X-Scissor, Poison Jab, Outrage, Facade
- Basculin (Water): IV 17/13/14/18/14/14 · EV 6/8/2/0/2/4 · 없음 · Wave Crash, Double-Edge, Scald, Thrash

### 5층 베테랑 / master

- Sample: veteran-balanced, concept: competitive, 테마 0/0, 후보 0종, fallback false, itemSlots 3
- Dodrio (Normal/Flying): IV 23/22/21/22/24/23 · EV 12/17/4/0/4/8 · Life Orb · Double-Edge, Brave Bird, Frustration, Flail
- Ludicolo (Water/Grass): IV 21/22/19/24/18/17 · EV 12/0/4/17/4/8 · Wise Glasses · Surf, Leaf Storm, Giga Drain, Energy Ball
- Mimikyu (Ghost/Fairy): IV 19/20/24/20/20/22 · EV 12/17/4/0/4/8 · Muscle Band · Shadow Claw, Play Rough, Swords Dance, Leech Life

### 20층 반바지 소년 / normal

- Sample: youngster-balanced, concept: Bug 3마리, 테마 3/3, 후보 42종, fallback false, itemSlots 0
- Lokix (Bug/Dark): IV 10/6/10/9/9/9 · EV 1/2/0/0/0/1 · 없음 · First Impression, Throat Chop, Swords Dance, Lunge
- Ariados (Bug/Poison): IV 8/6/9/9/6/11 · EV 1/2/0/0/0/1 · 없음 · Leech Life, Poison Jab, X-Scissor, Swords Dance
- Vespiquen (Bug/Flying): IV 5/4/10/6/8/11 · EV 1/2/0/0/0/1 · 없음 · Attack Order, Air Slash, Roost, Aerial Ace

### 20층 반바지 소년 / elite

- Sample: youngster-balanced, concept: Bug 3마리, 테마 3/3, 후보 42종, fallback false, itemSlots 2
- Scizor (Bug/Steel): IV 19/18/18/18/20/19 · EV 7/10/2/0/2/4 · Muscle Band · Bullet Punch, X-Scissor, Hard Press, Double-Edge
- Rabsca (Bug/Psychic): IV 18/18/15/20/15/14 · EV 7/0/2/10/2/4 · Wise Glasses · Bug Buzz, Future Sight, Psybeam, Psychic
- Leavanny (Bug/Grass): IV 19/15/17/20/16/16 · EV 7/10/2/0/2/4 · 없음 · Lunge, Leaf Blade, Poison Jab, Toxic

### 20층 낚시꾼 / normal

- Sample: fisherman-bulk, concept: Water 3마리, 테마 3/3, 후보 57종, fallback false, itemSlots 0
- Veluza (Water/Psychic): IV 10/6/10/9/9/9 · EV 2/0/1/0/1/0 · 없음 · Liquidation, Psychic Fangs, Recover, Waterfall
- Lanturn (Water/Electric): IV 8/6/9/9/6/11 · EV 2/0/1/0/1/0 · 없음 · Surf, Thunderbolt, Scald, Thunder Wave
- Gastrodon (Water/Ground): IV 5/4/10/6/8/11 · EV 2/0/1/0/1/0 · 없음 · Surf, Stomping Tantrum, Recover, Sludge

### 20층 낚시꾼 / elite

- Sample: fisherman-bulk, concept: Water 3마리, 테마 3/3, 후보 57종, fallback false, itemSlots 2
- Kabutops (Rock/Water): IV 15/19/18/18/18/20 · EV 10/0/8/0/7/0 · Leftovers · Stone Edge, Liquidation, Double-Edge, Toxic
- Tentacruel (Water/Poison): IV 17/15/18/18/15/20 · EV 10/0/8/0/7/0 · Sitrus Berry · Surf, Sludge Wave, Gunk Shot, Toxic
- Tatsugiri (Dragon/Water): IV 18/14/13/19/15/17 · EV 10/0/8/0/7/0 · 없음 · Draco Meteor, Surf, Take Down, Hydro Pump

### 20층 태권왕 / normal

- Sample: blackbelt-physical, concept: Fighting 3마리, 테마 3/3, 후보 29종, fallback false, itemSlots 0
- Tauros-Paldea-Combat (Fighting): IV 10/6/10/9/9/9 · EV 1/2/0/0/0/1 · 없음 · Close Combat, Body Press, Facade, Reversal
- Hitmontop (Fighting): IV 8/6/9/9/6/11 · EV 1/2/0/0/0/1 · 없음 · Brick Break, Mega Punch, Low Kick, Drill Run
- Pangoro (Fighting/Dark): IV 4/10/6/8/11/7 · EV 1/2/0/0/0/1 · 없음 · Brick Break, Crunch, Dragon Claw, Drain Punch

### 20층 태권왕 / elite

- Sample: blackbelt-physical, concept: Fighting 3마리, 테마 3/3, 후보 29종, fallback false, itemSlots 2
- Hitmontop (Fighting): IV 15/19/18/18/18/20 · EV 5/13/0/0/0/7 · Muscle Band · Close Combat, Double-Edge, Reversal, Seismic Toss
- Flamigo (Flying/Fighting): IV 18/18/15/20/15/14 · EV 5/13/0/0/0/7 · Expert Belt · Brave Bird, Close Combat, Mega Kick, Low Kick
- Lilligant-Hisui (Grass/Fighting): IV 15/17/20/16/16/18 · EV 5/13/0/0/0/7 · 없음 · Close Combat, Axe Kick, Petal Blizzard, Low Sweep

### 20층 초능력자 / normal

- Sample: psychic-setup, concept: Psychic 3마리, 테마 3/3, 후보 42종, fallback false, itemSlots 0
- Slowking-Galar (Poison/Psychic): IV 10/9/9/9/11/10 · EV 1/0/0/2/0/1 · 없음 · Eerie Spell, Venoshock, Nasty Plot, Psychic Noise
- Slowking (Water/Psychic): IV 9/6/11/6/5/6 · EV 1/0/0/2/0/1 · 없음 · Surf, Expanding Force, Nasty Plot, Psychic
- Reuniclus (Psychic): IV 8/11/7/7/9/5 · EV 1/0/0/2/0/1 · 없음 · Expanding Force, Energy Ball, Calm Mind, Psybeam

### 20층 초능력자 / elite

- Sample: psychic-setup, concept: Psychic 3마리, 테마 3/3, 후보 42종, fallback false, itemSlots 2
- Slowking (Water/Psychic): IV 19/18/18/18/20/19 · EV 5/0/0/13/0/7 · Lum Berry · Surf, Future Sight, Nasty Plot, Muddy Water
- Gardevoir (Psychic/Fairy): IV 18/15/20/15/14/15 · EV 5/0/0/13/0/7 · Wise Glasses · Future Sight, Moonblast, Calm Mind, Synchronoise
- Beheeyem (Psychic): IV 17/20/16/16/18/14 · EV 5/0/0/13/0/7 · 없음 · Future Sight, Energy Ball, Nasty Plot, Psybeam

### 20층 등산가 / normal

- Sample: hiker-bulk, concept: Rock/Ground 3마리, 테마 3/3, 후보 60종, fallback false, itemSlots 0
- Golem-Alola (Rock/Electric): IV 6/10/9/9/9/11 · EV 2/0/1/0/1/0 · 없음 · Body Press, Spark, Thunder Punch, Toxic
- Steelix (Steel/Ground): IV 6/9/9/6/11/6 · EV 2/0/1/0/1/0 · 없음 · Iron Head, Stomping Tantrum, Toxic, Drill Run
- Crustle (Bug/Rock): IV 10/6/8/11/7/7 · EV 2/0/1/0/1/0 · 없음 · X-Scissor, Rock Slide, Stomping Tantrum, Shell Smash

### 20층 등산가 / elite

- Sample: hiker-bulk, concept: Rock/Ground 3마리, 테마 3/3, 후보 60종, fallback false, itemSlots 2
- Shuckle (Bug/Rock): IV 15/19/18/18/18/20 · EV 10/0/8/0/7/0 · Leftovers · Skitter Smack, Stone Edge, Earthquake, Toxic
- Avalugg-Hisui (Ice/Rock): IV 15/18/18/15/20/15 · EV 10/0/8/0/7/0 · Sitrus Berry · Mountain Gale, Double-Edge, Recover, Earthquake
- Carracosta (Water/Rock): IV 13/19/15/17/20/16 · EV 10/0/8/0/7/0 · 없음 · Liquidation, Stone Edge, Toxic, Hydro Pump

### 20층 에이스 트레이너 / elite

- Sample: ace-setup, concept: competitive, 테마 0/0, 후보 0종, fallback false, itemSlots 2
- Skarmory (Steel/Flying): IV 19/18/18/18/20/19 · EV 5/13/0/0/0/7 · Lum Berry · Iron Head, Brave Bird, Swords Dance, Pluck
- Pidgeot (Normal/Flying): IV 18/18/15/20/15/14 · EV 5/13/0/0/0/7 · Muscle Band · Double-Edge, Heat Wave, Return, Frustration
- Golurk (Ground/Ghost): IV 13/19/15/17/20/16 · EV 5/13/0/0/0/7 · 없음 · Earthquake, Poltergeist, Close Combat, Toxic

### 20층 에이스 트레이너 / master

- Sample: ace-setup, concept: competitive, 테마 0/0, 후보 0종, fallback false, itemSlots 3
- Avalugg-Hisui (Ice/Rock): IV 20/24/23/23/23/25 · EV 10/24/0/0/0/14 · Focus Sash · Mountain Gale, Double-Edge, Earthquake, Toxic
- Tentacruel (Water/Poison): IV 22/20/23/23/20/25 · EV 10/0/0/24/0/14 · Lum Berry · Surf, Sludge Wave, Swords Dance, Gunk Shot
- Gardevoir (Psychic/Fairy): IV 18/24/20/22/25/21 · EV 10/0/0/24/0/14 · Life Orb · Future Sight, Moonblast, Calm Mind, Psyshock

### 20층 베테랑 / elite

- Sample: veteran-balanced, concept: competitive, 테마 0/0, 후보 0종, fallback false, itemSlots 2
- Skarmory (Steel/Flying): IV 19/18/18/18/20/19 · EV 7/10/2/0/2/4 · Muscle Band · Iron Head, Brave Bird, Pluck, Aerial Ace
- Avalugg-Hisui (Ice/Rock): IV 18/18/15/20/15/14 · EV 7/10/2/0/2/4 · Expert Belt · Mountain Gale, Double-Edge, High Horsepower, Ice Spinner
- Golurk (Ground/Ghost): IV 13/19/15/17/20/16 · EV 7/10/2/0/2/4 · 없음 · Earthquake, Poltergeist, Close Combat, Toxic

### 20층 베테랑 / master

- Sample: veteran-balanced, concept: competitive, 테마 0/0, 후보 0종, fallback false, itemSlots 3
- Avalugg-Hisui (Ice/Rock): IV 20/24/23/23/23/25 · EV 13/18/4/0/4/9 · Life Orb · Mountain Gale, Double-Edge, Earthquake, Toxic
- Tentacruel (Water/Poison): IV 22/20/23/23/20/25 · EV 13/0/4/18/4/9 · Wise Glasses · Surf, Sludge Wave, Gunk Shot, Toxic
- Gardevoir (Psychic/Fairy): IV 18/24/20/22/25/21 · EV 13/0/4/18/4/9 · Focus Sash · Future Sight, Moonblast, Will-O-Wisp, Psyshock

### 40층 반바지 소년 / normal

- Sample: youngster-balanced, concept: Bug 3마리, 테마 3/3, 후보 45종, fallback false, itemSlots 1
- Lokix (Bug/Dark): IV 15/12/16/15/14/15 · EV 2/3/0/0/0/1 · Sitrus Berry · First Impression, Throat Chop, Swords Dance, Lunge
- Forretress (Bug/Steel): IV 14/13/14/15/13/16 · EV 2/3/0/0/0/1 · 없음 · Lunge, Flash Cannon, Gyro Ball, Thunder Wave
- Leavanny (Bug/Grass): IV 12/11/16/13/14/16 · EV 2/3/0/0/0/1 · 없음 · Lunge, Leaf Blade, Swords Dance, Poison Jab

### 40층 반바지 소년 / elite

- Sample: youngster-balanced, concept: Bug 3마리, 테마 3/3, 후보 45종, fallback false, itemSlots 2
- Scizor (Bug/Steel): IV 22/21/20/21/22/22 · EV 9/12/2/0/2/5 · Muscle Band · Bullet Punch, X-Scissor, Hard Press, Double-Edge
- Butterfree (Bug/Flying): IV 21/19/22/18/18/18 · EV 9/0/3/11/2/5 · Wise Glasses · Bug Buzz, Hurricane, Pollen Puff, Quiver Dance
- Escavalier (Bug/Steel): IV 19/20/22/19/19/21 · EV 9/12/2/0/2/5 · 없음 · Megahorn, Iron Head, Swords Dance, X-Scissor

### 40층 낚시꾼 / normal

- Sample: fisherman-bulk, concept: Water 3마리, 테마 3/3, 후보 77종, fallback false, itemSlots 1
- Dondozo (Water): IV 14/15/12/16/15/14 · EV 2/0/2/0/2/0 · Sitrus Berry · Waterfall, Facade, Body Press, Order Up
- Kabutops (Rock/Water): IV 13/14/13/14/15/13 · EV 2/0/2/0/2/0 · 없음 · Rock Slide, Liquidation, Facade, Body Slam
- Lumineon (Water): IV 11/14/12/11/16/13 · EV 2/0/2/0/2/0 · 없음 · Surf, Ice Beam, Waterfall, Scald

### 40층 낚시꾼 / elite

- Sample: fisherman-bulk, concept: Water 3마리, 테마 3/3, 후보 77종, fallback false, itemSlots 2
- Vaporeon (Water): IV 18/22/21/20/21/22 · EV 12/0/9/0/9/0 · Leftovers · Surf, Synchronoise, Brine, Toxic
- Rotom-Wash (Electric/Water): IV 20/21/19/22/18/18 · EV 12/0/9/0/9/0 · Sitrus Berry · Hydro Pump, Thunderbolt, Hyper Voice, Discharge
- Samurott-Hisui (Water/Dark): IV 22/19/20/22/19/19 · EV 12/0/9/0/9/0 · 없음 · Liquidation, Surf, Razor Shell, Toxic

### 40층 태권왕 / normal

- Sample: blackbelt-physical, concept: Fighting 3마리, 테마 3/3, 후보 37종, fallback false, itemSlots 1
- Lilligant-Hisui (Grass/Fighting): IV 16/15/14/15/16/16 · EV 1/3/0/0/0/2 · Sitrus Berry · Brick Break, Upper Hand, Low Sweep, Low Kick
- Blaziken (Fire/Fighting): IV 15/13/16/12/12/12 · EV 1/3/0/0/0/2 · 없음 · Fire Punch, Brick Break, Low Sweep, Upper Hand
- Chesnaught (Grass/Fighting): IV 14/16/13/13/15/12 · EV 1/3/0/0/0/2 · 없음 · Seed Bomb, Drain Punch, Body Press, Brick Break

### 40층 태권왕 / elite

- Sample: blackbelt-physical, concept: Fighting 3마리, 테마 3/3, 후보 37종, fallback false, itemSlots 2
- Breloom (Grass/Fighting): IV 22/21/20/21/22/22 · EV 6/15/0/0/0/9 · Muscle Band · Seed Bomb, Focus Punch, Double-Edge, Drain Punch
- Tauros-Paldea-Combat (Fighting): IV 19/20/21/19/22/18 · EV 6/15/0/0/0/9 · Expert Belt · Close Combat, Body Press, Reversal, Raging Bull
- Poliwrath (Water/Fighting): IV 17/22/19/20/22/19 · EV 6/15/0/0/0/9 · 없음 · Liquidation, Focus Punch, Double-Edge, Close Combat

### 40층 초능력자 / normal

- Sample: psychic-setup, concept: Psychic 3마리, 테마 3/3, 후보 47종, fallback false, itemSlots 1
- Slowking-Galar (Poison/Psychic): IV 16/15/14/15/16/16 · EV 1/0/0/3/0/2 · Sitrus Berry · Eerie Spell, Venoshock, Nasty Plot, Psychic Noise
- Espeon (Psychic): IV 15/13/16/12/12/12 · EV 1/0/0/3/0/2 · 없음 · Psychic, Shadow Ball, Calm Mind, Expanding Force
- Beheeyem (Psychic): IV 14/16/13/13/15/12 · EV 1/0/0/3/0/2 · 없음 · Expanding Force, Energy Ball, Nasty Plot, Psybeam

### 40층 초능력자 / elite

- Sample: psychic-setup, concept: Psychic 3마리, 테마 3/3, 후보 47종, fallback false, itemSlots 2
- Espeon (Psychic): IV 22/21/20/21/22/22 · EV 6/0/0/15/0/9 · Lum Berry · Psychic, Shadow Ball, Calm Mind, Psybeam
- Gardevoir (Psychic/Fairy): IV 21/19/22/18/18/18 · EV 6/0/0/15/0/9 · Wise Glasses · Future Sight, Moonblast, Calm Mind, Synchronoise
- Braviary-Hisui (Psychic/Flying): IV 20/22/19/19/21/18 · EV 6/0/0/15/0/9 · 없음 · Future Sight, Psychic, Calm Mind, Hurricane

### 40층 등산가 / normal

- Sample: hiker-bulk, concept: Rock/Ground 3마리, 테마 3/3, 후보 72종, fallback false, itemSlots 1
- Stunfisk-Galar (Ground/Steel): IV 15/12/16/15/14/15 · EV 2/0/2/0/2/0 · Sitrus Berry · Flash Cannon, Stomping Tantrum, Thunder Wave, Earth Power
- Magcargo (Fire/Rock): IV 13/14/15/13/16/12 · EV 2/0/2/0/2/0 · 없음 · Burning Jealousy, Power Gem, Recover, Lava Plume
- Crustle (Bug/Rock): IV 16/13/14/16/13/13 · EV 2/0/2/0/2/0 · 없음 · X-Scissor, Rock Slide, Stomping Tantrum, Shell Smash

### 40층 등산가 / elite

- Sample: hiker-bulk, concept: Rock/Ground 3마리, 테마 3/3, 후보 72종, fallback false, itemSlots 2
- Swampert (Water/Ground): IV 18/22/21/20/21/22 · EV 12/0/9/0/9/0 · Leftovers · Liquidation, Earthquake, Outrage, Toxic
- Camerupt (Fire/Ground): IV 19/20/21/19/22/18 · EV 12/0/9/0/9/0 · Sitrus Berry · Eruption, Earthquake, Toxic, Earth Power
- Stunfisk-Galar (Ground/Steel): IV 18/17/22/19/20/22 · EV 12/0/9/0/9/0 · 없음 · Steel Beam, Earthquake, Thunder Wave, Lash Out

### 40층 에이스 트레이너 / elite

- Sample: ace-setup, concept: competitive, 테마 0/0, 후보 0종, fallback false, itemSlots 2
- Octillery (Water): IV 18/22/21/20/21/22 · EV 6/15/0/0/0/9 · Lum Berry · Water Spout, Double-Edge, Scald, Toxic
- Ursaluna-Bloodmoon (Ground/Normal): IV 20/19/20/21/19/22 · EV 6/0/0/15/0/9 · Wise Glasses · Blood Moon, Earth Power, Swords Dance, Tera Blast
- Charizard (Fire/Flying): IV 17/22/19/20/22/19 · EV 6/0/0/15/0/9 · 없음 · Flamethrower, Air Slash, Dragon Dance, Focus Punch

### 40층 에이스 트레이너 / master

- Sample: ace-setup, concept: competitive, 테마 0/0, 후보 0종, fallback false, itemSlots 3
- Charizard (Fire/Flying): IV 26/25/24/25/26/26 · EV 10/0/0/26/0/16 · Focus Sash · Flamethrower, Air Slash, Dragon Dance, Focus Punch
- Ursaluna-Bloodmoon (Ground/Normal): IV 23/24/25/23/26/22 · EV 10/0/0/26/0/16 · Lum Berry · Blood Moon, Earth Power, Swords Dance, Moonblast
- Walrein (Ice/Water): IV 22/21/26/23/24/26 · EV 10/0/0/26/0/16 · Life Orb · Ice Beam, Surf, Swords Dance, Double-Edge

### 40층 베테랑 / elite

- Sample: veteran-balanced, concept: competitive, 테마 0/0, 후보 0종, fallback false, itemSlots 2
- Octillery (Water): IV 18/22/21/20/21/22 · EV 9/12/2/0/2/5 · Wise Glasses · Water Spout, Double-Edge, Scald, Toxic
- Ursaluna-Bloodmoon (Ground/Normal): IV 20/19/20/21/19/22 · EV 9/0/3/11/2/5 · Expert Belt · Blood Moon, Earth Power, Tera Blast, Calm Mind
- Charizard (Fire/Flying): IV 17/22/19/20/22/19 · EV 9/0/3/11/2/5 · 없음 · Flamethrower, Air Slash, Roost, Focus Punch

### 40층 베테랑 / master

- Sample: veteran-balanced, concept: competitive, 테마 0/0, 후보 0종, fallback false, itemSlots 3
- Charizard (Fire/Flying): IV 26/25/24/25/26/26 · EV 15/0/5/19/4/9 · Life Orb · Flamethrower, Air Slash, Focus Punch, Fire Pledge
- Ursaluna-Bloodmoon (Ground/Normal): IV 23/24/25/23/26/22 · EV 15/0/5/19/4/9 · Wise Glasses · Blood Moon, Earth Power, Calm Mind, Moonblast
- Walrein (Ice/Water): IV 22/21/26/23/24/26 · EV 15/0/5/19/4/9 · Focus Sash · Ice Beam, Surf, Toxic, Double-Edge

## 공통 Sample 전체 목록

| ID | 표시명 | sprite | tactic | TeamConcept | 클래스 N/E/M % | minFloor | weight | pool |
|---|---|---|---|---|---|---|---|---|
| youngster-balanced | 반바지 소년 | youngster-gen4 | balanced | Bug 3마리 | 90.00 / 10.00 / 0.00 | 1 | 22 | normal, challenger |
| lass-special | 아가씨 | lass-gen3 | special | mixed-theme | 85.00 / 15.00 / 0.00 | 1 | 20 | normal, challenger |
| hiker-bulk | 등산가 | hiker-gen4 | bulk | Rock/Ground 3마리 | 75.00 / 25.00 / 0.00 | 1 | 18 | normal, challenger |
| breeder-balanced | 포켓몬 브리더 | pokemonbreeder-gen3 | balanced | mixed-theme | 90.00 / 10.00 / 0.00 | 1 | 22 | normal, challenger |
| gentleman-balanced | 신사 | gentleman-gen4 | balanced | mixed-theme | 70.00 / 30.00 / 0.00 | 1 | 18 | normal, challenger |
| blackbelt-physical | 태권왕 | blackbelt-gen4 | physical | Fighting 3마리 | 30.00 / 65.00 / 5.00 | 1 | 16 | normal, challenger |
| scientist-status | 연구원 | scientist-gen4 | status | Poison 3마리 | 35.00 / 60.00 / 5.00 | 1 | 14 | normal, challenger |
| scientist-special | 연구원 | scientist-gen4 | special | Electric 3마리 | 30.00 / 60.00 / 10.00 | 1 | 14 | normal, challenger |
| ranger-speed | 레인저 | pokemonranger-gen3 | speed | mixed-theme | 15.00 / 75.00 / 10.00 | 1 | 14 | normal, challenger |
| ace-setup | 에이스 트레이너 | acetrainer-gen4 | setup | competitive | 0.00 / 70.00 / 30.00 | 1 | 12 | normal, challenger |
| ace-physical | 에이스 트레이너 | acetrainer-gen4 | physical | competitive | 0.00 / 70.00 / 30.00 | 1 | 12 | normal, challenger |
| veteran-balanced | 베테랑 | veteran-gen4 | balanced | competitive | 0.00 / 40.00 / 60.00 | 5 | 10 | normal, challenger |
| veteran-bulk | 베테랑 | veteran-gen4 | bulk | competitive | 0.00 / 40.00 / 60.00 | 5 | 10 | normal, challenger |
| backpacker-speed | 여행자 | backpacker | speed | mixed-theme | 85.00 / 15.00 / 0.00 | 1 | 18 | normal, challenger |
| schoolkid-balanced | 학생 | schoolkid-gen4 | balanced | mixed-theme | 90.00 / 10.00 / 0.00 | 1 | 20 | normal, challenger |
| psychic-setup | 초능력자 | psychic-gen4 | setup | Psychic 3마리 | 25.00 / 60.00 / 15.00 | 3 | 12 | normal, challenger |
| beauty-special | 아로마 아가씨 | aromalady-gen4 | special | Grass 3마리 | 85.00 / 15.00 / 0.00 | 1 | 16 | normal, challenger |
| fisherman-bulk | 낚시꾼 | fisherman-gen4 | bulk | Water 3마리 | 85.00 / 15.00 / 0.00 | 1 | 18 | normal, challenger |
| worker-physical | 작업원 | worker-gen4 | physical | Steel 3마리 | 35.00 / 60.00 / 5.00 | 3 | 14 | normal, challenger |
| collector-status | 포켓몬 수집가 | collector | status | Bug 3마리 | 80.00 / 20.00 / 0.00 | 1 | 14 | normal, challenger |

## 클래스별 최종 Rank 확률

정규화: 클래스 확률 × 일반층 prior 또는 도전자 prior. 0은 유지합니다. 도전자 prior는 50/42/8이며 실제 최종 비율은 클래스마다 달라집니다.

| Sample | 일반 5층 N/E/M % | 일반 20층 N/E/M % | 일반 40층 N/E/M % | 도전자 N/E/M % |
|---|---|---|---|---|
| youngster-balanced | 98.89 / 1.11 / 0.00 | 97.10 / 2.90 / 0.00 | 94.37 / 5.63 / 0.00 | 91.46 / 8.54 / 0.00 |
| lass-special | 98.25 / 1.75 / 0.00 | 95.46 / 4.54 / 0.00 | 91.34 / 8.66 / 0.00 | 87.09 / 12.91 / 0.00 |
| hiker-bulk | 96.74 / 3.26 / 0.00 | 91.76 / 8.24 / 0.00 | 84.81 / 15.19 / 0.00 | 78.13 / 21.88 / 0.00 |
| breeder-balanced | 98.89 / 1.11 / 0.00 | 97.10 / 2.90 / 0.00 | 94.37 / 5.63 / 0.00 | 91.46 / 8.54 / 0.00 |
| gentleman-balanced | 95.85 / 4.15 / 0.00 | 89.66 / 10.34 / 0.00 | 81.28 / 18.72 / 0.00 | 73.53 / 26.47 / 0.00 |
| blackbelt-physical | 82.01 / 17.96 / 0.03 | 63.07 / 36.79 / 0.13 | 46.00 / 53.55 / 0.45 | 35.13 / 63.93 / 0.94 |
| scientist-status | 85.21 / 14.76 / 0.03 | 68.34 / 31.54 / 0.13 | 51.83 / 47.74 / 0.43 | 40.60 / 58.47 / 0.93 |
| scientist-special | 83.13 / 16.80 / 0.06 | 64.82 / 34.90 / 0.28 | 47.76 / 51.31 / 0.93 | 36.59 / 61.46 / 1.95 |
| ranger-speed | 66.37 / 33.53 / 0.10 | 42.47 / 57.17 / 0.36 | 26.84 / 72.11 / 1.05 | 18.84 / 79.15 / 2.01 |
| ace-setup | 0.00 / 99.02 / 0.98 | 0.00 / 98.00 / 2.00 | 0.00 / 95.54 / 4.46 | 0.00 / 92.45 / 7.55 |
| ace-physical | 0.00 / 99.02 / 0.98 | 0.00 / 98.00 / 2.00 | 0.00 / 95.54 / 4.46 | 0.00 / 92.45 / 7.55 |
| veteran-balanced | 0.00 / 96.67 / 3.33 | 0.00 / 93.33 / 6.67 | 0.00 / 85.96 / 14.04 | 0.00 / 77.78 / 22.22 |
| veteran-bulk | 0.00 / 96.67 / 3.33 | 0.00 / 93.33 / 6.67 | 0.00 / 85.96 / 14.04 | 0.00 / 77.78 / 22.22 |
| backpacker-speed | 98.25 / 1.75 / 0.00 | 95.46 / 4.54 / 0.00 | 91.34 / 8.66 / 0.00 | 87.09 / 12.91 / 0.00 |
| schoolkid-balanced | 98.89 / 1.11 / 0.00 | 97.10 / 2.90 / 0.00 | 94.37 / 5.63 / 0.00 | 91.46 / 8.54 / 0.00 |
| psychic-setup | 80.39 / 19.50 / 0.11 | 60.47 / 39.07 / 0.47 | 43.02 / 55.47 / 1.51 | 32.13 / 64.78 / 3.08 |
| beauty-special | 98.25 / 1.75 / 0.00 | 95.46 / 4.54 / 0.00 | 91.34 / 8.66 / 0.00 | 87.09 / 12.91 / 0.00 |
| fisherman-bulk | 98.25 / 1.75 / 0.00 | 95.46 / 4.54 / 0.00 | 91.34 / 8.66 / 0.00 | 87.09 / 12.91 / 0.00 |
| worker-physical | 85.21 / 14.76 / 0.03 | 68.34 / 31.54 / 0.13 | 51.83 / 47.74 / 0.43 | 40.60 / 58.47 / 0.93 |
| collector-status | 97.54 / 2.46 / 0.00 | 93.69 / 6.31 / 0.00 | 88.16 / 11.84 / 0.00 | 82.64 / 17.36 / 0.00 |

## 후보 부족 fallback 재현

5층 실제 풀의 부분집합으로 Bug 후보를 2종만 남긴 QA fixture입니다.

- 입력: Butterfree, Beedrill, Pidgeot, Raticate, Fearow, Arbok
- 출력: Beedrill, Fearow, Butterfree
- 테마 2/3, available 2, fallback true. 상위 층 종은 추가하지 않았습니다.
