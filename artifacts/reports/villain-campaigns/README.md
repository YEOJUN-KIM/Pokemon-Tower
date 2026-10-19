# 빌런 캠페인 검증 — 2026-10-19

## 등장 분포

조직별 10,000런, 총 80,000런. 모든 전투 승리·Teleport 없는 정상 100층 진행을 가정한다. 실제 구현과 같은 eligibility/pity 함수를 호출하며 2~100층 진입 시점을 시뮬레이션한다. 샘플 누락 잠금도 그대로 적용한다.

| 조직 | 단계별 평균 층 | 보스 p50/p75/p90 | 완료율 | 보스 미등장 | 평균 단계 간격 |
|---|---|---|---:|---:|---:|
| rocket | grunt-1: 7.41, grunt-2: 15.8 | —/—/— | 0% | 100% | 8.39 |
| magma | grunt-1: 7.39, grunt-2: 15.75, executive: 50.34, boss: 80.36 | 80/83/85 | 99.99% | 0.01% | 24.32 |
| aqua | grunt-1: 7.37, grunt-2: 15.77, executive: 50.49, boss: 80.38 | 80/83/85 | 99.98% | 0.02% | 24.34 |
| galactic | grunt-1: 7.35, grunt-2: 15.77, officer: 30.76, executive: 50.4, boss: 80.39 | 80/83/85 | 100% | 0% | 18.26 |
| plasma | grunt-1: 7.41, grunt-2: 15.83, executive: 50.3, boss: 80.32 | 80/82/85 | 99.99% | 0.01% | 24.3 |
| flare | grunt-1: 7.36, grunt-2: 15.76, officer: 30.7, executive: 50.39, boss: 80.38 | 80/83/85 | 100% | 0% | 18.25 |
| skull | grunt-1: 7.44, grunt-2: 15.83, officer: 30.75 | —/—/— | 0% | 100% | 11.65 |
| macrocosmos | grunt-1: 7.41, grunt-2: 15.73, executive: 50.43, boss: 80.42 | 80/83/85 | 99.99% | 0.01% | 24.34 |

로켓단은 아테나, 스컬단은 플루메리 샘플 누락으로 중단된다. 이를 확률 문제로 숨기거나 임의 NPC로 건너뛰지 않았다. 나머지 조직은 75~78층 보스 비중 약 33%, 중앙값 80층이므로 초기 제안 5/+3/35%, 간격 3/보스 5를 유지했다.

## 전투 벤치마크

기존 simulate-hoenn-npcs의 네 팀·육성·장비 기준을 재사용했다. 최소 등장 층, basic/chaos, seed 3개씩. 독립 자동 전투이며 인간 승률/연속 런 생존율이 아니다.

| NPC | 층 | 플레이어 승리 | 오류 |
|---|---:|---:|---:|
| named-archer | 45 | 17/24 | 0 |
| named-giovanni | 75 | 22/24 | 0 |
| magma-executive-tabitha | 45 | 22/24 | 0 |
| named-maxie | 75 | 12/24 | 0 |
| aqua-executive-shelly | 45 | 20/24 | 0 |
| named-archie | 75 | 6/24 | 0 |
| galactic-executive-mars | 25 | 17/24 | 0 |
| galactic-executive-jupiter | 45 | 17/24 | 0 |
| named-cyrus | 75 | 6/24 | 0 |
| plasma-executive-colress | 45 | 14/24 | 0 |
| named-ghetsis | 75 | 13/24 | 0 |
| flare-executive-aliana | 25 | 16/24 | 0 |
| flare-executive-xerosic | 45 | 13/24 | 0 |
| named-lysandre | 75 | 8/24 | 0 |
| named-guzma | 25 | 24/24 | 0 |
| named-lusamine | 75 | 8/24 | 0 |
| named-oleana | 45 | 13/24 | 0 |
| named-rose | 75 | 13/24 | 0 |

총 432전, 오류 0. 각 대상에서 플레이어 승리 사례가 확인되었다. 아강·태홍 6/24, 비주기 22/24 등 난이도 편차는 후속 검토 대상이다. 이번 작업에서는 검토된 팀과 AI를 변경하지 않았다.

## 실행 결과

- 타입 검사 및 운영 빌드 통과.
- 신규 캠페인/교환권/Teleport 후속 테스트 22개 통과.
- Run Event·Chest·Merchant·Breeder·Teleport·Raid·Challenger·Rocket v1·Hidden Boss·Bag·Retry 보상 관련 회귀 138개 통과. 추가로 Raid 확률 회귀 1개 및 최신 Hidden Boss/신규 트랙 묶음 32개 통과.
- E2E 10개 통과: Rocket v1 6개(마지막 공격/기절 포함), 신규 독립 트랙과 교환권 4개(1280/390px × 기본/동작 줄이기, 4배속, refresh/reconnect).
- 후보마다 기존 도구 아이콘을 추가했다. 추가 후 신규 E2E 4개를 재실행해 아이콘 4개와 naturalWidth>0, 데스크톱/모바일 레이아웃을 확인했다.
- CSS 구조 검사 통과. workspace 구조 검사는 기존 scripts/report-* 및 audit-alola의 docs 출력 규칙 위반 15건으로 실패한다. 해당 스크립트는 이번 작업에서 변경하지 않았다.
- 전체 단위 테스트 1,198개 중 1,195개 통과, 3개 실패. 실패는 변경하지 않은 tests/paldea-round2.test.ts의 이전 빌드 baseline 기대값(Expert Belt / Stone Edge)과 현재 실제 샘플(빈 도구 / Toxic Spikes)의 불일치다. 해당 테스트·샘플·audit variant의 의미 있는 변경은 이번 diff에 없음을 확인했다. NPC 팀을 새로 디자인하지 말라는 범위에 따라 수정하지 않았다.

## 재현 자료

- [실행 분포 JSON](distribution.json)
- [전투 결과 및 입력 해시](battles.json)
- [현재 설계와 수동 QA](../../../docs/villain-campaign-tracks.md)

UI 캡처: artifacts/qa/screenshots/villain-tracks/ (생성 이미지, 저장소 ignore 대상).

## 변경 파일 범위

- 데이터: villain-tracks.ts 신규, run-events.ts / rewards.ts / bag.ts 확장.
- 서버: villain-track-samples.ts / villain-track-rewards.ts / tool-vouchers.ts 신규, villain-campaigns.ts / run-events.ts / tower-store.ts / run-bag.ts / rewards.ts 통합.
- 저장: schema.ts / storage/migrations.ts (46), tower-service.ts singleton 갱신.
- UI: tool-voucher-dialog.tsx 신규, bag.tsx / item-acquisition-dialog.tsx / run-event.tsx / battle-game.tsx / event-presentation.ts / reward-panel.tsx / shared/contracts.ts 확장.
- 검증: villain-tracks.test.ts / tool-vouchers.test.ts / villain-track-fixture.ts / e2e/villain-tracks.spec.ts 신규. 기존 migration 기대값을 46으로 갱신하고 hidden-boss-fixture 및 raid-playtest를 독립 트랙과 분리해 고정했다.
- 시뮬레이션: simulate-villain-campaigns.ts / simulate-villain-battles.ts / lib/villain-benchmark.ts 신규.
- 문서: docs/villain-campaign-tracks.md 신규, 기존 Rocket 문서에 v1 안내 추가.
