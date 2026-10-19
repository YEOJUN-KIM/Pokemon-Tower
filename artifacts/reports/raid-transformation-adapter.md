# Raid Phase Transformation Adapter

기준 커밋: `07f627fa52f7fb3ff622ca278d158416bf953d79`. 신규 보스, 기존 보스/Phase 구성, HP 비율·배율, AI, 승률 밸런스, 상점·아이템·폼 데이터는 변경하지 않았다.

| Mechanic | Raid Phase Reuse | Persistent | Current Form Validation | Status |
|---|---|---|---|---|
| Form Change | native `setSpecies` / `formeChange` | 해당 Phase의 독립 슬롯에서 유지 | 현재 Phase 종·특성·기술 | 완료 |
| Mega | native `runMegaEvo` | 엔진 기본 영구 변신 | Mega 폼 기준 | 완료 |
| Primal | 일반 원시회귀와 같은 `formeChange` + Orb effect | 엔진 기본 영구 변신 | Primal 폼 기준 | 완료 |
| Terastallization | native `actions.terastallize` | 해당 Phase 동안 유지 | 현재 폼 + Tera type | 완료 |
| Stellar Terapagos | native Tera Shift 입장 후 실제 `terastallize` | Stellar/Tera 상태 유지 | Stellar 폼 + Teraform Zero + 전용기 | 완료 |
| Dynamax/Gigantamax | native Dynamax volatile, HP·Max Move 처리 | `persistent:true`로 3턴 자동 해제 방지 | G-Max 대상/기술 검증, 기본 종 learnset 재사용 | 완료 |
| Ultra Burst | 일반 Ultra와 같은 native `runMegaEvo` 경로 | 엔진 기본 영구 변신 | Ultra 폼·융합 전용기 기준 | 완료 |

## 데이터 사용법

기존 `RaidPhaseDefinition`에 transformation 종류, 선택적인 `sourceSpecies`, `teraType`, `persistent`를 확장했다. `species`는 도달할 Phase 폼이다. 기존 `none`과 `aura`도 지원한다.

```ts
const phases: RaidPhaseDefinition[] = [
  {species:'Snorlax',ability:'Immunity',moves:['Body Slam'],transformation:'form'},
  {species:'Snorlax-Gmax',ability:'Immunity',moves:['Body Slam'],transformation:'gigantamax',persistent:true},
];

const stellarPhase: RaidPhaseDefinition = {
  species:'Terapagos-Stellar',ability:'Teraform Zero',moves:['Tera Starstorm'],
  transformation:'stellar',
};

const ultraPhase: RaidPhaseDefinition = {
  species:'Necrozma-Ultra',ability:'Neuroforce',moves:['Sunsteel Strike'],
  transformation:'ultraBurst',sourceSpecies:'Necrozma-Dusk-Mane',
};
```

시작 종은 Dex의 `changesFrom`/기본 종에서 유도한다. `sourceSpecies`는 Dusk Mane와 Dawn Wings처럼 변신 전 융합체를 명시할 때 사용한다. Stellar 목표는 Tera type을 자동으로 Stellar로 설정한다. 일반 Tera는 `teraType`을 지정하거나 기존 세트 값을 사용한다. 폼만 Stellar/G-Max로 지정하고 실제 상태를 생략하는 조합은 거절한다.

신규 스냅샷은 `createRaidSnapshot`이 `transformationAdapter:1`을 자동 기록한다. 직접 만든 fixture도 이 버전을 지정해야 한다. 기존 저장 스냅샷과 리플레이는 버전 표식이 없어 기존 동작을 유지한다.

## Adapter와 재사용

- [raid-transformation.ts](../../src/battle/raid-transformation.ts): `raidPhaseSource`, `validateRaidPhase`, `prepareRaidPhase`, `applyRaidPhaseTransformation`.
- Mega/Ultra는 엔진의 일반 행동 함수 `runMegaEvo`를 재사용한다. 강제 Phase에서는 도구를 구매·장착하거나 버튼을 누를 필요가 없다. 호출에 필요한 도구 effect만 잠시 제공하고 기존 장비를 즉시 복구한다.
- Primal과 일반 폼은 일반 플레이와 같은 native `formeChange`를 사용한다. 별도 종족값·타입·특성 변신 공식을 만들지 않았다.
- Tera는 native `terastallize`를 사용한다. Terapagos는 입장 시 Tera Shift가 먼저 Terastal로 바꾼 뒤 실제 Tera 행동이 Stellar로 바꾼다.
- Dynamax는 native volatile을 사용해 HP 확대, Max/G-Max 기술, 피격 계산과 로그를 그대로 재사용한다. `persistent`는 해당 Pokémon의 턴 카운터에만 적용하며 공유 Dex/condition을 수정하지 않는다. Raid HP 설정이나 새로운 배율은 추가하지 않았다.
- [golisopod-mega.ts](../../src/battle/golisopod-mega.ts)의 기존 로컬 Dex 보정을 검증에도 재사용해 Tough Claws 불일치를 해소했다. 전역 Dex는 그대로다.

## Phase 수명과 제한

Phase마다 별도 슬롯을 사용하는 기존 구조를 유지했다. 다음 Phase는 HP·PP·상태·volatile이 독립적이고, 플레이어의 누적 상태는 유지한다. 2/3/4 Phase를 지원한다. 보스의 강제 변신은 플레이어 측 기믹 소비와 분리하며 보스의 수동 추가 변신 요청은 제공하지 않는다.

실제 결과 폼의 특성이 입장 전에 준비되므로 이전 종의 Intimidate 같은 특성이 추가로 발동하지 않는다. 입장 기반 Tera Shift는 native 입장 처리 후 연결한다. 동시 교체에서도 보스 Phase에 기존 설치물이 다시 적용되지 않도록 처리했다.

일반 배틀의 validator는 그대로 사용한다. Raid 보스의 검증 사본에만 현재 Phase 종·특성·기술을 전달하고, 강제 Phase와 무관한 일반 시작 도구/입장 조건만 생략한다. 기술 learnset, 특성, 스탯 및 나머지 검증은 유지한다. 저장된 기술 목록과 Phase 기술 목록도 일치해야 한다.

## 표시와 로그

native `detailschange`, `-mega`, `-primal`, `-burst`, `-terastallize`, Dynamax 로그를 기존 서버 View와 UI가 처리한다. 새 Phase 전환에는 `[raid-adapter]` 표식을 추가해 구형 Raid 전용 Mega 연출과 native 변신 연출이 중복되지 않게 했다. 표시 폼·타입·Tera/Dynamax 상태는 새 Phase에서 재동기화한다. 기존 로그는 구형 연출 경로를 보존한다.

## 변경 파일

| 파일 | 변경 |
|---|---|
| `src/battle/raid-transformation.ts` | 새 공통 Adapter와 Phase 검증 |
| `src/battle/raid.ts` | 입장/변신 연결, 상태 수명, native 로그 구분 |
| `src/battle/gimmicks.ts` | Phase 수와 무관한 플레이어 제한 설치, 강제 보스 경로 분리 |
| `src/battle/golisopod-mega.ts` | 기존 로컬 Dex 보정 함수 재사용 가능하게 추출 |
| `src/battle/run.ts` | 현재 Phase 검증, 4 Phase 지원, 신규/구형 실행 분기 |
| `src/data/raids.ts` | 타입만 확장; 기존 보스·경로·기술·버프 값 유지 |
| `src/server/raid-events.ts` | 신규 스냅샷에 Adapter 버전 기록 |
| `src/web/battle-presentation.ts` | 새 Phase의 native 연출 연결 |
| `tests/raid-transformation.test.ts` | Adapter·실전 검증·View·리플레이·격리 테스트 29건 |
| `tests/raid-phases.test.ts` | native KO 후 복구와 무관하게 공격 시점 Pressure를 검증 |
| `tests/fixtures/alola-preservation.json`, `alola-tuning-preservation.json` | 허용된 공용 엔진 변경의 해시 기준 갱신; NPC 행/AI 해시는 유지 |

## 남은 예외

- 설치된 Showdown Dex에 존재하는 종/폼만 지원한다. 이번에 새 폼이나 나머지 Z-A Mega 데이터를 추가하지 않았다.
- 기존 무버전 스냅샷은 리플레이 재현을 위해 자동 전환하지 않는다. 새 Raid 생성부터 Adapter를 사용한다.
- `persistent` 설정은 3턴 종료가 있는 Dynamax/Gigantamax에 적용한다. Mega/Primal/Ultra/Tera는 native 지속 상태를 사용한다.
- 실제 신규 Snorlax/Terapagos Raid는 등록하지 않았다. 해당 경로는 fixture로 검증했다.

## 검증 결과

| 검사 | 결과 |
|---|---|
| 전체 `tests/*.test.ts` | **1,239건 중 1,236 통과 / 3 실패** |
| Raid + 일반 Mega/Primal/Tera + Alola 보존 회귀 묶음 | **122/122 통과** |
| 신규 Adapter 테스트 | **29/29 통과**; 위 전체·회귀 묶음에 포함 |
| 추가 Golisopod-Mega / Zygarde-Mega 검증 | 실제 팀 검증·완료 전투·리플레이 모두 통과 |
| TypeScript `tsc --noEmit` | 통과 |
| 최신 Next 프로덕션 빌드 | 통과; Windows sandbox junction 권한 오류 후 동일 빌드를 승인된 외부 실행으로 검증 |
| CSS 구조 검사 | 통과; 3,578 bounded rules / 14 design tokens |
| `git diff --check` | 통과 |
| Workspace 구조 검사 | 기존 보고 스크립트 15개의 docs 출력 경로 경고. 해당 스크립트는 수정하지 않음 |

최종 원시 테스트 로그는 `.data/raid-adapter-final-tests.log`, 회귀 묶음은 `.data/raid-adapter-final-regression.log`에 있다. 요약: [검증 기록](raid-transformation-validation.json).

변경 전 기준 커밋을 별도 추출해 `tests/paldea-round2.test.ts`를 실행했으며 6건 중 3건이 실패했다. 기존 Paldea fixture/현 데이터 불일치이며, 이번에 해당 데이터·테스트를 수정하지 않았다.

실패 항목은 네 빌드 필드 보존, 조건부 packed-team 변형, Toxic Spikes 후보 검증이다. 최신 전체 실행의 실패 목록과 기준 커밋의 실패 목록이 일치한다.
