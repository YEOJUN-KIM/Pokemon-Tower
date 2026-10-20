# Mewtwo / Zacian final balance

기준 커밋 `26dd3832`(Tune2). 이번 최종 변경의 `src` diff는 `src/data/raids.ts`와 `src/data/raid-training.ts`뿐이다. 공용 HP/clamp/변신/보상/AI/player policy/NPC/Shop/encounter 로직을 수정하지 않았다.

## Mewtwo

두 route 모두 `.5/.5`의 2 Phase로 변경했다. Mewtwo → Mega Mewtwo X/Y → KO이며 Aura Phase, Aura 메시지와 별도 entry rank가 없다. 기존 Mega 메시지는 같다. Tune2의 core IV23, 육성43%, 기술·특성·보상은 유지한다. 공용 Aura 구현은 보존하므로 이전에 저장한 Tune2 3 Phase 스냅샷은 원래 Aura까지 실행한다.

## Zacian

수정 전 실제 engine 전투에서 최초 등장 시 `|-ability|p2a: Zacian|Intrepid Sword|boost` 1회와 공격+1을 확인했다. Crowned 전환 및 synthetic switch 후에도 횟수1/공격+1이다. Gen9 native `swordBoost`가 한 번만 효과를 적용하므로 특성이나 공용 form transition은 변경하지 않았다. 수정 후에도 동일 횟수를 실제 전투 테스트로 확인했다.

첫 조정 IV19/elite 대비 포인트34%에서 118/500승(23.6%)이었다. 사용자가 이 결과를 본 뒤 명시적으로 공격·스피드 IV0을 요청했다. 이에 두 IV만19 →0으로 바꾸고 육성34%를 유지했다. HP/Def/SpD IV와 포인트는 Tune2와 같다. 중간 IV19 결과는 `raid-final-iv19.*`에 보존했다. 결과를 맞추기 위한 자동 반복 튜닝은 하지 않았다.

## 측정

두 보스 각500전, 85/95층 각250전. 기존 seed/player team/policy/AI를 재사용했다. IV0 최종 결과:

| Boss | Tune1 | Tune2 | Final |
|---|---:|---:|---:|
| Mewtwo | 5.6% | 7.8% | 40.6% |
| Zacian | 13.6% | 20.4% | 36.4% |

Mewtwo X는 102/249승(40.96%), 평균5.49턴. Y는101/251승(40.24%), 평균4.96턴이다. 양쪽 격차0.72pp다. Zacian의 최종 Phase loss는 측정 보고서에 기재했다. 패배 비율은 전체 패배 중 해당 Phase가 차지하는 비율이다.

Mewtwo >=25%, Zacian >=30%의 종료 후보 기준을 모두 충족한다. 추가 변경 없이 종료 후보로 보고한다.

## 회귀와 보존

- Raid 관련 **168/168 통과**. 실제 half-bar multi-hit clamp, X/Y Mega, Aura/rank 미발동, 1회 Intrepid Sword, Crowned, native HP, Volcarona replacement, Kyurem form reward, retry/save/reload/replay를 포함한다.
- 기존 Tune2 Mewtwo X/Y 스냅샷은 3 Phase와 공격 Aura를 그대로 실행하는 별도 테스트를 통과했다.
- 모든 최종1,000개 보상 IV/포인트/성격/종이 Tune2와 동일하다. 6V/총66포인트와 보상 프리뷰·영입·disk reconnect·영입 후 reload도 검증했다.
- Mewtwo X: 기본 Mewtwo / Jolly / Atk32 Spe32 HP2. Y: 기본 Mewtwo / Timid / SpA32 Spe32 HP2. Zacian: 기본 Zacian / Adamant / Atk32 Spe32 HP2. 보상 소스 자체는 변경하지 않았다.
- 다른18종 정의 전체가 Tune2와 동일하다. 전투는 재실행하지 않았다. 같은9,000개 seed의 스냅샷 IV/포인트/HP/분기/reward signature가 Tune2 SimulationRow와 모두 일치한다. 공용 engine/AI/player 소스가 동일함도 검사했다. 실제9,000전 SimulationRow 전체 hash의 재측정 비교를 했다는 의미는 아니다.
- TypeScript와 production build 통과. 이번에는 전체 프로젝트 테스트를 다시 실행하지 않았다. 직전 Tune2 전체 실행에 기록된 기존 실패15건은 별도 범위이며, 이번 Raid 관련 테스트는 모두 통과했다.

최종 표와 Phase loss는 [측정 보고서](../raid-final-endgame.md), source 및 이전 보고서 해시는 [실행 JSON](../raid-final-endgame.json), 검증 요약은 [validation JSON](../raid-final-endgame.validation.json)에 있다. 재현 명령은 `npm run raid:simulate:final`이다.
