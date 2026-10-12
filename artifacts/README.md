# 결과와 원자료

2026-10-12 Git 추적 정리. 최신 자료는 아래 표에서 찾는다. 모든 자료는 자동 정책의 실험 결과이며 사람 승률과 다르다.

Git에는 팀 샘플·고정 코스·manifest·실험 요약·검증 보고서와 현재 문서에서 직접 링크한 캡처를 유지한다. 로그·경기/턴 JSONL·중간 PNG/GIF·미리보기 WAV 920개는 추적에서 제외하고 로컬 원본을 보존했다. 기존 추적 파일 중 408개를 유지한다. 게임 실행 자산은 `public/`에, 최신 문서용 화면은 `docs/images/`에 있다.

| 목적 | 읽을 자료 |
|---|---|
| 최신 트릭룸 샘플 수정 비교 | [room-sample 보고서](room-sample-20261011-report.md) |
| 다음 실험의 시작 샘플 후보 | [수정된 18팀](reliable-samples-20261011-room-corrected-cases.json), [선택 근거](room-sample-20261011-selection.json) |
| 실제 적 AI v7/v8 난이도 비교 | [opponent-learning 보고서](opponent-learning-20261011-report.md) |
| 조건 실패의 넓은 사후 집계 | [broader-failures](room-sample-20261011-broader-failures.json) |
| 전체 파일·크기·manifest 목록 | [색인](index.md), [기계 판독용 목록](index.json) |
| 시뮬레이션 사용법 | [스크립트 안내](../scripts/README.md) |
| 사람이 읽는 실험 진행 순서 | [실험 문서 안내](../docs/experiments/README.md) |

`*-manifest.json`은 실험 입력·소스 해시, `*-cases.json`은 팀 샘플, `*-courses.json`은 고정 코스다. `*-battles.jsonl`은 경기별 팀·행동·결과, `*-trace.jsonl`은 편성/영입 진단, `*-audit.json`은 재생·비교 검증 결과다. `simulation-*-balanced.json`은 등반 요약이다. 화면 자료는 `screenshots/`, 자산 검사 보고서는 `reports/`를 우선 확인한다.

로컬 원자료는 경로와 내용을 보존한다. 스크립트·테스트·manifest가 경로를 참조하므로 파일을 옮기거나 이름을 바꾸면 재현이 깨질 수 있다. 새로운 실행에는 새 ID를 사용하고 결과를 덮어쓰지 않는다. pilot 자료는 본 실험과 별개이며 결과 합계에 섞지 않는다. 기존 자료의 개판룰 표기는 당시 이름이며 현재 화면 이름은 혼합룰이다.

새 `artifacts/` 파일은 `.gitignore`로 제외한다. 기존에 추적한 보고서·manifest·팀 샘플은 유지하지만 모든 `.jsonl`·`.log`와 중간 미디어는 로컬 자료다. 새 컴퓨터에서 과거 경기 재생·감사를 수행하려면 해당 원자료를 직접 복사한다. clone만으로 모든 실험 원자료가 복원되지는 않는다. 과거 커밋의 파일은 이 정리로 제거하지 않는다.

색인 갱신: 저장소 루트에서 `node scripts/index-artifacts.mjs`. 이 명령은 생성된 두 색인만 갱신한다. 전체 자료를 읽어 재검증하거나 과거 결과 날짜를 바꾸지 않는다.
