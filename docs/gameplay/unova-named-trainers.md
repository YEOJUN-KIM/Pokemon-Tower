# 하나지방 필수 NPC 샘플

2026-10-18. **하나지방 필수 NPC 샘플 완료**. 관장 13명, 사천왕 4명, 강자 노간주, 챔피언 아이리스, 플라스마 조직원·비오·아크로마·게치스, 히든보스 N: 총 24종.

## 구현 범위와 데이터

기존 21종 수정, 공용 조무래기 runtime·아크로마·N 3종 신규. 24종 + named-ghetsis 별칭, N의 2단계가 합쳐져 신설/교체 runtime은 26행이다. 전체 runtime은 255행이다. 검토 원본은 `scripts/data/npc/normal-npc-samples.json`, 생성기는 `scripts/review-unova-npc-samples.ts`, 메타데이터는 `src/data/unova-trainers.ts`다. export 결과인 `src/data/normal-npc-templates.json`을 직접 편집하지 않는다.

아이리스는 Champion 버전만 존재한다. 벨·라이벌 체렌·Shadow Triad·칠현인 개별 전투·기타 특수 조우는 추가하지 않았다. 공통 AI/v12·선출기·층별 성장·기믹 엔진·히든보스 엔진은 수정하지 않았다. 개별 하나지방 기믹 배정 데이터만 제거했다.

## 실제 사용과 타워 확장

[PWT Unova](https://bulbapedia.bulbagarden.net/wiki/World_Leaders_Tournament/Unova), [BW 관장/리그](https://pokemondb.net/black-white/gymleaders-elitefour), [BW2 관장/리그](https://www.serebii.net/black2white2/elitefour.shtml), [N](https://bulbapedia.bulbagarden.net/wiki/N), [Zinzolin](https://bulbapedia.bulbagarden.net/wiki/Zinzolin), [Colress](https://bulbapedia.bulbagarden.net/wiki/Colress), [Ghetsis](https://bulbapedia.bulbagarden.net/wiki/Ghetsis).

아래 공식 사용 확인은 BW/BW2/PWT에서 확인한 보수적 부분집합이다. 확인하지 못한 후보는 “요청 기반 확장/개별 사용 이력 미확정”으로 표시하며 본가 소유라고 주장하지 않는다. 세트는 현대화한 타워 세트로 원작 exact set 복제가 아니다. 절각참은 collectible 제한으로 대도각참(Kingambit), 골뱃은 크로뱃으로 대체했다. 아크로마의 기본 Rotom은 원작 Rotom 계열을 단일 기본 폼으로 표현한 타워 적용이다. N·아크로마 이미지와 출처/해시는 `public/sprites/trainers/sources.json`에 등록했다.

## Power Tier와 조우 연결

관장 Gym/Upper Gym, 사천왕 Elite Four, 노간주 Elite Four+, 아이리스 Champion, 비오 Upper Gym/Lower Elite Four, 아크로마 Elite Four/Lower Champion, 게치스 Champion+, N Hidden Boss/Champion+다. 일반 관장·사천왕·노간주·비오는 Tactical ceiling, 아이리스·아크로마·게치스·N은 Expert, 조직원은 기존 Basic→Tactical이다. 기본 IV/points 상한 66과 층별 곡선을 사용한다.

하나지방 기존 elite 슬롯 추첨 풀에 사천왕 4명과 강자 노간주를 등록했다. 한 챕터에서 이 5명 중 4명을 추첨하며 관장도 기존 방식대로 13명 중 일부를 추첨한다. 50·100층 챔피언은 아이리스이며 승리 후 기존 guaranteed hidden-boss 이벤트로 N이 등장한다. N은 일반 NPC·legacy 무테마 랜덤 네임드·플라스마 조직원/간부/보스 풀에서 제외된다. 새 variant/AI/selection rule은 없다.

### N의 Hidden Boss integration

Pokémon Black의 N과 맞는 제크로무를 단일 대표 전설로 선택했다. 기존 자산을 사용하며 물리 Dragon/Electric 전설 축이 특수 Dark/Dragon 게치스와 구분된다. 전설이 금지되는 50층에서는 비전설 5후보/Zoroark 에이스, 100층에서는 원작 동료 5마리와 Zekrom을 사용한다. 이 차이는 기존 first-gate/final-gate와 75층 전설 제한을 사용한 것이며 새 버전 분기 시스템이 아니다. N의 설계상 대표 에이스는 Zekrom이다.

실제 서버 통합에서 아이리스 승리 → N 이벤트 생성 → HP/PP 회복 → 동일 층 stage=1 배틀 → 보상 → 51층/클리어를 확인했다. 재접속·패배·재도전도 상대/seed/snapshot을 보존한다. 브라우저에서는 N의 자동 조우 연출과 50·100층 팀의 전설 포함 여부까지 검증한다.

## Dead-slot 검토와 소규모 수정

- Sleep Powder/Hypnosis/Reflect/Light Screen/Stealth Rock/Spikes/Pain Split/Morning Sun/Yawn/Healing Wish/Shift Gear/Curse/Protect 등 현재 scorer가 다루지 않는 변화기는 넣지 않았다. 사용되는 변화기는 Toxic/Thunder Wave/Will-O-Wisp/Leech Seed, 지원되는 setup/recovery와 조건부 Destiny Bond다.
- 초기 Zebstrika의 Volt Switch 0회: 더 높은 Thunderbolt 점수가 피벗 선택을 가렸다. Thunderbolt→Thunder Wave로 교체했다. 중복 전기 공격에 묻히던 일부 Volt Switch는 별도 견제/상태기로, Rotom은 Volt Switch를 주 전기 기술로 정리했다.
- 반복 0회였던 Return은 실제 요청 라벨이 Return 102가 되면서 현 AI가 낮게 평가함을 real battle observation에서 확인했다. Watchog→Retaliate, Stoutland→Facade, Braviary→Body Slam, Klinklang→Giga Impact로 교체했다. 공통 기술명/AI 처리는 수정하지 않았다.
- Cryogonal의 Ice Beam/Freeze-Dry는 현 일반 타입 점수에서 중복된다. Freeze-Dry를 주 얼음 기술로 남기고 Water Pulse를 견제로 사용한다. Vanilluxe는 중복 Freeze-Dry를 Water Pulse로 교체했다. Lapras의 Freeze-Dry는 유일한 주 얼음 기술로 유지한다.
- 0회 사용은 전부 실패로 판정하지 않았다. 실제 선출/행동 기회, 상성, 우선기·상태·회복의 조건, Choice lock을 구분했다. 코드상 지원되는 조건부 기술은 남겨 정체성을 보존한다. 후보/기술별 실행 횟수와 0회 목록은 audit JSON의 usage에 있다.
- Trick Room 사용 NPC = **0명**. 최종 named gimmick available=0, used=0.

## 측정 조건과 Before → After

Four fixed benchmark teams: starters=Charizard/Blastoise/Venusaur, offense=Garchomp/Metagross/Lapras, bulk=Slowbro/Corviknight/Gastrodon, signature=Mimikyu/Kommo-o/Gyarados. 집중 2 seeds×2 floors×4 teams×6 rules. 관장/사천왕/노간주/아이리스/간부 F45/F95, 게치스 F76/F96, N F50/F100. 추가 커버리지 seeds 3~10/basic, 위계 비교 seeds 3~6/6 rules. fresh-HP 단판으로 사람 승률·경제·연속 생존·완주율을 측정하지 않는다.

집중 Before 76.3% (1539/2016) → After 60.4% (1392/2304). 신규 3종 때문에 총계의 표본 구성이 다르므로 동등 비교는 NPC별 표를 사용한다. 추가 커버리지 1536전, 위계 검사 960전, 오류 0.
경로 1~100층 전체: Before 79.6% (1911/2400) → After 76.1% (1826/2400). N의 추가 2관문은 별도 35.4% (17/48).
최종 경로는 현재 일반 NPC rank 선택/generateNpcEncounter·실제 named route·Tera/아이템 기믹·최근 트레이너 회피를 사용한다. 조직 특수 조우는 focused와 기존 villainEncounter/E2E snapshot으로 별도 검사한다. 초기 legacy-style route probe는 initial/에만 보관하며 최종 수치에 쓰지 않는다. baseline runtime과 metadata overlay를 함께 로드해 변경 전 조우/AI/기믹을 재현했다.

| NPC | 전반 Before | 전반 After | 후반 Before | 후반 After |
|---|---|---|---|---|
| 덴트 | 77.1% (37/48) | 75.0% (36/48) | 83.3% (40/48) | 77.1% (37/48) |
| 팟 | 68.8% (33/48) | 64.6% (31/48) | 93.8% (45/48) | 70.8% (34/48) |
| 콘 | 68.8% (33/48) | 43.8% (21/48) | 87.5% (42/48) | 45.8% (22/48) |
| 알로에 | 91.7% (44/48) | 68.8% (33/48) | 93.8% (45/48) | 85.4% (41/48) |
| 아티 | 87.5% (42/48) | 35.4% (17/48) | 77.1% (37/48) | 60.4% (29/48) |
| 카밀레 | 70.8% (34/48) | 58.3% (28/48) | 93.8% (45/48) | 58.3% (28/48) |
| 야콘 | 83.3% (40/48) | 47.9% (23/48) | 100.0% (48/48) | 75.0% (36/48) |
| 풍란 | 85.4% (41/48) | 60.4% (29/48) | 70.8% (34/48) | 58.3% (28/48) |
| 담죽 | 70.8% (34/48) | 37.5% (18/48) | 70.8% (34/48) | 56.3% (27/48) |
| 사간 | 37.5% (18/48) | 47.9% (23/48) | 43.8% (21/48) | 81.3% (39/48) |
| 체렌 | 54.2% (26/48) | 66.7% (32/48) | 64.6% (31/48) | 64.6% (31/48) |
| 보미카 | 93.8% (45/48) | 68.8% (33/48) | 66.7% (32/48) | 83.3% (40/48) |
| 시즈 | 75.0% (36/48) | 75.0% (36/48) | 58.3% (28/48) | 56.3% (27/48) |
| 망초 | 87.5% (42/48) | 39.6% (19/48) | 83.3% (40/48) | 43.8% (21/48) |
| 연무 | 100.0% (48/48) | 75.0% (36/48) | 100.0% (48/48) | 75.0% (36/48) |
| 블래리 | 89.6% (43/48) | 64.6% (31/48) | 70.8% (34/48) | 64.6% (31/48) |
| 카틀레야 | 79.2% (38/48) | 52.1% (25/48) | 93.8% (45/48) | 54.2% (26/48) |
| 노간주 | 75.0% (36/48) | 58.3% (28/48) | 87.5% (42/48) | 66.7% (32/48) |
| 아이리스 | 31.3% (15/48) | 60.4% (29/48) | 81.3% (39/48) | 72.9% (35/48) |
| 플라스마단 조직원 | 신규: Before 없음 | 79.2% (38/48) | 신규: Before 없음 | 64.6% (31/48) |
| 비오 | 87.5% (42/48) | 60.4% (29/48) | 85.4% (41/48) | 45.8% (22/48) |
| 아크로마 | 신규: Before 없음 | 60.4% (29/48) | 신규: Before 없음 | 56.3% (27/48) |
| 게치스 | 45.8% (22/48) | 52.1% (25/48) | 39.6% (19/48) | 43.8% (21/48) |
| N | 신규: Before 없음 | 37.5% (18/48) | 신규: Before 없음 | 50.0% (24/48) |

## Benchmark별 최종 집중 결과

| NPC | starters | offense | bulk | signature |
|---|---|---|---|---|
| 덴트 | 100.0% (24/24) | 100.0% (24/24) | 20.8% (5/24) | 83.3% (20/24) |
| 팟 | 70.8% (17/24) | 100.0% (24/24) | 12.5% (3/24) | 87.5% (21/24) |
| 콘 | 29.2% (7/24) | 54.2% (13/24) | 20.8% (5/24) | 75.0% (18/24) |
| 알로에 | 79.2% (19/24) | 100.0% (24/24) | 29.2% (7/24) | 100.0% (24/24) |
| 아티 | 45.8% (11/24) | 62.5% (15/24) | 12.5% (3/24) | 70.8% (17/24) |
| 카밀레 | 54.2% (13/24) | 79.2% (19/24) | 25.0% (6/24) | 75.0% (18/24) |
| 야콘 | 75.0% (18/24) | 37.5% (9/24) | 41.7% (10/24) | 91.7% (22/24) |
| 풍란 | 37.5% (9/24) | 100.0% (24/24) | 45.8% (11/24) | 54.2% (13/24) |
| 담죽 | 45.8% (11/24) | 25.0% (6/24) | 37.5% (9/24) | 79.2% (19/24) |
| 사간 | 54.2% (13/24) | 66.7% (16/24) | 62.5% (15/24) | 75.0% (18/24) |
| 체렌 | 66.7% (16/24) | 100.0% (24/24) | 8.3% (2/24) | 87.5% (21/24) |
| 보미카 | 66.7% (16/24) | 91.7% (22/24) | 70.8% (17/24) | 75.0% (18/24) |
| 시즈 | 75.0% (18/24) | 91.7% (22/24) | 4.2% (1/24) | 91.7% (22/24) |
| 망초 | 37.5% (9/24) | 37.5% (9/24) | 4.2% (1/24) | 87.5% (21/24) |
| 연무 | 75.0% (18/24) | 79.2% (19/24) | 54.2% (13/24) | 91.7% (22/24) |
| 블래리 | 58.3% (14/24) | 87.5% (21/24) | 12.5% (3/24) | 100.0% (24/24) |
| 카틀레야 | 41.7% (10/24) | 79.2% (19/24) | 4.2% (1/24) | 87.5% (21/24) |
| 노간주 | 62.5% (15/24) | 83.3% (20/24) | 12.5% (3/24) | 91.7% (22/24) |
| 아이리스 | 37.5% (9/24) | 79.2% (19/24) | 75.0% (18/24) | 75.0% (18/24) |
| 플라스마단 조직원 | 95.8% (23/24) | 66.7% (16/24) | 50.0% (12/24) | 75.0% (18/24) |
| 비오 | 29.2% (7/24) | 70.8% (17/24) | 16.7% (4/24) | 95.8% (23/24) |
| 아크로마 | 75.0% (18/24) | 62.5% (15/24) | 12.5% (3/24) | 83.3% (20/24) |
| 게치스 | 37.5% (9/24) | 75.0% (18/24) | 0.0% (0/24) | 79.2% (19/24) |
| N | 50.0% (12/24) | 66.7% (16/24) | 12.5% (3/24) | 45.8% (11/24) |

## 노간주·아이리스·아크로마·게치스·N 위계

설계 위계는 Alder < Iris < Ghetsis ≈ Hidden N이다. 노간주는 공식 팀을 유지한 Elite Four+/Tactical, 아이리스는 Champion/Expert이며 같은 층별 곡선 안에서 표현한다. 표본상 모든 benchmark에서 단조 순서를 강제하지 않는다. 특히 bulk의 Slowbro/Gastrodon은 노간주의 Bug/Grass/Ice에 약하고 아이리스의 물리 Dragon 축을 막는다. offensive/signature 매치업은 다르다. 차이를 이유로 전용 AI·스탯 보정·공식 팀 재작성을 하지 않았다.

| NPC | 집중+추가 (seeds 1~6) | starters | offense | bulk | signature |
|---|---|---|---|---|---|
| 노간주 / Elite Four+ | 56.9% (164/288) | 43.1% (31/72) | 75.0% (54/72) | 16.7% (12/72) | 93.1% (67/72) |
| 아이리스 / Champion | 63.5% (183/288) | 41.7% (30/72) | 73.6% (53/72) | 66.7% (48/72) | 72.2% (52/72) |
| 아크로마 / Elite Four / Lower Champion | 57.6% (166/288) | 70.8% (51/72) | 84.7% (61/72) | 5.6% (4/72) | 69.4% (50/72) |
| 게치스 / Champion+ | 49.7% (143/288) | 51.4% (37/72) | 69.4% (50/72) | 1.4% (1/72) | 76.4% (55/72) |
| N / Hidden Boss / Champion+ | 50.3% (145/288) | 38.9% (28/72) | 73.6% (53/72) | 22.2% (16/72) | 66.7% (48/72) |

## N 전설 영향과 파트너 기여

100층 matched 집중+위계 144전에서 Zekrom 직접 KO 156, 3KO 마무리 13전, 파트너 직접 피해/변화기 기여가 없었던 추정 단독 sweep 5전. 파트너 직접 피해가 있었던 전투 139전, 파트너 변화기 실행 7회다. 대부분을 전설 혼자 3KO하는 상태는 아니며 다른 동료가 실제 기여한다.
공개 로그의 마지막 move actor만 세지 않는다. 자신의 실제 request로 Illusion의 종을 복원하고, 직접 공격으로 HP 0이 된 상대의 faint만 KO로 계산한다. 독/기타 residual faint를 제외하는 fixture도 통과했다. 단독 sweep은 위 관측 기준에 따른 추정이다.

## Lineup telemetry와 각 NPC 세트

70,000 draws. 각 named의 runtime ace 포함 및 selectionRules 성공 100%, gimmick carrier 없음. 별도 required/atLeastOneOf/preferredLead/preferredLast를 강제하지 않았다. N의 50층 ace는 Zoroark이며 100층은 Zekrom이다. 전체 팀/선봉/마지막 빈도는 audit JSON의 lineups에 저장한다.

### 덴트 — named-cilan

Category: gym. Power Tier: Gym. Ace: Simisage. AI Tier: tactical. Gimmick: 없음.
Candidates: Simisage, Ferrothorn, Lilligant, Whimsicott, Leavanny, Amoonguss. selectionRules: `{}`.
Official-use confirmation: Simisage, Ferrothorn, Lilligant, Whimsicott.
Tower expansion / individual use unconfirmed / evolved adaptation: Leavanny, Amoonguss.
기존 후보: Simisage, Ferrothorn, Leavanny.
Concept: 풀 회복·씨뿌리기와 지속 압박.

| Pokémon | Ability | Item | Moves | Role |
|---|---|---|---|---|
| Simisage | Overgrow | Sitrus Berry | Seed Bomb / Knock Off / Low Kick / Rock Slide | Fast Grass coverage |
| Ferrothorn | Iron Barbs | Leftovers | Power Whip / Gyro Ball / Knock Off / Leech Seed | Slow Steel / Grass attrition |
| Lilligant | Own Tempo | Lum Berry | Giga Drain / Pollen Puff / Quiver Dance / Petal Dance | Special Grass setup / sustain |
| Whimsicott | Prankster | Leftovers | Moonblast / Giga Drain / Leech Seed / Toxic | Priority Grass attrition |
| Leavanny | Swarm | Focus Sash | Leaf Blade / X-Scissor / Knock Off / Swords Dance | Physical Bug / Grass setup |
| Amoonguss | Regenerator | Black Sludge | Giga Drain / Sludge Bomb / Foul Play / Toxic | Bulky Grass / Poison sustain |

Representative lineups F95 (1000 draws): Ferrothorn / Simisage / Whimsicott: 31.1%; Ferrothorn / Lilligant / Simisage: 24.3%; Amoonguss / Ferrothorn / Simisage: 17.4%.
Lead frequency: Simisage: 34.5%; Ferrothorn: 29.9%; Whimsicott: 12.0%. Last frequency: Simisage: 33.9%; Ferrothorn: 30.4%; Whimsicott: 11.2%. Ace inclusion: 100.0%. selectionRules success: 100.0%. Gimmick carrier: 없음.
Design Notes: Grass sustain: Ferrothorn/Whimsicott 씨뿌리기와 Amoonguss 재생력, Lilligant 나비춤, Simisage의 빠른 공격을 분담한다. 느린 풀 조합은 의도된 스타일이다.

### 팟 — named-chili

Category: gym. Power Tier: Gym. Ace: Simisear. AI Tier: tactical. Gimmick: 없음.
Candidates: Simisear, Darmanitan, Chandelure, Arcanine, Heatmor, Emboar. selectionRules: `{}`.
Official-use confirmation: Simisear, Darmanitan, Chandelure, Heatmor.
Tower expansion / individual use unconfirmed / evolved adaptation: Arcanine, Emboar.
기존 후보: Arcanine, Chandelure, Simisear.
Concept: 빠르고 직선적인 불꽃 화력.

| Pokémon | Ability | Item | Moves | Role |
|---|---|---|---|---|
| Simisear | Blaze | Wise Glasses | Flamethrower / Grass Knot / Focus Blast / Nasty Plot | Fast special Fire pressure |
| Darmanitan | Sheer Force | Choice Scarf | Flare Blitz / Earthquake / Rock Slide / U-turn | Fast physical Fire breaker |
| Chandelure | Flash Fire | Expert Belt | Shadow Ball / Flamethrower / Energy Ball / Will-O-Wisp | Special Ghost / Fire disruption |
| Arcanine | Intimidate | Sitrus Berry | Flare Blitz / Extreme Speed / Crunch / Wild Charge | Physical pressure / priority |
| Heatmor | Flash Fire | Assault Vest | Fire Lash / Giga Drain / Knock Off / Superpower | Mixed Fire coverage |
| Emboar | Reckless | Choice Band | Flare Blitz / Superpower / Wild Charge / Sucker Punch | Immediate Fire / Fighting breaker |

Representative lineups F95 (1000 draws): Chandelure / Emboar / Simisear: 19.2%; Emboar / Heatmor / Simisear: 17.0%; Darmanitan / Emboar / Simisear: 12.6%.
Lead frequency: Simisear: 34.5%; Emboar: 17.5%; Chandelure: 13.3%. Last frequency: Simisear: 33.9%; Emboar: 19.8%; Chandelure: 15.2%. Ace inclusion: 100.0%. selectionRules success: 100.0%. Gimmick carrier: 없음.
Design Notes: Fire aggression: 특수 Simisear/Chandelure, 물리 Darmanitan/Emboar, Intimidate+우선기 Arcanine, 혼합 Heatmor. 삼형제의 공격형 축이다.

### 콘 — named-cress

Category: gym. Power Tier: Gym. Ace: Simipour. AI Tier: tactical. Gimmick: 없음.
Candidates: Simipour, Jellicent, Carracosta, Seismitoad, Samurott, Basculin. selectionRules: `{}`.
Official-use confirmation: Simipour, Seismitoad, Basculin.
Tower expansion / individual use unconfirmed / evolved adaptation: Jellicent, Carracosta, Samurott.
기존 후보: Swanna, Seismitoad, Simipour.
Concept: 빠른 물 공격과 내구·회복의 균형.

| Pokémon | Ability | Item | Moves | Role |
|---|---|---|---|---|
| Simipour | Torrent | Expert Belt | Surf / Ice Beam / Grass Knot / Focus Blast | Fast special Water coverage |
| Jellicent | Water Absorb | Leftovers | Scald / Shadow Ball / Will-O-Wisp / Recover | Water / Ghost recovery and burn |
| Carracosta | Sturdy | White Herb | Waterfall / Stone Edge / Aqua Jet / Shell Smash | Physical Water setup / priority |
| Seismitoad | Water Absorb | Sitrus Berry | Earth Power / Scald / Sludge Wave / Toxic | Water immunity / Ground coverage |
| Samurott | Torrent | Mystic Water | Razor Shell / Megahorn / Aqua Jet / Swords Dance | Balanced physical Water / priority |
| Basculin | Adaptability | Choice Band | Liquidation / Aqua Jet / Crunch / Superpower | Fast immediate Water pressure |

Representative lineups F95 (1000 draws): Jellicent / Seismitoad / Simipour: 20.0%; Carracosta / Seismitoad / Simipour: 14.0%; Samurott / Seismitoad / Simipour: 13.3%.
Lead frequency: Simipour: 34.5%; Seismitoad: 18.2%; Jellicent: 15.5%. Last frequency: Simipour: 33.9%; Seismitoad: 18.7%; Jellicent: 17.2%. Ace inclusion: 100.0%. selectionRules success: 100.0%. Gimmick carrier: 없음.
Design Notes: Water balance: 빠른 Simipour/Basculin, Jellicent 회복·화상, Carracosta 강화, Seismitoad 물 무효, Samurott 물리·선공기로 역할을 나눈다.

### 알로에 — named-lenora

Category: gym. Power Tier: Gym. Ace: Watchog. AI Tier: tactical. Gimmick: 없음.
Candidates: Watchog, Bouffalant, Cinccino, Stoutland, Sawsbuck, Braviary. selectionRules: `{}`.
Official-use confirmation: Watchog, Stoutland.
Tower expansion / individual use unconfirmed / evolved adaptation: Bouffalant, Cinccino, Sawsbuck, Braviary.
기존 후보: Watchog, Stoutland, Braviary.
Concept: 노말 기본기와 정면 승부.

| Pokémon | Ability | Item | Moves | Role |
|---|---|---|---|---|
| Watchog | Analytic | Silk Scarf | Retaliate / Knock Off / Low Kick / Thunder Punch | Straightforward Normal coverage |
| Bouffalant | Sap Sipper | Assault Vest | Head Charge / Earthquake / Megahorn / Stone Edge | Bulky Normal breaker / Grass immunity |
| Cinccino | Skill Link | Silk Scarf | Tail Slap / Bullet Seed / Rock Blast / U-turn | Fast multihit pressure / pivot |
| Stoutland | Intimidate | Sitrus Berry | Facade / Crunch / Superpower / Wild Charge | Stable Normal physical coverage |
| Sawsbuck | Sap Sipper | Lum Berry | Horn Leech / Double-Edge / Jump Kick / Swords Dance | Physical Grass sustain |
| Braviary | Defiant | Sharp Beak | Brave Bird / Body Slam / Superpower / Roost | Flying pressure / recovery |

Representative lineups F95 (1000 draws): Braviary / Sawsbuck / Watchog: 15.6%; Bouffalant / Braviary / Watchog: 15.4%; Braviary / Stoutland / Watchog: 13.6%.
Lead frequency: Watchog: 34.5%; Braviary: 17.3%; Bouffalant: 13.0%. Last frequency: Watchog: 33.9%; Braviary: 19.2%; Bouffalant: 13.6%. Ace inclusion: 100.0%. selectionRules success: 100.0%. Gimmick carrier: 없음.
Design Notes: Normal fundamentals: 공식 대표 Watchog 에이스를 유지한다. 죽은 Return 요청 라벨 문제를 Retaliate로 해결하며 복잡한 기믹을 붙이지 않는다.

### 아티 — named-burgh

Category: gym. Power Tier: Gym. Ace: Leavanny. AI Tier: tactical. Gimmick: 없음.
Candidates: Leavanny, Crustle, Escavalier, Accelgor, Galvantula, Heracross. selectionRules: `{}`.
Official-use confirmation: Leavanny, Crustle, Accelgor, Heracross.
Tower expansion / individual use unconfirmed / evolved adaptation: Escavalier, Galvantula.
기존 후보: Crustle, Leavanny, Escavalier.
Concept: 다양한 벌레 복합 타입과 물리·특수 분담.

| Pokémon | Ability | Item | Moves | Role |
|---|---|---|---|---|
| Leavanny | Swarm | Focus Sash | Leaf Blade / X-Scissor / Knock Off / Swords Dance | Physical Bug / Grass setup |
| Crustle | Sturdy | White Herb | Stone Edge / X-Scissor / Earthquake / Shell Smash | Bulky physical Bug setup |
| Escavalier | Overcoat | Assault Vest | Megahorn / Iron Head / Knock Off / Drill Run | Slow high-power Bug / Steel |
| Accelgor | Sticky Hold | Focus Sash | Bug Buzz / Focus Blast / Energy Ball / Sludge Bomb | Fast special Bug coverage |
| Galvantula | Compound Eyes | Focus Sash | Thunder / Bug Buzz / Energy Ball / Thunder Wave | Fast special Bug / Electric speed control |
| Heracross | Guts | Flame Orb | Close Combat / Megahorn / Facade / Stone Edge | Physical Bug / Fighting breaker |

Representative lineups F95 (1000 draws): Crustle / Escavalier / Leavanny: 18.2%; Crustle / Heracross / Leavanny: 17.6%; Crustle / Galvantula / Leavanny: 13.5%.
Lead frequency: Leavanny: 34.5%; Crustle: 19.2%; Escavalier: 15.3%. Last frequency: Leavanny: 33.9%; Crustle: 20.1%; Escavalier: 15.1%. Ace inclusion: 100.0%. selectionRules success: 100.0%. Gimmick carrier: 없음.
Design Notes: Bug variety: Leavanny/Crustle 강화, Escavalier 느린 즉시 화력, Accelgor 빠른 특수, Galvantula 전기·마비, Heracross 격투를 분담한다. Dwebble은 사용 가능한 진화형 Crustle을 선택했다.

### 카밀레 — named-elesa

Category: gym. Power Tier: Upper Gym. Ace: Zebstrika. AI Tier: tactical. Gimmick: 없음.
Candidates: Zebstrika, Emolga, Galvantula, Eelektross, Ampharos, Magnezone. selectionRules: `{}`.
Official-use confirmation: Zebstrika, Emolga, Galvantula, Eelektross, Ampharos.
Tower expansion / individual use unconfirmed / evolved adaptation: Magnezone.
기존 후보: Galvantula, Eelektross, Zebstrika.
Concept: 빠른 전기 피벗과 땅 견제.

| Pokémon | Ability | Item | Moves | Role |
|---|---|---|---|---|
| Zebstrika | Lightning Rod | Magnet | Volt Switch / Overheat / Thunder Wave / Signal Beam | Fast Electric pivot / speed control |
| Emolga | Motor Drive | Sitrus Berry | Volt Switch / Air Slash / Signal Beam / Thunder Wave | Fast airborne pivot / paralysis |
| Galvantula | Compound Eyes | Focus Sash | Thunder / Bug Buzz / Energy Ball / Thunder Wave | Fast special Bug / Electric speed control |
| Eelektross | Levitate | Assault Vest | Thunderbolt / Flamethrower / Giga Drain / Knock Off | Bulky Electric mixed coverage |
| Ampharos | Static | Leftovers | Thunderbolt / Dragon Pulse / Focus Blast / Thunder Wave | Bulky special Electric / speed control |
| Magnezone | Sturdy | Air Balloon | Thunderbolt / Flash Cannon / Thunder Wave / Body Press | Bulky Steel / Electric speed control |

Representative lineups F95 (1000 draws): Emolga / Magnezone / Zebstrika: 17.8%; Galvantula / Magnezone / Zebstrika: 14.6%; Emolga / Galvantula / Zebstrika: 14.5%.
Lead frequency: Zebstrika: 34.5%; Galvantula: 16.7%; Emolga: 16.3%. Last frequency: Zebstrika: 33.9%; Emolga: 17.9%; Galvantula: 15.9%. Ace inclusion: 100.0%. selectionRules success: 100.0%. Gimmick carrier: 없음.
Design Notes: Electric pivot: Zebstrika Volt Switch는 실제 사용 후 교체까지 별도 v12 배틀로 확인했다. 더 높은 점수의 Thunderbolt가 피벗을 가리던 슬롯은 Thunder Wave로 교체했다. Emolga는 공중 피벗, Ampharos/Magnezone은 내구·마비, Eelektross는 땅 무효·혼합 견제다.

### 야콘 — named-clay

Category: gym. Power Tier: Upper Gym. Ace: Excadrill. AI Tier: tactical. Gimmick: 없음.
Candidates: Excadrill, Krookodile, Seismitoad, Golurk, Mamoswine, Hippowdon. selectionRules: `{}`.
Official-use confirmation: Excadrill, Krookodile, Seismitoad, Golurk, Mamoswine.
Tower expansion / individual use unconfirmed / evolved adaptation: Hippowdon.
기존 후보: Excadrill, Seismitoad, Mamoswine.
Concept: 묵직한 땅 물리전과 내구.

| Pokémon | Ability | Item | Moves | Role |
|---|---|---|---|---|
| Excadrill | Mold Breaker | Life Orb | Earthquake / Iron Head / Rock Slide / Swords Dance | Ground physical ace |
| Krookodile | Intimidate | Expert Belt | Earthquake / Knock Off / Stone Edge / Close Combat | Heavy Ground / Dark coverage |
| Seismitoad | Water Absorb | Sitrus Berry | Earth Power / Scald / Sludge Wave / Toxic | Water immunity / Ground coverage |
| Golurk | Iron Fist | Assault Vest | Earthquake / Shadow Punch / Drain Punch / Ice Punch | Bulky Ground / Ghost immediate power |
| Mamoswine | Thick Fat | Life Orb | Earthquake / Icicle Crash / Ice Shard / Stone Edge | Ground / Ice breaker and priority |
| Hippowdon | Sand Stream | Leftovers | Earthquake / Stone Edge / Slack Off / Toxic | Bulky Ground sustain |

Representative lineups F95 (1000 draws): Excadrill / Golurk / Seismitoad: 17.8%; Excadrill / Krookodile / Seismitoad: 17.6%; Excadrill / Mamoswine / Seismitoad: 14.5%.
Lead frequency: Excadrill: 34.5%; Seismitoad: 20.0%; Golurk: 12.7%. Last frequency: Excadrill: 33.9%; Seismitoad: 20.6%; Krookodile: 13.1%. Ace inclusion: 100.0%. selectionRules success: 100.0%. Gimmick carrier: 없음.
Design Notes: Heavy Ground: Excadrill 대표 물리, Krookodile 악, Seismitoad Water Absorb, Golurk 고스트, Mamoswine 얼음, Hippowdon 내구. 느린 조합을 공격수 강제 규칙으로 지우지 않는다.

### 풍란 — named-skyla

Category: gym. Power Tier: Upper Gym. Ace: Swanna. AI Tier: tactical. Gimmick: 없음.
Candidates: Swanna, Unfezant, Skarmory, Archeops, Braviary, Mandibuzz. selectionRules: `{}`.
Official-use confirmation: Swanna, Unfezant, Skarmory, Braviary, Mandibuzz.
Tower expansion / individual use unconfirmed / evolved adaptation: Archeops.
기존 후보: Swanna, Skarmory, Mandibuzz.
Concept: 빠른 비행과 내구형 비행의 타입 분담.

| Pokémon | Ability | Item | Moves | Role |
|---|---|---|---|---|
| Swanna | Keen Eye | Wise Glasses | Surf / Hurricane / Ice Beam / Roost | Fast special Flying / Water recovery |
| Unfezant | Super Luck | Scope Lens | Brave Bird / Return / Night Slash / U-turn | Fast physical Flying / critical pressure |
| Skarmory | Sturdy | Rocky Helmet | Brave Bird / Body Press / Roost / Toxic | Physical Flying wall / recovery |
| Archeops | Defeatist | Sitrus Berry | Stone Edge / Dual Wingbeat / Earthquake / U-turn | Fast Flying / Rock pivot |
| Braviary | Defiant | Sharp Beak | Brave Bird / Body Slam / Superpower / Roost | Flying pressure / recovery |
| Mandibuzz | Overcoat | Leftovers | Foul Play / Brave Bird / Roost / Toxic | Bulky Flying / Dark sustain |

Representative lineups F95 (1000 draws): Archeops / Skarmory / Swanna: 18.4%; Skarmory / Swanna / Unfezant: 17.5%; Mandibuzz / Skarmory / Swanna: 14.1%.
Lead frequency: Swanna: 34.5%; Skarmory: 20.4%; Archeops: 12.7%. Last frequency: Swanna: 33.9%; Skarmory: 21.2%; Unfezant: 12.4%. Ace inclusion: 100.0%. selectionRules success: 100.0%. Gimmick carrier: 없음.
Design Notes: Flying variety: Swanna 특수·물, Unfezant/Archeops/Braviary 물리, Skarmory/Mandibuzz 내구·회복. Return은 Braviary에서 Body Slam으로 바꿨다.

### 담죽 — named-brycen

Category: gym. Power Tier: Upper Gym. Ace: Beartic. AI Tier: tactical. Gimmick: 없음.
Candidates: Beartic, Cryogonal, Vanilluxe, Weavile, Mamoswine, Walrein. selectionRules: `{}`.
Official-use confirmation: Beartic, Cryogonal, Vanilluxe, Walrein.
Tower expansion / individual use unconfirmed / evolved adaptation: Weavile, Mamoswine.
기존 후보: Beartic, Walrein, Weavile.
Concept: 얼음 내구와 물리·특수·선공기.

| Pokémon | Ability | Item | Moves | Role |
|---|---|---|---|---|
| Beartic | Slush Rush | Never-Melt Ice | Icicle Crash / Superpower / Aqua Jet / Swords Dance | Physical Ice pressure / priority |
| Cryogonal | Levitate | Leftovers | Freeze-Dry / Water Pulse / Flash Cannon / Recover | Special Ice / coverage and recovery |
| Vanilluxe | Snow Warning | Icy Rock | Blizzard / Water Pulse / Flash Cannon / Ice Shard | Snow / special Ice / priority |
| Weavile | Pressure | Focus Sash | Icicle Crash / Knock Off / Ice Shard / Low Kick | Fast Ice / Dark priority |
| Mamoswine | Thick Fat | Life Orb | Earthquake / Icicle Crash / Ice Shard / Stone Edge | Ground / Ice breaker and priority |
| Walrein | Thick Fat | Leftovers | Surf / Ice Beam / Earthquake / Toxic | Bulky mixed Ice / Water |

Representative lineups F95 (1000 draws): Beartic / Mamoswine / Walrein: 29.2%; Beartic / Walrein / Weavile: 16.0%; Beartic / Cryogonal / Walrein: 14.2%.
Lead frequency: Beartic: 34.5%; Walrein: 23.0%; Mamoswine: 16.5%. Last frequency: Beartic: 33.9%; Walrein: 23.2%; Mamoswine: 15.1%. Ace inclusion: 100.0%. selectionRules success: 100.0%. Gimmick carrier: 없음.
Design Notes: Ice offense/bulk: Beartic 물리·선공기, Cryogonal 특수 회복, Vanilluxe 눈, Weavile/Mamoswine 빠른 압박과 우선기, Walrein 물/독 운영. Cryogonal은 Freeze-Dry를 주 얼음 기술로 삼아 Ice Beam과의 점수 중복을 제거했다.

### 사간 — named-drayden

Category: gym. Power Tier: Upper Gym. Ace: Haxorus. AI Tier: tactical. Gimmick: 없음.
Candidates: Haxorus, Druddigon, Hydreigon, Flygon, Altaria, Salamence. selectionRules: `{}`.
Official-use confirmation: Haxorus, Druddigon, Flygon, Altaria, Salamence.
Tower expansion / individual use unconfirmed / evolved adaptation: Hydreigon.
기존 후보: Haxorus, Salamence, Hydreigon.
Concept: 정면 승부형 드래곤.

| Pokémon | Ability | Item | Moves | Role |
|---|---|---|---|---|
| Haxorus | Mold Breaker | Lum Berry | Dragon Claw / Earthquake / Poison Jab / Dragon Dance | Physical Dragon ace / setup |
| Druddigon | Rough Skin | Rocky Helmet | Dragon Claw / Earthquake / Fire Punch / Sucker Punch | Bulky physical Dragon / priority |
| Hydreigon | Levitate | Expert Belt | Dark Pulse / Dragon Pulse / Flamethrower / Flash Cannon | Special Dragon / Dark coverage |
| Flygon | Levitate | Choice Scarf | Earthquake / Dragon Claw / Rock Slide / U-turn | Fast Dragon pivot |
| Altaria | Natural Cure | Leftovers | Dragon Pulse / Flamethrower / Toxic / Roost | Bulky Dragon status / recovery |
| Salamence | Intimidate | Lum Berry | Dragon Claw / Earthquake / Fire Blast / Roost | Mixed Dragon pressure / recovery |

Representative lineups F95 (1000 draws): Flygon / Haxorus / Hydreigon: 15.8%; Druddigon / Haxorus / Hydreigon: 14.7%; Altaria / Haxorus / Hydreigon: 13.4%.
Lead frequency: Haxorus: 34.5%; Hydreigon: 17.4%; Flygon: 14.1%. Last frequency: Haxorus: 33.9%; Hydreigon: 19.6%; Altaria: 12.4%. Ace inclusion: 100.0%. selectionRules success: 100.0%. Gimmick carrier: 없음.
Design Notes: Dragon direct battle: Haxorus 물리 강화, Druddigon 내구·우선기, Hydreigon 특수, Flygon 피벗, Altaria 회복·독, Salamence 혼합을 유지한다.

### 체렌 — named-cheren

Category: gym. Power Tier: Gym. Ace: Stoutland. AI Tier: tactical. Gimmick: 없음.
Candidates: Stoutland, Cinccino, Bouffalant, Braviary, Sawsbuck, Snorlax. selectionRules: `{}`.
Official-use confirmation: Stoutland, Cinccino, Bouffalant.
Tower expansion / individual use unconfirmed / evolved adaptation: Braviary, Sawsbuck, Snorlax.
기존 후보: Stoutland, Braviary, Porygon-Z.
Concept: 안정적인 노말 정석 전투.

| Pokémon | Ability | Item | Moves | Role |
|---|---|---|---|---|
| Stoutland | Intimidate | Sitrus Berry | Facade / Crunch / Superpower / Wild Charge | Stable Normal physical coverage |
| Cinccino | Skill Link | Silk Scarf | Tail Slap / Bullet Seed / Rock Blast / U-turn | Fast multihit pressure / pivot |
| Bouffalant | Sap Sipper | Assault Vest | Head Charge / Earthquake / Megahorn / Stone Edge | Bulky Normal breaker / Grass immunity |
| Braviary | Defiant | Sharp Beak | Brave Bird / Body Slam / Superpower / Roost | Flying pressure / recovery |
| Sawsbuck | Sap Sipper | Lum Berry | Horn Leech / Double-Edge / Jump Kick / Swords Dance | Physical Grass sustain |
| Snorlax | Thick Fat | Leftovers | Body Slam / Crunch / Earthquake / Heavy Slam | Bulky Normal physical pressure |

Representative lineups F95 (1000 draws): Bouffalant / Braviary / Stoutland: 15.9%; Braviary / Sawsbuck / Stoutland: 14.0%; Braviary / Snorlax / Stoutland: 13.7%.
Lead frequency: Stoutland: 34.5%; Braviary: 20.0%; Cinccino: 12.6%. Last frequency: Stoutland: 33.9%; Braviary: 18.1%; Cinccino: 13.0%. Ace inclusion: 100.0%. selectionRules success: 100.0%. Gimmick carrier: 없음.
Design Notes: Stable Normal: Stoutland Intimidate/Sitrus Berry 에이스와 Snorlax 내구, Cinccino 연속기, Sawsbuck 흡수, Braviary 회복. 라이벌 버전은 추가하지 않았다.

### 보미카 — named-roxie

Category: gym. Power Tier: Gym. Ace: Scolipede. AI Tier: tactical. Gimmick: 없음.
Candidates: Scolipede, Garbodor, Toxicroak, Crobat, Drapion, Amoonguss. selectionRules: `{}`.
Official-use confirmation: Scolipede, Garbodor, Toxicroak, Crobat, Drapion.
Tower expansion / individual use unconfirmed / evolved adaptation: Amoonguss.
기존 후보: Crobat, Scolipede, Drapion.
Concept: 빠른 독 공격과 거친 상태 압박.

| Pokémon | Ability | Item | Moves | Role |
|---|---|---|---|---|
| Scolipede | Speed Boost | Black Sludge | Poison Jab / Megahorn / Earthquake / Swords Dance | Fast physical Poison setup |
| Garbodor | Aftermath | Rocky Helmet | Gunk Shot / Drain Punch / Seed Bomb / Toxic | Bulky Poison pressure |
| Toxicroak | Dry Skin | Black Sludge | Drain Punch / Poison Jab / Sucker Punch / Ice Punch | Poison sustain / priority |
| Crobat | Infiltrator | Black Sludge | Brave Bird / Cross Poison / U-turn / Roost | Fast Poison pivot |
| Drapion | Sniper | Scope Lens | Cross Poison / Night Slash / Earthquake / Ice Fang | Physical Poison / Dark coverage |
| Amoonguss | Regenerator | Black Sludge | Giga Drain / Sludge Bomb / Foul Play / Toxic | Bulky Grass / Poison sustain |

Representative lineups F95 (1000 draws): Drapion / Scolipede / Toxicroak: 16.6%; Amoonguss / Drapion / Scolipede: 15.2%; Crobat / Drapion / Scolipede: 13.9%.
Lead frequency: Scolipede: 34.5%; Drapion: 18.2%; Crobat: 13.4%. Last frequency: Scolipede: 33.9%; Drapion: 18.7%; Garbodor: 12.6%. Ace inclusion: 100.0%. selectionRules success: 100.0%. Gimmick carrier: 없음.
Design Notes: Poison pressure: Scolipede 가속 물리, Garbodor 내구, Toxicroak 회복/선공기, Crobat 피벗, Drapion 악, Amoonguss 재생력. 미지원 수면·압정 슬롯은 없다.

### 시즈 — named-marlon

Category: gym. Power Tier: Upper Gym. Ace: Jellicent. AI Tier: tactical. Gimmick: 없음.
Candidates: Jellicent, Carracosta, Wailord, Floatzel, Mantine, Samurott. selectionRules: `{}`.
Official-use confirmation: Jellicent, Carracosta, Wailord.
Tower expansion / individual use unconfirmed / evolved adaptation: Floatzel, Mantine, Samurott.
기존 후보: Jellicent, Seismitoad, Mantine.
Concept: 자유로운 물 공격과 회복.

| Pokémon | Ability | Item | Moves | Role |
|---|---|---|---|---|
| Jellicent | Water Absorb | Leftovers | Scald / Shadow Ball / Will-O-Wisp / Recover | Water / Ghost recovery and burn |
| Carracosta | Sturdy | White Herb | Waterfall / Stone Edge / Aqua Jet / Shell Smash | Physical Water setup / priority |
| Wailord | Water Veil | Assault Vest | Water Spout / Surf / Ice Beam / Heavy Slam | Bulky special Water pressure |
| Floatzel | Water Veil | Mystic Water | Waterfall / Aqua Jet / Ice Punch / Crunch | Fast physical Water / priority |
| Mantine | Water Absorb | Leftovers | Scald / Air Slash / Ice Beam / Roost | Special Water wall / recovery |
| Samurott | Torrent | Mystic Water | Razor Shell / Megahorn / Aqua Jet / Swords Dance | Balanced physical Water / priority |

Representative lineups F95 (1000 draws): Floatzel / Jellicent / Mantine: 18.1%; Carracosta / Jellicent / Mantine: 16.7%; Jellicent / Mantine / Wailord: 9.8%.
Lead frequency: Jellicent: 34.5%; Mantine: 16.4%; Floatzel: 15.8%. Last frequency: Jellicent: 33.9%; Mantine: 17.7%; Carracosta: 15.4%. Ace inclusion: 100.0%. selectionRules success: 100.0%. Gimmick carrier: 없음.
Design Notes: Free-form Water: 실제 BW2 에이스 Jellicent를 유지한다. 회복/화상과 Carracosta 강화, Floatzel 속도, Wailord 해수스파우팅, Mantine 특수 내구, Samurott 물리를 혼합한다.

### 망초 — named-shauntal

Category: elite. Power Tier: Elite Four. Ace: Chandelure. AI Tier: tactical. Gimmick: 없음.
Candidates: Chandelure, Cofagrigus, Golurk, Jellicent, Drifblim, Froslass. selectionRules: `{}`.
Official-use confirmation: Chandelure, Cofagrigus, Golurk, Jellicent, Drifblim, Froslass.
Tower expansion / individual use unconfirmed / evolved adaptation: 없음.
기존 후보: Chandelure, Golurk, Drifblim.
Concept: 고스트 특수 압박과 화상·교란.

| Pokémon | Ability | Item | Moves | Role |
|---|---|---|---|---|
| Chandelure | Flash Fire | Expert Belt | Shadow Ball / Flamethrower / Energy Ball / Will-O-Wisp | Special Ghost / Fire disruption |
| Cofagrigus | Mummy | Leftovers | Shadow Ball / Body Press / Energy Ball / Will-O-Wisp | Ghost wall / burn |
| Golurk | Iron Fist | Assault Vest | Earthquake / Shadow Punch / Drain Punch / Ice Punch | Bulky Ground / Ghost immediate power |
| Jellicent | Water Absorb | Leftovers | Scald / Shadow Ball / Will-O-Wisp / Recover | Water / Ghost recovery and burn |
| Drifblim | Unburden | Sitrus Berry | Shadow Ball / Air Slash / Will-O-Wisp / Strength Sap | Special Ghost disruption / recovery |
| Froslass | Cursed Body | Focus Sash | Ice Beam / Shadow Ball / Thunderbolt / Destiny Bond | Fast special Ghost / trade |

Representative lineups F95 (1000 draws): Chandelure / Golurk / Jellicent: 14.8%; Chandelure / Cofagrigus / Golurk: 13.9%; Chandelure / Cofagrigus / Froslass: 12.0%.
Lead frequency: Chandelure: 34.5%; Golurk: 16.1%; Jellicent: 15.0%. Last frequency: Chandelure: 33.9%; Golurk: 17.6%; Cofagrigus: 14.2%. Ace inclusion: 100.0%. selectionRules success: 100.0%. Gimmick carrier: 없음.
Design Notes: Ghost special/disruption: Chandelure 특수, Cofagrigus 화상·물리벽, Golurk 물리, Jellicent 회복, Drifblim 힘흡수, Froslass 빠른 특수와 조건부 Destiny Bond. 느린 고스트도 Trick Room 없이 작동한다.

### 연무 — named-marshal

Category: elite. Power Tier: Elite Four. Ace: Conkeldurr. AI Tier: tactical. Gimmick: 없음.
Candidates: Conkeldurr, Mienshao, Throh, Sawk, Lucario, Machamp. selectionRules: `{}`.
Official-use confirmation: Conkeldurr, Mienshao, Throh, Sawk.
Tower expansion / individual use unconfirmed / evolved adaptation: Lucario, Machamp.
기존 후보: Conkeldurr, Lucario, Toxicroak.
Concept: 격투 물리 압박과 선공기·피벗.

| Pokémon | Ability | Item | Moves | Role |
|---|---|---|---|---|
| Conkeldurr | Guts | Flame Orb | Drain Punch / Mach Punch / Knock Off / Ice Punch | Fighting breaker / sustain and priority |
| Mienshao | Regenerator | Life Orb | Close Combat / Knock Off / Stone Edge / U-turn | Fast Fighting pivot |
| Throh | Guts | Sitrus Berry | Storm Throw / Knock Off / Ice Punch / Bulk Up | Bulky Fighting pressure |
| Sawk | Sturdy | Expert Belt | Close Combat / Knock Off / Stone Edge / Ice Punch | Immediate Fighting physical coverage |
| Lucario | Inner Focus | Lum Berry | Close Combat / Meteor Mash / Extreme Speed / Ice Punch | Fighting / Steel coverage and priority |
| Machamp | No Guard | Sitrus Berry | Dynamic Punch / Knock Off / Stone Edge / Bullet Punch | Confusion / Fighting power |

Representative lineups F95 (1000 draws): Conkeldurr / Lucario / Throh: 31.0%; Conkeldurr / Lucario / Mienshao: 21.3%; Conkeldurr / Lucario / Machamp: 21.2%.
Lead frequency: Conkeldurr: 34.5%; Lucario: 30.9%; Throh: 10.5%. Last frequency: Conkeldurr: 33.9%; Lucario: 30.0%; Throh: 11.9%. Ace inclusion: 100.0%. selectionRules success: 100.0%. Gimmick carrier: 없음.
Design Notes: Fighting physical pressure: Conkeldurr Guts와 회복/선공기, Mienshao 재생력 피벗, Throh 강화/내구, Sawk 옹골참 즉시 공격, Lucario 강철/선공기, Machamp 혼란. 전원 Life Orb로 통일하지 않는다.

### 블래리 — named-grimsley

Category: elite. Power Tier: Elite Four. Ace: Krookodile. AI Tier: tactical. Gimmick: 없음.
Candidates: Krookodile, Scrafty, Kingambit, Liepard, Sharpedo, Honchkrow. selectionRules: `{}`.
Official-use confirmation: Krookodile, Scrafty, Liepard, Sharpedo.
Tower expansion / individual use unconfirmed / evolved adaptation: Kingambit, Honchkrow.
기존 후보: Honchkrow, Kingambit, Krookodile.
Concept: 악 속임수·우선기·빠른 압박.

| Pokémon | Ability | Item | Moves | Role |
|---|---|---|---|---|
| Krookodile | Moxie | Lum Berry | Earthquake / Knock Off / Stone Edge / Close Combat | Dark physical ace / snowball pressure |
| Scrafty | Intimidate | Leftovers | Drain Punch / Knock Off / Ice Punch / Dragon Dance | Bulky Dark / Fighting setup |
| Kingambit | Defiant | Black Glasses | Iron Head / Knock Off / Sucker Punch / Swords Dance | Dark / Steel setup and priority |
| Liepard | Prankster | Focus Sash | Knock Off / Play Rough / Sucker Punch / Thunder Wave | Dark disruption / paralysis and priority |
| Sharpedo | Speed Boost | Life Orb | Waterfall / Crunch / Ice Fang / Aqua Jet | Fast physical Dark / Water |
| Honchkrow | Super Luck | Scope Lens | Brave Bird / Night Slash / Sucker Punch / Heat Wave | Mixed Dark pressure / priority |

Representative lineups F95 (1000 draws): Honchkrow / Kingambit / Krookodile: 23.6%; Kingambit / Krookodile / Scrafty: 14.0%; Honchkrow / Krookodile / Scrafty: 12.2%.
Lead frequency: Krookodile: 34.5%; Kingambit: 19.5%; Honchkrow: 15.3%. Last frequency: Krookodile: 33.9%; Kingambit: 20.6%; Honchkrow: 17.3%. Ace inclusion: 100.0%. selectionRules success: 100.0%. Gimmick carrier: 없음.
Design Notes: Dark trickery/priority: Krookodile의 공식 사용 이력과 사용자 지정 방향을 따라 에이스로 유지했다. Bisharp는 collectible 정책 때문에 Kingambit 진화형으로 대체한다. Liepard 마비와 Sucker Punch, Sharpedo 가속, Honchkrow 혼합을 구분한다.

### 카틀레야 — named-caitlin

Category: elite. Power Tier: Elite Four. Ace: Gothitelle. AI Tier: tactical. Gimmick: 없음.
Candidates: Gothitelle, Reuniclus, Sigilyph, Musharna, Metagross, Alakazam. selectionRules: `{}`.
Official-use confirmation: Gothitelle, Reuniclus, Sigilyph, Musharna, Metagross.
Tower expansion / individual use unconfirmed / evolved adaptation: Alakazam.
기존 후보: Gothitelle, Metagross, Gallade.
Concept: 에스퍼 특수전과 회복·상태 운영.

| Pokémon | Ability | Item | Moves | Role |
|---|---|---|---|---|
| Gothitelle | Competitive | Leftovers | Psychic / Thunderbolt / Energy Ball / Calm Mind | Stable Psychic special pressure |
| Reuniclus | Magic Guard | Leftovers | Psychic / Focus Blast / Calm Mind / Recover | Slow Psychic setup / recovery |
| Sigilyph | Magic Guard | Life Orb | Psychic / Air Slash / Heat Wave / Roost | Special Psychic / Flying recovery |
| Musharna | Synchronize | Leftovers | Psychic / Shadow Ball / Energy Ball / Thunder Wave | Bulky Psychic / speed control |
| Metagross | Clear Body | Assault Vest | Meteor Mash / Zen Headbutt / Earthquake / Bullet Punch | Physical Steel / Psychic priority |
| Alakazam | Magic Guard | Life Orb | Psychic / Shadow Ball / Focus Blast / Dazzling Gleam | Fast special Psychic coverage |

Representative lineups F95 (1000 draws): Gothitelle / Metagross / Sigilyph: 18.8%; Alakazam / Gothitelle / Metagross: 14.9%; Gothitelle / Reuniclus / Sigilyph: 12.4%.
Lead frequency: Gothitelle: 34.5%; Metagross: 17.8%; Sigilyph: 16.3%. Last frequency: Gothitelle: 33.9%; Sigilyph: 17.8%; Metagross: 17.3%. Ace inclusion: 100.0%. selectionRules success: 100.0%. Gimmick carrier: 없음.
Design Notes: Stable Psychic: Gothitelle 명상/견제, Reuniclus 명상·Recover, Sigilyph 회복, Musharna 마비, Metagross 물리·우선기, Alakazam 빠른 특수. Trick Room·미지원 Moonlight는 사용하지 않는다.

### 노간주 — named-alder

Category: veteran. Power Tier: Elite Four+. Ace: Volcarona. AI Tier: tactical. Gimmick: 없음.
Candidates: Volcarona, Accelgor, Escavalier, Bouffalant, Druddigon, Vanilluxe. selectionRules: `{}`.
Official-use confirmation: Volcarona, Accelgor, Escavalier, Bouffalant, Druddigon, Vanilluxe.
Tower expansion / individual use unconfirmed / evolved adaptation: 없음.
기존 후보: Escavalier, Volcarona, Vanilluxe.
Concept: 공식 여섯 동료와 불카모스 중심 베테랑.

| Pokémon | Ability | Item | Moves | Role |
|---|---|---|---|---|
| Volcarona | Flame Body | Sitrus Berry | Fiery Dance / Bug Buzz / Giga Drain / Quiver Dance | Veteran special setup / sustain |
| Accelgor | Sticky Hold | Focus Sash | Bug Buzz / Focus Blast / Energy Ball / Sludge Bomb | Fast special Bug coverage |
| Escavalier | Overcoat | Assault Vest | Megahorn / Iron Head / Knock Off / Drill Run | Slow high-power Bug / Steel |
| Bouffalant | Sap Sipper | Assault Vest | Head Charge / Earthquake / Megahorn / Stone Edge | Bulky Normal breaker / Grass immunity |
| Druddigon | Rough Skin | Rocky Helmet | Dragon Claw / Earthquake / Fire Punch / Sucker Punch | Bulky physical Dragon / priority |
| Vanilluxe | Snow Warning | Icy Rock | Blizzard / Water Pulse / Flash Cannon / Ice Shard | Snow / special Ice / priority |

Representative lineups F95 (1000 draws): Bouffalant / Escavalier / Volcarona: 13.4%; Accelgor / Escavalier / Volcarona: 12.4%; Bouffalant / Vanilluxe / Volcarona: 12.1%.
Lead frequency: Volcarona: 34.5%; Bouffalant: 16.6%; Escavalier: 15.1%. Last frequency: Volcarona: 33.9%; Escavalier: 17.1%; Bouffalant: 12.9%. Ace inclusion: 100.0%. selectionRules success: 100.0%. Gimmick carrier: 없음.
Design Notes: Elite Four+ veteran: 공식 여섯 파트너 유지, role=elite/title=강자/Tactical ceiling. Volcarona는 Sitrus Berry와 Quiver Dance, 나머지는 다양한 타입을 맡는다. 챔피언 플래그와 Z 도구를 제거했다. 아이리스보다 낮은 설계 등급이며 특정 benchmark 역전은 타입/선출 차이로 해석한다.

### 아이리스 — named-iris

Category: champion. Power Tier: Champion. Ace: Haxorus. AI Tier: expert. Gimmick: 없음.
Candidates: Haxorus, Hydreigon, Druddigon, Archeops, Lapras, Aggron. selectionRules: `{}`.
Official-use confirmation: Haxorus, Hydreigon, Druddigon, Archeops, Lapras, Aggron.
Tower expansion / individual use unconfirmed / evolved adaptation: 없음.
기존 후보: Haxorus, Hydreigon, Lapras.
Concept: 드래곤과 다양한 타입의 공식 챔피언 팀.

| Pokémon | Ability | Item | Moves | Role |
|---|---|---|---|---|
| Haxorus | Mold Breaker | Focus Sash | Dragon Claw / Earthquake / Poison Jab / Dragon Dance | Physical Dragon ace / setup |
| Hydreigon | Levitate | Expert Belt | Dark Pulse / Dragon Pulse / Flamethrower / Flash Cannon | Special Dragon / Dark coverage |
| Druddigon | Rough Skin | Rocky Helmet | Dragon Claw / Earthquake / Fire Punch / Sucker Punch | Bulky physical Dragon / priority |
| Archeops | Defeatist | Sitrus Berry | Stone Edge / Dual Wingbeat / Earthquake / U-turn | Fast Flying / Rock pivot |
| Lapras | Water Absorb | Assault Vest | Surf / Freeze-Dry / Thunderbolt / Ice Shard | Champion Water / Ice coverage |
| Aggron | Rock Head | Choice Band | Head Smash / Heavy Slam / Earthquake / Ice Punch | Physical Steel breaker |

Representative lineups F95 (1000 draws): Aggron / Haxorus / Hydreigon: 19.2%; Haxorus / Hydreigon / Lapras: 14.5%; Aggron / Haxorus / Lapras: 11.5%.
Lead frequency: Haxorus: 34.5%; Aggron: 16.2%; Hydreigon: 14.9%. Last frequency: Haxorus: 33.9%; Aggron: 16.3%; Hydreigon: 16.2%. Ace inclusion: 100.0%. selectionRules success: 100.0%. Gimmick carrier: 없음.
Design Notes: Champion Iris only: 공식 B2W2 여섯 후보, Haxorus Focus Sash·Dragon Dance/즉시 공격, Expert. 원작 팀 완성도를 유지하고 기믹은 없다. Gym 버전과 다른 라이벌을 추가하지 않았다.

### 플라스마단 조직원 — plasma-grunt

Category: grunt. Power Tier: Normal / Lower Gym. Ace: 없음. AI Tier: Basic→Tactical. Gimmick: 없음.
Candidates: Watchog, Liepard, Garbodor, Krookodile, Scrafty, Crobat. selectionRules: `{}`.
Official-use confirmation: Watchog, Liepard, Garbodor, Krookodile, Scrafty.
Tower expansion / individual use unconfirmed / evolved adaptation: Crobat.
기존 후보: 개별 runtime 없음.
Concept: 노말·악·독 조직 공용 파티.

| Pokémon | Ability | Item | Moves | Role |
|---|---|---|---|---|
| Watchog | Analytic | Sitrus Berry | Retaliate / Knock Off / Low Kick / Thunder Punch | Straightforward Normal coverage |
| Liepard | Prankster | Sitrus Berry | Knock Off / Play Rough / Sucker Punch / Thunder Wave | Dark disruption / paralysis and priority |
| Garbodor | Aftermath | Sitrus Berry | Gunk Shot / Drain Punch / Seed Bomb / Toxic | Bulky Poison pressure |
| Krookodile | Intimidate | Sitrus Berry | Crunch / Earthquake / Rock Slide / Fire Fang | Heavy Ground / Dark coverage |
| Scrafty | Intimidate | Sitrus Berry | Drain Punch / Crunch / Ice Punch / Poison Jab | Bulky Dark / Fighting setup |
| Crobat | Infiltrator | Black Sludge | Brave Bird / Cross Poison / U-turn / Roost | Fast Poison pivot |

Representative lineups F95 (1000 draws): Crobat / Scrafty / Watchog: 8.7%; Crobat / Krookodile / Scrafty: 7.2%; Garbodor / Krookodile / Scrafty: 6.9%.
Lead frequency: Crobat: 19.1%; Garbodor: 17.4%; Watchog: 16.9%. Last frequency: Crobat: 19.3%; Garbodor: 18.7%; Krookodile: 16.3%. Ace inclusion: 해당 없음. selectionRules success: 100.0%. Gimmick carrier: 없음.
Design Notes: Normal/Lower Gym: 조직 공용 악·독·노말, Crobat은 Golbat의 사용 가능 진화형. Sitrus Berry 위주와 Basic→Tactical. 간부의 강도/도구를 그대로 복사하지 않는다.

### 비오 — plasma-executive-zinzolin

Category: executive. Power Tier: Upper Gym / Lower Elite Four. Ace: Cryogonal. AI Tier: tactical. Gimmick: 없음.
Candidates: Cryogonal, Weavile, Mamoswine, Vanilluxe, Walrein, Krookodile. selectionRules: `{}`.
Official-use confirmation: Cryogonal, Weavile.
Tower expansion / individual use unconfirmed / evolved adaptation: Mamoswine, Vanilluxe, Walrein, Krookodile.
기존 후보: Cryogonal, Garbodor, Kingambit.
Concept: 얼음·악 간부 운영과 특수 회복.

| Pokémon | Ability | Item | Moves | Role |
|---|---|---|---|---|
| Cryogonal | Levitate | Leftovers | Freeze-Dry / Water Pulse / Flash Cannon / Recover | Special Ice / coverage and recovery |
| Weavile | Pressure | Focus Sash | Icicle Crash / Knock Off / Ice Shard / Low Kick | Fast Ice / Dark priority |
| Mamoswine | Thick Fat | Life Orb | Earthquake / Icicle Crash / Ice Shard / Stone Edge | Ground / Ice breaker and priority |
| Vanilluxe | Snow Warning | Never-Melt Ice | Blizzard / Water Pulse / Flash Cannon / Ice Shard | Snow / special Ice / priority |
| Walrein | Thick Fat | Leftovers | Surf / Ice Beam / Earthquake / Toxic | Bulky mixed Ice / Water |
| Krookodile | Intimidate | Expert Belt | Earthquake / Knock Off / Stone Edge / Close Combat | Heavy Ground / Dark coverage |

Representative lineups F95 (1000 draws): Cryogonal / Mamoswine / Walrein: 20.4%; Cryogonal / Krookodile / Walrein: 20.1%; Cryogonal / Krookodile / Mamoswine: 13.6%.
Lead frequency: Cryogonal: 34.5%; Walrein: 20.1%; Krookodile: 16.5%. Last frequency: Cryogonal: 33.9%; Krookodile: 18.9%; Walrein: 16.6%. Ace inclusion: 100.0%. selectionRules success: 100.0%. Gimmick carrier: 없음.
Design Notes: Ice/Dark officer: Cryogonal 공식 대표 에이스, 회복·얼음 견제·독과 내구, Tactical. 얼음 후보의 속도와 물/땅/악을 혼합한다. Weavile 외의 보강 후보는 타워 확장으로 명시한다.

### 아크로마 — plasma-executive-colress

Category: executive. Power Tier: Elite Four / Lower Champion. Ace: Klinklang. AI Tier: expert. Gimmick: 없음.
Candidates: Klinklang, Magnezone, Metagross, Rotom, Beheeyem, Porygon-Z. selectionRules: `{}`.
Official-use confirmation: Klinklang, Magnezone, Metagross, Beheeyem.
Tower expansion / individual use unconfirmed / evolved adaptation: Rotom, Porygon-Z.
기존 후보: 개별 runtime 없음.
Concept: 기계·강철과 전기·에스퍼 특수전.

| Pokémon | Ability | Item | Moves | Role |
|---|---|---|---|---|
| Klinklang | Clear Body | Leftovers | Gear Grind / Wild Charge / Giga Impact / Thunder Wave | Mechanical Steel pressure / speed control |
| Magnezone | Sturdy | Air Balloon | Thunderbolt / Flash Cannon / Thunder Wave / Body Press | Bulky Steel / Electric speed control |
| Metagross | Clear Body | Expert Belt | Meteor Mash / Zen Headbutt / Earthquake / Bullet Punch | Physical Steel / Psychic priority |
| Rotom | Levitate | Sitrus Berry | Volt Switch / Shadow Ball / Will-O-Wisp / Thunder Wave | Special Electric / Ghost pivot |
| Beheeyem | Analytic | Assault Vest | Psychic / Thunderbolt / Energy Ball / Shadow Ball | Slow special Psychic coverage |
| Porygon-Z | Adaptability | Silk Scarf | Tri Attack / Dark Pulse / Ice Beam / Thunderbolt | Special mechanical Normal coverage |

Representative lineups F95 (1000 draws): Beheeyem / Klinklang / Metagross: 14.3%; Klinklang / Porygon-Z / Rotom: 12.6%; Klinklang / Metagross / Porygon-Z: 12.5%.
Lead frequency: Klinklang: 34.5%; Beheeyem: 15.9%; Rotom: 13.9%. Last frequency: Klinklang: 33.9%; Beheeyem: 14.8%; Porygon-Z: 14.4%. Ace inclusion: 100.0%. selectionRules success: 100.0%. Gimmick carrier: 없음.
Design Notes: Mechanical officer: Klinklang 공식 대표 에이스, Gear Grind·마비·강한 즉시 공격, 기계/강철·전기·에스퍼·Porygon-Z 특수전. Expert ceiling과 도구로 비오보다 상위 등급을 표현한다. Shift Gear는 현재 AI 미지원이어서 넣지 않았다. Giga Impact는 실제 재충전 위험을 감수하는 선택이다.

### 게치스 — plasma-boss-ghetsis

Category: boss. Power Tier: Champion+. Ace: Hydreigon. AI Tier: expert. Gimmick: 없음.
Candidates: Hydreigon, Cofagrigus, Eelektross, Seismitoad, Kingambit, Bouffalant. selectionRules: `{}`.
Official-use confirmation: Hydreigon, Cofagrigus, Eelektross, Seismitoad, Bouffalant.
Tower expansion / individual use unconfirmed / evolved adaptation: Kingambit.
기존 후보: Eelektross, Hydreigon, Cofagrigus, Kyurem.
Concept: 전설 없이 강압적인 혼합 견제.

| Pokémon | Ability | Item | Moves | Role |
|---|---|---|---|---|
| Hydreigon | Levitate | Life Orb | Dark Pulse / Draco Meteor / Fire Blast / Flash Cannon | Boss special Dragon / Dark wallbreaker |
| Cofagrigus | Mummy | Leftovers | Shadow Ball / Body Press / Energy Ball / Will-O-Wisp | Ghost wall / burn |
| Eelektross | Levitate | Assault Vest | Thunderbolt / Flamethrower / Giga Drain / Drain Punch | Bulky Electric mixed coverage |
| Seismitoad | Water Absorb | Sitrus Berry | Earth Power / Scald / Sludge Wave / Toxic | Water immunity / Ground coverage |
| Kingambit | Defiant | Black Glasses | Iron Head / Knock Off / Sucker Punch / Swords Dance | Dark / Steel setup and priority |
| Bouffalant | Reckless | Assault Vest | Head Charge / Earthquake / Megahorn / Stone Edge | Bulky Normal breaker / Grass immunity |

Representative lineups F96 (1000 draws): Hydreigon / Kingambit / Seismitoad: 13.2%; Bouffalant / Hydreigon / Seismitoad: 13.1%; Cofagrigus / Hydreigon / Seismitoad: 11.3%.
Lead frequency: Hydreigon: 30.0%; Seismitoad: 15.3%; Bouffalant: 14.4%. Last frequency: Hydreigon: 34.8%; Seismitoad: 16.8%; Cofagrigus: 13.4%. Ace inclusion: 100.0%. selectionRules success: 100.0%. Gimmick carrier: 없음.
Design Notes: Champion+ regular boss: Hydreigon Life Orb와 Draco Meteor/Fire Blast/Flash Cannon, Cofagrigus 화상, Eelektross 견제, Seismitoad 물 무효, Kingambit 강철/우선기, Bouffalant 물리. Kyurem을 제거하고 공식 BW 대표 팀을 진화형 한 자리만 보완했다. N과 달리 전설 없이 혼합 coverage로 압박한다.

### N — named-n

Category: hidden. Power Tier: Hidden Boss / Champion+. Ace: Zekrom. AI Tier: expert. Gimmick: 없음.
Candidates: Zekrom, Carracosta, Archeops, Vanilluxe, Klinklang, Zoroark. selectionRules: `{}`.
Official-use confirmation: Zekrom, Carracosta, Archeops, Vanilluxe, Klinklang, Zoroark.
Tower expansion / individual use unconfirmed / evolved adaptation: 없음.
기존 후보: 개별 runtime 없음.
Concept: 전설과 하나 동료의 상징적인 히든 조우.

| Pokémon | Ability | Item | Moves | Role |
|---|---|---|---|---|
| Zekrom | Teravolt | Expert Belt | Bolt Strike / Dragon Claw / Zen Headbutt / Crunch | Legendary physical Dragon / Electric core |
| Carracosta | Sturdy | White Herb | Waterfall / Stone Edge / Aqua Jet / Shell Smash | Physical Water setup / priority |
| Archeops | Defeatist | Sitrus Berry | Stone Edge / Dual Wingbeat / Earthquake / U-turn | Fast Flying / Rock pivot |
| Vanilluxe | Weak Armor | Never-Melt Ice | Ice Beam / Water Pulse / Flash Cannon / Ice Shard | Special Ice / priority without partner snow interference |
| Klinklang | Clear Body | Sitrus Berry | Gear Grind / Wild Charge / Giga Impact / Thunder Wave | Mechanical Steel pressure / speed control |
| Zoroark | Illusion | Focus Sash | Dark Pulse / Flamethrower / Focus Blast / Nasty Plot | Illusion special pressure / setup |

Representative lineups F100 (1000 draws): Archeops / Zekrom / Zoroark: 13.6%; Carracosta / Vanilluxe / Zekrom: 12.8%; Archeops / Vanilluxe / Zekrom: 12.0%.
Lead frequency: Zekrom: 34.4%; Zoroark: 16.0%; Vanilluxe: 15.5%. Last frequency: Zekrom: 32.9%; Vanilluxe: 16.1%; Zoroark: 14.7%. Ace inclusion: 100.0%. selectionRules success: 100.0%. Gimmick carrier: 없음.
Design Notes: Hidden Boss: Pokémon Black의 N에 대응하는 Zekrom을 단일 대표로 선택했다. 기존 roster/이미지/엔진 자산을 사용하며 새 variant 시스템은 없다. 물리 Dragon/Electric은 특수 Dark/Dragon 게치스와 다르다. 50층은 기존 전설 제한을 지켜 비전설 5후보/Zoroark 에이스, 100층은 Zekrom 포함 6후보다. Vanilluxe는 동료의 방어를 불필요하게 강화하지 않는 Weak Armor를 사용한다. N은 legacy 랜덤 네임드·일반 NPC·조직 추첨 풀에 없다.

## 이상치 분류와 남은 제약

A candidate/B lineup/C lead-last/D moves/E item/F AI usage/G gimmick/H benchmark/I legendary로 구분했다. 초기 dead-slot 문제는 D/F였고, 위의 소규모 교체 후 실제 기술 실행을 확인했다. 고정 3마리 붕괴·규칙 실패·기믹 불작동은 없다. 추가 검사로 확인되는 타입별 승률 차이는 H, 의도된 수비/속도 차이는 A/B 스타일이다. 지원되는 조건부 기술의 실행 0회는 별도 기록하고 표본 부족·행동 기회와 구분한다.

변화기·Return 라벨·Freeze-Dry 특수 타입 이득 등 현재 공통 scorer의 한계는 이번 데이터 안에서 우회했다. 상위 전투 위계는 설계 등급·AI ceiling·역할·도구로 표현하며 이 고정 benchmark의 승률 순위와 동일하다고 주장하지 않는다. 승률을 맞추기 위한 반복 튜닝은 하지 않았다.

## 다른 지방 보존

하나 범위 밖 runtime/검토 원본 229행 각각 baseline SHA-256 일치. 관동·성도·호연·신오를 포함한다. 공통 AI/선출/기믹 엔진/층별 성장/히든보스 이벤트 엔진 10개 파일 해시도 동일하다. 신오 Trick Room 금지와 모든 기존 샘플을 유지했다. 테스트의 이전 전역 개수/기믹 가정만 새 하나 범위에 맞췄고, 새로운 보존 fixture는 변경 전 baseline에서 계산했다.

## 검증과 재현

- `node --import tsx scripts/review-unova-npc-samples.ts` → `node scripts/export-normal-npc-runtime.mjs` → `--check`.
- `node --import tsx scripts/simulate-unova-npcs.ts`: 기본 focused/lineup.
- `UNOVA_OUTPUT=.../route`와 `--route-only`: 현재 common ranks·100층 경로 및 히든 관문.
- Before는 `NPC_BALANCE_BASELINE=.../baseline-runtime.json`, `UNOVA_METADATA_BASELINE=.../baseline-metadata.json`을 설정하고 `node --import ./scripts/lib/unova-baseline.mjs --import tsx scripts/simulate-unova-npcs.ts --before` 실행. metadata와 runtime을 함께 복원하며 live 파일을 교체하지 않는다.
- `UNOVA_NPCS`, `UNOVA_SEEDS`, `UNOVA_SEED_START`, `UNOVA_RULES`, `UNOVA_DRAWS`, `UNOVA_TRACES`, `UNOVA_OUTPUT`으로 표본과 저장 경로를 지정한다.
- `node --import tsx scripts/report-unova-npcs.ts`는 before/after·커버리지·위계·route 표본 수와 오류를 확인한 뒤 이 문서와 `artifacts/reports/npc/unova-audit.json`을 생성한다.

### 최종 실제 실행 결과

- 전체 단위·통합 테스트: 917개 통과, 실패 0 (tsx --test --test-concurrency=4 tests/*.test.ts)
- 하나지방·선출·히든보스·기믹 집중 테스트: 50개 통과, 실패 0
- 브라우저 회귀 테스트: 28개 통과: 하나지방 24개 + 기존 관동·성도 히든보스 4개
- Production build: Next.js production build 통과 (windows-build-links.cjs 사용)
- TypeScript 및 runtime export: tsc --noEmit 통과, export --check 255행 일치
- 실제 전투 시뮬레이션: focused Before 2,016전 / After 2,304전, 추가 커버리지 1,536전, 위계 960전, 각 오류 0
- 현재 경로 전후 비교: Before 2,400전 / After 2,400전 + N 히든 48전, 각 오류 0
- 선출 telemetry: 70,000회 추첨, 후보 144슬롯 모두 실제 선출, Ace 포함·선출 규칙 100% 충족
- 기술·기믹 제한: Trick Room 사용 NPC = 0, scoped NPC 기믹 배정·발동 0
- 보존 검증: 범위 밖 runtime·검토 원본 229행과 공통 정책·엔진 파일 10개 해시 일치

**하나지방 필수 NPC 샘플 완료**
