# 도전자 보상과 공통 배낭 unique ownership

2026-10-17. `0149828578017ad7c4c35b1444d523ce6d7c0b03` 이후 현재 코드에서 보상 지급만 정리했습니다.

## 구현 보고

1. **기존 Elite epic**: 룰 적격·미보유 epic 도구 전체를 `item-exchange.items`에 저장했습니다. 승리 후 교환권을 보상 재고로 받고 나중에 원하는 도구를 고르는 방식이었습니다.
2. **새 snapshot**: 같은 기존 epic pool에서 RNG로 한 개를 결정합니다. 기존 effect를 재사용해 `items:[확정 도구], direct:true, fallbackCoins:1500`을 저장합니다. 별도 보상 종류 선택이나 승리 후 아이템 재추첨은 없습니다.
3. **직접 지급**: applyRewardOption이 direct 단일 도구를 공통 grantRunItem으로 지급합니다. 교환권 재고 행을 만들지 않고 Run Bag의 도구 Pocket에 등록합니다. 결과 UI는 실제 도구 이름과 배낭 등록을 표시합니다.
4. **생성 중복 제외**: allowsRuleItem → ownsRunItem 필터를 적용합니다. 현재 Bag, 장착, 장비, 미사용 단일 item-exchange 보상 재고의 예약을 기존 공통 helper로 판정합니다. 여러 선택지가 남은 교환권이나 선택되지 않은 도전자 후보는 확정 소유로 보지 않는 기존 정책을 유지합니다. 적격 도구가 없으면 생성 순간 1,500코인을 snapshot합니다.
5. **도구 지급 직전**: ownsRunItem으로 다시 검사합니다. 이미 소유/예약됐다면 새 도구를 뽑지 않고 저장된 fallbackCoins를 지급합니다. snapshot은 그대로 두고 result.entries에는 실제 지급한 코인을 저장합니다.
6. **TM snapshot**: 기존 unique/epic pool에서 ownsMachine이 참인 기술을 제외하고 한 개를 확정합니다. 신규 snapshot에 fallbackCoins:1500을 함께 저장합니다. 전체 pool 보유 시 생성 단계에서 1,500코인을 확정합니다.
7. **TM compatibility**: 후보 생성에는 roster/learnset 검사가 없습니다. 아무도 배울 수 없는 TM도 보상 후보가 됩니다. Bag 사용 시 기존 룰·learnset·현재 기술·교체 칸 검증을 적용합니다. Run TM은 수량 없이 표시하고 반복 사용하며 새 계정 move_unlocks를 만들지 않습니다.
8. **TM 지급 직전**: fallbackCoins가 있는 신규 snapshot은 ownsMachine을 다시 검사해 이미 소유했다면 1,500코인을 지급합니다. 재추첨/중복 행 생성 없이 실제 코인을 결과에 기록합니다.
9. **Master 장비**: eggs/growth/equipment 세 후보 중 하나 선택, 수치와 확률 유지. 생성 시 미보유·룰 적격 장비가 없으면 기존 5,000코인, 생성 후 장비가 중복되면 기존 1,500 성장 포인트입니다. 생성 ownership 검사는 공통 ownsRunItem으로 통일하고 grantEquipment의 중복 방지와 fallback은 유지합니다.
10. **Mirror**: 랜덤 Master급 보상 한 종류 유지. 장비 생성만 공통 ownsRunItem 필터로 통일합니다. 장비 부족/지급 시 중복의 기존 1,500P fallback, IV/이로치 대상 선택, 영입 없음, 보상 수치·가중치는 유지합니다.
11. **Legacy**: DB/schema migration이나 저장 snapshot 재추첨이 없습니다. direct가 없는 기존 다중 item-exchange는 기존 교환권 흐름과 저장된 fallback을 유지합니다. fallbackCoins가 없는 기존 TM도 기존 grantStoredReward 경로를 사용합니다. 선택 UI가 없는 직접 지급은 새로 생성되는 epic snapshot부터 적용합니다.
12. **exact-once**: 기존 TowerStore.complete의 BEGIN IMMEDIATE 트랜잭션과 battle.status 완료 검사를 그대로 사용합니다. 지급·battle 완료·run_events.result_json은 함께 commit/rollback됩니다. Master 선택도 기존 event_reward_selections와 선택 상태를 사용해 같은 선택은 재지급하지 않고 다른 선택은 거절합니다. 보상 RNG는 기존 eventId/candidateId 전용 seed이며 Trainer/rank/team RNG와 분리됩니다.
13. **변경 파일**: 아래 목록 참조.
14. **검증**: 아래 결과 참조.
15. **유의점**: 기존 다중 교환권은 호환을 위해 선택형으로 남습니다. 예약 판정은 기존 확정 단일 보상 재고 정책을 따릅니다. 신규 도전자 후보 자체를 미리 배낭 소유권으로 등록하지 않습니다. 후보 생성 이후 다른 경로로 소유가 바뀌어도 지급 시 고정 fallback을 처리합니다.

## 유지한 보상 가치

| 등급 | 기존 값 유지 |
|---|---|
| Normal | 300코인 70% / 일반 알 티켓 1장 30% |
| Elite | 1,500코인 30%, 티켓 3~5장 25%, 서로 다른 영양제 1~2종 15%, 성장 300P 10%, epic 8%, unique/epic TM 12% |
| Master | 알/성장/장비 3후보 중 1개. 일반 티켓 10장·슈퍼레어·이로치 비중 60/35/5, 성장 1,500P, 장비 fallback 기존 값 유지 |
| Mirror | 기존 단일 랜덤 보상과 강화 대상 선택 유지. 등장/보상 확률·수치 변경 없음 |

## 변경 파일

- [rewards.ts 모델](../../../src/data/rewards.ts): 기존 effect에 선택적 direct/fallbackCoins metadata.
- [challenger-rewards.ts](../../../src/server/challenger-rewards.ts): 단일 도구 확정, TM fallback snapshot, 장비 공통 ownership.
- [rewards.ts 지급](../../../src/server/rewards.ts): 직접 도구 지급 및 신규 도구/TM의 지급 시 fallback과 실제 result.
- [mirror-challenger.ts](../../../src/server/mirror-challenger.ts): 장비 생성 ownership helper 재사용.
- [reward-panel.tsx](../../../src/web/reward-panel.tsx): 직접 도구 이름과 TM 배낭 등록 표시.
- [challenger-unique-rewards.test.ts](../../../tests/challenger-unique-rewards.test.ts), [rank-rewards.test.ts](../../../tests/rank-rewards.test.ts), [rank-rewards.spec.ts](../../../e2e/rank-rewards.spec.ts): 신규/legacy/중복/복구/실패/표시 검증.
- 이 문서와 [EVENTS.md](../../../docs/gameplay/EVENTS.md), [BAG.md](../../../docs/engineering/BAG.md).

ChallengerEvents의 후보 저장·승리 흐름, RewardModal, rankRewardProfiles 수치, inventory DB, Hidden Shop과 일반상점 구현은 이번 보상 정리에서 변경하지 않습니다.

## 최종 검증 결과

- 전체 단위·통합 **677/677 통과**: Challenger/Normal/Elite/Master/Mirror, 거래·receipt rollback, Bag/상점/알/트레이너 장비/영양제/TM 및 기존 전투·DB 호환 포함.
- Challenger/Mirror/Rank 보상 실제 Chrome **27/27 통과**: PC1280·모바일390, 상세 보상 비노출, 직접 도구 이름/등록, stale 도구/TM의 실제 1,500코인 표시·재접속, Master 3선택·중복 API, Mirror 강화 대상과 영입 없음.
- 최종 보상 문구 정리 후 Rank Chrome **9/9 재통과**.
- TypeScript, Next 프로덕션 빌드, CSS 구조, 문서 링크, git diff --check 통과.
- 테스트 전용 계정/SQLite 사용. 실제 사용자 진행 DB 변경 없음.

[직접 도구 보상](../../qa/screenshots/rank-rewards/elite-epic.png) · [중복 도구의 코인 대체](../../qa/screenshots/rank-rewards/stale-epic-390.png) · [중복 TM의 코인 대체](../../qa/screenshots/rank-rewards/stale-machine-390.png)
