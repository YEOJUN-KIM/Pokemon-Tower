# 성도 네임드 9종 단일 후보 빌드 확장

## 범위와 원칙

기존 6종 파일럿 다음 단계로 관장 5명과 사천왕 4명만 확장했다. 검토 원본은 `scripts/data/npc/normal-npc-samples.json`이며 기존 exporter로 runtime을 생성한다. runtime 직접 편집, 공통 helper/AI/이벤트/reward 개조는 없다.

9명은 각각 `allFloors: true`, `select: true`, `required: [ace]`를 사용한다. 기존 `selectNamedEntries`가 seed로 3마리를 선택한다. 조우/층/팀 훈련/기믹 개방은 종전 규칙이며 Early/Late 복제가 없다. 원작 순서에 따른 스탯 배율도 없다.

참고는 프로젝트의 `johto-original-trainers.json`, `johtoOriginalBuild()`, `johtoMoveUpgrades`다. 원작 reference 자체와 trainer catalog는 수정하지 않았다. 아래 빌드는 원작 재현 세트가 아니라 원작 정체성을 유지한 게임용 검토 세트다.

## 후보와 에이스

| NPC | 후보 수 | Ace | Tactic | 기믹 |
|---|---:|---|---|---|
| 호일 / bugsy | 6 | Scizor | physical | mega Scizor |
| 유빈 / morty | 5 | Gengar | status | mega Gengar |
| 사도 / chuck | 6 | Poliwrath | physical | z Poliwrath |
| 규리 / jasmine | 6 | Steelix | bulk | mega Steelix |
| 류옹 / pryce | 6 | Mamoswine | balanced | tera Mamoswine |
| 일목 / will | 6 | Xatu | special | tera Xatu |
| 독수 / koga | 6 | Crobat | status | tera Crobat |
| 시바 / bruno | 6 | Machamp | physical | dynamax Machamp |
| 카렌 / karen | 6 | Umbreon | balanced | z Umbreon |

관장·사천왕 모두 50층 미만 Tactical, 50층부터 Expert라는 현재 `npcAi()` 규칙을 유지한다. 기믹 사용 가능 여부는 tier와 별개이며 현재 관장/사천왕 개방 기준은 55층이다.

## 호일 / bugsy

- 원작/HGSS reference: `johtoReferences.bugsy`의 재대결 파티.
- 후보 pool: Scizor, Shedinja, Yanmega, Pinsir, Heracross, Vespiquen.
- Ace: **Scizor**, 실제 선발 필수.
- 대표 3마리 조합: Pinsir, Scizor, Vespiquen (55층, seed `[1,2,3,4]`).
- Tactic: `physical`.
- AI: <50 Tactical / ≥50 Expert.
- 전투 컨셉: Scizor 중심의 물리 벌레 공격·선공·pivot.
- 주요 기술: Bullet Punch, U-turn, Superpower, Swords Dance.
- 주요 도구: Sitrus Berry, Focus Sash, Wise Glasses, Hard Stone, Flame Orb, Leftovers.
- 기믹: 기존 mega / Scizor / Scizorite 유지.
- 원작 유지: 6종과 Technician/Guts/Wonder Guard 등 원작 특성, Bullet Punch·Counter를 유지.
- 게임용 변경: Scizor X-Scissor를 U-turn으로, Pinsir의 일격기를 기존 upgrade 철학대로 Swords Dance로 교체. 회피·혼란 의존도를 줄이고 Heracross에 Flame Orb를 배정.

| Pokemon | Ability | 기본 도구 | 4 distinct moves |
|---|---|---|---|
| Scizor | Technician | Sitrus Berry | Bullet Punch, U-turn, Superpower, Swords Dance |
| Shedinja | Wonder Guard | Focus Sash | X-Scissor, Shadow Sneak, Toxic, Protect |
| Yanmega | Tinted Lens | Wise Glasses | Bug Buzz, Air Slash, Ancient Power, Giga Drain |
| Pinsir | Mold Breaker | Hard Stone | X-Scissor, Rock Slide, Earthquake, Swords Dance |
| Heracross | Guts | Flame Orb | Megahorn, Counter, Stone Edge, Close Combat |
| Vespiquen | Pressure | Leftovers | Attack Order, Air Slash, Roost, Toxic |

## 유빈 / morty

- 원작/HGSS reference: `johtoReferences.morty`의 재대결 파티.
- 후보 pool: Gengar, Drifblim, Dusknoir, Sableye, Mismagius.
- Ace: **Gengar**, 실제 선발 필수.
- 대표 3마리 조합: Sableye, Gengar, Mismagius (55층, seed `[1,2,3,4]`).
- Tactic: `status`.
- AI: <50 Tactical / ≥50 Expert.
- 전투 컨셉: Gengar의 빠른 특수 공격과 상태이상·Destiny Bond 교란.
- 주요 기술: Shadow Ball, Sludge Bomb, Thunderbolt, Destiny Bond.
- 주요 도구: Spell Tag, Sitrus Berry, Leftovers, Black Glasses, Wise Glasses.
- 기믹: 기존 mega / Gengar / Gengarite 유지.
- 원작 유지: HGSS의 고스트 후보 5종, Drifblim의 Sitrus/Unburden, Dusknoir의 방해 역할을 유지.
- 게임용 변경: 중복 Gengar를 하나로 통합. Gengar Levitate는 현재 엔진의 Cursed Body로 적용. Mismagius의 저위력 공격과 Mean Look/Perish Song 의존 구성을 특수 coverage와 일부 setup으로 변경.

| Pokemon | Ability | 기본 도구 | 4 distinct moves |
|---|---|---|---|
| Gengar | Cursed Body | Spell Tag | Shadow Ball, Sludge Bomb, Thunderbolt, Destiny Bond |
| Drifblim | Unburden | Sitrus Berry | Shadow Ball, Thunderbolt, Strength Sap, Destiny Bond |
| Dusknoir | Pressure | Leftovers | Shadow Punch, Earthquake, Pain Split, Will-O-Wisp |
| Sableye | Stall | Black Glasses | Fake Out, Knock Off, Recover, Thunder Wave |
| Mismagius | Levitate | Wise Glasses | Shadow Ball, Dazzling Gleam, Will-O-Wisp, Nasty Plot |

## 사도 / chuck

- 원작/HGSS reference: `johtoReferences.chuck`의 재대결 파티.
- 후보 pool: Poliwrath, Medicham, Hitmonchan, Hitmonlee, Breloom, Annihilape.
- Ace: **Poliwrath**, 실제 선발 필수.
- 대표 3마리 조합: Hitmonlee, Poliwrath, Annihilape (55층, seed `[1,2,3,4]`).
- Tactic: `physical`.
- AI: <50 Tactical / ≥50 Expert.
- 전투 컨셉: Poliwrath 중심의 정면 물리 격투·타격 회복.
- 주요 기술: Waterfall, Drain Punch, Ice Punch, Bulk Up.
- 주요 도구: Sitrus Berry, Twisted Spoon, Black Belt, Wide Lens, Toxic Orb, Expert Belt.
- 기믹: 기존 z / Poliwrath / Waterium Z 유지.
- 원작 유지: Poliwrath, Medicham, Hitmon 계열과 Breloom의 Poison Heal/Toxic Orb를 유지.
- 게임용 변경: 수집 규칙에 따라 Primeape→Annihilape, 사용할 수 없는 Anger Point 대신 합법 Vital Spirit. 회피·Swagger·조건부 Focus Punch를 직접 공격/Drain Punch로 교체. Bulk Up은 Poliwrath에만 배정.

| Pokemon | Ability | 기본 도구 | 4 distinct moves |
|---|---|---|---|
| Poliwrath | Water Absorb | Sitrus Berry | Waterfall, Drain Punch, Ice Punch, Bulk Up |
| Medicham | Pure Power | Twisted Spoon | Psycho Cut, High Jump Kick, Thunder Punch, Ice Punch |
| Hitmonchan | Iron Fist | Black Belt | Drain Punch, Mach Punch, Fire Punch, Ice Punch |
| Hitmonlee | Reckless | Wide Lens | High Jump Kick, Blaze Kick, Fake Out, Knock Off |
| Breloom | Poison Heal | Toxic Orb | Drain Punch, Seed Bomb, Stone Edge, Mach Punch |
| Annihilape | Vital Spirit | Expert Belt | Close Combat, Shadow Punch, Thunder Punch, U-turn |

## 규리 / jasmine

- 원작/HGSS reference: `johtoReferences.jasmine`의 재대결 파티.
- 후보 pool: Steelix, Metagross, Magnezone, Skarmory, Bronzong, Empoleon.
- Ace: **Steelix**, 실제 선발 필수.
- 대표 3마리 조합: Skarmory, Steelix, Empoleon (55층, seed `[1,2,3,4]`).
- Tactic: `bulk`.
- AI: <50 Tactical / ≥50 Expert.
- 전투 컨셉: Steelix의 내구·땅/강철 반격과 동료의 특수 coverage.
- 주요 기술: Heavy Slam, Earthquake, Rock Slide, Toxic.
- 주요 도구: Leftovers, Metal Coat, Magnet, Sitrus Berry, Twisted Spoon, Mystic Water.
- 기믹: 기존 mega / Steelix / Steelixite 유지.
- 원작 유지: HGSS 6종과 Sturdy/Clear Body/Heatproof/Torrent를 유지.
- 게임용 변경: Magnezone의 Zap Cannon/Lock-On은 기존 upgrade처럼 Thunderbolt/Volt Switch로 전환. Bronzong의 Dream Eater를 무조건 공격 가능한 Psychic으로 변경. Steelix는 HP/특방 비중, Metagross는 공격적 마무리 담당.

| Pokemon | Ability | 기본 도구 | 4 distinct moves |
|---|---|---|---|
| Steelix | Sturdy | Leftovers | Heavy Slam, Earthquake, Rock Slide, Toxic |
| Metagross | Clear Body | Metal Coat | Meteor Mash, Bullet Punch, Earthquake, Thunder Punch |
| Magnezone | Sturdy | Magnet | Thunderbolt, Flash Cannon, Volt Switch, Mirror Coat |
| Skarmory | Sturdy | Sitrus Berry | Steel Wing, Brave Bird, Roost, Spikes |
| Bronzong | Heatproof | Twisted Spoon | Flash Cannon, Psychic, Shadow Ball, Hypnosis |
| Empoleon | Torrent | Mystic Water | Surf, Ice Beam, Flash Cannon, Aqua Jet |

## 류옹 / pryce

- 원작/HGSS reference: `johtoReferences.pryce`의 재대결 파티.
- 후보 pool: Mamoswine, Abomasnow, Dewgong, Glalie, Froslass, Walrein.
- Ace: **Mamoswine**, 실제 선발 필수.
- 대표 3마리 조합: Froslass, Mamoswine, Walrein (55층, seed `[1,2,3,4]`).
- Tactic: `balanced`.
- AI: <50 Tactical / ≥50 Expert.
- 전투 컨셉: Mamoswine의 얼음·땅 물리 압박과 물/얼음 특수 동료.
- 주요 기술: Earthquake, Icicle Crash, Ice Shard, Stone Edge.
- 주요 도구: Sitrus Berry, Never-Melt Ice, Lum Berry, Life Orb, Focus Sash, Leftovers.
- 기믹: 기존 tera / Mamoswine 유지.
- 원작 유지: HGSS 6종, Snow Warning/Thick Fat/Ice Body, Dewgong의 Lum Berry·Rest/Sleep Talk를 유지.
- 게임용 변경: 일격기와 회피 위주 기술을 일관된 공격으로 변경. Mamoswine은 Ice Shard 선공, Froslass는 Ghost/Electric coverage·Destiny Bond, Glalie는 합법 Earthquake coverage를 사용.

| Pokemon | Ability | 기본 도구 | 4 distinct moves |
|---|---|---|---|
| Mamoswine | Snow Cloak | Sitrus Berry | Earthquake, Icicle Crash, Ice Shard, Stone Edge |
| Abomasnow | Snow Warning | Never-Melt Ice | Ice Shard, Wood Hammer, Earthquake, Blizzard |
| Dewgong | Thick Fat | Lum Berry | Surf, Ice Beam, Rest, Sleep Talk |
| Glalie | Inner Focus | Life Orb | Ice Beam, Dark Pulse, Shadow Ball, Earthquake |
| Froslass | Snow Cloak | Focus Sash | Ice Beam, Shadow Ball, Thunderbolt, Destiny Bond |
| Walrein | Ice Body | Leftovers | Surf, Blizzard, Body Slam, Crunch |

## 일목 / will

- 원작/HGSS reference: `johtoReferences.will`의 재대결 파티.
- 후보 pool: Xatu, Bronzong, Jynx, Grumpig, Slowbro, Gardevoir.
- Ace: **Xatu**, 실제 선발 필수.
- 대표 3마리 조합: Slowbro, Xatu, Gardevoir (55층, seed `[1,2,3,4]`).
- Tactic: `special`.
- AI: <50 Tactical / ≥50 Expert.
- 전투 컨셉: Xatu 중심 특수 에스퍼·coverage·회복의 조합.
- 주요 기술: Psychic, Shadow Ball, Air Slash, Roost.
- 주요 도구: Sitrus Berry, Metal Coat, Never-Melt Ice, Twisted Spoon, Leftovers, Wise Glasses.
- 기믹: 기존 tera / Xatu 유지.
- 원작 유지: HGSS 6종과 Early Bird/Forewarn/Own Tempo/Trace를 유지.
- 게임용 변경: Xatu의 Quick Attack/Confuse Ray를 Air Slash/Roost로 변경. Jynx의 Dream Eater를 기존 upgrade처럼 Psychic으로 교체. Calm Mind는 Gardevoir만 사용하고 Slowbro는 실제 AI가 인식하는 Slack Off로 지속력을 담당.

| Pokemon | Ability | 기본 도구 | 4 distinct moves |
|---|---|---|---|
| Xatu | Early Bird | Sitrus Berry | Psychic, Shadow Ball, Air Slash, Roost |
| Bronzong | Heatproof | Metal Coat | Psychic, Flash Cannon, Shadow Ball, Reflect |
| Jynx | Forewarn | Never-Melt Ice | Psychic, Ice Beam, Focus Blast, Lovely Kiss |
| Grumpig | Own Tempo | Twisted Spoon | Psychic, Power Gem, Focus Blast, Thunder Wave |
| Slowbro | Own Tempo | Leftovers | Psychic, Surf, Ice Beam, Slack Off |
| Gardevoir | Trace | Wise Glasses | Psychic, Moonblast, Focus Blast, Calm Mind |

## 독수 / koga

- 원작/HGSS reference: `johtoReferences.koga`의 재대결 파티.
- 후보 pool: Crobat, Skuntank, Venomoth, Toxicroak, Swalot, Muk.
- Ace: **Crobat**, 실제 선발 필수.
- 대표 3마리 조합: Toxicroak, Crobat, Swalot (55층, seed `[1,2,3,4]`).
- Tactic: `status`.
- AI: <50 Tactical / ≥50 Expert.
- 전투 컨셉: Crobat 속도·Poison STAB와 분담된 정교한 상태전.
- 주요 기술: Cross Poison, Brave Bird, U-turn, Roost.
- 주요 도구: Sitrus Berry, Black Glasses, Wise Glasses, Black Belt, Leftovers, Black Sludge.
- 기믹: 기존 tera / Crobat 유지.
- 원작 유지: HGSS 6종, Black Sludge Muk와 Leftovers Swalot, Dry Skin/Tinted Lens를 유지.
- 게임용 변경: Fly/회피/Swagger를 직접 공격·pivot·coverage로 변경. Toxic은 Skuntank/Muk, setup은 Venomoth, Yawn은 Swalot으로 분담. Explosion으로 전투를 즉시 끝내는 방식은 사용하지 않음.

| Pokemon | Ability | 기본 도구 | 4 distinct moves |
|---|---|---|---|
| Crobat | Inner Focus | Sitrus Berry | Cross Poison, Brave Bird, U-turn, Roost |
| Skuntank | Aftermath | Black Glasses | Poison Jab, Sucker Punch, Flamethrower, Toxic |
| Venomoth | Tinted Lens | Wise Glasses | Bug Buzz, Psychic, Sludge Bomb, Quiver Dance |
| Toxicroak | Dry Skin | Black Belt | Poison Jab, Drain Punch, Sucker Punch, Ice Punch |
| Swalot | Sticky Hold | Leftovers | Sludge Bomb, Ice Beam, Pain Split, Yawn |
| Muk | Sticky Hold | Black Sludge | Poison Jab, Brick Break, Shadow Sneak, Toxic |

## 시바 / bruno

- 원작/HGSS reference: `johtoReferences.bruno`의 재대결 파티.
- 후보 pool: Machamp, Hitmontop, Hitmonlee, Hitmonchan, Hariyama, Lucario.
- Ace: **Machamp**, 실제 선발 필수.
- 대표 3마리 조합: Hariyama, Machamp, Lucario (55층, seed `[1,2,3,4]`).
- Tactic: `physical`.
- AI: <50 Tactical / ≥50 Expert.
- 전투 컨셉: Machamp 중심 No Guard 공격과 완성된 물리 coverage·선공·Counter.
- 주요 기술: Dynamic Punch, Stone Edge, Bullet Punch, Ice Punch.
- 주요 도구: Black Belt, Expert Belt, Wide Lens, Sitrus Berry, Flame Orb, Metal Coat.
- 기믹: 기존 dynamax / Machamp / Dynamax Band 유지.
- 원작 유지: HGSS 6종과 No Guard/Technician/Iron Fist/Guts, Counter와 Extreme Speed를 유지.
- 게임용 변경: Foresight·Swagger·조건부 Reversal/Substitute를 coverage와 선공기로 보완. Lucario는 합법 원작 Iron Tail 유지. Bulk Up은 Hariyama만 사용하며 Flame Orb와 Guts를 결합.

| Pokemon | Ability | 기본 도구 | 4 distinct moves |
|---|---|---|---|
| Machamp | No Guard | Black Belt | Dynamic Punch, Stone Edge, Bullet Punch, Ice Punch |
| Hitmontop | Technician | Expert Belt | Close Combat, Earthquake, Counter, Mach Punch |
| Hitmonlee | Reckless | Wide Lens | Close Combat, Blaze Kick, Knock Off, Fake Out |
| Hitmonchan | Iron Fist | Sitrus Berry | Drain Punch, Bullet Punch, Thunder Punch, Ice Punch |
| Hariyama | Guts | Flame Orb | Close Combat, Payback, Bullet Punch, Bulk Up |
| Lucario | Inner Focus | Metal Coat | Close Combat, Iron Tail, Crunch, Extreme Speed |

## 카렌 / karen

- 원작/HGSS reference: `johtoReferences.karen`의 재대결 파티.
- 후보 pool: Umbreon, Weavile, Absol, Spiritomb, Houndoom, Honchkrow.
- Ace: **Umbreon**, 실제 선발 필수.
- 대표 3마리 조합: Houndoom, Umbreon, Honchkrow (55층, seed `[1,2,3,4]`).
- Tactic: `balanced`.
- AI: <50 Tactical / ≥50 Expert.
- 전투 컨셉: Umbreon 지속력과 공격적인 악 타입 물리/특수 동료.
- 주요 기술: Foul Play, Toxic, Moonlight, Sucker Punch.
- 주요 도구: Leftovers, Never-Melt Ice, Scope Lens, Sitrus Berry, Charcoal, Sharp Beak.
- 기믹: 기존 z / Umbreon / Darkinium Z 유지.
- 원작 유지: HGSS 6종, Synchronize/Super Luck/Flash Fire, Weavile 선공과 Houndoom 특수 setup을 유지.
- 게임용 변경: Umbreon은 Foul Play·Toxic·Moonlight·Sucker Punch로 역할을 정돈하고 HP/방어/특방에 배분. 저위력·혼란·Perish Song 의존을 coverage로 교체. 팀 전체를 stall로 만들지 않음.

| Pokemon | Ability | 기본 도구 | 4 distinct moves |
|---|---|---|---|
| Umbreon | Synchronize | Leftovers | Foul Play, Toxic, Moonlight, Sucker Punch |
| Weavile | Pressure | Never-Melt Ice | Ice Punch, Night Slash, Low Kick, Ice Shard |
| Absol | Super Luck | Scope Lens | Night Slash, Psycho Cut, Superpower, Sucker Punch |
| Spiritomb | Pressure | Sitrus Berry | Shadow Ball, Dark Pulse, Will-O-Wisp, Pain Split |
| Houndoom | Flash Fire | Charcoal | Nasty Plot, Dark Pulse, Flamethrower, Sludge Bomb |
| Honchkrow | Super Luck | Sharp Beak | Thunder Wave, Drill Peck, Sucker Punch, Superpower |

## 육성·도구·기믹

기존 층별 IV 배정과 `templateProfile`의 EV 예산을 그대로 사용한다. 후보의 66점은 기준 비율이며 실제 층 예산으로 축소된다. 기본 공격형은 HP10/공격32/스피드24, 특수형은 HP10/특공32/스피드24, 내구 공격형은 HP26/공격24/방어8/특방8이다. Steelix는 HP26/공격16/특방24, Umbreon은 HP26/방어20/특방20으로 같은 예산 안에서 역할을 표현한다. 별도 스탯/레벨/데미지 배율은 없다.

표의 도구는 기믹 개방 전 기본값이다. 개방 후 Mega Stone·Z Crystal·Dynamax Band가 해당 carrier의 도구를 대체한다. Tera carrier의 기본 도구는 유지한다. 이는 기존 공통 로직이며 별도 NPC 예외를 만들지 않았다.

## 기존 파일럿·저장 호환성 보호

Falkner/Whitney/Clair/Rocket Grunt/Archer/Giovanni의 원본과 runtime 정의는 변경하지 않았다. 원본의 대상 외 레코드와 공통 metadata도 구조 비교로 동일성을 확인한다. 기존 파일럿 테스트와 정의 전체의 SHA-256 회귀 검사를 유지한다.

저장된 packed opponent team/seed/AI/reward는 재생성하지 않는다. 신규 조우 생성만 새 후보를 사용한다. retry/reconnect/replay/Rocket/Challenger/Raid/hidden boss/Teleport 경로와 QA 설정은 변경하지 않았다.

## AI 실험 backlog

v11을 수정하지 않았다. Milk Drink, Moonlight, Rest/Sleep Talk, Yawn, Hypnosis/Lovely Kiss, Spikes/Reflect 등의 비전용 점수 기술은 캐릭터성을 위한 보존 또는 이후 평가 대상이며 합리적인 사용을 보장하지 않는다. 원래 파일럿의 U-turn/pivot 체감과 기믹이 핵심 도구를 대체하는 영향도 같이 평가한다. 회복기 인식·개별 점수·NPC 전용 AI 예외는 이번에 패치하지 않았다.

Shedinja의 Wonder Guard, Breloom의 Poison Heal/Toxic Orb, Guts/Flame Orb, 회복 도구 등은 엔진의 기존 기작으로 작동한다. 자동 배틀 종료·합법성 검증은 체감 난이도나 승률 개선을 입증하는 플레이테스트 결과와 구분한다.

## 검증 결과 (2026-10-18)

- 원본 수정 → `node scripts/export-normal-npc-runtime.mjs` → `node scripts/export-normal-npc-runtime.mjs --check`: **311개 runtime 정의 일치**.
- `node node_modules/tsx/dist/cli.mjs --test tests/*.test.ts`: **780개 통과**.
- 마지막 Steelix/Umbreon 역할 배분 조정 후 `tests/johto-named-trainers.test.ts`와 기존 `tests/named-pilot.test.ts` 재실행: **27개 통과**.
- `node node_modules/typescript/bin/tsc --noEmit`: 통과.
- `node --require ./scripts/windows-build-links.cjs node_modules/next/dist/bin/next build`: 최종 데이터로 통과.
- `node --import tsx node_modules/@playwright/test/cli.js test e2e/johto-named-trainers.spec.ts e2e/named-pilot.spec.ts e2e/villain-campaign.spec.ts --reporter=line`: **16개 통과**.

새 테스트는 9명 모든 후보의 수집 가능 여부·특성·지원 도구·중복 없는 4기술·Showdown 합법성,
5/49/50/55/95/100층의 선발·에이스·variation·동일 seed 결정론·EV 예산·AI tier를 검사한다.
9명 모두 실제 v11 배틀 종료·합법 행동·replay를 확인했다. 기존 6종 전체 runtime 정의는
확장 전 SHA-256 값으로 고정했다. 원본/runtime 구조 비교에서도 9명 밖 레코드와 공통
metadata가 동일하고, 대상 9명의 signature가 종전과 같음을 확인했다.

새 E2E 대표는 Bugsy(데스크톱), Morty(모바일), Jasmine(데스크톱), Karen(모바일)이다.
조우 → 입장 → 실제 1턴 → 새로고침 후 ID/공개 로그/상대 팀/seed/AI 보존을 확인한다.
기존 전체 unit/integration 회귀에는 retry/reconnect/Rocket snapshot/Champion/hidden boss/
Challenger/Raid/Teleport가 포함된다.

## 관련 기록

- [기존 6종 파일럿](named-trainer-sample-pilot.md)
- [v11 AI 구조](../engineering/npc-ai.md)
