# Raid 승리 영입 Species/Form 정책

2026-10-19. 기준 커밋 `ef3bfebe`. Raid 20종 중 Volcarona와 Kyurem만 저장된 P2 결과물을 영입하며 나머지는 기존 기본 종을 유지한다.

| Raid | Reward Mode | Reward Phase | Actual Reward |
|---|---|---:|---|
| Volcarona | phaseSpecies | 2 | Slither Wing / Iron Moth |
| Kyurem | phaseSpecies | 2 | Kyurem-Black / Kyurem-White |
| Others | baseSpecies | - | Base Species |

## 타입과 결정 경로

`RaidRecruitmentPolicy`는 `{mode:'baseSpecies'}` 또는 `{mode:'phaseSpecies',phase:RaidPhaseNumber}`다. `RaidPhaseNumber`는 현재 지원하는 사람 기준 번호 `1 | 2 | 3 | 4`이며 `raidPhaseByNumber()`만 배열 인덱스로 변환한다. 잘못된 번호와 누락된 Phase는 검증 오류를 낸다.

`RaidBossDefinition.recruitment`와 `RaidSnapshot.recruitment`를 선택 필드로 추가했다. Volcarona/Kyurem 데이터에만 `{mode:'phaseSpecies',phase:2}`를 선언했다. 새 스냅샷은 기본 정책도 명시적으로 저장한다. SQL 스키마와 스냅샷 버전 변경은 없다.

- `raidRecruitmentPolicy()`: 저장된 정책을 우선한다. 정책 필드가 없는 구형 스냅샷은 보스 등록 데이터의 정책을 읽고, 미선언 보스는 기본 종을 사용한다.
- `resolveRaidRecruitSpecies()`: 정책에 따라 `snapshot.species` 또는 `raidPhaseByNumber(snapshot, phase).species`를 결정하고 수집 가능한 Species/Form인지 검증한다.
- `packedRaidRecruitment()`: 기존 보상 팀이 목표와 같으면 원본을 그대로 사용한다. Species/Form이 바뀌는 경우 기존 `defaultProfile()` 및 `trainedSet()`으로 정상적인 플레이어 세트를 생성한다.
- `raidRecruitmentTeam()`: 영입 저장 경로에 맞춰 `collectionSpecies()`와 `selectedForm()`으로 기본 수집 키와 실제 폼을 정규화한다.

랜덤 결과는 `raid_encounters.snapshot_json.phases[phase - 1].species`에서 읽는다. 이미 생성 시 확정한 `routeId`와 Phase 목록을 재사용하며 승리·재접속·재도전·리플레이에서 난수를 추가 소비하지 않는다. 구형 스냅샷도 보상 조회 과정에서 수정하지 않으므로 기존 전투와 리플레이 입력을 유지한다.

## 영입 데이터와 표시

Slither Wing/Iron Moth는 별도 종으로 저장한다. Black/White Kyurem은 기존 가족 폼 구조에 맞춰 수집 키 `Kyurem`과 `profile.forme`를 저장한다. `pokemon_form_training`에도 해당 폼의 기술·특성·테라 타입을 저장하므로 기존 육성 기록이 있거나 재시작해도 폼 설정이 사라지지 않는다. 기술 수집은 해당 폼의 기존 learnset으로 검증한다.

변경된 종/폼의 기술·특성·테라 타입은 기존 일반 플레이 기본값을 사용한다. 보스의 전투용 기술·강화 특성·장비·EV를 복사하지 않는다. Raid의 기존 IV·성격·이로치 정책은 유지하고 성별은 대상 종에 맞춰 정규화한다. 기존 보유 개체의 높은 영구 IV·육성 EV·이로치 유지, 파티 교체와 도감만 등록하는 동작도 기존 규칙을 따른다.

후보 응답의 선택적 `candidateDetails.forme`로 실제 Kyurem 폼의 이름·이미지·타입·종족값을 전달한다. 후보 선택, 상세 정보, 교체 안내, 확인창, 영입 연출에 적용한다. 영입 요청의 식별자는 기존 수집 키를 사용한다.

## 검증과 fallback

Phase 누락, 잘못된 Phase 번호, 미지원 Species/Form, 잘못된 정책은 개발 환경에서 보스 ID와 원인을 담은 오류를 낸다. 운영 환경은 `[raid-recruitment]` 오류 로그를 남기고 기본 `snapshot.species`로 fallback한다. 기본 종도 유효하지 않으면 영입을 중단한다. 정상 20종 경로에서는 fallback이 발생하지 않는다.

## 변경 파일

| 파일 | 변경 내용 |
|---|---|
| `src/data/raids.ts` | 보상 정책과 사람 기준 Phase 타입, 스냅샷 필드 |
| `src/data/raid-bosses.ts` | 두 보스만 P2 보상 선언 |
| `src/server/raid-recruitment.ts` | 정책 해석·검증·fallback·일반 영입 세트·폼 정규화 |
| `src/server/raid-events.ts` | 정책 및 결정된 보상 팀 저장, 영입 팀 조회 |
| `src/server/tower-store.ts` | Raid 후보 조회·폼 저장·폼별 기술 수집 연결 |
| `src/shared/contracts.ts` | 선택적 후보 폼 메타데이터 |
| `src/web/tower-controls.tsx` | 후보·확인·교체 안내의 실제 보상 폼 표시 |
| `src/web/recruit-candidate-details.tsx` | 실제 보상 폼의 상세 정보 |
| `src/web/battle-game.tsx` | 실제 보상 폼의 영입 연출 |
| `tests/raid-recruitment.test.ts` | 네 분기·실전·재생·재도전·재시작·후속 전투·기존 육성·fallback 검사 |
| `e2e/raid-recruitment.spec.ts` | Chrome에서 네 보상 분기 표시와 실제 영입 검사 |
| `artifacts/reports/changes/raid-recruitment-policy.md` | 완료 보고 |

## 테스트 결과

- Raid 집중 회귀: **78/78 통과**. 새 테스트 12건 및 기존 Raid 이벤트·20종 명단 테스트 66건.
- 네 보상 분기 모두 패배 후 재도전, 디스크 재열기, 실제 전투 P2 등장, 승리, 리플레이, 영입 후 일반 전투, 다시 새 게임까지 동일한 Species/Form을 확인했다. 실제 전투 검증은 기존 테스트용 플레이어 강화 프로필을 사용하며 보스 데이터는 그대로다.
- 나머지 18종의 모든 경로는 기본 종을 지급하고 저장된 기존 보상 팀을 그대로 유지한다. Metagross/Groudon/Rayquaza/Necrozma/Terapagos도 포함한다.
- 구형 스냅샷의 네 분기, Phase/Species 오류와 운영 fallback, 기존 Kyurem 폼별 육성 설정 덮어쓰기, 도감만 등록하는 경로를 검증했다.
- Chrome E2E: **11/11 통과**. 새 네 보상 분기와 기존 7개 Raid 영입·보상·건너뛰기 흐름. Kyurem은 모바일 너비 390px에서 검증했다.
- 전체 Node 테스트: **1304건 중 1301 통과, 3 실패**. 기존 `tests/paldea-round2.test.ts`의 빌드 필드 보존·조건부 변형·Toxic Spikes fixture 불일치다. 기준 커밋의 기존 [Raid 확장 보고서](../raid-roster-expansion.md)에도 같은 3건이 기록되어 있으며 관련 데이터·테스트·변형 스크립트를 이번 작업에서 수정하지 않았다.
- TypeScript, 프로덕션 빌드, CSS 구조 검사, `git diff --check` 통과.
- Workspace 검사는 기존 보고 스크립트 15개의 `docs` 출력 경로 경고가 남아 있다.
- 기준 커밋의 20종 정의를 별도 로드해 `recruitment` 필드만 제외한 구조를 비교했으며 완전히 동일했다. HP·기술·특성·페이즈·변신·등장 가중치·층수는 유지된다. 전투 엔진·AI·상점 코드는 변경하지 않았다.

원시 로그: `.data/raid-recruitment-full.log`, `.data/raid-recruitment-final.log`. 브라우저 검증은 Playwright Chrome 프로젝트의 `e2e/raid-recruitment.spec.ts e2e/raid-events.spec.ts`로 실행했다.
