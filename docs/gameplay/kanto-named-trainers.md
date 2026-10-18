# 관동 네임드 완성

이 문서의 빌드는 유지하며 Z 의사결정만 v12로 개선했다. 최신 측정은 [Z기술 AI 보고서](z-move-ai-balance-report.md)를 참고한다.

2026-10-18. 관동 테마의 실제 gyms/elites/champion/final에서 추출한 14개 ID만 검토했다. 성도 독수/목호와 로켓단 보스 비주기는 별도 ID로 보존한다. 공통 AI·선출 엔진·floor scaling·기믹 해금은 유지한다.

## 원본과 품질 기준

- 관동 28개 전·후반 템플릿을 14개 단일 후보 원본으로 정리했다. 전체 runtime은 311→297개, 전체 ID는 163개다. 후보는 국화 5종, 나머지 6종이다.
- 후보 사용 이력은 아래 reference의 본가 게임 팀에서 확인했다. 특정 한 작품의 팀을 그대로 복제한 것은 아니다. 맘모꾸리/무우마직은 기존 프로젝트의 메꾸리/무우마 진화형 대응을 유지했다.
- 원본 IV31/66포인트(능력당 최대32), 성실 성격을 사용한다. 실제 전투에서는 기존 층별 포인트 축소와 네임드 역할별 IV 배분을 적용한다. 50층 챔피언/히든과 55층 관장·사천왕의 기존 기믹 해금을 그대로 따른다.
- 기존 에이스·기믹 carrier를 모두 유지했다. 마티스의 tactic만 physical→speed, 체육관 비주기는 physical→balanced로 데이터에서 변경했다. AI 버전과 판단 코드는 변경하지 않았다.
- 후보 풀의 기본 도구는 서로 다르게 배정했다. 해금 시 carrier의 기본 도구를 기존 Mega/Z/Dynamax 도구로 교체한다. 전기구슬·굵은뼈는 현재 도구 카탈로그 미지원이므로 시스템에 새로 추가하지 않았다.

## 웅 · named-brock

에이스: 딱구리 (Golem). tactic: bulk. AI: 전반 tactical, 50층 이후 expert. 기믹: mega / 프테라 (Aerodactyl).

required: Golem; selectionRules: {}. 별도 lead/last 강제는 없다. 대표 후반 조합: 프테라 / 딱구리 / 암스타 (1회).

딱구리와 화석 중심 바위 파티. 중복 STAB와 Wring Out을 정리하고 물리·특수 화석의 역할을 나눈다.

| 후보 / 역할 | 특성 | 기본 도구 | 4기술 | HP/공/방/특공/특방/속 포인트 |
| --- | --- | --- | --- | --- |
| 딱구리 (Golem) · 물리 | Sturdy | 자뭉열매 | 지진 / 스톤샤워 / 기습 / 록커트 | 10/32/0/0/0/24 |
| 프테라 (Aerodactyl) · 물리 | Rock Head | 딱딱한돌 | 스톤샤워 / 제비반환 / 지진 / 얼음엄니 | 10/32/0/0/0/24 |
| 암스타 (Omastar) · 특수 | Shell Armor | 신비의물방울 | 파도타기 / 원시의힘 / 냉동빔 / 껍질깨기 | 10/0/0/32/0/24 |
| 투구푸스 (Kabutops) · 물리 | Battle Armor | 힘의머리띠 | 폭포오르기 / 스톤에지 / 아쿠아제트 / 칼춤 | 10/32/0/0/0/24 |
| 시라칸 (Relicanth) · 물리 | Rock Head | 먹다남은음식 | 양날박치기 / 폭포오르기 / 지진 / 하품 | 24/32/0/0/10/0 |
| 램펄드 (Rampardos) · 물리 | Mold Breaker | 달인의띠 | 스톤샤워 / 지진 / 불꽃펀치 / 깨물어부수기 | 10/32/0/0/0/24 |

원작 후보 근거: [reference 1](https://www.serebii.net/heartgoldsoulsilver/gym-rematch.shtml), [reference 2](https://www.serebii.net/black2white2/pwt/kanto.shtml).

## 이슬 · named-misty

에이스: 아쿠스타 (Starmie). tactic: special. AI: 전반 tactical, 50층 이후 expert. 기믹: z / 아쿠스타 (Starmie).

required: Starmie; selectionRules: {}. 별도 lead/last 강제는 없다. 대표 후반 조합: 라프라스 / 누오 / 아쿠스타 (1회).

빠른 아쿠스타와 실제 HGSS 물 파트너. 전기 무효/흡수와 얼음 견제, 회복을 분담한다.

| 후보 / 역할 | 특성 | 기본 도구 | 4기술 | HP/공/방/특공/특방/속 포인트 |
| --- | --- | --- | --- | --- |
| 아쿠스타 (Starmie) · 특수 | Natural Cure | 박식안경 | 파도타기 / 사이코키네시스 / 냉동빔 / HP회복 | 10/0/0/32/0/24 |
| 누오 (Quagsire) · 물리 | Water Absorb | 먹다남은음식 | 지진 / 폭포오르기 / HP회복 / 맹독 | 24/32/0/0/10/0 |
| 라프라스 (Lapras) · 특수 | Water Absorb | 자뭉열매 | 파도타기 / 냉동빔 / 프리즈드라이 / 누르기 | 24/0/10/32/0/0 |
| 랜턴 (Lanturn) · 특수 | Volt Absorb | 자석 | 파도타기 / 10만볼트 / 냉동빔 / 볼트체인지 | 24/0/10/32/0/0 |
| 플로젤 (Floatzel) · 물리 | Water Veil | 신비의물방울 | 폭포오르기 / 냉동펀치 / 깨물어부수기 / 아쿠아제트 | 10/32/0/0/0/24 |
| 밀로틱 (Milotic) · 특수 | Marvel Scale | 리샘열매 | 파도타기 / 냉동빔 / HP회복 / 드래곤테일 | 24/0/10/32/0/0 |

원작 후보 근거: [reference 1](https://www.serebii.net/heartgoldsoulsilver/gym-rematch.shtml).

## 마티스 · named-ltsurge

에이스: 라이츄 (Raichu). tactic: speed. AI: 전반 tactical, 50층 이후 expert. 기믹: z / 라이츄 (Raichu).

required: Raichu; selectionRules: {"atLeastOneOf":["Magnezone","Electivire","Manectric"]}. 별도 lead/last 강제는 없다. 대표 후반 조합: 에레키블 / 자포코일 / 라이츄 (1회).

빠른 전기 압박·마비·피벗. 전기 중복과 Focus Punch를 제거하고 에이스의 특수 배분을 맞춘다.

| 후보 / 역할 | 특성 | 기본 도구 | 4기술 | HP/공/방/특공/특방/속 포인트 |
| --- | --- | --- | --- | --- |
| 라이츄 (Raichu) · 특수 | Static | 기합의띠 | 10만볼트 / 풀묶기 / 기합구슬 / 나쁜음모 | 10/0/0/32/0/24 |
| 붐볼 (Electrode) · 특수 | Static | 빛의점토 | 10만볼트 / 볼트체인지 / 전기자석파 / 리플렉터 | 10/0/0/32/0/24 |
| 자포코일 (Magnezone) · 특수 | Sturdy | 자석 | 10만볼트 / 러스터캐논 / 볼트체인지 / 미러코트 | 10/0/0/32/0/24 |
| 에레키블 (Electivire) · 물리 | Motor Drive | 달인의띠 | 번개펀치 / 냉동펀치 / 지진 / 크로스촙 | 10/32/0/0/0/24 |
| 썬더볼트 (Manectric) · 특수 | Lightning Rod | 박식안경 | 10만볼트 / 화염방사 / 볼트체인지 / 바크아웃 | 10/0/0/32/0/24 |
| 파치리스 (Pachirisu) · 내구/반격 | Volt Absorb | 자뭉열매 | 볼부비부비 / 분노의앞니 / 씨폭탄 / 볼트체인지 | 26/0/24/0/16/0 |

원작 후보 근거: [reference 1](https://www.serebii.net/heartgoldsoulsilver/gym-rematch.shtml).

## 민화 · named-erika

에이스: 라플레시아 (Vileplume). tactic: status. AI: 전반 tactical, 50층 이후 expert. 기믹: tera / 라플레시아 (Vileplume).

required: Vileplume; selectionRules: {}. 별도 lead/last 강제는 없다. 대표 후반 조합: 아르코 / 로즈레이드 / 라플레시아 (1회).

흡수·상태이상과 물리/특수 풀 공격. 날씨 시동자가 없으므로 엽록소를 날씨 파티로 오인하지 않는다.

| 후보 / 역할 | 특성 | 기본 도구 | 4기술 | HP/공/방/특공/특방/속 포인트 |
| --- | --- | --- | --- | --- |
| 라플레시아 (Vileplume) · 특수 | Effect Spore | 검은진흙 | 기가드레인 / 오물폭탄 / 문포스 / 달빛 | 24/0/10/32/0/0 |
| 덩쿠림보 (Tangrowth) · 물리 | Regenerator | 먹다남은음식 | 파워휩 / 지진 / 탁쳐서떨구기 / 수면가루 | 24/32/0/0/10/0 |
| 우츠보트 (Victreebel) · 물리 | Chlorophyll | 달인의띠 | 리프블레이드 / 독찌르기 / 기습 / 칼춤 | 10/32/0/0/0/24 |
| 아르코 (Bellossom) · 특수 | Chlorophyll | 자뭉열매 | 기가드레인 / 문포스 / 나비춤 / 힘흡수 | 10/0/0/32/0/24 |
| 다탱구 (Shiftry) · 물리 | Chlorophyll | 검은안경 | 리프블레이드 / 탁쳐서떨구기 / 기습 / 칼춤 | 10/32/0/0/0/24 |
| 로즈레이드 (Roserade) · 특수 | Natural Cure | 박식안경 | 기가드레인 / 오물폭탄 / 섀도볼 / 수면가루 | 10/0/0/32/0/24 |

원작 후보 근거: [reference 1](https://www.serebii.net/heartgoldsoulsilver/gym-rematch.shtml), [reference 2](https://www.serebii.net/black2white2/pwt/kanto.shtml).

## 독수 · named-koga-kanto

에이스: 또도가스 (Weezing). tactic: status. AI: 전반 tactical, 50층 이후 expert. 기믹: z / 또도가스 (Weezing).

required: Weezing; selectionRules: {}. 별도 lead/last 강제는 없다. 대표 후반 조합: 질뻐기 / 도나리 / 또도가스 (1회).

관동 또도가스 에이스와 독/교란. Belch·혼합 중복을 없애고 부유·상태이상·벌레/악 견제를 분담한다.

| 후보 / 역할 | 특성 | 기본 도구 | 4기술 | HP/공/방/특공/특방/속 포인트 |
| --- | --- | --- | --- | --- |
| 또도가스 (Weezing) · 특수 | Levitate | 자뭉열매 | 오물폭탄 / 화염방사 / 10만볼트 / 도깨비불 | 24/0/10/32/0/0 |
| 질뻐기 (Muk) · 물리 | Sticky Hold | 검은진흙 | 독찌르기 / 탁쳐서떨구기 / 불꽃펀치 / 야습 | 24/32/0/0/10/0 |
| 크로뱃 (Crobat) · 물리 | Inner Focus | 예리한부리 | 브레이브버드 / 크로스포이즌 / 유턴 / 날개쉬기 | 10/32/0/0/0/24 |
| 도나리 (Venomoth) · 특수 | Tinted Lens | 기합의띠 | 벌레의야단법석 / 오물폭탄 / 나비춤 / 수면가루 | 10/0/0/32/0/24 |
| 독개굴 (Toxicroak) · 물리 | Dry Skin | 검은띠 | 드레인펀치 / 독찌르기 / 기습 / 칼춤 | 10/32/0/0/0/24 |
| 스컹탱크 (Skuntank) · 물리 | Aftermath | 검은안경 | 독찌르기 / 깨물어부수기 / 기습 / 화염방사 | 24/32/0/0/10/0 |

원작 후보 근거: [reference 1](https://www.serebii.net/fireredleafgreen/elitefour.shtml), [reference 2](https://www.serebii.net/heartgoldsoulsilver/elitefour.shtml).

## 초련 · named-sabrina

에이스: 후딘 (Alakazam). tactic: special. AI: 전반 tactical, 50층 이후 expert. 기믹: mega / 후딘 (Alakazam).

required: Alakazam; selectionRules: {"atLeastOneOf":["Espeon","Jynx","Gallade"]}. 별도 lead/last 강제는 없다. 대표 후반 조합: 후딘 / 엘레이드 / 마임맨 (2회).

미래예지만 남던 후반 즉발 에스퍼 STAB 복구. 에이스와 실제 HGSS 후보, 보조 둘만 붙는 조합을 제외한다.

| 후보 / 역할 | 특성 | 기본 도구 | 4기술 | HP/공/방/특공/특방/속 포인트 |
| --- | --- | --- | --- | --- |
| 후딘 (Alakazam) · 특수 | Magic Guard | 기합의띠 | 사이코키네시스 / 섀도볼 / 기합구슬 / 매지컬샤인 | 10/0/0/32/0/24 |
| 에브이 (Espeon) · 특수 | Synchronize | 휘어진스푼 | 사이코키네시스 / 섀도볼 / 매지컬샤인 / 명상 | 10/0/0/32/0/24 |
| 마임맨 (Mr. Mime) · 특수 | Soundproof | 빛의점토 | 사이코키네시스 / 매지컬샤인 / 리플렉터 / 전기자석파 | 10/0/0/32/0/24 |
| 루주라 (Jynx) · 특수 | Dry Skin | 녹지않는얼음 | 냉동빔 / 사이코키네시스 / 악마의키스 / 나쁜음모 | 10/0/0/32/0/24 |
| 마자용 (Wobbuffet) · 내구/반격 | Shadow Tag | 자뭉열매 | 카운터 / 미러코트 / 앙코르 / 길동무 | 26/0/24/0/16/0 |
| 엘레이드 (Gallade) · 물리 | Steadfast | 달인의띠 | 사이코커터 / 인파이트 / 리프블레이드 / 칼춤 | 10/32/0/0/0/24 |

원작 후보 근거: [reference 1](https://www.serebii.net/heartgoldsoulsilver/gym-rematch.shtml).

## 강연 · named-blaine

에이스: 윈디 (Arcanine). tactic: special. AI: 전반 tactical, 50층 이후 expert. 기믹: z / 윈디 (Arcanine).

required: Arcanine; selectionRules: {"atLeastOneOf":["Ninetales","Magmortar","Rapidash"]}. 별도 lead/last 강제는 없다. 대표 후반 조합: 윈디 / 헬가 / 날쌩마 (2회).

불꽃 정체성을 유지하며 원작의 번개펀치/번개/와일드볼트/에너지볼 계열 견제를 분담한다. Drought는 추가하지 않는다.

| 후보 / 역할 | 특성 | 기본 도구 | 4기술 | HP/공/방/특공/특방/속 포인트 |
| --- | --- | --- | --- | --- |
| 윈디 (Arcanine) · 물리 | Intimidate | 자뭉열매 | 플레어드라이브 / 신속 / 와일드볼트 / 인파이트 | 10/32/0/0/0/24 |
| 나인테일 (Ninetales) · 특수 | Flash Fire | 박식안경 | 화염방사 / 에너지볼 / 나쁜음모 / 도깨비불 | 10/0/0/32/0/24 |
| 마그마번 (Magmortar) · 특수 | Flame Body | 달인의띠 | 화염방사 / 10만볼트 / 기합구슬 / 사이코키네시스 | 10/0/0/32/0/24 |
| 날쌩마 (Rapidash) · 물리 | Flash Fire | 힘의머리띠 | 플레어드라이브 / 와일드볼트 / 10만마력 / 아침햇살 | 10/32/0/0/0/24 |
| 헬가 (Houndoom) · 특수 | Flash Fire | 검은안경 | 화염방사 / 악의파동 / 오물폭탄 / 나쁜음모 | 10/0/0/32/0/24 |
| 마그카르고 (Magcargo) · 특수 | Flame Body | 먹다남은음식 | 분연 / 파워젬 / 대지의힘 / HP회복 | 24/0/10/32/0/0 |

원작 후보 근거: [reference 1](https://www.serebii.net/heartgoldsoulsilver/gym-rematch.shtml), [reference 2](https://www.serebii.net/black2white2/pwt/kanto.shtml).

## 비주기 · named-giovanni-gym

에이스: 니드킹 (Nidoking). tactic: balanced. AI: 전반 tactical, 50층 이후 expert. 기믹: tera / 니드킹 (Nidoking).

required: Nidoking; selectionRules: {}. 별도 lead/last 강제는 없다. 대표 후반 조합: 딱구리 / 텅구리 / 니드킹 (2회).

로켓단 보스와 분리된 땅 관장. 니드킹 특수 coverage와 물리 땅 파트너로 중복 드릴라이너/역린을 정리한다.

| 후보 / 역할 | 특성 | 기본 도구 | 4기술 | HP/공/방/특공/특방/속 포인트 |
| --- | --- | --- | --- | --- |
| 니드킹 (Nidoking) · 특수 | Sheer Force | 생명의구슬 | 대지의힘 / 오물웨이브 / 냉동빔 / 10만볼트 | 10/0/0/32/0/24 |
| 니드퀸 (Nidoqueen) · 특수 | Sheer Force | 달인의띠 | 대지의힘 / 오물폭탄 / 냉동빔 / 화염방사 | 24/0/10/32/0/0 |
| 거대코뿌리 (Rhyperior) · 물리 | Solid Rock | 먹다남은음식 | 지진 / 스톤샤워 / 메가혼 / 냉동펀치 | 24/32/0/0/10/0 |
| 닥트리오 (Dugtrio) · 물리 | Arena Trap | 기합의띠 | 지진 / 스톤에지 / 기습 / 제비반환 | 10/32/0/0/0/24 |
| 딱구리 (Golem) · 물리 | Sturdy | 자뭉열매 | 지진 / 스톤샤워 / 기습 / 록커트 | 10/32/0/0/0/24 |
| 텅구리 (Marowak) · 물리 | Rock Head | 부드러운모래 | 지진 / 불꽃펀치 / 이판사판태클 / 스톤샤워 | 24/32/0/0/10/0 |

원작 후보 근거: [reference 1](https://www.serebii.net/black2white2/pwt/kanto.shtml).

## 칸나 · named-lorelei

에이스: 라프라스 (Lapras). tactic: bulk. AI: 전반 tactical, 50층 이후 expert. 기믹: dynamax / 라프라스 (Lapras).

required: Lapras; selectionRules: {"atLeastOneOf":["Jynx","Slowbro","Mamoswine"]}. 별도 lead/last 강제는 없다. 대표 후반 조합: 루주라 / 라프라스 / 맘모꾸리 (1회).

충분히 강한 기존 라프라스/루주라/맘모꾸리 공격 구성을 보존하고 원작 물/얼음/야도란 후보를 추가한다. 파르셀에게 껍질깨기 등 일괄 강화는 추가하지 않는다.

| 후보 / 역할 | 특성 | 기본 도구 | 4기술 | HP/공/방/특공/특방/속 포인트 |
| --- | --- | --- | --- | --- |
| 라프라스 (Lapras) · 혼합 | Water Absorb | 먹다남은음식 | 파도타기 / 냉동빔 / 아쿠아테일 / 이판사판태클 | 14/26/0/26/0/0 |
| 루주라 (Jynx) · 특수 | Oblivious | 녹지않는얼음 | 냉동빔 / 미래예지 / 사이코키네시스 / 눈보라 | 10/0/0/32/0/24 |
| 맘모꾸리 (Mamoswine) · 물리 | Oblivious | 자뭉열매 | 고드름떨구기 / 지진 / 누르기 / 맹독 | 10/32/0/0/0/24 |
| 쥬레곤 (Dewgong) · 특수 | Thick Fat | 리샘열매 | 파도타기 / 냉동빔 / 잠자기 / 잠꼬대 | 24/0/10/32/0/0 |
| 파르셀 (Cloyster) · 물리 | Skill Link | 힘의머리띠 | 고드름침 / 록블라스트 / 셸블레이드 / 얼음뭉치 | 10/32/0/0/0/24 |
| 야도란 (Slowbro) · 특수 | Regenerator | 신비의물방울 | 파도타기 / 사이코키네시스 / 냉동빔 / 게으름피우기 | 24/0/10/32/0/0 |

원작 후보 근거: [reference 1](https://www.serebii.net/fireredleafgreen/elitefour.shtml).

## 시바 · named-bruno-kanto

에이스: 괴력몬 (Machamp). tactic: physical. AI: 전반 tactical, 50층 이후 expert. 기믹: dynamax / 괴력몬 (Machamp).

required: Machamp; selectionRules: {}. 별도 lead/last 강제는 없다. 대표 후반 조합: 루카리오 / 괴력몬 / 강철톤 (1회).

기합펀치/Steel Roller/메가톤 계열을 즉발 STAB·선공·coverage로 정리. 원작 록/강철 파트너와 격투 분담.

| 후보 / 역할 | 특성 | 기본 도구 | 4기술 | HP/공/방/특공/특방/속 포인트 |
| --- | --- | --- | --- | --- |
| 괴력몬 (Machamp) · 물리 | No Guard | 자뭉열매 | 폭발펀치 / 스톤에지 / 탁쳐서떨구기 / 독찌르기 | 24/32/0/0/10/0 |
| 강철톤 (Steelix) · 물리 | Sturdy | 먹다남은음식 | 헤비봄버 / 지진 / 스톤샤워 / 맹독 | 24/32/0/0/10/0 |
| 시라소몬 (Hitmonlee) · 물리 | Reckless | 광각렌즈 | 무릎차기 / 블레이즈킥 / 탁쳐서떨구기 / 마하펀치 | 10/32/0/0/0/24 |
| 홍수몬 (Hitmonchan) · 물리 | Iron Fist | 검은띠 | 드레인펀치 / 마하펀치 / 냉동펀치 / 번개펀치 | 10/32/0/0/0/24 |
| 강챙이 (Poliwrath) · 물리 | Water Absorb | 신비의물방울 | 폭포오르기 / 드레인펀치 / 냉동펀치 / 벌크업 | 10/32/0/0/0/24 |
| 루카리오 (Lucario) · 물리 | Inner Focus | 달인의띠 | 인파이트 / 코멧펀치 / 신속 / 칼춤 | 10/32/0/0/0/24 |

원작 후보 근거: [reference 1](https://www.serebii.net/fireredleafgreen/elitefour.shtml), [reference 2](https://www.serebii.net/heartgoldsoulsilver/elitefour.shtml), [reference 3](https://www.serebii.net/letsgopikachueevee/elitefour.shtml).

## 국화 · named-agatha

에이스: 팬텀 (Gengar). tactic: status. AI: 전반 tactical, 50층 이후 expert. 기믹: mega / 팬텀 (Gengar).

required: Gengar; selectionRules: {}. 별도 lead/last 강제는 없다. 대표 후반 조합: 아보크 / 팬텀 / 무우마직 (2회).

기존 팬텀/크로뱃/무우마직의 핵심 기술을 유지한다. 실제 독 파트너를 복구하되 유령 고화력 포켓몬을 더 끼워 넣지 않는다. 진화형 무우마직은 기존 프로젝트 관례다.

| 후보 / 역할 | 특성 | 기본 도구 | 4기술 | HP/공/방/특공/특방/속 포인트 |
| --- | --- | --- | --- | --- |
| 팬텀 (Gengar) · 특수 | Cursed Body | 먹다남은음식 | 섀도볼 / 오물폭탄 / 도깨비불 / 에너지볼 | 10/0/0/32/0/24 |
| 크로뱃 (Crobat) · 혼합 | Inner Focus | 독바늘 | 크로스포이즌 / 브레이브버드 / 맹독 / 오물폭탄 | 14/26/0/26/0/0 |
| 무우마직 (Mismagius) · 특수 | Levitate | 자뭉열매 | 섀도볼 / 미래예지 / 도깨비불 / 악의파동 | 10/0/0/32/0/24 |
| 아보크 (Arbok) · 물리 | Intimidate | 검은진흙 | 더스트슈트 / 깨물어부수기 / 뱀눈초리 / 기습 | 10/32/0/0/0/24 |
| 또도가스 (Weezing) · 특수 | Levitate | 박식안경 | 오물폭탄 / 화염방사 / 10만볼트 / 도깨비불 | 24/0/10/32/0/0 |

원작 후보 근거: [reference 1](https://www.serebii.net/fireredleafgreen/elitefour.shtml), [reference 2](https://www.serebii.net/letsgopikachueevee/elitefour.shtml).

## 목호 · named-lance-kanto

에이스: 망나뇽 (Dragonite). tactic: physical. AI: 전반 tactical, 50층 이후 expert. 기믹: mega / 망나뇽 (Dragonite).

required: Dragonite; selectionRules: {}. 별도 lead/last 강제는 없다. 대표 후반 조합: 망나뇽 / 갸라도스 / 보만다 (1회).

물리 전술과 불일치하던 망나뇽/킹드라 기술을 정리한다. 성도 목호의 마지막 배치 규칙은 복사하지 않는다.

| 후보 / 역할 | 특성 | 기본 도구 | 4기술 | HP/공/방/특공/특방/속 포인트 |
| --- | --- | --- | --- | --- |
| 망나뇽 (Dragonite) · 물리 | Inner Focus | 리샘열매 | 드래곤클로 / 불꽃펀치 / 신속 / 용의춤 | 10/32/0/0/0/24 |
| 갸라도스 (Gyarados) · 물리 | Intimidate | 먹다남은음식 | 폭포오르기 / 얼음엄니 / 지진 / 용의춤 | 10/32/0/0/0/24 |
| 프테라 (Aerodactyl) · 물리 | Rock Head | 딱딱한돌 | 스톤샤워 / 제비반환 / 지진 / 날개쉬기 | 10/32/0/0/0/24 |
| 리자몽 (Charizard) · 특수 | Blaze | 목탄 | 화염방사 / 에어슬래시 / 용의파동 / 날개쉬기 | 10/0/0/32/0/24 |
| 킹드라 (Kingdra) · 특수 | Sniper | 신비의물방울 | 파도타기 / 용의파동 / 냉동빔 / 기충전 | 10/0/0/32/0/24 |
| 보만다 (Salamence) · 물리 | Intimidate | 달인의띠 | 드래곤클로 / 지진 / 화염방사 / 용의춤 | 10/32/0/0/0/24 |

원작 후보 근거: [reference 1](https://www.serebii.net/fireredleafgreen/elitefour.shtml), [reference 2](https://www.serebii.net/heartgoldsoulsilver/elitefour.shtml), [reference 3](https://www.serebii.net/letsgopikachueevee/elitefour.shtml).

## 그린 · named-blue

에이스: 피죤투 (Pidgeot). tactic: balanced. AI: 전반 expert, 50층 이후 expert. 기믹: mega / 피죤투 (Pidgeot).

required: Pidgeot; selectionRules: {}. 별도 lead/last 강제는 없다. 대표 후반 조합: 후딘 / 윈디 / 피죤투 (1회).

피죤투 메가 특성에 맞는 특수 STAB를 복구하고 실제 그린의 혼합 파트너를 확장한다. 에이스 마지막 고정은 없다.

| 후보 / 역할 | 특성 | 기본 도구 | 4기술 | HP/공/방/특공/특방/속 포인트 |
| --- | --- | --- | --- | --- |
| 피죤투 (Pidgeot) · 특수 | Keen Eye | 박식안경 | 폭풍 / 열풍 / 유턴 / 날개쉬기 | 10/0/0/32/0/24 |
| 후딘 (Alakazam) · 특수 | Synchronize | 휘어진스푼 | 사이코키네시스 / 섀도볼 / 기합구슬 / HP회복 | 10/0/0/32/0/24 |
| 윈디 (Arcanine) · 물리 | Intimidate | 힘의머리띠 | 플레어드라이브 / 신속 / 인파이트 / 도깨비불 | 10/32/0/0/0/24 |
| 거북왕 (Blastoise) · 특수 | Torrent | 신비의물방울 | 파도타기 / 냉동빔 / 악의파동 / 아쿠아제트 | 24/0/10/32/0/0 |
| 나시 (Exeggutor) · 특수 | Chlorophyll | 자뭉열매 | 기가드레인 / 사이코키네시스 / 수면가루 / 씨뿌리기 | 24/0/10/32/0/0 |
| 괴력몬 (Machamp) · 물리 | No Guard | 먹다남은음식 | 폭발펀치 / 스톤에지 / 탁쳐서떨구기 / 불릿펀치 | 24/32/0/0/10/0 |

원작 후보 근거: [reference 1](https://www.serebii.net/heartgoldsoulsilver/gym-rematch.shtml), [reference 2](https://www.serebii.net/fireredleafgreen/elitefour.shtml).

## 레드 · named-red-kanto

에이스: 피카츄 (Pikachu). tactic: balanced. AI: 전반 expert, 50층 이후 expert. 기믹: dynamax / 피카츄 (Pikachu).

required: Pikachu; selectionRules: {}. 별도 lead/last 강제는 없다. 대표 후반 조합: 리자몽 / 라프라스 / 피카츄 (1회).

기존 피카츄 거다이맥스와 3마리 핵심 기술을 보존하고 실제 HGSS 6마리를 후보화한다. 미지원 전기구슬을 추가하지 않고 기존 자석과 기믹 도구의 교체를 관찰한다.

| 후보 / 역할 | 특성 | 기본 도구 | 4기술 | HP/공/방/특공/특방/속 포인트 |
| --- | --- | --- | --- | --- |
| 피카츄 (Pikachu) · 특수 | Static | 자석 | 10만볼트 / 풀묶기 / 볼트체인지 / 전광석화 | 10/0/0/32/0/24 |
| 리자몽 (Charizard) · 특수 | Blaze | 통굽부츠 | 화염방사 / 에어슬래시 / 용의파동 / 날개쉬기 | 10/0/0/32/0/24 |
| 라프라스 (Lapras) · 특수 | Water Absorb | 달인의띠 | 파도타기 / 냉동빔 / 10만볼트 / 노래하기 | 24/0/10/32/0/0 |
| 이상해꽃 (Venusaur) · 특수 | Overgrow | 검은진흙 | 기가드레인 / 오물폭탄 / 대지의힘 / 수면가루 | 24/0/10/32/0/0 |
| 거북왕 (Blastoise) · 특수 | Torrent | 신비의물방울 | 파도타기 / 냉동빔 / 악의파동 / 아쿠아제트 | 24/0/10/32/0/0 |
| 잠만보 (Snorlax) · 물리 | Thick Fat | 먹다남은음식 | 누르기 / 깨물어부수기 / 지진 / 잠자기 | 24/32/0/0/10/0 |

원작 후보 근거: [reference 1](https://www.serebii.net/heartgoldsoulsilver/red.shtml).

## 유지·보정 판단

- 국화: 기존 팬텀·크로뱃·무우마직의 핵심 공격 기술과 Mega Gengar를 유지했다. 나머지는 원작 독 파트너이며 더 강한 관계없는 고스트를 추가하지 않았다.
- 칸나: 기존 라프라스·루주라·맘모꾸리의 공격 구성을 보존했다. 후보 확대에 필요한 원작 파트너만 추가했고 파르셀 껍질깨기나 날씨 시동자 추가는 하지 않았다.
- 목호: 성도용 마지막 배치를 복사하지 않았다. 관동 에이스와 기존 Mega carrier를 유지하며 물리 전술에 맞는 드래곤 공격을 구성했다.
- 1차 검사 후 보정은 1회만 했다. 웅의 프테라 Roost→Ice Fang, 관동 시바의 괴력몬 Bullet Punch→Poison Jab만 바꿨다. 수치/레벨/공통 AI 보정은 없다. 중간 결과는 first-pass/에 보존했다.

## 선출 규칙

| NPC | atLeastOneOf | 목적 |
| --- | --- | --- |
| 마티스 | 자포코일/에레키블/썬더볼트 | 에이스+붐볼+파치리스 저압박 조합 방지 |
| 초련 | 에브이/루주라/엘레이드 | 에이스+마임맨+마자용 수동 조합 방지 |
| 강연 | 나인테일/마그마번/날쌩마 | 전기/풀 견제 담당 동료 최소1 |
| 칸나 | 루주라/야도란/맘모꾸리 | 물/얼음 축만 겹치는 조합에 별도 공격 역할 최소1 |

웅은 에이스 딱구리와 Mega 프테라가 기존 선출 경로에서 모두 보장된다. 다른 에이스도 required를 유지한다. 날씨 시동자가 없는 팀에 날씨 규칙을 붙이거나 모든 에이스를 마지막에 두지 않았다.

## 대사

이번에 새로 추가한 대사는 없다. 기존 관동 레드의 “… …!”만 유지했다([레츠고 전투 전 reference](https://bulbapedia.bulbagarden.net/wiki/Red_(game)/Quotes)). 다른 한국어 전투 직전 원문/맥락은 unverified로 남겼으며 창작하지 않았다.

승률·선출·기믹·테스트: [관동 최종 밸런스 보고서](kanto-named-trainer-balance-report.md).
