# 실행 스크립트 안내

2026-10-11 기준. 저장소 루트에서 실행한다. `package.json`의 dev/test/typecheck/build는 게임 개발 명령이고, 아래 실험 runner는 별도로 실행해야 한다. 실험 결과의 현재 상태는 [EXPERIMENTS](../docs/experiments/README.md)를 따른다.

## 최근 실험

| runner | 범위 | 입력·정책 |
|---|---|---|
| `run-room-sample.mjs <새 숫자 ID>` | 동탁군 기술 2×2, 360등반 | 원본 reliable-samples-20261010, 고정 18코스, 상대 v8 |
| `run-opponent-learning.mjs <새 숫자 ID>` | 적 v7/v8, 3,240등반 | 같은 원본 18팀·18코스, 5개 룰 |
| `run-sample-holdout.mjs` | 샘플 수정의 미사용 코스 검증 | 실행 인자·출력 조건은 해당 runner와 [검증 문서](../docs/experiments/samples/SAMPLE_HOLDOUT_VALIDATION.md) 확인 |

예: `node scripts/run-room-sample.mjs 20261012`. 같은 ID가 있으면 거절한다. 기존 원본 실험을 재현하는 runner가 자동으로 새 수정 샘플을 채택하지는 않는다.

다음 실험의 후보 입력은 `artifacts/reliable-samples-20261011-room-corrected-cases.json`이다. 새 runner에서 입력·코스·정책을 명시해 이전 조건과 비교한다. `BALANCE_CASES`만 바꾸어도 기존 고정 runner가 그 값을 다시 덮어쓸 수 있으므로 runner 코드를 먼저 확인한다.

`simulate-*.ts`는 각 runner의 하위 실행기다. 환경 변수를 생략하면 과거 기본 정책/층수로 실행될 수 있다. 어떤 실행기는 결과 파일을 덮어쓰므로 직접 실행 전 출력 경로를 확인한다. `audit-*.ts`도 결과 존재/소스 해시 조건이 있으므로 읽기 전용이라고 가정하지 않는다.

## 유지보수와 자료 가져오기

- `node scripts/index-artifacts.mjs`: 원자료를 옮기지 않고 파일 목록·용량·manifest 참조를 갱신.
- `pnpm data:import`, `pnpm battle:audit`, `pnpm sprites:audit`: 현재 데이터 가져오기와 검사. 가져오기는 데이터를 변경한다.
- `import-*.mjs/ts`: 외부 자산·배치 수집. 개별 출처와 출력 경로를 확인한다.
- `prepare-*.ts`: 과거/후속 실험 입력 생성. 이미 고정된 입력을 재생성하여 덮어쓰지 않는다.
- `run-*` → `simulate-*` → `audit-*`/`write-*-report`: 실험 실행과 검증·보고서 흐름. 과거 버전은 비교 근거로 유지한다.

`scripts/lib`와 실험 코드 중 일부는 manifest에 해시로 고정되어 있다. 공통 코드를 바꾸면 과거 감사가 실패할 수 있으므로 의도한 변경은 새 실험 버전과 manifest로 기록한다. [파일 관리 원칙](../docs/engineering/MAINTENANCE.md)을 참고한다.

## 문서 이동 후 과거 보고서 생성기

문서 분류 이후 과거 `write-*-report.mjs`는 원래 `docs/*.md` 출력 경로를 유지합니다. 이 스크립트들은 소스 해시로 고정된 실험 이력이므로 이번 정리에서 수정하지 않았습니다. 다시 실행하면 루트에 과거 보고서를 재생성하고 현재 요약에 옛 기록을 추가할 수 있습니다. 새 보고서는 새 실행기로 작성하고 `docs/navigation.json`의 이동 경로를 사용하세요. STATUS/SESSION_HANDOFF와 자산 출처 JSON, 생성된 세대 테마 링크 안내는 기존 경로를 유지합니다.
