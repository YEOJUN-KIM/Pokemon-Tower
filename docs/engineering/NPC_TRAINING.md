# NPC Sample · Rank · Training

기준: 2026-10-16. 새 일반층 랜덤 NPC와 도전자 선택전이 공통 Sample/Rank 생성 경로를 사용합니다. 기존 네임드·빌런의 정체성·템플릿·캠페인은 유지합니다.

## 책임 분리

| 개념 | 책임 | 구현 |
|---|---|---|
| NPC Sample | 표시명, portrait, tactic, specialty, rankWeights, teamConcept, minFloor, weight, pools. 컨셉만 정의 | `src/data/npc-samples.ts` |
| NPC Rank | normal / elite / master. IV, EV 예산, 기술·도구 품질, 기믹 시도 비중 | `src/data/npc-ranks.ts` |
| Encounter | 출현 위치, Rank 추첨, 실제 팀, 시드, 보상과 저장 | `src/server/npc-encounters.ts`, `src/data/challengers.ts`, `src/server/challenger-events.ts` |

`NpcSample`은 보상·trainingScale·HP 보너스를 갖지 않습니다. `defaultRank`는 새 데이터에서 제거하고 클래스별 `rankWeights`와 `teamConcept`를 정의합니다. Rank는 컨셉을 완성하는 품질이며 컨셉을 다른 팀으로 교체하지 않습니다. 반바지 소년의 Master, 에이스/베테랑의 Normal처럼 클래스 확률이 0인 Rank는 일반층과 도전자 모두 자동 추첨되지 않습니다.

최종 확률은 `normalize(sample.rankWeights[rank] * encounterPrior[rank])`입니다. 일반층 prior는 층별 곡선, 도전자는 기존 50/42/8 가중치를 사용합니다. 곱과 정규화 과정에서 0을 유지합니다. 클래스 확률은 합계 1이어야 하며 유효한 Rank가 하나도 없으면 임의로 금지 Rank를 선택하지 않고 데이터 오류를 반환합니다. `generateNpcEncounter`의 명시적 Rank 인자는 QA 비교용이고 생략하면 클래스+층 분포로 추첨합니다.

초기 공통 풀은 **20개 Sample / 17종 portrait**입니다. 7종 tactic을 여러 클래스에 분산했습니다. 표시명이 같은 연구원·에이스·베테랑도 각각 다른 내부 ID와 전술을 가집니다. 전체 ID/표시명/sprite/tactic/teamConcept/rankWeights/minFloor/weight/pool 표는 [생성 검증 보고서](../../artifacts/reports/npc/NPC_RANK_SAMPLES.md)에 있습니다. 현재 20개 모두 normal/challenger 양쪽 풀에 속합니다.

## Rank의 정확한 차이

| Rank | 1~5층 IV | 초기 EV | 100층 EV | 도구 | 기술 | 기믹 시도 |
|---|---|---|---|---|---|---|
| Normal | 0~8 | 2 | 15 | 20층까지 없음, 이후 제한된 basic | 기존 완화 기술 | 0% |
| Elite | 10~18 | 22 | 45 | competitive | tactic 기반 optimized | 40% |
| Master | 16~24 | 45 | 66 | premium | tactic 기반 optimized | 100% |

Master는 무명 고수의 육성 Rank입니다. 관장/사천왕/챔피언이라는 네임드 역할을 부여하지 않습니다. 같은 층의 BST·일반 종족 풀을 사용하며 Rank가 전설·환상·상위 층 포켓몬을 추가하지 않습니다. 팀 컨셉은 다음과 같이 구분합니다. 기존 `specialty`는 표시·호환·최근 특성 회피용 metadata이며, 새 팀 구성 제약은 `teamConcept`이 결정합니다.

- `specialty`: types에 포함되는 포켓몬을 requiredCount 이상 사용합니다. Bug/Water/Fighting/Psychic 3마리, 등산가 Rock/Ground 합계 3마리처럼 유지합니다. Rank가 올라가도 수를 줄이지 않습니다.
- `competitive`: 에이스와 베테랑입니다. 특정 타입 수를 강제하지 않고 상성·공격 방식·속도/내구·강화 기술 역할을 보완합니다.
- `mixed-theme`: 브리더·신사·레인저 등 폭넓은 종족과 tactic으로 컨셉을 표현합니다.

Normal은 같은 컨셉 후보에서 단순 랜덤 선택합니다. Elite는 BST 선호 가중치로 후보 8종, Master는 더 높은 선호로 12종을 모아 기존 `selectNamedEntries`를 사용합니다. 타입 범위·물리/특수·속도/내구·setup 가용성과 BST를 조합 평가합니다. Master는 제약을 만족하는 조합 중 공통 약점 수가 가장 적은 조합만 남긴 뒤 품질 가중 추첨합니다. 이 옵션은 공통 NPC에만 전달하며 기존 네임드 선택 결과는 유지합니다.

requiredCount 3이면 후보 풀 자체를 테마 안으로 제한합니다. 1~2 조건도 조합 검사에서 하한을 강제합니다. 부족하면 가능한 테마 종을 전부 사용하고 현재 층 일반 풀로 부족분만 채웁니다. 상위 층 풀을 열지 않습니다. `composition`에 themeAvailable/themeRequired/themeUsed/fallback/candidateCount를 저장합니다. Master의 메가 파트너도 컨셉 제약 안에서 고르며 호환 종이 없으면 컨셉을 우선합니다.

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

도구 품질과 장착 수를 별도로 관리합니다. `npcItemSlotRules`에서 범위를 정하고 저장 시드로 실제 슬롯 수와 배치를 결정합니다.

| Rank | 층 | itemSlots |
|---|---|---|
| Normal | 1~20 | 0 |
| Normal | 21~50 | 0~1 |
| Normal | 51~100 | 1~2 |
| Elite | 전체 | 2~3 |
| Master | 전체 | 3 |

슬롯은 시드로 정해진 팀 순서에 배정합니다. 기믹 도구도 이미 장착하는 슬롯을 교체하며 추가 슬롯을 만들지 않습니다. 같은 도구 중복 방지를 유지합니다.

Normal의 basic 후보는 자뭉열매/리샘열매/광각렌즈입니다. Elite는 tactic과 실제 공격 기술 종류에 맞춰 먹다남은음식·울퉁불퉁멧·힘의머리띠·박식안경·달인의띠 등을 사용합니다. Master는 생명의구슬·기합의띠 등 premium 후보를 우선하며, speed의 구애스카프는 변화기가 없는 세팅에서만 후보로 둡니다. 모든 도구는 프로젝트 held-items와 엔진 등록 여부 및 룰을 확인하고 같은 팀의 중복을 제외합니다. 무도구 팀 전체에 Leftovers를 복사하지 않습니다.

Rank별 시도 확률을 통과한 뒤 현재 룰이 허용하는 메가/테라/다이맥스/Z 후보를 찾습니다. basic에서는 전부 금지합니다. 메가는 호환 돌, Z는 실제 기술과 사용자 조건에 맞는 크리스탈, 다이맥스는 기존 호환 조건, 테라는 기존 타입과 팀 사용권을 사용합니다. 팀당 한 가지 계획만 만들고 기존 엔진의 사용권·중첩 규칙을 따릅니다. Master의 메가 구성은 현재 층 풀에 호환 종이 있을 때 그 파트너를 보존합니다. 호환 종이 없으면 상위 층으로 이동하지 않습니다.

이 규칙은 새 공통 랜덤 NPC에 적용됩니다. 기존 네임드/빌런의 층별 대표 기믹 규칙과 저장 팀은 그대로 유지합니다.

## 일반층과 도전자 분포

일반층은 Sample을 minFloor/pool/weight로 필터·추첨한 후 클래스 rankWeights와 층별 prior를 곱해 Rank를 추첨합니다. 테마 종이 부족하다는 이유로 Sample을 제거하지 않고 생성 시 fallback합니다. 최근 NPC ID/특성을 회피하는 기존 기능도 유지합니다. `selectTrainerSample(..., {common:true})`가 새 런 경로이며 기존 기본 경로는 구 런용으로 유지합니다. 과거 `eliteChance`는 구 버전 호환 곡선이며 새 런은 아래 `rankWeights`를 사용합니다.

일반층 prior는 다음 앵커 사이를 선형 보간합니다. 표는 최종 출현 비율이 아니며 클래스 가중치와 곱한 뒤 정규화합니다.

| 층 | Normal | Elite | Master |
|---|---|---|---|
| 1 | 94% | 6% | 0% |
| 20 | 78% | 21% | 1% |
| 50 | 55% | 40% | 5% |
| 60 | 60% | 36% | 4% |
| 100 | 20% | 60% | 20% |

도전자 prior는 **Normal 50% / Elite 42% / Master 8%**이며 클래스 rankWeights를 곱해 정규화합니다. 최종 비율은 클래스마다 달라집니다. Normal/Elite/Master 한 명씩을 보장하지 않습니다. Master 두 명, Elite 두 명 등 임의 조합이 가능합니다. 풀에서 weight로 한 Sample을 뽑고 같은 ID와 표시 클래스를 제거하며 정확히 3명을 선택합니다. minFloor와 풀 조건을 적용합니다. 현재 층마다 최소 세 종류의 표시 클래스가 있어야 합니다.

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

새 `NpcEncounterSnapshot`은 v2이며 sample의 rankWeights/teamConcept, 슬롯 범위와 실제 슬롯 수, composition/fallback을 저장합니다. v1은 legacy sample의 defaultRank와 기존 training/team을 읽는 별도 타입으로 유지합니다. 저장된 상대는 현행 클래스 데이터나 슬롯 규칙으로 다시 해석하지 않습니다. `f35b612`의 실제 20층 v1 반바지 소년 snapshot을 fixture로 보존해, 현재는 Bug 3마리·Normal 무도구여도 당시의 혼합 팀·도구 3개·육성값을 재접속/전투/재도전에서 유지하는지 검증합니다. DB 스키마는 v38을 그대로 사용합니다.

DB v38은 `run_npc_rules(run_id,version=1)`만 추가합니다. 새 런에만 표식을 저장하고 이전 런에는 소급 부여하지 않습니다. 구 런의 미래 일반 NPC와 미래 도전자 이벤트도 구 경로를 유지합니다. 이미 생성된 모든 배틀은 기존 패킹 결과로 복구합니다.

`src/data/legacy-challengers.ts`는 과거 고정 easy/medium/hard 형식 및 앞선 8개/5단계 TrainingTier 형식을 읽는 호환 정의입니다. ID나 표시명·보상·팀을 현재 Sample로 강제 변환하지 않습니다. 신규 후보는 공통 Sample ID를 사용하고 easy/medium/hard에 의존하지 않습니다.

## 스프라이트 확장 정책

[Showdown 원본 목록](https://play.pokemonshowdown.com/sprites/trainers/)과 [개별 크레딧 목록](https://play.pokemonshowdown.com/sprites/trainers/?filter=credited)을 확인했습니다. 목록은 게임 외 제작 자산도 포함하며 개별 아티스트 크레딧과 수정 허가 조건을 안내합니다. 게임 기반 클래스 중 개별 아티스트 표기가 없는 항목을 이번 반입 대상으로 한정했습니다. 이는 자산 권리를 별도로 부여한다는 의미가 아닙니다.

새로 반입한 8종: lass-gen3, pokemonbreeder-gen3, gentleman-gen4, pokemonranger-gen3, veteran-gen4, backpacker, schoolkid-gen4, collector. 기존 자산과 합해 17종 portrait를 사용합니다. 출처 URL·확인일·SHA-256·검토 결과를 `public/sprites/trainers/sources.json` 및 [자산 검토 JSON](../../artifacts/reports/npc/npc-sprite-review.json)에 기록했습니다. 신규 이미지 제작·커스텀 이미지 편집은 없습니다.

검토만 하고 반입하지 않은 후보: pokemonbreeder-gen7(Beliot419), pokemonranger-gen6/veteran-gen7/acetrainer-gen6(kyledove). 후속 도입 시 개별 크레딧·사용 조건을 다시 확인해야 합니다. `scripts/import-common-npc-sprites.ts`는 신규 자산에 아티스트 표기가 있으면 자동 다운로드를 건너뛰고 검토 대상으로 남깁니다. 기존 아티스트 크레딧도 유지합니다.

## QA와 확장 방법

`pnpm exec tsx scripts/report-npc-training.ts --write`로 [5/20/40층 실제 팀 보고서](../../artifacts/reports/npc/NPC_RANK_SAMPLES.md)와 [원본 snapshot JSON](../../artifacts/reports/npc/npc-rank-samples.json)을 재생성합니다. 클래스별 비율·teamConcept·실제 타입 구성·IV 평균·스탯별 IV/EV·도구 개수·기술·fallback·전체 Sample 목록 및 일반층/도전자 최종 비율이 포함됩니다. 5/20/40층의 테마 Normal/Elite와 실력형 Elite/Master를 비교합니다. 실제 플레이 승률의 장기 밸런스 조정은 후속입니다.

새 Sample은 `src/data/npc-samples.ts` 배열에 id, displayName, portrait, tactic, specialty, rankWeights, teamConcept, minFloor, weight, pools만 추가합니다. 보상·IV/EV 숫자를 복사하지 않습니다. 외형이 없으면 먼저 위 자산 검토 절차를 따릅니다. 일반층/도전자 공통 Rank 조정은 npc-ranks.ts, 도전자 보상은 challenger-rewards.ts에서 합니다. 새 Sample을 기존 네임드 catalog에 중복 등록할 필요가 없습니다.

관장·사천왕·챔피언·빌런 보스는 별도 catalog/템플릿을 유지합니다. 공통 Rank Training 할당기는 재사용 가능하지만 이번에 그 팀들을 재육성하거나 캠페인 단계를 추가하지 않았습니다.

## 최종 검증 결과

- 전체 회귀: `pnpm exec tsx --test --test-concurrency=2 tests/*.test.ts` — 564개 통과.
- 컨셉/Rank 집중 검사 19개 통과. 20개 Sample의 0 확률 보존, 추첨 빈도, 테마 수, 부족 fallback, 품질 선호, 슬롯·도구 중복, f35 실제 v1 스냅샷 재접속/재도전을 포함합니다.
- Chrome PC/모바일 E2E 8개 통과. 후보 복구, 기존 도전자, Rank 표시, 실제 배틀 연결, Reward Popup·선택 보상 회귀를 확인했습니다.
- 타입 검사·프로덕션 빌드·CSS 검사·워크스페이스 검사·`git diff --check` 통과.
- 기존 네임드 회귀 검사가 원래 후보 목록만 비교해 지역형/등록 서명 파트너를 간헐적으로 거부하던 부분은 현행 템플릿/지역 변환 기준으로 정정했습니다. 네임드 팀 데이터는 수정하지 않았습니다.
- 보상 정의와 정책은 그대로 유지했습니다. Rank별 300 / 700+티켓 / 1,000+선택 보상, 신규 AI/레이드/미러/빌런 캠페인 확장은 이번 변경에 포함하지 않습니다.
