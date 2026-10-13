# NPC CSV 데이터 규약

CSV는 코드 활용·검증용이다. 사용자 검토는 `NORMAL_MODE_SAMPLES.md`와 `NPC_TEAM_SAMPLES.md`에서 한다. 일반 모드 JSON에서 추출한 `src/data/normal-npc-templates.json`은 새 배틀 생성에 연결됐다. 최고 단계 참고 데이터는 별도로 유지한다.

## 파일과 생성

- `normal-npc-summary.csv`: 일반 모드 328팀, 24열.
- `normal-npc-details.csv`: 일반 모드 984마리, 31열.
- `npc-team-summary.csv`: 최고 단계 참고 164팀, 24열.
- `npc-team-details.csv`: 최고 단계 참고 492마리, 31열.

원본은 각각 `normal-npc-samples.json`, `npc-team-samples.json`이다. `scripts/export-npc-review-csv.mjs`로 내보낸다. CSV만 직접 수정하지 않는다. UTF-8 BOM, CRLF, RFC 4180 인용 규칙을 사용한다. 가져올 때 BOM을 제거하고 CSV 파서를 사용한다.

일반 샘플을 다시 생성한 뒤에는 `node scripts/export-normal-npc-runtime.mjs`로 게임용 JSON도 갱신한다. 게임은 CSV나 검토 문서를 직접 읽지 않는다. 두 단계의 멤버·기술·도구·특성·성격을 고정하고, 실제 층의 육성 곡선을 상한으로 포인트를 역할별 배분한다.

## 키와 값

`schema_version=1`. 요약 기본키는 `sample_id`, 상세 기본키는 `(sample_id, slot)`이다. `sample_id`는 `npc_id:stage_id`이며 상세 행은 이 키로 요약과 연결한다. `slot`은 1~3이다. `npc_id`만으로 연결하면 두 단계가 섞인다.

`mode=normal`은 일반 모드 초안, `mode=reference`는 최고 단계 참고다. 참고 행은 `stage_id=reference-max`, `sample_tier=0`이다. 일반 모드는 `leaders-early`, `first-gate`, `leaders-late`, `final-gate`와 단계 1/2를 사용한다. 이름·기술·도구·특성·성격·타입은 저장 데이터와 Showdown에서 사용하는 영문 내부 이름이다. 한글 표시 문자열과 자유 메모는 넣지 않는다.

불리언은 정수 0/1, 수치는 정수, 없는 선택 문자열은 빈 값이다. `generation=0`은 세대 미지정, `legendary_min_floor=0`은 별도 전설 제한 없음이다. 포인트는 게임의 능력 포인트이며 Showdown의 일반 EV 수치로 해석하지 않는다.

## 적용 조건

`min_floor`/`max_floor`는 샘플 단계 선택 범위다. 관장 계열은 1~54/55~100, 보스 계열은 1~99/100이다. 실제 출현 층과는 별개다. `reference_floor`는 육성 기준을 추출한 대표 층이며 각 층의 고정 육성 수치를 뜻하지 않는다.

빌런 보스는75~100층에서 후반·최종 샘플을 사용한다. 빌런 보스의 첫 관문 행은 비교용이며 `min_floor=max_floor=0`으로 실제 선택 대상에서 제외한다. 간부의50/55층 구분은 기존 관장 계열을 따른다.

기믹은 `gimmick_enabled=1`과 `gimmick_min_floor` 조건을 모두 확인한다. 보스 첫 관문 템플릿을 50층 이전에 사용할 경우 기믹을 제거해야 한다. 전설은 `legendary_min_floor`를 별도로 확인한다. 참고 모드의 `gimmick_min_floor=0`은 일반 모드 해금 기준으로 사용하지 않는다.

`gimmick_type`은 `none`, `mega`, `z`, `dynamax`, `tera`, `primal`이다. `dynamax` 행의 후보는 거다이맥스를 사용하는 설정이다. 비활성 행의 `carrier_species`는 빈 값, `is_carrier=0`이다. `ace_species`와 기믹 담당은 다를 수 있다. `form_species`, `form_ability`, `form_types`는 변신이 있는 경우만 채우며 타입 구분자는 `/`이다.

## 자동 검증

내보내기는 키 중복, 팀당 서로 다른 3마리, 에이스·담당의 소속, 기술 4개, IV 범위, 스탯별 포인트 상한·총합, 비활성 거다이맥스, 열 수를 검사한다. 저장된 CSV를 다시 읽어 전체 셀을 원본과 비교한다. JSON의 기술 합법성 검증은 샘플 생성기가 수행한다.
