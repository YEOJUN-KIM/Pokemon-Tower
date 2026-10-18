# 마그마단 간부 추가 조정

기준 commit: `5325869e2c042f27767501af521c4168ebddd8d6`. 호걸·구열 두 샘플만 수정했다. 다른 282개 검토/runtime 정의와 공통 정책·선출기·성장·기믹 구현은 그대로인지 검사했다.

## 1. Tabitha 변경

폭타 에이스, Tactical 상한, 무기믹을 유지했다. 마그카르고→점토도리, 선인왕 추가로 6후보를 구성했다. 느린 불꽃/바위 중복을 줄이고 땅/에스퍼·트릭룸·물 면역/풀 공격 역할을 분담한다. 폭타는 돌격조끼와 4공격기로 즉시 압박한다.

## 2. Courtney 변경

폭타 에이스와 메가폭타를 유지했다. 후보 변경은 호걸과 같은 두 자리이며, 허용 층부터 메가스톤으로 바뀐다. 폭타 자신의 낮은 Speed와 물 4배 약점은 그대로이고 선인왕·크로뱃·점토도리가 서로 다른 방식으로 보완한다.

두 간부 모두 atLeastOneOf=[Crobat,Cacturne], preferredLead=[Crobat,Claydol]이다. 폭타는 기존 에이스 제약으로 자동 포함된다. 크로뱃 또는 선인왕 하나가 있어야 하며 점토도리는 선택된 경우에만 트릭룸 선봉 우선순위다. required를 더 넣지 않아 실제 가능한 조합 7개를 유지한다.

### 후보의 원작 연결과 확장 범위

[Tabitha](https://bulbapedia.bulbagarden.net/wiki/Tabitha), [Courtney](https://bulbapedia.bulbagarden.net/wiki/Courtney)의 폭타·그라에나·골뱃 계열 정체성을 우선했다. 크로뱃은 기존 진화형 대체이며 또도가스는 기존 조직 공용 확장이다. [마그마단의 본가 조직 공용 풀](https://bulbapedia.bulbagarden.net/wiki/Magma)에 포함된 에메랄드의 오뚝군을 진화시켜 점토도리로 확장했다. 점토도리를 간부의 실제 사용 포켓몬이라고 주장하지 않는다. 선인왕은 호연 사막의 풀/악 파트너와 저수 역할로 연결한 타워용 조직 확장이다. 관계없는 범용 메타 포켓몬으로 교체하지 않았다.

### 최종 세트

#### 호걸

| 후보 | 특성 | 기본 도구 | 기술 ×4 | 역할 |
|---|---|---|---|---|
| Camerupt | Solid Rock | Assault Vest | Fire Blast / Earth Power / Ancient Power / Flash Cannon | Immediate Fire/Ground special breaker |
| Mightyena | Intimidate | Choice Band | Crunch / Play Rough / Sucker Punch / Fire Fang | Intimidate / immediate Dark pressure / priority |
| Crobat | Infiltrator | Black Sludge | Brave Bird / Cross Poison / U-turn / Roost | Fast physical lead / Fairy-Grass pressure / pivot |
| Weezing | Levitate | Rocky Helmet | Sludge Wave / Flamethrower / Will-O-Wisp / Pain Split | Ground immunity / burn / non-projectile Poison pressure |
| Claydol | Levitate | Sitrus Berry | Earth Power / Psychic / Ice Beam / Trick Room | Bulky room setter / coverage |
| Cacturne | Water Absorb | Focus Sash | Seed Bomb / Knock Off / Sucker Punch / Drain Punch | Water immunity / Grass-Dark pressure / priority |

#### 구열

| 후보 | 특성 | 기본 도구 | 기술 ×4 | 역할 |
|---|---|---|---|---|
| Camerupt | Solid Rock | Sitrus Berry | Fire Blast / Earth Power / Ancient Power / Flash Cannon | Immediate Fire/Ground special breaker |
| Mightyena | Intimidate | Choice Band | Crunch / Play Rough / Sucker Punch / Fire Fang | Intimidate / immediate Dark pressure / priority |
| Crobat | Infiltrator | Black Sludge | Brave Bird / Cross Poison / U-turn / Roost | Fast physical lead / Fairy-Grass pressure / pivot |
| Weezing | Levitate | Rocky Helmet | Sludge Wave / Flamethrower / Will-O-Wisp / Pain Split | Ground immunity / burn / non-projectile Poison pressure |
| Claydol | Levitate | Sitrus Berry | Earth Power / Psychic / Ice Beam / Trick Room | Bulky room setter / coverage |
| Cacturne | Water Absorb | Focus Sash | Seed Bomb / Knock Off / Sucker Punch / Drain Punch | Water immunity / Grass-Dark pressure / priority |

공통 빌드 정의 자체는 바꾸지 않고 두 간부용 override만 사용했다. 따라서 다른 NPC의 폭타·크로뱃·점토도리 세트는 그대로다. 저수·기합의띠·돌격조끼·검은진흙 등은 현재 roster/held-item 목록과 TeamValidator로 확인했다. 아이템 목록을 확장하지 않았다.

### 기존 크로뱃 보정의 효과

기준 384전에서 크로뱃의 Giga Drain과 U-turn 실제 사용은 모두 0이었다. Life Orb/Giga Drain/preferredLead를 함께 제거한 반사실 비교에서 전반 승률은 동일했고 후반은 오히려 두 NPC 모두 2.1pp 낮아졌다. 따라서 기존 보정이 물 대응을 해결했다고 볼 근거는 없다. 세 요인을 함께 바꾼 실험이므로 각각의 인과 효과로 분리하지 않는다.

| NPC | F45 보정 있음 / 제거 | F95 보정 있음 / 제거 |
|---|---|---|
| 호걸 | 97.9% / 97.9% | 100.0% / 97.9% |
| 구열 | 97.9% / 97.9% | 95.8% / 93.8% |

최종 크로뱃은 Black Sludge / Brave Bird / Cross Poison / U-turn / Roost로 바꿨다. 물 대응은 실제 저수·풀 STAB·기합의띠·선공기가 있는 선인왕에게 넘겼다. 최종 primary에서도 크로스포이즌/유턴 사용은 0이므로, 두 기술이 승률 개선을 만들었다고 주장하지 않는다. 크로뱃은 주로 브레이브버드와 날개쉬기를 사용했고, 검은진흙은 Life Orb의 추가 반동을 없앤 회복 선택이다.

## 3. Before → After

플레이어 대리 AI의 단판 승률이며 낮을수록 NPC가 강하다. 기존 네 benchmark, 여섯 플레이어 룰, 같은 팀/배틀 seed, F45/F95를 유지했다. 각 NPC/층 96전이다. 원작 소유 여부와 별개로 모든 세트는 프로젝트 현재 포맷에서 합법적이다.

| NPC | probe | Before | After | 변화 | holdout Before → After |
|---|---|---|---|---|---|
| 호걸 | F45 | 97.9% (94/96) | 78.1% (75/96) | -19.8pp | 84.4% → 75.0% |
| 호걸 | F95 | 100.0% (96/96) | 77.1% (74/96) | -22.9pp | 99.0% → 88.5% |
| 구열 | F45 | 97.9% (94/96) | 81.3% (78/96) | -16.7pp | 84.4% → 75.0% |
| 구열 | F95 | 95.8% (92/96) | 77.1% (74/96) | -18.8pp | 94.8% → 88.5% |

holdout은 최종 세트 확정 뒤 따로 검사한 seed 17~20이며 이 결과를 보고 다시 세트를 튜닝하지 않았다. primary Before/After 각 384전, holdout Before/After 각 384전 모두 오류 0이다. 후보 1~2마리/개별 기술·도구·규칙·역할 조정으로 개선했고 AI 또는 스탯 배율은 바꾸지 않았다.

### Benchmark별

| NPC | floor | benchmark | Before | After |
|---|---|---|---|---|
| 호걸 | 45 | starters | 100.0% (24) | 83.3% (24) |
| 호걸 | 45 | offense | 100.0% (24) | 91.7% (24) |
| 호걸 | 45 | bulk | 95.8% (24) | 37.5% (24) |
| 호걸 | 45 | signature | 95.8% (24) | 100.0% (24) |
| 호걸 | 95 | starters | 100.0% (24) | 70.8% (24) |
| 호걸 | 95 | offense | 100.0% (24) | 87.5% (24) |
| 호걸 | 95 | bulk | 100.0% (24) | 50.0% (24) |
| 호걸 | 95 | signature | 100.0% (24) | 100.0% (24) |
| 구열 | 45 | starters | 100.0% (24) | 95.8% (24) |
| 구열 | 45 | offense | 100.0% (24) | 91.7% (24) |
| 구열 | 45 | bulk | 95.8% (24) | 37.5% (24) |
| 구열 | 45 | signature | 95.8% (24) | 100.0% (24) |
| 구열 | 95 | starters | 100.0% (24) | 70.8% (24) |
| 구열 | 95 | offense | 100.0% (24) | 87.5% (24) |
| 구열 | 95 | bulk | 100.0% (24) | 50.0% (24) |
| 구열 | 95 | signature | 83.3% (24) | 100.0% (24) |

### 플레이어 rule별

| NPC | floor | rule | Before | After |
|---|---|---|---|---|
| 호걸 | 45 | basic | 100.0% (16) | 81.3% (16) |
| 호걸 | 45 | mega | 93.8% (16) | 62.5% (16) |
| 호걸 | 45 | dynamax | 100.0% (16) | 93.8% (16) |
| 호걸 | 45 | tera | 100.0% (16) | 81.3% (16) |
| 호걸 | 45 | chaos | 100.0% (16) | 75.0% (16) |
| 호걸 | 45 | z | 93.8% (16) | 75.0% (16) |
| 호걸 | 95 | basic | 100.0% (16) | 62.5% (16) |
| 호걸 | 95 | mega | 100.0% (16) | 68.8% (16) |
| 호걸 | 95 | dynamax | 100.0% (16) | 93.8% (16) |
| 호걸 | 95 | tera | 100.0% (16) | 75.0% (16) |
| 호걸 | 95 | chaos | 100.0% (16) | 87.5% (16) |
| 호걸 | 95 | z | 100.0% (16) | 75.0% (16) |
| 구열 | 45 | basic | 100.0% (16) | 81.3% (16) |
| 구열 | 45 | mega | 93.8% (16) | 75.0% (16) |
| 구열 | 45 | dynamax | 100.0% (16) | 93.8% (16) |
| 구열 | 45 | tera | 100.0% (16) | 81.3% (16) |
| 구열 | 45 | chaos | 100.0% (16) | 81.3% (16) |
| 구열 | 45 | z | 93.8% (16) | 75.0% (16) |
| 구열 | 95 | basic | 93.8% (16) | 62.5% (16) |
| 구열 | 95 | mega | 93.8% (16) | 68.8% (16) |
| 구열 | 95 | dynamax | 100.0% (16) | 93.8% (16) |
| 구열 | 95 | tera | 93.8% (16) | 75.0% (16) |
| 구열 | 95 | chaos | 100.0% (16) | 87.5% (16) |
| 구열 | 95 | z | 93.8% (16) | 75.0% (16) |

## 4. Lineup

각 NPC × F45/F55/F95 × 1,000회, before/after 각각 6,000회 generateOpponentTeam을 호출했다. 아래 slow는 세 마리 모두 원종 base Speed ≤70인 조합이다. 우선기·아이템·메가 폼의 실제 전투 Speed를 대체하는 지표는 아니다. Water response는 물 내성/흡수 또는 풀 공격 coverage 포함, hard response는 물 내성/흡수 포함이다. 기존 크로뱃의 미사용 기가드레인도 전자의 coverage로 세므로 두 지표를 구분한다.

| NPC | F | 가능 lineup | slow Before → After | 물4배 2마리 이상 Before → After | coverage 포함 response Before → After | hard response Before → After | ace/carrier/규칙 After |
|---|---|---|---|---|---|---|
| 호걸 | 45 | 6 → 7 | 43.2% → 27.5% | 44.8% → 0.0% | 56.8% → 51.9% | 0.0% → 51.9% | 100.0% / 없음 / 100.0% |
| 호걸 | 55 | 6 → 7 | 44.7% → 28.6% | 46.0% → 0.0% | 55.3% → 54.8% | 0.0% → 54.8% | 100.0% / 없음 / 100.0% |
| 호걸 | 95 | 6 → 7 | 45.3% → 25.2% | 45.1% → 0.0% | 54.7% → 48.9% | 0.0% → 48.9% | 100.0% / 없음 / 100.0% |
| 구열 | 45 | 6 → 7 | 43.2% → 27.5% | 44.8% → 0.0% | 56.8% → 51.9% | 0.0% → 51.9% | 100.0% / 100.0% / 100.0% |
| 구열 | 55 | 6 → 7 | 44.7% → 28.6% | 46.0% → 0.0% | 55.3% → 54.8% | 0.0% → 54.8% | 100.0% / 100.0% / 100.0% |
| 구열 | 95 | 6 → 7 | 45.3% → 25.2% | 45.1% → 0.0% | 54.7% → 48.9% | 0.0% → 48.9% | 100.0% / 100.0% / 100.0% |

폭타+마그카르고 조합은 완전히 사라졌다. 단 폭타+선인왕+또도가스/그라에나는 여전히 느리다. 이 조합에는 저수·기합의띠·기습과 상태/위협 역할이 있어, 느리다는 이유만으로 모두 배제하거나 고정 3마리로 만들지 않았다. 전체 lineup/lead/last 빈도는 감사 JSON에 보존했다.

| NPC / F95 | lineup | 빈도 |
|---|---|---|
| 호걸 | Camerupt / Claydol / Crobat | 193/1000 |
| 호걸 | Camerupt / Crobat / Mightyena | 164/1000 |
| 호걸 | Camerupt / Crobat / Weezing | 154/1000 |
| 호걸 | Cacturne / Camerupt / Crobat | 143/1000 |
| 호걸 | Cacturne / Camerupt / Weezing | 138/1000 |
| 호걸 | Cacturne / Camerupt / Mightyena | 114/1000 |
| 호걸 | Cacturne / Camerupt / Claydol | 94/1000 |
| 구열 | Camerupt / Claydol / Crobat | 193/1000 |
| 구열 | Camerupt / Crobat / Mightyena | 164/1000 |
| 구열 | Camerupt / Crobat / Weezing | 154/1000 |
| 구열 | Cacturne / Camerupt / Crobat | 143/1000 |
| 구열 | Cacturne / Camerupt / Weezing | 138/1000 |
| 구열 | Cacturne / Camerupt / Mightyena | 114/1000 |
| 구열 | Cacturne / Camerupt / Claydol | 94/1000 |

| NPC / F95 | lead frequency | last frequency |
|---|---|---|
| 호걸 | {"Crobat":654,"Claydol":94,"Weezing":61,"Camerupt":86,"Cacturne":68,"Mightyena":37} | {"Camerupt":460,"Cacturne":202,"Weezing":114,"Mightyena":127,"Claydol":97} |
| 구열 | {"Crobat":654,"Claydol":94,"Weezing":61,"Camerupt":86,"Cacturne":68,"Mightyena":37} | {"Camerupt":460,"Cacturne":202,"Weezing":114,"Mightyena":127,"Claydol":97} |

## 5. Mega Camerupt

| 단계 | available | activation | 사용률 | 평균 턴 |
|---|---|---|---|
| before F95 | 96 | 96 | 100.0% | 3.94 |
| after F95 | 96 | 92 | 95.8% | 4.12 |

Courtney F45는 기존 floor gate 때문에 activation 0/0이다. Tabitha는 두 층 모두 무기믹이다. 최종 Courtney에서 메가 사용 여부만 비교한 반사실 검사는 아래와 같다. signature를 끈 쪽은 기본 Sitrus Berry를 유지하므로 순수 종족값 효과가 아닌 메가 도구/기믹 선택 전체의 효과다. 선출·seed·AI는 같다.

| floor | 실제 메가 세트 player win | signature off + 기본 열매 player win |
|---|---|---|
| 45 | 81.3% (78/96) | 81.3% (78/96) |
| 95 | 77.1% (74/96) | 79.2% (76/96) |

저수 관련 실제 p2 protocol event는 호걸 44건, 구열 40건이다. 선인왕의 씨폭탄/기습 실제 사용과 메가폭타의 대지의힘/불대문자 사용은 감사 JSON의 moves 집계에서 확인한다. 메가 사용률 하나로 성공 여부를 판단하지 않았다.

## 6. 남은 약점과 판단

의도된 약점: 폭타/메가폭타는 느리고 물 4배 약점이 있다. 팀 전체를 빠른 풀 메타 포켓몬으로 대체하지 않았다. 선인왕은 약한 내구를 기합의띠로 한 번 보완하는 공격수이며 모든 상대를 막는 벽이 아니다. 점토도리는 물 약점이 남지만 격투 내성과 부유, 트릭룸을 분담한다.

남은 강한 편향: signature benchmark에는 primary 승률 100%가 남는다. 특히 Mimikyu/Kommo-o/Gyarados와 플레이어 Dynamax가 강한 상대다. 최종 holdout Dynamax는 두 NPC 모두 93.8%다. 이 매치업을 50%로 만들려고 공통 AI/기믹 엔진을 바꾸거나 후보를 다시 대량 교체하지 않았다. 반면 bulk에는 43.8%, starters에는 77.1~83.3%, offense에는 89.6%여서 기존의 거의 모든 benchmark·룰에서 95~100%인 상태는 해소됐다. 전체 난이도는 개선됐지만 signature의 95~100% 반복은 요청된 완료 기준을 충족하지 못한다. 따라서 마그마단 간부 추가 설계 필요로 판정한다. 공통 AI를 바꾸거나 세 번째 후보를 추가해 이 결과를 숨기지 않았다.

기존 크로뱃 패키지의 제한을 확인하고 실제 물 면역 역할을 더한 것이 핵심이다. 위협/악 압박 역할인 그라에나에는 구애머리띠와 4공격기를 적용했다. 헬가를 검토했으나 격투 약점 중복과 방탄 짜랑고우거 상대 오물폭탄 반복 문제가 있어 본가 조직 공용 계열의 점토도리를 선택했다. 또도가스도 오물폭탄 대신 방탄에 막히지 않는 오물웨이브를 사용한다. 점토도리의 실제 primary 행동은 사이코키네시스·대지의힘·냉동빔이며 트릭룸 사용은 0회다. 트릭룸 슬롯은 잠재적인 속도 역전 수단이며 승률 개선을 트릭룸 연계 효과로 해석하지 않는다. 5~16번 seed는 중간 확인이고 마지막 구성은 17~20번 seed로 검증한 뒤 추가 튜닝하지 않았다.

## 7. 테스트·재현

```powershell
node --import tsx scripts/review-hoenn-npc-samples.ts
node scripts/export-normal-npc-runtime.mjs --check
node --import tsx --test tests/magma-executives.test.ts tests/hoenn-named-trainers.test.ts tests/named-selection-rules.test.ts tests/npc-templates.test.ts tests/npc-gimmicks.test.ts
node node_modules/typescript/bin/tsc --noEmit
node --require ./scripts/windows-build-links.cjs node_modules/next/dist/bin/next build
node --import tsx node_modules/@playwright/test/cli.js test e2e/hoenn-named-trainers.spec.ts
$env:HOENN_NPCS='magma-executive-tabitha,magma-executive-courtney'
$env:HOENN_OUTPUT='artifacts/experiments/balance/magma-executives-20261018'
$env:HOENN_TRACES='1'
node --import tsx scripts/simulate-hoenn-npcs.ts
node --import tsx scripts/report-magma-executives.ts
```

Before는 git show 5325869e2c042f27767501af521c4168ebddd8d6:src/data/normal-npc-templates.json 으로 저장한 읽기 전용 기준 파일을 NPC_BALANCE_BASELINE에 지정하고, --import ./scripts/lib/npc-balance-baseline.mjs --import tsx 및 --before로 실행한다. 이 두 NPC의 catalog/AI 설정은 그대로이므로 runtime 기준 치환으로 동일 조건을 재현한다. holdout은 HOENN_SEED_START=17이며 본 실험의 count는 기존과 같은 4다.

원시 전투·시드·manifest·16개 기본 룰 trace는 로컬 실험 폴더에 있고, 추적 가능한 집계/trace 요약은 `artifacts/reports/npc/magma-executives-audit.json`에 있다. 다른 NPC·Maxie/Archie·조무래기·아쿠아 샘플은 before commit과 구조적으로 동일하다.

최종 실행 결과:

- `node --import tsx --test tests/magma-executives.test.ts tests/hoenn-named-trainers.test.ts tests/named-selection-rules.test.ts tests/npc-templates.test.ts tests/npc-gimmicks.test.ts`: 48개 통과, 실패 0. 후보 합법성, 실제 7개 선출 조합, 층별 포인트·기믹 경계, Tactical 상한, 이벤트 snapshot 직렬화와 v12 전투·재현을 확인했다.
- `node scripts/export-normal-npc-runtime.mjs --check`: 284개 검토 정의와 runtime 일치.
- `node node_modules/typescript/bin/tsc --noEmit`: 통과.
- `node --require ./scripts/windows-build-links.cjs node_modules/next/dist/bin/next build`: 최종 프로덕션 빌드 통과. 최초 실행은 Windows junction 접근 오류로 중단됐고, 권한 요청 뒤 동일 명령으로 재실행했다.
- `node --import tsx node_modules/@playwright/test/cli.js test e2e/hoenn-named-trainers.spec.ts`: 최종 빌드에서 4개 통과. 샌드박스 소켓 차단 후 권한 요청으로 실행했다. 이 E2E는 원규·철구·민지·회연의 1280/390px 진입·행동 제출·새로고침과 저장된 팀/seed 보존 검사다. 두 마그마 간부의 새 세트는 위 snapshot/전투 integration tests로 별도 확인했다.
- Primary Before/After 각 384전, final holdout(seed 17~20) Before/After 각 384전, 오류 0. 기존 크로뱃 패키지 제거 비교 384전, 최종 메가 비활성 비교 192전도 오류 0.
- Before/After 각 6,000회 선출 telemetry: 두 NPC × F45/F55/F95 × 1,000회. 에이스·구열 carrier 포함률과 규칙 충족률은 100%, 가능한 조합은 7개다.
- 기준 commit `5325869e2c042f27767501af521c4168ebddd8d6`와 비교해 다른 282개 검토/runtime 정의는 구조적으로 일치한다. 보고서 생성기는 공통 AI·Z 결정·selection rules·opponent team·templates·성장·NPC gimmicks·gimmick engine 파일이 기준과 같은지도 검사한다.
- `git diff --check`: 통과. 전체 859개 suite를 이번 작업에서 다시 실행했다고 주장하지 않는다.

최종 판정은 aggregate 승률 개선만으로 내리지 않았다. 두 NPC 모두 signature benchmark의 F45/F95 24전씩에서 플레이어 승률 100%가 남아, 요청된 반복 고승률 중단 기준에 따라 **마그마단 간부 추가 설계 필요**로 남긴다.


마그마단 간부 추가 설계 필요
