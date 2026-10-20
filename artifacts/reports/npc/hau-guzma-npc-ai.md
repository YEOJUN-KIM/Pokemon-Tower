# 하우·구즈마 / 선공기 AI 검증

2026-10-19. 기준 커밋: `7f2be76aecfdc4b92911a774cd8d9b29912e6ef8`.
후속 지시인 “너무 낮으면 메가갑주무사”까지 반영한 최종 결과다. 하우 **유지 가능**, 구즈마 **목표 난이도 달성: 표본상 캡틴 상위~사천왕권**으로 판단한다. 모든 상대 조합에서 순서를 보장한다는 뜻은 아니다.

## 변경 범위와 저장 호환

하우의 기존 레거시 슬롯을 검토된 고정 3마리 슬롯으로 교체했다. 중복 하우를 추가하지 않았고 쿠쿠이는 그대로 존재한다. 알로라 루트는 쿠쿠이 챔피언 → 하우 최종 상대를 유지한다. 하우의 2개 단계 행이 allFloors 1행이 되어 전체 런타임은 227→226행, 알로라는 20명/21행이다. 빌런 연속 이벤트 연결은 보류 상태 그대로다.

라이치·카일리·키아웨를 포함한 **나머지 224개 현재 NPC 행**은 검토 원본과 런타임 각각 기준 커밋의 내용 해시와 일치한다. 다른 알로라 메타데이터, 공용 세트, 기존 3명 전용 override도 동일하다. 구즈마는 갑주무사 세트·대표 기믹·Expert 상한만 변경했다. 나머지 벌레 후보 4마리는 완전히 동일하다.

새 전투만 tower-policy-v13을 사용한다. v12는 npc-policy-v12.ts에 바이트 단위로 보존했다. 기존 보존 fixture는 갱신하지 않았다. 과거 테스트에서는 이번에 허용된 두 정체성만 실제 작업 전 행으로 복원해 기존 체크섬을 검사하고, 새 보존 테스트는 두 명을 제외한 현재 224행 전체를 직접 검사한다.

메가갑주무사는 기존 엔진에 형태·도구·종족값이 있지만 특성이 과거 임시값이다. [Showdown 고정 커밋 정의](https://github.com/smogon/pokemon-showdown/blob/490b7fb8c2e5e548df9b752f93a589a2a42ce398/data/pokedex.ts#L14530)에 맞춰 **새 포맷에서만 전투별 Dex를 복제해 Tough Claws로 보정**했다. 전역 Dex와 이전 포맷은 바꾸지 않는다. 이전 Dragonite 포맷도 supportedFormats에 남겨 실제 v12 저장 복구를 검증했다. 종족값을 임의로 높이지 않았다. 타워에서 후기 메가폼을 사용하는 각색이며 원작 7세대 구즈마의 공식 파티라는 뜻은 아니다.

## 최종 세트

훈련 열은 HP/공/방/특공/특방/속 순서의 프로젝트 포인트다. 원본 IV는 31, 하우 총 66점, 구즈마 총 54점이며 실제 전투는 기존 층별 IV/포인트 곡선을 적용한다.

### 하우

**Noivern → Primarina → Raichu-Alola**. allFloors=true, select=true, required 3명 전부, preferredLead=Noivern, preferredLast=Raichu-Alola. 전투 중 합리적인 교체와 유턴 수신 선택은 허용한다. Champion / Expert / speed.

|포켓몬|특성|도구|성격|훈련 포인트|4기술|
|---|---|---|---|---|---|
|Noivern|Infiltrator|Life Orb|Timid|0/0/0/32/2/32|Draco Meteor / Air Slash / Flamethrower / U-turn|
|Primarina|Torrent|Assault Vest|Modest|32/0/0/32/2/0|Sparkling Aria / Moonblast / Ice Beam / Energy Ball|
|Raichu-Alola|Surge Surfer|Aloraichium Z|Timid|0/0/0/32/2/32|Thunderbolt / Psychic / Focus Blast / Nasty Plot|

누리레느는 4공격기로 돌격조끼와 충돌하지 않는다. 라이츄는 일렉트릭필드를 전제로 하지 않고 기본 속도로 운용한다. Z는 기존 챔피언 기믹 제한에 따라 **50층부터** 장착/활성화한다. 쿠쿠이가 물리·특수·내구를 섞은 후보형 균형 파티라면 하우는 빠른 특수 공격, 용성군 후 유턴, 마지막 전용 Z에 집중한다.

### 구즈마

Expert / physical. 후보 풀과 필수 Golisopod는 유지한다. named-guzma의 기존 기믹 게이트는 50층이다. 그 전에는 메가스톤이 제거되어 일반형으로 싸운다.

|포켓몬|특성|도구|성격|훈련 포인트|4기술|
|---|---|---|---|---|---|
|Golisopod|Emergency Exit → Tough Claws (Mega)|Golisopite|Adamant|27/27/0/0/0/0|First Impression / Liquidation / Leech Life / Aqua Jet|
|Masquerain|Intimidate|Sitrus Berry|Modest|0/0/0/27/0/27|Quiver Dance / Bug Buzz / Air Slash / Hydro Pump|
|Scizor|Technician|Metal Coat|Adamant|27/27/0/0/0/0|Bullet Punch / Bug Bite / Swords Dance / Roost|
|Ariados|Sniper|Poison Barb|Adamant|27/27/0/0/0/0|Poison Jab / Megahorn / Sucker Punch / Knock Off|
|Pinsir|Mold Breaker|Silver Powder|Adamant|0/27/0/0/0/27|X-Scissor / Close Combat / Rock Slide / Swords Dance|

메가갑주무사는 **벌레/강철, 단단한발톱**이다. 메가 후에는 비상탈출을 유지하지 않는다. 일반형의 FI→EE→재등장→FI는 별도 통제 실험에서 먼저 복구·검증했고, 최종 메가형은 초기 층 일반형에서 그 전술을 유지한다. 후기에는 메가 화력·내구·흡혈 회복으로 승부한다. 실제 전투에서 접촉 위력 100→130과 HP 절반 통과 후 비상탈출 미발동을 테스트했다.

## AI 변경

- 자신의 등장/행동 이력으로 First Impression과 Fake Out의 첫 행동 조건을 추적한다. 같은 체류의 후속 행동에서는 일반·메가·테라 명령 후보에서 제외하고, 교체/비상탈출 뒤 재등장하면 초기화한다. Z로 바뀐 별도 기술은 별도로 취급한다.
- 선공기의 예상 최소 피해로 KO가 가능하거나, 더 느리고 쓰러질 위험이 크면서 일반 기술 대비 피해 차이가 작을 때 가치를 높인다. Technician, Tough Claws, 공개 랭크·타입·면역·마비와 만피 Gale Wings를 반영한다. Sucker Punch는 공개된 직전 변화기를 고려한다. 실제 상대의 미공개 세트나 선택 명령은 읽지 않는다.
- 현재 유효타가 없거나 쓰러질 위험이 큰 경우, 진입 피해를 견디며 First Impression KO를 낼 벤치 재투입을 고려한다. 일반 전술 교체는 기존 scorer를 재사용한다. 첫 행동 기술 팀의 자발 교체는 최대 4회, 3턴 간격·재투입 간격을 적용하며 구속·진입 즉사·빈사 보존 반복을 방지한다.
- 특공/공격이 2랭크 이상 떨어졌고 즉시 KO가 없으며 더 유리한 건강한 수신자가 있을 때 합법적인 타격 피벗을 고려한다. 음번의 유턴은 첫 실험 0회에서 최종 119회로 살아났다.
- 메가·다이맥스·테라 사용 가능 턴은 기존 자원 판단을 유지한다. 기존 테스트에서 발견한 메가진화 건너뛰기를 수정했다. Basic은 자신의 행동 이력만 추적하고 공개 학습·자발 교체를 얻지 않는다.

강제 앵콜/구속/PP 소진으로 대체 명령 자체가 없는 요청에서는 존재하지 않는 명령을 만들거나 전투를 정지시키지 않는다. 아래 불법/실패 0회는 실제 검증 범위의 결과다.

## 실험 방법

하우와 구즈마 각각 phase당 **384전 = 12파티 × 16seed × 2층**. 전투별 HP와 정책 상태를 초기화했다. 플레이어는 DamagePolicy, 기본 합법 기술, 전원 31 IV·66점, 공격 성향별 Adamant/Modest, 도구 없음이다. 같은 case/seed의 전후를 짝지었다. 플레이어 basic 룰과 NPC의 허용 기믹은 기존대로 독립적이다.

|분류|플레이어 3마리|
|---|---|
|balanced|Charizard / Blastoise / Venusaur|
|fast|Jolteon / Weavile / Starmie|
|physical|Garchomp / Metagross / Gyarados|
|special|Alakazam / Magnezone / Primarina|
|bulk|Slowbro / Corviknight / Gastrodon|
|water|Blastoise / Swampert / Gyarados|
|fire|Charizard / Arcanine / Volcarona|
|flying|Aerodactyl / Talonflame / Dragonite|
|fighting|Machamp / Lucario / Heracross|
|psychic|Espeon / Slowbro / Alakazam|
|fairy|Clefable / Togekiss / Azumarill|
|electric|Raichu / Magnezone / Electivire|

before=기준 데이터/v12, after=첫 행동 AI+일반 자뭉열매 통제군, after-mega=최종 메가스톤/v13. 추가로 같은 신세트+Expert/v12 대조 384전, 도구별 384전씩, 보호 3명 전후 각 96전씩, 등급 참조 6명 각 96전을 수행했다. 보고서에 포함한 실행은 총 4,608전이며 전후·후보 비교는 같은 조건을 다시 실행한 것이다.

## 승률과 전체 기여

NPC 승률은 이 검증 파티들에 대한 값이며 사용자의 개인 패배 확률이 아니다. JSON에 Wilson 95% 참고 구간, 파티별·층별 세부 결과를 포함했다. 타입 편향, 같은 seed를 공유하는 짝비교, 도구 없는 플레이어와 층별 훈련 차이 때문에 전체 플레이어 집단의 추정치로 해석하지 않는다.

|NPC|phase|NPC 승수/전투 (승률)|평균 턴|평균 상대 KO|평균 생존 멤버|
|---|---|---|---|---|---|
|named-hau|before|122/384 (31.8%)|5.97|1.81|0.53|
|named-hau|after|247/384 (64.3%)|6.09|2.49|1.10|
|named-hau|after-mega|247/384 (64.3%)|6.09|2.49|1.10|
|named-guzma|before|65/384 (16.9%)|5.75|1.20|0.31|
|named-guzma|after|118/384 (30.7%)|6.03|1.58|0.56|
|named-guzma|after-mega|158/384 (41.1%)|5.92|1.84|0.80|

|최종 NPC|층|승수/전투|승률|
|---|---|---|---|
|named-hau|50|80/192|41.7%|
|named-hau|100|167/192|87.0%|
|named-guzma|45|35/192|18.2%|
|named-guzma|95|123/192|64.1%|

하우는 100층에서 특히 강하지만 전체 검증에서는 64.3%이고 모든 대전 유형에 일방적이지는 않다. 챔피언급 고화력 포지션으로 유지 가능하다. 구즈마는 메가형에서 총 158승으로 상승했다. 기믹이 없는 초반과 후기 메가형은 난이도가 분명히 다르다.

### 하우 포켓몬별 실적 / 기술 전량

생존 턴은 각 포켓몬이 필드에 있었던 공개 턴 수다. 표에는 편성 전투당/실제 출전 전투당 평균을 함께 썼다. 유턴 교체 턴은 두 포켓몬에 겹칠 수 있어 합계가 전투 턴과 같지 않다.

|포켓몬|편성/출전 전투|등장 수|직접 KO|평균 활동 턴 (편성/출전)|기술 사용 횟수|
|---|---|---|---|---|---|
|Noivern|384/384|521|298|2.88 / 2.88|Draco Meteor 543 / U-turn 119 / Air Slash 116 / Flamethrower 77|
|Primarina|384/345|351|353|3.08 / 3.43|Energy Ball 235 / Ice Beam 26 / Sparkling Aria 140 / Moonblast 154|
|Raichu-Alola|384/331|331|293|2.25 / 2.61|Psychic 81 / Stoked Sparksurfer 112 / Thunderbolt 214 / Focus Blast 52 / Nasty Plot 19|

누리레느는 직접 KO 353회로 중간 브레이커 역할을 수행했다. 유턴은 **119회**. 하우 자발 교체 116회, 강제/유턴 수신 선택 703회다.

알로라이Z는 384전 장착, 301전/415요청 턴에서 합법, **Stoked Sparksurfer 112회, 직접 KO 61회**였다. 일반 공격으로 끝낼 수 있으면 자원을 아끼며, 장착했어도 라이츄가 행동하기 전에 전투가 끝나는 경우가 있다. 장착만 하고 거의 사용하지 않는 상태는 아니다.

### 구즈마 포켓몬별 실적 / 기술 전량

일반형과 메가형 갑주무사는 같은 편성 슬롯에 합산했다.

|포켓몬|편성/출전 전투|등장 수|직접 KO|평균 활동 턴 (편성/출전)|기술 사용 횟수|
|---|---|---|---|---|---|
|Ariados|134/112|120|34|2.09 / 2.50|Megahorn 34 / Sucker Punch 34 / Poison Jab 31|
|Golisopod|384/374|444|409|3.58 / 3.67|First Impression 210 / Leech Life 276 / Aqua Jet 57 / Liquidation 202|
|Scizor|308/262|262|159|2.29 / 2.69|Bullet Punch 209 / Bug Bite 120 / Swords Dance 81 / Roost 11|
|Pinsir|144/114|117|48|1.81 / 2.29|X-Scissor 61 / Close Combat 34 / Rock Slide 28 / Swords Dance 9|
|Masquerain|182/146|171|26|2.10 / 2.62|Bug Buzz 39 / Quiver Dance 36 / Air Slash 80 / Hydro Pump 12|

|갑주무사·교체 지표|일반 자뭉 통제 384전|최종 메가스톤 384전|
|---|---|---|
|등장 합계|518|444|
|최초 출전 전투|374|374|
|재등장|144|70|
|첫 행동 만나자마자 가능 요청|512|430|
|만나자마자 선택/실사용|256|210|
|만나자마자 불법 선택|0|0|
|만나자마자 실패|0|0|
|만나자마자 직접 KO|98|104|
|아쿠아제트 실사용|56|57|
|비상탈출 발동|167|72|
|비상탈출 후 재등장|143|69|
|모든 재등장 후 만나자마자|65|32|
|비상탈출 재등장 후 만나자마자|64|31|
|완전한 FI→EE→재등장→FI 연쇄|54|27|
|메가진화|0|181|
|자발 교체|41|41|
|강제 교체/피벗 수신 선택|838|689|
|2턴 내 자발 왕복 루프|0|0|

일반형의 완전 연쇄 **54회/54전**을 확인했다. 최종형에서는 **27회**이며 전부 메가진화를 못 하는 초기 층이다. 후기 비상탈출 5회는 메가 전 상태에서 발생했다. 메가 후에 비상탈출 연쇄를 강제로 유지하는 규칙 변경은 하지 않았다.

같은 일반 신세트·Expert를 v12로만 돌리면 77/384승(20.1%), 만나자마자 잘못된 선택/실패 **430회**, 아쿠아제트 **0회**였다. v13 일반형은 118승, 잘못된 선택/실패 0회, 아쿠아제트 56회였다. 따라서 단순 스톤·데이터 버프와 별개로 조건부 기술 수정 효과도 확인된다.

일반 도구 실험은 자뭉열매 118승, 생명의구슬 109승, 돌격조끼 114승/각 384전이었다. 생명의구슬은 FI KO와 돌격조끼는 재등장을 늘렸지만 전체 승수는 개선하지 못했다. 후속 지시에 따라 메가스톤으로 확정했다.

교체 후 타입 위험이 감소하고 실제 승리한 예는 다음과 같다. 위험은 공개된 상대 STAB 타입의 최대 상성 배율이며 숨겨진 실제 기술을 안다는 뜻은 아니다.

- 45층 fairy, seed 8, 6턴: Masquerain → Scizor, 공개 타입 위험 2배 → 1배. 해당 전투 구즈마 승리.
- 95층 fast, seed 11, 1턴: Masquerain → Scizor, 공개 타입 위험 2배 → 1배. 해당 전투 구즈마 승리.
- 95층 fast, seed 15, 1턴: Masquerain → Scizor, 공개 타입 위험 2배 → 1배. 해당 전투 구즈마 승리.
- 95층 special, seed 12, 2턴: Masquerain → Scizor, 공개 타입 위험 2배 → 1배. 해당 전투 구즈마 승리.
- 95층 bulk, seed 6, 1턴: Ariados → Golisopod, 공개 타입 위험 2배 → 1배. 해당 전투 구즈마 승리.

## 기존 NPC 및 기믹 회귀

|보호 대상|승수 전후|승패가 바뀐 전투|세부 telemetry가 바뀐 전투|
|---|---|---|---|
|라이치|49/96 → 49/96|0|0|
|카일리|29/96 → 29/96|0|0|
|키아웨|34/96 → 34/96|0|6|

라이치·카일리는 telemetry까지 동일했다. 키아웨는 6전에서 파이어로의 만피 질풍날개 선공 판단이 달라져 브레이브버드가 99→105회, 직접 KO가 58→64회, 날개쉬기가 9→12회였다. 전체 34/96승은 동일했고 데이터 수정은 없다. 평균 턴은 4.91→4.97이다. Accelerock/Extreme Speed는 실제 세트에 되넣지 않고 공용 단위 테스트에서 검증했다.

등급 참조(각 96전, seed 1–4, 45/95층)는 다음과 같다. 순위의 정밀한 추정이 아니라 상대적 위치 확인이다. 구즈마의 같은 seed 부분집합은 35/96승이다.

|참조 NPC|승수/전투|NPC 승률|
|---|---|---|
|일리마|28/96|29.2%|
|수련|49/96|51.0%|
|말리화|27/96|28.1%|
|나누|33/96|34.4%|
|할라|29/96|30.2%|
|몰레인|47/96|49.0%|
|라이치|49/96|51.0%|
|카일리|29/96|30.2%|
|키아웨|34/96|35.4%|

1~6세대·쿠쿠이·루자미네 등은 데이터 해시를 보존했고, 기존 지역별 실제 전투/기믹/리플레이 테스트도 통과했다. 공용 v13 판단이 바뀔 수 있으므로 모든 NPC의 모든 매치업 승률이 동일하다는 주장은 하지 않는다. 전 세대 대규모 승률 재조사는 이번 범위에 포함하지 않았다.

## 검증

- 전체 unit/integration **1,031개 통과**, 실패·스킵 0.
- 선택 브라우저/E2E **15개 통과**: 하우·구즈마 390/1280px 팀·선봉·입력·새로고침, 메가갑주무사 실제 메가진화/10316 스프라이트, 보호 3명, v11/v12/v13 Z.
- TypeScript noEmit, production build, 검토 원본→런타임 226행 대조, git diff whitespace 검사.
- FI 첫 행동/후속 행동/재등장/턴 중 교대, flinch, 7종 선공기 KO·비KO, 공개 면역/변화기, 위험한 진입/구속·교체 간격/예산, 음번 피벗, 실제 FI→EE→복귀→FI, 메가·다이맥스·테라·Z 실제 발동과 리플레이, v12 이전 포맷 저장 재접속을 검증했다.

Windows 빌드의 연결 폴더 생성은 샌드박스에서 권한 오류가 발생해 승인된 빌드 명령으로 재실행해 통과했다.

## 재현과 근거

전체 수치·원본 JSONL 해시·매니페스트·프로토콜 예시는 [JSON 보고서](hau-guzma-audit.json)에 있다. 대용량 JSONL과 실행 로그는 `artifacts/experiments/balance/hau-guzma-20261019`에 로컬 보관한다.

PowerShell에서 실행한다. baseline 생성기는 현재 수정본이 아닌 기준 git 커밋을 읽는다.

```powershell
node scripts/build-hau-guzma-preservation.mjs
$env:HG_PHASE='before'
$env:NPC_BALANCE_BASELINE='artifacts/experiments/balance/hau-guzma-20261019/baseline-runtime.json'
node --import ./scripts/lib/npc-balance-baseline.mjs --import tsx scripts/simulate-hau-guzma.ts
Remove-Item Env:NPC_BALANCE_BASELINE
$env:HG_PHASE='after'
node --import tsx scripts/simulate-hau-guzma.ts
$env:HG_PHASE='after-mega'
node --import tsx scripts/simulate-hau-guzma.ts
# 각 phase를 지정해 반복: restored-v12, regression-before,
# regression-after, rank-reference, trial-life-orb, trial-assault-vest
node --import tsx scripts/report-hau-guzma.ts
```

하우 **유지 가능**. 구즈마 일반형은 **First Impression은 정상이나 팀 자체가 약함**이었고, 사용자 후속 지시에 따른 최종 메가형은 **목표 난이도 달성(표본 기준)**으로 판단한다.
