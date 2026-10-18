# 호연 NPC 검증 보고서

2026-10-18. 승률은 플레이어 대리 AI의 독립 단일 전투 승률이며 낮을수록 NPC가 강하다. 사람 승률·완주율·경제 실험이 아니다.

## 1. 범위와 기존 구조

관장 9 / 사천왕 4 / 챔피언 2 / 조무래기 2 / 간부 4 / 보스 2. 검토 샘플·catalog·runtime·npc-templates·opponent-team·npc-ai·v12 policy·selectionRules·기믹·스프라이트·층별 곡선을 확인했다. 특수 조우와 타 지방은 제외했다. 다른 지방 255개 runtime 정의의 pre-change SHA256를 테스트로 고정했다.

## 2. 기존/신규 샘플

기존 19개 NPC 정의를 후보 선출형으로 개선했다. 신규는 마그마/아쿠아 조직원 공용 샘플과 구열/이연이다. 개별 세트·역할·컨셉·규칙은 [설계 문서](hoenn-named-trainers.md)에 모두 기록했다.

## 3. 측정 방법

Four fixed existing benchmark teams, six player rules, four matched opponent/battle seeds, independent full-HP battles; live floor profiles and v12 NPC policy. F45/F95 role probes; bosses F76/F96. Separate Hoenn route: two seeds, every floor 1..100. No human/climb/economy claims.

기준 commit: a5016c3fb23ef04091fdf329156c7db4b93a873a. Focused before 3648전, after 4416전. 신규 4개에는 before 수치가 없다. 각 NPC/층은 네 팀 × 여섯 룰 × 네 시드=96전이다. 챔피언 비교의 F45/F95는 역할 비교용 probe이고 실제 챔피언 관문 F50/F100은 전체 route에 따로 포함된다.

route는 기존 `simulate-johto-theme-comparison.ts`의 HOENN theme 필터와 두 시드로 1~100층 전부를 검사했다. 같은 common encounters·네 benchmark·장비·battle seed를 공유한다. route별 네임드 배치는 제한 표집이므로 NPC별 조정 판단에는 focused 결과를 함께 사용한다.

초기 실행에서 points 직렬화 표기가 빠진 실험은 폐기했다. `iteration1-focused.jsonl`/`invalid-stat-marker-focused.jsonl` 수치는 최종 근거가 아니다. `valid-iteration1-focused.jsonl`에서 마그마 간부 약점을 확인하고 크로뱃 한 슬롯·아이템·선봉만 보정한 후 최종 after를 다시 실행했다.

## 4. 전체/네임드 1~50, 51~100

| 구간 | Before 전체 | After 전체 | Before named | After named |
|---|---|---|---|---|
| 1-50 | 78.6% (2400) | 77.7% (2400) | 76.5% (480) | 72.1% (480) |
| 51-100 | 78.7% (2400) | 76.8% (2400) | 72.7% (480) | 63.1% (480) |

## 5. NPC별 Before → After

| NPC | 전반/첫 probe | 변화 | 후반 probe | 변화 |
|---|---|---|---|---|
| 원규 (named-roxanne) | 79.2% → 76.0% | -3.1pp | 91.7% → 78.1% | -13.5pp |
| 철구 (named-brawly) | 93.8% → 72.9% | -20.8pp | 100.0% → 67.7% | -32.3pp |
| 암페어 (named-wattson) | 89.6% → 72.9% | -16.7pp | 85.4% → 49.0% | -36.5pp |
| 민지 (named-flannery) | 100.0% → 86.5% | -13.5pp | 100.0% → 82.3% | -17.7pp |
| 종길 (named-norman) | 79.2% → 66.7% | -12.5pp | 72.9% → 62.5% | -10.4pp |
| 은송 (named-winona) | 88.5% → 76.0% | -12.5pp | 82.3% → 72.9% | -9.4pp |
| 풍&란 (named-tateandliza) | 100.0% → 53.1% | -46.9pp | 99.0% → 79.2% | -19.8pp |
| 윤진 (named-wallace-gym) | 54.2% → 66.7% | 12.5pp | 55.2% → 71.9% | 16.7pp |
| 아단 (named-juan) | 75.0% → 38.5% | -36.5pp | 72.9% → 49.0% | -24.0pp |
| 혁진 (named-sidney) | 78.1% → 67.7% | -10.4pp | 85.4% → 58.3% | -27.1pp |
| 회연 (named-phoebe) | 95.8% → 62.5% | -33.3pp | 96.9% → 82.3% | -14.6pp |
| 미혜 (named-glacia) | 56.3% → 71.9% | 15.6pp | 49.0% → 50.0% | 1.0pp |
| 권수 (named-drake) | 67.7% → 74.0% | 6.3pp | 52.1% → 68.8% | 16.7pp |
| 성호 (named-steven) | 76.0% → 80.2% | 4.2pp | 87.5% → 63.5% | -24.0pp |
| 윤진 (named-wallace) | 56.3% → 45.8% | -10.4pp | 79.2% → 58.3% | -20.8pp |
| 마그마단 조직원 (magma-grunt) | — → 91.7% | 신규 | — → 99.0% | 신규 |
| 호걸 (magma-executive-tabitha) | 100.0% → 97.9% | -2.1pp | 95.8% → 100.0% | 4.2pp |
| 구열 (magma-executive-courtney) | — → 97.9% | 신규 | — → 95.8% | 신규 |
| 마적 (magma-boss-maxie) | 34.4% → 35.4% | 1.0pp | 32.3% → 54.2% | 21.9pp |
| 아쿠아단 조직원 (aqua-grunt) | — → 65.6% | 신규 | — → 70.8% | 신규 |
| 해조 (aqua-executive-matt) | 80.2% → 65.6% | -14.6pp | 66.7% → 62.5% | -4.2pp |
| 이연 (aqua-executive-shelly) | — → 75.0% | 신규 | — → 75.0% | 신규 |
| 아강 (aqua-boss-archie) | 22.9% → 31.3% | 8.3pp | 32.3% → 33.3% | 1.0pp |

## 6. 3마리 선출과 규칙

후보별 에이스·기믹 보유자 자동 포함과 required/atLeastOneOf 충족을 실제 generateOpponentTeam으로 검사했다. 후보 3마리의 중복도 검사한다. preferredLead/Last는 해당 후보가 선택된 경우에만 적용한다. 전체 lineup/lead/last frequency는 요약 JSON에 보존한다.

| NPC | floor | draw | ace 포함 | carrier 포함 | 규칙 성공 | 솔록+루나톤 | 전원 속도<70 |
|---|---|---|---|---|---|---|---|
| named-roxanne | 45 | 1000 | 100.0% | 해당 없음 | 100.0% | — | 100.0% |
| named-roxanne | 55 | 1000 | 100.0% | 해당 없음 | 100.0% | — | 100.0% |
| named-roxanne | 95 | 1000 | 100.0% | 해당 없음 | 100.0% | — | 100.0% |
| named-brawly | 45 | 1000 | 100.0% | 100.0% | 100.0% | — | 0.0% |
| named-brawly | 55 | 1000 | 100.0% | 100.0% | 100.0% | — | 0.0% |
| named-brawly | 95 | 1000 | 100.0% | 100.0% | 100.0% | — | 0.0% |
| named-wattson | 45 | 1000 | 100.0% | 100.0% | 100.0% | — | 0.0% |
| named-wattson | 55 | 1000 | 100.0% | 100.0% | 100.0% | — | 0.0% |
| named-wattson | 95 | 1000 | 100.0% | 100.0% | 100.0% | — | 0.0% |
| named-flannery | 45 | 1000 | 100.0% | 100.0% | 100.0% | — | 0.0% |
| named-flannery | 55 | 1000 | 100.0% | 100.0% | 100.0% | — | 0.0% |
| named-flannery | 95 | 1000 | 100.0% | 100.0% | 100.0% | — | 0.0% |
| named-norman | 45 | 1000 | 100.0% | 100.0% | 100.0% | — | 0.0% |
| named-norman | 55 | 1000 | 100.0% | 100.0% | 100.0% | — | 0.0% |
| named-norman | 95 | 1000 | 100.0% | 100.0% | 100.0% | — | 0.0% |
| named-winona | 45 | 1000 | 100.0% | 100.0% | 100.0% | — | 0.0% |
| named-winona | 55 | 1000 | 100.0% | 100.0% | 100.0% | — | 0.0% |
| named-winona | 95 | 1000 | 100.0% | 100.0% | 100.0% | — | 0.0% |
| named-tateandliza | 45 | 1000 | 100.0% | 해당 없음 | 100.0% | 28.0% | 0.0% |
| named-tateandliza | 55 | 1000 | 100.0% | 해당 없음 | 100.0% | 24.5% | 0.0% |
| named-tateandliza | 95 | 1000 | 100.0% | 해당 없음 | 100.0% | 25.0% | 0.0% |
| named-wallace-gym | 45 | 1000 | 100.0% | 100.0% | 100.0% | — | 0.0% |
| named-wallace-gym | 55 | 1000 | 100.0% | 100.0% | 100.0% | — | 0.0% |
| named-wallace-gym | 95 | 1000 | 100.0% | 100.0% | 100.0% | — | 0.0% |
| named-juan | 45 | 1000 | 100.0% | 100.0% | 100.0% | — | 0.0% |
| named-juan | 55 | 1000 | 100.0% | 100.0% | 100.0% | — | 0.0% |
| named-juan | 95 | 1000 | 100.0% | 100.0% | 100.0% | — | 0.0% |
| named-sidney | 45 | 1000 | 100.0% | 100.0% | 100.0% | — | 0.0% |
| named-sidney | 55 | 1000 | 100.0% | 100.0% | 100.0% | — | 0.0% |
| named-sidney | 95 | 1000 | 100.0% | 100.0% | 100.0% | — | 0.0% |
| named-phoebe | 45 | 1000 | 100.0% | 100.0% | 100.0% | — | 0.0% |
| named-phoebe | 55 | 1000 | 100.0% | 100.0% | 100.0% | — | 0.0% |
| named-phoebe | 95 | 1000 | 100.0% | 100.0% | 100.0% | — | 0.0% |
| named-glacia | 45 | 1000 | 100.0% | 100.0% | 100.0% | — | 0.0% |
| named-glacia | 55 | 1000 | 100.0% | 100.0% | 100.0% | — | 0.0% |
| named-glacia | 95 | 1000 | 100.0% | 100.0% | 100.0% | — | 0.0% |
| named-drake | 45 | 1000 | 100.0% | 100.0% | 100.0% | — | 0.0% |
| named-drake | 55 | 1000 | 100.0% | 100.0% | 100.0% | — | 0.0% |
| named-drake | 95 | 1000 | 100.0% | 100.0% | 100.0% | — | 0.0% |
| named-steven | 45 | 1000 | 100.0% | 100.0% | 100.0% | — | 0.0% |
| named-steven | 55 | 1000 | 100.0% | 100.0% | 100.0% | — | 0.0% |
| named-steven | 95 | 1000 | 100.0% | 100.0% | 100.0% | — | 0.0% |
| named-wallace | 45 | 1000 | 100.0% | 100.0% | 100.0% | — | 0.0% |
| named-wallace | 55 | 1000 | 100.0% | 100.0% | 100.0% | — | 0.0% |
| named-wallace | 95 | 1000 | 100.0% | 100.0% | 100.0% | — | 0.0% |
| magma-grunt | 45 | 1000 | 0.0% | 해당 없음 | 100.0% | — | 5.5% |
| magma-grunt | 55 | 1000 | 0.0% | 해당 없음 | 100.0% | — | 4.7% |
| magma-grunt | 95 | 1000 | 0.0% | 해당 없음 | 100.0% | — | 5.4% |
| magma-executive-tabitha | 45 | 1000 | 100.0% | 해당 없음 | 100.0% | — | 8.5% |
| magma-executive-tabitha | 55 | 1000 | 100.0% | 해당 없음 | 100.0% | — | 8.3% |
| magma-executive-tabitha | 95 | 1000 | 100.0% | 해당 없음 | 100.0% | — | 7.8% |
| magma-executive-courtney | 45 | 1000 | 100.0% | 100.0% | 100.0% | — | 8.5% |
| magma-executive-courtney | 55 | 1000 | 100.0% | 100.0% | 100.0% | — | 8.3% |
| magma-executive-courtney | 95 | 1000 | 100.0% | 100.0% | 100.0% | — | 7.8% |
| magma-boss-maxie | 76 | 1000 | 100.0% | 100.0% | 100.0% | — | 0.0% |
| magma-boss-maxie | 96 | 1000 | 100.0% | 100.0% | 100.0% | — | 0.0% |
| aqua-grunt | 45 | 1000 | 0.0% | 해당 없음 | 100.0% | — | 0.0% |
| aqua-grunt | 55 | 1000 | 0.0% | 해당 없음 | 100.0% | — | 0.0% |
| aqua-grunt | 95 | 1000 | 0.0% | 해당 없음 | 100.0% | — | 0.0% |
| aqua-executive-matt | 45 | 1000 | 100.0% | 100.0% | 100.0% | — | 0.0% |
| aqua-executive-matt | 55 | 1000 | 100.0% | 100.0% | 100.0% | — | 0.0% |
| aqua-executive-matt | 95 | 1000 | 100.0% | 100.0% | 100.0% | — | 0.0% |
| aqua-executive-shelly | 45 | 1000 | 100.0% | 해당 없음 | 100.0% | — | 0.0% |
| aqua-executive-shelly | 55 | 1000 | 100.0% | 해당 없음 | 100.0% | — | 0.0% |
| aqua-executive-shelly | 95 | 1000 | 100.0% | 해당 없음 | 100.0% | — | 0.0% |
| aqua-boss-archie | 76 | 1000 | 100.0% | 100.0% | 100.0% | — | 0.0% |
| aqua-boss-archie | 96 | 1000 | 100.0% | 100.0% | 100.0% | — | 0.0% |

## 7. 실제 기믹

Mega: 암페어·은송·혁진·회연·미혜·권수·성호·구열·해조·마적·아강. Z: 철구·민지·종길·관장 윤진·아단·챔피언 윤진. 원규·풍&란·호걸·이연·조무래기는 무기믹. 이번 샘플에는 Tera/Dynamax를 억지 배치하지 않았다. 기존 엔진의 두 기믹은 회귀 검사 대상이다.

| NPC | available battles | actual activations |
|---|---|---|
| named-brawly | 96 | 19 |
| named-wattson | 96 | 96 |
| named-flannery | 96 | 20 |
| named-norman | 96 | 0 |
| named-winona | 96 | 96 |
| named-wallace-gym | 96 | 52 |
| named-juan | 96 | 27 |
| named-sidney | 96 | 96 |
| named-phoebe | 96 | 96 |
| named-glacia | 96 | 87 |
| named-drake | 96 | 96 |
| named-steven | 96 | 96 |
| named-wallace | 96 | 63 |
| magma-executive-courtney | 96 | 96 |
| magma-boss-maxie | 192 | 133 |
| aqua-executive-matt | 96 | 95 |
| aqua-boss-archie | 192 | 104 |

## 8. Z v12 telemetry

정책은 변경하지 않았다. Miss는 공개 정보 기반 Z-only KO 기회에 일반 행동을 실제 수행한 경우의 추정이고 Waste는 일반기로 KO가 추정되는 공격 Z/차단 사용이다. 사후 최적해 또는 인간 판단이 아니다. gain은 추정 피해 증가량이며 실제 HP 감소량과 동일하지 않다. low-gain은 상대 최대 HP 10% 미만이다. 사용률 목표를 설정하지 않는다.

| NPC | available/compatible | uses/rate | turn | user/target HP | Miss/opportunities | Waste | KO before/after action without Z | estimated gain | low/high gain | attack KO conversion |
|---|---|---|---|---|---|---|---|---|---|---|
| named-brawly | 96/96 | 19/19.8% | 2.84 | 43.9%/93.2% | 0/16 | 0 | 24/52 | 57.5 | 0/19 | 13/19 (68.4%) |
| named-flannery | 96/96 | 20/20.8% | 2.35 | 61.8%/88.6% | 0/28 | 0 | 30/46 | 63.2 | 0/20 | 7/20 (35.0%) |
| named-norman | 96/96 | 0/0.0% | — | —/— | 0/0 | 0 | 0/89 | — | 0/0 | 0/0 (—) |
| named-wallace-gym | 96/96 | 52/54.2% | 4.46 | 67.6%/90.6% | 0/12 | 0 | 17/20 | 69.8 | 0/52 | 6/52 (11.5%) |
| named-juan | 96/96 | 27/28.1% | 7.26 | 82.3%/92.6% | 0/6 | 0 | 0/53 | 80.5 | 0/27 | 17/27 (63.0%) |
| named-wallace | 96/96 | 63/65.6% | 3.98 | 71.3%/91.0% | 0/27 | 0 | 5/28 | 76.8 | 0/63 | 6/63 (9.5%) |

## 9. 보스와 전설 영향

| NPC | player win | legendary attributed KOs | estimated solo sweeps |
|---|---|---|---|
| magma-boss-maxie | 44.8% | 185 | 14 / 192 |
| aqua-boss-archie | 32.3% | 292 | 55 / 192 |

KO attribution은 마지막 p2 기술 이후의 protocol faint를 센 근사치로 잔여 피해가 섞일 수 있다. 전설을 뺀 인과 ablation이 아니므로 “전설 때문에 승률이 X 변했다”고 해석하지 않는다. 원시형을 없애고 요청한 메가 파트너를 적용했으므로 before/after에는 기믹 변경 영향도 포함된다. 스탯 보너스는 없다.

## 10. 팀별/룰별 편향

| NPC | starters | offense | bulk | signature |
|---|---|---|---|---|
| named-roxanne | 75.0% | 95.8% | 37.5% | 100.0% |
| named-brawly | 60.4% | 83.3% | 52.1% | 85.4% |
| named-wattson | 37.5% | 100.0% | 35.4% | 70.8% |
| named-flannery | 72.9% | 100.0% | 68.8% | 95.8% |
| named-norman | 56.3% | 66.7% | 37.5% | 97.9% |
| named-winona | 83.3% | 89.6% | 43.8% | 81.3% |
| named-tateandliza | 54.2% | 75.0% | 47.9% | 87.5% |
| named-wallace-gym | 87.5% | 75.0% | 18.8% | 95.8% |
| named-juan | 35.4% | 52.1% | 12.5% | 75.0% |
| named-sidney | 56.3% | 81.3% | 20.8% | 93.8% |
| named-phoebe | 66.7% | 83.3% | 54.2% | 85.4% |
| named-glacia | 68.8% | 58.3% | 37.5% | 79.2% |
| named-drake | 56.3% | 81.3% | 60.4% | 87.5% |
| named-steven | 75.0% | 77.1% | 62.5% | 72.9% |
| named-wallace | 54.2% | 60.4% | 10.4% | 83.3% |
| magma-grunt | 91.7% | 100.0% | 89.6% | 100.0% |
| magma-executive-tabitha | 100.0% | 100.0% | 97.9% | 97.9% |
| magma-executive-courtney | 100.0% | 100.0% | 97.9% | 89.6% |
| magma-boss-maxie | 16.7% | 60.4% | 41.7% | 60.4% |
| aqua-grunt | 50.0% | 93.8% | 50.0% | 79.2% |
| aqua-executive-matt | 33.3% | 97.9% | 35.4% | 89.6% |
| aqua-executive-shelly | 68.8% | 93.8% | 47.9% | 89.6% |
| aqua-boss-archie | 20.8% | 58.3% | 6.3% | 43.8% |

| NPC | basic | mega | dynamax | tera | chaos | z |
|---|---|---|---|---|---|---|
| named-roxanne | 71.9% | 68.8% | 84.4% | 75.0% | 93.8% | 68.8% |
| named-brawly | 56.3% | 62.5% | 84.4% | 65.6% | 96.9% | 56.3% |
| named-wattson | 40.6% | 46.9% | 93.8% | 40.6% | 96.9% | 46.9% |
| named-flannery | 81.3% | 75.0% | 90.6% | 84.4% | 96.9% | 78.1% |
| named-norman | 50.0% | 56.3% | 81.3% | 62.5% | 93.8% | 43.8% |
| named-winona | 59.4% | 65.6% | 93.8% | 62.5% | 100.0% | 65.6% |
| named-tateandliza | 53.1% | 59.4% | 81.3% | 62.5% | 90.6% | 50.0% |
| named-wallace-gym | 56.3% | 65.6% | 84.4% | 68.8% | 81.3% | 59.4% |
| named-juan | 21.9% | 40.6% | 75.0% | 21.9% | 75.0% | 28.1% |
| named-sidney | 43.8% | 62.5% | 78.1% | 59.4% | 90.6% | 43.8% |
| named-phoebe | 53.1% | 65.6% | 87.5% | 81.3% | 93.8% | 53.1% |
| named-glacia | 46.9% | 50.0% | 81.3% | 46.9% | 90.6% | 50.0% |
| named-drake | 56.3% | 59.4% | 100.0% | 56.3% | 93.8% | 62.5% |
| named-steven | 65.6% | 65.6% | 81.3% | 59.4% | 96.9% | 62.5% |
| named-wallace | 34.4% | 43.8% | 81.3% | 43.8% | 68.8% | 40.6% |
| magma-grunt | 93.8% | 93.8% | 96.9% | 96.9% | 96.9% | 93.8% |
| magma-executive-tabitha | 100.0% | 96.9% | 100.0% | 100.0% | 100.0% | 96.9% |
| magma-executive-courtney | 96.9% | 93.8% | 100.0% | 96.9% | 100.0% | 93.8% |
| magma-boss-maxie | 18.8% | 25.0% | 78.1% | 25.0% | 90.6% | 31.3% |
| aqua-grunt | 46.9% | 59.4% | 93.8% | 59.4% | 96.9% | 53.1% |
| aqua-executive-matt | 46.9% | 50.0% | 81.3% | 46.9% | 100.0% | 59.4% |
| aqua-executive-shelly | 59.4% | 68.8% | 90.6% | 68.8% | 96.9% | 65.6% |
| aqua-boss-archie | 12.5% | 21.9% | 46.9% | 18.8% | 68.8% | 25.0% |

## 11. 90~100% 이상치 원인

A 후보 / B 선출 / C 순서 / D 기술 / E 도구 / F AI 활용 / G 기믹 / H benchmark 상성 / I 전설. 높은 셀을 전체 NPC 약함으로 자동 단정하지 않는다.

- magma-grunt: A/H: 물/땅에 약한 조직 풀과 Basic~Tactical 한계. 낮은 등급이므로 보스와 같은 승률을 강제하지 않는다.
- magma-executive-tabitha: A/B/C/D/E/H: 물에 약한 폭타·마그카르고와 공격력이 낮은 조직 파트너가 반복 약점이다. 소규모 보정으로 크로뱃에 생명의구슬·기가드레인을 주고 선봉을 선호하도록 했다. Upper Gym 목표 충족 여부는 최종 표를 따른다.
- magma-executive-courtney: A/B/C/D/E/G/H: 메가폭타도 느리고 물 4배 약점이 남는다. 크로뱃의 물/땅 대응 보정 후에도 높은 승률이 반복되면 추가 조정 대상으로 남긴다.

## 12. 트릭룸·게으름·조직 구분

종길의 최종 전투에서 Truant 관련 protocol 257건을 관찰했다. 공통 교대 정책을 사용한다. 풍&란의 둘 동시 포함률은 6절에 기록했다. Matt는 가속/메가 마무리, Shelly는 특수 샤크니아·맹독·회복 운영이다. 조직원은 간부용 기믹과 Expert AI를 사용하지 않는다.

## 13. 남은 문제와 설계 판단

후보 지정과 원작 검증은 구분해야 한다. 일부 요청 후보의 실제 본가 사용 이력은 확정되지 않았으며, 해당 후보는 타워 확장이다. 모든 NPC의 사람 승률을 보장하는 실험은 아니다. 특히 마그마 간부가 최종에도 Upper Gym급보다 쉽게 나오면 후보/역할/매치업을 추가로 검토해야 한다. 공통 AI와 v12 Z 기준을 바꿔 이 문제를 숨기지 않는다.

## 14. 테스트와 재현

실행 명령과 최종 결과는 아래 검증 기록을 참조한다. 원시 전투/trace/manifest는 로컬 `artifacts/experiments/balance/hoenn-20261018/`, 추적 가능한 집계는 `artifacts/reports/npc/hoenn-audit.json`이다.

```powershell
node --import tsx scripts/review-hoenn-npc-samples.ts
node scripts/export-normal-npc-runtime.mjs --check
node node_modules/typescript/bin/tsc --noEmit
node --import tsx --test tests/*.test.ts
node --require ./scripts/windows-build-links.cjs node_modules/next/dist/bin/next build
node --import tsx node_modules/@playwright/test/cli.js test e2e/hoenn-named-trainers.spec.ts e2e/battle-retry.spec.ts e2e/hidden-boss-events.spec.ts e2e/raid-events.spec.ts e2e/run-events.spec.ts e2e/teleport.spec.ts
$env:THEME_BALANCE_THEMES='hoenn'; $env:THEME_BALANCE_SEEDS='2'; $env:THEME_BALANCE_TELEMETRY='1'; $env:THEME_BALANCE_OUTPUT='artifacts/experiments/balance/hoenn-20261018'
node --import tsx scripts/simulate-johto-theme-comparison.ts
$env:HOENN_SEEDS='4'
node --import tsx scripts/simulate-hoenn-npcs.ts
node --import tsx scripts/report-hoenn-npcs.ts
```

기준 데이터를 재구성할 때 위 commit의 src/data/normal-npc-templates.json을 로컬 baseline-runtime.json으로 저장하고 NPC_BALANCE_BASELINE을 지정한다. --import ./scripts/lib/npc-balance-baseline.mjs --import tsx 와 --before로 읽기 전용 기준 실험을 실행한다. live 파일을 교체하지 않는다.

## 15. 최종 판정

검증 결과 확정 후 아래 판정을 갱신한다.

최종 검증 기록:

- `node --import tsx --test tests/*.test.ts`: 859개 통과, 실패 0. 후속 데이터 보정 뒤 호연·관동·성도·선출·기믹 집중 검사 92개 통과, 원규 Tactical 상한 반영 뒤 호연·AI·기믹 검사 46개 통과.
- `node scripts/export-normal-npc-runtime.mjs --check`: 검토 원본과 런타임 284개 일치.
- `node node_modules/typescript/bin/tsc --noEmit`: 통과.
- `node --require ./scripts/windows-build-links.cjs node_modules/next/dist/bin/next build`: 최종 프로덕션 빌드 통과. Windows 샌드박스 접근 오류 후 권한을 요청한 동일 명령으로 검증했다.
- 호연·재도전·히든보스·레이드·run events·Teleport E2E 37개 통과. 마지막 AI 설정 반영 빌드에서 호연 4개를 다시 실행해 통과했다. 호연 화면은 1280/390px, 행동 제출·새로고침·저장된 팀/seed/정책의 동일성을 확인한다.
- `simulate-johto-theme-comparison.ts`: Hoenn 1~100층 × 네 benchmark × 여섯 룰 × 두 시드 = before/after 각각 4,800전, 오류 0. 일반 encounters 3,840개는 동일하며 캐시 키는 팀·seed·AI·기믹·장비를 포함한다.
- `simulate-hoenn-npcs.ts`: 기존 NPC before 3,648전 / 전체 NPC after 4,416전, 오류 0. 67개 NPC/층 조합 × 1,000회 = 67,000회 실제 선출 검사에서 규칙 충족률 100%.
- v12 정책·Z 판단 구현은 변경하지 않았다. Z 보유 여섯 NPC 각각 96 available/compatible battles를 집계했다. 종길은 사용 0, 추정 Z-only KO opportunity도 0이며 이를 AI 결함으로 단정하지 않는다. 전체 추정 Miss/Waste는 각각 0이다. 이는 해당 시드/benchmark의 공개 정보 기반 추정이지 기회가 절대 없다는 증명은 아니다.
- 실제 미혜 전투 protocol에서 `Snow Warning → Snowscape`를 확인했다. 우박으로 가정하지 않았다.
- `git diff --check`: 통과. 다른 지방의 255개 런타임 정의와 기존 Johto/Rocket 구성은 해시 회귀 검사로 보존한다.

전체 테스트 이후 마지막 수정은 마그마 간부 크로뱃의 한 기술/도구·선봉 선호와 원규의 요청된 Tactical 상한이다. 관련 집중 테스트와 최종 빌드/E2E를 다시 확인했다. 새 AI tier, 전용 trainer 분기, 스탯 배율, 추가 selection rule, 엔진 재작성은 없다.

기준 before 실험을 완전히 재현하려면 기록된 기준 commit의 catalog/AI 메타데이터도 함께 사용해야 한다. 현재 catalog에서 원규의 Tactical 상한을 유지한 채 runtime만 기준 파일로 교체하면 과거 Expert 조건과 달라질 수 있다. 기록된 before 결과는 상한 변경 전에 측정했다.


DESIGN_REVIEW_REQUIRED

호연 필수 NPC 추가 조정 필요

샘플 등록·법적 세트·선출·저장/복원 검사는 완료했지만 마그마 간부 둘의 목표 Power Tier는 충족했다고 판단하지 않는다. 공통 AI 변경이나 관계없는 강포켓몬 추가 없이 이 풀의 역할과 매치업을 재검토할 필요가 있다.
