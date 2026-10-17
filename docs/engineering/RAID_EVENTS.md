# Raid Event v1 구현 보고

기준 커밋 `a177acbb67fda5ff91914545e7ef068e908f6373`을 포함하는 현재 작업 트리에서 구현했다. 작업 시작 HEAD는 `8e08368b78af1152a3197f6f00370c9a9281c191`이며 기존 변경을 되돌리지 않았다. 신규 보스는 한카리아스와 뮤츠 두 종이다.

## 요청 항목별 구현

1. **Run Event 연결** — `src/data/run-events.ts`의 `eventDefinitions`에 `raid-encounter`를 등록했다. 기존 `selectRunEvent`의 전체 encounterPercent, cooldownFloors, 5층 배수 제외, rulesVersion 조건을 그대로 따른다. 도전은 같은 층의 추가 전투이며, 영입·보상 확인 후 원래 층의 일반 전투를 진행한다.

2. **중앙 설정** — `src/data/raids.ts`의 `raidEventSettings`는 초기 `weight:20`, `minFloor:1`, `minRulesVersion:2`다. 보스 가중치는 한카리아스 80, 뮤츠 20이며 각 보스 minFloor는 1이다. 전체 이벤트 확률은 수정하지 않았다. 현재 공통 `mysteryChest.encounterPercent`는 90, cooldownFloors는 2다. Raid weight는 이벤트 발생 후의 상대 가중치다.

3. **Definition 구조** — `RaidBossDefinition`은 id/species/category/weight/minFloor/ivRule/shinyRule/battleTraining/rewardProfile/routes를 가진다. Route에는 weight, 공격 방향, recruit nature/ability/moves, phases가 있다. `RaidPhaseDefinition`은 species/ability/moves/transformation/messages/buffs를 가진다. 게임 루프에 보스 종별 분기는 없다.

4. **스냅샷** — 이벤트 생성 트랜잭션에서 `raid_encounters.snapshot_json`을 저장한다. version/bossId/species/category/routeId/individual/phases/opponentTeam/recruitTeam/reward를 포함한다. 같은 행에 battle_id를 연결한다. DB v42는 이 테이블을 추가하며 기존 스냅샷은 재생성하지 않는다. 선택 화면에는 spriteId와 category만 전달한다.

5. **실루엣** — 기존 `PokemonImage`에 공통 CSS `filter:brightness(0)`를 적용한다. 별도 PNG나 asset pipeline을 만들지 않았다. 이미지 alt는 ‘정체불명의 포켓몬’이며 shiny sprite는 사용하지 않는다.

6. **오라** — `raidCategoryPresentation`의 6개 category 색 매핑을 사용한다. normal은 푸른 회색 glow, legendary는 금색 glow와 ring이다. pulse는 CSS animation이며 reduced-motion에서 중단된다. 타입 색상이나 난이도 별표는 사용하지 않는다.

7. **등장 문구** — 같은 category 매핑에 요청한 6개 등장 문구를 저장했다. 도전 POST 후 기존 battle presentation이 문구와 실제 sprite를 재생한다. Raid에는 트레이너 등장 확인 화면을 띄우지 않는다.

8. **엔진 표현** — `src/battle/raid.ts`의 작은 adapter가 상대 side의 연속된 slot을 phase로 해석한다. 각 slot의 base set은 기존 Showdown TeamValidator를 통과한다. 폼과 특성의 실제 Dex 유효성도 검사한다. 해당 slot 진입 시 저장된 species/ability를 적용한다. 데미지 공식과 턴 스케줄러는 복제하지 않았다.

9. **남은 행동 취소** — 실제 faint가 발생하므로 Showdown이 쓰러진 slot의 예정된 행동을 실행하지 않는다. 다음 slot은 forced replacement로 진입하고 다음 턴에 행동한다. 상대의 자발 교체와 강제 밀어내기는 막아 phase 순서를 유지한다. 선공/후공 양쪽을 실제 시뮬레이터로 검증했다.

10. **초과 피해·연속 공격** — 기존 faint 처리에서 HP가 0으로 제한되고 multi-hit move가 종료된다. 다음 slot은 별도 HP이므로 초과 피해를 받을 수 없다. Skill Link 고드름침으로 한 타에 phase를 깨는 테스트를 포함했다.

11. **상태 초기화** — 새로운 slot은 독립된 HP/status/stages/volatiles/PP를 가진다. phase의 final buff만 적용한다. 플레이어 HP/status/PP/능력 변화는 전환으로 수정하지 않는다. 전환은 교체가 아니므로 새로운 phase에 설치기의 재진입 피해·독·스피드 하락을 적용하지 않으며, 설치기 자체는 필드에 유지한다.

12. **한카리아스** — Garchomp → Garchomp-Mega, 2 phase. Jolly, Rough Skin, Earthquake/Dragon Claw/Swords Dance/Iron Head의 물리형이다. 메가 phase는 Sand Force다. 요청한 두 문구만 출력한다.

13. **뮤츠 경로 선택** — 스냅샷 생성 시 route를 먼저 가중 추첨한다. X/Y weight는 각각 50이며 route가 정해진 뒤 초기 개체·EV·기술을 만든다. 이후 다시 추첨하지 않는다.

14. **뮤츠 3 phase** — Mewtwo → Mewtwo-Mega-X 또는 Y → 같은 Mega 폼의 final aura. X는 Jolly 물리형, Zen Headbutt/Drain Punch/Ice Punch/Bulk Up이다. Y는 Timid 특수형, Psystrike/Aura Sphere/Ice Beam/Calm Mind다. 기본 특성은 Pressure, X는 Steadfast, Y는 Insomnia다. 모두 실제 validator/engine 테스트를 통과했다.

15. **Final buff** — X는 atk +1/spe +1, Y는 spa +1/spe +1이다. phase definition의 buffs로 관리한다. 실제 새 slot의 boost stage에 적용하며 추가 Mega/Dynamax/Tera는 하지 않는다.

16. **IV** — 한카리아스는 atk/spe를 보호한 정확히 4V다. 나머지 stat에서 두 개를 추가 V로 뽑고 비V는 0~30으로 생성한다. 뮤츠는 6V다. 모든 phase와 recruitTeam이 같은 IV snapshot을 사용한다.

17. **EV 분리** — 전투는 기존 `npcRankTraining(floor,'elite')`와 `npcTrainingProfile`을 사용한다. recruitTeam에는 적의 EV를 넣지 않는다. 영입 시 해당 플레이어의 기존 collection/run training EV를 보존하며 신규 종은 기존 defaultProfile의 0 point에서 시작한다.

18. **숨겨진 특성** — recruit ability를 Definition에서 지정하고 기존 validator로 검사한다. 한카리아스의 Rough Skin을 허용한다. 모든 종을 무조건 숨특으로 만들지는 않는다.

19. **이로치** — 기존 NPC의 `roll(8192)===0`을 `src/server/shiny.ts`의 `rollEncounterShiny`로 작게 추출해 공용으로 사용한다. 기존 확률 1/8192를 유지했다. 스냅샷 때 한 번 결정하며 모든 phase와 recruit가 공유한다. normal/shiny RNG fixture를 검증했다.

20. **영입 개체 분리** — recruitTeam은 기본 종·기본 특성·recruitMoves만 가진 별도 packed snapshot이다. phase의 Mega 폼/특성/버프/aura/전투 EV가 영입되지 않는다. run profile은 저장된 IV/nature/ability/shiny/moves/teraType을 사용한다.

21. **기존 영입 UI** — `TowerStore.recruit`와 기존 후보/확인/연출/6마리 교체 UI를 사용한다. 후보 데이터만 recruitTeam에서 읽는다. 도감 unlock, move unlock, recruitments receipt를 재사용한다. 이전 패배 전투의 ID를 제출해 영입하는 것도 차단했다.

22. **특별 보상** — `snapshotRankReward(db,runId,'elite',random)`을 그대로 사용한다. 현재 1500코인, 티켓 3~5장, 비타민 1~2개, 300 성장 포인트, Epic 도구, Unique/Epic TM과 기존 확률을 따른다. 표시 이름만 ‘특별한 보상’이다. 승리 트랜잭션에서 반드시 지급하며 영입 여부와 무관하다. 기존 RewardModal은 영입 선택 후 표시한다.

23. **Unique fallback** — 기존 ownership 후보 필터와 `applyRewardOption` grant 로직을 그대로 사용한다. 스냅샷 후 동일 도구/TM을 얻었으면 원래 Elite fallback을 지급한다. 재추첨하지 않는다. TM 후보는 현재 파티 호환성으로 제한하지 않으며 기존 run-local reusable TM이다.

24. **패배·재도전** — 패배 시 보상과 영입을 열지 않는다. 기존 run_retries와 createRetryBattle을 이용해 opponentTeam/seed/스냅샷을 유지한다. 재도전 전투 ID만 같은 raid_encounters에 다시 연결한다. 별도 게임 오버 규칙은 없다.

25. **Exact-once** — 기존 `BEGIN IMMEDIATE` 트랜잭션, battle.status 완료 검사, run_events.result_json, recruitments PK를 사용한다. 전투 완료와 특별 보상/영수증은 한 트랜잭션이다. 영입·교체·도감·기술·영입 영수증도 한 트랜잭션이다. 중복 도전/완료/영입, 저장 실패 rollback, 재접속, 재도전을 검증했다.

26. **PC·모바일** — 1280×900과 390×844에서 두 종 모두 이미지 로드/검은 silhouette/상이한 오라/이름 비노출/별점 없음/가로 overflow 없음/버튼 viewport 내 배치를 확인했다. 추가 confirm 없이 전투, 기존 영입 UI와 보상 모달까지 Playwright로 확인했다. 스크린샷은 `artifacts/qa/screenshots/raids/`에 있다.

27. **변경 파일** — 아래 목록 참조. 기존 naming을 정리하거나 새 shop/box/currency/multiplayer를 만들지 않았다.

28. **검증** — 아래 실행 결과 참조. 엔진 mechanics 테스트는 실제 Showdown 상태를 검사하고, BattleSession 통합 테스트는 합법적인 강화 player fixture로 세 경로를 모두 끝까지 승리·정산한다. UI 승리 화면 fixture는 서버 내부 완료 callback을 사용하며 HTTP로 winner를 받는 endpoint는 없다.

29. **기존 구조의 제약** — 영구 도감은 ‘종당 프로필 하나 + IV 최댓값 누적’ 모델이다. 이를 유지하므로 이미 더 높은 IV를 가진 종의 영구 도감 IV는 낮아지지 않는다. Raid의 원본 individual/recruitTeam과 이번 run 영입 개체 IV는 정확한 snapshot을 유지한다. 별도 개체/Box 저장소는 만들지 않았다. 현재 battle format의 최대 팀 크기는 3이므로 v1 adapter는 2~3 phase를 지원한다. 실제 신규 Dynamax/Tera 기믹은 이번 범위에 포함하지 않았다. 전체 테스트의 기존 랜덤 NPC EV 기대값 문제는 아래에 따로 기록했다.

30. **다음 보스 추가** — 기존 엔진이 지원하는 폼·특성·기술로 구성된 2~3 phase 보스는 `src/data/raids.ts`의 `raidBossDefinitions`에 추가하면 된다. category는 기존 6종 매핑을 사용한다. `createRaidSnapshot`의 bossId/routeId fixture로 강제 생성할 수 있다. 4개 이상 phase나 아직 지원하지 않는 실제 변신 기믹을 추가할 때는 해당 format/adapter의 기능 확장이 필요하다.

## 변경 파일 목록

신규:

- `src/data/raids.ts`
- `src/server/raid-events.ts`
- `src/server/shiny.ts`
- `src/battle/raid.ts`
- `src/web/raid-scene.tsx`
- `src/web/styles/raid.module.css`
- `tests/raid-fixture.ts`
- `tests/raid-events.test.ts`
- `tests/raid-phases.test.ts`
- `e2e/raid-events.spec.ts`
- `docs/engineering/RAID_EVENTS.md`

기존 코드 연결:

- `docs/engineering/README.md`, `docs/gameplay/EVENTS.md` (문서 연결·현재 규칙)
- `src/data/run-events.ts`
- `src/server/run-events.ts`
- `src/server/schema.ts`
- `src/server/storage/migrations.ts`
- `src/server/tower-store.ts`
- `src/server/tower-service.ts`
- `src/server/battle-session.ts`
- `src/battle/run.ts`
- `src/battle/public-field.ts`
- `src/shared/contracts.ts`
- `src/web/event-presentation.ts`
- `src/web/run-event.tsx`
- `src/web/catalog.ts`
- `src/web/battle-message-data.ts`
- `src/web/battle-presentation.ts`
- `src/web/battle-game.tsx`
- `src/web/battle-result.tsx`
- `src/web/tower-controls.tsx`

기존 테스트는 DB 기대 버전을 42로 갱신했다: bag/battle-retry/boss/consumable-shop/form-moves/held-items/hidden-shop/hundred-floor/mystery-chest/npc-ranks/rank-rewards/run-events/trainer-catalog/villain-campaign. challenger-events/run-event-rules는 과거 10% 상수 대신 현재 공통 설정을 검증하고, hidden-shop은 신규 Raid 가중치와 독립된 기존 가중 구간을 검증하도록 수정했다.

## 검증 기록

- `node node_modules/typescript/bin/tsc --noEmit`: 통과.
- `node --require ./scripts/windows-build-links.cjs node_modules/next/dist/bin/next build`: 통과.
- `node scripts/check-css-structure.mjs`: 통과.
- `git diff --check`: 통과.
- 신규 `raid-events.test.ts` + `raid-phases.test.ts`: 19개 통과. 실제 세 경로의 승리/정산, 선공/후공, multi-hit, HP/상태/능력 변화/PP, 설치기, IV/EV/shiny, 영입/교체, duplicate/rollback/reconnect/retry/fallback을 검증한다.
- 관련 회귀 첫 묶음: 79개 통과. 이후 challenger/hidden-shop/공통 규칙/100층 진행 묶음: 58개 통과(일부 테스트는 앞 묶음과 중복).
- 전체 단위 테스트 실행 기록: `artifacts/raid-unit-tests.log`. 실행 중 테스트를 갱신하기 전 결과는 692개 중 689개 통과, 3개 실패였다. 2개는 확률/가중치 기대값이 이전 설정을 하드코딩한 테스트로 수정 후 통과했다. 나머지 1개는 기존 `thirty-floor.test.ts:50`의 랜덤 NPC EV 합계 기대값(174 대 192)이며, 해당 파일을 포함한 58개 회귀 재실행은 모두 통과했다. Raid를 위해 NPC 밸런스/EV 규칙을 변경하지 않았다.
- UI: `e2e/raid-events.spec.ts`의 PC·모바일 두 종과 지나가기 5개 흐름 모두 통과(최종 빌드, 23.3초). 스크린샷은 아래 링크에서 확인할 수 있다.

[PC 한카리아스](../../artifacts/qa/screenshots/raids/garchomp-1280.png) · [PC 뮤츠](../../artifacts/qa/screenshots/raids/mewtwo-1280.png) · [모바일 한카리아스](../../artifacts/qa/screenshots/raids/garchomp-390.png) · [모바일 뮤츠](../../artifacts/qa/screenshots/raids/mewtwo-390.png) · [모바일 특별 보상](../../artifacts/qa/screenshots/raids/reward-mewtwo-390.png)
