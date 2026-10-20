# 칼로스 필수 NPC 샘플

> 이 문서는 f4018e89의 최초 구현·측정 기록입니다. 현재 간피·후쿠지·즈미의 세트와 승률은 [후속 조정 보고서](kalos-npc-tuning.md)를 참고하세요. 빌런 이벤트의 실제 플레이 연결은 전체 이벤트 구현 후 진행할 예정입니다.

2026-10-18. **칼로스 필수 NPC 샘플 완료**. 관장 8명, 사천왕 4명, 챔피언 1명, 플레어단 4종: 총 17종 / Lysandre 별칭 포함 18 runtime 행.

## 구현과 정책

요청의 후보·Ace·기술·특성·도구를 우선 사용한다. 원본은 scripts/data/npc/kalos-design.json, 검토 생성기는 scripts/review-kalos-npc-samples.ts, 검토 출력은 scripts/data/npc/normal-npc-samples.json이다. export-normal-npc-runtime.mjs로 runtime을 생성한다. 15종을 수정하고 아케비·공용 조무래기 2종을 추가했다. 칼로스 범위의 기존 32행을 18개의 allFloors 후보 행으로 바꾸어 전체 runtime은 255 → 241행이다.

다른 지방과 공통 AI/v12·선출기·Mega/Z/Dynamax/Tera·floor scaling·hidden boss 엔진은 변경하지 않았다. 새 selectionRule, 전용 AI, stat cheat는 없다. 기존 Ace와 signature carrier를 보장하는 공통 선출 경로를 사용한다. 관장·사천왕은 55층부터, 챔피언·악당 보스는 50층부터 기존 기믹 제한을 따른다. 조무래기는 Mega가 없다.

후쿠지의 기존 Venusaur 강제 확장은 검토 runtime에서 제거하고 요청한 Gogoat Ace/여섯 후보를 사용한다. 비올라·고지카·파키라는 선택 Mega를 넣지 않고, 즈미는 일반 Gyarados를 유지했다. 기존 Serena 등 제외 NPC와 관련 특수 조우 데이터는 새로 구현하거나 수정하지 않았다. 파키라는 사천왕 한 버전이다.

## 요청과 다른 부분 및 이유

- Aurorus와 Cradily는 설치된 Showdown validator에서 Power Gem을 배울 수 없다. 같은 바위 특수기 Ancient Power로 교체했다. 나머지 명시 기술·특성은 합법성 검사에 통과했다.
- 선택 Mega를 쓰지 않는 Houndoom·Aggron은 Leftovers, 비올라 Scizor는 요청의 Metal Coat, 즈미 Gyarados는 Lum Berry다. 지정된 Mega 9종만 해당 Mega Stone을 지닌다.
- 첨부에서 “기존 제안”이라고만 언급한 플레어단 보조 멤버는 기존 지역 검토 세트를 재사용했다. Manectric은 Thunderbolt/Flamethrower/Volt Switch/Thunder Wave, Mightyena는 Crunch/Play Rough/Fire Fang/Sucker Punch, Malamar는 Contrary/Superpower를 중심으로 합법적 공격 세트를 사용한다. 조무래기의 일반 도구는 Sitrus Berry로 정리했다.
- Luxray의 Intimidate + Flame Orb 등 명시된 설계는 임의 최적화하지 않았다. Gallade Sharpness를 포함해 현대 National Dex 합법성을 사용하며 6세대 기술표로 제한하지 않는다.
- 아케비는 Showdown 스프라이트 목록에 없어 원작 캐릭터 아트 PNG를 사용한다. 출처와 SHA-256은 public/sprites/trainers/sources.json에 있다.

## 원작 사용과 타워 확장

[XY 관장](https://www.serebii.net/xy/gyms.shtml), [XY 사천왕·챔피언](https://www.serebii.net/xy/elitefour.shtml), [플레어단](https://www.serebii.net/xy/teamflare.shtml), [플라드리 최종 팀](https://www.serebii.net/pokearth/kalos/teamflarehq.shtml), [아케비·크세로시키](https://www.serebii.net/pokearth/kalos/lysandrelabs.shtml)을 기준으로 보수적으로 구분했다. 아래 “타워 확장/미확정”은 원작 개별 소유를 주장하지 않는다. 진화형 적용도 별도로 표시한다. 모든 배틀 세트는 요청한 현대화 타워 세트다.

아케비의 원작 직접 사용은 Mightyena/Druddigon이며, 이번 Manectric Ace는 사용자가 지정한 타워 간부 설계다. 크세로시키는 Malamar/Crobat 원작 축에 과학자 특수·상태 파트너를 더한다. 카르네는 공식 여섯 후보를 그대로 유지한다.

## Mega telemetry — Ace와 carrier

| NPC | Ace | Mega carrier | 포함 / 전체 | 도구 available | 실제 행동 available | used | 발동 턴 범위 | 이후 직접 KO | 3KO 전투 |
|---|---|---|---|---|---|---|---|---|---|
| 자크로 | Tyrantrum | Aerodactyl | 160/160 | 80 | 77 | 77 | 1–9 | 118 | 12 |
| 코르니 | Lucario | Lucario | 160/160 | 80 | 75 | 74 | 1–6 | 67 | 3 |
| 시트론 | Heliolisk | Ampharos | 160/160 | 80 | 65 | 65 | 1–8 | 37 | 0 |
| 마슈 | Sylveon | Mawile | 160/160 | 80 | 76 | 75 | 1–9 | 60 | 1 |
| 우르프 | Avalugg | Abomasnow | 160/160 | 80 | 77 | 76 | 1–11 | 79 | 0 |
| 간피 | Aegislash | Scizor | 160/160 | 80 | 80 | 80 | 1–9 | 53 | 8 |
| 드라세나 | Noivern | Altaria | 160/160 | 80 | 78 | 78 | 1–10 | 72 | 0 |
| 카르네 | Gardevoir | Gardevoir | 160/160 | 160 | 154 | 154 | 1–10 | 257 | 47 |
| 플라드리 | Gyarados | Gyarados | 160/160 | 160 | 152 | 152 | 1–7 | 206 | 23 |

9명 모두 서로 다른 Mega를 사용한다. 필수 Mega Lucario/Gardevoir/Gyarados와 권장 6종 모두 실제 발동했다. 도구 available은 팀의 Mega Stone 존재, 실제 행동 available은 own request에 합법 Mega 명령이 한 번 이상 나타난 전투, used는 공개 프로토콜의 실제 -mega 이벤트다. 초반 층에서는 carrier 선출은 보장되지만 도구가 제거되어 available=0이다. Mega 9종의 동일 1,440개 seed/벤치마크 조합을 추가 재실행해 실제 행동 기회를 수집했고 원래 winner/moveUsage/Mega 기록이 전부 동일함을 대조했다. 이 재실행은 독립 표본 수에 더하지 않았다.

발동 턴·이후 직접 KO·행동한 active decision turns·발동부터 KO/종료까지 경과 턴·전투 종료 생존 여부를 audit JSON과 개별 전투 JSONL에 기록했다. 생존 경과 턴에는 교체되어 벤치에 있던 시간이 포함될 수 있으므로 active decision turns와 구분한다. 3KO는 직접 공격으로 낸 KO만 집계하며 독 등 residual KO를 제외한다. Mega forme도 base species로 집계해 기술 usage가 갈라지지 않게 했다.

- 자크로: 사용률 96.3%, 미발동 3전. 평균 발동 후 경과 1.9턴, 종료 생존 32/77.
- 코르니: 사용률 92.5%, 미발동 6전. 평균 발동 후 경과 1.2턴, 종료 생존 22/74.
- 시트론: 사용률 81.3%, 미발동 15전. 평균 발동 후 경과 1.4턴, 종료 생존 9/65.
- 마슈: 사용률 93.8%, 미발동 5전. 평균 발동 후 경과 1.4턴, 종료 생존 13/75.
- 우르프: 사용률 95.0%, 미발동 4전. 평균 발동 후 경과 1.7턴, 종료 생존 32/76.
- 간피: 사용률 100.0%, 미발동 0전. 평균 발동 후 경과 1.8턴, 종료 생존 11/80.
- 드라세나: 사용률 97.5%, 미발동 2전. 평균 발동 후 경과 2.8턴, 종료 생존 24/78.
- 카르네: 사용률 96.3%, 미발동 6전. 평균 발동 후 경과 2.1턴, 종료 생존 78/154.
- 플라드리: 사용률 95.0%, 미발동 8전. 평균 발동 후 경과 2.8턴, 종료 생존 53/152.

available 대비 미발동은 carrier 행동 기회 부족 또는 기존 공통 AI의 타이밍 선택으로 기록한다. 특정 세트의 지속적인 0회 발동은 없다. Mega가 강하다는 이유로 약화하지 않았다. 각 Mega의 3KO 빈도가 전체 전투를 지배하지 않으며 나머지 동료의 실제 기술 실행은 usage 자료에 남아 있다.

## Dead-slot 검사

최종 focused + coverage 2,720전의 기술별 실행 횟수, 선출 전투 수, 실제 행동 전투 수와 0회 분류를 audit JSON의 usage에 기록했다. Trick Room 사용 NPC = **0명**.
0회인 회복·강화·상태·우선기·Mirror Coat는 조건부로, 공격 견제기는 상성/표본 부족으로 구분한다. 선출돼도 한 번도 행동하지 못한 후보는 기회 부족이다. 이번 최종 세트에 Choice 도구는 없으며 Choice lock 해당은 없다. 현재 scorer가 지원하는 변화기만 유지했고 AI 미지원으로 확인된 최종 슬롯은 없다. 0회 실행만으로 기술을 교체하지 않았다.

- 비올라 / Heracross: Facade (상성 / 표본 부족). 선출 104전 / 행동 64전.
- 자크로 / Tyrantrum: Crunch (상성 / 표본 부족). 선출 160전 / 행동 87전.
- 자크로 / Aurorus: Ancient Power (상성 / 표본 부족), Earth Power (상성 / 표본 부족). 선출 20전 / 행동 13전.
- 자크로 / Rhyperior: Stone Edge (상성 / 표본 부족), Megahorn (상성 / 표본 부족), Ice Punch (상성 / 표본 부족). 선출 4전 / 행동 2전.
- 자크로 / Cradily: Earth Power (상성 / 표본 부족), Recover (조건부). 선출 24전 / 행동 24전.
- 코르니 / Lucario: Extreme Speed (조건부). 선출 160전 / 행동 96전.
- 코르니 / Mienshao: Knock Off (상성 / 표본 부족). 선출 28전 / 행동 25전.
- 코르니 / Hawlucha: Poison Jab (상성 / 표본 부족). 선출 92전 / 행동 81전.
- 후쿠지 / Victreebel: Knock Off (상성 / 표본 부족). 선출 104전 / 행동 66전.
- 후쿠지 / Tangrowth: Knock Off (상성 / 표본 부족). 선출 52전 / 행동 31전.
- 후쿠지 / Leafeon: X-Scissor (상성 / 표본 부족). 선출 52전 / 행동 41전.
- 시트론 / Magnezone: Thunder Wave (조건부), Body Press (상성 / 표본 부족). 선출 16전 / 행동 14전.
- 시트론 / Rotom: Will-O-Wisp (조건부), Thunder Wave (조건부). 선출 52전 / 행동 42전.
- 시트론 / Ampharos: Focus Blast (상성 / 표본 부족). 선출 160전 / 행동 105전.
- 시트론 / Eelektross: Knock Off (상성 / 표본 부족). 선출 44전 / 행동 43전.
- 마슈 / Azumarill: Aqua Jet (조건부). 선출 60전 / 행동 58전.
- 고지카 / Espeon: Calm Mind (조건부). 선출 72전 / 행동 64전.
- 우르프 / Abomasnow: Ice Shard (조건부). 선출 160전 / 행동 138전.
- 우르프 / Mamoswine: Ice Shard (조건부). 선출 4전 / 행동 4전.
- 우르프 / Weavile: Ice Shard (조건부). 선출 40전 / 행동 32전.
- 파키라 / Talonflame: U-turn (상성 / 표본 부족). 선출 160전 / 행동 131전.
- 파키라 / Pyroar: Will-O-Wisp (조건부). 선출 28전 / 행동 20전.
- 파키라 / Torkoal: Body Press (상성 / 표본 부족). 선출 68전 / 행동 31전.
- 즈미 / Barbaracle: Cross Chop (상성 / 표본 부족). 선출 24전 / 행동 18전.
- 간피 / Aggron: Body Press (상성 / 표본 부족). 선출 44전 / 행동 25전.
- 간피 / Escavalier: Drill Run (상성 / 표본 부족). 선출 24전 / 행동 13전.
- 드라세나 / Noivern: U-turn (상성 / 표본 부족). 선출 160전 / 행동 157전.
- 드라세나 / Dragalge: Hydro Pump (상성 / 표본 부족). 선출 60전 / 행동 50전.
- 드라세나 / Goodra: Sludge Bomb (상성 / 표본 부족). 선출 20전 / 행동 15전.
- 카르네 / Hawlucha: Poison Jab (상성 / 표본 부족). 선출 84전 / 행동 50전.
- 카르네 / Tyrantrum: Crunch (상성 / 표본 부족). 선출 48전 / 행동 18전.
- 카르네 / Goodra: Sludge Bomb (상성 / 표본 부족). 선출 48전 / 행동 29전.
- 플레어단 조무래기 / Mightyena: Sucker Punch (조건부). 선출 56전 / 행동 49전.
- 플레어단 조무래기 / Manectric: Volt Switch (상성 / 표본 부족). 선출 92전 / 행동 66전.
- 플레어단 조무래기 / Crobat: Cross Poison (상성 / 표본 부족), U-turn (상성 / 표본 부족). 선출 88전 / 행동 87전.
- 플레어단 조무래기 / Liepard: Knock Off (상성 / 표본 부족). 선출 92전 / 행동 77전.
- 아케비 / Manectric: Volt Switch (상성 / 표본 부족). 선출 160전 / 행동 133전.
- 아케비 / Mightyena: Sucker Punch (조건부). 선출 60전 / 행동 51전.
- 아케비 / Crobat: Cross Poison (상성 / 표본 부족), U-turn (상성 / 표본 부족). 선출 64전 / 행동 62전.
- 아케비 / Pyroar: Will-O-Wisp (조건부). 선출 68전 / 행동 61전.
- 크세로시키 / Crobat: Cross Poison (상성 / 표본 부족), U-turn (상성 / 표본 부족). 선출 56전 / 행동 48전.
- 크세로시키 / Magnezone: Thunder Wave (조건부), Body Press (상성 / 표본 부족). 선출 40전 / 행동 35전.
- 플라드리 / Mienshao: Knock Off (상성 / 표본 부족). 선출 100전 / 행동 64전.
- 플라드리 / Pyroar: Dark Pulse (상성 / 표본 부족), Will-O-Wisp (조건부). 선출 44전 / 행동 32전.
- 플라드리 / Honchkrow: Sucker Punch (조건부). 선출 24전 / 행동 17전.
- 플라드리 / Houndoom: Sludge Bomb (상성 / 표본 부족). 선출 60전 / 행동 40전.
- 플라드리 / Crobat: Cross Poison (상성 / 표본 부족), U-turn (상성 / 표본 부족). 선출 92전 / 행동 70전.

## Before → After 및 측정 조건

동일한 네 벤치마크 starters(Charizard/Blastoise/Venusaur), offense(Garchomp/Metagross/Lapras), bulk(Slowbro/Corviknight/Gastrodon), signature(Mimikyu/Kommo-o/Gyarados)를 사용한다. focused는 seeds 1–2 × 2 floors × 4 teams × 6 player rules. 관장/사천왕/간부/조무래기 F45/F95, 카르네 F50/F100, 플라드리 F76/F96이다. coverage는 seeds 3–10/basic 추가 검사다. 각 단판은 HP가 초기화되며 사람 승률·경제·완주율을 뜻하지 않는다.

Before 72.7% (1047/1440) → After 62.7% (1023/1632). 신규 2종 때문에 합계의 표본 구성이 다르며 NPC별 수치를 비교해야 한다. coverage 45.9% (499/1088). 모든 시뮬레이션 오류 0. baseline runtime과 당시 catalog/organization 메타데이터를 loader hook으로 함께 로드해 live 파일을 교체하지 않고 비교했다.

| NPC / 스타일 | Before 플레이어 승률 | After 플레이어 승률 | 추가 coverage |
|---|---|---|---|
| 비올라 — 빠른 벌레와 다양한 복합 타입 | 85.4% (82/96) | 57.3% (55/96) | 53.1% (34/64) |
| 자크로 — 바위 내구와 강한 물리 화력 | 74.0% (71/96) | 66.7% (64/96) | 46.9% (30/64) |
| 코르니 — 격투 정면전과 메가루카리오 | 92.7% (89/96) | 70.8% (68/96) | 51.6% (33/64) |
| 후쿠지 — 풀 회복과 지속 압박 | 82.3% (79/96) | 87.5% (84/96) | 79.7% (51/64) |
| 시트론 — 전기 특수 견제와 마비·피벗 | 69.8% (67/96) | 55.2% (53/96) | 39.1% (25/64) |
| 마슈 — 페어리 특수전과 강철 물리 보완 | 76.0% (73/96) | 74.0% (71/96) | 54.7% (35/64) |
| 고지카 — 에스퍼 특수전과 회복·마비 | 78.1% (75/96) | 55.2% (53/96) | 23.4% (15/64) |
| 우르프 — 느린 얼음 내구와 눈보라·선공기 | 71.9% (69/96) | 64.6% (62/96) | 48.4% (31/64) |
| 파키라 — 불꽃 직선 화력과 특수 강화 | 79.2% (76/96) | 49.0% (47/96) | 48.4% (31/64) |
| 즈미 — 물 파동과 회복·다양한 공격 | 63.5% (61/96) | 29.2% (28/96) | 14.1% (9/64) |
| 간피 — 강철 저항과 선공기·혼합 화력 | 94.8% (91/96) | 89.6% (86/96) | 76.6% (49/64) |
| 드라세나 — 드래곤 특수전과 메가파비코리 회복 | 67.7% (65/96) | 69.8% (67/96) | 45.3% (29/64) |
| 카르네 — 공식 여섯 동료와 메가가디안 | 44.8% (43/96) | 39.6% (38/96) | 21.9% (14/64) |
| 플레어단 조무래기 — 악·독과 빠른 조직 공용 압박 | 신규 / 비교 없음 | 71.9% (69/96) | 54.7% (35/64) |
| 아케비 — 전기·불꽃 속공형 일반 간부 | 신규 / 비교 없음 | 77.1% (74/96) | 45.3% (29/64) |
| 크세로시키 — 과학자 혼합 특수전과 교란·Contrary | 88.5% (85/96) | 64.6% (62/96) | 37.5% (24/64) |
| 플라드리 — 메가갸라도스 물리 강화와 혼합 동료 | 21.9% (21/96) | 43.8% (42/96) | 39.1% (25/64) |

승률 평준화는 하지 않았다. 후쿠지·우르프의 느린 회복전, 즈미의 공격 범위, 고지카의 특수전 등 매치업 차이를 유지한다. 아케비는 전기/불꽃 속공 간부, 크세로시키는 Contrary Malamar와 전기/에스퍼/고스트 교란의 과학자로 구분한다. 플라드리는 전설 Yveltal 축을 제거하고 지정한 Gyarados Ace/공식 동료·확장 두 마리의 Champion+ 물리 축을 사용한다.

## Lineup telemetry 및 전체 세트

49,000회 추첨에서 Ace 포함(있는 NPC), Mega carrier 포함, 기존 선출 규칙 성공 100%. 각 후보 풀에서 4개 이상의 서로 다른 triple을 확인했다. 선봉/마지막/전체 조합 빈도는 JSON에 보관한다. 새 selectionRule은 없다.

### 비올라 — named-viola

Category: gym. Power: Gym. Ace: Vivillon. Mega carrier: 없음. 스타일: 빠른 벌레와 다양한 복합 타입.
기존 후보: Vivillon, Beedrill, Yanmega → 최종 후보: Vivillon, Masquerain, Heracross, Scizor, Galvantula, Yanmega.
원작 직접 사용 확인: Vivillon. 진화형 적용: Surskit → Masquerain. 타워 확장/개별 이력 미확정: Masquerain, Heracross, Scizor, Galvantula, Yanmega.

| Pokémon | Ability | Item | Moves | Role | 선출/행동 전투 |
|---|---|---|---|---|---|
| Vivillon | Compound Eyes | Focus Sash | Bug Buzz / Hurricane / Energy Ball / Quiver Dance | Special Bug/Flying / Quiver Dance | 160/125 |
| Masquerain | Intimidate | Sitrus Berry | Bug Buzz / Air Slash / Ice Beam / Giga Drain | Special Bug/Flying / coverage | 16/8 |
| Heracross | Guts | Flame Orb | Close Combat / Megahorn / Facade / Stone Edge | Physical Bug/Fighting / coverage | 104/64 |
| Scizor | Technician | Metal Coat | Bullet Punch / X-Scissor / Knock Off / Swords Dance | Physical Bug/Steel / Swords Dance | 96/55 |
| Galvantula | Compound Eyes | Focus Sash | Thunder / Bug Buzz / Energy Ball / Thunder Wave | Special Bug/Electric / Thunder Wave | 52/49 |
| Yanmega | Speed Boost | Life Orb | Bug Buzz / Air Slash / Giga Drain / Ancient Power | Special Bug/Flying / coverage | 52/35 |

F95 1000 draws. 주요 조합: Heracross / Scizor / Vivillon: 19.2%; Galvantula / Heracross / Vivillon: 16.3%; Galvantula / Scizor / Vivillon: 14.6%. 선봉: Vivillon: 34.5%; Scizor: 22.3%; Heracross: 15.2%. 마지막: Vivillon: 33.9%; Scizor: 19.0%; Heracross: 16.8%.

### 자크로 — named-grant

Category: gym. Power: Upper Gym. Ace: Tyrantrum. Mega carrier: Aerodactyl. 스타일: 바위 내구와 강한 물리 화력.
기존 후보: Tyrantrum, Aerodactyl, Barbaracle → 최종 후보: Tyrantrum, Aurorus, Aerodactyl, Barbaracle, Rhyperior, Cradily.
원작 직접 사용 확인: 이 후보의 직접 사용 확인 없음. 진화형 적용: Tyrunt → Tyrantrum / Amaura → Aurorus. 타워 확장/개별 이력 미확정: Tyrantrum, Aurorus, Aerodactyl, Barbaracle, Rhyperior, Cradily.

| Pokémon | Ability | Item | Moves | Role | 선출/행동 전투 |
|---|---|---|---|---|---|
| Tyrantrum | Strong Jaw | Lum Berry | Head Smash / Dragon Claw / Earthquake / Crunch | Physical Rock/Dragon / coverage | 160/87 |
| Aurorus | Refrigerate | Assault Vest | Ice Beam / Ancient Power / Earth Power / Thunderbolt | Special Rock/Ice / coverage | 20/13 |
| Aerodactyl | Rock Head | Aerodactylite | Stone Edge / Dual Wingbeat / Earthquake / Ice Fang | Physical Rock/Flying / coverage | 160/151 |
| Barbaracle | Tough Claws | White Herb | Liquidation / Stone Edge / Cross Chop / Shell Smash | Physical Rock/Water / Shell Smash | 112/87 |
| Rhyperior | Solid Rock | Assault Vest | Stone Edge / Earthquake / Megahorn / Ice Punch | Physical Ground/Rock / coverage | 4/2 |
| Cradily | Storm Drain | Leftovers | Giga Drain / Ancient Power / Earth Power / Recover | Special Rock/Grass / Recover | 24/24 |

F95 1000 draws. 주요 조합: Aerodactyl / Barbaracle / Tyrantrum: 47.3%; Aerodactyl / Aurorus / Tyrantrum: 33.8%; Aerodactyl / Rhyperior / Tyrantrum: 9.5%. 선봉: Tyrantrum: 34.5%; Aerodactyl: 32.8%; Barbaracle: 15.4%. 마지막: Tyrantrum: 33.9%; Aerodactyl: 32.3%; Barbaracle: 15.3%.

### 코르니 — named-korrina

Category: gym. Power: Upper Gym. Ace: Lucario. Mega carrier: Lucario. 스타일: 격투 정면전과 메가루카리오.
기존 후보: Heracross, Hawlucha, Lucario → 최종 후보: Lucario, Mienshao, Hawlucha, Machamp, Gallade, Toxicroak.
원작 직접 사용 확인: Lucario, Hawlucha. 진화형 적용: Mienfoo → Mienshao / Machoke → Machamp. 타워 확장/개별 이력 미확정: Mienshao, Machamp, Gallade, Toxicroak.

| Pokémon | Ability | Item | Moves | Role | 선출/행동 전투 |
|---|---|---|---|---|---|
| Lucario | Inner Focus | Lucarionite | Close Combat / Meteor Mash / Extreme Speed / Ice Punch | Physical Fighting/Steel / coverage | 160/96 |
| Mienshao | Regenerator | Life Orb | Close Combat / Knock Off / Stone Edge / U-turn | Physical Fighting / coverage | 28/25 |
| Hawlucha | Unburden | Sitrus Berry | High Jump Kick / Acrobatics / Poison Jab / Swords Dance | Physical Fighting/Flying / Swords Dance | 92/81 |
| Machamp | No Guard | Assault Vest | Dynamic Punch / Knock Off / Stone Edge / Bullet Punch | Physical Fighting / coverage | 64/47 |
| Gallade | Sharpness | Scope Lens | Sacred Sword / Psycho Cut / Night Slash / Leaf Blade | Physical Psychic/Fighting / coverage | 64/47 |
| Toxicroak | Dry Skin | Black Sludge | Drain Punch / Poison Jab / Sucker Punch / Ice Punch | Physical Poison/Fighting / coverage | 72/39 |

F95 1000 draws. 주요 조합: Hawlucha / Lucario / Mienshao: 12.0%; Lucario / Mienshao / Toxicroak: 11.6%; Hawlucha / Lucario / Machamp: 11.4%. 선봉: Lucario: 34.5%; Machamp: 14.1%; Mienshao: 13.6%. 마지막: Lucario: 33.9%; Hawlucha: 14.8%; Mienshao: 14.4%.

### 후쿠지 — named-ramos

Category: gym. Power: Gym. Ace: Gogoat. Mega carrier: 없음. 스타일: 풀 회복과 지속 압박.
기존 후보: Ferrothorn, Gogoat, Venusaur → 최종 후보: Gogoat, Jumpluff, Victreebel, Trevenant, Tangrowth, Leafeon.
원작 직접 사용 확인: Gogoat, Jumpluff. 진화형 적용: Weepinbell → Victreebel. 타워 확장/개별 이력 미확정: Victreebel, Trevenant, Tangrowth, Leafeon.

| Pokémon | Ability | Item | Moves | Role | 선출/행동 전투 |
|---|---|---|---|---|---|
| Gogoat | Sap Sipper | Leftovers | Horn Leech / Earthquake / Rock Slide / Bulk Up | Physical Grass / Bulk Up | 160/123 |
| Jumpluff | Infiltrator | Sitrus Berry | Giga Drain / Acrobatics / Leech Seed / Toxic | Special Grass/Flying / Leech Seed, Toxic | 20/19 |
| Victreebel | Chlorophyll | Black Sludge | Giga Drain / Sludge Bomb / Knock Off / Sucker Punch | Special Grass/Poison / coverage | 104/66 |
| Trevenant | Harvest | Sitrus Berry | Horn Leech / Shadow Claw / Earthquake / Will-O-Wisp | Physical Ghost/Grass / Will-O-Wisp | 92/47 |
| Tangrowth | Regenerator | Rocky Helmet | Giga Drain / Knock Off / Sludge Bomb / Leech Seed | Special Grass / Leech Seed | 52/31 |
| Leafeon | Leaf Guard | Lum Berry | Leaf Blade / Knock Off / X-Scissor / Swords Dance | Physical Grass / Swords Dance | 52/41 |

F95 1000 draws. 주요 조합: Gogoat / Tangrowth / Victreebel: 14.2%; Gogoat / Tangrowth / Trevenant: 14.2%; Gogoat / Jumpluff / Victreebel: 13.7%. 선봉: Gogoat: 34.5%; Trevenant: 17.0%; Victreebel: 15.1%. 마지막: Gogoat: 33.9%; Victreebel: 16.9%; Tangrowth: 13.9%.

### 시트론 — named-clemont

Category: gym. Power: Upper Gym. Ace: Heliolisk. Mega carrier: Ampharos. 스타일: 전기 특수 견제와 마비·피벗.
기존 후보: Heliolisk, Magnezone, Ampharos → 최종 후보: Heliolisk, Magnezone, Luxray, Rotom, Ampharos, Eelektross.
원작 직접 사용 확인: Heliolisk. 진화형 적용: Magneton → Magnezone. 타워 확장/개별 이력 미확정: Magnezone, Luxray, Rotom, Ampharos, Eelektross.

| Pokémon | Ability | Item | Moves | Role | 선출/행동 전투 |
|---|---|---|---|---|---|
| Heliolisk | Dry Skin | Expert Belt | Thunderbolt / Surf / Grass Knot / Dark Pulse | Special Electric/Normal / coverage | 160/125 |
| Magnezone | Sturdy | Air Balloon | Thunderbolt / Flash Cannon / Thunder Wave / Body Press | Special Electric/Steel / Thunder Wave | 16/14 |
| Luxray | Intimidate | Flame Orb | Wild Charge / Crunch / Ice Fang / Facade | Physical Electric / coverage | 48/36 |
| Rotom | Levitate | Sitrus Berry | Volt Switch / Shadow Ball / Will-O-Wisp / Thunder Wave | Special Electric/Ghost / Will-O-Wisp, Thunder Wave | 52/42 |
| Ampharos | Static | Ampharosite | Thunderbolt / Dragon Pulse / Focus Blast / Thunder Wave | Special Electric / Thunder Wave | 160/105 |
| Eelektross | Levitate | Assault Vest | Thunderbolt / Flamethrower / Giga Drain / Knock Off | Special Electric / coverage | 44/43 |

F95 1000 draws. 주요 조합: Ampharos / Heliolisk / Luxray: 29.8%; Ampharos / Heliolisk / Magnezone: 26.7%; Ampharos / Eelektross / Heliolisk: 25.6%. 선봉: Heliolisk: 34.5%; Ampharos: 33.4%; Magnezone: 9.4%. 마지막: Heliolisk: 33.9%; Ampharos: 32.4%; Luxray: 10.0%.

### 마슈 — named-valerie

Category: gym. Power: Upper Gym. Ace: Sylveon. Mega carrier: Mawile. 스타일: 페어리 특수전과 강철 물리 보완.
기존 후보: Sylveon, Mawile, Togekiss → 최종 후보: Sylveon, Mawile, Mr. Mime, Florges, Azumarill, Klefki.
원작 직접 사용 확인: Sylveon, Mawile, Mr. Mime. 진화형 적용: 없음. 타워 확장/개별 이력 미확정: Florges, Azumarill, Klefki.

| Pokémon | Ability | Item | Moves | Role | 선출/행동 전투 |
|---|---|---|---|---|---|
| Sylveon | Pixilate | Leftovers | Hyper Voice / Psyshock / Shadow Ball / Calm Mind | Special Fairy / Calm Mind | 160/139 |
| Mawile | Intimidate | Mawilite | Play Rough / Iron Head / Sucker Punch / Fire Fang | Physical Steel/Fairy / coverage | 160/112 |
| Mr. Mime | Filter | Sitrus Berry | Psychic / Dazzling Gleam / Energy Ball / Thunder Wave | Special Psychic/Fairy / Thunder Wave | 20/15 |
| Florges | Flower Veil | Leftovers | Moonblast / Psychic / Energy Ball / Calm Mind | Special Fairy / Calm Mind | 44/31 |
| Azumarill | Huge Power | Sitrus Berry | Play Rough / Waterfall / Aqua Jet / Knock Off | Physical Water/Fairy / coverage | 60/58 |
| Klefki | Prankster | Leftovers | Dazzling Gleam / Flash Cannon / Thunder Wave / Foul Play | Special Steel/Fairy / Thunder Wave | 36/26 |

F95 1000 draws. 주요 조합: Mawile / Mr. Mime / Sylveon: 33.6%; Florges / Mawile / Sylveon: 23.1%; Azumarill / Mawile / Sylveon: 22.1%. 선봉: Mawile: 34.5%; Sylveon: 34.5%; Mr. Mime: 10.1%. 마지막: Sylveon: 33.9%; Mawile: 33.5%; Mr. Mime: 11.0%.

### 고지카 — named-olympia

Category: gym. Power: Upper Gym. Ace: Meowstic. Mega carrier: 없음. 스타일: 에스퍼 특수전과 회복·마비.
기존 후보: Meowstic, Espeon, Gardevoir → 최종 후보: Meowstic, Sigilyph, Slowking, Gothitelle, Alakazam, Espeon.
원작 직접 사용 확인: Meowstic, Sigilyph, Slowking. 진화형 적용: 없음. 타워 확장/개별 이력 미확정: Gothitelle, Alakazam, Espeon.

| Pokémon | Ability | Item | Moves | Role | 선출/행동 전투 |
|---|---|---|---|---|---|
| Meowstic | Infiltrator | Sitrus Berry | Psychic / Shadow Ball / Energy Ball / Thunder Wave | Special Psychic / Thunder Wave | 160/121 |
| Sigilyph | Magic Guard | Life Orb | Psychic / Air Slash / Heat Wave / Roost | Special Psychic/Flying / Roost | 92/73 |
| Slowking | Regenerator | Leftovers | Scald / Psychic / Ice Beam / Slack Off | Special Water/Psychic / Slack Off | 56/47 |
| Gothitelle | Competitive | Leftovers | Psychic / Thunderbolt / Energy Ball / Calm Mind | Special Psychic / Calm Mind | 56/50 |
| Alakazam | Magic Guard | Life Orb | Psychic / Shadow Ball / Focus Blast / Dazzling Gleam | Special Psychic / coverage | 44/38 |
| Espeon | Magic Bounce | Lum Berry | Psychic / Dazzling Gleam / Shadow Ball / Calm Mind | Special Psychic / Calm Mind | 72/64 |

F95 1000 draws. 주요 조합: Meowstic / Sigilyph / Slowking: 19.2%; Gothitelle / Meowstic / Sigilyph: 17.9%; Alakazam / Meowstic / Sigilyph: 14.2%. 선봉: Meowstic: 34.5%; Sigilyph: 21.1%; Slowking: 13.3%. 마지막: Meowstic: 33.9%; Sigilyph: 21.9%; Slowking: 12.7%.

### 우르프 — named-wulfric

Category: gym. Power: Upper Gym. Ace: Avalugg. Mega carrier: Abomasnow. 스타일: 느린 얼음 내구와 눈보라·선공기.
기존 후보: Avalugg, Abomasnow, Walrein → 최종 후보: Avalugg, Abomasnow, Cryogonal, Mamoswine, Weavile, Walrein.
원작 직접 사용 확인: Avalugg, Abomasnow, Cryogonal. 진화형 적용: 없음. 타워 확장/개별 이력 미확정: Mamoswine, Weavile, Walrein.

| Pokémon | Ability | Item | Moves | Role | 선출/행동 전투 |
|---|---|---|---|---|---|
| Avalugg | Sturdy | Leftovers | Avalanche / Body Press / Earthquake / Recover | Physical Ice / Recover | 160/131 |
| Abomasnow | Snow Warning | Abomasite | Blizzard / Giga Drain / Earth Power / Ice Shard | Special Grass/Ice / coverage | 160/138 |
| Cryogonal | Levitate | Leftovers | Freeze-Dry / Water Pulse / Flash Cannon / Recover | Special Ice / Recover | 12/11 |
| Mamoswine | Thick Fat | Life Orb | Icicle Crash / Earthquake / Ice Shard / Stone Edge | Physical Ice/Ground / coverage | 4/4 |
| Weavile | Pressure | Focus Sash | Icicle Crash / Knock Off / Ice Shard / Low Kick | Physical Dark/Ice / coverage | 40/32 |
| Walrein | Thick Fat | Leftovers | Surf / Ice Beam / Earthquake / Toxic | Special Ice/Water / Toxic | 104/100 |

F95 1000 draws. 주요 조합: Abomasnow / Avalugg / Walrein: 56.0%; Abomasnow / Avalugg / Mamoswine: 16.8%; Abomasnow / Avalugg / Cryogonal: 15.7%. 선봉: Abomasnow: 34.5%; Avalugg: 34.5%; Walrein: 17.1%. 마지막: Avalugg: 33.9%; Abomasnow: 33.5%; Walrein: 18.4%.

### 파키라 — named-malva

Category: elite. Power: Elite Four. Ace: Talonflame. Mega carrier: 없음. 스타일: 불꽃 직선 화력과 특수 강화.
기존 후보: Talonflame, Chandelure, Houndoom → 최종 후보: Talonflame, Pyroar, Chandelure, Houndoom, Torkoal, Volcarona.
원작 직접 사용 확인: Talonflame, Pyroar, Chandelure, Torkoal. 진화형 적용: 없음. 타워 확장/개별 이력 미확정: Houndoom, Volcarona.

| Pokémon | Ability | Item | Moves | Role | 선출/행동 전투 |
|---|---|---|---|---|---|
| Talonflame | Gale Wings | Sharp Beak | Brave Bird / Flare Blitz / U-turn / Roost | Physical Fire/Flying / Roost | 160/131 |
| Pyroar | Unnerve | Wise Glasses | Flamethrower / Hyper Voice / Dark Pulse / Will-O-Wisp | Special Fire/Normal / Will-O-Wisp | 28/20 |
| Chandelure | Flash Fire | Expert Belt | Shadow Ball / Flamethrower / Energy Ball / Psychic | Special Ghost/Fire / coverage | 92/57 |
| Houndoom | Flash Fire | Leftovers | Fire Blast / Dark Pulse / Sludge Bomb / Nasty Plot | Special Dark/Fire / Nasty Plot | 64/36 |
| Torkoal | White Smoke | Leftovers | Flamethrower / Earth Power / Body Press / Will-O-Wisp | Special Fire / Will-O-Wisp | 68/31 |
| Volcarona | Flame Body | Sitrus Berry | Fiery Dance / Bug Buzz / Giga Drain / Quiver Dance | Special Bug/Fire / Quiver Dance | 68/59 |

F95 1000 draws. 주요 조합: Pyroar / Talonflame / Torkoal: 12.1%; Chandelure / Pyroar / Talonflame: 11.6%; Chandelure / Houndoom / Talonflame: 11.1%. 선봉: Talonflame: 34.5%; Pyroar: 14.1%; Houndoom: 14.0%. 마지막: Talonflame: 33.9%; Pyroar: 15.2%; Chandelure: 13.8%.

### 즈미 — named-siebold

Category: elite. Power: Elite Four. Ace: Clawitzer. Mega carrier: 없음. 스타일: 물 파동과 회복·다양한 공격.
기존 후보: Barbaracle, Gyarados, Kingdra → 최종 후보: Clawitzer, Barbaracle, Starmie, Gyarados, Milotic, Greninja.
원작 직접 사용 확인: Clawitzer, Barbaracle, Starmie, Gyarados. 진화형 적용: 없음. 타워 확장/개별 이력 미확정: Milotic, Greninja.

| Pokémon | Ability | Item | Moves | Role | 선출/행동 전투 |
|---|---|---|---|---|---|
| Clawitzer | Mega Launcher | Expert Belt | Water Pulse / Dark Pulse / Aura Sphere / Ice Beam | Special Water / coverage | 160/101 |
| Barbaracle | Tough Claws | White Herb | Liquidation / Stone Edge / Cross Chop / Shell Smash | Physical Rock/Water / Shell Smash | 24/18 |
| Starmie | Natural Cure | Life Orb | Surf / Psychic / Ice Beam / Thunderbolt | Special Water/Psychic / coverage | 96/80 |
| Gyarados | Intimidate | Lum Berry | Waterfall / Crunch / Ice Fang / Dragon Dance | Physical Water/Flying / Dragon Dance | 96/75 |
| Milotic | Marvel Scale | Leftovers | Scald / Ice Beam / Recover / Mirror Coat | Special Water / Recover | 36/33 |
| Greninja | Protean | Expert Belt | Surf / Dark Pulse / Ice Beam / Grass Knot | Special Water/Dark / coverage | 68/64 |

F95 1000 draws. 주요 조합: Clawitzer / Gyarados / Starmie: 19.8%; Clawitzer / Greninja / Gyarados: 17.4%; Barbaracle / Clawitzer / Gyarados: 12.9%. 선봉: Clawitzer: 34.5%; Gyarados: 21.6%; Barbaracle: 13.1%. 마지막: Clawitzer: 33.9%; Gyarados: 19.1%; Barbaracle: 13.9%.

### 간피 — named-wikstrom

Category: elite. Power: Elite Four. Ace: Aegislash. Mega carrier: Scizor. 스타일: 강철 저항과 선공기·혼합 화력.
기존 후보: Probopass, Aegislash, Scizor → 최종 후보: Aegislash, Scizor, Probopass, Klefki, Aggron, Escavalier.
원작 직접 사용 확인: Aegislash, Scizor, Probopass, Klefki. 진화형 적용: 없음. 타워 확장/개별 이력 미확정: Aggron, Escavalier.

| Pokémon | Ability | Item | Moves | Role | 선출/행동 전투 |
|---|---|---|---|---|---|
| Aegislash | Stance Change | Leftovers | Shadow Ball / Iron Head / Sacred Sword / Shadow Sneak | Physical Steel/Ghost / coverage | 160/111 |
| Scizor | Technician | Scizorite | Bullet Punch / X-Scissor / Knock Off / Swords Dance | Physical Bug/Steel / Swords Dance | 160/112 |
| Probopass | Sturdy | Air Balloon | Power Gem / Flash Cannon / Earth Power / Thunder Wave | Special Rock/Steel / Thunder Wave | 60/58 |
| Klefki | Prankster | Leftovers | Dazzling Gleam / Flash Cannon / Thunder Wave / Foul Play | Special Steel/Fairy / Thunder Wave | 32/23 |
| Aggron | Rock Head | Leftovers | Heavy Slam / Earthquake / Ice Punch / Body Press | Physical Steel/Rock / coverage | 44/25 |
| Escavalier | Overcoat | Assault Vest | Megahorn / Iron Head / Knock Off / Drill Run | Physical Bug/Steel / coverage | 24/13 |

F95 1000 draws. 주요 조합: Aegislash / Probopass / Scizor: 48.1%; Aegislash / Aggron / Scizor: 27.4%; Aegislash / Klefki / Scizor: 13.2%. 선봉: Scizor: 34.5%; Aegislash: 34.5%; Probopass: 15.8%. 마지막: Aegislash: 33.9%; Scizor: 33.5%; Probopass: 14.9%.

### 드라세나 — named-drasna

Category: elite. Power: Elite Four. Ace: Noivern. Mega carrier: Altaria. 스타일: 드래곤 특수전과 메가파비코리 회복.
기존 후보: Noivern, Altaria, Kingdra → 최종 후보: Noivern, Dragalge, Druddigon, Altaria, Goodra, Salamence.
원작 직접 사용 확인: Noivern, Dragalge, Druddigon, Altaria. 진화형 적용: 없음. 타워 확장/개별 이력 미확정: Goodra, Salamence.

| Pokémon | Ability | Item | Moves | Role | 선출/행동 전투 |
|---|---|---|---|---|---|
| Noivern | Infiltrator | Life Orb | Dragon Pulse / Hurricane / Flamethrower / U-turn | Special Flying/Dragon / coverage | 160/157 |
| Dragalge | Adaptability | Assault Vest | Draco Meteor / Sludge Wave / Hydro Pump / Thunderbolt | Special Poison/Dragon / coverage | 60/50 |
| Druddigon | Rough Skin | Rocky Helmet | Dragon Claw / Earthquake / Fire Punch / Sucker Punch | Physical Dragon / coverage | 56/32 |
| Altaria | Natural Cure | Altarianite | Dragon Pulse / Moonblast / Flamethrower / Roost | Special Dragon/Flying / Roost | 160/113 |
| Goodra | Sap Sipper | Assault Vest | Dragon Pulse / Flamethrower / Thunderbolt / Sludge Bomb | Special Dragon / coverage | 20/15 |
| Salamence | Intimidate | Lum Berry | Dragon Claw / Earthquake / Fire Blast / Roost | Physical Dragon/Flying / Roost | 24/19 |

F95 1000 draws. 주요 조합: Altaria / Dragalge / Noivern: 47.6%; Altaria / Druddigon / Noivern: 24.5%; Altaria / Goodra / Noivern: 16.6%. 선봉: Noivern: 34.5%; Altaria: 33.4%; Dragalge: 16.0%. 마지막: Noivern: 33.9%; Altaria: 32.4%; Dragalge: 17.4%.

### 카르네 — named-diantha

Category: champion. Power: Champion. Ace: Gardevoir. Mega carrier: Gardevoir. 스타일: 공식 여섯 동료와 메가가디안.
기존 후보: Gardevoir, Goodra, Aurorus → 최종 후보: Gardevoir, Hawlucha, Tyrantrum, Aurorus, Gourgeist, Goodra.
원작 직접 사용 확인: Gardevoir, Hawlucha, Tyrantrum, Aurorus, Gourgeist, Goodra. 진화형 적용: 없음. 타워 확장/개별 이력 미확정: 없음.

| Pokémon | Ability | Item | Moves | Role | 선출/행동 전투 |
|---|---|---|---|---|---|
| Gardevoir | Trace | Gardevoirite | Moonblast / Psychic / Shadow Ball / Thunderbolt | Special Psychic/Fairy / coverage | 160/137 |
| Hawlucha | Unburden | Sitrus Berry | High Jump Kick / Acrobatics / Poison Jab / Swords Dance | Physical Fighting/Flying / Swords Dance | 84/50 |
| Tyrantrum | Strong Jaw | Lum Berry | Head Smash / Dragon Claw / Earthquake / Crunch | Physical Rock/Dragon / coverage | 48/18 |
| Aurorus | Refrigerate | Assault Vest | Ice Beam / Ancient Power / Earth Power / Thunderbolt | Special Rock/Ice / coverage | 40/25 |
| Gourgeist | Frisk | Leftovers | Seed Bomb / Shadow Sneak / Will-O-Wisp / Leech Seed | Physical Ghost/Grass / Will-O-Wisp, Leech Seed | 100/68 |
| Goodra | Sap Sipper | Assault Vest | Dragon Pulse / Flamethrower / Thunderbolt / Sludge Bomb | Special Dragon / coverage | 48/29 |

F100 1000 draws. 주요 조합: Aurorus / Gardevoir / Hawlucha: 14.9%; Gardevoir / Goodra / Hawlucha: 12.7%; Gardevoir / Gourgeist / Hawlucha: 11.0%. 선봉: Gardevoir: 34.4%; Hawlucha: 16.2%; Gourgeist: 14.5%. 마지막: Gardevoir: 32.9%; Hawlucha: 16.8%; Gourgeist: 13.2%.

### 플레어단 조무래기 — flare-grunt

Category: grunt. Power: Normal / Lower Gym. Ace: 없음. Mega carrier: 없음. 스타일: 악·독과 빠른 조직 공용 압박.
기존 후보: 개별 runtime 없음 → 최종 후보: Mightyena, Houndoom, Manectric, Crobat, Scrafty, Liepard.
원작 직접 사용 확인: Mightyena, Houndoom, Manectric, Scrafty. 진화형 적용: Golbat → Crobat. 타워 확장/개별 이력 미확정: Crobat, Liepard.

| Pokémon | Ability | Item | Moves | Role | 선출/행동 전투 |
|---|---|---|---|---|---|
| Mightyena | Intimidate | Sitrus Berry | Crunch / Play Rough / Fire Fang / Sucker Punch | Physical Dark / coverage | 56/49 |
| Houndoom | Flash Fire | Sitrus Berry | Fire Blast / Dark Pulse / Sludge Bomb / Nasty Plot | Special Dark/Fire / Nasty Plot | 72/55 |
| Manectric | Lightning Rod | Sitrus Berry | Thunderbolt / Flamethrower / Volt Switch / Thunder Wave | Special Electric / Thunder Wave | 92/66 |
| Crobat | Infiltrator | Black Sludge | Brave Bird / Cross Poison / U-turn / Roost | Physical Poison/Flying / Roost | 88/87 |
| Scrafty | Intimidate | Sitrus Berry | Drain Punch / Knock Off / Ice Punch / Dragon Dance | Physical Dark/Fighting / Dragon Dance | 80/69 |
| Liepard | Prankster | Sitrus Berry | Knock Off / Play Rough / Sucker Punch / Thunder Wave | Physical Dark / Thunder Wave | 92/77 |

F95 1000 draws. 주요 조합: Crobat / Manectric / Scrafty: 7.9%; Crobat / Houndoom / Scrafty: 7.3%; Houndoom / Manectric / Scrafty: 7.1%. 선봉: Crobat: 19.2%; Manectric: 18.9%; Houndoom: 18.3%. 마지막: Manectric: 20.4%; Crobat: 20.0%; Houndoom: 17.1%.

### 아케비 — flare-executive-aliana

Category: executive. Power: Upper Gym. Ace: Manectric. Mega carrier: 없음. 스타일: 전기·불꽃 속공형 일반 간부.
기존 후보: 개별 runtime 없음 → 최종 후보: Manectric, Mightyena, Houndoom, Crobat, Pyroar, Toxicroak.
원작 직접 사용 확인: Mightyena. 진화형 적용: 없음. 타워 확장/개별 이력 미확정: Manectric, Houndoom, Crobat, Pyroar, Toxicroak.

| Pokémon | Ability | Item | Moves | Role | 선출/행동 전투 |
|---|---|---|---|---|---|
| Manectric | Lightning Rod | Expert Belt | Thunderbolt / Flamethrower / Volt Switch / Thunder Wave | Special Electric / Thunder Wave | 160/133 |
| Mightyena | Intimidate | Sitrus Berry | Crunch / Play Rough / Fire Fang / Sucker Punch | Physical Dark / coverage | 60/51 |
| Houndoom | Flash Fire | Expert Belt | Fire Blast / Dark Pulse / Sludge Bomb / Nasty Plot | Special Dark/Fire / Nasty Plot | 60/36 |
| Crobat | Infiltrator | Black Sludge | Brave Bird / Cross Poison / U-turn / Roost | Physical Poison/Flying / Roost | 64/62 |
| Pyroar | Unnerve | Wise Glasses | Flamethrower / Hyper Voice / Dark Pulse / Will-O-Wisp | Special Fire/Normal / Will-O-Wisp | 68/61 |
| Toxicroak | Dry Skin | Black Sludge | Drain Punch / Poison Jab / Sucker Punch / Ice Punch | Physical Poison/Fighting / coverage | 68/41 |

F95 1000 draws. 주요 조합: Manectric / Mightyena / Toxicroak: 13.3%; Manectric / Mightyena / Pyroar: 13.1%; Crobat / Houndoom / Manectric: 12.8%. 선봉: Manectric: 34.5%; Mightyena: 16.3%; Crobat: 16.0%. 마지막: Manectric: 33.9%; Mightyena: 17.9%; Crobat: 15.0%.

### 크세로시키 — flare-executive-xerosic

Category: executive. Power: Upper Gym / Lower Elite Four. Ace: Malamar. Mega carrier: 없음. 스타일: 과학자 혼합 특수전과 교란·Contrary.
기존 후보: Malamar, Crobat, Houndoom → 최종 후보: Malamar, Crobat, Houndoom, Magnezone, Beheeyem, Rotom.
원작 직접 사용 확인: Malamar, Crobat. 진화형 적용: 없음. 타워 확장/개별 이력 미확정: Houndoom, Magnezone, Beheeyem, Rotom.

| Pokémon | Ability | Item | Moves | Role | 선출/행동 전투 |
|---|---|---|---|---|---|
| Malamar | Contrary | Leftovers | Superpower / Knock Off / Psycho Cut / Rock Slide | Physical Dark/Psychic / coverage | 160/135 |
| Crobat | Infiltrator | Black Sludge | Brave Bird / Cross Poison / U-turn / Roost | Physical Poison/Flying / Roost | 56/48 |
| Houndoom | Flash Fire | Leftovers | Fire Blast / Dark Pulse / Sludge Bomb / Nasty Plot | Special Dark/Fire / Nasty Plot | 64/43 |
| Magnezone | Sturdy | Air Balloon | Thunderbolt / Flash Cannon / Thunder Wave / Body Press | Special Electric/Steel / Thunder Wave | 40/35 |
| Beheeyem | Analytic | Assault Vest | Psychic / Thunderbolt / Energy Ball / Shadow Ball | Special Psychic / coverage | 60/49 |
| Rotom | Levitate | Sitrus Berry | Volt Switch / Shadow Ball / Will-O-Wisp / Thunder Wave | Special Electric/Ghost / Will-O-Wisp, Thunder Wave | 100/83 |

F95 1000 draws. 주요 조합: Houndoom / Magnezone / Malamar: 12.7%; Magnezone / Malamar / Rotom: 12.4%; Crobat / Malamar / Rotom: 11.9%. 선봉: Malamar: 34.5%; Magnezone: 15.4%; Crobat: 14.9%. 마지막: Malamar: 33.9%; Crobat: 16.3%; Magnezone: 13.8%.

### 플라드리 — flare-boss-lysandre

Category: boss. Power: Champion+. Ace: Gyarados. Mega carrier: Gyarados. 스타일: 메가갸라도스 물리 강화와 혼합 동료.
기존 후보: Mienshao, Gyarados, Pyroar, Yveltal → 최종 후보: Gyarados, Mienshao, Pyroar, Honchkrow, Houndoom, Crobat.
원작 직접 사용 확인: Gyarados, Mienshao, Pyroar, Honchkrow. 진화형 적용: 없음. 타워 확장/개별 이력 미확정: Houndoom, Crobat.

| Pokémon | Ability | Item | Moves | Role | 선출/행동 전투 |
|---|---|---|---|---|---|
| Gyarados | Intimidate | Gyaradosite | Waterfall / Crunch / Ice Fang / Dragon Dance | Physical Water/Flying / Dragon Dance | 160/144 |
| Mienshao | Regenerator | Life Orb | Close Combat / Knock Off / Stone Edge / U-turn | Physical Fighting / coverage | 100/64 |
| Pyroar | Unnerve | Wise Glasses | Flamethrower / Hyper Voice / Dark Pulse / Will-O-Wisp | Special Fire/Normal / Will-O-Wisp | 44/32 |
| Honchkrow | Super Luck | Scope Lens | Brave Bird / Night Slash / Sucker Punch / Heat Wave | Physical Dark/Flying / coverage | 24/17 |
| Houndoom | Flash Fire | Leftovers | Fire Blast / Dark Pulse / Sludge Bomb / Nasty Plot | Special Dark/Fire / Nasty Plot | 60/40 |
| Crobat | Infiltrator | Black Sludge | Brave Bird / Cross Poison / U-turn / Roost | Physical Poison/Flying / Roost | 92/70 |

F96 1000 draws. 주요 조합: Gyarados / Houndoom / Mienshao: 18.1%; Gyarados / Mienshao / Pyroar: 16.7%; Gyarados / Honchkrow / Mienshao: 11.1%. 선봉: Gyarados: 30.0%; Mienshao: 19.9%; Houndoom: 14.8%. 마지막: Gyarados: 34.8%; Mienshao: 17.8%; Houndoom: 14.3%.

## 플라드리 결과

Gyarados Ace/carrier, Mega 152/160, Mega 이후 직접 KO 206, 3KO 마무리 23/160전. 나머지 다섯 후보의 선출/기술 usage도 위 표와 JSON에 기록했다. 항상 Mega 한 마리로 3KO하는 상태는 아니다.

## 다른 지방 보존

223개 비칼로스 runtime 및 reviewed 행의 변경 전 SHA-256 일치. 관동·성도·호연·신오·하나와 기존 범위 밖 NPC를 포함한다. 공통 정책/엔진 10개 파일 해시도 동일하다. 기존 지역 보존 테스트는 새 칼로스 범위를 제외하도록 갱신하고, 칼로스 테스트가 나머지 전부를 별도로 보호한다. 기존 unova-preservation.json은 보존했다.

## 검증과 재현

- 생성: `node --import tsx scripts/review-kalos-npc-samples.ts`, `node scripts/export-normal-npc-runtime.mjs`, `node scripts/export-normal-npc-runtime.mjs --check`.
- focused: `node --import tsx scripts/simulate-kalos-npcs.ts`. 기본 seeds 1–2, 1,000 draws/floor. KALOS_OUTPUT/KALOS_SEEDS/KALOS_SEED_START/KALOS_DRAWS/KALOS_RULES/KALOS_NPCS/KALOS_TRACES 지원.
- before: NPC_BALANCE_BASELINE을 baseline-runtime.json, UNOVA_METADATA_BASELINE을 baseline-metadata.json으로 설정한 뒤 `node --import ./scripts/lib/unova-baseline.mjs --import tsx scripts/simulate-kalos-npcs.ts --before`. 기존 범용 loader hook을 그대로 재사용한다.
- 보고서: `node --import tsx scripts/report-kalos-npcs.ts`. 원자료는 artifacts/experiments/balance/kalos-20261018 아래에 있다.

- 전체 단위·통합 테스트: 948개 통과, 실패 0; node --import tsx --test --test-concurrency=4 tests/*.test.ts
- 칼로스 집중 테스트: 30개 통과; 17종 합법 세트/선출/층별 제한, Mega 9종 실제 발동 및 replay, Stance Change, 플레어단 조우, Mega telemetry fixture
- 브라우저 E2E: 23개 통과: 칼로스 관장·사천왕·챔피언 13, 플레어단 4, 기존 로켓단 캠페인 6; 1280/390px 조우·액션·재접속·snapshot 보존
- Production build: Next.js production build 통과; Windows junction 제한으로 샌드박스 밖에서 windows-build-links.cjs와 함께 실행
- TypeScript: node node_modules/typescript/bin/tsc --noEmit 통과
- Runtime export 및 생성기: export --check 241행 일치; review-kalos 생성기를 재실행해 reviewed 원본의 byte-idempotence 확인
- 실제 전투 시뮬레이션: Before 1,440전 / After focused 1,632전 / coverage 1,088전, 각각 오류 0; 최종 독립 표본 2,720전
- 실제 Mega 행동 기회: Mega 9종 동일 1,440개 전투 재실행; winner/move usage/Mega 기록 전부 기존 결과와 일치; 합법 Mega 명령이 제공된 턴 기록
- 선출 및 기술 telemetry: 49,000 draws; 모든 후보 실제 선출, Ace/carrier 보장 100%, 조합 4개 이상; 기술 408슬롯의 사용량 및 0회 조건 분류; Trick Room 0명
- 다른 지방·공통 엔진 보존: 비칼로스 reviewed/runtime 223행과 공통 정책·엔진 10개 파일 SHA-256 일치; 기존 지역 집중 테스트 86개 통과

**칼로스 필수 NPC 샘플 완료**
