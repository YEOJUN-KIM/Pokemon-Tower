# 알로라 NPC 샘플 구현 보고

> 2026-10-19 후속: [하우·구즈마 / 선공기 AI 보고](hau-guzma-npc-ai.md). 하우를 고정 3마리로 검토 등록하고 구즈마에 메가갑주무사를 적용했다. 아래 19명 최초 구현 기록과 당시 승률은 역사 자료다. 라이치·카일리·키아웨의 현재 데이터는 그대로 보존했다.

> 후속 조정: 라이치·카일리·키아웨는 [고정 3마리 조정 보고](alola-npc-tuning.md)에 따라 변경됐다. 아래 설계/승률은 알로라 최초 추가 시점의 기록이며 최신 세팅은 후속 보고와 최종 팀 표를 참고한다.

2026-10-18. 요청한 19개 정체성, 20개 층별 원본 행을 기존 NPC 파이프라인에 등록했다. 마오만 55층 전후 두 세팅을 사용한다. 전체 런타임은 중복·단계 샘플 정리 후 241행에서 227행으로 줄었다. 대상 밖 207행은 작업 직전 원본/런타임과 내용 해시가 동일하다. 앞서 조정한 후쿠지·간피·즈미와 이번 대상에서 제외한 하우도 보존했다.

## 등록 목록과 후보

실제 파티는 항상 3마리다. 아래 `필수` 외에는 후보에서 고른다. 구즈마·자오보는 간부급 육성으로 사천왕보다 훈련량과 AI 상한을 낮췄다. 직책의 난이도는 모든 상대 조합에서의 승률 순서를 보장하지 않는다.

|NPC|등급|필수|후보 pool|
|---|---|---|---|
|일리마|캡틴|Gumshoos|Gumshoos, Komala, Smeargle, Tauros|
|수련|캡틴|Araquanid|Araquanid, Lanturn, Cloyster, Wishiwashi|
|키아웨|캡틴|Marowak-Alola|Marowak-Alola, Salazzle, Arcanine, Turtonator|
|마오|캡틴|Tsareena|Tsareena, Lurantis, Shiinotic, Trevenant|
|마마네|캡틴|Togedemaru|Togedemaru, Vikavolt, Magnezone, Electivire|
|말리화|캡틴|Ribombee|Ribombee, Granbull, Comfey, Shiinotic|
|나누|섬의 왕|Persian-Alola|Persian-Alola, Krookodile, Sableye, Honchkrow|
|하푸우|섬의 왕|Mudsdale|Mudsdale, Gastrodon, Flygon, Golurk|
|할라|사천왕 / SM|Crabominable|Crabominable, Hariyama, Bewear, Poliwrath|
|라이치|사천왕|Lycanroc|Lycanroc, Relicanth, Carbink, Probopass, Golem-Alola|
|아세로라|사천왕|Palossand|Palossand, Mimikyu, Dhelmise, Drifblim, Froslass|
|카일리|사천왕|Toucannon|Toucannon, Skarmory, Mandibuzz, Oricorio|
|몰레인|사천왕 / USUM|Dugtrio-Alola|Dugtrio-Alola, Magnezone, Metagross, Skarmory|
|쿠쿠이|챔피언급|Incineroar|Incineroar, Lycanroc, Snorlax, Magnezone, Braviary, Slowbro|
|스컬단 조직원|일반|없음|Raticate-Alola, Crobat, Salazzle, Garbodor, Scrafty, Toxapex|
|구즈마|간부급|Golisopod|Golisopod, Masquerain, Scizor, Ariados, Pinsir|
|에테르재단 직원|일반|없음|Ledian, Mudsdale, Pelipper, Parasect, Dugtrio, Manectric|
|자오보|간부급|Hypno|Hypno, Slowbro, Bruxish, Raichu-Alola, Alakazam|
|루자미네|최종 보스 / 챔피언급|3마리 전부|Clefable → Lilligant → Necrozma-Dusk-Mane|

아세로라 캡틴 행과 플루메리 기본 샘플을 제거했다. 할라·라이치의 섬의 왕 중복은 만들지 않았다. 알로라 루트는 캡틴 6명+나누·하푸우의 8명, 사천왕 후보 5명 중 기존 방식으로 4명을 선택한다. 쿠쿠이 이후 기존 하우 루트는 이번 제외 대상이므로 보존했다.

빌런 순서는 `alolaVillainSequence` 데이터로 스컬단 조직원 → 구즈마 → 에테르 직원 → 자오보 → 루자미네를 명시했다. 연속 스토리 이벤트 연결은 사용자의 방침에 따라 보류했다. 기존 일반 조직 인터페이스의 스컬단 executive/boss 슬롯은 같은 구즈마 정의를 참조하며 별도 샘플을 만들지 않는다. 추후 연속 이벤트는 이 두 슬롯을 연속 소비하지 말고 명시한 시퀀스를 사용해야 한다.

## 기존 구조 재사용

`scripts/data/npc/normal-npc-samples.json`이 검토 원본이며 `export-normal-npc-runtime.mjs`가 런타임 JSON으로 투영한다. `allFloors`, `select`, `required`, `selectionRules`, points 프로필, 기존 폼 패킹, 층별 기믹 제한, NPC AI를 재사용했다. 공용 배틀/정책/선택 엔진은 변경하지 않았다.

루자미네는 canonical 원본 행이 정확히 하나다. `select:true`는 기존 후보 선택 API를 통과하기 위한 값이며 후보 3마리 전부가 `required`라서 가능한 편성은 하나뿐이다. 임의의 미지원 `randomSelection` 필드를 도입하지 않았다. `preferredLead:['Clefable']`, `preferredLast:['Necrozma']`로 초기 순서도 고정한다. 전투 중 Expert AI의 자발적 교체까지 봉쇄하지는 않는다.

내부 포켓몬 키는 `Necrozma`, 프로필은 `forme:'Necrozma-Dusk-Mane'`다. 패킹 결과 실제 종은 `Necrozma-Dusk-Mane`이며 Prism Armor, Sunsteel Strike, Psychic Fangs, Earthquake, Dragon Dance의 설치된 learnset 합법성을 검사했다. 이 폼은 별도 `pokemonSets` 키로 직접 추가하지 않았다.

루자미네 등록 최소층과 템플릿의 `legendaryMinFloor`는 75다. 기존 전설·빌런 보스 정책과 맞추며 74층 이하 대체 편성을 추가하지 않았다. `aether-boss-lusamine`, `skull-boss-guzma`, `aether-executive-faba`는 canonical 조회로 새 정의에 연결된다. 저장된 과거 배틀 스냅샷은 그대로 재생한다.

## 육성과 주요 세팅

|등급|원본 훈련 포인트 상한|AI 상한|도구/IV 정책|
|---|---:|---|---|
|조직원/직원|18, 각 능력치 3|Basic|도구 없음, 원본 IV 12, Serious|
|캡틴|48|Tactical|자뭉열매·타입 도구·회복 도구 중심. 키아웨의 굵은뼈는 대표 전용 도구 예외|
|섬의 왕·구즈마·자오보|54|Tactical|역할별 도구·교란·교체·강화|
|사천왕·쿠쿠이·루자미네|66|Expert|돌격조끼·구애스카프·생명의구슬·기합의띠 등 역할별 분산|

실제 훈련 포인트는 `min(원본 총량, 층별 예산)`으로 축소된다. 네임드 원본 IV는 31이지만 실제 생성에서는 기존 `namedOpponentIVs`가 층·역할·시드에 맞춰 다시 분배한다. 따라서 캡틴과 사천왕의 차이를 새 IV 규칙으로 만들지 않았다. 조무래기는 `normal`이므로 낮은 원본 IV를 유지하고 층별 상한도 적용한다.

- 텅구리(알로라): Lightning Rod + Thick Club, Adamant, Flare Blitz / Shadow Bone / Bonemerang / Rock Slide. 굵은뼈는 기존 NPC 전용 도구 표시 맵에 한국어 이름만 추가했으며 플레이어 상점 품목을 늘리지 않았다.
- 깨비물거미: Water Bubble + Mystic Water, 물리 Liquidation 중심. 파르셀은 Skill Link / Icicle Spear / Rock Blast / Shell Smash / Liquidation.
- 라란티스: 1–54층 Leaf Guard + Swords Dance. 55층 이후 Contrary + Superpower, 이때 Swords Dance는 제거한다.
- 나누: Fur Coat 페르시온의 특수 Dark Pulse + Thunder Wave/Nasty Plot, Intimidate 악비아르, Prankster 도깨비불·Recover 깜까미.
- 하푸우: Stamina + 방어 투자 + Body Press 만마드, Storm Drain/Recover 트리토돈, 물리 U-turn 플라이곤.
- 아세로라: 원작 에이스 모래성이당을 필수로 확정하고, 기존 Mimikium Z 따라큐를 별도 기믹 담당으로 유지한다. 두 포켓몬 모두 필수 선택에 포함되므로 나머지 후보 3종에서 한 마리를 고른다.
- 몰레인: 원작 USUM 대표 알로라 닥트리오를 필수로 확정했다. 자포코일의 Assault Vest 세팅에서는 Thunder Wave를 Body Press로 교체했다.
- 자오보: 치갈기는 Strong Jaw 물리 Psychic Fangs / Crunch / Liquidation / Aqua Jet. 특수형으로 만들지 않았다.
- 루자미네: Bold HP/방어 Clefable + Magic Guard/Leftovers/Calm Mind/Soft-Boiled, Timid Lilligant + Own Tempo/Life Orb/Petal Dance/Quiver Dance, Adamant 물리 Dusk-Mane + Prism Armor/Weakness Policy/Dragon Dance.
- Z 연결: 하푸우 Groundium Z, 할라 Fightinium Z, 라이치 Rockium Z, 아세로라 Mimikium Z, 카일리 Flyinium Z, 몰레인 Steelium Z, 쿠쿠이 Incinium Z. 기존 층별 발동 제한을 따른다.

모든 포켓몬의 성격·특성·도구·기술·종족값·포인트 배분은 [최종 팀 표](alola-team-data.md)에 수록했다. 표의 Wishiwashi 기본 종족값은 Schooling 이전이며 실전에는 Schooling으로 공격/특공이 함께 높아진다.

## 원작과 추천에서 보정한 부분

- 원작 파티를 먼저 참고하되 타입·역할에 맞는 후보를 보충했다. 전 세대 포켓몬을 허용하는 기존 프로젝트 정책을 유지한다.
- 원작 라이치의 Midnight 모습은 현재 프로젝트의 지원 키/폼에 없어서 지원되는 정오 Lycanroc를 사용한다. 쿠쿠이의 정오 모습도 같은 키를 쓴다.
- 수집 가능 최종진화 제한 때문에 스컬단의 Golbat/Salandit/Trubbish/Scraggy/Mareanie 후보는 Crobat/Salazzle/Garbodor/Scrafty/Toxapex로 대응했다. 강한 도구·EV·AI는 주지 않았다. 할라의 비최종진화 Primeape는 추가하지 않았다.
- 에테르 직원은 원작 사용 이력이 확인되는 Ledian/Mudsdale/Pelipper/Parasect/Dugtrio/Manectric를 사용해 여러 타입으로 구성했다. 원작 특수 공격 위주의 Dugtrio는 공격 종족값에 맞춰 물리기로 보정했다.
- 구즈마 First Impression은 실제 정책 재현에서 14회 선택 중 후속 실패 12회를 기록했다. 후보 세팅은 Swords Dance로 교체하고 Leech Life·Aqua Jet를 유지했다. Emergency Exit는 기존 엔진의 자동 교체를 사용한다.
- 현재 TowerPolicy의 회복 점수 목록에 Moonlight가 없어 Clefable은 합법적인 Soft-Boiled를 사용한다. Spore, Sleep Powder, Taunt, Parting Shot, Shore Up, hazard, Tailwind도 현재 점수화 범위 밖이므로 이번 샘플에서 적극 운용을 약속하지 않는다. Giga Drain/Strength Sap/Roost/Recover, 마비·화상·씨뿌리기와 기존 강화 기술로 대체했다.
- Lilligant는 Own Tempo/Petal Dance와 Giga Drain을 함께 보존하고 Sleep Powder 자리에 Pollen Puff를 넣었다. Petal Dance의 강제 연속 사용 중 회복기 전환이 불가능한 것은 원래 기술 동작이다.
- 쿠쿠이는 Incineroar를 기본 스타팅 최종진화체로 고정했다. 플레이어의 최초 스타팅 분기를 새로 전달하는 구조는 추가하지 않았다.

## 검증

신규 단위/통합 테스트 41개를 추가했다. 종/폼/기술/특성/도구/성격 존재, National Dex learnset, 공격 성향/STAB, 불리한 성격, Choice/Assault Vest 충돌, 능력치별 32/총량 상한, 층별 예산, required, 랜덤 다양성, 고정 순서, 결정성, 조무래기 IV/AI, Z/실제 폼 패킹을 확인한다. Smeargle은 고정 대미지 utility라 저공격·무STAB 예외이며 무한 콤보/Baton Pass를 쓰지 않는다. Body Press는 공격 대신 방어를 쓰는 예외, Wishiwashi는 Schooling 이후 양쪽 공격이 높은 혼합 커버리지 예외다.

캐릭터별 40시드 × 적격층 검증 및 19종 실제 배틀·리플레이를 포함한다. 다른 지방 보존 테스트는 수정 전 파일에서 계산한 새 누적 보존 fixture를 사용하며 기존 fixture는 보존했다. 대상 밖 207행과 공용 엔진 10파일 해시를 검사한다. 카트리지의 전설 고정 IV/0 EV 금지와 프로젝트 포인트 육성의 차이는 기존 배틀 엔진과 동일한 합법성 프록시로 처리하고, 실제 포인트·IV는 별도 검사한다.

- 전체 단위/통합: **990/990 통과**, 실패/취소/스킵 0 (`full-tests-final.log`).
- TypeScript 검사 및 프로덕션 Next 빌드: 통과 (`build-final.log`). Windows 샌드박스 junction 제한에 따른 첫 빌드 실패는 권한을 높여 재실행했다.
- Chrome E2E: **9/9 통과**, 390px 모바일/1280px 데스크톱, 신규 섬의 왕·할라·쿠쿠이·빌런 5단계 샘플의 배틀 명령/초상화 HTTP 자산/새로고침 복원 (`e2e-final.log`). 초상화가 인트로 종료 후 제거되는 UI라 최초 테스트의 타이밍 의존 DOM 검사를 자산 응답 검사로 고쳤다.
- 원본→런타임 동기화: **227행 일치**.
- 별도 비교 시뮬레이션: **304전 완료, 실행 오류 0**. 네 가지 고정 플레이어 파티, 각 층 2시드, Basic 룰, 플레이어 DamagePolicy, 원본 기본 기술/31 IV/66 포인트/역할별 성격/지닌 도구 없음. 루자미네 75·95층, 나머지 45·95층. 등반 누적 피해·구매·사람의 교체 판단을 포함하지 않는다.

원시 검증 로그와 작업 직전 스냅샷: `artifacts/experiments/balance/alola-20261018/`. 버전 관리용 정리 결과: [alola-audit.json](../../artifacts/reports/npc/alola-audit.json).

|NPC|별도 시뮬레이션 NPC 승리/16|
|---|---:|
|일리마|4|
|수련|6|
|키아웨|0|
|마오|3|
|마마네|9|
|말리화|6|
|나누|3|
|하푸우|3|
|할라|6|
|라이치|0|
|아세로라|8|
|카일리|2|
|몰레인|5|
|쿠쿠이|5|
|스컬단 조직원|0|
|구즈마|3|
|에테르재단 직원|1|
|자오보|8|
|루자미네|12|

이는 사람 상대 승률이 아니다. 작은 고정 상성 표본에서 키아웨·라이치가 0/16, 마마네가 9/16으로 나타났으므로 균등한 난이도 보정까지 끝났다고 해석하면 안 된다. 이번에는 원작 정체성과 육성의 정합성을 우선했으며 이 결과만으로 다른 지방이나 공용 AI를 수정하지 않았다. Z 연결 7종은 이 실전 표본에서도 모두 실제 발동했다.

## 발견한 기존 제약과 TODO

1. First Impression의 첫 턴 제한을 공유 AI 평가가 충분히 반영하지 않는다. 재현 스크립트/프로토콜을 남겼고 샘플에서 회피했다. 공용 정책 수정은 별도 작업이다.
2. 위에서 언급한 보조기·hazard·Tailwind 전술은 엔진의 기술 지원과 AI의 활용 지원이 다르다. AI 개선 전에는 해당 전술을 데이터에 넣는 것만으로 실효성을 보장할 수 없다.
3. `generateOpponentTeam`을 카탈로그 최소층보다 낮게 직접 호출하는 코드는 스스로 `minFloor`를 검사하지 않고 기존 fallback을 사용할 수 있다. 루자미네 이벤트 연결 시 반드시 `minFloor>=75`를 확인해야 한다. 정상 배치 정책은 이를 준수하고 이번 테스트도 적격층에서 검증한다. 조기용 다른 루자미네를 만들지 않았다.
4. 마지막 에이스의 **초기 배열**은 보장하지만 Expert의 경기 중 교체로 출전 순서가 바뀔 수 있다. 강제 보존 AI를 추가하지 않았다.
5. 후속 작업: 사용자가 모든 빌런 이벤트 완성 후 연결할 때 명시한 알로라 시퀀스를 연결하고 중복 구즈마 슬롯을 피할 것. 쿠쿠이 스타팅 분기와 키아웨·라이치 등 상성 표본의 난이도는 별도 조정 후보다.

## 변경 파일

- 원본/생성: `scripts/build-alola-npc-samples.ts`, `scripts/data/npc/alola-design.json`, `scripts/data/npc/normal-npc-samples.json`, `src/data/normal-npc-templates.json`.
- 등록/루트: `src/data/alola-trainers.ts`, `trainer-catalog.ts`, `regional-trainers.ts`, `tower-themes.ts`, `villain-organizations.ts`, `npc-review-presets.ts`, `held-items.ts`.
- 자산: `scripts/import-alola-trainer-sprites.mjs`, `public/sprites/trainers/{hala,hapu,nanu}.png`, 같은 폴더 `sources.json`의 출처/크레딧/SHA-256.
- 검증: `tests/alola-named-trainers.test.ts`, `tests/fixtures/alola-preservation.json`, `e2e/alola-named-trainers.spec.ts`, `scripts/audit-alola-npcs.ts`, `scripts/check-alola-entry-move.ts`.
- 기존 테스트 갱신: `champion-builds`, `trainer-catalog`, `normal-mode-stages`, `npc-gimmicks`, `npc-lineup-refresh`, `npc-templates`, `opponent-species`; 누적 보존 범위 갱신은 `hoenn-named-trainers`, `sinnoh-named-trainers`, `unova-named-trainers`, `magma-executives`, `kalos-named-trainers`, `kalos-tuning`.
- 보고서: 이 문서, `alola-team-data.md`, `artifacts/reports/npc/alola-audit.json`. 이전 칼로스 변경 파일들은 이번 작업 전부터 존재했으며 이번 추가 작업과 분리해서 보존했다.

## 조사 출처

- [Sun/Moon 사천왕 및 쿠쿠이](https://www.serebii.net/sunmoon/elitefour.shtml): 대표·타입·원작 후보 확인. 아세로라 Palossand 에이스와 할라의 SM 사천왕 직책을 기준으로 했다.
- [Ultra Sun/Ultra Moon 사천왕](https://www.serebii.net/ultrasunultramoon/elitefour.shtml): 몰레인 Dugtrio-Alola 대표와 Steelium Z 확인.
- [Aether Paradise 트레이너 목록](https://www.serebii.net/pokearth/alola/aetherparadise.shtml): 직원의 실제 사용 종, 자오보의 Hypno/Slowbro/Bruxish 및 후기 Raichu/Alakazam 후보 확인.
- [SM 캡틴](https://www.serebii.net/sunmoon/trialcaptains.shtml), [큰 시련](https://www.serebii.net/sunmoon/grandtrials.shtml): 타입과 대표 후보 참고.
- 최종 기술·특성·폼의 합법성 근거는 이 저장소에 설치된 `pokemon-showdown@0.11.11` Dex/TeamValidator와 프로젝트 수집/폼 데이터다. 최종 표는 위 웹페이지 기술배치의 복제가 아닌 프로젝트용 육성 설계다.
