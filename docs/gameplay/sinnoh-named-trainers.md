# 신오 필수 NPC 샘플

2026-10-18. **신오 필수 NPC 샘플 완료**. 관장 8명, 사천왕 4명, 난천, 조직 공용 조무래기, 마스·주피터·새턴, 태홍: 18개 정의. 용식·다른 라이벌·마박사·프런티어·특수 조우는 제외한다.

## 데이터와 적용

`src/data/sinnoh-trainers.ts` → catalog/조직 등록; `scripts/review-sinnoh-npc-samples.ts` → 검토 원본 `scripts/data/npc/normal-npc-samples.json`; `node scripts/export-normal-npc-runtime.mjs` → runtime. 생성기는 신오 ID만 교체하며 다른 지역 검토 데이터를 보존한다. 기존 호연 미커밋 작업도 해시 검사로 보존한다.

기존 15종을 정리하고 공용 조무래기·주피터·새턴 3종의 runtime을 신규 추가했다. 태홍은 named-cyrus/galactic-boss-cyrus 두 ID를 같은 정의로 유지하며 전반 5후보/Weavile, 75층 이후 6후보/Dialga를 사용한다. 기존 75층 전설 제한·points 66 상한·층별 IV/포인트 스케일·선출기·v12 전투 정책은 유지했다. 일반 관장/사천왕/간부는 Tactical ceiling, 난천/태홍은 Expert, 조무래기는 기존 Basic→Tactical이다.

기존 신오 Mega/Z/Tera 배정은 데이터에서 제거했다. 신오의 모든 signature와 gimmick carrier는 없음이다. Mega/Z/Dynamax/Tera 엔진 및 타 지역 배정은 유지한다. selectionRules는 강석 preferredLead=[Rampardos] 하나이며, Ace 자동 포함으로 named 17종의 에이스가 항상 선출된다. Ace만으로 preferredLast를 부여하지 않는다.

## 출처와 후보 구분

[PWT Sinnoh](https://bulbapedia.bulbagarden.net/wiki/World_Leaders_Tournament/Sinnoh), [Mars](https://bulbapedia.bulbagarden.net/wiki/Mars), [Jupiter](https://bulbapedia.bulbagarden.net/wiki/Jupiter), [Saturn](https://bulbapedia.bulbagarden.net/wiki/Saturn), [Cyrus](https://bulbapedia.bulbagarden.net/wiki/Cyrus)를 정체성 확인에 참고했다. 세트는 요청을 바탕으로 현대화한 타워 세트이며 원작 exact set 복제가 아니다. 아래 공식 사용 확인은 보수적으로 기록한 부분집합이다. 그 외 후보는 사용자 지정 타워 확장/개별 이력 미확정으로 구분하며 실제 소유 이력을 단정하지 않는다. 진화형 Crobat 등 조직 파트너는 원작 Golbat/Bronzor/Kadabra 계열의 확장으로 구분한다. 주피터·새턴 스프라이트는 Pokémon Showdown의 원작 캐릭터 자산을 사용하고 sources.json에 URL·검토일·SHA-256을 등록했다.

## 측정 조건

Four fixed player benchmarks, six rules, two matched seeds at F45/F95 (Cyrus F76/F96). Independent full-HP battles; not human win rate or climb survival. Route: one deterministic Sinnoh seed, every floor 1..100, four benchmarks and six rules. Initial utility inspection: four seeds for Gardenia/Byron/Lucian/Cyrus, 768 battles.

집중: Before 80.6% (1160/1440) → After 62.9% (1087/1728). 신규 NPC 때문에 전체 표본 구성이 다르므로 이 총계는 동등 비교 수치가 아니다. NPC별 matched 비교는 아래 표를 사용한다. 모든 수치는 **플레이어 AI 승률**이다.
경로: Before 86.4% (2073/2400) → After 78.8% (1891/2400). 각 단계 2,400전, 오류 0. 독립 전투이며 연속 생존/경제/완주율을 측정하지 않는다. 조직 이벤트는 경로의 기존 deterministic draw로 표집하며 모든 간부의 도달성은 별도 테스트한다.
선출: 53,000회. 규칙 성공 100%, named ace 포함 100%, 기믹 carrier 없음. 전체 lineup/lead/last 빈도는 artifacts/reports/npc/sinnoh-audit.json 및 artifacts/experiments/balance/sinnoh-20261018/after-lineups.json에 있다.

## NPC별 Before → After

| NPC | 전반 Before | 전반 After | 후반 Before | 후반 After |
|---|---|---|---|---|
| 강석 | 100.0% (48/48) | 66.7% (32/48) | 93.8% (45/48) | 64.6% (31/48) |
| 유채 | 83.3% (40/48) | 79.2% (38/48) | 95.8% (46/48) | 83.3% (40/48) |
| 자두 | 85.4% (41/48) | 81.3% (39/48) | 93.8% (45/48) | 81.3% (39/48) |
| 맥실러 | 62.5% (30/48) | 56.3% (27/48) | 50.0% (24/48) | 50.0% (24/48) |
| 멜리사 | 47.9% (23/48) | 45.8% (22/48) | 50.0% (24/48) | 56.3% (27/48) |
| 동관 | 100.0% (48/48) | 81.3% (39/48) | 75.0% (36/48) | 100.0% (48/48) |
| 무청 | 72.9% (35/48) | 18.8% (9/48) | 95.8% (46/48) | 50.0% (24/48) |
| 전진 | 47.9% (23/48) | 29.2% (14/48) | 70.8% (34/48) | 56.3% (27/48) |
| 충호 | 79.2% (38/48) | 58.3% (28/48) | 72.9% (35/48) | 77.1% (37/48) |
| 들국화 | 100.0% (48/48) | 68.8% (33/48) | 89.6% (43/48) | 85.4% (41/48) |
| 대엽 | 100.0% (48/48) | 54.2% (26/48) | 100.0% (48/48) | 100.0% (48/48) |
| 오엽 | 91.7% (44/48) | 39.6% (19/48) | 100.0% (48/48) | 43.8% (21/48) |
| 난천 | 89.6% (43/48) | 45.8% (22/48) | 89.6% (43/48) | 56.3% (27/48) |
| 갤럭시단 조직원 | 신규 / 기존 개별 template 없음 | 75.0% (36/48) | 신규 / 기존 개별 template 없음 | 83.3% (40/48) |
| 마스 | 100.0% (48/48) | 68.8% (33/48) | 87.5% (42/48) | 64.6% (31/48) |
| 주피터 | 신규 / 기존 개별 template 없음 | 75.0% (36/48) | 신규 / 기존 개별 template 없음 | 68.8% (33/48) |
| 새턴 | 신규 / 기존 개별 template 없음 | 72.9% (35/48) | 신규 / 기존 개별 template 없음 | 68.8% (33/48) |
| 태홍 | 33.3% (16/48) | 27.1% (13/48) | 58.3% (28/48) | 31.3% (15/48) |

## Benchmark별 After

| NPC | starters | offense | bulk | signature |
|---|---|---|---|---|
| 강석 | 29.2% (7/24) | 79.2% (19/24) | 75.0% (18/24) | 79.2% (19/24) |
| 유채 | 95.8% (23/24) | 95.8% (23/24) | 33.3% (8/24) | 100.0% (24/24) |
| 자두 | 95.8% (23/24) | 83.3% (20/24) | 54.2% (13/24) | 91.7% (22/24) |
| 맥실러 | 45.8% (11/24) | 50.0% (12/24) | 20.8% (5/24) | 95.8% (23/24) |
| 멜리사 | 41.7% (10/24) | 62.5% (15/24) | 12.5% (3/24) | 87.5% (21/24) |
| 동관 | 100.0% (24/24) | 91.7% (22/24) | 70.8% (17/24) | 100.0% (24/24) |
| 무청 | 20.8% (5/24) | 37.5% (9/24) | 20.8% (5/24) | 58.3% (14/24) |
| 전진 | 50.0% (12/24) | 62.5% (15/24) | 8.3% (2/24) | 50.0% (12/24) |
| 충호 | 91.7% (22/24) | 95.8% (23/24) | 20.8% (5/24) | 62.5% (15/24) |
| 들국화 | 95.8% (23/24) | 87.5% (21/24) | 45.8% (11/24) | 79.2% (19/24) |
| 대엽 | 66.7% (16/24) | 95.8% (23/24) | 75.0% (18/24) | 70.8% (17/24) |
| 오엽 | 50.0% (12/24) | 33.3% (8/24) | 4.2% (1/24) | 79.2% (19/24) |
| 난천 | 45.8% (11/24) | 54.2% (13/24) | 29.2% (7/24) | 75.0% (18/24) |
| 갤럭시단 조직원 | 62.5% (15/24) | 70.8% (17/24) | 87.5% (21/24) | 95.8% (23/24) |
| 마스 | 50.0% (12/24) | 95.8% (23/24) | 29.2% (7/24) | 91.7% (22/24) |
| 주피터 | 100.0% (24/24) | 87.5% (21/24) | 16.7% (4/24) | 83.3% (20/24) |
| 새턴 | 45.8% (11/24) | 87.5% (21/24) | 50.0% (12/24) | 100.0% (24/24) |
| 태홍 | 12.5% (3/24) | 83.3% (20/24) | 4.2% (1/24) | 16.7% (4/24) |

## 기능상 죽은 슬롯 교정

초기 4-seed 추가 검사 768전에서 수면기·벽 설치·압정·일부 회복기가 사용되지 않았다. TowerPolicy 코드도 이 기술을 점수화하지 않음을 확인했다. 공통 AI를 확장하지 않고 지원되는 독·마비·씨뿌리기·선공기 등으로 소규모 대체했다. 오엽의 벽 운영은 현 정책에서 구현할 수 없어 특수 운영/상태 제어로 표현한다. 이 제약은 의도된 수동성과 구별한 기능 문제였다. 초기 runtime/검토 스크립트/trace는 inspection/에 보존했다. 죽은 슬롯 교정 이후 승률 목표를 위한 반복 튜닝은 하지 않았다.

## 태홍의 전설 영향

최종 표본 96전 중 Dialga 추정 직접 KO 129회, 추정 3KO 단독 sweep 12회. 대부분의 benchmark를 혼자 처리하는 상태가 아니며 파트너 공격·강화도 실제 사용된다. 이 집계는 protocol의 마지막 상대 move actor에 따른 추정치로 residual KO 귀속 오차가 있을 수 있다. 무기믹 Champion+ 정체성을 유지한다.

## 각 NPC 세트와 선출

### 강석 — named-roark

Category: gym; Power Tier: Gym; Ace: Rampardos; AI Tier: tactical; Gimmick / Carrier: 없음.
Concept: 직선적인 바위 물리 화력과 브레이커. selectionRules: `{"preferredLead":["Rampardos"]}`.
기존 후보: Steelix, Rampardos, Aerodactyl. → Candidates: Rampardos, Probopass, Golem, Aerodactyl, Tyranitar, Archeops.
공식 사용 확인: Rampardos, Probopass, Golem, Archeops. 타워 확장/개별 이력 미확정: Aerodactyl, Tyranitar.

| Pokémon | Ability | Item | Moves | Role |
|---|---|---|---|---|
| Rampardos | Mold Breaker | Focus Sash | Stone Edge / Earthquake / Zen Headbutt / Superpower | Physical wallbreaker |
| Probopass | Sturdy | Air Balloon | Power Gem / Earth Power / Thunder Wave / Flash Cannon | Special pressure / speed control |
| Golem | Sturdy | Weakness Policy | Stone Edge / Earthquake / Fire Punch / Sucker Punch | Physical breaker / priority |
| Aerodactyl | Rock Head | Expert Belt | Stone Edge / Dual Wingbeat / Earthquake / Ice Fang | Fast physical coverage |
| Tyranitar | Sand Stream | Assault Vest | Stone Edge / Crunch / Earthquake / Ice Punch | Bulky sand breaker |
| Archeops | Defeatist | Sitrus Berry | Stone Edge / Dual Wingbeat / U-turn / Earthquake | Fast pivot |

Representative Lineups (F95, 1000 draws): Archeops / Probopass / Rampardos: 27.3%; Aerodactyl / Probopass / Rampardos: 27.0%; Aerodactyl / Rampardos / Tyranitar: 8.4%.
Lead: Rampardos: 100.0%. Last: Probopass: 32.2%; Archeops: 24.0%; Aerodactyl: 23.0%. Ace: 100.0%. selectionRules: 100.0%.
Design Notes: C: Rampardos 선봉 선호는 자동 ace 포함과 충돌하지 않는다. 강한 물리 브레이커와 Defeatist 리스크를 유지한다.

### 유채 — named-gardenia

Category: gym; Power Tier: Gym; Ace: Roserade; AI Tier: tactical; Gimmick / Carrier: 없음.
Concept: 풀의 수면·회복·지속전과 공격수. selectionRules: `{}`.
기존 후보: Roserade, Torterra, Breloom. → Candidates: Roserade, Torterra, Breloom, Tangrowth, Cherrim, Leafeon.
공식 사용 확인: Roserade, Torterra, Cherrim. 타워 확장/개별 이력 미확정: Breloom, Tangrowth, Leafeon.

| Pokémon | Ability | Item | Moves | Role |
|---|---|---|---|---|
| Roserade | Natural Cure | Black Sludge | Giga Drain / Sludge Bomb / Leech Seed / Shadow Ball | Status / sustain |
| Torterra | Overgrow | Leftovers | Wood Hammer / Earthquake / Stone Edge / Leech Seed | Bulky physical / recovery |
| Breloom | Technician | Focus Sash | Mach Punch / Bullet Seed / Swords Dance / Rock Tomb | Priority / status control / speed control |
| Tangrowth | Regenerator | Rocky Helmet | Giga Drain / Knock Off / Sludge Bomb / Leech Seed | Physical check / sustain |
| Cherrim | Flower Gift | Sitrus Berry | Energy Ball / Dazzling Gleam / Pollen Puff / Leech Seed | Grass attrition / coverage |
| Leafeon | Leaf Guard | Lum Berry | Leaf Blade / Knock Off / X-Scissor / Swords Dance | Physical setup |

Representative Lineups (F95, 1000 draws): Breloom / Roserade / Torterra: 15.3%; Cherrim / Roserade / Torterra: 13.1%; Leafeon / Roserade / Torterra: 12.5%.
Lead: Roserade: 34.5%; Torterra: 16.3%; Breloom: 13.7%. Last: Roserade: 33.9%; Torterra: 18.0%; Breloom: 14.1%. Ace: 100.0%. selectionRules: 100.0%.
Design Notes: D/F/H: 수면기를 지원되는 씨뿌리기로, 토대부기 회복도 씨뿌리기로 전환했다. 낮은 공격성 자체는 정상이다. 버섯모는 AI가 사용하는 칼춤으로 선공기 위협을 유지한다.

### 자두 — named-maylene

Category: gym; Power Tier: Gym; Ace: Lucario; AI Tier: tactical; Gimmick / Carrier: 없음.
Concept: 빠른 물리 압박과 선공기. selectionRules: `{}`.
기존 후보: Heracross, Infernape, Lucario. → Candidates: Lucario, Machamp, Medicham, Gallade, Toxicroak, Infernape.
공식 사용 확인: Lucario, Machamp, Medicham. 타워 확장/개별 이력 미확정: Gallade, Toxicroak, Infernape.

| Pokémon | Ability | Item | Moves | Role |
|---|---|---|---|---|
| Lucario | Inner Focus | Lum Berry | Close Combat / Extreme Speed / Ice Punch / Swords Dance | Physical setup / priority |
| Machamp | No Guard | Sitrus Berry | Dynamic Punch / Knock Off / Stone Edge / Bullet Punch | Confusion / priority |
| Medicham | Pure Power | Choice Scarf | High Jump Kick / Zen Headbutt / Ice Punch / Thunder Punch | Fast physical coverage |
| Gallade | Sharpness | Scope Lens | Sacred Sword / Psycho Cut / Night Slash / Leaf Blade | Immediate physical coverage |
| Toxicroak | Dry Skin | Black Sludge | Drain Punch / Poison Jab / Sucker Punch / Ice Punch | Sustain / priority |
| Infernape | Iron Fist | Expert Belt | Close Combat / Flare Blitz / Mach Punch / U-turn | Fast physical pivot |

Representative Lineups (F95, 1000 draws): Lucario / Machamp / Medicham: 12.4%; Infernape / Lucario / Machamp: 11.7%; Gallade / Lucario / Medicham: 11.3%.
Lead: Lucario: 34.5%; Gallade: 15.2%; Machamp: 14.9%. Last: Lucario: 33.9%; Machamp: 16.1%; Medicham: 13.7%. Ace: 100.0%. selectionRules: 100.0%.
Design Notes: D/H: 물리·격투 압박과 우선기, Pure Power 스카프를 분담한다. 최강 공격 네 개로 통일하지 않았다.

### 맥실러 — named-crasherwake

Category: gym; Power Tier: Gym; Ace: Floatzel; AI Tier: tactical; Gimmick / Carrier: 없음.
Concept: 빠르고 공격적인 물 타입. selectionRules: `{}`.
기존 후보: Gyarados, Floatzel, Ludicolo. → Candidates: Floatzel, Gyarados, Quagsire, Ludicolo, Empoleon, Swampert.
공식 사용 확인: Floatzel, Gyarados, Quagsire. 타워 확장/개별 이력 미확정: Ludicolo, Empoleon, Swampert.

| Pokémon | Ability | Item | Moves | Role |
|---|---|---|---|---|
| Floatzel | Water Veil | Mystic Water | Waterfall / Aqua Jet / Ice Punch / Crunch | Fast water / priority |
| Gyarados | Intimidate | Lum Berry | Waterfall / Crunch / Ice Fang / Dragon Dance | Physical setup |
| Quagsire | Unaware | Leftovers | Earthquake / Scald / Recover / Toxic | Bulky status / recovery |
| Ludicolo | Own Tempo | Assault Vest | Hydro Pump / Giga Drain / Ice Beam / Focus Blast | Special coverage / sustain |
| Empoleon | Competitive | Air Balloon | Hydro Pump / Flash Cannon / Ice Beam / Grass Knot | Special water / steel |
| Swampert | Torrent | Sitrus Berry | Earthquake / Waterfall / Ice Punch / Toxic | Bulky attacker / status control |

Representative Lineups (F95, 1000 draws): Floatzel / Ludicolo / Swampert: 13.1%; Empoleon / Floatzel / Quagsire: 12.3%; Empoleon / Floatzel / Swampert: 12.0%.
Lead: Floatzel: 34.5%; Ludicolo: 16.9%; Gyarados: 13.0%. Last: Floatzel: 33.9%; Empoleon: 14.2%; Ludicolo: 14.2%. Ace: 100.0%. selectionRules: 100.0%.
Design Notes: D/F: 대짱이 압정은 맹독으로 대체. Floatzel의 즉시 공격과 우선기는 유지한다.

### 멜리사 — named-fantina

Category: gym; Power Tier: Upper Gym; Ace: Mismagius; AI Tier: tactical; Gimmick / Carrier: 없음.
Concept: 고스트 교란·화상·특수 압박. selectionRules: `{}`.
기존 후보: Gengar, Mismagius, Spiritomb. → Candidates: Mismagius, Gengar, Drifblim, Dusknoir, Spiritomb, Chandelure.
공식 사용 확인: Mismagius, Gengar, Drifblim, Dusknoir. 타워 확장/개별 이력 미확정: Spiritomb, Chandelure.

| Pokémon | Ability | Item | Moves | Role |
|---|---|---|---|---|
| Mismagius | Levitate | Leftovers | Shadow Ball / Mystical Fire / Energy Ball / Thunder Wave | Special disruption / paralysis |
| Gengar | Cursed Body | Focus Sash | Shadow Ball / Sludge Bomb / Focus Blast / Thunderbolt | Fast special coverage |
| Drifblim | Unburden | Sitrus Berry | Shadow Ball / Air Slash / Will-O-Wisp / Destiny Bond | Burn / speed / trade |
| Dusknoir | Pressure | Leftovers | Poltergeist / Earthquake / Will-O-Wisp / Shadow Sneak | Bulky ghost / burn / priority |
| Spiritomb | Infiltrator | Black Glasses | Dark Pulse / Shadow Ball / Will-O-Wisp / Sucker Punch | Burn / mixed priority |
| Chandelure | Flash Fire | Choice Scarf | Shadow Ball / Flamethrower / Energy Ball / Psychic | Fast special breaker |

Representative Lineups (F95, 1000 draws): Dusknoir / Mismagius / Spiritomb: 23.5%; Drifblim / Mismagius / Spiritomb: 18.5%; Chandelure / Mismagius / Spiritomb: 14.9%.
Lead: Mismagius: 34.5%; Spiritomb: 24.3%; Dusknoir: 14.1%. Last: Mismagius: 33.9%; Spiritomb: 22.2%; Dusknoir: 14.4%. Ace: 100.0%. selectionRules: 100.0%.
Design Notes: D/F: 아픔나누기는 미지원이므로 Mismagius는 마비, Dusknoir는 선공기로 교체했다. 화상·교란 정체성을 유지한다.

### 동관 — named-byron

Category: gym; Power Tier: Upper Gym; Ace: Bastiodon; AI Tier: tactical; Gimmick / Carrier: 없음.
Concept: 느리고 단단한 강철 방어전. selectionRules: `{}`.
기존 후보: Bastiodon, Skarmory, Magnezone. → Candidates: Bastiodon, Steelix, Magnezone, Aggron, Forretress, Excadrill.
공식 사용 확인: Bastiodon, Steelix. 타워 확장/개별 이력 미확정: Magnezone, Aggron, Forretress, Excadrill.

| Pokémon | Ability | Item | Moves | Role |
|---|---|---|---|---|
| Bastiodon | Sturdy | Leftovers | Flash Cannon / Earth Power / Body Press / Toxic | Steel wall / defense-based pressure / poison |
| Steelix | Sturdy | Sitrus Berry | Heavy Slam / Earthquake / Stone Edge / Dragon Tail | Physical wall / phazing |
| Magnezone | Sturdy | Air Balloon | Thunderbolt / Flash Cannon / Volt Switch / Body Press | Bulky special pivot |
| Aggron | Rock Head | Choice Band | Head Smash / Heavy Slam / Earthquake / Ice Punch | Physical breaker |
| Forretress | Sturdy | Rocky Helmet | Gyro Ball / Volt Switch / Toxic / Explosion | status control / slow pivot |
| Excadrill | Mold Breaker | Expert Belt | Iron Head / Earthquake / Rock Slide / X-Scissor | Physical coverage |

Representative Lineups (F95, 1000 draws): Bastiodon / Forretress / Magnezone: 29.1%; Bastiodon / Excadrill / Forretress: 17.4%; Bastiodon / Forretress / Steelix: 16.8%.
Lead: Bastiodon: 34.5%; Forretress: 25.6%; Magnezone: 14.2%. Last: Bastiodon: 33.9%; Forretress: 24.9%; Magnezone: 15.7%. Ace: 100.0%. selectionRules: 100.0%.
Design Notes: B/D/F/H: 바위/강철 에이스가 물·땅·격투 benchmark에 약하다. 초기 192전에서 Metal Burst/Stealth Rock 사용 0회와 정책의 미지원이 확인돼 Body Press/Toxic으로 교체했다. 방어 포인트를 배분했으며 느린 강철 조합을 실패로 보지 않는다. 공격수 강제 규칙은 없다.

### 무청 — named-candice

Category: gym; Power Tier: Upper Gym; Ace: Froslass; AI Tier: tactical; Gimmick / Carrier: 없음.
Concept: 눈과 빠른 얼음 압박. selectionRules: `{}`.
기존 후보: Abomasnow, Froslass, Mamoswine. → Candidates: Froslass, Abomasnow, Weavile, Mamoswine, Glaceon, Walrein.
공식 사용 확인: Froslass, Abomasnow, Weavile. 타워 확장/개별 이력 미확정: Mamoswine, Glaceon, Walrein.

| Pokémon | Ability | Item | Moves | Role |
|---|---|---|---|---|
| Froslass | Cursed Body | Focus Sash | Ice Beam / Shadow Ball / Thunderbolt / Destiny Bond | Fast ice / trade |
| Abomasnow | Snow Warning | Icy Rock | Blizzard / Giga Drain / Earth Power / Ice Shard | Snow / mixed priority |
| Weavile | Pressure | Focus Sash | Icicle Crash / Knock Off / Ice Shard / Low Kick | Fast physical / priority |
| Mamoswine | Thick Fat | Life Orb | Icicle Crash / Earthquake / Ice Shard / Stone Edge | Physical breaker / priority |
| Glaceon | Snow Cloak | Choice Specs | Ice Beam / Freeze-Dry / Shadow Ball / Water Pulse | Special ice / water coverage |
| Walrein | Thick Fat | Leftovers | Surf / Ice Beam / Earthquake / Toxic | Bulky mixed / status control pressure |

Representative Lineups (F95, 1000 draws): Froslass / Mamoswine / Walrein: 34.9%; Froslass / Walrein / Weavile: 20.5%; Abomasnow / Froslass / Walrein: 10.8%.
Lead: Froslass: 34.5%; Walrein: 24.8%; Mamoswine: 17.2%. Last: Froslass: 33.9%; Walrein: 24.1%; Mamoswine: 15.9%. Ace: 100.0%. selectionRules: 100.0%.
Design Notes: G: Froslass 에이스, Abomasnow는 선택적 눈 파트너. 실제 Snowscape protocol을 테스트했다. 눈을 모든 조합의 필수 전제로 강제하지 않는다.

### 전진 — named-volkner

Category: gym; Power Tier: Upper Gym; Ace: Electivire; AI Tier: tactical; Gimmick / Carrier: 없음.
Concept: 빠른 전기와 넓은 견제. selectionRules: `{}`.
기존 후보: Luxray, Electivire, Jolteon. → Candidates: Electivire, Luxray, Raichu, Jolteon, Rotom, Magnezone.
공식 사용 확인: Electivire, Luxray, Raichu, Jolteon. 타워 확장/개별 이력 미확정: Rotom, Magnezone.

| Pokémon | Ability | Item | Moves | Role |
|---|---|---|---|---|
| Electivire | Motor Drive | Expert Belt | Wild Charge / Ice Punch / Earthquake / Cross Chop | Physical electric coverage |
| Luxray | Guts | Flame Orb | Wild Charge / Crunch / Ice Fang / Facade | Physical status breaker |
| Raichu | Lightning Rod | Focus Sash | Thunderbolt / Surf / Grass Knot / Nuzzle | Fast special / paralysis |
| Jolteon | Volt Absorb | Wise Glasses | Thunderbolt / Shadow Ball / Volt Switch / Hyper Voice | Fast special pivot |
| Rotom | Levitate | Sitrus Berry | Thunderbolt / Shadow Ball / Will-O-Wisp / Volt Switch | Burn / special pivot |
| Magnezone | Sturdy | Air Balloon | Thunderbolt / Flash Cannon / Volt Switch / Body Press | Bulky special pivot |

Representative Lineups (F95, 1000 draws): Electivire / Luxray / Magnezone: 13.8%; Electivire / Magnezone / Rotom: 13.2%; Electivire / Jolteon / Magnezone: 12.3%.
Lead: Electivire: 34.5%; Magnezone: 15.4%; Jolteon: 13.8%. Last: Electivire: 33.9%; Magnezone: 16.4%; Luxray: 13.4%. Ace: 100.0%. selectionRules: 100.0%.
Design Notes: D/H: 전기 특화와 얼음·땅·격투 견제를 유지한다. Rotom은 기본 폼이다.

### 충호 — named-aaron

Category: elite; Power Tier: Elite Four; Ace: Drapion; AI Tier: tactical; Gimmick / Carrier: 없음.
Concept: 벌레 공격과 다양한 역할, 원작 드래피온. selectionRules: `{}`.
기존 후보: Drapion, Scizor, Yanmega. → Candidates: Drapion, Heracross, Scizor, Yanmega, Vespiquen, Beautifly.
공식 사용 확인: Drapion, Heracross, Scizor, Yanmega, Vespiquen, Beautifly. 타워 확장/개별 이력 미확정: 없음.

| Pokémon | Ability | Item | Moves | Role |
|---|---|---|---|---|
| Drapion | Sniper | Scope Lens | Cross Poison / Night Slash / Earthquake / Ice Fang | Critical physical ace |
| Heracross | Guts | Flame Orb | Close Combat / Megahorn / Facade / Stone Edge | Physical status breaker |
| Scizor | Technician | Metal Coat | Bullet Punch / X-Scissor / Night Slash / Swords Dance | Setup / priority |
| Yanmega | Speed Boost | Life Orb | Bug Buzz / Air Slash / Ancient Power / Giga Drain | Speed setup / special |
| Vespiquen | Pressure | Leftovers | Attack Order / Air Slash / Toxic / Roost | Bulky bug / recovery |
| Beautifly | Swarm | Focus Sash | Bug Buzz / Air Cutter / Psychic / Quiver Dance | Special setup |

Representative Lineups (F95, 1000 draws): Drapion / Scizor / Yanmega: 11.9%; Beautifly / Drapion / Vespiquen: 11.5%; Beautifly / Drapion / Heracross: 11.5%.
Lead: Drapion: 34.5%; Yanmega: 14.7%; Beautifly: 13.3%. Last: Drapion: 33.9%; Beautifly: 14.0%; Heracross: 13.9%. Ace: 100.0%. selectionRules: 100.0%.
Design Notes: A/D/F: 드래피온은 원작 대표이므로 벌레가 아니어도 유지. Beautifly는 불법 Air Slash를 Air Cutter로 교체. Yanmega는 미지원 Protect 대신 Giga Drain; Speed Boost 자체는 작동한다.

### 들국화 — named-bertha

Category: elite; Power Tier: Elite Four; Ace: Hippowdon; AI Tier: tactical; Gimmick / Carrier: 없음.
Concept: 땅 내구·모래·물리와 특수 공격. selectionRules: `{}`.
기존 후보: Hippowdon, Whiscash, Gliscor. → Candidates: Hippowdon, Gliscor, Rhyperior, Whiscash, Golem, Nidoking.
공식 사용 확인: Hippowdon, Gliscor, Rhyperior, Whiscash, Golem. 타워 확장/개별 이력 미확정: Nidoking.

| Pokémon | Ability | Item | Moves | Role |
|---|---|---|---|---|
| Hippowdon | Sand Stream | Leftovers | Earthquake / Stone Edge / Slack Off / Toxic | Sand / bulky recovery |
| Gliscor | Poison Heal | Toxic Orb | Earthquake / Knock Off / Roost / U-turn | Sustain / pivot |
| Rhyperior | Solid Rock | Assault Vest | Earthquake / Stone Edge / Megahorn / Ice Punch | Bulky physical breaker |
| Whiscash | Oblivious | Sitrus Berry | Earthquake / Waterfall / Ice Beam / Zen Headbutt | Mixed ground / coverage |
| Golem | Sturdy | Weakness Policy | Stone Edge / Earthquake / Fire Punch / Sucker Punch | Physical breaker / priority |
| Nidoking | Sheer Force | Life Orb | Earth Power / Sludge Wave / Ice Beam / Thunderbolt | Special ground breaker |

Representative Lineups (F95, 1000 draws): Gliscor / Hippowdon / Whiscash: 30.1%; Hippowdon / Nidoking / Whiscash: 21.0%; Hippowdon / Rhyperior / Whiscash: 9.7%.
Lead: Hippowdon: 34.5%; Whiscash: 23.0%; Gliscor: 16.3%. Last: Hippowdon: 33.9%; Whiscash: 23.1%; Gliscor: 18.0%. Ace: 100.0%. selectionRules: 100.0%.
Design Notes: D/F/H: 모래·회복·독 운영을 유지하고 Hippowdon의 미지원 Yawn만 Toxic으로 바꿨다.

### 대엽 — named-flint

Category: elite; Power Tier: Elite Four; Ace: Infernape; AI Tier: tactical; Gimmick / Carrier: 없음.
Concept: 불꽃 화력과 선공기. selectionRules: `{}`.
기존 후보: Infernape, Magmortar, Arcanine. → Candidates: Infernape, Magmortar, Rapidash, Houndoom, Flareon, Arcanine.
공식 사용 확인: Infernape, Magmortar, Rapidash, Houndoom, Flareon. 타워 확장/개별 이력 미확정: Arcanine.

| Pokémon | Ability | Item | Moves | Role |
|---|---|---|---|---|
| Infernape | Iron Fist | Expert Belt | Close Combat / Flare Blitz / Mach Punch / Thunder Punch | Fast physical pivot |
| Magmortar | Vital Spirit | Assault Vest | Fire Blast / Thunderbolt / Focus Blast / Psychic | Special fire coverage |
| Rapidash | Flash Fire | Wide Lens | Flare Blitz / Megahorn / High Horsepower / Will-O-Wisp | Fast disruption / coverage |
| Houndoom | Flash Fire | Focus Sash | Flamethrower / Dark Pulse / Sludge Bomb / Nasty Plot | Special setup |
| Flareon | Guts | Toxic Orb | Flare Blitz / Facade / Quick Attack / Superpower | Physical breaker / priority |
| Arcanine | Intimidate | Sitrus Berry | Flare Blitz / Extreme Speed / Crunch / Wild Charge | Physical pressure / priority |

Representative Lineups (F95, 1000 draws): Infernape / Magmortar / Rapidash: 13.4%; Houndoom / Infernape / Rapidash: 13.1%; Arcanine / Houndoom / Infernape: 12.2%.
Lead: Infernape: 34.5%; Houndoom: 14.9%; Magmortar: 14.6%. Last: Infernape: 33.9%; Magmortar: 15.8%; Rapidash: 13.5%. Ace: 100.0%. selectionRules: 100.0%.
Design Notes: D/F: 불꽃 화력, 화상 Rapidash, 선공기와 상태 도구를 분담한다. Hypnosis 대신 Will-O-Wisp를 쓴다.

### 오엽 — named-lucian

Category: elite; Power Tier: Elite Four; Ace: Bronzong; AI Tier: tactical; Gimmick / Carrier: 없음.
Concept: 에스퍼 특수전·상태 제어·회복. selectionRules: `{}`.
기존 후보: Gallade, Bronzong, Slowking. → Candidates: Bronzong, Alakazam, Espeon, Gallade, Mr. Mime, Slowbro.
공식 사용 확인: Bronzong, Alakazam, Espeon, Gallade, Mr. Mime. 타워 확장/개별 이력 미확정: Slowbro.

| Pokémon | Ability | Item | Moves | Role |
|---|---|---|---|---|
| Bronzong | Levitate | Sitrus Berry | Psychic / Flash Cannon / Earthquake / Toxic | Bulky mixed / status control |
| Alakazam | Magic Guard | Life Orb | Psychic / Shadow Ball / Focus Blast / Dazzling Gleam | Fast special coverage |
| Espeon | Magic Bounce | Leftovers | Psychic / Dazzling Gleam / Shadow Ball / Calm Mind | Special pressure / Calm Mind |
| Gallade | Sharpness | Scope Lens | Sacred Sword / Psycho Cut / Night Slash / Leaf Blade | Immediate physical coverage |
| Mr. Mime | Filter | Sitrus Berry | Psychic / Dazzling Gleam / Thunder Wave / Energy Ball | status control / special |
| Slowbro | Regenerator | Rocky Helmet | Scald / Psychic / Ice Beam / Slack Off | Physical check / recovery |

Representative Lineups (F95, 1000 draws): Bronzong / Espeon / Gallade: 13.8%; Bronzong / Mr. Mime / Slowbro: 12.7%; Alakazam / Bronzong / Gallade: 12.3%.
Lead: Bronzong: 34.5%; Gallade: 16.8%; Mr. Mime: 14.0%. Last: Bronzong: 33.9%; Mr. Mime: 15.3%; Gallade: 15.1%. Ace: 100.0%. selectionRules: 100.0%.
Design Notes: D/F: 공통 AI가 벽 설치·최면·Morning Sun을 평가하지 않는다. 전용 AI를 추가하지 않고 Mr. Mime은 마비/견제, Bronzong은 독, Espeon은 명상으로 교체했다. Slowbro의 Slack Off는 사용된다. 트릭룸은 없다.

### 난천 — named-cynthia

Category: champion; Power Tier: Champion; Ace: Garchomp; AI Tier: expert; Gimmick / Carrier: 없음.
Concept: 원작 여섯 파트너의 완성도. selectionRules: `{}`.
기존 후보: Garchomp, Spiritomb, Lucario. → Candidates: Spiritomb, Roserade, Gastrodon, Lucario, Milotic, Garchomp.
공식 사용 확인: Spiritomb, Roserade, Gastrodon, Lucario, Milotic, Garchomp. 타워 확장/개별 이력 미확정: 없음.

| Pokémon | Ability | Item | Moves | Role |
|---|---|---|---|---|
| Spiritomb | Infiltrator | Leftovers | Dark Pulse / Shadow Ball / Will-O-Wisp / Toxic | Bulky ghost / recovery |
| Roserade | Natural Cure | Black Sludge | Giga Drain / Sludge Bomb / Leech Seed / Shadow Ball | Status / sustain |
| Gastrodon | Storm Drain | Leftovers | Earth Power / Scald / Ice Beam / Recover | Water immunity / recovery |
| Lucario | Inner Focus | Lum Berry | Close Combat / Extreme Speed / Meteor Mash / Ice Punch | Physical setup / priority |
| Milotic | Marvel Scale | Leftovers | Scald / Ice Beam / Recover / Mirror Coat | Special wall / retaliation |
| Garchomp | Rough Skin | Lum Berry | Earthquake / Dragon Claw / Stone Edge / Swords Dance | Champion physical ace |

Representative Lineups (F95, 1000 draws): Garchomp / Roserade / Spiritomb: 13.5%; Garchomp / Lucario / Spiritomb: 11.6%; Garchomp / Milotic / Spiritomb: 11.1%.
Lead: Garchomp: 31.0%; Roserade: 16.4%; Spiritomb: 15.3%. Last: Garchomp: 32.6%; Roserade: 14.3%; Spiritomb: 14.0%. Ace: 100.0%. selectionRules: 100.0%.
Design Notes: A/D/F: 원작 6마리를 유지. Spiritomb의 미지원 Pain Split만 Toxic으로 대체하며 기믹은 없다. Gastrodon의 공통 챔피언 fallback 기술 데이터도 보완했다.

### 갤럭시단 조직원 — galactic-grunt

Category: grunt; Power Tier: Normal / Lower Gym; Ace: 없음; AI Tier: Basic→Tactical; Gimmick / Carrier: 없음.
Concept: 조직 공용 독·강철·에스퍼. selectionRules: `{}`.
기존 후보: 개별 runtime 없음. → Candidates: Crobat, Skuntank, Purugly, Bronzong, Toxicroak, Alakazam.
공식 사용 확인: Skuntank, Purugly, Toxicroak. 타워 확장/개별 이력 미확정: Crobat, Bronzong, Alakazam.

| Pokémon | Ability | Item | Moves | Role |
|---|---|---|---|---|
| Crobat | Infiltrator | Black Sludge | Brave Bird / Cross Poison / U-turn / Roost | Fast physical pivot |
| Skuntank | Aftermath | Black Sludge | Poison Jab / Crunch / Sucker Punch / Flamethrower | Poison / dark mixed pressure |
| Purugly | Thick Fat | Silk Scarf | Body Slam / Play Rough / Sucker Punch / U-turn | Fast physical disruption |
| Bronzong | Levitate | Sitrus Berry | Psychic / Flash Cannon / Earthquake / Toxic | Bulky mixed / status control |
| Toxicroak | Dry Skin | Black Sludge | Drain Punch / Poison Jab / Sucker Punch / Ice Punch | Sustain / priority |
| Alakazam | Magic Guard | Sitrus Berry | Psychic / Shadow Ball / Dazzling Gleam / Thunder Wave | Grunt special / paralysis |

Representative Lineups (F95, 1000 draws): Alakazam / Bronzong / Crobat: 8.3%; Alakazam / Bronzong / Toxicroak: 6.8%; Bronzong / Crobat / Skuntank: 6.3%.
Lead: Crobat: 18.5%; Alakazam: 18.4%; Bronzong: 16.6%. Last: Bronzong: 19.2%; Alakazam: 18.5%; Crobat: 17.3%. Ace: 해당 없음. selectionRules: 100.0%.
Design Notes: A/E/F/H: collectible 제한으로 Golbat/Bronzor/Kadabra를 Crobat/Bronzong/Alakazam으로 진화. Alakazam은 Sitrus Berry와 마비로 상위 간부 Magic Guard/Life Orb와 구분. 낮은 등급을 억지로 상위 NPC 승률에 맞추지 않는다.

### 마스 — galactic-executive-mars

Category: executive; Power Tier: Upper Gym / Lower Elite Four; Ace: Purugly; AI Tier: tactical; Gimmick / Carrier: 없음.
Concept: 몬냥이 중심 빠른 물리·교란. selectionRules: `{}`.
기존 후보: Purugly, Crobat, Bronzong. → Candidates: Purugly, Crobat, Bronzong, Raichu, Espeon, Togekiss.
공식 사용 확인: Purugly. 타워 확장/개별 이력 미확정: Crobat, Bronzong, Raichu, Espeon, Togekiss.

| Pokémon | Ability | Item | Moves | Role |
|---|---|---|---|---|
| Purugly | Thick Fat | Silk Scarf | Body Slam / Play Rough / Sucker Punch / U-turn | Fast physical disruption |
| Crobat | Infiltrator | Black Sludge | Brave Bird / Cross Poison / U-turn / Roost | Fast physical pivot |
| Bronzong | Levitate | Sitrus Berry | Psychic / Flash Cannon / Earthquake / Toxic | Bulky mixed / status control |
| Raichu | Lightning Rod | Focus Sash | Thunderbolt / Surf / Grass Knot / Nuzzle | Fast special / paralysis |
| Espeon | Magic Bounce | Leftovers | Psychic / Dazzling Gleam / Shadow Ball / Calm Mind | Special pressure / Calm Mind |
| Togekiss | Serene Grace | Sitrus Berry | Air Slash / Dazzling Gleam / Thunder Wave / Roost | Disruption / recovery |

Representative Lineups (F95, 1000 draws): Crobat / Purugly / Togekiss: 13.7%; Bronzong / Purugly / Togekiss: 12.2%; Purugly / Raichu / Togekiss: 11.8%.
Lead: Purugly: 34.5%; Togekiss: 14.8%; Bronzong: 13.6%. Last: Purugly: 33.9%; Togekiss: 15.7%; Bronzong: 14.6%. Ace: 100.0%. selectionRules: 100.0%.
Design Notes: A/D/F: Thick Fat Purugly의 Body Slam·Sucker Punch·U-turn 중심 빠른 물리 교란. 나머지는 사용자 지정 확장 후보이며 본가 소유를 단정하지 않는다.

### 주피터 — galactic-executive-jupiter

Category: executive; Power Tier: Upper Gym / Lower Elite Four; Ace: Skuntank; AI Tier: tactical; Gimmick / Carrier: 없음.
Concept: 독·악 공격 압박. selectionRules: `{}`.
기존 후보: 개별 runtime 없음. → Candidates: Skuntank, Crobat, Bronzong, Toxicroak, Gengar, Tangrowth.
공식 사용 확인: Skuntank. 타워 확장/개별 이력 미확정: Crobat, Bronzong, Toxicroak, Gengar, Tangrowth.

| Pokémon | Ability | Item | Moves | Role |
|---|---|---|---|---|
| Skuntank | Aftermath | Black Sludge | Poison Jab / Crunch / Sucker Punch / Flamethrower | Poison / dark mixed pressure |
| Crobat | Infiltrator | Expert Belt | Brave Bird / Cross Poison / Heat Wave / U-turn | Mixed poison pressure / pivot |
| Bronzong | Levitate | Leftovers | Psychic / Flash Cannon / Shadow Ball / Toxic | Special poison attrition |
| Toxicroak | Dry Skin | Black Sludge | Drain Punch / Poison Jab / Sucker Punch / Ice Punch | Sustain / priority |
| Gengar | Cursed Body | Focus Sash | Shadow Ball / Sludge Bomb / Focus Blast / Thunderbolt | Fast special coverage |
| Tangrowth | Regenerator | Rocky Helmet | Giga Drain / Knock Off / Sludge Bomb / Leech Seed | Physical check / sustain |

Representative Lineups (F95, 1000 draws): Crobat / Skuntank / Tangrowth: 16.6%; Gengar / Skuntank / Tangrowth: 14.3%; Bronzong / Crobat / Skuntank: 13.5%.
Lead: Skuntank: 34.5%; Tangrowth: 17.8%; Crobat: 16.1%. Last: Skuntank: 33.9%; Crobat: 17.6%; Tangrowth: 16.5%. Ace: 100.0%. selectionRules: 100.0%.
Design Notes: A/D/F: Skuntank와 Poison/Dark 혼합 화력. Crobat은 공격적인 혼합 견제, Bronzong은 Shadow Ball/Toxic으로 차별화한다.

### 새턴 — galactic-executive-saturn

Category: executive; Power Tier: Upper Gym / Lower Elite Four; Ace: Toxicroak; AI Tier: tactical; Gimmick / Carrier: 없음.
Concept: 독개굴과 에스퍼·특수 운영. selectionRules: `{}`.
기존 후보: 개별 runtime 없음. → Candidates: Toxicroak, Crobat, Bronzong, Alakazam, Skuntank, Sharpedo.
공식 사용 확인: Toxicroak, Bronzong. 타워 확장/개별 이력 미확정: Crobat, Alakazam, Skuntank, Sharpedo.

| Pokémon | Ability | Item | Moves | Role |
|---|---|---|---|---|
| Toxicroak | Dry Skin | Black Sludge | Drain Punch / Poison Jab / Sucker Punch / Ice Punch | Sustain / priority |
| Crobat | Infiltrator | Black Sludge | Air Slash / Sludge Bomb / Giga Drain / Roost | Special disruption / recovery |
| Bronzong | Levitate | Leftovers | Psychic / Flash Cannon / Grass Knot / Toxic | Special coverage / poison |
| Alakazam | Magic Guard | Life Orb | Psychic / Shadow Ball / Focus Blast / Thunder Wave | Fast special coverage |
| Skuntank | Aftermath | Black Sludge | Dark Pulse / Sludge Bomb / Flamethrower / Toxic | Special dark / disruption |
| Sharpedo | Speed Boost | Life Orb | Scald / Dark Pulse / Ice Beam / Aqua Jet | Special speed cleaner |

Representative Lineups (F95, 1000 draws): Alakazam / Bronzong / Toxicroak: 15.6%; Bronzong / Crobat / Toxicroak: 13.5%; Alakazam / Sharpedo / Toxicroak: 12.0%.
Lead: Toxicroak: 34.5%; Alakazam: 16.5%; Crobat: 13.8%. Last: Toxicroak: 33.9%; Bronzong: 14.8%; Crobat: 14.7%. Ace: 100.0%. selectionRules: 100.0%.
Design Notes: A/D/F: Toxicroak와 Alakazam의 마비·특수 견제. Crobat은 특수/회복, Skuntank는 특수/독, Bronzong은 Grass Knot로 간부 공통 파트너도 역할을 구분한다.

### 태홍 — galactic-boss-cyrus

Category: boss; Power Tier: Champion+; Ace: Dialga; AI Tier: expert; Gimmick / Carrier: 없음.
Concept: 디아루가와 원작 악·비행 최종 보스. selectionRules: `{}`.
기존 후보: Honchkrow, Weavile, Crobat, Dialga. → Candidates: Weavile, Crobat, Honchkrow, Houndoom, Gyarados, Dialga.
공식 사용 확인: Weavile, Crobat, Honchkrow, Houndoom, Gyarados, Dialga. 타워 확장/개별 이력 미확정: 없음.

| Pokémon | Ability | Item | Moves | Role |
|---|---|---|---|---|
| Weavile | Pressure | Focus Sash | Icicle Crash / Knock Off / Ice Shard / Low Kick | Fast physical / priority |
| Crobat | Infiltrator | Black Sludge | Brave Bird / Cross Poison / U-turn / Roost | Fast physical pivot |
| Honchkrow | Super Luck | Scope Lens | Brave Bird / Night Slash / Sucker Punch / Heat Wave | Mixed dark / priority |
| Houndoom | Flash Fire | Focus Sash | Fire Blast / Dark Pulse / Sludge Bomb / Nasty Plot | Special setup |
| Gyarados | Intimidate | Lum Berry | Waterfall / Crunch / Ice Fang / Dragon Dance | Physical setup |
| Dialga | Pressure | Expert Belt | Roar of Time / Flash Cannon / Earth Power / Thunderbolt | Legendary special boss core |

Representative Lineups (F96, 1000 draws): Dialga / Gyarados / Houndoom: 12.3%; Dialga / Gyarados / Honchkrow: 11.5%; Dialga / Gyarados / Weavile: 10.9%.
Lead: Dialga: 35.4%; Honchkrow: 14.6%; Gyarados: 14.5%. Last: Dialga: 31.7%; Gyarados: 15.3%; Weavile: 13.5%. Ace: 100.0%. selectionRules: 100.0%.
Design Notes: A/B/D/E/H/I: Champion+의 Dialga를 유지한다. Expert Belt 특수 견제와 충전 반동이 있는 Roar of Time, 악·비행 파트너다. 전설이라는 이유로 스탯을 낮추지 않으며 기본 층별 성장만 적용한다. Dialga는 USUM Rainbow Rocket 사용 이력과 사용자 지정 최종 보스 방향을 따른다.

## 검증 및 재현

- `node scripts/export-normal-npc-runtime.mjs --check` 및 `node node_modules/typescript/bin/tsc --noEmit`.
- `node node_modules/tsx/dist/cli.mjs --test tests/*.test.ts` (최종 실제 결과는 아래 실행 기록).
- `node --require ./scripts/windows-build-links.cjs node_modules/next/dist/bin/next build`.
- `node --import tsx node_modules/@playwright/test/cli.js test e2e/sinnoh-named-trainers.spec.ts`.
- `node --import tsx scripts/simulate-sinnoh-npcs.ts`; 별도 `SINNOH_OUTPUT=.../route`로 `--route-only`.
- 기본 집중 2 seeds × 2 floors × 4 benchmarks × 6 rules; lineup 1,000 draws/floor. `SINNOH_NPCS`, `SINNOH_SEEDS`, `SINNOH_TRACES`, `SINNOH_OUTPUT`으로 추가 검사가 가능하다.

baseline-runtime.json은 작업 시작 시점 runtime을 보존한다. before 결과는 catalog/AI ceiling/기믹 데이터 변경 전 실행했다. 현재 코드에서 baseline runtime만 주입하면 이전 catalog까지 복구되는 것은 아니므로 저장된 before 결과/manifest를 비교 근거로 사용한다. before 재현 시 당시 metadata도 함께 사용해야 한다.

## 남은 문제와 판단

동관의 높은 플레이어 승률은 바위/강철 에이스의 약점 및 느린 방어 스타일, 물/땅/격투 benchmark 구성(H)에 따른 결과다. 사용 불능 슬롯(D/F)은 교정했고, 무작위 3마리의 기능 붕괴·규칙 실패·전설 독점·기믹 불작동은 최종 검사에서 확인되지 않았다. 벽/수면 AI 미지원은 지원되는 상태 제어로 대체한 설계 제약이며 공통 AI 후속 작업 범위다. 두 집중 seed와 한 route seed는 제한된 표본이다. 승률 균등화나 스탯 보정은 적용하지 않았다.

## 추가 이상치 검사

최종 세트를 바꾸지 않고 별도 seeds 3~6으로 동관·대엽을 각 192전씩 추가 확인했다. 동관 F45 99.0% (95/96), F95 100.0% (96/96); 대엽 F45 49.0% (47/96), F95 70.8% (68/96). 오류 0. 대엽의 초기 F95 100%는 다른 선출 시드에서 반복되지 않았으며 공격 기술과 화상 운영이 실제 실행된다. 동관은 높은 플레이어 승률이 반복되지만 Bastiodon의 낮은 화력과 물/땅/격투 약점(H), 느린 수비 캐릭터성에 부합한다. 최종 Bastiodon의 Toxic 79회, Body Press 7회 사용으로 기능 불능과는 구별한다. 공격수 강제나 후보 교체로 승률을 맞추지 않는다.
기믹 telemetry: 최종 집중 1728전에서 available=0, used=0; 무기믹 설계와 일치한다. 기존 기믹 엔진의 전 룰 실행/리플레이는 회귀 테스트로 검사한다.

**신오 필수 NPC 샘플 완료**

## 최종 실행 결과

- 전체 unit/integration (test-concurrency=4): 887/887 통과, 실패 0; .data/sinnoh-unit-verified.log
- focused Sinnoh 및 관련 회귀: 51/51 통과; .data/sinnoh-focused-tests.log
- Sinnoh named E2E: 17/17 통과 (관장 8, 사천왕 4, 난천, 갤럭시 간부 3/태홍; 390px/1280px)
- TypeScript noEmit: 통과
- production build: 통과 (Next.js 16.3.8)
- runtime export --check: 273 live templates 일치
- lineup telemetry: 53,000 draws; 규칙 성공 100%, named ace 100%
- focused simulation: Before 1,440전 / After 1,728전, 오류 0
- Sinnoh route simulation: Before/After 각 2,400전, 1~100층 전체, 오류 0
- 추가 기능 검사 / 최종 이상치 검사: 초기 768전 / 최종 384전, 오류 0
- Trick Room / NPC gimmick telemetry: 사용 NPC 0명 / available 0, used 0
- 타 지역 runtime 보존: 252개 행 baseline SHA-256 일치; 공통 AI·Z 정책·선출기 소스 해시 불변

전체 회귀에는 retry, reconnect, snapshot, hidden boss, raid, run events, Teleport, 기존 Mega/Z/Dynamax/Tera 및 저장된 전투 replay가 포함된다. 초기 실패는 변경된 후보 수·고정 3마리·기믹 가정과 충돌한 fixture에서 발생했고, 최종 실행 결과는 이를 수정한 뒤의 결과다.
