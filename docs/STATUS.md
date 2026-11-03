# 현재 게임 상태

- Status: Active
- Updated: 2026-11-03
- Baseline Commit: `1c05b6f5079143ba4be7df3f3745155aee483ce7` (`main`)
- Applies To: beta.6 개발 상태; package/Windows launcher 버전 표기는 아직 `1.0.0-beta.5`

위 HEAD의 구현 상태이며 beta.6 패키징·공개 완료를 뜻하지 않는다. beta.5 공개본의 파일·해시·당시 검증은 [릴리스 기록](releases/WINDOWS_BETA_5.md)에 보존한다.

## 구현 완료

| 영역 | 현재 동작과 기준 |
|---|---|
| 타워 | 신규 Run `hundred-floor-v2`, 100층·전후반 두 지역, 50/100층 챔피언. 기존 v1/legacy와 저장된 배틀은 보존 |
| 상대 성장 | 종·기술·역할·도구·AI·기믹을 단계적으로 강화. 1–49층 정규 기믹 금지, 50층 모든 지역 챔피언 기믹 지정, 이후 Elite/Master 중심. [12구간 정책](engineering/opponent-progression.md) |
| 전투·영입 | 최대 6마리 중 3마리 출전하는 3v3. 다음 전투는 완전 회복 상태로 시작. 일반 승리 후 방금 싸운 상대 3마리 중 1마리 선택, 랜덤 리롤 후보가 아님. 옛 비수집 종 snapshot·특수 이벤트는 별도 예외 |
| 영구 성장 | 포켓몬별 ev_capacity 확장에 성장 포인트 사용; 확보한 capacity 안 EV 재분배·성격·일반 특성 변경 무료. 실제 Hidden Ability만 포켓몬별 1회 해금. Special slot은 무료 |
| 기술 | 포켓몬별 추가 합법 기술 영구 해금. 기존 move_unlocks를 알/TM과 공유하며 이미 얻은 기술은 중복 결제하지 않음. [육성·임시 가격](gameplay/COLLECTION.md) |
| 빛나는 부적 | eggFocus를 대체한 계정 전체 업그레이드. 같은 레벨을 알·타워·**Scout**의 별도 이로치 확률표에 적용. Scout 후보마다 생성 시 1회 판정해 offer와 함께 저장 |
| 타워 이로치 | 상대 생성 시 packed team에 고정. 전투·재접속·재도전·영입 후보·실제 영입까지 보존. 부적 구매 후 기존 상대를 재추첨하지 않음 |
| 도감·튜토리얼 | 도감은 정보/육성, 게임 시작은 출전 편성. 스타팅 최종 진화형 27종. 초기 256P는 안내/스킵과 무관하게 최초 1회 지급 |
| 상점·재화 | 10층마다 **Held Items / Support / Pokémon Scout** 세 탭 동시 사용, 각 4카드. TM 탭 제거(기존 보유 TM은 배낭에서 계속 사용). 영구 화면은 리롤·재도전·출발 지원금·빛나는 부적, 알뽑기는 별도. **모든 가격·확률은 provisional** ([상세](gameplay/ITEMS.md#등반-코인-상점-beta6)) |
| Support | 기본(공·방·특공·특방·스피드 +1), 고급(Dire Hit·Guard Spec 계열), 특수(Levitate·Magic Guard·Multiscale·Unaware·Regenerator 임시 특성). 한 전투 한정, 회복 상품 없음 |
| Pokémon Scout | 층별 rarity 분포에서 4마리(중복 없음), 코인 영입(6마리면 교체), 전체 4마리 리롤(횟수 무제한·가격 증가), 이로치 연결. 승리 후 3마리 영입과 별개 |
| 플레이어 기믹 | v2는 1–49층 발동 잠금, **50층 클리어 후 첫 기믹 무료 선택**, 이후는 Held Items 4칸 pool에서 코인 구매. 50층 전에는 기믹 장비를 판매하지 않음 |
| 이벤트 | 일반 이벤트·도전자·빌런 캠페인·히든보스·20종 다단계 Raid·Mirror. v2 신규 Raid/Mirror 제시는 50층 관문 이후, 기존 pending snapshot 유지 |
| 저장 | SQLite **schema 49**, 일반 정책 tower-policy-v13. Run progression·이벤트·NPC snapshot·AI 버전을 구분. [migration](engineering/DATABASE.md) |
| 운영·자산 | Node 24+ Windows production 실행·별도 사용자 DB. 외부 runtime은 lock/recipe/manifest로 복원, 원본·라이선스·출처 기록 유지 |

성장 포인트는 단순 영구 공격력 배수보다 **빌드 자유도·선택지·영구 해금**에 사용한다. EV capacity는 실제 투자 한도이므로 능력치에 영향을 주지만 종족값/공격력 배수를 추가하는 시스템은 아니다.

## 현재와 계획의 경계

- 구현: 50층 클리어 후 첫 기믹 무료 선택(v2 신규 Run). 이전 Run은 기존 규칙대로 장비를 조기 구매할 수 있다. 별도 기믹 상점은 없다.
- 구현(가격·확률은 provisional): Support / Pokémon Scout 탭, Scout 리롤·이로치. 미구현·보류: Magic Bounce·Good as Gold·Disguise Support, switch-in 전용·Huge Power 계열 Support, 가격 scaling(floor·진행도), 인간 플레이 기반 경제 튜닝.
- **49→50 난이도 점프는 알려진 이슈**다. 상대는 아직 조정하지 않았다. 새 경제 반영 후 모델 플레이어 2차 시뮬레이션(층당 300전)은 [경제·후반 난이도 2차 검증](#경제후반-난이도-2차-검증-simulation-result-provisional)에 있으며 확정 밸런스가 아니다.

## 경제·후반 난이도 2차 검증 (simulation result, provisional)

모델 플레이어(규칙 기반 구매·팀 구성·Support 사용)와 실제 생성된 상대로 측정했다. 인간 플레이 데이터가 아니며 확정 밸런스가 아니다. 이번 2차에서 **가격·확률·상대는 변경하지 않았다**. 도구: `scripts/simulate-economy-second-pass.ts`, `scripts/probe-late-game-balance.ts`, 공유 모델 `scripts/lib/run-model.ts`. 요약 JSON은 Git 제외 `artifacts/economy/`.

**경제** (정책별 5,000 Run, 전투 보상만; 이벤트·출발 지원금 제외, 평균 수입 40.5k)

| 정책 | 지출 | 종료 coin | Held / Support / Scout / reroll / gimmick 비중 | 비고 |
|---|---|---|---|---|
| greedy(1차 정책) | 34.8k | 5.7k | 8 / 24 / 45 / 23 / 0 % | reroll 8.3회 |
| conservative(저축) | 25.6k | 15.0k | 16 / 14 / 65 / 0 / 5 % | 추가 gimmick 0.37회, 전설·환상 구매 31%·16% |
| balanced | 33.0k | 7.6k | 12 / 24 / 53 / 10 / 0.3 % | reroll 4.2회, 전설 구매 19%, 환상 6% |
| aggressive | 35.2k | 5.3k | 11 / 20 / 46 / 23 / 0.3 % | reroll 8.4회, 전설 구매 3.5% |

- 전설(Restricted) Scout는 6,000코인이라 소비형이 사기 어렵지만(구매 가능 4%), 저축형은 보이는 즉시 100% 구매 가능(32%의 Run)이다. 가격 문제가 아니라 ‘저축 vs 소비’ 선택 구조로 판단했다. 1차의 ‘전설 구매 0’은 greedy 정책 한계였다.
- 추가 gimmick 구매는 공급(50층 이후 5회 상점)과 정책 예산 규칙이 병목이다. 0.4회/Run은 conservative에서만 나오며 balanced 0.04회. 아래 효과 측정에서 gimmick 효과가 작아 가격 인하 근거가 없다.
- 첫 상점 평균 coin 2.7k로 일반 Scout(1.2k)·Support를 살 수 있어 ‘아무것도 못 사는 구간’은 없다. balanced 종료 잔액은 수입의 약 19%, 후반 coin이 서서히 쌓이며 reroll이 sink로 작동한다.
- balanced Support는 16.8개 구매·9개 사용: 구매 과다가 모델에 있으며 Support가 효과 대비 가장 싼 sink다(후속 가격 후보).

**난이도** (조건·층당 300전, 코스별 상대 seed와 시작 파티 3마리가 다름, 같은 코스로 짝 비교)

| 조건 | 40 | 49 | 50 | 60 | 70 | 80 | 90 | 95 | 100 |
|---|---|---|---|---|---|---|---|---|---|
| baseline(스타터 3마리) | 78 | 79 | 34 | 48 | 44 | 44 | 38 | 44 | 20 |
| beta6 Support 미사용 | 84 | 88 | 48 | 72 | 63 | 66 | 55 | 63 | 35 |
| beta6 + Support | 88 | 89 | 56 | 79 | 69 | 72 | 61 | 69 | 43 |
| Scout 없음 + Support | 83 | 82 | 49 | 67 | 57 | 57 | 51 | 54 | 33 |
| beta6 + Support, gimmick 없음 | 88 | 89 | 56 | 74 | 69 | 71 | 62 | 68 | 43 |
| conservative + Support | 83 | 86 | 57 | 68 | 64 | 66 | 66 | 64 | 48 |
| aggressive + Support | 85 | 87 | 56 | 75 | 76 | 64 | 62 | 67 | 39 |

(승률 %, 표준오차 약 ±3%p. 승률 단위는 이 모델의 3v3 단판이며 Run 완주율이 아니다. 조건 baseline도 상대는 같은 규칙으로 기믹을 쓴다.)

- **49→50**: baseline −45%p, beta6+Support −33%p로 완화됐지만 절벽이 남아 있다. 49는 일반/Elite, 50은 챔피언(상대 종족값 합 +130)이라 역할 차이가 원인이다. 무료 첫 gimmick은 50층 **클리어 후** 선택이므로 50층 전투에는 영향이 없다(구조상).
- **90층 상승은 실제**: 38→55(Support 미사용)→61. 1차 12판의 ‘4/12→11/12’는 과장이다. **100층도 20→35→43으로 개선**되어 1차의 ‘변화 없음’은 소표본 우연이었다. 100층은 후반 최저 승률로 최종 보스 축은 유지된다(95는 69).
- **Support 효과**: 50/90/100에서 +8/+6/+8%p(보스·고층 위주 약 2개 사용). Scout 효과 +7~10%p(Scout 없음 비교). gimmick 효과는 60층 +5%p 외에는 0~1%p로 작다(모델 gimmick 사용 AI의 한계 가능성).
- **Scout 영향**: 전설·환상을 파티에 둔 팀은 90층에서 20/25(80%), 100층에서 31/69(45%). 100층에서는 이점이 거의 없다.
- **100층 원인**: 챔피언 floor(50/100)는 종족값 합이 약 1,590으로 다른 층(약 1,500)보다 높고, 같은 챔피언 안에서도 편차가 크다. 100층 beta6+Support에서 Leon 2/36, Geeta 8/31, Steven 10/36, Lance 14/40, Blue 21/34. Leon은 50층에서도 6/34로 같은 층 다른 챔피언의 1/3 수준인데 종족값 합은 최상위가 아니다(Lance 1,674 대비 1,634). 구성(Aegislash·Focus Sash·Weakness Policy 등)이나 모델 AI의 한계일 가능성이 있어 **상대 수정 없이 인간 플레이로 확인할 후속 후보**로 남겼다.
- 변경 없음 근거: 49·90·100은 목표 곡선 안(50·100 챔피언 피크, 90 Elite, 100 최저)이며 후반 자동 승리도 아니다(90~99는 61~69%). 특정 champion 1명(Leon)의 outlier는 모델 AI 영향을 분리하지 못해 조정하지 않았다.

원자료 요약: `artifacts/economy/economy-second-pass.json`, `late-game-balance.json`(Git 제외, 스크립트로 재현). 1차 probe(12코스)는 위 결과로 대체한다.

## 검증 상태

beta.6 상점 개편 작업에서 전체 unit(`tests/*.test.ts`) 실행, 신규 `tests/run-economy.test.ts` 9건·TypeScript·production build 통과. E2E는 전체를 돌리지 않고 `e2e/run-shop.spec.ts`만 실행했다. 이후 후속 작업에서 상점 개편으로 낡은 E2E(rank-rewards, maintenance-items, hidden-shop 체크포인트 회귀, bag 메뉴 Bag, shop-bag-ux 탭, shop-reroll, game-menu 상점 탭 명칭)를 현재 3탭에 맞췄고 TM 상점 전용 `machine-shop.spec.ts`는 제거했다. 해당 spec과 `run-shop.spec.ts`는 통과한다. 상점 개편 이전(`9fa576fd`)에도 실패하던 26건(hidden-shop fixture `egg-ticket-5`, game-menu, fifty/thirty-floor, usability, shop.spec, bag 공통 Bag 등)은 이번 범위 밖의 기존 stale 실패로 남아 있다. 관련 E2E와 명령은 [개발자 검증](development/DEVELOPER_COMMANDS.md#beta6-기준-검증)을 따른다. 전체 unit/E2E 또는 사람의 100층 완주가 모두 green이라는 뜻은 아니다.

이전 상대 개편의 1,000 Run×100층 및 통제 전투는 해당 변경 당시 분석이다. 원자료는 Git 제외 `artifacts/build-progression-audit/`, `artifacts/progression-audit/`에 있으며 이번 HEAD에서 전체를 다시 생성하지 않았다. 인간의 생존곡선·구매 정책은 포함하지 않는다.
