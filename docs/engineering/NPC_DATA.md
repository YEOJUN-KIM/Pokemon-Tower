# NPC 데이터와 생성 규약

기준: 2026-10-20. runtime JSON을 직접 편집하지 않는다. 현재 검토 입력은 **180행·911마리 후보**이며 **156행은 allFloors 단일 후보 빌드**, 나머지 24행은 단계별 입력이다. 고정 3마리·두 단계라는 가정을 전체 입력에 적용하지 않는다.

## 실제 source of truth

```text
scripts/data/npc/normal-npc-samples.json (사람이 검토·수정하는 현재 입력)
    → node scripts/export-normal-npc-runtime.mjs
    → src/data/normal-npc-templates.json (생성물, 직접 수정 금지)
    → src/server/npc-templates.ts
    → src/server/opponent-team.ts (실제 층·합법성·3마리 선택·기믹·육성)
    → 배틀 팀 snapshot 저장
```

allFloors 입력은 같은 후보 빌드를 층 전체에서 재사용하며, select/required·selectionRules가 실제 3마리 선출을 제어한다. 후보 수와 필수 멤버는 입력마다 다르다. 단계별 입력은 stage로 선택한다. 캐노니컬 ID/별칭은 data/npc-review-presets.ts에서 연결한다. 과거 [6종 파일럿](../../artifacts/reports/npc/named-trainer-sample-pilot.md)은 도입 당시 기록이며 현재 전체 후보 목록이 아니다.

npc-team-samples.json은 별도의 최고 단계 참고 입력이다. 현재 검토 입력을 재현하지 못하는 옛 단계별 생성기는 삭제했다. 일상적인 수정은 normal-npc-samples.json → runtime export → --check 순서로 진행한다. 지역별 build 도구는 해당 지역을 수정하는 전용 도구이므로 쓰기 범위와 기존 입력 보존 검사를 먼저 확인한다.

## 그 외 NPC·AI 설정

| 대상 | 수정 위치 |
|---|---|
| 일반/도전자 클래스·컨셉·Sample | `src/data/npc-samples.ts` |
| Normal/Elite/Master 확률·육성·도구 슬롯 | `src/data/npc-ranks.ts` |
| 공통 NPC 역할별 팀 생성 | `src/server/npc-encounters.ts`, `npc-training.ts`, `npc-builds.ts` |
| 네임드 표시명·역할·초상화 | `src/data/trainer-catalog.ts`·지역별 trainer 데이터 |
| stage 경계·기믹 시작 | `src/data/normal-mode-stages.ts`의 normalNpcFloorRules / normalNpcStage / normalNpcGimmicksEnabled |
| stage 리뷰 범위 | 같은 모듈의 normalNpcStageRange; CSV도 재사용 |
| 개별 전설 최소 층 | 입력 행의 legendaryMinFloor; 일반 풀은 `data/tower-progression.ts`의 legendary/mythical 허용 조건도 검사 |
| 빌런 보스 일반 단계 기준 | normalNpcFloorRules.villainBoss; `VILLAIN_BOSS_MIN_FLOOR`는 같은 값을 참조 |
| AI tier/전술/상한 | `src/data/npc-ai.ts`, `src/battle/npc-policy.ts` |

50층 첫 챔피언 기믹, 55층 후반 관장/간부 기믹, 75층 단계별 빌런 보스, 100층 최종 stage를 유지한다. 단일 빌드는 allFloors로 단계별 행 선택을 생략하지만, 실제 기믹 개방과 층별 육성 제한은 유지한다. 이벤트 캠페인의 등장 조건과 일반 NPC stage 기준은 서로 다른 규칙이다.

새 팀은 발생 시 팀·폼·기믹·IV/EV·시드·AI tier/전술을 저장한다. 입력 변경은 기존 배틀·도전자·캠페인의 snapshot을 재작성하지 않는다. AI 정책 버전과 NPC encounter snapshot 버전도 구분한다.

## 갱신·검증 명령

프로젝트 루트에서 실행한다.

```sh
node scripts/export-normal-npc-runtime.mjs
node scripts/export-normal-npc-runtime.mjs --check
node scripts/export-npc-review-csv.mjs normal-npc-samples.json normal-npc
node scripts/export-npc-review-csv.mjs
pnpm test
pnpm typecheck
```

export는 중복 ID/단계, 후보 수·중복 멤버, 에이스/기믹 담당/필수 멤버, 기술 수·IV·능력 포인트를 검사한다. `--check`는 쓰지 않고 원본 projection과 runtime을 비교한다. 같은 입력을 다시 export하면 동일한 JSON을 생성한다.

샘플을 추가할 때 기존 형식의 고정 3마리 또는 단계형/단일형 select 후보 행을 원본에 정의하고, 트레이너 ID/별칭·합법 기술·폼·기믹 담당·에이스를 맞춘다. export 후 `tests/npc-templates.test.ts`, `named-pilot.test.ts`, `normal-mode-stages.test.ts`, `maintenance-settings.test.ts` 및 관련 실제 전투 검사를 실행한다. 단순 입력 누락/참조 검사와 실제 Showdown 합법성·변신·복구 검사는 서로 대체하지 않는다.

## 리뷰 CSV (게임 입력 아님)

출력은 `artifacts/reports/npc/`다. summary는 **schema_version=2, 28열**, details는 **schema_version=2, 31열**이다. summary에 candidate_count와 species_4~6을 추가해 단계형과 단일형 후보 빌드 전체를 표현한다. sample_id는 단계형 `npc_id:stage`, 단일형 `npc_id:all`, 최고 단계 참고 `npc_id:reference-max`다. details 기본키는 (sample_id,slot)이며 후보 slot은 최대 6이다.

현재 normal CSV는 180행/911행, reference CSV는 164행/492행이다. UTF-8 BOM·CRLF·RFC 4180 인용을 사용하며 저장된 CSV를 다시 읽어 전체 셀을 원본과 대조한다. 포인트는 게임의 능력 포인트이며 Showdown 일반 EV와 혼동하지 않는다. CSV만 고치거나 리뷰 artifacts를 게임 입력으로 사용하지 않는다.
