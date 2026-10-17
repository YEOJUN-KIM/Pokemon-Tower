# Mirror 특수 도전자 구현

기준: 2026-10-16. 기존 도전자 선택전 안에 희귀 후보를 추가합니다. `mirror-match` Run Event·전용 AI·별도 전체 화면은 없습니다. 외형은 사용자가 지정한 기존 플레이어 캐릭터의 정면입니다.

## 1–3. 등장 확률·Sample·삽입

`src/data/mirror-challenger.ts`의 `mirrorChallengerSettings.mirrorCandidateChance` 초기값은 **0.03(3%)**입니다. 이는 도전자 이벤트 발생 후의 조건부 판정이며 전체 이벤트 발생률과 별개입니다. 현재 전체 이벤트 10%, 도전자 가중치 20/132일 때 검사 가능한 층당 Mirror 후보가 포함될 확률의 상한은 약 **0.0455%**입니다. 원본 팀이나 적격 Sample이 없으면 실제 비율은 더 낮아집니다.

기존 `drawChallengers()`로 후보 3명과 각 팀/보상을 먼저 생성한 뒤 독립 난수로 판정합니다. 성공하면 무작위 슬롯 하나를 교체합니다. 한 만남에 최대 1명이며 다른 두 후보와 표시 클래스명/ID가 겹치지 않게 기존 Sample에서 고릅니다. 실패 시 기존 세 후보를 그대로 반환하고 NPC/Rank/팀의 기존 난수 순서를 늘리지 않습니다. Mirror 난수는 이벤트 ID의 별도 SHA-256 seed입니다.

적격 Sample ID는 설정의 `sampleIds`에서 관리합니다:

| Sample | 표시 클래스 |
|---|---|
| ace-setup, ace-physical | 에이스 트레이너 |
| veteran-balanced, veteran-bulk | 베테랑 |
| psychic-setup | 초능력자 |
| ranger-speed | 레인저 |
| scientist-status, scientist-special | 연구원 |
| blackbelt-physical | 태권왕 |

현재 층의 minFloor와 challenger pool 적격성을 추가 검사합니다. Sample의 `teamConcept`/specialty로 팀을 생성하지 않습니다.

## 4–7. 원본 탐색·복사·Elite 수치

`battles JOIN recruitments ON recruitments.battle_id=battles.id`에서 같은 런, `floor=후보 발생 층-1`, `stage=0`, 완료된 배틀 중 마지막 attempt를 선택합니다. 일반 전투의 영입 처리에는 영입을 거절해도 영수증이 있지만 도전자전에는 없으므로 추가 도전자전/이벤트전/숨은 관문이 원본으로 섞이지 않습니다. 원본이 없거나 현재 룰과 다르거나 정상 3마리/합법 빌드가 아니면 일반 후보를 유지합니다.

원본 `player_team`을 unpack해 **종족/폼·성격·기술 순서·지닌 도구를 그대로 복사**합니다. 기존 능력·테라 타입·성별·이로치 외형·거다이맥스 적격 플래그도 보존합니다. 로스터 6마리에서 다시 고르지 않습니다.

IV/EV는 복사하지 않습니다. 기존 `npcRankTraining(floor,'elite')`와 `npcTrainingProfile`을 재사용해 Elite IV 범위/EV 예산을 사용합니다. 실제 복사 기술의 공격 유형도 기존 `npcBuildAttackStat`으로 반영합니다. 성격·기술·도구·폼을 재추첨하지 않습니다. 100층처럼 Elite IV 범위가 31에 도달하면 원본 IV와 수치가 우연히 같을 수 있지만 원본에서 복사한 값은 아닙니다.

플레이어 `runBonuses`가 든 ball metadata를 제거하고 기본 `towerpointsv1` marker만 저장합니다. 영양제/임시 스탯 보너스와 플레이어 EV는 복제하지 않습니다. 별도 IV 공식이나 AI를 추가하지 않습니다.

## 8. Mirror snapshot

기존 `challenger_encounters.candidates_json`에 새 후보만 저장합니다. `ChallengerDefinition.mirror`는 다음 필드를 가집니다:

`version:1`, `baseSampleId`, `sourceBattleId`, `sourcePlayerTeam`, `opponentTeam`, `opponentRule`, `gimmick`, `rewardKind`.

기존 ranked `encounter`에도 Elite 수치·팀·seed·Sample·기믹을 저장합니다. 실제 전투는 저장된 packed `opponentTeam`을 직접 사용해 폼·성격·기술·도구가 다시 변환되지 않습니다. 후보의 기존 `rewardDefinition`/`selections`에 보상 효과와 적용 대상 ID를 함께 snapshot합니다. 공개 후보 projection은 `mirror:true`와 표시 정보만 전달하고 원본/팀/실제 보상 정의는 숨깁니다.

## 9–10. 외형과 카드 문구

사용자 외형 수정 요청에 따라 Mirror는 기존 플레이어(청록색 모자·노란 재킷)의 정면 스프라이트 `public/sprites/trainers/player-front.png`를 사용합니다. 기존 뒷모습 시트를 참조해 built-in imagegen으로 제작하고 96×144, 64색 픽셀 이미지로 준비했습니다. 원본 PNG는 유지하며 생성 프롬프트·출처는 `player-front-source.json`에 기록합니다. 기반 Sample의 이름/난수/팀/보상 snapshot은 그대로입니다.

공통 `web/player-mirror-portrait.tsx`를 후보와 `BossPortrait`의 Mirror 전투 등장/표시에 사용합니다. 얼굴 좌표에 맞춘 작은 SVG path와 linear gradient로 모자 아래에만 부드러운 그늘을 넣습니다. 모자·옷·팔·다리를 덮는 큰 검은 oval은 사용하지 않습니다. 일반 NPC는 기존 PNG 그대로이며 그림자나 플레이어 정면 외형을 적용하지 않습니다.

상세창과 배틀의 Mirror 표시 이름은 사용자 요청으로 **???**입니다. 내부 기반 Sample은 유지합니다. 상세창은 **엘리트 ★★★**, **어딘가 익숙한 기분이 든다.**, **특별한 보상**을 표시합니다. 미러/복사/실제 보상 종류를 설명하는 문구는 없습니다. 하단 후보 목록에서 선택하며 PC 좌측·모바일 중앙의 상세창 한 개를 표시합니다. 숫자키는 미리보기, Z/Enter 또는 도전한다로 기존 배틀을 시작합니다. [선택 UI](CHALLENGER_SELECTION_UI.md)를 참고합니다.

## 11–12. 랜덤 보상과 가중치

`mirrorRewardProfile`의 가중치 합은 100입니다. 후보 생성 때 **한 종류만 랜덤 확정**하며 일반 Master의 3개 보상 종류 선택을 만들지 않습니다.

| 보상 | 가중치 | 지급 |
|---|---:|---|
| 일반 알 티켓 | 30 | 10장 |
| 슈퍼레어 알 티켓 | 15 | 1장 |
| 이로치 알 티켓 | 2 | 1장 |
| 성장 포인트 | 30 | 1,500P |
| 트레이너 특급 장비 | 15 | 현재 룰의 미보유 Band/Orb 중 하나 |
| 1V | 7 | 한 포켓몬의 원하는 IV 하나를 31로 |
| 6V | 0.5 | 한 포켓몬의 모든 IV를 31로 |
| 이로치 변환 | 0.5 | 한 포켓몬의 이로치 획득 |

장비가 없거나 강화 종류에 적격 대상이 없으면 같은 snapshot에서 성장 포인트 1,500P로 대체합니다. 장비를 생성 후 보유하게 된 경우 기존 Master 장비 grant의 fallback도 1,500P입니다. 모든 숫자는 임시값이며 전체 이벤트 완료 후 경제를 조정합니다.

## 13–15. 1V·6V·이로치 대상 선택

공통 Reward Selection의 `targetMode`와 `pokemon-enhancement` effect를 추가했습니다. 종류 선택이 아니라 **확정된 보상의 적용 대상 선택**입니다. 현재 members 최대 6마리가 대상이며 직전 출전 3마리로 제한하지 않습니다.

- 1V: `강화할 포켓몬을 선택하세요.` → `V로 만들 능력치를 선택하세요.`. 이미 31인 IV는 서버 후보에서 제외합니다. 후보 ID는 `species:stat`입니다. 2V/3V나 랜덤 능력치는 없습니다.
- 6V: `6V로 만들 포켓몬을 선택하세요.`. 이미 6V인 포켓몬은 제외합니다.
- 이로치: `이로치로 만들 포켓몬을 선택하세요.`. 현재 런 또는 영구 수집에서 이미 이로치인 포켓몬은 제외합니다.

`server/pokemon-enhancements.ts`에서 현재 런 멤버/소유권/최신 적격성을 검증한 뒤 기존 `pokemon_training`의 공통 IV/이로치와 revision을 갱신하고 현재 `runs.profiles`에도 반영합니다. 폼별 기술/테라 설정은 유지합니다. 도감의 이로치 획득 기록은 기존 수집 구조인 `pokemon_training.profile.shiny`이며 새 중복 도감 테이블은 만들지 않았습니다. 기존 배틀/원본/Mirror snapshot은 변경하지 않습니다.

타워의 이로치 획득은 본가 배포 개체의 shiny lock과 독립적입니다. 기존 point-system legality proxy에서 IV/성별과 함께 cosmetic shiny도 검증용으로만 정규화하고 실제 packed team의 shiny는 그대로 보존합니다. 붉은 달 다투곰 등도 타워 이로치 보상/복사 후 정상 전투합니다.

## 16. 영구 상점 이로치 교환 제거

영구 상점의 교환권 판매 카드·포켓몬 선택/미리보기/상시 변환 UI를 제거했습니다. 새로운 `buy/shiny`와 `shiny/shiny` API 요청은 서버에서도 차감 전에 409로 거절합니다. 완료된 과거 영수증의 같은 요청 재확인만 기존 결과를 반환하며 새 변환은 하지 않습니다.

기존 `shiny_tickets` 보관 값, 이미 이로치인 포켓몬, 도감 기록, 과거 영수증은 삭제/차감/되돌리지 않습니다. 기존 일반/전용 이로치 알과 보상 티켓 부화는 유지합니다.

## 17–19. exact-once·복구·호환

승리는 기존 battle completion의 transaction/receipt를 사용합니다. 기본 보상 지급과 결과 저장을 함께 커밋하고 중복 completion은 다시 지급하지 않습니다.

강화는 기존 `event_reward_selections`의 서버 정의를 조회하고 저장된 후보 ID만 허용합니다. 현재 효과 적격성을 재검증하고, 영구 profile·런 profile·선택 완료 결과를 같은 `BEGIN IMMEDIATE` 트랜잭션에서 커밋합니다. 같은 후보 재요청은 성공만 반환하고 다른 후보 재요청은 거절합니다. 결과 저장 실패 시 IV/이로치/revision도 롤백합니다. 클라이언트 가격/종류/효과/stat/수량을 신뢰하지 않습니다.

선택 완료 전 이벤트 계속하기/다음 일반전 진입을 막습니다. Pending 대상 선택은 JSON/선택 정의에서 복구됩니다. 재도전은 기존 `createRetryBattle`이 상대 packed team·seed·trainer/gimmick을 복사하므로 이후 플레이어 기술·도구 변경과 무관합니다. 승리 후 영입이 없습니다.

기존 Challenger JSON은 마이그레이션하거나 재추첨하지 않습니다. Mirror는 새 후보 생성에만 들어갑니다. Mirror는 기존 JSON 저장 구조를 재사용하며 별도 테이블/스키마를 추가하지 않습니다. 현재 지원 DB 버전은 [DATABASE](DATABASE.md)를 따릅니다. 개발 singleton의 내부 갱신 번호는 저장 호환 버전이 아닙니다.

기믹은 복사된 적격 Mega/원시회귀/Z 도구를 우선 사용하고, 없으면 원본 장비의 Tera Orb 또는 Dynamax Band에 맞는 기존 NPC 규칙을 사용합니다. 지닌 도구를 Band로 덮어쓰지 않습니다. 저장된 trainer metadata의 `mirrorRule`을 기존 BattleSession의 opponentRule에 전달해 기존 AI/엔진이 처리하며 현재 Run Rule을 넘어서는 조합은 만들지 않습니다.

## 20. 검증

`tests/mirror-challenger.test.ts`/`mirror-fixture.ts`: 조건부 확률 경계·최대 1명·클래스 중복·원본 없음 fallback, 실제 빌드/폼 복제, Elite IV/EV/보너스 제거, 6멤버 강화 대상, 랜덤 보상 8종, 적격 대상 제외, 영수증 롤백·중복/충돌 요청, pending/restart/retry 복구, 6개 룰의 실제 엔진 진입·행동을 검증합니다.

`e2e/mirror-challenger.spec.ts`: PC 1280/모바일 390 카드/얼굴 그림자/보상 숨김, 강화 3종의 두 단계 또는 대상 선택, refresh/pending/선택 완료 복구, API 중복, 이로치 교환 제거/보상 알 부화를 검증합니다. 내부 완료 fixture는 기존 도전자 테스트와 같으며 클라이언트 승리 입력 API는 추가하지 않습니다.

최종 결과:

| 검사 | 결과 |
|---|---|
| 전체 단위 테스트 | **654/654 통과** (Mirror 전용 21개 포함) |
| Chrome Mirror/기존 도전자/Rank Reward/히든상점 | **25/25 통과** |
| 최종 빌드의 Mirror PC/모바일·교환 제거·보상 알 | **7/7 통과** |
| 영구 상점·1/10 알 부화·기존 이로치 입장 연출 | **3/3 통과** |
| 프로덕션 빌드·TypeScript | 통과 |
| CSS 구조·워크스페이스/문서 링크·diff 공백 | 통과 |

기존 영구 상점 테스트는 삭제된 교환 기능 대신 상시 판매/변환 부재, 교환 비용이 빠지지 않은 지갑 값, 기존 이로치 데이터 유지로 갱신했습니다. 실제 개인 저장 DB를 실행/복원하거나 덮어쓰지 않았습니다. QA 화면은 `artifacts/qa/screenshots/mirror/candidates-1280.png`, `candidates-390.png` 및 강화 종류/해상도별 PNG에 보관합니다.

## 21. 변경 파일

외형 후속 수정: `src/web/player-mirror-portrait.tsx`, `src/web/styles/player-mirror-portrait.module.css`, `src/web/boss-dialog.tsx`, `public/sprites/trainers/player-front.png`, `public/sprites/trainers/player-front-source.json`, `docs/references/THIRD_PARTY.md`.


- 신규: `src/data/mirror-challenger.ts`, `src/server/mirror-challenger.ts`, `src/server/pokemon-enhancements.ts`.
- 후보/보상: `src/data/challengers.ts`, `src/data/legacy-challengers.ts`, `src/data/rewards.ts`, `src/server/challenger-events.ts`, `src/server/rewards.ts`.
- 배틀/복구: `src/server/tower-store.ts`, `src/server/tower-service.ts`, `src/server/battle-session.ts`, `src/shared/contracts.ts`, `src/battle/run.ts`.
- UI: `src/web/challenger-candidates.tsx`, `src/web/styles/challenger-candidates.module.css`, `src/web/reward-panel.tsx`, `src/web/permanent-shop.tsx`.
- 영구 상점 서버: `src/server/permanent-shop.ts`.
- 신규 테스트: `tests/mirror-fixture.ts`, `tests/mirror-challenger.test.ts`, `e2e/mirror-challenger.spec.ts`.
- 기존 테스트 갱신: `tests/permanent-upgrades.test.ts`, `tests/form-moves.test.ts`, `e2e/permanent-upgrades.spec.ts`.
- 현재 문서: 이 보고서, `docs/gameplay/EVENTS.md`, `docs/gameplay/EGGS.md`, `docs/engineering/EVENT_SYSTEM.md`, `docs/STATUS.md`, `docs/SESSION_HANDOFF.md`.

## 22. 후속 밸런스 조정

`src/data/mirror-challenger.ts`: `mirrorChallengerSettings.mirrorCandidateChance`/`sampleIds`, `mirrorRewardProfile.pool`/`tickets`/`growth`/`equipmentFallback`에서 조정합니다. 기존 Elite 수치 공식은 `src/data/npc-ranks.ts`를 재사용합니다. 등장률과 보상 가치는 전체 이벤트 구현 후 시뮬레이션으로 함께 평가합니다.
