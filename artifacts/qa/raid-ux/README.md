# Raid v1 UX 수정 보고

기준: `2f9e842d2eecda5d2746e008e9da8e78c6bd0cc7`.

이번 변경은 프레젠테이션과 발견/보상 화면 분기에 한정했다. 작업 시작 전에 이미 존재하던 `raidEventTestSettings`와 서버의 3층부터 Raid 강제 출현 변경은 그대로 보존했다. 이벤트/Boss 가중치, shiny/IV/EV, 보상 확률과 지급·영입·재도전·snapshot 트랜잭션은 수정하지 않았다.

## 요청한 17개 항목

1. **이전 전환이 약했던 이유**: Raid switch가 650ms charge와 650ms reveal만 생성했다. 기존 shell/burst/flash가 빠져 있었고, HP 100%가 form과 동시에 바로 표시됐으며, 4배속에서는 같은 문구를 유지하는 VFX 프레임이 더 짧아졌다. 같은 form인 뮤츠 final에도 이 Mega 두 단계를 그대로 적용했다.

2. **강화한 sequence**: HP 0 pause → 첫 문구 → mega-charge → mega-shell → mega-burst → mega-flash → 새 form과 HP reset을 동반한 mega-reveal → 두 번째 문구 유지 → 다음 turn이다. 기존 sprite는 flash까지 유지하며 reveal에서만 새 sprite를 표시한다. 새 turn 프레임은 이 sequence 뒤에 온다.

3. **재사용한 Mega 연출**: 기존 다섯 Motion, `gimmick-theme.module.css`의 Mega orb/shell/shards/ring/arena flash, 기존 Mega 음향을 재사용했다. 일반 Mega presentation 분기는 그대로다. 메가스톤·키스톤 문구는 추가하지 않았다.

4. **HP reset**: 기존 HealthCard에 presentation-only `raidReset` prop을 추가했다. 변환 중 old HP 0을 유지하고, reveal에서 기존 HP bar를 다시 장착해 600ms 동안 가로 scale 0→1로 채운다. 카드에는 650ms fade/brightness reset을 적용한다. 실제 HP를 0으로 쓰거나 서버 상태를 지연시키지 않는다. reduced-motion에서는 이 animation을 생략한다.

5. **4배속 최소 표시**: Frame의 `minimumDuration`을 기존 playbackDuration에 전달한다. Raid VFX의 CSS playbackRate는 최대 2배로 제한한다. ordinary attack/message/Mega 타이밍은 그대로다. 명시적인 Shift/건너뛰기는 계속 동작한다.

| 구간 | 1배속 기본 시간 | 보장하는 최소 시간 |
|---|---:|---:|
| HP 0 pause | 300ms | 200ms |
| 첫 문구 | 1000ms | 700ms |
| Mega charge | 950ms | 475ms |
| Mega shell | 650ms | 325ms |
| Mega burst | 400ms | 200ms |
| Mega flash | 250ms | 125ms |
| form/HP reveal | 850ms | 700ms |
| 두 번째 문구 유지 | 550ms | 350ms |

문구의 기존 가독성 계산이 더 길면 그 시간을 사용한다. Mega 전환은 공격 연출을 제외하고 기본 약 4.95초, 4배속에서도 최소 약 3.08초다. HealthCard animation은 배속을 올리지 않아 HP 채움을 끝까지 볼 수 있다.

6. **뮤츠 final aura**: 공개된 이전/다음 form이 같으면 `raid-aura-charge → raid-aura-burst → raid-aura-reveal`을 사용한다. 같은 Mega sprite를 유지하며 purple energy ring, glow, 짧은 burst/국소 shake를 보여준다. orb/shell/shards나 Mega flash를 사용하지 않는다. aura charge 700ms/최소350ms, burst 450ms/최소225ms, reveal 850ms/최소700ms다. X/Y 모두 같은 공통 코드다.

7. **발견 화면 재등장의 정확한 원인**: `RunEventScene`의 `if(event.raid) return <RaidScene .../>`가 phase를 확인하지 않았다. 승리 보상은 기존 event의 reward 단계이고 raid 데이터가 계속 있으므로, 영입 후 다시 표시되는 event에 발견 실루엣을 그렸다.

8. **새 렌더 조건**: `kind==='raid-encounter' && raid && phase==='choice' && !choiceId`일 때만 발견 RaidScene을 표시한다. battle 단계나 이미 challenge한 choice에서는 표시하지 않는다. reward에서는 RaidVictoryScene을 표시한다.

9. **승리→영입→보상**: 기존 BattleResultDialog 안내를 유지한다. 영입으로 계속 → 기존 후보/확인 → 기존 RecruitCelebration → 레이드 승리 배경과 특별한 보상 RewardModal → 확인으로 event complete다. 보상 트랜잭션의 지급 시점과 영수증은 그대로다.

10. **영입 거절**: 영입 없이 계속 → 특별 보상으로 바로 이어진다. 실루엣, 후보 선택, 영입 연출을 다시 표시하지 않는다. 영입 거절 전후 result_json/코인이 변하지 않고 기존 승리 보상을 유지함을 검사했다.

11. **배경과 문맥**: 현재 architecture는 영입 완료 뒤 battle을 응답에서 제거하므로, 같은 arena scenery 위의 중립적인 RaidVictoryScene을 사용했다. ‘레이드 승리!’와 승리 emblem을 배경으로 표시하며 하단 header도 ‘레이드 승리’다. RewardModal heading은 저장된 `result.title`인 ‘특별한 보상’이다. 새 Page나 client-only 마지막 전투 cache를 만들지 않아 새로고침에도 동일하다.

12. **중복 메시지**: `[raid]` faint/switch의 기존 log 숨김을 유지한다. 프레젠테이션은 원래 protocol의 두 message를 사용하며 result line을 한 번만 소비한다. 추가 phase/system/키스톤 문구를 만들지 않는다. 실제 S키 배틀 기록창에서도 각 전환 문구가 한 번씩만 나옴을 검사했다.

13. **PC 1280×900**: Garchomp, Mewtwo X/Y의 실제 4배속 전투 3개를 검증했다. old sprite·HP 0, 다섯 Mega Motion, reveal 시 새 이름/HP100/fill animation, final aura의 같은 sprite, 메시지 기록을 확인했다. 가로 overflow와 HealthCard의 viewport 이탈이 없었다.

14. **Mobile 390×844**: 같은 세 경로를 실제 4배속으로 검증하고 VFX/HP/대화 배치를 스크린샷으로 확인했다. 영입/영입 거절/보상과 보상 중 새로고침도 검증했다. 특별 보상 모달이 viewport 안에 표시되며 최초 실루엣은 없다.

15. **이번 UX 변경 파일**:
    - `src/web/battle-presentation.ts`: Raid sequence, 공개 form 기반 Mega/aura 분기, minimumDuration.
    - `src/web/playback-settings.tsx`: optional minimumDuration.
    - `src/web/battle-game.tsx`: Raid animation rate 상한, HP reset/오라 표시 연결.
    - `src/web/battle-pokemon.tsx`: 기존 HealthCard reset 표시.
    - `src/web/run-event.tsx`: 발견/승리 분기와 Raid reward heading.
    - `src/web/raid-scene.tsx`: RaidVictoryScene.
    - `src/web/styles/battle-health.module.css`, `gimmick-theme.module.css`, `raid.module.css`.
    - `tests/raid-presentation.test.ts`: 5개 전환 frame 테스트와 scene 상태 테스트.
    - `e2e/raid-events.spec.ts`: 보상·영입 거절·새로고침의 발견 화면 비노출 검사.
    - `e2e/raid-transition-ux.spec.ts`: 실제 4배속 6개와 일반 승리/영입 2개 UI 테스트.
    - 이 보고서와 `standard-event-tests.mjs`는 QA 산출물이다. 기존 별도 작업인 `src/data/raids.ts`, `src/server/run-events.ts`, `tests/raid-playtest.test.ts`는 이번 UX 구현에 포함하지 않는다.

16. **테스트 결과**:
    - Presentation/Mega/playback/message/Raid mechanics 묶음: **43개 통과**.
    - Challenger/unique rewards/Hidden Shop/normal event/collection/training/field 회귀: **101개 통과**.
    - Raid 발견→승리→영입/거절→보상 UI: **7개 통과**.
    - 4배속 phase UX PC·Mobile: **6개 통과**.
    - 일반 승리·영입 UI PC·Mobile: **2개 통과**.
    - 기존 Hidden Shop·미스터리 상자 RewardModal UI: **24개 통과**.
    - TypeScript, production build, CSS structure, `git diff --check`: 통과.
    - 일반 이벤트 회귀를 처음 현재 강제 Raid 설정으로 실행하면 Challenger/상인 fixture도 Raid로 바뀐다. 따라서 일반 이벤트 묶음에만 `standard-event-tests.mjs`를 preload해 그 Node 테스트 프로세스의 강제 출현을 비활성화했다. 게임 설정 파일이나 실행 앱의 설정은 변경하지 않았다. 명령과 로그는 아래에 있다.

17. **Mechanics regression**: `src/battle/raid.ts`, phase 생성/IV/EV/shiny/recruit snapshot, 승리 보상 지급·fallback·receipt, retry 저장을 수정하지 않았다. 실제 엔진 테스트에서 독립 HP, 초과 피해 폐기, multi-hit 중단, 남은 행동 취소, 다음 턴 진입, boss 상태 초기화, player HP/status/PP/stages 유지, 설치기 보존·재진입 방지, 재도전과 exact-once가 계속 통과한다.

## 재현 명령

```powershell
node node_modules/tsx/dist/cli.mjs --test tests/raid-presentation.test.ts tests/playtest-display.test.ts tests/gimmicks.test.ts tests/battle-message-data.test.ts tests/raid-events.test.ts tests/raid-phases.test.ts
node --import tsx --import ./artifacts/qa/raid-ux/standard-event-tests.mjs --test tests/challenger-events.test.ts tests/challenger-unique-rewards.test.ts tests/hidden-shop-ui.test.ts tests/hidden-shop.test.ts tests/run-event-rules.test.ts tests/battle-field.test.ts tests/collection-roster.test.ts tests/training.test.ts tests/run-events.test.ts tests/mystery-chest.test.ts
node --import tsx node_modules/@playwright/test/cli.js test e2e/raid-events.spec.ts e2e/raid-transition-ux.spec.ts e2e/hidden-shop.spec.ts e2e/mystery-chest.spec.ts
```

회귀 로그: [raid-ux-regression.log](../../experiments/balance/raw/raid-ux-regression.log).

## 화면

- [PC Mega shell](../screenshots/raid-ux/garchomp-mega-1280/mega-shell.png)
- [PC 새 form과 HP 재충전](../screenshots/raid-ux/garchomp-mega-1280/mega-reveal.png)
- [Mobile Mewtwo X final aura](../screenshots/raid-ux/mewtwo-x-390/raid-aura-burst.png)
- [Mobile Mewtwo Y HP 재충전](../screenshots/raid-ux/mewtwo-y-390/raid-aura-reveal.png)
- [Mobile 승리 배경과 특별 보상](../screenshots/raids/reward-mewtwo-390.png)

각 경로의 `frames.json`에는 실제 DOM 관측 시각, sprite 이름, HP 퍼센트와 fill animation 이름이 기록돼 있다.
