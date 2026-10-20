# Raid HP threshold migration

기준: `f3976bfee1f097e33bf00c4374c86b8709827b36`. 새 보스나 반복 밸런스 조정 없이 20종의 HP 구조를 이식했다.

## 전투 동작

종전에는 `raidHpMultiplier`를 곱한 별도 Phase HP pool을 순서대로 소모했다. 신규 `hpMode: threshold-v1`은 같은 개체가 native HP 100%로 시작한다. `hpRatio`는 전체 바의 interval이며 이후 interval 합이 현재 Phase의 종료 threshold다. 두 Phase는 50%, 세 Phase는 기존 .34/.33/.33 또는 Mewtwo의 thirds, 네 Phase는 75/50/25%를 사용한다.

`src/battle/raid-threshold.ts`가 실제 Pokemon damage와 직접 faint 효과를 경계에서 막는다. 70% HP에 40% 피해가 들어오고 경계가 50%라면 50%에서 멈춘다. 다단 공격·반동을 포함한 action 전체가 끝난 후 한 번 전환하므로 초과 피해나 남은 타격이 다음 Phase를 건너뛰지 못한다. 마지막 Phase에서만 정상 KO한다. 이미 선택된 같은 턴의 행동은 유지한다.

폼 전환은 같은 Pokemon의 상태·랭크·volatile을 이어가며 해당 Phase의 기존 장비·기술·특성·변신을 적용한다. 새 native Max HP에 이전 현재 HP 비율을 반올림해 적용한다. Mega/Primal에서 Max HP가 같으면 회복하지 않는다. G-Max의 실제 HP 2배, Complete Zygarde와 Stellar Terapagos의 실제 종족 HP 차이만 반영한다. Mewtwo P3의 기존 공격 계열+1/Speed+1 Aura도 유지한다.

Volcarona만 `replacement-v1`이다. P1 168 HP를 끝까지 KO한 뒤 저장된 Slither Wing 또는 Iron Moth가 각자의 정상 native HP 100%로 입장한다. 실제 P2 보상 정책도 이어진다. Hoopa 추가 상향은 없다.

새 스냅샷에는 legacy multiplier를 저장하지 않는다. hpMode가 없는 기존 스냅샷은 원래 multiplier/별도 pool 동작을 그대로 사용하므로 기존 replay/retry/reload의 의미를 바꾸지 않는다. 등록 데이터의 multiplier는 legacy 참고값으로 남긴다.

전환용 synthetic switch에는 `[raid-threshold]`를 붙여 public ranks와 화면의 G-Max/Tera 플래그를 보존한다. HP바 회복 연출은 발생시키지 않는다.

## 변경 범위

- `src/data/raids.ts`, `src/data/raid-bosses.ts`: HP mode와 interval 정의.
- `src/battle/raid-hp.ts`, `raid-threshold.ts`, `raid.ts`, `raid-transformation.ts`: 검증, clamp, native resize, legacy 분기.
- `src/server/raid-events.ts`: 신규 mode를 스냅샷에 저장.
- `src/server/battle-session.ts`, `src/web/battle-presentation.ts`, `src/battle/public-field.ts`: 전환 시 표시·랭크 보존.
- `scripts/lib/raid-simulation.ts`: Phase 최대 HP와 interval budget을 별도로 측정.
- `scripts/simulate-raids.ts`, `scripts/simulate-raid-threshold.ts`: 기존 시뮬 엔진/worker를 재사용하는 Endgame 비교 실행기.

기준 커밋의 20종 데이터와 비교해 HP 관련 필드 외 데이터가 같음을 확인했다. 보상·등장층·weight·상점·일반 NPC·성장·팀·플레이어 policy·보스 기술/특성/AI는 변경하지 않았다. 테스트의 승리 정산 fixture만 새 HP 구조에서도 이기는 합법 파티로 교체했다.

## 측정과 검증

`npm run raid:simulate:threshold -- --runs 500`으로 20종 × 500전 = 10,000전, 보스별 85/95층 각 250전을 실행한다. 이전 Endgame과 seed·팀·층·분기·기본 HP가 10,000건 모두 일치한다. 이후 전투 RNG 소비는 달라질 수 있다. 동일 설정을 두 번 실행한 raw CSV SHA256은 모두 `4cce60f711e0870ad514bda7e9b839de947b722db945c814c130291f6db526b8`이다.

기존 보고서 19개의 해시가 유지됐고 새 report의 모든 source manifest 해시가 현재 파일과 일치한다. 모든 관측 Phase Max HP가 native 계산값과 일치하고 모든 전투의 interval 합이 Effective HP와 일치한다. 승패·Phase loss·분기 집계도 검증했다.

- Threshold, multi-hit, native Mega/G-Max/Zygarde/Terapagos, Mewtwo Aura, Ogerpon 4단계, Volcarona replacement, legacy/reward/replay/retry/reload 등을 포함한 집중 테스트: **148/148 통과**.
- 추가 mechanics 및 rank reward 회귀: **54/54 통과**.
- TypeScript와 production build: 통과.
- 브라우저 Raid 경로 19개: 첫 실행 17개 통과. Snorlax PC/모바일 2개에서 전환 후 G-Max 표시 문제가 있어 수정했고 두 실패 사례를 재실행해 통과했다.
- 전체 테스트: **1,338개 중 1,334개 통과, 4개 실패**. 기존 Paldea round2의 Expert Belt/Stone Edge/Toxic Spikes fixture 불일치 3개와 rank reward random-stream 비교 1개다. rank reward는 첫 전체 실행과 이후 개별 재실행에서 통과했다. 관련 NPC/보상 로직은 범위 밖이므로 변경하지 않았다. 마지막 UI 회귀 테스트 1개는 전체 실행 뒤 추가됐으며 위 집중 148개에 포함된다.

전체 실행의 실패 테스트명:

1. `Paldea round 2 changes exactly the four requested build fields; Poppy and every other NPC are preserved`
2. `conditional variants alter only their packed team copies and never modify live Expert Belt / Stone Edge builds`
3. `Toxic Spikes candidate really poisons a grounded entry and is removed by Poison entry`
4. `production snapshots every rank reward without changing the original sample/rank/team random stream`

## 결과 해석

전체 20종의 표, native Phase 최대 HP/interval, 분기와 Phase별 패배는 [측정 보고서](../../experiments/balance/raid-threshold-endgame.md), 기계 검증 결과는 [validation JSON](../../experiments/balance/raid-threshold-endgame.validation.json)에 있다.

Snorlax는 기본 243 → G-Max 486으로 바뀌지만 총 interval은 121+244=365 HP, **1.50x**다. Zygarde는 191 → 299 → 299에서 65+98+99=262 HP, **1.37x**다. Terapagos는 기본종 173, 입장 Terastal 178 → Stellar 243에서 89+122=211 HP, **1.22x**다. 나머지 같은-HP 폼은 **1.00x**이고 Volcarona는 두 별도 종을 합해 평균 **1.99x**다. 회복과 경계에서 버린 초과 피해는 Effective HP budget에 포함하지 않는다.

85% 초과는 없다. 40% 미만은 Mewtwo, Zacian, Kyogre, Rayquaza, Groudon, Arceus, Terapagos, Shaymin의 8종이다. 상호 배타적인 랜덤 route 격차 15pp 초과는 Volcarona **30.45pp**다. Slither Wing은 72.20% → 75.68%, Iron Moth는 39.42% → 45.23%다. Arceus 타입 presence도 Electric 13.11%와 Fighting 37.50% 사이 **24.39pp** 차이가 있지만, 한 전투에 두 타입이 포함된 중복 표본(타입당 46~73건)이므로 독립 route 비교와 구분한다.

요청대로 이 첫 측정 결과를 그대로 남겼으며 목표 승률에 맞춘 후속 조정은 하지 않았다.
