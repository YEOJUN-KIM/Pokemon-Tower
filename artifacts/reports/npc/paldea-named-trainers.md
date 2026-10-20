# 팔데아 NPC 14종과 공통 Advanced Switch Evaluation

기준 HEAD: `ed0de99a8e1d9b7f2a8c9720572854daa004b294`. 2026-10-19 검증. 사용자 지정 42개 빌드를 현재 Showdown 0.11.11에서 검증했고 임의 대체한 기술/특성은 없다. 묘두기의 선택 가능 고스트 기술은 합법적인 Shadow Sneak, 특성은 Fluffy, 루가루암은 한낮 Lycanroc/Keen Eye로 확정했다.

## 샘플·경로·보존

실제 카탈로그는 관장 6명·사천왕 4명·테사·네모의 12명이다. AI 올림/투로는 `paldeaEventSamples`로 별도 제공한다. 두 이벤트 빌드도 같은 검증/팩킹 경로로 생성되지만 일반 조우·지역 관문·랜덤 트레이너에 등록하지 않는다. 코라이돈·미라이돈과 새 보스 페이즈는 추가하지 않았다. 단풍·관장 청목·스타단·페퍼를 팔데아의 새 목록에 넣지 않았다. 기존 스타단 캠페인 저장 데이터용 메타데이터는 보존하되 팔데아 지역의 조직 후보는 비웠다. 기존 일반 조직 시스템은 독립적으로 유지된다.

팔데아 챕터의 정규 챔피언은 테사이고 챕터 승리 뒤 기존 확정 히든보스 이벤트가 네모를 생성한다. 50/100층 모두 테사 → 이벤트 → 완전 회복된 동일 팀으로 네모 → 챕터 완료를 검사했다.

1~8세대의 실제 reviewed/runtime 데이터 행은 기준 HEAD와 동일한 SHA-256으로 검사한다. 이전 데이터/AI 버전의 보존 suite는 `pre-paldea-preservation.ts`에서 허용된 9세대 행·공용 설정의 기준 스냅샷만 복원하여 기존 체크섬을 유지한다. 이 호환 reader를 사용하지 않는 별도 Paldea 보존 테스트가 현재 1~8세대 행을 직접 검증한다. 새 고급 교체가 적용된 새 전투는 행동이 달라질 수 있다. 기존 저장 설정에는 새 플래그를 소급해서 붙이지 않으며 기존 Pivot v1, 가라르 에이스 판단과 과거 factory를 유지한다.

## 최종 목록

| NPC | 분류 / AI | 선봉 → 중견 → 에이스 | 테라 대상 / 타입 | 핵심 |
|---|---|---|---|---|
| 콜사 | gym / tactical | Breloom → Arboliva → Sudowoodo | Sudowoodo / Grass | 수면 + 넘치는씨 그래스필드 + 풀 테라 개척하기 |
| 모야모 | gym / tactical | Kilowattrel → Bellibolt → Mismagius | Mismagius / Electric | 전기 운영 + 부유 전기 테라 무우마직 |
| 곤포 | gym / tactical | Pelipper → Clawitzer → Crabominable | Crabominable / Water | 비 + 메가런처 + 물 테라 집게해머 |
| 라임 | gym / tactical | Mimikyu → Houndstone → Toxtricity | Toxtricity / Ghost | 상태이상 + 성묘 + 음파 기술 |
| 리파 | gym / tactical | Espathra → Gallade → Florges | Florges / Psychic | 특방 하락 + 예리함 물리 중견 + 에스퍼 테라 |
| 그루샤 | gym / tactical | Frosmoth → Cetitan → Altaria | Altaria / Ice | 순풍 + 물리 압박 + 얼음 테라 |
| 칠리 | elite / expert | Donphan → Camerupt → Clodsire | Clodsire / Ground | 설치 + 안정적인 땅 운영 + 저수 토오 |
| 뽀삐 | elite / expert | Copperajah → Corviknight → Tinkaton | Tinkaton / Steel | 강철 내구 + 철벽 바디프레스 + 거대해머 |
| 청목 | elite / expert | Staraptor → Altaria → Flamigo | Flamigo / Flying | 위협 + 스카프 유턴 + 효율적 공격 |
| 팔자크 | elite / expert | Noivern → Haxorus → Baxcalibur | Baxcalibur / Dragon | 순풍 + 용의춤 + 드래곤 테라 |
| 테사 | champion / expert | Glimmora → Espathra → Kingambit | Kingambit / Dark | 킬라플로르 설치 → 특방 압박 → 총대장 피니시 |
| 네모 | hidden / expert | Lycanroc → Pawmot → Meowscarada | Meowscarada / Grass | 설치 + Volt Switch/U-turn + 변환자재 + 적극적 상성 운영 |
| AI 올림 | event / expert | Scream Tail → Flutter Mane → Roaring Moon | 없음 | 쾌청 + 고대활성 + 고동치는달 피니시 |
| AI 투로 | event / expert | Iron Bundle → Iron Hands → Iron Valiant | 없음 | 개별 화력 + 쿼크차지 + 최종 무쇠무인 |

프로젝트의 실행 AI tier 이름은 Basic/Tactical/Expert다. Elite 이상 고급 교체는 별도의 capability flag로 표현한다. 팔데아 사천왕은 Expert + Advanced, 네모는 Expert + 적극적 Advanced, 관장은 Tactical, 테사/이벤트는 Expert + 보스 순서 정책이다. 각 build는 일반 도구를 유지하며 테라가 활성화되는 층은 기존 규칙(관장/사천왕 55층 이후, 챔피언/히든 50층 이후)을 따른다.

## 각 파티의 확정 빌드

### 콜사

| 역할 / 포켓몬 | 특성 | 도구 | 기술 |
|---|---|---|---|
| lead / Breloom | Poison Heal | Toxic Orb | Spore / Bullet Seed / Mach Punch / Rock Tomb |
| middle / Arboliva | Seed Sower | Sitrus Berry | Energy Ball / Earth Power / Dazzling Gleam / Leech Seed |
| ace / Sudowoodo | Sturdy | Expert Belt | Trailblaze / Stone Edge / Fire Punch / Sucker Punch |

### 모야모

| 역할 / 포켓몬 | 특성 | 도구 | 기술 |
|---|---|---|---|
| lead / Kilowattrel | Wind Power | Focus Sash | Thunderbolt / Hurricane / Tailwind / Volt Switch |
| middle / Bellibolt | Electromorphosis | Leftovers | Parabolic Charge / Muddy Water / Reflect / Sucker Punch |
| ace / Mismagius | Levitate | Expert Belt | Tera Blast / Shadow Ball / Mystical Fire / Energy Ball |

### 곤포

| 역할 / 포켓몬 | 특성 | 도구 | 기술 |
|---|---|---|---|
| lead / Pelipper | Drizzle | Sitrus Berry | Hurricane / Surf / U-turn / Tailwind |
| middle / Clawitzer | Mega Launcher | Life Orb | Water Pulse / Dark Pulse / Dragon Pulse / Aura Sphere |
| ace / Crabominable | Iron Fist | Punching Glove | Crabhammer / Ice Hammer / Drain Punch / Thunder Punch |

### 라임

| 역할 / 포켓몬 | 특성 | 도구 | 기술 |
|---|---|---|---|
| lead / Mimikyu | Disguise | Sitrus Berry | Will-O-Wisp / Play Rough / Shadow Sneak / Swords Dance |
| middle / Houndstone | Fluffy | Spell Tag | Last Respects / Play Rough / Crunch / Shadow Sneak |
| ace / Toxtricity | Punk Rock | Throat Spray | Overdrive / Boomburst / Hex / Sludge Bomb |

### 리파

| 역할 / 포켓몬 | 특성 | 도구 | 기술 |
|---|---|---|---|
| lead / Espathra | Opportunist | Focus Sash | Lumina Crash / Dazzling Gleam / Reflect / Shadow Ball |
| middle / Gallade | Sharpness | Life Orb | Psycho Cut / Sacred Sword / Leaf Blade / Night Slash |
| ace / Florges | Flower Veil | Sitrus Berry | Psychic / Moonblast / Energy Ball / Calm Mind |

### 그루샤

| 역할 / 포켓몬 | 특성 | 도구 | 기술 |
|---|---|---|---|
| lead / Frosmoth | Ice Scales | Focus Sash | Ice Beam / Bug Buzz / Tailwind / Quiver Dance |
| middle / Cetitan | Thick Fat | Assault Vest | Ice Spinner / Liquidation / Earthquake / Ice Shard |
| ace / Altaria | Natural Cure | Never-Melt Ice | Ice Beam / Dragon Pulse / Moonblast / Hurricane |

### 칠리

| 역할 / 포켓몬 | 특성 | 도구 | 기술 |
|---|---|---|---|
| lead / Donphan | Sturdy | Rocky Helmet | Stealth Rock / Earthquake / Knock Off / Ice Shard |
| middle / Camerupt | Solid Rock | Assault Vest | Earth Power / Flamethrower / Flash Cannon / Ancient Power |
| ace / Clodsire | Water Absorb | Leftovers | Earthquake / Poison Jab / Toxic / Recover |

### 뽀삐

| 역할 / 포켓몬 | 특성 | 도구 | 기술 |
|---|---|---|---|
| lead / Copperajah | Sheer Force | Sitrus Berry | Stealth Rock / Heavy Slam / Play Rough / High Horsepower |
| middle / Corviknight | Pressure | Leftovers | Iron Defense / Body Press / Brave Bird / Roost |
| ace / Tinkaton | Mold Breaker | Air Balloon | Gigaton Hammer / Play Rough / Knock Off / Brick Break |

### 청목

| 역할 / 포켓몬 | 특성 | 도구 | 기술 |
|---|---|---|---|
| lead / Staraptor | Intimidate | Choice Scarf | Brave Bird / Close Combat / U-turn / Double-Edge |
| middle / Altaria | Natural Cure | Sitrus Berry | Draco Meteor / Hurricane / Flamethrower / Ice Beam |
| ace / Flamigo | Scrappy | Life Orb | Brave Bird / Close Combat / Throat Chop / Liquidation |

### 팔자크

| 역할 / 포켓몬 | 특성 | 도구 | 기술 |
|---|---|---|---|
| lead / Noivern | Infiltrator | Focus Sash | Draco Meteor / Hurricane / Taunt / Tailwind |
| middle / Haxorus | Mold Breaker | Lum Berry | Dragon Dance / Outrage / Earthquake / Iron Head |
| ace / Baxcalibur | Thermal Exchange | Dragon Fang | Glaive Rush / Icicle Crash / Earthquake / Ice Shard |

### 테사

| 역할 / 포켓몬 | 특성 | 도구 | 기술 |
|---|---|---|---|
| lead / Glimmora | Toxic Debris | Focus Sash | Stealth Rock / Sludge Wave / Earth Power / Energy Ball |
| middle / Espathra | Opportunist | Life Orb | Lumina Crash / Dazzling Gleam / Shadow Ball / Calm Mind |
| ace / Kingambit | Supreme Overlord | Black Glasses | Kowtow Cleave / Iron Head / Sucker Punch / Swords Dance |

### 네모

| 역할 / 포켓몬 | 특성 | 도구 | 기술 |
|---|---|---|---|
| lead / Lycanroc | Keen Eye | Focus Sash | Stealth Rock / Accelerock / Stone Edge / Close Combat |
| middle / Pawmot | Iron Fist | Punching Glove | Double Shock / Close Combat / Ice Punch / Volt Switch |
| ace / Meowscarada | Protean | Life Orb | Flower Trick / Knock Off / U-turn / Sucker Punch |

### AI 올림

| 역할 / 포켓몬 | 특성 | 도구 | 기술 |
|---|---|---|---|
| lead / Scream Tail | Protosynthesis | Heat Rock | Sunny Day / Reflect / Psychic / Play Rough |
| middle / Flutter Mane | Protosynthesis | Life Orb | Moonblast / Shadow Ball / Mystical Fire / Power Gem |
| ace / Roaring Moon | Protosynthesis | Booster Energy | Dragon Dance / Crunch / Acrobatics / Earthquake |

### AI 투로

| 역할 / 포켓몬 | 특성 | 도구 | 기술 |
|---|---|---|---|
| lead / Iron Bundle | Quark Drive | Focus Sash | Freeze-Dry / Hydro Pump / Ice Beam / Encore |
| middle / Iron Hands | Quark Drive | Assault Vest | Drain Punch / Thunder Punch / Ice Punch / Earthquake |
| ace / Iron Valiant | Quark Drive | Booster Energy | Moonblast / Close Combat / Psyshock / Shadow Ball |

## 공통 교체 평가 구조

`switch-evaluation.ts`가 기존 PivotPolicy 내부의 위협 구성·현재 위험·후속 위험·공격 압박·진입 비용 비교를 재사용 가능한 `evaluateSwitchCandidates`로 확장한다. 기존의 `pivotEntryCosts`, `npcAttackDamage`, `npcCanFinish` 함수는 공유한다. 과거 PivotPolicy의 행동 순서는 저장 호환을 위해 남기고 새 `AdvancedSwitchPolicy`가 공통 평가 결과를 피벗과 직접 교체 양쪽에 사용한다.

반환값은 현재 위험, 공개 위협 후보, 추천 후속/전체 통과 후보, 후속 위험, 남은 HP, entry damage/status/speed/독압정 흡수 이익, 공격 압박, net improvement다. 공개된 직전 공격은 1.0, 같은 상대가 공개한 다른 공격은 0.65, 추정 STAB은 0.35로 가중한다. 상대 실능력치·비공개 기술/도구/특성·이번 턴 선택은 읽지 않는다. 상대 종족값 기반 추정이므로 KO·속도는 보수적 추정이며 실제 확정을 미리 아는 방식이 아니다.

현재 위험 ≥0.22(네모 0.18) 또는 HP 대비 치명 위험이어야 한다. 후보는 후속 위험이 현재의 65% 이하(네모 72%), 최소 0.15 개선(네모 0.12), 진입 비용 후에도 순이득 >0, 상대 공격을 견딜 남은 HP, 즉시 공격 압박이 있어야 한다. 진입 후 HP ≤25% 후보는 제외한다. 점수는 후속 위험 + entry cost − 공격 압박 보너스(최대 0.15)다. 자기 부유·저수·풍선 등도 예상 공격 위험에 반영한다.

새 Expert 설정 중 Elite/Master 일반 NPC와 Elite/Champion 역할에 명시적인 `advancedSwitch` 플래그를 부여한다. Basic/Tactical의 공통 교체 방식은 유지한다. 가라르 금랑/단델의 새 전투에도 적용하되 옛 `pivot:v1`만 저장된 전투는 종전 판단으로 복원한다. 네모는 적극적 옵션을 사용하고, 테사는 fixed order 보스 플랜을 우선하므로 일반 스왑을 사용하지 않는다.

## 행동 우선순위와 반복 억제

1. 보수적 예상 KO가 가능한 일반 공격 우선. 명중률/최소 다단 수/0.85 피해 여유를 쓰며 충전기와 조건부 선제기는 이 KO 보장 후보에서 제외한다.
2. 위험 + 좋은 후속이 있으면 안전하게 적중하는 U-turn/Volt Switch로 피해를 준 뒤 그 후속을 지정한다. 두 피벗이 가능하면 예상 피해가 높은 기술을 우선한다.
3. 피벗 부재/무효/공격 전에 사망 위험이면 동일한 최적 후보로 직접 교체한다. 선후공, 공개 우선도, 자기 마비·스피드 변화·스카프·온전한 기합의띠와 공개 다단 히트를 고려한다.
4. 순이득 후보가 없거나 유리한 대면이면 공격한다. 거절된 후보가 내부 옛 정책을 통해 다시 선택되지 않도록 stay fallback에서 자발 교체를 제거한다.

Volt Switch는 땅 및 공개된 전기 면역 특성을 필터링한다. 마지막 피벗/직접 교체에서 3턴 간격을 공유하고, 전투당 자발 이탈 최대 6회/피벗 최대 4회다. KO용 피벗은 KO 우선 규칙으로 별도 처리한다. 네모 선봉은 온전한 기합의띠로 첫 Stealth Rock 행동을 확보하되 KO 우선은 유지한다. 현재 자기 변환자재 타입은 공개 typechange에서 읽고 퇴장 시 초기화한다.

## Hazard 비용

- Stealth Rock: 바위 상성 × 최대 HP 1/8.
- Spikes: 접지 시 1/8, 1/6, 1/4. 즉사 및 진입 후 저HP 후보 제외.
- Toxic Spikes: 감염 가능하면 독 0.08/맹독 0.16 미래 비용. 기존 상태·독/강철 타입·관련 면역·Poison Heal/Magic Guard의 HP 비용을 구분.
- Sticky Web: 0.05, 추정 선공권 상실이면 0.14. 하락 방지 특성/클리어참 반영.
- 비행·부유·풍선은 접지 hazard 면역, 검은철구는 접지. Stealth Rock은 별도. Boots는 진입 피해·독·Web 면제. Magic Guard는 피해 비용을 없애지만 Web 비용은 유지.
- 접지 독 타입의 독압정 제거는 층당 0.06 이익. Boots 착용 독 타입의 흡수도 반영.

실제 HP 손실과 상태/속도 비교 비용은 별개이며 수치는 후보 비교용이다. 일반 직접 교체와 피벗에 같은 함수를 사용한다.

## 테사·네모·이벤트 및 테라 판단

테사는 Glimmora → Espathra → Kingambit 순서를 강제하고 자발 교체를 억제한다. 선봉 Stealth Rock/독치장, 중견 Lumina Crash, 마지막 총대장(앞선 사망 수)과 악 테라를 사용한다. 네모는 Lycanroc 설치 후 Pawmot/Meowscarada의 피벗과 직접 교체를 상황에 맞춰 사용한다. 회생의기도는 없다.

각 테라 샘플은 지정 에이스만 요청을 받으며 도구를 유지한다. 정책은 해당 테라 공격의 추가 피해, KO, 남은 아군과 공격 유지 가치를 보고 선택한다. 일반적인 초기 비테라 턴과 상태기 우선 턴도 존재한다. 마스카나는 풀 테라 Flower Trick 화력을 평가하고 테라 후 U-turn 점수를 낮춘다. Tera Blast는 실제 테라 타입으로 피해/면역을 평가한다. 전기 테라 Mismagius의 부유를 실제 엔진에서 확인했다.

올림/투로는 고정된 3인 이벤트 build이며 테라 요청이 없다. 올림은 Sunny Day/Heat Rock + Protosynthesis, 투로는 Booster Energy + Quark Drive를 사용한다. 현재 기본 엔진이 9세대 Protean을 처리하므로 등장당 최초 기술에서만 타입이 변하고 재진입하면 초기화된다. 실제 연속 기술/퇴장/재진입 테스트가 통과했다.

## 시뮬레이션 결과

기본 14명 × 2층 × 4파티 × 8 seed = 896전. 네모 hazard 전용 파티 16전을 별도로 더해 총 912전, 오류 0건. 플레이어는 동일한 3인 파티·층별 육성·일반 도구·기믹 없는 정책으로 비교했다. 파티는 starters, offense(Garchomp/Metagross/Lapras), bulk(Slowbro/Corviknight/Gastrodon), signature(Mimikyu/Kommo-o/Gyarados). hazard 전용은 Skarmory/Garchomp/Lapras이며 첫 Stealth Rock/Spikes 시도를 지정한다. 각 NPC/층 offense seed 1 리플레이 28개를 재생 검증했다.

아래 승률과 테라 수의 분모는 각 층 32전(네모도 hazard 추가분 제외)이다. 에이스 등장 전 승리/사망으로 테라를 쓰지 못한 전투도 분모에 포함한다.

| NPC | 중반 층 / 승률 | 후반 층 / 승률 | 테라 사용 전투 (중반 → 후반) |
|---|---|---|---|
| 콜사 | 45 / 43.75% | 95 / 50.00% | 0/32 → 24/32 |
| 모야모 | 45 / 100.00% | 95 / 100.00% | 0/32 → 24/32 |
| 곤포 | 45 / 59.38% | 95 / 65.63% | 0/32 → 11/32 |
| 라임 | 45 / 71.88% | 95 / 71.88% | 0/32 → 15/32 |
| 리파 | 45 / 93.75% | 95 / 96.88% | 0/32 → 8/32 |
| 그루샤 | 45 / 40.63% | 95 / 75.00% | 0/32 → 12/32 |
| 칠리 | 45 / 43.75% | 95 / 96.88% | 0/32 → 32/32 |
| 뽀삐 | 45 / 46.88% | 95 / 31.25% | 0/32 → 24/32 |
| 청목 | 45 / 71.88% | 95 / 84.38% | 0/32 → 17/32 |
| 팔자크 | 45 / 93.75% | 95 / 100.00% | 0/32 → 32/32 |
| 테사 | 50 / 75.00% | 100 / 71.88% | 14/32 → 23/32 |
| 네모 | 50 / 81.25% | 100 / 78.13% | 32/32 → 26/32 |
| AI 올림 | 75 / 100.00% | 95 / 93.75% | 0/32 → 0/32 |
| AI 투로 | 75 / 96.88% | 95 / 87.50% | 0/32 → 0/32 |

## 네모 집중 감사

| 측정 | 기본 64전 | hazard 전용 16전 | 합계 80전 |
|---|---:|---:|---:|
| U-turn 실제 사용 | 3 | 0 | 3 |
| Volt Switch 실제 사용 | 1 | 0 | 1 |
| 일반 직접 교체 | 69 | 16 | 85 |
| hazard 비용이 있는 교체 승인 | 0 | 16 | 16 |
| KO를 버린 교체 | 0 | 0 | 0 |
| 순이득 없는 교체 | 0 | 0 | 0 |
| 3턴 이내 반복 이탈 | 0 | 0 | 0 |
| 선공기 실제 사용 시도 | 32 | 0 | 32 |

변환자재 공개 발동 전투 8/80, 풀 테라 전투 68/80. 테라를 먼저 쓴 전투에서는 변환자재가 발동하지 않는 것이 정상이다. 선공기는 사용 시도 횟수이며 기습 성공 횟수와 동일하지 않다. 이번 표본에서는 직접 교체가 피벗보다 많았다. KO/선후공/안전한 후속 조건을 만족할 때만 피벗하므로 사용 빈도를 높이기 위한 보너스는 추가하지 않았다.

모든 기록된 Advanced 이탈에서 KO 불가, 순이득 양수, 진입 후 HP>25%, 후속이 예상 공격을 견디는 조건과 3턴 간격을 다시 검사했다. 이는 이 평가 모델에 대한 감사이며 상대 숨은 선택까지 고려한 최적해라는 주장은 아니다. 유리한 대면 유지/KO 우선/Volt 무효/느린 피벗 사망 위험/진입 즉사/진입 후 20%/Boots/Web/독압정 제거는 인공 상황으로도 검사한다. 피벗 없는 Elite의 직접 교체는 실제 엔진에서 Dragon 위협을 받고 Aegislash로 전환하고 리플레이하는 테스트가 통과했다.

## 기믹 사용과 이상 행동

| 기믹 | 해당 NPC의 발생 전투 수 |
|---|---:|
| 콜사 Spore | 31/64 |
| Poison Heal | 13/64 |
| Seed Sower | 47/64 |
| 모야모 Electromorphosis | 63/64 |
| 곤포 Drizzle | 64/64 |
| 라임 Throat Spray | 54/64 |
| 리파 Lumina Crash | 30/64 |
| 그루샤 Tailwind | 49/64 |
| 칠리 Stealth Rock | 58/64 |
| 뽀삐 Iron Defense | 16/64 |
| 청목 U-turn | 0/64 |
| 팔자크 Dragon Dance | 10/64 |
| 테사 Stealth Rock | 64/64 |
| 테사 Toxic Debris | 32/64 |
| 테사 Supreme Overlord | 37/64 |
| 네모 Stealth Rock | 80/80 |
| 올림 Sunny Day | 64/64 |
| 올림 Protosynthesis | 64/64 |
| 투로 Quark Drive | 15/64 |

기존 중복 설치/변화기/반복 피벗 탐지 경고 1건. 모든 테라 실제 이벤트의 대상은 지정 에이스, 이벤트 교수는 테라 0건이다. 미구현 기술/특성은 확인되지 않았다. 다만 고정된 4파티·각 층 32전은 실제 PvP 분포가 아니다. 모야모·리파·팔자크·칠리 후반과 교수 샘플의 높은 승률은 추가 대진/상태 운영 검토 후보이고, 일부 표본에서 100%가 나와도 보편 승률로 일반화하지 않는다. 낮은 청목 U-turn/뽀삐 설치 사용률도 추가 대진으로 확인할 수 있다. 지정 빌드나 층 배치·상대방 능력치를 승률 숫자에 맞춰 변경하지 않았다.

## 수정 파일과 검증

- 데이터/생성: `scripts/build-paldea-npc-samples.ts`, `scripts/data/npc/paldea-design.json`, `scripts/data/npc/normal-npc-samples.json`, `src/data/normal-npc-templates.json`, `src/data/paldea-trainers.ts`. runtime은 기존 exporter의 projection을 사용한다.
- 등록/저장 설정: `src/data/trainer-catalog.ts`, `src/data/tower-themes.ts`, `src/data/npc-ai.ts`, `src/data/npc-gimmicks.ts`, `src/data/villain-organizations.ts`.
- AI: `src/battle/switch-evaluation.ts`, `advanced-switch-policy.ts`, `paldea-policy.ts`, `npc-policy.ts`, `pivot-policy.ts`, `policy.ts`. 마지막 두 파일은 공개 자기 타입을 선택적으로 전달하는 확장으로, 플래그 없는 과거 입력 동작을 유지한다.
- 스프라이트: `scripts/import-paldea-trainer-sprites.mjs`, `public/sprites/trainers/{sada-ai,turo-ai}.png`, `sources.json`의 출처/작가.
- 검증/기록: `tests/paldea-npcs.test.ts`, 두 Paldea 보존 fixture와 reader, 기존 지역/카탈로그/템플릿/히든보스 suite의 갱신, `scripts/simulate-paldea-npcs.ts`, `scripts/report-paldea-npcs.ts`, 이 문서. 기존 가라르·알로라 보존 테스트는 현재 1~8세대 행 검증을 별도로 유지하면서 역사 스냅샷 reader에 연결했다.

경고 1건의 실제 로그(named-rika, 95층 offense seed 1)를 확인했다. 토오는 선택 요청 시 HP 97/234(41.45%)로 HP회복을 선택했고, 실행 전에 상대 라프라스의 Surf를 저수로 받아 67%가 된 뒤 회복했다. 실행 시점 HP만 보는 기존 경고기의 후보 표식이며 선택 시점의 고HP 회복 오판은 아니다. 같은 턴 상대 선택을 미리 읽어 회복을 취소하는 로직은 추가하지 않았다.

- 전체 회귀: 1163/1163 통과.
- 집중 테스트: 실제 교체·타입/테라/특성·저장/재접속·팔데아 50/100층 히든 이벤트를 포함한다.
- TypeScript: `node node_modules/typescript/bin/tsc --noEmit`.
- 빌드: Windows 링크 보조 스크립트를 사용한 Next 프로덕션 빌드. 최종 실행 로그 `artifacts/experiments/balance/raw/paldea-build.log`.
- reviewed/runtime 일치: `node scripts/export-normal-npc-runtime.mjs --check`.
- 저장/재접속: 테사 저장된 정책·악 테라 대도각참·도구·accepted public history가 디스크 재오픈 후 일치. 네모 히든 이벤트 중복 진입도 기존 receipt 규칙을 유지.

원본 912개 전체 로그/판단은 `artifacts/experiments/balance/paldea-20261019/logs.jsonl`, 통계는 `battles.json`/`summary.json`, 대표 28개 replay는 `traces/`에 있다. 재생성: `node node_modules/tsx/dist/cli.mjs scripts/report-paldea-npcs.ts`.

최종 실행 결과: TypeScript 검사, 프로덕션 빌드, reviewed/runtime projection 일치 검사 모두 통과했다. 전체 회귀와 별도로 팔데아/히든 이벤트 집중 52개 테스트도 통과했다.
