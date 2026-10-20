# 대표 NPC 6종 빌드 파일럿

## 범위와 설계 기준

대상은 비상·꼭두·이향·Rocket Grunt·Archer·Giovanni뿐이다. 같은 층의
네임드 훈련 곡선을 공유하며 원작 진행 순서를 전력 차이로 복제하지 않는다.
AI는 기존 v11을 그대로 사용한다. 포켓몬별 역할 프레임워크는 추가하지 않았다.

`scripts/data/npc/normal-npc-samples.json`이 export 원본이고,
`scripts/export-normal-npc-runtime.mjs`가 `src/data/normal-npc-templates.json`을
생성한다. 기존 템플릿에 `allFloors / select / required`만 추가했다.
대상은 각각 하나의 후보 빌드이며 Early/Late 복제가 없다. 다른 NPC는 종전
단계별 템플릿을 사용한다. 기존 `selectNamedEntries`로 3마리만 선택한다.
캠페인 별칭은 기존 `canonicalNpcId`로 동일 원본을 사용한다.

IV는 기존 named IV 배정, EV는 기존 `templateProfile`의 실제 층 예산으로
계산한다. 단일 빌드의 EV 비율은 공격형 10 HP / 32 공격 / 24 스피드,
특수형 10 HP / 32 특공 / 24 스피드, 내구형 26 HP / 24 공격 / 8 방어 /
8 특방이다. 별도의 배율·레벨·훈련 시스템은 없다. 조무래기는 named IV
보너스를 받지 않는다. 기존 기믹 개방 층도 유지한다.

원작 자료는 `johto-original-trainers.json`, `johtoOriginalBuild`,
`johtoMoveUpgrades`를 그대로 보존한다. Johto 세 관장은 저장된 HGSS
재대결 후보를 우선 사용했다. Rocket은 현재 catalog와 조직 후보가 기준이며
아래 세트를 원작 게임의 정확한 세트라고 주장하지 않는다.

## 비상 / Falkner

- 원작/기존 참고: HGSS 재대결의 Pidgeot, Staraptor, Noctowl, Swellow,
  Honchkrow, Pelipper. Staraptor의 Intimidate와 Swellow의 Guts + Flame Orb 유지.
- 최종 후보: 위 6마리. Ace: **Pidgeot** 필수.
- 대표 3마리 예: Honchkrow / Pidgeot / Pelipper.
- Tactic: `speed`. AI: 49층까지 Tactical, 50층부터 Expert.
- 전투 컨셉: U-turn·선공기를 통한 템포, Roost 회복, 비행 공격.
- 주요 도구: Flame Orb, Sharp Beak, Sitrus Berry, Leftovers.
- 주요 기술: U-turn, Brave Bird, Roost, Facade, Quick Attack, Sucker Punch.
- 기믹: 개방 후 Pidgeot + Flyinium Z. 물리 공격 빌드에 맞춰 기존 Mega에서 변경.
- 기존 대비: 고정 Honchkrow/Pelipper/Pidgeot 3마리와 전·후반 서로 다른
  기술을 단일 후보군으로 통합. Double Team·Swagger 중심의 회피 의존도 축소.

## 꼭두 / Whitney

- 원작/기존 참고: HGSS 재대결의 Miltank, Girafarig, Lickilicky, Bibarel,
  Delcatty, Clefable. 수집 가능 종 규칙 때문에 Girafarig는 Farigiraf로 진화 적용.
- 최종 후보: Miltank / Farigiraf / Lickilicky / Bibarel / Delcatty / Clefable.
- Ace: **Miltank** 필수. 대표 3마리 예: Bibarel / Miltank / Clefable.
- Tactic: `bulk`. AI: 49층까지 Tactical, 50층부터 Expert.
- 전투 컨셉: Miltank의 Body Slam·Leftovers와 내구, 동료의 특수 공격·셋업으로 지속 압박.
- 주요 도구: Leftovers, Sitrus Berry, Silk Scarf, Magic Guard와 조합한 Life Orb.
- 주요 기술: Body Slam, Earthquake, Milk Drink, Toxic, Calm Mind, Soft-Boiled.
- 기믹: 기존 Miltank + Normalium Z 유지. 개방 후 Leftovers를 대체한다.
- 기존 대비: Miltank의 공격/내구 배분을 강화하고 혼합 공격 EV·중복 공격을 정리.
  Delcatty는 Normalize가 커버리지를 지우지 않도록 합법 특성 Cute Charm으로 조정.

## 이향 / Clair

- 원작/기존 참고: HGSS Kingdra, Gyarados, Dragonite, Charizard, Aerodactyl.
  Dragonair는 현 수집 규칙에서 Dragonite와 중복되므로 기존 catalog의 Flygon으로 보완.
- 최종 후보: Kingdra / Gyarados / Flygon / Aerodactyl / Charizard / Dragonite.
- Ace: **Kingdra** 필수. 대표 3마리 예: Charizard / Kingdra / Dragonite.
- Tactic: `balanced`. AI: 49층까지 Tactical, 50층부터 Expert.
- 전투 컨셉: Kingdra의 물·드래곤·얼음 커버리지, 물리 동료와 비행/땅 면역의 상성 보완.
- 주요 도구: Leftovers, Mystic Water, Soft Sand, Charcoal, Sitrus Berry.
- 주요 기술: Surf, Dragon Pulse, Ice Beam, Earthquake, U-turn, Extreme Speed, Roost.
- 기믹: 기존 Kingdra + Waterium Z 유지.
- 기존 대비: Dragon Breath/Hyper Beam 위주의 낮은 일관성을 개선하고 물리·특수
  공격수를 구분. Dragon Dance는 Gyarados만 사용하며 팀 전체에 복제하지 않는다.

## Team Rocket Grunt

- 원작/기존 참고: 현 `organizationGrunt('rocket')`의 Raticate, Golbat,
  Arbok, Weezing, Muk, Persian. Golbat은 수집 가능 종 규칙에 맞춰 Crobat으로 적용.
- 최종 후보: Raticate / Crobat / Arbok / Weezing / Muk / Persian.
- Ace: 없음. 대표 3마리 예: Weezing / Arbok / Persian.
- Tactic: `status`. AI: 1–19층 Basic, 20층부터 Tactical; Expert 불가.
- 전투 컨셉: 약한 조직원 전력 안에서 독·화상·마비·선공·U-turn으로 방해.
- 주요 도구: Raticate의 Silk Scarf만 지급. 나머지 빈 슬롯 유지.
- 주요 기술: Poison Fang, Will-O-Wisp, Toxic, Thunder Wave, Quick Attack, U-turn.
- 기믹: 없음.
- 기존 대비: 임의 기술 생성 대신 검토한 조직 전용 빌드로 통일. 기존 seeded
  조합 선택으로 서로 다른 3마리가 나오며 새 variant 시스템은 없다.

## 아폴로 / Archer

- 원작/기존 참고: 현 Houndoom 중심 Rocket 간부 후보. 중복되는 Golbat/Crobat은
  수집 가능 종인 Crobat으로 통합했다.
- 최종 후보: Houndoom / Crobat / Weezing / Muk / Raticate.
- Ace: **Houndoom** 필수. 대표 3마리 예: Crobat / Houndoom / Raticate.
- Tactic: `status`, `aiCeiling: tactical` 유지. AI: Tactical.
- 전투 컨셉: Houndoom 특수 공격, Crobat 템포, 독 동료의 방해로 조무래기 전술을 정돈.
- 주요 도구: Charcoal, Sitrus Berry, Black Sludge, Poison Barb.
- 주요 기술: Dark Pulse, Flamethrower, Will-O-Wisp, Nasty Plot, U-turn, Roost.
- 기믹: 기존 Mega Houndoom 유지. 개방 후 Charcoal을 Houndoominite로 대체.
- 기존 대비: 모든 동료에 Toxic을 반복하지 않고 화상·회복·물리 압박을 분담.
  Crunch/Dark Pulse, Pluck/비행 공격 같은 중복을 정리했다.

## 비주기 / Giovanni

- 원작/기존 참고: 현재 catalog의 Persian, Nidoking, Rhyperior, Nidoqueen,
  Dugtrio, Kangaskhan. 조직 보스의 Persian과 땅 타입 정체성을 우선했다.
- 최종 후보: 위 6마리. Ace: **Nidoking**, **Persian도 반드시 함께 선택**.
- 대표 3마리 예: Nidoking / Persian / Kangaskhan.
- Tactic: `physical` 유지. AI: Expert.
- 전투 컨셉: Persian의 Technician·U-turn, Nidoking의 물리 커버리지,
  세 번째 동료의 특수 공격/내구/선공으로 보스의 전술 폭을 표현.
- 주요 도구: Silk Scarf, Soft Sand, Expert Belt, Sitrus Berry, Focus Sash, Leftovers.
- 주요 기술: Fake Out, Bite, U-turn, Earthquake, Poison Jab, Ice Punch, Thunder Punch.
- 기믹: Nidoking + Groundium Z. 기존 Kangaskhan 강제 메가에서 땅 에이스로 이동.
- 기존 대비: 75층 이후 Mewtwo로 교체하던 실제 전투 경로를 제거. Persian이 빠지지
  않으며, 여러 땅 공격·Bite/Crunch·Focus Punch 등 불합리한 중복을 정리했다.

## 원작 유지와 게임용 변경의 경계

유지: 저장된 원작 참고 데이터, 대표 종, Miltank/Kingdra/Pidgeot/Houndoom,
Flying/Normal/Dragon/Rocket의 테마, 원작에서 가져온 주요 특성과 도구.

게임용 변경: 3마리 선발, 일부 종 진화/중복 대체, 저위력·회피·재충전·중복 기술의
역할별 교체, 정확한 공격 분류에 맞춘 EV 비율, 층별 훈련 곡선, 기존 세대 밖 기믹의
타워용 적용. 원작 레벨은 복사하지 않는다. 대상 밖 NPC 원본과 런타임 데이터는
구조 비교로 동일함을 확인한다.

## v11 활용 한계와 플레이테스트 관찰점

v11을 수정하지 않았으므로 Milk Drink, Tailwind, Yawn, Glare, Protect,
Feather Dance 등은 전용 점수 판단이 없다. 특히 **Miltank가 저HP에서 Milk Drink를
합리적으로 사용한다고 보장하지 않는다**. 현재 지속력은 Leftovers·내구 배분과
Body Slam 상태이상 압박으로 나온다. 기믹 개방 후 Z기술이 Leftovers를 대체하는
정도도 별도 플레이테스트 대상이다. 회복 기술의 AI 분류 개선은 이후 작업이다.

선봉을 강제하거나 상대 숨은 정보를 읽지 않는다. U-turn과 전용 AI 교체 판단의
템포, Miltank의 실제 생존 턴, Kingdra의 커버리지, 조무래기와 간부/보스의 체감
차이를 같은 층에서 비교한다. 이 문서는 승률 개선을 확정하는 플레이테스트 결과가 아니다.

## 저장 호환성

변경은 신규 팀 생성에만 적용한다. 이미 저장된 packed team, seed, AI 설정,
보상·기믹 snapshot은 갱신하지 않는다. Rocket campaign/retry의 구조와 reward는
변경하지 않았다. replay는 기록된 팀과 행동을 사용한다. Raid와 QA 설정도 그대로다.

## 자동 검증 결과 (2026-10-18)

- `node node_modules/tsx/dist/cli.mjs --test tests/*.test.ts`: **757 통과**.
- `node node_modules/typescript/bin/tsc --noEmit`: 통과.
- `node --require ./scripts/windows-build-links.cjs node_modules/next/dist/bin/next build`: 통과.
- `node --import tsx node_modules/@playwright/test/cli.js test e2e/named-pilot.spec.ts --reporter=line`: **6 통과**.
- `e2e/villain-campaign.spec.ts`: 실제 체인·보상·최종 타격 연출 **6 통과**.
  이 파일을 함께 실행했던 배치에서 관장 테스트의 모바일 연출 대기는 실패했고,
  이후 관장 fixture를 실제 건너뛰기 버튼을 사용하도록 수정해 위 6개를 별도 재검증했다.
- 원본·런타임 JSON 구조 비교: 대상 6종과 해당 캠페인 별칭을 제외한 모든
  레코드 및 원본 공통 metadata가 이전 버전과 동일하다.

새 unit 테스트는 6종 후보 전체의 species/ability/item/4 moves 합법성,
같은 seed의 동일 3마리 선택, 층별 에이스 보장, 후보 다양성, AI 상한,
캠페인 별칭, 실제 v11 배틀과 replay를 검사한다. 기존 전체 회귀 테스트에는
Rocket retry/snapshot/AI 보존, reconnect, Challenger, Raid, hidden boss,
Teleport가 포함된다. 관장 E2E는 데스크톱/모바일에서 실제 조우·입장·1턴·
새로고침 후 배틀 ID/로그/팀/seed/AI 설정 보존을 확인한다.

## 후보별 정확한 고정 빌드

도구는 기믹 개방 전 기준이다. 개방 후 대표 carrier의 도구만 위의 signature로 대체한다.

### named-giovanni

| Pokemon | Ability | Item | Four moves |
|---|---|---|---|
| Persian | Technician | Silk Scarf | Fake Out, Bite, U-turn, Thunder Wave |
| Nidoking | Poison Point | Soft Sand | Earthquake, Poison Jab, Ice Punch, Thunder Punch |
| Rhyperior | Solid Rock | Sitrus Berry | Earthquake, Rock Slide, Megahorn, Ice Punch |
| Nidoqueen | Poison Point | Expert Belt | Earth Power, Sludge Bomb, Ice Beam, Thunderbolt |
| Dugtrio | Sand Veil | Focus Sash | Earthquake, Stone Edge, Sucker Punch, Aerial Ace |
| Kangaskhan | Scrappy | Leftovers | Body Slam, Drain Punch, Crunch, Fake Out |

### named-falkner

| Pokemon | Ability | Item | Four moves |
|---|---|---|---|
| Pidgeot | Keen Eye | Sitrus Berry | Return, Brave Bird, U-turn, Roost |
| Staraptor | Intimidate | Sharp Beak | U-turn, Close Combat, Brave Bird, Quick Attack |
| Noctowl | Insomnia | Leftovers | Air Slash, Shadow Ball, Feather Dance, Roost |
| Swellow | Guts | Flame Orb | Protect, U-turn, Facade, Quick Attack |
| Honchkrow | Insomnia | Black Glasses | Night Slash, Drill Peck, Sucker Punch, Thunder Wave |
| Pelipper | Keen Eye | Mystic Water | Surf, Ice Beam, Air Slash, Tailwind |

### named-archer

| Pokemon | Ability | Item | Four moves |
|---|---|---|---|
| Houndoom | Flash Fire | Charcoal | Dark Pulse, Flamethrower, Will-O-Wisp, Nasty Plot |
| Weezing | Levitate | Black Sludge | Sludge Bomb, Flamethrower, Will-O-Wisp, Thunderbolt |
| Muk | Sticky Hold | Poison Barb | Poison Jab, Brick Break, Toxic, Body Slam |
| Crobat | Inner Focus | Sitrus Berry | Brave Bird, Cross Poison, U-turn, Roost |
| Raticate | Guts | Silk Scarf | Hyper Fang, Crunch, Quick Attack, U-turn |

### named-whitney

| Pokemon | Ability | Item | Four moves |
|---|---|---|---|
| Miltank | Scrappy | Leftovers | Body Slam, Earthquake, Milk Drink, Toxic |
| Farigiraf | Armor Tail | Twisted Spoon | Calm Mind, Shadow Ball, Psychic, Thunderbolt |
| Lickilicky | Own Tempo | Sitrus Berry | Body Slam, Flamethrower, Knock Off, Earthquake |
| Bibarel | Simple | Mystic Water | Swords Dance, Waterfall, Return, Quick Attack |
| Delcatty | Cute Charm | Silk Scarf | Fake Out, Return, Thunder Wave, Shadow Ball |
| Clefable | Magic Guard | Life Orb | Calm Mind, Flamethrower, Moonblast, Soft-Boiled |

### named-clair

| Pokemon | Ability | Item | Four moves |
|---|---|---|---|
| Kingdra | Sniper | Leftovers | Dragon Pulse, Surf, Ice Beam, Yawn |
| Gyarados | Intimidate | Mystic Water | Dragon Dance, Waterfall, Earthquake, Ice Fang |
| Flygon | Levitate | Soft Sand | Earthquake, Dragon Claw, U-turn, Rock Slide |
| Aerodactyl | Rock Head | Hard Stone | Rock Slide, Thunder Fang, Earthquake, Roar |
| Charizard | Blaze | Charcoal | Flamethrower, Air Slash, Dragon Pulse, Roost |
| Dragonite | Inner Focus | Sitrus Berry | Dragon Claw, Extreme Speed, Fire Punch, Roost |

### rocket-grunt

| Pokemon | Ability | Item | Four moves |
|---|---|---|---|
| Raticate | Guts | Silk Scarf | Hyper Fang, Crunch, Quick Attack, U-turn |
| Crobat | Inner Focus | None | Poison Fang, Air Slash, U-turn, Roost |
| Arbok | Intimidate | None | Poison Jab, Crunch, Glare, Earthquake |
| Weezing | Levitate | None | Sludge Bomb, Flamethrower, Will-O-Wisp, Thunderbolt |
| Muk | Sticky Hold | None | Poison Jab, Brick Break, Toxic, Body Slam |
| Persian | Technician | None | Fake Out, Bite, U-turn, Thunder Wave |

현재 후보 원본 수정 후 node scripts/export-normal-npc-runtime.mjs로 갱신하고 --check로 일치 여부를 검사합니다. 옛 build-normal-npc-samples.ts는 이 단일 빌드를 재구성하지 못하므로 덮어쓰기를 거부합니다. CSV는 후보 최대 6마리를 포함하는 schema v2를 사용합니다. [현재 데이터 규약](../../../docs/engineering/NPC_DATA.md).
