# Raid Boss 20종 초기 등록

기존 한카리아스·뮤츠를 포함해 총 20종을 기존 Raid 풀에 등록했다. 초기 HP 데이터만 추가했으며 새로운 Raid 공격·방어·스피드 배율, 추가 Phase 랭크 버프, AI 변경이나 승률 튜닝은 하지 않았다.

| Boss | HP Multiplier | Phases | Forms | Abilities | Moves Valid | Transformation | Test |
|---|---:|---:|---|---|---|---|---|
| Garchomp | 2 | 2 | Garchomp → Garchomp-Mega | Rough Skin / Sand Force | 4/Phase · 합법 | none / mega | Phase·실전·Replay 통과 |
| Mewtwo | 3 | 3 | Mewtwo → Mewtwo-Mega-X → Mewtwo-Mega-X<br>Mewtwo → Mewtwo-Mega-Y → Mewtwo-Mega-Y | Pressure / Steadfast / Insomnia | 4/Phase · 합법 | none / mega / aura | Phase·실전·Replay 통과 |
| Metagross | 2.2 | 2 | Metagross → Metagross-Mega | Clear Body / Tough Claws | 4/Phase · 합법 | form / mega | Phase·실전·Replay 통과 |
| Palafin | 2 | 2 | Palafin → Palafin-Hero | Zero to Hero | 4/Phase · 합법 | form | Phase·실전·Replay 통과 |
| Snorlax | 2.3 | 2 | Snorlax → Snorlax-Gmax | Thick Fat | 4/Phase · 합법 | form / gigantamax | Phase·실전·Replay 통과 |
| Hoopa | 2.2 | 2 | Hoopa → Hoopa-Unbound | Magician | 4/Phase · 합법 | form | Phase·실전·Replay 통과 |
| Shaymin | 2 | 2 | Shaymin → Shaymin-Sky | Natural Cure / Serene Grace | 4/Phase · 합법 | form | Phase·실전·Replay 통과 |
| Volcarona | 2.2 | 2 | Volcarona → Slither Wing<br>Volcarona → Iron Moth | Flame Body / Protosynthesis / Quark Drive | 4/Phase · 합법 | form / replacement | Phase·실전·Replay 통과 |
| Ogerpon | 2.8 | 4 | Ogerpon → Ogerpon-Wellspring → Ogerpon-Cornerstone → Ogerpon-Hearthflame | Defiant / Water Absorb / Sturdy / Mold Breaker | 4/Phase · 합법 | form | Phase·실전·Replay 통과 |
| Diancie | 2.2 | 2 | Diancie → Diancie-Mega | Clear Body / Magic Bounce | 4/Phase · 합법 | form / mega | Phase·실전·Replay 통과 |
| Groudon | 2.6 | 2 | Groudon → Groudon-Primal | Drought / Desolate Land | 4/Phase · 합법 | form / primal | Phase·실전·Replay 통과 |
| Kyogre | 2.6 | 2 | Kyogre → Kyogre-Primal | Drizzle / Primordial Sea | 4/Phase · 합법 | form / primal | Phase·실전·Replay 통과 |
| Rayquaza | 2.6 | 2 | Rayquaza → Rayquaza-Mega | Air Lock / Delta Stream | 4/Phase · 합법 | form / mega | Phase·실전·Replay 통과 |
| Arceus | 3 | 3 | Normal → 17 Plate 중 서로 다른 2타입 | Multitype | 4/Phase · 합법 | form | Phase·실전·Replay 통과 |
| Kyurem | 2.5 | 2 | Kyurem → Kyurem-Black<br>Kyurem → Kyurem-White | Pressure / Teravolt / Turboblaze | 4/Phase · 합법 | form | Phase·실전·Replay 통과 |
| Zygarde | 3 | 3 | Zygarde → Zygarde-Complete → Zygarde-Mega | Aura Break / Power Construct | 4/Phase · 합법 | form / mega | Phase·실전·Replay 통과 |
| Necrozma | 3 | 3 | Necrozma → Necrozma-Dusk-Mane → Necrozma-Ultra<br>Necrozma → Necrozma-Dawn-Wings → Necrozma-Ultra | Prism Armor / Neuroforce | 4/Phase · 합법 | form / ultraBurst | Phase·실전·Replay 통과 |
| Zacian | 2.5 | 2 | Zacian → Zacian-Crowned | Intrepid Sword | 4/Phase · 합법 | form | Phase·실전·Replay 통과 |
| Zamazenta | 2.5 | 2 | Zamazenta → Zamazenta-Crowned | Dauntless Shield | 4/Phase · 합법 | form | Phase·실전·Replay 통과 |
| Terapagos | 2.8 | 2 | Terapagos-Terastal → Terapagos-Stellar | Tera Shell / Teraform Zero | 4/Phase · 합법 | form / stellar | Phase·실전·Replay 통과 |

한카리아스는 2 × 50%씩, 뮤츠는 3 × 1/3씩으로 기존 각 Phase의 native 전체 HP를 정확히 보존했다. 기존 기술·특성·분기·메시지와 뮤츠의 마지막 aura 버프도 유지했다. 새 보스에는 별도 랭크 버프가 없다. 자시안/자마젠타 등의 고유 특성 효과는 native 처리다.

## 등록·랜덤 분기

- 기존 등장 조건, 선택 화면, 보상·영입·재도전 경로를 사용한다. 기존 패턴대로 일반 보스 weight 80, 그 외 20이며 새 해금 체계는 없다.
- Volcarona, Kyurem, Necrozma는 기존 route 추첨을 재사용한다. Arceus는 데이터의 randomBranch에서 서로 다른 플레이트 2개를 선택한다. 모두 스냅샷 생성 시 한 번 저장하고 retry/reload/replay에서 다시 뽑지 않는다.
- Volcarona의 Paradox 경로는 명시적인 replacement다. 일반 form의 같은 종 검증은 유지한다. Necrozma Ultra의 sourceSpecies는 선택한 P2 융합체와 일치한다.
- Plate/Mask/Crowned 장비는 기존 폼 도구 메타데이터를 재사용하며 전투 슬롯에만 제공한다. 상점·배낭·플레이어 소유 도구를 변경하지 않는다.

## 기술 선택·교체

요청 후보 중 불법/미존재 기술로 인한 교체는 없다. 모든 Phase와 아르세우스의 모든 17개 후보를 설치된 Dex의 검증기로 확인했다. 카이오가 P2의 선택 후보는 특수 바위 견제기 Ancient Power, 화이트큐레무는 Dragon Pulse, 지가르데 Mega의 네 번째 기술도 Dragon Pulse를 선택했다. 지가르데 Complete 특성 Power Construct와 Mega 특성 Aura Break는 설치된 Dex 값 그대로다.

## HP 계산과 비율 차이

`phaseBaseHP = max(1, round(현재 폼 native 기본 HP × raidHpMultiplier × hpRatio))`이며 Max HP는 native Dynamax HP 비율을 유지한다. 일반 폼은 Max HP = phaseBaseHP다. 소수 HP는 가장 가까운 정수로 반올림한다.

**hpRatio는 폼별 native HP에 적용하는 할당 계수다. 실제 전체 보스 HP에서 차지하는 비중과 항상 같지는 않다.** 기존 Adapter의 native 폼 HP와 거다이맥스 2배 처리를 임의로 상쇄하지 않았다. 따라서 지가르데 Complete/Mega, 테라파고스 Stellar, 잠만보 G-Max의 실질 비중이 요청 비율과 달라진다. 아래 차이는 후속 HP 밸런싱에서 명시적으로 결정할 대상이다.

### Zygarde — floor 2, 고정 난수 0.5

| Phase | HP 종족값 | native 기본 HP | native Max HP | HP 배율 × 비율 | 최종 Max HP | 실질 비중 |
|---|---:|---:|---:|---|---:|---:|
| 1 Zygarde | 108 | 187 | 187 | 3 × 0.34 | 191 | 24.65% |
| 2 Zygarde-Complete | 216 | 295 | 295 | 3 × 0.33 | 292 | 37.68% |
| 3 Zygarde-Mega | 216 | 295 | 295 | 3 × 0.33 | 292 | 37.68% |
합계 775 HP. 실제 완료 전투의 보스 요청에서 동일한 Max HP를 읽었고 리플레이도 일치했다.

### Snorlax — floor 2, 고정 난수 0.5

| Phase | HP 종족값 | native 기본 HP | native Max HP | HP 배율 × 비율 | 최종 Max HP | 실질 비중 |
|---|---:|---:|---:|---|---:|---:|
| 1 Snorlax | 160 | 239 | 239 | 2.3 × 0.45 | 247 | 29.02% |
| 2 Snorlax-Gmax | 160 | 239 | 478 | 2.3 × 0.55 | 604 | 70.98% |
합계 851 HP. 실제 완료 전투의 보스 요청에서 동일한 Max HP를 읽었고 리플레이도 일치했다.

### Terapagos — floor 2, 고정 난수 0.5

| Phase | HP 종족값 | native 기본 HP | native Max HP | HP 배율 × 비율 | 최종 Max HP | 실질 비중 |
|---|---:|---:|---:|---|---:|---:|
| 1 Terapagos-Terastal | 95 | 174 | 174 | 2.8 × 0.55 | 268 | 47.10% |
| 2 Terapagos-Stellar | 160 | 239 | 239 | 2.8 × 0.45 | 301 | 52.90% |
합계 569 HP. 실제 완료 전투의 보스 요청에서 동일한 Max HP를 읽었고 리플레이도 일치했다.

## 변경 파일

- `src/data/raid-bosses.ts`: 신규 18종과 경로·HP·기술·변신 데이터. 기존 두 보스는 `src/data/raids.ts`에 유지.
- `src/server/raid-phases.ts`, `raid-events.ts`: 생성 시 랜덤 분기 해소·저장 및 실제 Phase 장비 패킹.
- `src/battle/raid-hp.ts`, `raid.ts`, `run.ts`: HP 할당 검증·적용과 저장된 Phase 아이템 일치 검증.
- `src/battle/raid-transformation.ts`: 기존 Adapter에 replacement/장비/native 입장 플래그 및 G-Max의 비기본 특성 지원만 보완.
- `src/data/pokemon-catalog.ts`: Hero/Complete/Terastal/Stellar의 구분되는 한국어 표시명.
- `tests/raid-roster.test.ts`, `e2e/raid-roster.spec.ts`: 전체 경로의 기술·폼·스탯·HP·스프라이트·지속 상태·랜덤 저장·재생·브라우저 검증.
- 기존 Raid 테스트의 generic fixture에서 HP 메타데이터를 분리하고 legacy 연출 fixture를 기존 두 보스로 한정했다. 공용 run.ts 변경에 필요한 과거 보존 해시만 갱신했으며 NPC 데이터/AI는 유지했다.

## 검증 결과

- 전체 Node 테스트: **1292건 중 1289 통과, 3 실패**. 실패는 기존 tests/paldea-round2.test.ts의 네 빌드 필드 보존·조건부 packed-team 변형·Toxic Spikes 후보 fixture 불일치다. 해당 데이터와 테스트는 이번 작업에서 변경하지 않았다.
- Raid 집중 회귀: **108/108 통과**. 신규 명단 검사 53건을 포함한다. 실제 가중치 풀에서 20종 모두 도달 가능하며 네 랜덤 보스의 디스크 재열기와 재도전에서도 스냅샷이 일치한다.
- Chrome E2E: **15/15 통과**. 신규 4종의 데스크톱·모바일 Phase/상태/스프라이트/재접속과 기존 2종의 영입·보상 흐름을 포함한다.
- TypeScript, 최신 프로덕션 빌드, CSS 구조 검사 통과. Windows 빌드는 junction 권한이 있는 승인된 실행을 사용했다.
- Workspace 검사는 수정하지 않은 기존 보고 스크립트 15개의 docs 출력 경로 경고가 남아 있다.
- 원시 로그: .data/raid-roster-full-tests.log, .data/raid-roster-final-regression.log. [검증 요약](raid-roster-validation.json).

## 남은 문제

현재 확인된 Raid 플레이 차단 문제는 없다. HP/Phase 실질 비율 차이는 위 표에 공개했으며 초기값을 승률에 맞춰 재조정하지 않았다. 기존 무버전/무 HP 메타데이터 스냅샷은 기존 경로를 유지한다. 최종 승률 측정과 조정은 별도 단계다.

기계 판독용 전체 Phase/기술/HP 데이터: [raid-roster-data.json](raid-roster-data.json).
