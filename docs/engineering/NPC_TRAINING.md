# NPC Sample · Rank · Training

기준: 2026-10-16. 새 일반층 랜덤 NPC와 도전자 선택전이 공통 Sample/Rank 생성 경로를 사용합니다. 기존 네임드·빌런의 정체성·템플릿·캠페인은 유지합니다.

## 책임 분리

| 개념 | 책임 | 구현 |
|---|---|---|
| NPC Sample | 표시명, portrait, tactic, specialty, defaultRank, minFloor, weight, pools. 컨셉만 정의 | `src/data/npc-samples.ts` |
| NPC Rank | normal / elite / master. IV, EV 예산, 기술·도구 품질, 기믹 시도 비중 | `src/data/npc-ranks.ts` |
| Encounter | 출현 위치, Rank 추첨, 실제 팀, 시드, 보상과 저장 | `src/server/npc-encounters.ts`, `src/data/challengers.ts`, `src/server/challenger-events.ts` |

`NpcSample`은 보상·trainingScale·HP 보너스를 갖지 않습니다. 같은 등산가 컨셉을 Normal/Elite/Master와 일반층/도전자에서 재사용합니다. `defaultRank`는 직접 생성할 때의 기본값이며 일반층·도전자 분포 추첨이 명시한 Rank가 우선합니다. 클래스명으로 Rank나 내부 tactic을 고정하지 않습니다.

초기 공통 풀은 **20개 Sample / 17종 portrait**입니다. 7종 tactic을 여러 클래스에 분산했습니다. 표시명이 같은 연구원·에이스·베테랑도 각각 다른 내부 ID와 전술을 가집니다. 전체 ID/표시명/sprite/tactic/specialty/defaultRank/minFloor/weight/pool 표는 [생성 검증 보고서](../../artifacts/reports/npc/NPC_RANK_SAMPLES.md)에 있습니다. 현재 20개 모두 normal/challenger 양쪽 풀에 속합니다.

## Rank의 정확한 차이

| Rank | 1~5층 IV | 초기 EV | 100층 EV | 도구 | 기술 | 기믹 시도 |
|---|---|---|---|---|---|---|
| Normal | 0~8 | 2 | 15 | 15층 전 없음, 이후 basic | 기존 완화 기술 | 0% |
| Elite | 10~18 | 22 | 45 | competitive | tactic 기반 optimized | 40% |
| Master | 16~24 | 45 | 66 | premium | tactic 기반 optimized | 100% |

Master는 무명 고수의 육성 Rank입니다. 관장/사천왕/챔피언이라는 네임드 역할을 부여하지 않습니다. 같은 층의 BST·일반 종족 풀을 사용하며 Rank가 전설·환상·상위 층 포켓몬을 추가하지 않습니다. Elite/Master는 같은 풀의 후보를 늘려 기존 `selectNamedEntries`의 타입 범위·공격 방식·약점 보완 기준으로 세 마리를 고릅니다. specialty가 있으면 대표 파트너를 유지하면서 나머지 타입으로 보완합니다. Normal은 가능한 경우 specialty 중심의 기존 단순 생성기를 사용합니다.

현재 AI_VERSION과 공개 정보 기반 TowerPolicy를 그대로 사용합니다. Master 전용 새 AI, 새 날씨 엔진, 레이드, 미러, 빌런 신규 단계, 네임드 전면 재작성은 구현하지 않았습니다.

## IV와 EV

`p = max(0, (floor - 5) / 95)`입니다. IV 범위 양 끝값은 `floor(start + (31 - start) * p)`이고 각 스탯을 그 범위 안에서 시드로 추첨합니다. 5층에도 Rank 차이가 있고 100층에는 모두 31입니다. 일반 타워의 과거 ivCap에 곱하지 않습니다.

EV 예산도 `floor(initial + (lateBudget - initial) * p)`로 계산합니다. 개별 최대 32·총 최대 66을 지킵니다. 매 포인트를 `(현재 포인트 + 1) / 가중치`가 가장 작은 스탯에 배정해 예산을 정확히 소진합니다.

| tactic | EV 배분 가중치 |
|---|---|
| physical | 공격 5, 속도 3, HP 2 |
| special | 특공 5, 속도 3, HP 2 |
| setup | 종족 주 공격 5, 속도 3, HP 2 |
| speed | 속도 5, 종족 주 공격 3, HP 2 |
| bulk | HP 4, 방어 3, 특방 3 |
| status | HP 4, 방어 2, 특방 2, 속도 2 |
| balanced | 종족 주 공격 4, HP 3, 속도 2, 방어·특방 각 1 |

IV·EV·기술 세팅은 기존 `src/server/npc-training.ts`의 공통 할당기를 재사용합니다. 5단계 NpcTrainingTier는 앞선 도전자 스냅샷 호환 경로에만 남깁니다. 새 NPC는 3단계 NpcRankTraining을 전달합니다.

## 도구와 기믹

Normal의 basic 후보는 자뭉열매/리샘열매/광각렌즈입니다. Elite는 tactic과 실제 공격 기술 종류에 맞춰 먹다남은음식·울퉁불퉁멧·힘의머리띠·박식안경·달인의띠 등을 사용합니다. Master는 생명의구슬·기합의띠 등 premium 후보를 우선하며, speed의 구애스카프는 변화기가 없는 세팅에서만 후보로 둡니다. 모든 도구는 프로젝트 held-items와 엔진 등록 여부 및 룰을 확인하고 같은 팀의 중복을 제외합니다. 무도구 팀 전체에 Leftovers를 복사하지 않습니다.

Rank별 시도 확률을 통과한 뒤 현재 룰이 허용하는 메가/테라/다이맥스/Z 후보를 찾습니다. basic에서는 전부 금지합니다. 메가는 호환 돌, Z는 실제 기술과 사용자 조건에 맞는 크리스탈, 다이맥스는 기존 호환 조건, 테라는 기존 타입과 팀 사용권을 사용합니다. 팀당 한 가지 계획만 만들고 기존 엔진의 사용권·중첩 규칙을 따릅니다. Master의 메가 구성은 현재 층 풀에 호환 종이 있을 때 그 파트너를 보존합니다. 호환 종이 없으면 상위 층으로 이동하지 않습니다.

이 규칙은 새 공통 랜덤 NPC에 적용됩니다. 기존 네임드/빌런의 층별 대표 기믹 규칙과 저장 팀은 그대로 유지합니다.

## 일반층과 도전자 분포

일반층은 Sample을 minFloor/pool/weight로 필터·추첨한 후 Rank를 독립 추첨합니다. 최근 NPC ID/특성을 회피하는 기존 기능도 유지합니다. `selectTrainerSample(..., {common:true})`가 새 런 경로이며 기존 기본 경로는 구 런용으로 유지합니다. 과거 `eliteChance`는 구 버전 호환 곡선이며 새 런은 아래 `rankWeights`를 사용합니다.

일반층 분포는 다음 앵커 사이를 선형 보간합니다.

| 층 | Normal | Elite | Master |
|---|---|---|---|
| 1 | 94% | 6% | 0% |
| 20 | 78% | 21% | 1% |
| 50 | 55% | 40% | 5% |
| 60 | 60% | 36% | 4% |
| 100 | 20% | 60% | 20% |

도전자 Rank는 각 후보마다 **Normal 50% / Elite 42% / Master 8%**로 독립 추첨합니다. Normal/Elite/Master 한 명씩을 보장하지 않습니다. Master 두 명, Elite 두 명 등 임의 조합이 가능합니다. 풀에서 weight로 한 Sample을 뽑고 같은 ID와 표시 클래스를 제거하며 정확히 3명을 선택합니다. minFloor와 풀 조건을 적용합니다. 현재 층마다 최소 세 종류의 표시 클래스가 있어야 합니다.

## 도전자 보상과 snapshot

보상 데이터는 `src/data/challenger-rewards.ts`에 있습니다. Sample과 분리한 Challenger Encounter가 Rank에 따라 결정합니다.

| Rank | rewardProfile | 보상 |
|---|---|---|
| Normal | low | 300코인 |
| Elite | medium | 700코인 + 알 티켓 1장 |
| Master | high | 1,000코인 + 선택형 추가 보상 |

Master 추가 선택은 1,000코인 / 알 티켓 3장 / 500코인+티켓 1장입니다. 일반층의 층별 보상은 기존 정책을 사용합니다.

이벤트 UUID의 SHA-256을 기존 encounterRandom 시드로 사용합니다. 추첨한 세 명의 팀을 이벤트 발생 때 생성해 **세 정의만 candidates_json**에 저장합니다. 각 정의는 sample 전체 표시/컨셉 정보, Rank, 실제 training 목표, 팀별 IV/EV/moves/item/ability/nature 등 실제 프로필, 기믹 계획, 팀 시드, 보상/선택 효과를 포함합니다. 선택 때 현재 최신 데이터를 다시 조회하거나 팀을 재추첨하지 않습니다. Rank 프로필을 변경해도 대기 후보의 상대는 변하지 않는 테스트가 있습니다.

조회/API projection은 표시명·portrait·일반/엘리트/마스터·위험도·자연어 힌트·예상 보상만 반환합니다. 내부 tactic·IV/EV·미공개 팀은 카드에 노출하지 않습니다. 전투 상단은 `클래스명 · Rank`를 표시합니다.

기존 BattleSession/RewardOption/RewardSelection/Reward Popup·트랜잭션을 재사용합니다. 영입 없음, 층 소모 없음, 중복 지급 차단과 선택 완료 전 진입 차단을 유지합니다. 재접속·재도전은 저장된 패킹 팀·시드·트레이너 정보를 그대로 복원합니다.

## 저장 호환

DB v38은 `run_npc_rules(run_id,version=1)`만 추가합니다. 새 런에만 표식을 저장하고 이전 런에는 소급 부여하지 않습니다. 구 런의 미래 일반 NPC와 미래 도전자 이벤트도 구 경로를 유지합니다. 이미 생성된 모든 배틀은 기존 패킹 결과로 복구합니다.

`src/data/legacy-challengers.ts`는 과거 고정 easy/medium/hard 형식 및 앞선 8개/5단계 TrainingTier 형식을 읽는 호환 정의입니다. ID나 표시명·보상·팀을 현재 Sample로 강제 변환하지 않습니다. 신규 후보는 공통 Sample ID를 사용하고 easy/medium/hard에 의존하지 않습니다.

## 스프라이트 확장 정책

[Showdown 원본 목록](https://play.pokemonshowdown.com/sprites/trainers/)과 [개별 크레딧 목록](https://play.pokemonshowdown.com/sprites/trainers/?filter=credited)을 확인했습니다. 목록은 게임 외 제작 자산도 포함하며 개별 아티스트 크레딧과 수정 허가 조건을 안내합니다. 게임 기반 클래스 중 개별 아티스트 표기가 없는 항목을 이번 반입 대상으로 한정했습니다. 이는 자산 권리를 별도로 부여한다는 의미가 아닙니다.

새로 반입한 8종: lass-gen3, pokemonbreeder-gen3, gentleman-gen4, pokemonranger-gen3, veteran-gen4, backpacker, schoolkid-gen4, collector. 기존 자산과 합해 17종 portrait를 사용합니다. 출처 URL·확인일·SHA-256·검토 결과를 `public/sprites/trainers/sources.json` 및 [자산 검토 JSON](../../artifacts/reports/npc/npc-sprite-review.json)에 기록했습니다. 신규 이미지 제작·커스텀 이미지 편집은 없습니다.

검토만 하고 반입하지 않은 후보: pokemonbreeder-gen7(Beliot419), pokemonranger-gen6/veteran-gen7/acetrainer-gen6(kyledove). 후속 도입 시 개별 크레딧·사용 조건을 다시 확인해야 합니다. `scripts/import-common-npc-sprites.ts`는 신규 자산에 아티스트 표기가 있으면 자동 다운로드를 건너뛰고 검토 대상으로 남깁니다. 기존 아티스트 크레딧도 유지합니다.

## QA와 확장 방법

`pnpm exec tsx scripts/report-npc-training.ts --write`로 [5/20/40층 실제 팀 보고서](../../artifacts/reports/npc/NPC_RANK_SAMPLES.md)와 [원본 snapshot JSON](../../artifacts/reports/npc/npc-rank-samples.json)을 재생성합니다. IV 평균·스탯별 IV/EV·도구·기술·전체 Sample 목록·분포가 포함됩니다. 실제 플레이 승률의 장기 밸런스 조정은 후속입니다.

새 Sample은 `src/data/npc-samples.ts` 배열에 id, displayName, portrait, tactic, specialty, defaultRank, minFloor, weight, pools만 추가합니다. 보상·IV/EV 숫자를 복사하지 않습니다. 외형이 없으면 먼저 위 자산 검토 절차를 따릅니다. 일반층/도전자 공통 Rank 조정은 npc-ranks.ts, 도전자 보상은 challenger-rewards.ts에서 합니다. 새 Sample을 기존 네임드 catalog에 중복 등록할 필요가 없습니다.

관장·사천왕·챔피언·빌런 보스는 별도 catalog/템플릿을 유지합니다. 공통 Rank Training 할당기는 재사용 가능하지만 이번에 그 팀들을 재육성하거나 캠페인 단계를 추가하지 않았습니다.

## 최종 검증 결과

- `pnpm exec tsx --test --test-concurrency=2 tests/*.test.ts`: 전체 556개 통과.
- `pnpm exec playwright test e2e/challenger-events.spec.ts`: Chrome PC/모바일 8개 통과. 랜덤 후보 복구, 이전 후보 3종, 신규 Rank 3종의 클래스/Rank 표시·전투 연결·보상 팝업·선택 보상을 포함합니다.
- `pnpm typecheck`, `pnpm build`, `pnpm check:css`, `pnpm check:workspace`, `git diff --check`: 통과.
- 신규 `tests/npc-ranks.test.ts`: 20개 컨셉×3 Rank의 5/20/40/99층 생성, 100층 전체 목표 상한/단조성, weighted/minFloor/class 중복, 실제 저장 팀·구 v37 런·후보 호환, 튜닝 후 대기 상대 불변, 배틀 엔진의 룰별 기믹 실행을 검증합니다.
- 기존 네임드/빌런/미스터리 상자/도구/재도전/폼 설정 회귀도 전체 테스트에 포함됩니다. 네임드 팀을 새 Rank로 소급 재작성하지 않습니다.
