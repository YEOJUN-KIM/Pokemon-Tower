# 네임드 선출·배치 규칙

`trainer-catalog → reviewed samples → runtime export → npc-templates → opponent-team → npc-ai/policy` 경로를 유지한다. 신규 필드는 검토 원본 `scripts/data/npc/normal-npc-samples.json`의 `selectionRules`이며, 기존 최상위 `required`는 저장된 정의 및 기존 파일럿과의 호환을 위해 그대로 지원한다.

```ts
selectionRules?: { required?: string[]; atLeastOneOf?: string[]; preferredLead?: string[]; preferredLast?: string[] }
```

- `required`: 에이스·기믹 carrier·기존 required와 합쳐 반드시 포함한다.
- `atLeastOneOf`: 지정한 단일 후보군에서 최소 한 마리를 포함한다. 빈 배열은 오류다.
- `preferredLead` / `preferredLast`: 이미 선출된 멤버만 이동한다. 배열 앞쪽이 우선순위다. 선출 확률이나 멤버를 바꾸지 않는다. 한 종을 두 배치 목록에 동시에 넣으면 오류다.
- 후보 조합 열거 → 필수 조건으로 가능한 조합 제한 → 기존 품질 가중치와 시드로 선출 → 기존 시드 셔플 → 선봉 이동 → 마지막 이동 순서다. 배치 규칙이 없으면 추가 난수를 소비하지 않는다.
- 후보에 없는 종, 중복/빈 목록, 알 수 없는 필드, 에이스·carrier를 합쳐 3마리를 넘는 필수 조건, 만족 불가능한 선택군을 원본 export와 런타임 로드 시 모두 거절한다. 최종 팀도 조건을 검증한다.
- preferredLast는 시작 팀의 세 번째 슬롯이다. 전투 중 AI의 교체·강제 교체로 실제 마지막 출전이 달라질 수 있다. 이를 막는 새 AI 규칙은 넣지 않았다.
- 기존 packed 팀은 수정하거나 재생성하지 않는다. retry는 기존 packed/seed/순서를 복사하고, reconnect와 replay는 저장된 스냅샷을 사용한다.

## 적용 목록 (16개 ID / 26개 템플릿)

| NPC / ID | stage | 규칙 | 이유 |
| --- | --- | --- | --- |
| 목호 / named-lance | first-gate | preferredLast: Dragonite | 기존 드래곤 에이스의 마무리 전술/보스 연출; 다른 두 슬롯의 시드 순서는 유지 |
| 목호 / named-lance | final-gate | preferredLast: Dragonite | 기존 드래곤 에이스의 마무리 전술/보스 연출; 다른 두 슬롯의 시드 순서는 유지 |
| 마적 / named-maxie | final-gate | preferredLead: Groudon | 기존 날씨 특성 시동자를 선봉으로 이동; 고정 3마리이므로 선출 강제 추가 불필요 |
| 난천 / named-cynthia | first-gate | preferredLast: Garchomp | 기존 드래곤 에이스의 마무리 전술/보스 연출; 다른 두 슬롯의 시드 순서는 유지 |
| 난천 / named-cynthia | final-gate | preferredLast: Garchomp | 기존 드래곤 에이스의 마무리 전술/보스 연출; 다른 두 슬롯의 시드 순서는 유지 |
| 테사 / named-geeta | first-gate | preferredLead: Glimmora; preferredLast: Kingambit | Toxic Debris 선봉과 Sucker Punch/강화 마무리 분리; 에이스 자동 마지막의 반례 |
| 테사 / named-geeta | final-gate | preferredLead: Glimmora; preferredLast: Kingambit | Toxic Debris 선봉과 Sucker Punch/강화 마무리 분리; 에이스 자동 마지막의 반례 |
| 규리 / named-jasmine | all | required: Steelix; atLeastOneOf: Metagross/Empoleon/Magnezone | Steelix+Skarmory+Bronzong 배제, 공격 동료 보장; Spikes 미사용 확인 후 선봉 강제는 제외 |
| 류옹 / named-pryce | all | preferredLead: Abomasnow | Snow Warning 보유자를 선출했을 때만 선봉; 필수 선출은 상성/후보 다양성 악화로 제외 |
| 미혜 / named-glacia | leaders-early | preferredLead: Abomasnow | 기존 날씨 특성 시동자를 선봉으로 이동; 고정 3마리이므로 선출 강제 추가 불필요 |
| 미혜 / named-glacia | leaders-late | preferredLead: Abomasnow | 기존 날씨 특성 시동자를 선봉으로 이동; 고정 3마리이므로 선출 강제 추가 불필요 |
| 윤진 / named-wallace | first-gate | preferredLast: Milotic | 기존 회복/지속력 Milotic을 마무리 선호; 비 시동자를 새로 가정하지 않음 |
| 윤진 / named-wallace | final-gate | preferredLast: Milotic | 기존 회복/지속력 Milotic을 마무리 선호; 비 시동자를 새로 가정하지 않음 |
| 아강 / named-archie | final-gate | preferredLead: Kyogre | 기존 날씨 특성 시동자를 선봉으로 이동; 고정 3마리이므로 선출 강제 추가 불필요 |
| 무청 / named-candice | leaders-early | preferredLead: Abomasnow | 기존 날씨 특성 시동자를 선봉으로 이동; 고정 3마리이므로 선출 강제 추가 불필요 |
| 무청 / named-candice | leaders-late | preferredLead: Abomasnow | 기존 날씨 특성 시동자를 선봉으로 이동; 고정 3마리이므로 선출 강제 추가 불필요 |
| 들국화 / named-bertha | leaders-early | preferredLead: Hippowdon | 기존 날씨 특성 시동자를 선봉으로 이동; 고정 3마리이므로 선출 강제 추가 불필요 |
| 들국화 / named-bertha | leaders-late | preferredLead: Hippowdon | 기존 날씨 특성 시동자를 선봉으로 이동; 고정 3마리이므로 선출 강제 추가 불필요 |
| 용식 / named-barry | first-gate | preferredLead: Empoleon | 실제 Stealth Rock 담당 Empoleon을 선봉으로 이동 |
| 용식 / named-barry | final-gate | preferredLead: Empoleon | 실제 Stealth Rock 담당 Empoleon을 선봉으로 이동 |
| 우르프 / named-wulfric | leaders-early | preferredLead: Abomasnow | 기존 날씨 특성 시동자를 선봉으로 이동; 고정 3마리이므로 선출 강제 추가 불필요 |
| 우르프 / named-wulfric | leaders-late | preferredLead: Abomasnow | 기존 날씨 특성 시동자를 선봉으로 이동; 고정 3마리이므로 선출 강제 추가 불필요 |
| 마쿠와 / named-gordie | leaders-early | preferredLead: Tyranitar | 기존 날씨 특성 시동자를 선봉으로 이동; 고정 3마리이므로 선출 강제 추가 불필요 |
| 마쿠와 / named-gordie | leaders-late | preferredLead: Tyranitar | 기존 날씨 특성 시동자를 선봉으로 이동; 고정 3마리이므로 선출 강제 추가 불필요 |
| 마적 / magma-boss-maxie | final-gate | preferredLead: Groudon | 기존 날씨 특성 시동자를 선봉으로 이동; 고정 3마리이므로 선출 강제 추가 불필요 |
| 아강 / aqua-boss-archie | final-gate | preferredLead: Kyogre | 기존 날씨 특성 시동자를 선봉으로 이동; 고정 3마리이므로 선출 강제 추가 불필요 |

## 적용하지 않은 주요 사례

- 비상·꼭두·이향·아폴로·비주기: 기존 필수 에이스와 후보 변화를 유지한다. 대표라는 이유만으로 마지막 슬롯을 지정하지 않는다.
- 호일·사도: 승률 이상만으로 임의의 공격수 고정을 추가하지 않는다. 관측된 상성/기술/기믹 문제는 밸런스 보고서에 기록한다.
- 윤진 관장: 실제 후보에 비 시동자가 없다. 왕구리·패리퍼를 새로 추가하거나 특성을 바꿔 비 파티로 만들지 않는다. 챔피언 윤진은 기존 회복/지속력 밀로틱을 마무리 선호로만 설정한다.
- 민지의 코터스는 White Smoke, 비상의 패리퍼는 Keen Eye다. 종 이름만 보고 Drought/Drizzle 파티로 분류하지 않는다.
- status/setup/pivot/bulk 포켓몬은 기술이 있다는 이유만으로 선봉/마지막을 지정하지 않는다. Trick Room 기술을 가진 검토 템플릿은 이번 점검에서 없었다.

## 대사

- 목호: “드래곤 조련사 목호! 자아, 간다!” — [한국어 대사 reference](https://d.namu.moe/w/목호).
- 레드(성도): “……………… ………………” — [HGSS 전투 전 대사](https://bulbapedia.bulbagarden.net/wiki/Red_(game)/Quotes).
- 레드(관동): “… …!” — 같은 reference의 레츠고 전투 전 대사.
- 카렌의 “강한 포켓몬…”은 전투 후 대사여서 제외했다. 비주기 등 나머지 한국어 전투 전 원문/맥락은 이번 검토에서 unverified로 남겨 생략했다. 창작 문장을 넣지 않았다.
- 기존 introduction 필드와 전투 시작 화면을 재사용한다. 빈 대사는 기존 등장 안내로 처리하며 새 대화 단계나 대기 시간을 추가하지 않는다.

## 전체 검토 목록

원본 311개 템플릿 / 163개 ID를 실제 기술·특성 기준으로 분류했다. 아래 분류는 컨셉의 존재를 나타내며 해당 AI가 성공적으로 운영한다는 뜻은 아니다. 조직 별칭·일반 조직원도 원본 범위에 포함한다.

<details><summary>전체 ID별 후보·컨셉·판단</summary>

| ID | 이름 | 컨셉 | 규칙 여부 | 판단 |
| --- | --- | --- | --- | --- |
| named-brock | 웅 | bulk/recovery | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-giovanni | 비주기 | status, pivot | 유지 | 기존 필수 에이스와 시드 변화 유지; 추가 필수 역할 근거 없음 |
| named-blue | 그린 | status, pivot, bulk/recovery | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-falkner | 비상 | status, pivot, bulk/recovery | 유지 | 기존 필수 에이스와 시드 변화 유지; 추가 필수 역할 근거 없음 |
| named-archer | 아폴로 | status, setup, pivot, bulk/recovery | 유지 | 기존 필수 에이스와 시드 변화 유지; 추가 필수 역할 근거 없음 |
| named-lance | 목호 | status, setup, bulk/recovery | 적용 | 기존 드래곤 에이스의 마무리 전술/보스 연출; 다른 두 슬롯의 시드 순서는 유지 |
| named-flannery | 민지 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-maxie | 마적 | weather, setup | 적용 | 기존 날씨 특성 시동자를 선봉으로 이동; 고정 3마리이므로 선출 강제 추가 불필요 |
| named-steven | 성호 | status, bulk/recovery | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-volkner | 전진 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-cyrus | 태홍 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-cynthia | 난천 | status, setup | 적용 | 기존 드래곤 에이스의 마무리 전술/보스 연출; 다른 두 슬롯의 시드 순서는 유지 |
| named-elesa | 카밀레 | status | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-ghetsis | 게치스 | status, pivot | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-alder | 노간주 | setup | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-valerie | 마슈 | setup | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-lysandre | 플라드리 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-diantha | 카르네 | status, setup | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-kiawe | 키아웨 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-lusamine | 루자미네 | bulk/recovery | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-kukui | 쿠쿠이 | pivot, bulk/recovery | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-nessa | 야청 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-rose | 로즈 | bulk/recovery | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-leon | 단델 | setup, pivot, bulk/recovery | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-iono | 모야모 | pivot | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-giacomo | 피냐 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-geeta | 테사 | hazard, setup | 적용 | Toxic Debris 선봉과 Sucker Punch/강화 마무리 분리; 에이스 자동 마지막의 반례 |
| named-bugsy | 호일 | status, setup, pivot, bulk/recovery | 유지 | 후반 약화는 조합·상성·행동·기믹을 함께 관찰; 조합 규칙으로 해결된다는 근거 없어 유지 |
| named-whitney | 꼭두 | status, setup, bulk/recovery | 유지 | 기존 필수 에이스와 시드 변화 유지; 추가 필수 역할 근거 없음 |
| named-morty | 유빈 | status, setup, bulk/recovery | 유지 | 기존 필수 에이스와 시드 변화 유지; 추가 필수 역할 근거 없음 |
| named-chuck | 사도 | setup, pivot | 유지 | 후반 약화는 조합·상성·행동·기믹을 함께 관찰; 조합 규칙으로 해결된다는 근거 없어 유지 |
| named-jasmine | 규리 | hazard, status, pivot, bulk/recovery | 적용 | Steelix+Skarmory+Bronzong 배제, 공격 동료 보장; Spikes 미사용 확인 후 선봉 강제는 제외 |
| named-pryce | 류옹 | weather, bulk/recovery | 적용 | Snow Warning 보유자를 선출했을 때만 선봉; 필수 선출은 상성/후보 다양성 악화로 제외 |
| named-clair | 이향 | status, setup, pivot, bulk/recovery | 유지 | 기존 필수 에이스와 시드 변화 유지; 추가 필수 역할 근거 없음 |
| named-will | 일목 | status, setup, bulk/recovery | 유지 | 기존 필수 에이스와 시드 변화 유지; 추가 필수 역할 근거 없음 |
| named-koga | 독수 | status, setup, pivot, bulk/recovery | 유지 | 기존 필수 에이스와 시드 변화 유지; 추가 필수 역할 근거 없음 |
| named-bruno | 시바 | setup | 유지 | 기존 필수 에이스와 시드 변화 유지; 추가 필수 역할 근거 없음 |
| named-karen | 카렌 | status, setup, bulk/recovery | 유지 | 기존 필수 에이스와 시드 변화 유지; 추가 필수 역할 근거 없음 |
| named-red | 레드 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-misty | 이슬 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-ltsurge | 마티스 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-erika | 민화 | status | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-koga-kanto | 독수 | status | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-sabrina | 초련 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-blaine | 강연 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-giovanni-gym | 비주기 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-lorelei | 칸나 | status | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-bruno-kanto | 시바 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-agatha | 국화 | status | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-lance-kanto | 목호 | pivot, bulk/recovery | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-red-kanto | 레드 | pivot, bulk/recovery | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-roxanne | 원규 | bulk/recovery | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-brawly | 철구 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-wattson | 암페어 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-norman | 종길 | status | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-winona | 은송 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-tateandliza | 풍&란 | setup | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-wallace-gym | 윤진 | 직접 공격 | 유지 | 실제 풀에 Drizzle/Rain Dance가 없어 비 파티를 가정하지 않음 |
| named-juan | 아단 | setup | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-sidney | 혁진 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-phoebe | 회연 | status | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-glacia | 미혜 | weather, status | 적용 | 기존 날씨 특성 시동자를 선봉으로 이동; 고정 3마리이므로 선출 강제 추가 불필요 |
| named-drake | 권수 | pivot | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-wallace | 윤진 | setup, bulk/recovery | 적용 | 기존 회복/지속력 Milotic을 마무리 선호; 비 시동자를 새로 가정하지 않음 |
| named-archie | 아강 | weather, setup | 적용 | 기존 날씨 특성 시동자를 선봉으로 이동; 고정 3마리이므로 선출 강제 추가 불필요 |
| named-roark | 강석 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-gardenia | 유채 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-maylene | 자두 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-crasherwake | 맥실러 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-fantina | 멜리사 | status | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-byron | 동관 | status, bulk/recovery | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-candice | 무청 | weather | 적용 | 기존 날씨 특성 시동자를 선봉으로 이동; 고정 3마리이므로 선출 강제 추가 불필요 |
| named-aaron | 충호 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-bertha | 들국화 | weather, bulk/recovery | 적용 | 기존 날씨 특성 시동자를 선봉으로 이동; 고정 3마리이므로 선출 강제 추가 불필요 |
| named-flint | 대엽 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-lucian | 오엽 | setup | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-barry | 용식 | hazard | 적용 | 실제 Stealth Rock 담당 Empoleon을 선봉으로 이동 |
| named-cilan | 덴트 | status | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-chili | 팟 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-cress | 콘 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-lenora | 알로에 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-burgh | 아티 | setup | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-clay | 야콘 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-skyla | 풍란 | status | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-brycen | 담죽 | status | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-drayden | 사간 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-cheren | 체렌 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-roxie | 보미카 | status | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-marlon | 시즈 | bulk/recovery | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-shauntal | 망초 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-marshal | 연무 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-grimsley | 블래리 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-caitlin | 카틀레야 | setup | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-iris | 아이리스 | setup | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-viola | 비올라 | status | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-grant | 자크로 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-korrina | 코르니 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-ramos | 후쿠지 | status, setup | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-clemont | 시트론 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-olympia | 고지카 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-wulfric | 우르프 | weather, bulk/recovery | 적용 | 기존 날씨 특성 시동자를 선봉으로 이동; 고정 3마리이므로 선출 강제 추가 불필요 |
| named-malva | 파키라 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-siebold | 즈미 | status | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-wikstrom | 간피 | bulk/recovery | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-drasna | 드라세나 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-serena | 세레나 | status, setup, pivot | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-ilima | 일리마 | status | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-lana | 수련 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-mallow | 마오 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-sophocles | 마마네 | pivot | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-acerola-captain | 아세로라 | status, setup | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-mina | 말리화 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-molayne | 멀레인 | status | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-olivia | 라이치 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-acerola | 아세로라 | status, setup | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-kahili | 카일리 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-hau | 하우 | setup | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-milo | 아킬 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-kabu | 순무 | status | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-bea | 채두 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-allister | 어니언 | status | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-opal | 포플러 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-gordie | 마쿠와 | weather | 적용 | 기존 날씨 특성 시동자를 선봉으로 이동; 고정 3마리이므로 선출 강제 추가 불필요 |
| named-melony | 멜론 | setup | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-piers | 두송 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-raihan | 금랑 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-marnie | 마리 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-hop | 호브 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-bede | 비트 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-raihan-cup | 금랑 | status | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-oleana | 올리브 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-katy | 단풍 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-brassius | 콜사 | status | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-kofu | 곤포 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-larry | 청목 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-ryme | 라임 | status | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-tulip | 리파 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-grusha | 그루샤 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-rika | 칠리 | status, bulk/recovery | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-poppy | 뽀삐 | status | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-larry-elite | 청목 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-hassel | 팔자크 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-nemona | 네모 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| named-penny | 모란 | pivot | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| magma-executive-tabitha | 호걸 | status | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| magma-boss-maxie | 마적 | weather, setup | 적용 | 기존 날씨 특성 시동자를 선봉으로 이동; 고정 3마리이므로 선출 강제 추가 불필요 |
| galactic-executive-mars | 마스 | status | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| galactic-boss-cyrus | 태홍 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| plasma-executive-zinzolin | 칠현인 비오 | status | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| plasma-boss-ghetsis | 게치스 | status, pivot | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| flare-executive-xerosic | 크세로시키 | status | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| flare-boss-lysandre | 플라드리 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| skull-executive-plumeria | 플루메리 | status | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| skull-boss-guzma | 구즈마 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| aqua-executive-matt | 해조 | status | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| aqua-boss-archie | 아강 | weather, setup | 적용 | 기존 날씨 특성 시동자를 선봉으로 이동; 고정 3마리이므로 선출 강제 추가 불필요 |
| aether-executive-faba | 자우보 | status | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| aether-boss-lusamine | 루자미네 | bulk/recovery | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| macrocosmos-executive-oleana | 올리브 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| macrocosmos-boss-rose | 로즈 | bulk/recovery | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| star-executive-giacomo | 피냐 | 직접 공격 | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| star-boss-penny | 모란 | pivot | 유지 | 고정 3마리로 조합 붕괴 없음; 에이스 자동 마지막 배치 금지 |
| rocket-grunt |  | status, pivot, bulk/recovery | 유지 | 기존 필수 에이스와 시드 변화 유지; 추가 필수 역할 근거 없음 |

</details>
