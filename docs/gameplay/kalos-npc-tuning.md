# 간피·후쿠지·즈미 소규모 조정

2026-10-18. f4018e89의 세 NPC만 조정했다. 목표 승률에 맞추는 반복 최적화는 하지 않았다. 소폭 파일럿 후 역할 보완을 한 번 추가하고, 기술 사용 검사에서 중복 슬롯을 정리했다. 그 최종 세트를 기존 상대 팀과 별도 상대 팀·새 seed에서 다시 측정했다.

## NPC 승률 Before → After

| NPC | 기존 네 팀 / Basic, 80전씩 | 별도 네 팀·새 seed / Basic, 80전씩 | 기존 네 팀 / 여섯 룰, 96전씩 |
|---|---|---|---|
| 간피 | 21.3% (17/80) → 30.0% (24/80) | 35.0% (28/80) → 43.8% (35/80) | 10.4% (10/96) → 16.7% (16/96) |
| 후쿠지 | 20.0% (16/80) → 36.3% (29/80) | 6.3% (5/80) → 20.0% (16/80) | 12.5% (12/96) → 25.0% (24/96) |
| 즈미 | 87.5% (70/80) → 73.8% (59/80) | 65.0% (52/80) → 62.5% (50/80) | 70.8% (68/96) → 58.3% (56/96) |

**표는 모두 NPC 승률이다.** 기존 네 팀은 starters/offense/bulk/signature이고, 별도 팀은 Venusaur/Jolteon/Rotom, Arcanine/Flygon/Lucario, Dragonite/Weavile/Conkeldurr, Snorlax/Crobat/Milotic이다. 공통 AI와 층별 성장·학습 포인트는 동일하다. Basic 비교 F45/F95, 같은 seed와 같은 플레이어 세트로 짝지었다. 고정 AI 단판 결과이며 사람 승률 또는 모든 팀에 대한 일반적인 난도를 뜻하지 않는다.

즈미는 여전히 강하지만 전기/풀 대응 팀에는 별도 검사 20전 모두 패배했다. 간피는 불꽃/땅 상대에 별도 검사 20전 모두 패배했고, 후쿠지도 특정 상대에 취약한 풀 관장으로 남는다. 이 타입 차이를 억지로 없애지 않았다.

## 변경 이유

- 간피: 물리 투자/Adamant Aegislash의 Shadow Ball을 Shadow Claw로 통일하고 Weakness Policy로 약점 피격 후 반격을 보완했다. Mega Scizor는 유지하며 X-Scissor를 Iron Head로 바꿔 Bullet Punch 외의 강한 강철 자속기를 확보했다. Aggron은 반동기 없는 Rock Head 대신 Sturdy, Leftovers 대신 Assault Vest를 사용한다. Escavalier는 Knock Off를 Close Combat으로 바꿔 즉시 격투 화력을 추가했다.
- 후쿠지: Gogoat Ace·Jumpluff·Trevenant는 그대로다. Leafeon 한 자리만 Ludicolo로 바꿔 여섯 후보 모두 풀 타입을 유지하면서 물 견제를 확보했다. Ludicolo는 원작 소유 주장이 아닌 타워 확장이다. Victreebel의 Knock Off는 Toxic으로, Tangrowth의 Knock Off/Sludge Bomb은 Focus Blast/Ancient Power로 바꾸어 특수 투자와 견제를 맞췄다. 시험한 Leaf Storm은 Giga Drain의 선택을 가려 최종 세트에서 제거했다.
- 즈미: Clawitzer Ace/Mega Launcher와 네 기술은 그대로다. Starmie의 Life Orb를 Mystic Water, Thunderbolt를 Recover로 바꿔 전기 견제를 줄이고 물/에스퍼 회복형 역할로 정리했다. Greninja는 Protean 대신 Torrent로 네 타입의 자속 화력을 낮췄다. 후보·Mega 없음 정책·나머지 네 멤버는 보존했다.
- 처음 파일럿의 Leafeon Double-Edge 교체는 최종 후보에서 제외되어 현재 적용되지 않는다. 파일럿은 별도 pilot/에 보관하며 최종 표에 섞지 않았다.

## 최종 세트와 실행 기록

### 간피

Ace: Aegislash. Mega carrier: Scizor.

| 후보 | 특성 | 도구 | 기술 | 선출 / 행동 전투 | 직접 KO |
|---|---|---|---|---|---|
| Aegislash | Stance Change | Weakness Policy | Shadow Claw / Iron Head / Sacred Sword / Shadow Sneak | 240 / 182 | 143 |
| Scizor | Technician | Scizorite | Bullet Punch / Iron Head / Knock Off / Swords Dance | 240 / 172 | 112 |
| Probopass | Sturdy | Air Balloon | Power Gem / Flash Cannon / Earth Power / Thunder Wave | 100 / 96 | 69 |
| Klefki | Prankster | Leftovers | Dazzling Gleam / Flash Cannon / Thunder Wave / Foul Play | 44 / 33 | 8 |
| Aggron | Sturdy | Assault Vest | Heavy Slam / Earthquake / Ice Punch / Body Press | 68 / 63 | 40 |
| Escavalier | Overcoat | Assault Vest | Megahorn / Iron Head / Close Combat / Drill Run | 28 / 16 | 2 |

Mega: 도구 available=120, 합법 명령 available=113, used=113.
- 0회 사용: Aegislash — Shadow Sneak (조건부 / 행동 기회). 0회만으로 미지원 판정하지 않는다.
- 0회 사용: Scizor — Bullet Punch (조건부 / 행동 기회). 0회만으로 미지원 판정하지 않는다.

### 후쿠지

Ace: Gogoat. Mega carrier: 없음.

| 후보 | 특성 | 도구 | 기술 | 선출 / 행동 전투 | 직접 KO |
|---|---|---|---|---|---|
| Gogoat | Sap Sipper | Leftovers | Horn Leech / Earthquake / Rock Slide / Bulk Up | 240 / 193 | 137 |
| Jumpluff | Infiltrator | Sitrus Berry | Giga Drain / Acrobatics / Leech Seed / Toxic | 44 / 33 | 11 |
| Victreebel | Chlorophyll | Black Sludge | Giga Drain / Sludge Bomb / Toxic / Sucker Punch | 112 / 74 | 31 |
| Trevenant | Harvest | Sitrus Berry | Horn Leech / Shadow Claw / Earthquake / Will-O-Wisp | 104 / 58 | 32 |
| Tangrowth | Regenerator | Rocky Helmet | Giga Drain / Focus Blast / Ancient Power / Leech Seed | 40 / 29 | 10 |
| Ludicolo | Own Tempo | Assault Vest | Scald / Giga Drain / Ice Beam / Focus Blast | 180 / 167 | 115 |

Mega: 도구 available=0, 합법 명령 available=0, used=0.

### 즈미

Ace: Clawitzer. Mega carrier: 없음.

| 후보 | 특성 | 도구 | 기술 | 선출 / 행동 전투 | 직접 KO |
|---|---|---|---|---|---|
| Clawitzer | Mega Launcher | Expert Belt | Water Pulse / Dark Pulse / Aura Sphere / Ice Beam | 240 / 152 | 186 |
| Barbaracle | Tough Claws | White Herb | Liquidation / Stone Edge / Cross Chop / Shell Smash | 56 / 34 | 34 |
| Starmie | Natural Cure | Mystic Water | Surf / Psychic / Ice Beam / Recover | 136 / 110 | 85 |
| Gyarados | Intimidate | Lum Berry | Waterfall / Crunch / Ice Fang / Dragon Dance | 152 / 108 | 115 |
| Milotic | Marvel Scale | Leftovers | Scald / Ice Beam / Recover / Mirror Coat | 40 / 37 | 17 |
| Greninja | Torrent | Expert Belt | Surf / Dark Pulse / Ice Beam / Grass Knot | 96 / 86 | 120 |

Mega: 도구 available=0, 합법 명령 available=0, used=0.

## 보존과 검증

대상 밖 238개 reviewed/runtime 행은 f4018e89와 SHA-256이 같다. 다른 칼로스 NPC 14종, 다른 지방 전체, 공통 정책·선출·기믹·성장·히든보스 엔진을 보존했다. 새 selectionRule이나 trainer-specific AI는 없다. 간피 Mega Scizor와 세 Ace, 모든 후보의 9,000회 선출 및 Trick Room 0을 유지한다. 원작 사용과 타워 확장을 혼동하지 않도록 새 Ludicolo를 확장으로 명시했다.

최종 독립 After 표본은 720전이다. 원래 Basic 240전, 별도 상대 Basic 240전, 여섯 룰의 중복 Basic을 뺀 240전이다. 여섯 룰 파일에는 총 288전이 있으며 Basic 48전이 첫 집계와 겹친다. Before 역시 같은 조합으로 비교했다. 모든 전투 오류 0. 기술별 usage와 조건부 0회 목록은 kalos-tuning.json에 있다.

- 전체 단위·통합: 949개 통과, 실패 0 (최종 세트)
- 집중 테스트: 41개 통과: 세트 합법성·선출·Mega·replay·보존·층별 제한
- 브라우저 E2E: 후쿠지/즈미 390px, 간피 1280px 실제 배틀 진입·액션·재접속 3개 통과
- Production build: 최종 세트로 Next.js production build 통과
- TypeScript / runtime: tsc --noEmit 및 export --check 241행 일치
- 전투 비교: 최종 독립 After 720전: 기존 Basic 240전·별도 상대 Basic 240전·추가 룰 240전, 오류 0. Before와 동일 seed/floor/team/rule 비교
- Mega / lineup: 9,000 draws에서 Ace·carrier 보장과 모든 후보 선출; Mega Scizor 합법 기회 113전 중 113전 발동; Trick Room 0
- 대상 밖 보존: 나머지 238개 reviewed/runtime 행과 공통 엔진 해시 보존; 다른 칼로스 14종·모든 다른 지방 변경 없음

## 재현

`node --import tsx scripts/review-kalos-npc-samples.ts` → `node scripts/export-normal-npc-runtime.mjs --check`.

시뮬레이터의 KALOS_NPCS=named-wikstrom,named-ramos,named-siebold, KALOS_RULES=basic, KALOS_SEEDS=10, KALOS_OUTPUT을 지정한다. 별도 상대는 KALOS_CASES=scripts/data/npc/kalos-tuning-cases.json, KALOS_SEED_START=11을 사용한다. Before는 NPC_BALANCE_BASELINE=.../baseline-runtime.json과 --import ./scripts/lib/unova-baseline.mjs, --before를 사용한다.

`node --import tsx scripts/report-kalos-tuning.ts`는 동일 전투 키, 런타임 해시, 대상 밖 보존, 표본 수와 오류를 확인하고 이 보고서와 audit JSON을 생성한다. 원자료는 artifacts/experiments/balance/kalos-tuning-20261018에 있다.
