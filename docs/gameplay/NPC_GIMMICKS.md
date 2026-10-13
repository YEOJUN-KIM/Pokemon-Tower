# NPC 대표 기믹

2026-10-13 첫 배정. 플레이어 룰과 독립적으로 NPC의 대표 기믹 하나를 적용한다. 기본 룰의 상대도 기믹을 사용하며 혼합 룰에서도 같은 NPC는 같은 대표 기믹을 사용한다. 플레이어의 사용권·상점·가격은 기존 룰을 따른다.

## 배정 기준과 구현 범위

- 1~5세대는 `src/data/npc-gimmicks.ts`에 인물별로 지정한다. 원작에 없는 기믹은 이 게임용 편성이다. 메가폼이 없는 에이스도 유지하고 Z기술·다이맥스·테라 중 개성에 맞는 기믹을 준다. 기믹 담당이 별도 동료이면 기존 에이스와 함께 출전한다.
- 6세대는 메가, 7세대는 Z, 8세대는 거다이맥스, 9세대는 테라를 기본으로 한다. 6세대 메가 담당은 에이스 우선으로 기존 후보에서 고른다. 후쿠지에게는 이상해꽃, 아킬에게는 애프룡, 두송에게는 오롱털을 기믹 후보로 추가하고 기존 에이스를 유지한다. 금랑의 두랄루돈은 거다이맥스 담당으로 유지하며 브리두라스로 진화시키지 않는다.
- 일반 트레이너·빌런 조직원은 기믹을 받지 않는다. 엘리트의 기존 층수별 메가/다이맥스 장비와 테라권 기준은 유지하되 플레이어 룰 때문에 제거하지 않는다. 한 팀에 기믹 장비가 있으면 테라권을 추가 지급하지 않는다.
- 네임드·빌런 간부/보스는 대표 담당을 포함한 3마리를 선택한다. Z 담당은 전용 크리스탈을 우선하며 원본 기술까지 보장한다. 아세로라는 따라큐의 따라큐Z, 아이리스는 액스라이즈를 에이스와 드래곤Z 담당으로 유지한다. 전용 후보가 없으면 타입 크리스탈을 사용한다. NPC 다이맥스는 거다이맥스 지원 종만 받고 전용 기술·외형을 실제 배틀과 재생에 반영한다. 목호의 망나뇽은 메가진화하며 망나뇽나이트를 게임 도구에 등록했다. 테라는 대표 담당만 사용할 수 있고 타입 전문 NPC는 전문 타입을 사용한다. 새 일반 모드에서는 [두 단계 고정 팀·역할별 육성](NORMAL_MODE_SAMPLES.md)을 사용하고 선봉 순서만 시드에 따라 바뀐다. [최고 단계 참고](NPC_TEAM_SAMPLES.md)에서 두 단계 실게임 프리셋을 생성한다.
- 새 100층 배틀은 `tower-policy-v10`. 스키마 v27을 유지하고 NPC 기믹 정보는 기존 boss/trainer JSON과 실제 팀·테라권에 저장한다. 거다이맥스 가능 여부도 실제 packed team에 저장한다. 새 배틀 포맷은 설치된 엔진의 Dragonite-Mega/Dragoninite를 명시적으로 허용한다. 배틀 로그에는 독립 상대 룰과 테라 담당을 남겨 재생한다. v9 이하의 생성된 배틀과 legacy 도전은 기존 룰을 유지하며 이전 포맷도 지원한다.
- 룰 선택창에 플레이어 전용 선택임을 설명하고, 배틀 시작 화면의 상대 이름 옆에 상대 기믹을 표시한다.

## 기믹 간 격차와 후속 검증

2026-10-13 샘플 검토 수정: 비주기는 페르시온→거대코뿌리, 목호는 한카리아스→리자몽, 난천은 토게키스→화강돌. 마적의 최고 단계 팀은 점토도리→그란돈, 주홍구슬을 든 원시그란돈을 에이스로 하고 폭타·크로뱃을 동료로 둔다. 빌런 캠페인 보스의 동일 인물에도 반영했다. 이후 [실게임 두 단계 템플릿](NORMAL_MODE_SAMPLES.md)에 연결했다. 최신 전설·지역 폼 수정은 [라인업 갱신](NPC_LINEUP_REFRESH.md)을 따른다.

후반 빌런·향후 라이벌은 관련 전설 포켓몬을 팀의 중심으로 편성하는 방향이다. 마적·아강을 포함한 보스8명의 관련 전설 팀을 75층 이후 최종 템플릿에 적용했다. 일반 관장에게 전설을 일괄 지급하지 않는다.

원시회귀는 엔진이 전용 구슬을 든 포켓몬의 등장 시 자동 처리한다. 그란돈과 가이오가의 도감 원시 형태와 플레이어 사용도 연결했고 주홍구슬·쪽빛구슬을 메가/혼합 룰 상점에 등록했다. [플레이어 원시회귀 사용법](PRIMAL_REVERSION.md). [공식 배틀 설명](https://www.pokemon.com/us/strategy/get-primed-for-battles-in-the-sun-series), 설치된 Showdown 원시 포켓몬/구슬 정의를 기준으로 한다.

검토 CSV는 [파티 요약](npc-team-summary.csv) 164행과 [포켓몬 상세](npc-team-details.csv) 492행이다. UTF-8 BOM·CRLF이며 한글 표시와 원본 대조를 확인했다. 상세에는 변신 후 이름·특성·타입도 포함한다. CSV 편집은 게임이나 JSON에 자동 반영되지 않는다. 재생성은 `node --import tsx scripts/build-npc-review.ts`, 이어서 Codex 번들 Node로 `scripts/export-npc-review-csv.mjs`를 실행한다. 두 CSV와 Markdown은 같은 JSON 원본에서 생성한다.

메가망나뇽의 공식 공개는 [Pokémon Legends: Z-A 소개](https://legends.pokemon.com/en-ca/story-world/pokemon/mega-dragonite)를 확인했다. 실제 종족값·특성·기술·거다이맥스 판정은 설치된 Showdown 데이터와 엔진을 사용한다.

Z기술은 한 번의 결정타, 다이맥스는 여러 턴의 공격·내구·필드 효과를 활용하므로 동일한 기술·육성에 기믹만 교환해서 동일한 위협 수준을 기대하지 않는다. 사용 횟수·위력·지속 시간 보정은 이번에 적용하지 않았다.

후속 팀 프리셋에서는 Z 담당의 기술과 지원 동료로 결정타 기회를 만들고, 다이맥스 팀은 동료의 공격/지원과 에이스 육성을 함께 조정하는 방향을 검토한다. 같은 층·같은 NPC 등급의 팀 전체를 비교하며 기믹 사용 전 기절 비율, 사용 시점, 기믹 발동 후 이득, 전투 길이와 플레이어 잔여 체력·승률을 기록한다. 수치 목표와 보정 크기는 미정이다.

같은 플레이어 팀·같은 코스에서 기본/메가/다이맥스/테라/Z/혼합을 각각 비교한 뒤 새로운 팀·코스로 재확인한다. 자동 정책의 승률과 사람의 체감은 구분한다. 기본이 너무 어렵거나 혼합이 너무 쉬운지는 먼저 플레이한 뒤 판단한다. 난이도 비교 시뮬레이션은 이번 구현 검증에 포함하지 않았다.

## 첫 배정표

아래는 이름별 대표 담당이다. 빌런 캠페인의 간부/보스도 같은 인물의 배정을 사용하며 후보가 아직 해금되지 않았으면 기믹 담당을 강제로 추가하지 않는다.

| 세대 | NPC | ID | 기믹 | 담당 |
|---|---|---|---|---|
| 1 | 웅 | named-brock | 메가진화 | Aerodactyl |
| 1 | 비주기 | named-giovanni | 메가진화 | Kangaskhan |
| 1 | 그린 | named-blue | 메가진화 | Pidgeot |
| 2 | 비상 | named-falkner | 메가진화 | Pidgeot |
| 2 | 아폴로 | named-archer | 메가진화 | Houndoom |
| 2 | 목호 | named-lance | 메가진화 | Dragonite |
| 3 | 민지 | named-flannery | Z기술 | Torkoal |
| 3 | 마적 | named-maxie | 메가진화 | Camerupt |
| 3 | 성호 | named-steven | 메가진화 | Metagross |
| 4 | 전진 | named-volkner | Z기술 | Electivire |
| 4 | 태홍 | named-cyrus | Z기술 | Weavile |
| 4 | 난천 | named-cynthia | 메가진화 | Garchomp |
| 5 | 카밀레 | named-elesa | Z기술 | Zebstrika |
| 5 | 게치스 | named-ghetsis | Z기술 | Hydreigon |
| 5 | 노간주 | named-alder | Z기술 | Volcarona |
| 6 | 마슈 | named-valerie | 메가진화 | Mawile |
| 6 | 플라드리 | named-lysandre | 메가진화 | Gyarados |
| 6 | 카르네 | named-diantha | 메가진화 | Gardevoir |
| 7 | 키아웨 | named-kiawe | Z기술 | Marowak-Alola |
| 7 | 루자미네 | named-lusamine | Z기술 | Clefable |
| 7 | 쿠쿠이 | named-kukui | Z기술 | Incineroar |
| 8 | 야청 | named-nessa | 거다이맥스 | Drednaw |
| 8 | 로즈 | named-rose | 거다이맥스 | Copperajah |
| 8 | 단델 | named-leon | 거다이맥스 | Charizard |
| 9 | 모야모 | named-iono | 테라스탈 | Bellibolt |
| 9 | 피냐 | named-giacomo | 테라스탈 | Kingambit |
| 9 | 테사 | named-geeta | 테라스탈 | Glimmora |
| 2 | 호일 | named-bugsy | 메가진화 | Scizor |
| 2 | 꼭두 | named-whitney | Z기술 | Miltank |
| 2 | 유빈 | named-morty | 메가진화 | Gengar |
| 2 | 사도 | named-chuck | Z기술 | Poliwrath |
| 2 | 규리 | named-jasmine | 메가진화 | Steelix |
| 2 | 류옹 | named-pryce | 테라스탈 | Mamoswine |
| 2 | 이향 | named-clair | Z기술 | Kingdra |
| 2 | 일목 | named-will | 테라스탈 | Xatu |
| 2 | 독수 | named-koga | 테라스탈 | Crobat |
| 2 | 시바 | named-bruno | 거다이맥스 | Machamp |
| 2 | 카렌 | named-karen | Z기술 | Umbreon |
| 2 | 레드 | named-red | 거다이맥스 | Pikachu |
| 1 | 이슬 | named-misty | Z기술 | Starmie |
| 1 | 마티스 | named-ltsurge | Z기술 | Raichu |
| 1 | 민화 | named-erika | 테라스탈 | Vileplume |
| 1 | 독수 | named-koga-kanto | Z기술 | Weezing |
| 1 | 초련 | named-sabrina | 메가진화 | Alakazam |
| 1 | 강연 | named-blaine | Z기술 | Arcanine |
| 1 | 비주기 | named-giovanni-gym | 테라스탈 | Nidoking |
| 1 | 칸나 | named-lorelei | 거다이맥스 | Lapras |
| 1 | 시바 | named-bruno-kanto | 거다이맥스 | Machamp |
| 1 | 국화 | named-agatha | 메가진화 | Gengar |
| 1 | 목호 | named-lance-kanto | 메가진화 | Dragonite |
| 1 | 레드 | named-red-kanto | 거다이맥스 | Pikachu |
| 3 | 원규 | named-roxanne | 테라스탈 | Probopass |
| 3 | 철구 | named-brawly | Z기술 | Hariyama |
| 3 | 암페어 | named-wattson | 메가진화 | Manectric |
| 3 | 종길 | named-norman | Z기술 | Slaking |
| 3 | 은송 | named-winona | 메가진화 | Altaria |
| 3 | 풍&란 | named-tateandliza | 테라스탈 | Solrock |
| 3 | 윤진 | named-wallace-gym | Z기술 | Milotic |
| 3 | 아단 | named-juan | Z기술 | Kingdra |
| 3 | 혁진 | named-sidney | 메가진화 | Absol |
| 3 | 회연 | named-phoebe | 메가진화 | Banette |
| 3 | 미혜 | named-glacia | 테라스탈 | Walrein |
| 3 | 권수 | named-drake | 메가진화 | Salamence |
| 3 | 윤진 | named-wallace | Z기술 | Milotic |
| 3 | 아강 | named-archie | 메가진화 | Sharpedo |
| 4 | 강석 | named-roark | 테라스탈 | Rampardos |
| 4 | 유채 | named-gardenia | Z기술 | Roserade |
| 4 | 자두 | named-maylene | 메가진화 | Lucario |
| 4 | 맥실러 | named-crasherwake | Z기술 | Floatzel |
| 4 | 멜리사 | named-fantina | 테라스탈 | Mismagius |
| 4 | 동관 | named-byron | 테라스탈 | Bastiodon |
| 4 | 무청 | named-candice | 메가진화 | Abomasnow |
| 4 | 충호 | named-aaron | 메가진화 | Scizor |
| 4 | 들국화 | named-bertha | 테라스탈 | Hippowdon |
| 4 | 대엽 | named-flint | Z기술 | Infernape |
| 4 | 오엽 | named-lucian | 테라스탈 | Bronzong |
| 4 | 용식 | named-barry | Z기술 | Empoleon |
| 5 | 덴트 | named-cilan | Z기술 | Simisage |
| 5 | 팟 | named-chili | Z기술 | Simisear |
| 5 | 콘 | named-cress | Z기술 | Simipour |
| 5 | 알로에 | named-lenora | 테라스탈 | Watchog |
| 5 | 아티 | named-burgh | Z기술 | Leavanny |
| 5 | 야콘 | named-clay | Z기술 | Excadrill |
| 5 | 풍란 | named-skyla | 테라스탈 | Swanna |
| 5 | 담죽 | named-brycen | 테라스탈 | Beartic |
| 5 | 사간 | named-drayden | Z기술 | Haxorus |
| 5 | 체렌 | named-cheren | 테라스탈 | Stoutland |
| 5 | 보미카 | named-roxie | Z기술 | Scolipede |
| 5 | 시즈 | named-marlon | Z기술 | Jellicent |
| 5 | 망초 | named-shauntal | Z기술 | Chandelure |
| 5 | 연무 | named-marshal | Z기술 | Conkeldurr |
| 5 | 블래리 | named-grimsley | 테라스탈 | Kingambit |
| 5 | 카틀레야 | named-caitlin | Z기술 | Gothitelle |
| 5 | 아이리스 | named-iris | Z기술 | Haxorus |
| 6 | 비올라 | named-viola | 메가진화 | Beedrill |
| 6 | 자크로 | named-grant | 메가진화 | Aerodactyl |
| 6 | 코르니 | named-korrina | 메가진화 | Lucario |
| 6 | 후쿠지 | named-ramos | 메가진화 | Venusaur |
| 6 | 시트론 | named-clemont | 메가진화 | Ampharos |
| 6 | 고지카 | named-olympia | 메가진화 | Gardevoir |
| 6 | 우르프 | named-wulfric | 메가진화 | Abomasnow |
| 6 | 파키라 | named-malva | 메가진화 | Houndoom |
| 6 | 즈미 | named-siebold | 메가진화 | Gyarados |
| 6 | 간피 | named-wikstrom | 메가진화 | Scizor |
| 6 | 드라세나 | named-drasna | 메가진화 | Altaria |
| 6 | 세레나 | named-serena | 메가진화 | Absol |
| 7 | 일리마 | named-ilima | Z기술 | Gumshoos |
| 7 | 수련 | named-lana | Z기술 | Primarina |
| 7 | 마오 | named-mallow | Z기술 | Tsareena |
| 7 | 마마네 | named-sophocles | Z기술 | Vikavolt |
| 7 | 아세로라 | named-acerola-captain | Z기술 | Mimikyu |
| 7 | 말리화 | named-mina | Z기술 | Ribombee |
| 7 | 멀레인 | named-molayne | Z기술 | Metagross |
| 7 | 라이치 | named-olivia | Z기술 | Lycanroc |
| 7 | 아세로라 | named-acerola | Z기술 | Mimikyu |
| 7 | 카일리 | named-kahili | Z기술 | Toucannon |
| 7 | 하우 | named-hau | Z기술 | Primarina |
| 8 | 아킬 | named-milo | 거다이맥스 | Flapple |
| 8 | 순무 | named-kabu | 거다이맥스 | Centiskorch |
| 8 | 채두 | named-bea | 거다이맥스 | Machamp |
| 8 | 어니언 | named-allister | 거다이맥스 | Gengar |
| 8 | 포플러 | named-opal | 거다이맥스 | Alcremie |
| 8 | 마쿠와 | named-gordie | 거다이맥스 | Coalossal |
| 8 | 멜론 | named-melony | 거다이맥스 | Lapras |
| 8 | 두송 | named-piers | 거다이맥스 | Grimmsnarl |
| 8 | 금랑 | named-raihan | 거다이맥스 | Duraludon |
| 8 | 마리 | named-marnie | 거다이맥스 | Grimmsnarl |
| 8 | 호브 | named-hop | 거다이맥스 | Corviknight |
| 8 | 비트 | named-bede | 거다이맥스 | Hatterene |
| 8 | 금랑 | named-raihan-cup | 거다이맥스 | Duraludon |
| 8 | 올리브 | named-oleana | 거다이맥스 | Garbodor |
| 9 | 단풍 | named-katy | 테라스탈 | Ursaluna |
| 9 | 콜사 | named-brassius | 테라스탈 | Sudowoodo |
| 9 | 곤포 | named-kofu | 테라스탈 | Crabominable |
| 9 | 청목 | named-larry | 테라스탈 | Staraptor |
| 9 | 라임 | named-ryme | 테라스탈 | Toxtricity |
| 9 | 리파 | named-tulip | 테라스탈 | Florges |
| 9 | 그루샤 | named-grusha | 테라스탈 | Altaria |
| 9 | 칠리 | named-rika | 테라스탈 | Clodsire |
| 9 | 뽀삐 | named-poppy | 테라스탈 | Tinkaton |
| 9 | 청목 | named-larry-elite | 테라스탈 | Flamigo |
| 9 | 팔자크 | named-hassel | 테라스탈 | Baxcalibur |
| 9 | 네모 | named-nemona | 테라스탈 | Pawmot |
| 9 | 모란 | named-penny | 테라스탈 | Sylveon |
