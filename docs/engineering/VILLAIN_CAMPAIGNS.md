# 빌런 캠페인 연계 트랙 — 2026-10-19

현재 신규 런은 일반 Run Event와 빌런 캠페인을 독립 판정한다. 일반 이벤트 확률 20%와 쿨다운 2회는 유지한다. 과거 로켓단 v1 캠페인의 저장 상태·이미 생성된 전투는 그대로 재개한다. [이전 구현 문서](../../artifacts/reports/changes/rocket-campaign-implementation.md)는 v1 호환 동작의 기록이다.

## 처리 순서와 저장

일반 층 클리어/영입 완료 → 일반 이벤트 → 결과 확인 또는 지나가기 → 빌런 판정 → 등장 연출·메시지 확인 → 전투 → 전용 보상 확인 → 다음 층 준비.

일반 이벤트가 없으면 바로 빌런을 판정한다. 상자 보상, Raid 영입, Challenger 보상 선택 등이 남아 있으면 빌런을 먼저 열지 않는다. `one_pending_run_event` 제약은 유지하며, 두 이벤트가 같은 클리어에 발생할 수 있다. 특수 전투 승리는 추가 판정을 만들지 않는다. 챔피언의 확정 히든보스는 기존 순서를 먼저 마친 다음 진행한다. 100층 최종 클리어 뒤에는 새 이벤트를 생성하지 않는다.

- `run_villain_tracks`: run별 조직, `stage_index`, `grunt_wins`, `pity`, `last_event_order`, `last_checked_order`, `completed`.
- `run_event_followups`: 일반 이벤트 뒤에 남은 판정. `run_id + encounter_order`별 `origin_floor`, `checked`를 저장한다.
- 기존 `run_events` / `villain_event_encounters`: 대기·전투·보상, 팀·상대·AI·seed·보상·도착 층·다음 단계 index의 snapshot과 지급 receipt.
- `tool_voucher_draws`: 교환권별 사용 회차, 후보 4개, 선택 도구·보관/장착·대상.

DB 45 → 46은 위 세 테이블 추가이다. 기존 전투·행동·보상 snapshot을 수정하지 않는다. 45보다 오래된 DB도 기존 순서의 migration을 거친다. 기존 v1 캠페인이 시작됐거나 encounter 기록이 있으면 해당 캠페인을 v2로 재해석하지 않는다. 새 캠페인이 없는 기존 이벤트 런은 다음 일반 클리어에서 초기화한다.

조직은 첫 세대 테마의 기존 조직 목록에서 한 번 선택해 저장하며, 호연은 마그마/아쿠아 중 하나, 알로라는 스컬→에테르 연계 하나다. 50층 이후 테마가 바뀌어도 조직은 바뀌지 않는다. 팔데아 시작 런에는 빌런 캠페인을 만들지 않는다. 스타단·N·별도 에테르 캠페인은 추가하지 않는다.

층은 현재 위치와 난이도다. 간격과 pity는 `cleared_count` / `encounter_order`를 사용한다. Teleport 후에는 새 위치에서 다음 단계의 최소 층을 확인하지만 단계·단서·pity를 되돌리지 않는다. Teleport 일반 이벤트 뒤의 판정은 도착 확인을 마친 다음 실시한다. 1층 도착도 지원한다.

## 조직별 실제 연결

각 행은 앞에 해당 조직의 기존 `*-grunt`를 **두 번** 사용한다. 역할은 캠페인 진행 등급이며 원작의 직급 재분류가 아니다.

| 조직 | officer (25+) | executive (45+) | boss (75+) |
|---|---|---|---|
| rocket | `named-ariana` 아테나 | `named-archer` 아폴로 | `named-giovanni` 비주기 |
| magma | 없음 | `magma-executive-tabitha` 호걸 | `named-maxie` 마적 |
| aqua | 없음 | `aqua-executive-shelly` 이연 | `named-archie` 아강 |
| galactic | `galactic-executive-mars` 마스 | `galactic-executive-jupiter` 주피터 | `named-cyrus` 태홍 |
| plasma | 없음 | `plasma-executive-colress` 아크로마 | `named-ghetsis` 게치스 |
| flare | `flare-executive-aliana` 아케비 | `flare-executive-xerosic` 크세로시키 | `named-lysandre` 플라드리 |
| skull | `named-guzma` 구즈마 | `named-faba` 자오보 | `named-lusamine` 루자미네 |
| macrocosmos | 없음 | `named-oleana` 올리브 | `named-rose` 로즈 |

`organizationGrunt`, trainer catalog, `villainLeaders`, reviewed NPC template를 재사용한다. 로켓단은 `rocket-grunt ×2 → named-ariana → named-archer → named-giovanni`, 스컬/에테르는 `skull-grunt ×2 → named-guzma → named-faba → named-lusamine`으로 완주한다. 구즈마 격파로 재단 내부의 기록을 확보하고, 자오보 격파로 루자미네의 위치를 확인한다. 기존 플루메리 alias는 이번 캠페인에서 사용하지 않는다.

### 아테나 신규 샘플

아테나만 새로 추가했다. 성도 계열의 기존 `named-*` 카탈로그 명명과 공통 reviewed source `scripts/data/npc/normal-npc-samples.json`을 사용하고, `scripts/export-normal-npc-runtime.mjs`로 runtime을 생성한다. `named-ariana`, 세대 2, villain/officer, 최소 25층, AI ceiling tactical, ace Arbok, 기믹 없음이다. 고정 3종이며 `selectionRules: {preferredLead:['Arbok']}`만 적용한다. Ace를 마지막에 두는 규칙이나 추가 required 조건은 없다.

| 포켓몬 | 특성 | 도구 | 기술 |
|---|---|---|---|
| Arbok | Intimidate | Black Sludge | Gunk Shot / Crunch / Glare / Earthquake |
| Vileplume | Effect Spore | Leftovers | Giga Drain / Sludge Bomb / Sleep Powder / Moonblast |
| Honchkrow | Moxie | Life Orb | Brave Bird / Sucker Punch / Night Slash / Roost |

기존 importer에 `--only=ariana` 선택 가져오기를 추가해 초상화와 출처를 등록했다. 기존 아폴로·비주기·구즈마·자오보·루자미네의 reviewed 팀은 기준 커밋 `13e78cdd`와 해시가 같다. 중단돼 있던 로켓단 stage_index=2, 스컬단 stage_index=3 저장도 그대로 이어진다. schema/확률/보상/retry 변경이나 진행도 초기화는 없다.

## 확률과 eligibility

설정: [villain-tracks.ts](../../src/data/villain-tracks.ts). 일반 이벤트 registry의 신규 `villain-campaign` weight는 0이다. 독립 판정 성공 시 기존 Run Event 행을 생성한다. 신규 캠페인이 있는 런에서 과거 `rocket-*`는 일반 weighted 후보에서 제외한다. 과거 explicit fixture/v1 런은 기존 정의를 사용한다.

- 조무래기 최소 1, officer 25, executive 45, boss 75. 보스 75는 기존 `normalNpcFloorRules.villainBoss`를 공유한다.
- 다음 미완료 단계 하나만 eligible. 완료 상태·최소 층 미달·간격 미달이면 추첨하지 않는다.
- base **5%**, 실패마다 **+3%p**, cap **35%**.
- 일반 단계 사이 **일반 클리어 3회**, 다음 단계가 보스면 **5회**.
- eligible 판정 실패만 pity를 증가시킨다. 이벤트가 생성되면 0으로 초기화한다. 새로고침·중복 POST·특수 전투·간격/최소 층 대기는 실패 횟수로 세지 않는다.
- 고정 층 보장은 없다. 완료 단계와 이전 NPC는 다시 등장하지 않는다.

## 전투·재접속·재도전

기존 `snapshotTrainerEventBattle`, `TowerStore.createBattle`, `VillainCampaigns.win`, Tower retry/revival 흐름을 재사용한다. 새 battle engine이나 빌런 전용 부활 규칙은 없다. 조우 메시지와 트레이너 등장 메시지를 결정키/클릭으로 확인한 뒤 전투를 시작한다. 이벤트 선택 단계에는 지나가기 버튼이 없다. 배틀 중 `도망치다!`는 선택할 수 있지만 안내 메시지만 표시하며 턴·서버 상태를 바꾸지 않는다. 기존 ! 표현과 reduced-motion 처리를 사용한다. 조무래기 기습은 현재 맵 배경을 유지한다.

이벤트 생성 시 상대·팀·seed·AI 버전·보상·진행 결과를 저장한다. 패배에는 보상/단계 증가가 없고 기존 재도전에서 같은 snapshot으로 싸운다. 승리 처리와 지급 receipt·단계 증가는 하나의 기존 Tower transaction으로 커밋한다. 실패 시 전부 rollback하며, 중복 승리/지급을 허용하지 않는다. 일반 층 증가·영입·일반 보상을 발생시키지 않는다. 마지막 공격·기절 재생 후 보상이 나오는 기존 동작도 유지한다.

## 보상과 공용 도구 교환권

임시 설정은 `villainRewardSettings`, 보상 선택은 [villain-track-rewards.ts](../../src/server/villain-track-rewards.ts).

| 등급 | 코인 | 추가 보상 |
|---|---:|---|
| grunt | 200 | 없음 |
| officer | 500 | 50% 기존 풀 영양제 2개(각각 랜덤), 50% 에픽 교환권 1장; 자동 지급 |
| executive | 900 | 룰·현재 roster·폼·기술에 맞는 미보유 핵심 기믹. 이미 쓸 수 있는 핵심 기믹이 있거나 유효 후보가 없으면 에픽 교환권 |
| boss | 2,000 | 영구 지갑의 슈퍼레어 알 티켓 1장 |

메가는 실제 사용할 수 있는 메가스톤, Z는 배운 기술에 맞는 크리스탈, 다이맥스·테라는 기존 트레이너 장비를 지급한다. 이 판단도 이벤트 생성 시 고정한다. 위 금액·보상 분기·fallback 수치는 후속 전체 밸런스 조정 대상이다.

공용 효과 `tool-voucher {rarity,choices:4,amount}`를 기존 reward/inventory에 추가했다. 공용 배낭 → 사용 → 해당 `itemShopRule` rarity의 서로 다른 4개 → 하나 선택 → 배낭 또는 바로 장착이다. 이미 보유한 도구와 현재 파티가 못 쓰는 도구도 후보에 포함한다. 장착 시에는 기존 룰/폼/종/소지 제한을 검증하고 이전 장착품을 배낭에 돌려준다. 중복 보유는 기존 Run 단일 소유 규칙을 따른다. 이미 가진 도구를 골라도 추가 복제하지 않는다.

후보는 교환권을 **처음 열 때** 저장한다. 창을 취소하거나 재접속해도 같은 회차의 후보를 보여준다. 선택 완료 전에는 수량을 차감하지 않는다. 선택·장착·차감·use receipt는 하나의 transaction이다. rarity 매개변수는 재사용 가능하며 현재 콘텐츠 지급은 epic이다. 보상별 팝업 대신 공용 `ToolVoucherDialog` + 기존 `ItemAcquisitionDialog`를 사용한다.

Elite는 기존 직접 에픽 보상, Master는 성장/알/장비 선택을 유지했다. 후보 수 증가와 소유 도구 허용에 따른 가치 변화가 있으므로 이번 작업에서 일괄 교체하지 않았다. 다른 보상의 effects에 `tool-voucher`를 넣으면 같은 배낭/저장/UI를 재사용할 수 있다.

## 시뮬레이션과 검증

- 등장 분포: `node node_modules/tsx/dist/cli.mjs scripts/simulate-villain-campaigns.ts`.
- 전투: `node node_modules/tsx/dist/cli.mjs scripts/simulate-villain-battles.ts`.
- 결과: [분포 JSON](../../artifacts/reports/villain-campaigns/distribution.json), [480전 JSON](../../artifacts/reports/villain-campaigns/battles.json), [검증 보고서](../../artifacts/reports/villain-campaigns/README.md).

8조직 × 10,000런. Teleport 없는 정상 진행, 모든 전투 승리 가정이며 구현과 같은 eligibility·pity 함수를 사용한다. 8조직 모두 완료 가능하다. 공통 5/+3/35%, 간격 3/보스 5를 유지했다.

| 조직 | grunt1 / grunt2 평균 | officer 평균 | executive 평균 | boss 평균 | boss p50/p75/p90 | 완료율 | 보스 미등장 |
|---|---|---:|---:|---:|---|---:|---:|
| Rocket | 7.42 / 15.83 | Ariana 30.70 | Archer 50.35 | Giovanni 80.38 | 80/82/85 | 99.98% | 0.02% |
| Skull/Aether | 7.37 / 15.72 | Guzma 30.69 | Faba 50.47 | Lusamine 80.41 | 80/83/85 | 100% | 0% |

전투는 기존 지역별 시뮬레이션의 네 roster·육성·장비 벤치마크를 재사용해 각 최소 층에서 basic/chaos, seed 3개로 480전 실행했다. 오류 0. 신규 아테나는 25층에서 플레이어 18/24승(75%), 평균 5.8턴이었다. 기술·특성·아이템 legality 검증도 통과해 추천한 Life Orb 및 기술을 유지했다. 자동 플레이의 독립 배틀 결과이며 실제 유저 승률이나 소모품·연속 런 완주율을 의미하지 않는다. 구즈마나 다른 보스의 기존 밸런스는 이번 작업에서 변경하지 않았다.

자동 테스트는 두 캠페인의 정확한 NPC ID/순서/완료 후 제거, 최소 층과 간격, 기존 중단 저장 재개, 아테나의 고정 3종·선봉·기믹 없음·legality, 기준 커밋 기존 5 NPC 팀 해시, 공통 보상 분기와 기존 exact-once/reconnect/retry 회귀를 검증한다. 화면 테스트는 각 캠페인에 대해 desktop 1280 / mobile 390, motion 기본/줄이기, 4배속, 메시지 확인 후 전투·보상·새로고침·공용 교환권 후보/아이콘/보관을 확인한다.

## 수동 QA

1. 이벤트가 켜진 새 런에서 시작한다. 운영 확률을 바꾸지 말고 자동 테스트의 `trackFixture` / `trackEncounter`로 특정 조직·단계를 재현할 수 있다.
2. 상자 등을 확인/지나간 뒤 빌런의 `!` 및 메시지 확인 후 전투를 확인한다. 보상 중에는 다음 이벤트가 겹치지 않아야 한다.
3. 전투 직전/중/보상에서 새로고침하고 상대·팀과 보상이 유지되는지 확인한다. 패배 뒤 기존 부활/재도전 사용 시도도 확인한다.
4. 교환권을 열어 4개를 확인하고 새로고침 후 다시 열어 같은 후보인지 확인한다. 하나는 보관, 다른 교환권은 기존 장착품이 있는 포켓몬에게 바로 장착한다.
5. Teleport로 낮은 층에 돌아가도 단계가 유지되고, 강한 다음 단계는 해당 최소 층까지 대기하는지 확인한다.

추가 업적·영구 토큰은 현재 구현이나 확정된 후속 목표가 아니다. 이후 방향은 [ROADMAP](../current/ROADMAP.md)을 따른다.
