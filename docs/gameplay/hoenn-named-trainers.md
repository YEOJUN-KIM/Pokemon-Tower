# 호연 필수 NPC 샘플

2026-10-18. 관장 9명, 사천왕 4명, 챔피언 2명, 조직 공용 조무래기 2종, 간부 4명, 보스 2명: 총 23개 정의. May/Brendan/Wally/Zinnia/프런티어는 포함하지 않는다.

검토 원본은 `scripts/data/npc/normal-npc-samples.json`, 생성기는 `scripts/review-hoenn-npc-samples.ts`, 런타임은 `src/data/normal-npc-templates.json`이다. 원본을 검토한 뒤 `node scripts/export-normal-npc-runtime.mjs`로 export한다. `src/data/hoenn-trainers.ts`는 catalog와 조직 등록에 쓰는 메타데이터이다.

기존 선출기는 ace와 signature carrier를 자동 포함한다. 아래 `selectionRules`의 required와 별개다. 따라서 파비코리도 기존 엔진 제약상 항상 포함된다. 에이스라는 이유로 preferredLast를 붙이지 않았다. allFloors는 동일 빌드를 층별 곡선으로 축소하며, 보스는 75층 전/후 후보를 나눈 기존 단계 조회를 유지한다.

기존 runtime exporter가 단계별 후보의 select 플래그를 버리던 부분만 보존하도록 보완했다. 전투 엔진·정책·기믹·층별 성장 함수는 수정하지 않았다. 보스 75층 제한, 관장 55층/챔피언 50층 기믹 시작은 그대로다. 조직원은 무기믹, Basic~Tactical이고 간부는 Tactical ceiling이다. 원규는 요청대로 Tactical ceiling을 설정했다. 다른 일반 네임드의 Tactical→Expert 전환과 챔피언 Expert는 기존 npcAi를 따른다.

원작 자료: [PWT 호연](https://bulbapedia.bulbagarden.net/wiki/Hoenn_Leaders_Tournament), [PWT 월드 리더](https://bulbapedia.bulbagarden.net/wiki/World_Leaders_Tournament/Hoenn), [ORAS 사천왕/챔피언](https://www.serebii.net/omegarubyalphasapphire/elitefour.shtml), [ORAS 조직](https://www.serebii.net/omegarubyalphasapphire/team.shtml), [구열](https://bulbapedia.bulbagarden.net/wiki/Courtney). 이 자료는 정체성과 기존 파트너 확인에 사용했다. 세트는 현대화한 타워 샘플이며 원작 세트 복제가 아니다.

요청 후보 중 Luxray·Darmanitan·Dragonite(은송)·Lapras(아단) 등의 개별 본가 사용 이력은 이번 출처 검사에서 확정하지 못했다. 이들은 사용자 지정 후보를 따른 타워 확장으로 표시하며 본가 사용 이력이라고 주장하지 않는다. 둔타/또가스/고래왕자는 roster 미지원, 골뱃/발바로는 collectible 제약으로 각각 폭타/또도가스/고래왕/크로뱃으로 대체했다. 종길은 발바로를 중복 진화형으로 채우지 않고 5마리만 유지한다. 윤진 관장의 여섯째는 원작 파트너 왕콘치다. 조직의 마그카르고·가재장군은 요청에 허용된 조직 공용 확장이다.

구열·이연은 조직 간부 후보에 추가했고 기존 seed 기반 draw와 eligibility 필터로 선택한다. 계급 확률·보상은 유지한다. 두 스프라이트와 credits는 `public/sprites/trainers/sources.json`에 등록했다. 새 대사는 추가하지 않았다.

민지 가뭄은 자동 부여가 아니다. 하얀연기 초안의 물 약점과 낮은 압박을 검토하고 태양빛 불꽃 강화·물 피해 감소·솔라빔을 하나의 역할로 채택했다. 은송 패리퍼는 비로 동료를 방해하지 않도록 Keen Eye를 쓴다. 아단은 별도의 비 팀이다.

## 원규 (named-roxanne)

Category: gym; Power Tier: Gym; Ace: Probopass; AI: F45 tactical, F95 tactical.

Concept: 마비로 속도를 제어하고 바위 물리 공격수로 압박.

Gimmick: None.

selectionRules: `{"preferredLead":["Probopass"],"atLeastOneOf":["Armaldo","Aggron","Golem"]}`.

| 후보 | 특성 | 기본 아이템 | 기술 ×4 | 역할 |
|---|---|---|---|---|
| Probopass | Sturdy | Air Balloon | Power Gem / Flash Cannon / Thunder Wave / Earth Power | Lead / speed control |
| Armaldo | Battle Armor | Lum Berry | Rock Slide / X-Scissor / Earthquake / Rock Polish | Setup physical sweeper |
| Cradily | Storm Drain | Leftovers | Giga Drain / Ancient Power / Toxic / Recover | Water check / attrition |
| Aggron | Rock Head | Choice Band | Head Smash / Heavy Slam / Earthquake / Ice Punch | Physical wallbreaker |
| Relicanth | Rock Head | Sitrus Berry | Head Smash / Waterfall / Earthquake / Yawn | Bulky attacker / disruption |
| Golem | Sturdy | Weakness Policy | Stone Edge / Earthquake / Fire Punch / Sucker Punch | Physical breaker / priority |

signature carrier는 허용 층부터 지정 기믹 도구로 바뀐다. 후보별 IV/포인트는 기존 floor scaling을 사용한다.

Representative Lineups (F95, 1000회): Armaldo / Probopass / Relicanth: 254회; Armaldo / Cradily / Probopass: 243회; Cradily / Golem / Probopass: 112회.

Design Notes: H: 물·격투·땅 benchmark와 바위/강철 약점. 풍선·옹골참·마중물로 한 턴과 물 내성을 확보했다. 기믹 없는 관장으로 유지한다.

## 철구 (named-brawly)

Category: gym; Power Tier: Gym; Ace: Hariyama; AI: F45 tactical, F95 expert.

Concept: 내구형 격투 에이스와 빠른 공격수·선공기.

Gimmick: z / Hariyama / Fightinium Z.

selectionRules: `{"atLeastOneOf":["Medicham","Breloom","Heracross"]}`.

| 후보 | 특성 | 기본 아이템 | 기술 ×4 | 역할 |
|---|---|---|---|---|
| Hariyama | Thick Fat | Assault Vest | Close Combat / Knock Off / Ice Punch / Bullet Punch | Bulky physical ace |
| Medicham | Pure Power | Choice Scarf | Close Combat / Zen Headbutt / Ice Punch / Thunder Punch | Fast coverage |
| Machamp | No Guard | Lum Berry | Dynamic Punch / Knock Off / Stone Edge / Bullet Punch | Physical pressure / confusion |
| Breloom | Technician | Focus Sash | Spore / Bullet Seed / Mach Punch / Rock Tomb | Status / priority |
| Heracross | Guts | Choice Scarf | Close Combat / Megahorn / Stone Edge / Knock Off | Fast breaker |
| Hitmontop | Intimidate | Sitrus Berry | Close Combat / Mach Punch / Stone Edge / Toxic | Utility / priority |

signature carrier는 허용 층부터 지정 기믹 도구로 바뀐다. 후보별 IV/포인트는 기존 floor scaling을 사용한다.

Representative Lineups (F95, 1000회): Hariyama / Heracross / Medicham: 199회; Hariyama / Machamp / Medicham: 170회; Breloom / Hariyama / Medicham: 168회.

Design Notes: B/D/E/H: 느린 물리 셋을 막고 스카프·테크니션 선공기를 분담했다. 특수·페어리 benchmark 편향은 남는다.

## 암페어 (named-wattson)

Category: gym; Power Tier: Gym; Ace: Manectric; AI: F45 tactical, F95 expert.

Concept: 빠른 특수 압박과 마비·볼트체인지.

Gimmick: mega / Manectric / Manectite.

selectionRules: `{"atLeastOneOf":["Electrode","Raichu"],"preferredLead":["Manectric"]}`.

| 후보 | 특성 | 기본 아이템 | 기술 ×4 | 역할 |
|---|---|---|---|---|
| Manectric | Lightning Rod | Expert Belt | Thunderbolt / Volt Switch / Flamethrower / Thunder Wave | Fast special pivot |
| Magnezone | Sturdy | Air Balloon | Thunderbolt / Flash Cannon / Volt Switch / Thunder Wave | Bulky special / speed control |
| Electrode | Aftermath | Light Clay | Thunderbolt / Reflect / Light Screen / Taunt | Fast screens / disruption |
| Raichu | Lightning Rod | Focus Sash | Thunderbolt / Grass Knot / Surf / Thunder Wave | Ground coverage / speed control |
| Ampharos | Static | Leftovers | Thunderbolt / Dragon Pulse / Focus Blast / Thunder Wave | Bulky special attacker |
| Luxray | Intimidate | Sitrus Berry | Wild Charge / Crunch / Ice Fang / Quick Attack | Physical coverage / priority |

signature carrier는 허용 층부터 지정 기믹 도구로 바뀐다. 후보별 IV/포인트는 기존 floor scaling을 사용한다.

Representative Lineups (F95, 1000회): Electrode / Magnezone / Manectric: 182회; Magnezone / Manectric / Raichu: 169회; Luxray / Manectric / Raichu: 158회.

Design Notes: D: 잠재파워 IV 불일치를 전기자석파로 제거했다. 빠른 후보 하나를 보장하고 메가 썬더볼트는 선봉 피벗을 맡는다.

## 민지 (named-flannery)

Category: gym; Power Tier: Gym; Ace: Torkoal; AI: F45 tactical, F95 expert.

Concept: 하품·화상과 불꽃 화력, 빠른 파트너.

Gimmick: z / Torkoal / Firium Z.

selectionRules: `{"atLeastOneOf":["Ninetales","Houndoom","Darmanitan"]}`.

| 후보 | 특성 | 기본 아이템 | 기술 ×4 | 역할 |
|---|---|---|---|---|
| Torkoal | Drought | Sitrus Berry | Flamethrower / Solar Beam / Yawn / Body Press | Sun support / Water coverage / sleep pressure |
| Camerupt | Solid Rock | Sitrus Berry | Flamethrower / Earth Power / Ancient Power / Yawn | Fire / Ground wallbreaker |
| Magcargo | Flame Body | White Herb | Fire Blast / Earth Power / Power Gem / Shell Smash | Setup special breaker |
| Ninetales | Flash Fire | Charcoal | Flamethrower / Energy Ball / Will-O-Wisp / Nasty Plot | Fast coverage / burn |
| Houndoom | Flash Fire | Focus Sash | Flamethrower / Dark Pulse / Sludge Bomb / Nasty Plot | Fast special breaker |
| Darmanitan | Sheer Force | Choice Scarf | Flare Blitz / Rock Slide / Earthquake / U-turn | Fast physical breaker |

signature carrier는 허용 층부터 지정 기믹 도구로 바뀐다. 후보별 IV/포인트는 기존 floor scaling을 사용한다.

Representative Lineups (F95, 1000회): Camerupt / Darmanitan / Torkoal: 236회; Camerupt / Ninetales / Torkoal: 161회; Camerupt / Houndoom / Torkoal: 159회.

Design Notes: A/B/D/E/H: 빠른 파트너 보장. 하얀연기 초안보다 가뭄+솔라빔이 물 약점과 화력에 맞아 채택했다. 물·땅 benchmark가 많은 조건이다.

## 종길 (named-norman)

Category: gym; Power Tier: Upper Gym; Ace: Slaking; AI: F45 tactical, F95 expert.

Concept: 게으름을 감수하는 정면 화력과 특수·선공기 보완.

Gimmick: z / Slaking / Normalium Z.

selectionRules: `{"required":["Slaking"],"atLeastOneOf":["Exploud"]}`.

| 후보 | 특성 | 기본 아이템 | 기술 ×4 | 역할 |
|---|---|---|---|---|
| Slaking | Truant | Choice Band | Return / Earthquake / Fire Punch / Sucker Punch | Immediate physical ace |
| Spinda | Contrary | Sitrus Berry | Superpower / Return / Rock Slide / Teeter Dance | Contrary / disruption |
| Zangoose | Immunity | Silk Scarf | Return / Close Combat / Quick Attack / Swords Dance | Physical cleaner / priority |
| Tauros | Intimidate | Life Orb | Return / Earthquake / Stone Edge / Zen Headbutt | Fast physical pressure |
| Exploud | Scrappy | Choice Specs | Boomburst / Flamethrower / Ice Beam / Focus Blast | Special wallbreaker |

signature carrier는 허용 층부터 지정 기믹 도구로 바뀐다. 후보별 IV/포인트는 기존 floor scaling을 사용한다.

Representative Lineups (F95, 1000회): Exploud / Slaking / Zangoose: 347회; Exploud / Slaking / Spinda: 347회; Exploud / Slaking / Tauros: 306회.

Design Notes: B/F/H: 게을킹/폭음룡 보장으로 물리 셋 겹침을 막았다. 게으름 발동은 telemetry에 기록하며 전용 교대 AI는 추가하지 않았다.

## 은송 (named-winona)

Category: gym; Power Tier: Upper Gym; Ace: Altaria; AI: F45 tactical, F95 expert.

Concept: 비행 복합 타입의 내구·속도·강화 분담.

Gimmick: mega / Altaria / Altarianite.

selectionRules: `{"atLeastOneOf":["Swellow","Dragonite"]}`.

| 후보 | 특성 | 기본 아이템 | 기술 ×4 | 역할 |
|---|---|---|---|---|
| Altaria | Natural Cure | Leftovers | Dragon Claw / Return / Earthquake / Roost | Bulky dragon / Mega Fairy pressure |
| Skarmory | Sturdy | Rocky Helmet | Brave Bird / Body Press / Roost / Toxic | Physical wall / recovery |
| Pelipper | Keen Eye | Sitrus Berry | Scald / Hurricane / Roost / U-turn | Water coverage / pivot |
| Tropius | Harvest | Sitrus Berry | Giga Drain / Air Slash / Leech Seed / Roost | Sustain / grass coverage |
| Swellow | Guts | Flame Orb | Facade / Brave Bird / U-turn / Quick Attack | Fast physical cleaner |
| Dragonite | Multiscale | Lum Berry | Dragon Dance / Dragon Claw / Fire Punch / Extreme Speed | Setup / priority |

signature carrier는 허용 층부터 지정 기믹 도구로 바뀐다. 후보별 IV/포인트는 기존 floor scaling을 사용한다.

Representative Lineups (F95, 1000회): Altaria / Skarmory / Swellow: 290회; Altaria / Dragonite / Skarmory: 225회; Altaria / Pelipper / Swellow: 180회.

Design Notes: D/F/H: 파비코리의 용의춤을 즉시 공격으로 교체했다. 얼음·전기 coverage가 많은 benchmark에 약한 조합은 남는다.

## 풍&란 (named-tateandliza)

Category: gym; Power Tier: Upper Gym; Ace: Solrock; AI: F45 tactical, F95 expert.

Concept: 태양과 달, 느린 트릭룸 축과 독립 공격수.

Gimmick: None.

selectionRules: `{"atLeastOneOf":["Solrock","Lunatone"],"preferredLead":["Lunatone","Claydol"]}`.

| 후보 | 특성 | 기본 아이템 | 기술 ×4 | 역할 |
|---|---|---|---|---|
| Solrock | Levitate | Sitrus Berry | Rock Slide / Zen Headbutt / Earthquake / Trick Room | Physical Trick Room attacker |
| Lunatone | Levitate | Leftovers | Psychic / Power Gem / Ice Beam / Trick Room | Special Trick Room setter |
| Claydol | Levitate | Sitrus Berry | Earth Power / Psychic / Ice Beam / Trick Room | Bulky room setter / coverage |
| Xatu | Magic Bounce | Leftovers | Psychic / Heat Wave / Thunder Wave / Roost | Status reflection / speed control |
| Gallade | Sharpness | Scope Lens | Psycho Cut / Sacred Sword / Leaf Blade / Shadow Sneak | Physical coverage / priority |
| Gardevoir | Trace | Choice Scarf | Psychic / Moonblast / Thunderbolt / Focus Blast | Independent fast special attacker |

signature carrier는 허용 층부터 지정 기믹 도구로 바뀐다. 후보별 IV/포인트는 기존 floor scaling을 사용한다.

Representative Lineups (F95, 1000회): Claydol / Gardevoir / Solrock: 145회; Gallade / Gardevoir / Solrock: 137회; Gardevoir / Solrock / Xatu: 136회.

Design Notes: B/C/F/H: 솔록은 현 선출기의 ace 제약으로 항상 포함된다. 루나톤 동시 포함률을 별도로 기록했다. 트릭룸과 빠른 독립 공격수가 함께 있어 모든 조합이 트릭룸을 전제로 하지는 않는다.

## 윤진 (named-wallace-gym)

Category: gym; Power Tier: Upper Gym; Ace: Milotic; AI: F45 tactical, F95 expert.

Concept: 회복·상태이상과 안정적인 물 타입 운영.

Gimmick: z / Milotic / Waterium Z.

selectionRules: `{"atLeastOneOf":["Whiscash","Crawdaunt"]}`.

| 후보 | 특성 | 기본 아이템 | 기술 ×4 | 역할 |
|---|---|---|---|---|
| Milotic | Marvel Scale | Leftovers | Scald / Ice Beam / Toxic / Recover | Water control / recovery |
| Walrein | Thick Fat | Sitrus Berry | Surf / Ice Beam / Encore / Super Fang | Bulky Water / disruption |
| Whiscash | Oblivious | Sitrus Berry | Earthquake / Waterfall / Stone Edge / Dragon Dance | Electric immunity / setup |
| Luvdisc | Swift Swim | Focus Sash | Scald / Ice Beam / Charm / Attract | Status utility |
| Crawdaunt | Adaptability | Life Orb | Crabhammer / Knock Off / Aqua Jet / Swords Dance | Physical breaker / priority |
| Seaking | Lightning Rod | Sitrus Berry | Waterfall / Drill Run / Megahorn / Knock Off | Electric immunity / coverage |

signature carrier는 허용 층부터 지정 기믹 도구로 바뀐다. 후보별 IV/포인트는 기존 floor scaling을 사용한다.

Representative Lineups (F95, 1000회): Luvdisc / Milotic / Whiscash: 247회; Milotic / Walrein / Whiscash: 191회; Crawdaunt / Milotic / Whiscash: 177회.

Design Notes: A/H: 약한 사랑동이는 상태 유틸리티 후보로 남겨 원작 정체성을 보존했다. 풀/전기 대응 파트너 한 마리를 보장한다.

## 아단 (named-juan)

Category: gym; Power Tier: Upper Gym; Ace: Kingdra; AI: F45 tactical, F95 expert.

Concept: 비와 킹드라, 노련한 물 타입 견제.

Gimmick: z / Kingdra / Waterium Z.

selectionRules: `{"required":["Politoed"],"preferredLead":["Politoed"]}`.

| 후보 | 특성 | 기본 아이템 | 기술 ×4 | 역할 |
|---|---|---|---|---|
| Kingdra | Swift Swim | Scope Lens | Surf / Draco Meteor / Ice Beam / Focus Energy | Rain special ace |
| Walrein | Thick Fat | Sitrus Berry | Surf / Ice Beam / Encore / Super Fang | Bulky Water / disruption |
| Crawdaunt | Adaptability | Life Orb | Crabhammer / Knock Off / Aqua Jet / Swords Dance | Physical breaker / priority |
| Whiscash | Oblivious | Sitrus Berry | Earthquake / Waterfall / Stone Edge / Dragon Dance | Electric immunity / setup |
| Politoed | Drizzle | Damp Rock | Scald / Ice Beam / Encore / Perish Song | Rain lead / disruption |
| Lapras | Water Absorb | Assault Vest | Surf / Freeze-Dry / Thunderbolt / Ice Shard | Water check / coverage |

signature carrier는 허용 층부터 지정 기믹 도구로 바뀐다. 후보별 IV/포인트는 기존 floor scaling을 사용한다.

Representative Lineups (F95, 1000회): Crawdaunt / Kingdra / Politoed: 329회; Kingdra / Politoed / Whiscash: 267회; Kingdra / Politoed / Walrein: 210회.

Design Notes: B/C/H: 왕구리 비 선봉을 보장한다. 비에서 킹드라가 빨라지며 윤진의 회복 중심 팀과 구분된다.

## 혁진 (named-sidney)

Category: elite; Power Tier: Elite Four; Ace: Absol; AI: F45 tactical, F95 expert.

Concept: 악 타입 공격과 교란.

Gimmick: mega / Absol / Absolite.

selectionRules: `{"atLeastOneOf":["Scrafty","Mandibuzz"]}`.

| 후보 | 특성 | 기본 아이템 | 기술 ×4 | 역할 |
|---|---|---|---|---|
| Scrafty | Intimidate | Lum Berry | Drain Punch / Knock Off / Ice Punch / Dragon Dance | Bulky setup / disruption |
| Shiftry | Chlorophyll | Life Orb | Leaf Blade / Knock Off / Sucker Punch / Swords Dance | Grass coverage / priority |
| Zoroark | Illusion | Focus Sash | Dark Pulse / Flamethrower / Focus Blast / Nasty Plot | Special disruption |
| Sharpedo | Speed Boost | Life Orb | Waterfall / Crunch / Ice Fang / Protect | Speed setup / cleaner |
| Mandibuzz | Overcoat | Rocky Helmet | Foul Play / Roost / Toxic / Taunt | Physical check / disruption |
| Absol | Super Luck | Lum Berry | Knock Off / Sucker Punch / Play Rough / Swords Dance | Physical ace / priority |

signature carrier는 허용 층부터 지정 기믹 도구로 바뀐다. 후보별 IV/포인트는 기존 floor scaling을 사용한다.

Representative Lineups (F95, 1000회): Absol / Mandibuzz / Zoroark: 233회; Absol / Mandibuzz / Sharpedo: 183회; Absol / Mandibuzz / Scrafty: 169회.

Design Notes: B/H: 곤율거니·버랜지나 중 하나가 공격 일변도 조합을 보완한다.

## 회연 (named-phoebe)

Category: elite; Power Tier: Elite Four; Ace: Sableye; AI: F45 tactical, F95 expert.

Concept: 화상·회복·교란과 특수 화력.

Gimmick: mega / Sableye / Sablenite.

selectionRules: `{"preferredLead":["Sableye"],"atLeastOneOf":["Mismagius","Chandelure"]}`.

| 후보 | 특성 | 기본 아이템 | 기술 ×4 | 역할 |
|---|---|---|---|---|
| Banette | Insomnia | Spell Tag | Shadow Claw / Shadow Sneak / Knock Off / Will-O-Wisp | Physical ghost / burn |
| Mismagius | Levitate | Sitrus Berry | Shadow Ball / Dazzling Gleam / Thunderbolt / Nasty Plot | Special coverage |
| Drifblim | Unburden | Sitrus Berry | Shadow Ball / Thunderbolt / Will-O-Wisp / Strength Sap | Burn / sustain / speed |
| Chandelure | Flash Fire | Choice Scarf | Shadow Ball / Flamethrower / Energy Ball / Psychic | Fast special breaker |
| Dusknoir | Pressure | Leftovers | Poltergeist / Shadow Sneak / Will-O-Wisp / Pain Split | Bulky ghost / priority |
| Sableye | Prankster | Leftovers | Foul Play / Will-O-Wisp / Recover / Taunt | Status / recovery / Mega reflection |

signature carrier는 허용 층부터 지정 기믹 도구로 바뀐다. 후보별 IV/포인트는 기존 floor scaling을 사용한다.

Representative Lineups (F95, 1000회): Drifblim / Mismagius / Sableye: 157회; Chandelure / Mismagius / Sableye: 149회; Chandelure / Drifblim / Sableye: 148회.

Design Notes: B/F/H: 깜까미를 에이스로 하여 야느와르몽까지 강제되던 수동적인 셋을 풀고 특수 공격수 하나를 보장한다. 회복·교란 AI의 매치업 편향은 남는다.

## 미혜 (named-glacia)

Category: elite; Power Tier: Elite Four; Ace: Glalie; AI: F45 tactical, F95 expert.

Concept: 얼음 화력과 물·얼음 내구축.

Gimmick: mega / Glalie / Glalitite.

selectionRules: `{"atLeastOneOf":["Walrein","Abomasnow"]}`.

| 후보 | 특성 | 기본 아이템 | 기술 ×4 | 역할 |
|---|---|---|---|---|
| Abomasnow | Snow Warning | Icy Rock | Blizzard / Giga Drain / Ice Shard / Earth Power | Snow / mixed coverage |
| Beartic | Slush Rush | Life Orb | Icicle Crash / Superpower / Aqua Jet / Swords Dance | Snow attacker / priority |
| Froslass | Cursed Body | Focus Sash | Ice Beam / Shadow Ball / Thunderbolt / Will-O-Wisp | Fast special / burn |
| Vanilluxe | Snow Warning | Choice Specs | Blizzard / Freeze-Dry / Flash Cannon / Ice Beam | Snow / special breaker |
| Walrein | Thick Fat | Sitrus Berry | Surf / Ice Beam / Encore / Super Fang | Bulky Water / disruption |
| Glalie | Inner Focus | Life Orb | Return / Earthquake / Ice Shard / Crunch | Mega physical ice breaker |

signature carrier는 허용 층부터 지정 기믹 도구로 바뀐다. 후보별 IV/포인트는 기존 floor scaling을 사용한다.

Representative Lineups (F95, 1000회): Froslass / Glalie / Walrein: 392회; Beartic / Glalie / Walrein: 224회; Abomasnow / Glalie / Walrein: 127회.

Design Notes: A/G/H: 메가얼음귀신을 보장하고 씨카이저 또는 눈설왕으로 보완한다. 실제 gen9nationaldexag protocol에서 Snow Warning → Snowscape를 확인했다. 얼음 타입의 눈 방어 효과와 Slush Rush를 사용한다.

## 권수 (named-drake)

Category: elite; Power Tier: Elite Four+; Ace: Salamence; AI: F45 tactical, F95 expert.

Concept: 드래곤의 물리·특수 공격 분담.

Gimmick: mega / Salamence / Salamencite.

selectionRules: `{"atLeastOneOf":["Dragalge","Kingdra"]}`.

| 후보 | 특성 | 기본 아이템 | 기술 ×4 | 역할 |
|---|---|---|---|---|
| Altaria | Natural Cure | Leftovers | Dragon Claw / Return / Earthquake / Roost | Bulky dragon / Mega Fairy pressure |
| Dragalge | Adaptability | Assault Vest | Draco Meteor / Sludge Wave / Hydro Pump / Thunderbolt | Special dragon / Fairy check |
| Kingdra | Swift Swim | Scope Lens | Surf / Draco Meteor / Ice Beam / Focus Energy | Rain special ace |
| Flygon | Levitate | Choice Scarf | Earthquake / Dragon Claw / Rock Slide / U-turn | Fast pivot / electric immunity |
| Haxorus | Mold Breaker | Lum Berry | Dragon Dance / Dragon Claw / Earthquake / Poison Jab | Physical setup |
| Salamence | Intimidate | Lum Berry | Dragon Claw / Return / Earthquake / Roost | Immediate dragon / Mega Flying pressure |

signature carrier는 허용 층부터 지정 기믹 도구로 바뀐다. 후보별 IV/포인트는 기존 floor scaling을 사용한다.

Representative Lineups (F95, 1000회): Dragalge / Kingdra / Salamence: 358회; Altaria / Dragalge / Salamence: 157회; Dragalge / Flygon / Salamence: 140회.

Design Notes: D/F/H: 보만다의 용의춤을 드래곤크루로 교체해 공격 없이 회복만 하다 쓰러지는 패턴을 줄였다. 페어리·얼음 coverage 편향은 남는다.

## 성호 (named-steven)

Category: champion; Power Tier: Champion; Ace: Metagross; AI: F45 expert, F95 expert.

Concept: 강철·광물·화석의 챔피언.

Gimmick: mega / Metagross / Metagrossite.

selectionRules: `{"atLeastOneOf":["Cradily","Armaldo","Claydol"],"preferredLead":["Skarmory","Claydol"]}`.

| 후보 | 특성 | 기본 아이템 | 기술 ×4 | 역할 |
|---|---|---|---|---|
| Skarmory | Sturdy | Rocky Helmet | Brave Bird / Body Press / Roost / Toxic | Physical wall / recovery |
| Claydol | Levitate | Sitrus Berry | Earth Power / Psychic / Ice Beam / Reflect | Bulky coverage / screen |
| Aggron | Rock Head | Choice Band | Head Smash / Heavy Slam / Earthquake / Ice Punch | Physical wallbreaker |
| Cradily | Storm Drain | Leftovers | Giga Drain / Ancient Power / Toxic / Recover | Water check / attrition |
| Armaldo | Battle Armor | Lum Berry | Rock Slide / X-Scissor / Earthquake / Rock Polish | Setup physical sweeper |
| Metagross | Clear Body | Assault Vest | Meteor Mash / Zen Headbutt / Earthquake / Bullet Punch | Physical champion ace / priority |

signature carrier는 허용 층부터 지정 기믹 도구로 바뀐다. 후보별 IV/포인트는 기존 floor scaling을 사용한다.

Representative Lineups (F95, 1000회): Claydol / Metagross / Skarmory: 124회; Armaldo / Metagross / Skarmory: 124회; Aggron / Claydol / Metagross: 121회.

Design Notes: B/E/H: 6마리 광물/화석 팀을 유지하고 메가메타그로스의 Speed 역할 배분을 사용한다. 후보별 견제와 저항 분담을 강제 타입 통일보다 우선했다.

## 윤진 (named-wallace)

Category: champion; Power Tier: Champion; Ace: Milotic; AI: F45 expert, F95 expert.

Concept: 물 타입 챔피언의 회복·흡수·물리 압박.

Gimmick: z / Milotic / Waterium Z.

selectionRules: `{"atLeastOneOf":["Ludicolo","Whiscash"]}`.

| 후보 | 특성 | 기본 아이템 | 기술 ×4 | 역할 |
|---|---|---|---|---|
| Wailord | Water Veil | Assault Vest | Water Spout / Surf / Ice Beam / Heavy Slam | Bulky Water pressure |
| Tentacruel | Liquid Ooze | Black Sludge | Scald / Sludge Bomb / Ice Beam / Toxic | Special bulk / poison |
| Ludicolo | Rain Dish | Leftovers | Scald / Giga Drain / Ice Beam / Leech Seed | Water check / sustain |
| Whiscash | Oblivious | Sitrus Berry | Earthquake / Waterfall / Stone Edge / Dragon Dance | Electric immunity / setup |
| Gyarados | Intimidate | Lum Berry | Waterfall / Earthquake / Ice Fang / Dragon Dance | Physical setup / ground immunity |
| Milotic | Marvel Scale | Leftovers | Scald / Ice Beam / Toxic / Recover | Water control / recovery |

signature carrier는 허용 층부터 지정 기믹 도구로 바뀐다. 후보별 IV/포인트는 기존 floor scaling을 사용한다.

Representative Lineups (F95, 1000회): Milotic / Tentacruel / Whiscash: 239회; Gyarados / Milotic / Whiscash: 153회; Gyarados / Ludicolo / Milotic: 151회.

Design Notes: B/H: 루디콜로·메깅 중 하나로 물 타입의 약점을 보완한다. 관장 윤진과 별도 ID·후보·규칙이다.

## 마그마단 조직원 (magma-grunt)

Category: grunt; Power Tier: Normal / Lower Gym; Ace: 없음; AI: F45 tactical, F95 tactical.

Concept: 악·독 공용축과 불꽃·땅.

Gimmick: None.

selectionRules: `{}`.

| 후보 | 특성 | 기본 아이템 | 기술 ×4 | 역할 |
|---|---|---|---|---|
| Mightyena | Intimidate | Sitrus Berry | Crunch / Play Rough / Sucker Punch / Taunt | Attack reduction / priority |
| Crobat | Infiltrator | Sitrus Berry | Brave Bird / U-turn / Taunt / Roost | Fast pivot / disruption |
| Camerupt | Solid Rock | Sitrus Berry | Flamethrower / Earth Power / Ancient Power / Yawn | Fire / Ground wallbreaker |
| Weezing | Levitate | Sitrus Berry | Sludge Bomb / Flamethrower / Will-O-Wisp / Pain Split | Ground immunity / physical check |
| Magcargo | Flame Body | Sitrus Berry | Fire Blast / Earth Power / Power Gem / Shell Smash | Setup special breaker |

signature carrier는 허용 층부터 지정 기믹 도구로 바뀐다. 후보별 IV/포인트는 기존 floor scaling을 사용한다.

Representative Lineups (F95, 1000회): Camerupt / Crobat / Mightyena: 143회; Camerupt / Magcargo / Mightyena: 125회; Crobat / Magcargo / Mightyena: 125회.

Design Notes: A/H: 물/땅에 약한 조직 풀과 Basic~Tactical 한계. 낮은 등급이므로 보스와 같은 승률을 강제하지 않는다.

## 호걸 (magma-executive-tabitha)

Category: executive; Power Tier: Upper Gym; Ace: Camerupt; AI: Tactical ceiling.

Concept: 불꽃·땅 브레이커와 독·악 압박, 저수·트릭룸 지원.

Gimmick: None.

selectionRules: `{"preferredLead":["Crobat","Claydol"],"atLeastOneOf":["Crobat","Cacturne"]}`.

| 후보 | 특성 | 기본 아이템 | 기술 ×4 | 역할 |
|---|---|---|---|---|
| Camerupt | Solid Rock | Assault Vest | Fire Blast / Earth Power / Ancient Power / Flash Cannon | Immediate Fire/Ground special breaker |
| Mightyena | Intimidate | Choice Band | Crunch / Play Rough / Sucker Punch / Fire Fang | Intimidate / immediate Dark pressure / priority |
| Crobat | Infiltrator | Black Sludge | Brave Bird / Cross Poison / U-turn / Roost | Fast physical lead / Fairy-Grass pressure / pivot |
| Weezing | Levitate | Rocky Helmet | Sludge Wave / Flamethrower / Will-O-Wisp / Pain Split | Ground immunity / burn / non-projectile Poison pressure |
| Claydol | Levitate | Sitrus Berry | Earth Power / Psychic / Ice Beam / Trick Room | Bulky room setter / coverage |
| Cacturne | Water Absorb | Focus Sash | Seed Bomb / Knock Off / Sucker Punch / Drain Punch | Water immunity / Grass-Dark pressure / priority |

signature carrier는 허용 층부터 지정 기믹 도구로 바뀐다. 기존 층별 성장·선출기를 사용한다.

Representative Lineups (F95, 1000회): Camerupt / Claydol / Crobat: 193회; Camerupt / Crobat / Mightyena: 164회; Camerupt / Crobat / Weezing: 154회.

Design Notes: 마그카르고를 점토도리로 교체하고 저수 선인왕을 추가한 두 자리 조직 확장이다. 점토도리/선인왕을 원작 간부 소유로 주장하지 않는다. 크로뱃의 미사용 기가드레인에 물 대응을 의존하지 않는다. [추가 조정 검증](magma-executive-balance-report.md)에 기준 commit·세트·승률·holdout·선출·메가 비교를 기록했다.

## 구열 (magma-executive-courtney)

Category: executive; Power Tier: Upper Gym / Lower Elite Four; Ace: Camerupt; AI: Tactical ceiling.

Concept: 메가폭타와 저수 파트너, 트릭룸·독·악 압박으로 역할 분담.

Gimmick: Mega Camerupt / Cameruptite.

selectionRules: `{"preferredLead":["Crobat","Claydol"],"atLeastOneOf":["Crobat","Cacturne"]}`.

| 후보 | 특성 | 기본 아이템 | 기술 ×4 | 역할 |
|---|---|---|---|---|
| Camerupt | Solid Rock | Sitrus Berry | Fire Blast / Earth Power / Ancient Power / Flash Cannon | Immediate Fire/Ground special breaker |
| Mightyena | Intimidate | Choice Band | Crunch / Play Rough / Sucker Punch / Fire Fang | Intimidate / immediate Dark pressure / priority |
| Crobat | Infiltrator | Black Sludge | Brave Bird / Cross Poison / U-turn / Roost | Fast physical lead / Fairy-Grass pressure / pivot |
| Weezing | Levitate | Rocky Helmet | Sludge Wave / Flamethrower / Will-O-Wisp / Pain Split | Ground immunity / burn / non-projectile Poison pressure |
| Claydol | Levitate | Sitrus Berry | Earth Power / Psychic / Ice Beam / Trick Room | Bulky room setter / coverage |
| Cacturne | Water Absorb | Focus Sash | Seed Bomb / Knock Off / Sucker Punch / Drain Punch | Water immunity / Grass-Dark pressure / priority |

signature carrier는 허용 층부터 지정 기믹 도구로 바뀐다. 기존 층별 성장·선출기를 사용한다.

Representative Lineups (F95, 1000회): Camerupt / Claydol / Crobat: 193회; Camerupt / Crobat / Mightyena: 164회; Camerupt / Crobat / Weezing: 154회.

Design Notes: 마그카르고를 점토도리로 교체하고 저수 선인왕을 추가한 두 자리 조직 확장이다. 점토도리/선인왕을 원작 간부 소유로 주장하지 않는다. 크로뱃의 미사용 기가드레인에 물 대응을 의존하지 않는다. [추가 조정 검증](magma-executive-balance-report.md)에 기준 commit·세트·승률·holdout·선출·메가 비교를 기록했다.

## 마적 (magma-boss-maxie)

Category: boss; Power Tier: Champion+; Ace: Groudon; AI: F45 expert, F95 expert.

Concept: 그란돈과 메가폭타의 땅·불꽃 최종 보스.

Gimmick: mega / Camerupt / Cameruptite.

selectionRules: `{"required":["Groudon"],"preferredLead":["Groudon"]}`.

| 후보 | 특성 | 기본 아이템 | 기술 ×4 | 역할 |
|---|---|---|---|---|
| Groudon | Drought | Assault Vest | Precipice Blades / Fire Punch / Stone Edge / Thunder Punch | Legendary sun lead / bulky coverage |
| Camerupt | Solid Rock | Cameruptite | Flamethrower / Earth Power / Ancient Power / Yawn | Fire / Ground wallbreaker |
| Crobat | Infiltrator | Black Sludge | Brave Bird / U-turn / Taunt / Roost | Fast pivot / disruption |
| Weezing | Levitate | Rocky Helmet | Sludge Bomb / Flamethrower / Will-O-Wisp / Pain Split | Ground immunity / physical check |
| Mightyena | Intimidate | Sitrus Berry | Crunch / Play Rough / Sucker Punch / Taunt | Attack reduction / priority |

signature carrier는 허용 층부터 지정 기믹 도구로 바뀐다. 후보별 IV/포인트는 기존 floor scaling을 사용한다.

Representative Lineups (F96, 1000회): Camerupt / Groudon / Mightyena: 355회; Camerupt / Crobat / Groudon: 355회; Camerupt / Groudon / Weezing: 290회.

Design Notes: C/E/H/I: 그란돈 날씨 선봉·돌격조끼·번개펀치로 보완했다. 원시회귀를 메가폭타로 바꾼 영향도 포함한 비교이며 전설 자체를 삭제하지 않았다.

## 아쿠아단 조직원 (aqua-grunt)

Category: grunt; Power Tier: Normal / Lower Gym; Ace: 없음; AI: F45 tactical, F95 tactical.

Concept: 악·독 공용축과 물·악.

Gimmick: None.

selectionRules: `{}`.

| 후보 | 특성 | 기본 아이템 | 기술 ×4 | 역할 |
|---|---|---|---|---|
| Mightyena | Intimidate | Sitrus Berry | Crunch / Play Rough / Sucker Punch / Taunt | Attack reduction / priority |
| Crobat | Infiltrator | Sitrus Berry | Brave Bird / U-turn / Taunt / Roost | Fast pivot / disruption |
| Sharpedo | Speed Boost | Sitrus Berry | Waterfall / Crunch / Ice Fang / Aqua Jet | Speed setup / cleaner |
| Muk | Sticky Hold | Sitrus Berry | Poison Jab / Knock Off / Shadow Sneak / Curse | Bulky poison / priority |
| Wailord | Water Veil | Sitrus Berry | Water Spout / Surf / Ice Beam / Heavy Slam | Bulky Water pressure |

signature carrier는 허용 층부터 지정 기믹 도구로 바뀐다. 후보별 IV/포인트는 기존 floor scaling을 사용한다.

Representative Lineups (F95, 1000회): Mightyena / Muk / Sharpedo: 131회; Crobat / Mightyena / Sharpedo: 121회; Crobat / Muk / Wailord: 116회.

Design Notes: A/H: 악·물 공격과 독 공용축. 간부용 Protect+가속 메가 전제를 쓰지 않는다.

## 해조 (aqua-executive-matt)

Category: executive; Power Tier: Upper Gym / Lower Elite Four; Ace: Sharpedo; AI: F45 tactical, F95 tactical.

Concept: 가속 후 메가진화하는 빠른 물·악 압박.

Gimmick: mega / Sharpedo / Sharpedonite.

selectionRules: `{"preferredLast":["Sharpedo"]}`.

| 후보 | 특성 | 기본 아이템 | 기술 ×4 | 역할 |
|---|---|---|---|---|
| Sharpedo | Speed Boost | Life Orb | Waterfall / Crunch / Ice Fang / Protect | Speed setup / cleaner |
| Mightyena | Intimidate | Sitrus Berry | Crunch / Play Rough / Sucker Punch / Taunt | Attack reduction / priority |
| Crobat | Infiltrator | Black Sludge | Brave Bird / U-turn / Taunt / Roost | Fast pivot / disruption |
| Muk | Sticky Hold | Black Sludge | Poison Jab / Knock Off / Shadow Sneak / Curse | Bulky poison / priority |
| Crawdaunt | Adaptability | Life Orb | Crabhammer / Knock Off / Aqua Jet / Swords Dance | Physical breaker / priority |

signature carrier는 허용 층부터 지정 기믹 도구로 바뀐다. 후보별 IV/포인트는 기존 floor scaling을 사용한다.

Representative Lineups (F95, 1000회): Mightyena / Muk / Sharpedo: 248회; Crobat / Muk / Sharpedo: 242회; Crawdaunt / Muk / Sharpedo: 220회.

Design Notes: C/G/H: 가속 Protect와 메가샤크니아 마무리. 이연의 특수 교란 샤크니아와 역할이 다르다.

## 이연 (aqua-executive-shelly)

Category: executive; Power Tier: Upper Gym; Ace: Sharpedo; AI: F45 tactical, F95 tactical.

Concept: 도발·맹독·하품과 물 타입 운영.

Gimmick: None.

selectionRules: `{}`.

| 후보 | 특성 | 기본 아이템 | 기술 ×4 | 역할 |
|---|---|---|---|---|
| Sharpedo | Speed Boost | Sitrus Berry | Scald / Dark Pulse / Ice Beam / Taunt | Special disruption / coverage |
| Mightyena | Intimidate | Sitrus Berry | Crunch / Play Rough / Sucker Punch / Taunt | Attack reduction / priority |
| Crobat | Infiltrator | Black Sludge | Brave Bird / U-turn / Taunt / Roost | Fast pivot / disruption |
| Muk | Sticky Hold | Black Sludge | Poison Jab / Knock Off / Toxic / Pain Split | Poison attrition / sustain |
| Wailord | Water Veil | Leftovers | Scald / Ice Beam / Toxic / Protect | Poison pressure / sustain |

signature carrier는 허용 층부터 지정 기믹 도구로 바뀐다. 후보별 IV/포인트는 기존 floor scaling을 사용한다.

Representative Lineups (F95, 1000회): Mightyena / Muk / Sharpedo: 203회; Crobat / Muk / Sharpedo: 193회; Muk / Sharpedo / Wailord: 191회.

Design Notes: A/D/H: 샤크니아 도발·질뻐기 맹독/아픔나누기·고래왕 방어로 운영한다. 메가를 강제하지 않는다.

## 아강 (aqua-boss-archie)

Category: boss; Power Tier: Champion+; Ace: Kyogre; AI: F45 expert, F95 expert.

Concept: 가이오가와 메가샤크니아의 물·악 최종 보스.

Gimmick: mega / Sharpedo / Sharpedonite.

selectionRules: `{"required":["Kyogre"],"preferredLast":["Sharpedo"]}`.

| 후보 | 특성 | 기본 아이템 | 기술 ×4 | 역할 |
|---|---|---|---|---|
| Kyogre | Drizzle | Leftovers | Surf / Thunder / Ice Beam / Calm Mind | Legendary rain boss |
| Sharpedo | Speed Boost | Sharpedonite | Waterfall / Crunch / Ice Fang / Protect | Speed setup / cleaner |
| Crobat | Infiltrator | Black Sludge | Brave Bird / U-turn / Taunt / Roost | Fast pivot / disruption |
| Muk | Sticky Hold | Black Sludge | Poison Jab / Knock Off / Shadow Sneak / Curse | Bulky poison / priority |
| Mightyena | Intimidate | Sitrus Berry | Crunch / Play Rough / Sucker Punch / Taunt | Attack reduction / priority |

signature carrier는 허용 층부터 지정 기믹 도구로 바뀐다. 후보별 IV/포인트는 기존 floor scaling을 사용한다.

Representative Lineups (F96, 1000회): Kyogre / Muk / Sharpedo: 397회; Kyogre / Mightyena / Sharpedo: 396회; Crobat / Kyogre / Sharpedo: 207회.

Design Notes: G/H/I: 가이오가 비와 메가샤크니아 마무리. 원시가이오가의 압도적 내구를 재현하려고 스탯 보너스를 주지 않았다.

## 재현

```powershell
node --import tsx scripts/review-hoenn-npc-samples.ts
node scripts/export-normal-npc-runtime.mjs
node scripts/export-normal-npc-runtime.mjs --check
$env:HOENN_SEEDS='4'
node --import tsx scripts/simulate-hoenn-npcs.ts
node --import tsx scripts/report-hoenn-npcs.ts
```

전체 결과와 제한은 [밸런스 보고서](hoenn-named-trainer-balance-report.md), 기계 판독 요약은 `artifacts/reports/npc/hoenn-audit.json` 참조.
