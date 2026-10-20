# Raid 전투 스탯 2차 미세조정

기준 `2806594f`의 Tune1에서 Mewtwo / Zacian / Rayquaza / Kyogre / Groudon만 한 번 조정했다. 이후 목표 승률에 맞춘 추가 튜닝은 하지 않았다.

## 구현

`RaidIVRule.protectedIv`는 Raid 전투의 보호 핵심 스탯을 지정 IV로 보장한다. 생략하면 기존 31 보장이다. 기존 perfect slot 추첨과 난수 소비를 그대로 유지한 뒤 보호 스탯만 덮어쓴다. 따라서 이 필드가 있으면 `perfect`는 실제 31 개수가 아니라 기존 추첨 slot 수다. Mewtwo는 X Atk/Spe, Y SpA/Spe를 23으로 보장한다. Zacian은 Atk/Spe21, Rayquaza는 Atk/Spe24, Kyogre는 SpA24, Groudon은 Atk25다. Kyogre/Groudon Speed는 기존 비보호 추첨이며 무작위 perfect slot에 뽑힐 가능성은 남는다.

새 Raid 전용 training profile의 elite 총 포인트 비율은 각각 43% / 43% / 48% / 50% / 54%다. 기존 `raidTrainingPoints`의 공격·스피드 감점 규칙을 재사용한다. HP/Def/SpD 포인트와 IV는 기존 개체와 같고 HP IV 하한16도 유지된다. 일반 NPC나 플레이어의 IV/포인트 함수는 바꾸지 않았다.

Mewtwo P3만 Speed+1을 제거했다. X Atk+1, Y SpA+1, 3 Phase, Aura 변신·메시지를 유지한다. 이미 저장된 스냅샷은 다시 계산하지 않으므로 과거 Aura와 전투·보상은 보존된다.

`src` 변경은 `src/data/raid-training.ts`, `src/data/raids.ts`, `src/server/raid-events.ts` 세 파일뿐이다. 20종 선언 데이터를 비교해 5종의 IV rule/training과 Mewtwo P3 Speed만 바뀌었음을 검증했다. HP/clamp/native resize/폼/기술/특성/아이템/보상/floor/weight/player policy/team pool은 유지한다.

## 측정

수정 전 Tune1을 같은 seed로 10,000전 다시 실행해 기존 보고서 20종 승률과 일치함을 확인했다. 이 baseline의 선언·표본·전투별 해시는 `raid-stat-tuned-2-baseline.json`에 저장했다. 신규 `scripts/simulate-raid-stat-tuning-2.ts`가 기존 `runRaidSimulationJobs`를 사용해 다시 20 × 500전, 보스별 85/95층 각 250전을 실행한다.

모든 전투의 seed·층·팀·분기와 보상 IV/포인트/성격/종이 수정 전과 같다. 조정하지 않은 15종은 승률뿐 아니라 **7,500개 전체 SimulationRow의 해시**가 동일하다. 이 해시에는 전투 IV/포인트/프로토콜/승패가 포함된다. 모든 native 최대 HP 측정값, interval budget 합계, Phase loss 합계와 기존 보고서 해시도 검증했다. 재측정한 두 실행의 20종 승수 역시 일치했다.

원시 전투 CSV는 로컬 보존하며, 영구 baseline 해시 파일이 있어 새로운 checkout에서도 동일 비교를 재실행할 수 있다. 명령은 `npm run raid:simulate:stats2 -- --runs 500`이다.

## 결과

- Mewtwo 5.6% → **7.8%**. X **8.43%**, Y **7.17%**. 둘 다 어렵고 X/Y 차이는 1.26pp다.
- Zacian 13.6% → **20.4%**.
- Rayquaza 26.6% → **28.0%**.
- Kyogre 28.8% → **31.6%**.
- Groudon 34.2% → **36.8%**.
- 나머지 15종은 모두 Tune1과 같다.

Mewtwo P3 패배는 248/472(52.54%) → 241/461(52.28%)로 소폭 감소했다. IV·포인트·Aura를 동시에 바꾼 결과이므로 Speed 제거만의 효과로 분리해서 해석할 수 없다. Zacian은 P1 패배가 177 → 97로 줄었지만 P2 패배는 255 → 301로 늘어 최종 승률 개선은 제한적이다.

Mewtwo <20%이므로 다음 단계에서 P3 공격계+1 제거를 검토할 수 있다. Zacian <25%이므로 Intrepid Sword/Crowned 진입 방식도 후속 검토 대상이다. 이번 작업에서는 유지했다. 다른 세 대상도 제시된 참고 목표보다 낮으며 추가 변경은 하지 않았다.

## 보상과 회귀

`raid-premium` 구현은 수정하지 않았다. 모든 10,000전 보상이 기존과 동일하고 6V/총66포인트다. 5종의 모든 route(총6개)에 대해 실제 보상 프리뷰, SQLite 재접속, 실제 영입, 영구 컬렉션과 런 프로필, 영입 후 재시작에서 IV/성격/포인트가 유지됨을 테스트했다. Volcarona/Kyurem P2 보상과 기존 replay/retry/reload 테스트도 유지했다.

집중 테스트 **51/51**, 다른 Raid 회귀 **108/108**, TypeScript 및 production build 통과. 집중 테스트에는 600개의 seed/route/floor 비교로 비핵심 IV·방어 포인트·보상·이후 난수 결과 보존을 검사하는 테스트가 포함된다. 실제 엔진 Phase별 `storedStats`도 Lv50 포인트/성격 계산과 비교했다. 화면 구조를 바꾸는 작업은 없다.

전체 테스트는 **1,445개 중 1,430개 통과, 15개 실패**다. 실패 이름 15개 모두 Tune1 검증 보고서의 기존 실패 목록과 일치하며 신규 실패 이름은 없다. 상세 결과와 기존 실패 목록은 [검증 JSON](../raid-stat-tuned-2-endgame.validation.json)에 기록했다. 기존 `raid-presentation`의 승리 문구 기대값 불일치와 NPC 고정 baseline/encounter 기대값, trainer-equipment CSS import 등이 포함되며 이번 범위에서 수정하지 않았다.

20종 4단계 비교, 85/95층 route별 실제 IV/포인트와 Lv50 native 스탯, Phase loss, 보상 표본은 [측정 보고서](../raid-stat-tuned-2-endgame.md)에 있다. final native stat 표는 공격 중 랭크 변화 이전 값이며 Aura/특성 랭크는 별도로 표시한다.
