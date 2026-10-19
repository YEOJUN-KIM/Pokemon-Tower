# 빌런 캠페인 완성 검증 — 2026-10-19

기준 커밋: `13e78cdd4c6ba04379b877e63c6506998e991901`. 신규 아테나와 기존 자오보를 연결했다. 확률·간격·최소 층·보상·Tool Voucher·retry/부활 시스템은 그대로다.

## 최종 연결

- Rocket: `rocket-grunt ×2 → named-ariana → named-archer → named-giovanni → complete`.
- Skull/Aether: `skull-grunt ×2 → named-guzma → named-faba → named-lusamine → complete`.
- 플루메리 alias는 이번 캠페인에서 사용하지 않는다. 기존에 중단돼 있던 진행도도 초기화나 migration 없이 재개한다.

## 아테나

ID `named-ariana`, 세대 2, villain/officer, 최소 25층, tactical ceiling, ace Arbok, 기믹 없음. 기존 Named catalog와 reviewed source에 등록하고 exporter로 runtime을 생성했다. 선봉 규칙은 `preferredLead:[Arbok]` 하나뿐이다. 팀은 아래 3종 고정이다.

| 포켓몬 | 특성 | 도구 | 기술 |
|---|---|---|---|
| Arbok | Intimidate | Black Sludge | Gunk Shot / Crunch / Glare / Earthquake |
| Vileplume | Effect Spore | Leftovers | Giga Drain / Sludge Bomb / Sleep Powder / Moonblast |
| Honchkrow | Moxie | Life Orb | Brave Bird / Sucker Punch / Night Slash / Roost |

초상화는 기존 trainer importer의 `--only=ariana`로 가져와 출처를 등록했다. 기존 179개 reviewed/runtime 샘플 전체의 해시가 기준 커밋과 같음을 자동 테스트로 확인했다. 아폴로·비주기·구즈마·자오보·루자미네의 팀 해시도 개별 확인한다.

## 등장 분포

조직별 10,000런, 총 80,000런. 모든 전투 승리·Teleport 없는 정상 100층 진행을 가정한다. 실제 구현과 같은 eligibility/pity 함수를 사용하고 2~100층 진입 시점을 시뮬레이션한다. 공통 base 5 / miss +3pp / cap 35 / gap 3 / boss gap 5를 유지한다.

| 조직 | 단계별 평균 층 | 보스 p50/p75/p90 | 완료율 | 보스 미등장 | 평균 간격 |
|---|---|---|---:|---:|---:|
| rocket | grunt-1: 7.42, grunt-2: 15.83, officer: 30.7, executive: 50.35, boss: 80.38 | 80/82/85 | 99.98% | 0.02% | 18.24 |
| magma | grunt-1: 7.44, grunt-2: 15.82, executive: 50.42, boss: 80.34 | 80/82/85 | 99.96% | 0.04% | 24.3 |
| aqua | grunt-1: 7.38, grunt-2: 15.82, executive: 50.41, boss: 80.4 | 80/83/85 | 99.98% | 0.02% | 24.34 |
| galactic | grunt-1: 7.4, grunt-2: 15.76, officer: 30.7, executive: 50.43, boss: 80.29 | 80/82/85 | 99.97% | 0.03% | 18.22 |
| plasma | grunt-1: 7.39, grunt-2: 15.76, executive: 50.4, boss: 80.33 | 80/82/85 | 99.99% | 0.01% | 24.31 |
| flare | grunt-1: 7.4, grunt-2: 15.82, officer: 30.7, executive: 50.39, boss: 80.42 | 80/83/85 | 99.99% | 0.01% | 18.25 |
| skull | grunt-1: 7.37, grunt-2: 15.72, officer: 30.69, executive: 50.47, boss: 80.41 | 80/83/85 | 100% | 0% | 18.26 |
| macrocosmos | grunt-1: 7.37, grunt-2: 15.72, executive: 50.41, boss: 80.3 | 80/82/85 | 99.98% | 0.02% | 24.31 |

Rocket 99.98%, Skull/Aether 100%로 중단 문제가 해소됐다. 보스 p50은 80층이고 75~78층 비중은 약 33%다. 조직별 확률을 따로 조작하지 않았다.

## 전투 벤치마크

기존 simulate-hoenn-npcs의 네 팀·육성·장비 기준을 사용했다. 최소 등장 층, basic/chaos, seed 3개씩이며 실제 플레이어 승률이 아닌 독립 자동 전투 결과다.

| NPC | 층 | 플레이어 승리 | 오류 |
|---|---:|---:|---:|
| named-ariana | 25 | 18/24 | 0 |
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
| named-faba | 45 | 18/24 | 0 |
| named-lusamine | 75 | 8/24 | 0 |
| named-oleana | 45 | 13/24 | 0 |
| named-rose | 75 | 13/24 | 0 |

총 480전, 오류 0. 아테나는 25층에서 플레이어 18/24승(75%), 평균 5.8턴이었다. 기술·특성·아이템은 Showdown validator로 확인했다. 무료 승리/사실상 승리 불가에 해당하지 않아 Life Orb를 유지했다. 기존 다른 간부·보스의 팀을 재설계하지 않았다.

## 자동 검증

- 타입 검사 / 운영 빌드 / reviewed-runtime exporter 일치 검사 통과.
- 핵심 샘플·캠페인·교환권·카탈로그·일반모드 33개 통과. 신규 완성 검증 6개를 추가했다.
- Run Event·Chest·Merchant·Breeder·Teleport·Raid·Challenger·Rocket v1·Hidden Boss·Bag·장착·Retry·트레이너 장비 등 회귀 163개 통과.
- 새 NPC 한 행이 추가됐으므로 과거 checksum 검사에서 그 한 행만 제외하도록 historical projection을 갱신했다. 대신 기존 179개 전체 reviewed/runtime 행을 기준 커밋으로 고정하는 검사를 추가했다. 관련 preservation·팔데아 현재 검사 등 89개 통과.
- E2E 14개 통과: Rocket v1 6개(마지막 공격/기절 포함), Rocket/Skull 완주·교환권 8개(1280/390px × 기본/동작 줄이기, 4배속, reconnect).
- template 수 증가에 따른 검사 기대값을 180으로 갱신했고 관련 8개도 통과했다.
- 전체 단위 테스트 1,204개 중 1,201개 통과, 3개 실패. 남은 실패는 기준 커밋에서도 존재하던 tests/paldea-round2.test.ts의 Expert Belt / Stone Edge 기대값과 현재 빈 도구 / Toxic Spikes 데이터 불일치다. 이번 변경으로 인한 실패는 없으며, 다른 NPC 팀을 변경하지 않는 범위에 따라 유지했다.
- CSS 구조 검사와 최종 diff 공백 검사 통과.

## 재현

- `node scripts/export-normal-npc-runtime.mjs --check`
- `node node_modules/tsx/dist/cli.mjs scripts/simulate-villain-campaigns.ts`
- `node node_modules/tsx/dist/cli.mjs scripts/simulate-villain-battles.ts`
- `node node_modules/tsx/dist/cli.mjs --test tests/villain-tracks.test.ts tests/villain-campaign-completion.test.ts`
- `node --import tsx node_modules/@playwright/test/cli.js test e2e/villain-tracks.spec.ts e2e/villain-campaign.spec.ts`

[분포 원본](distribution.json) · [전투 원본/입력 해시](battles.json) · [현재 설계와 수동 QA](../../../docs/villain-campaign-tracks.md)

## 범위와 TODO

아테나 등록/팀/초상화, 캠페인의 두 sample ID와 짧은 7세대 결과 문구, 테스트·현재 문서·시뮬레이션 결과만 수정했다. 개발 singleton 버전만 갱신해 이미 실행 중인 서버도 새 데이터로 재생성한다. DB 버전 46과 저장 snapshot은 유지한다. 업적·영구 격파 기록·토큰은 이번에도 구현하지 않았다.
