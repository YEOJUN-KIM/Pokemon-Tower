# 실험 결과와 현재 기준

갱신: 2026-10-11. 실제 게임 상태는 [STATUS](../STATUS.md), 최신 입력/재실행 조건은 [인계](../SESSION_HANDOFF.md)와 [scripts 안내](../../scripts/README.md)를 따른다. 과거 AI 버전, 층수, 가격, 팀, 코스가 다른 수치를 하나의 승률로 합치지 않는다.

## 무엇부터 읽을까요?

- 방금 팀 기술배치를 고친 결과: [최근 트릭룸 팀 수정](samples/ROOM_SAMPLE_CORRECTION.md).
- 적 AI가 얼마나 어려워졌는지: [상대 v7/v8 난이도 비교](balance/OPPONENT_LEARNING_BALANCE_COMPARISON.md).
- 특정 실험을 찾기: [AI 판단·학습](ai/README.md) / [팀 샘플·조합](samples/README.md) / [난이도·경제](balance/README.md).

아래 순서표는 실험 과정을 자세히 따라가고 싶을 때만 읽으면 됩니다.

## 최근 진행 순서

| 순서 | 실험 | 결론과 적용 상태 |
|---|---|---|
| 1 | [다양한 팀·자동 샘플](samples/AUTO_SAMPLE_SUITE.md) | 소수 스타터 외 세대·벽·트릭룸·혼합 팀으로 테스트 확장 |
| 2 | [무효/교체 분리](ai/COVERAGE_FACTOR_COMPARISON.md) | 실험 플레이어는 immunity-only 후보, 교체 묶음 보류 |
| 3 | [샘플/벽 유지 분리](samples/SAMPLE_WALL_FACTOR_COMPARISON.md) | 조건·반동을 고려한 초기 샘플 개선 후보, 벽 유지 변경 보류 |
| 4 | [새 코스 샘플 검증](samples/SAMPLE_HOLDOUT_VALIDATION.md) | 당시 미사용18코스로 재검증; 이후 실험에서 재사용되어 현재는 미사용이 아님 |
| 5 | [흡수/무효 학습 검증](ai/ABILITY_LEARNING_VALIDATION.md) | 특성 종만 보고 추정하지 않고 실제 공개 사건을 통해 학습 |
| 6 | [실제 상대 적용](ai/OPPONENT_IMMUNITY_LEARNING.md) | 상대 v8로 적용, 이전 배틀 저장 버전 유지 |
| 7 | [v7/v8 난이도 비교](balance/OPPONENT_LEARNING_BALANCE_COMPARISON.md) | 3,240등반, 피할 수 있는 무효12,615→0; 평균 약1층 하락 |
| 8 | [트릭룸 기술 수정](samples/ROOM_SAMPLE_CORRECTION.md) | 동탁군 두 기술 교체 후보 저장, 360등반 검증; 전체 난이도 변경 아님 |

## 다음 실험 기준

입력 후보는 `artifacts/reliable-samples-20261011-room-corrected-cases.json`, 실제 상대는 v8이다. 지난 샘플 원본과 실행기는 보존한다. 다음 후보인 공통 기술 사용 조건 검사는 아직 구현하지 않았다. 상대에게 벽/트릭룸 전략을 새로 추가하거나 가격을 일괄 조정하는 작업과 구분한다.

배틀 승률·50층 통과·100층 완주는 서로 다르다. 반복 무효·조건 실패도 서로 다른 사건이다. 사후 마지막 패배 로그의 실패 빈도는 전체 배틀 실패율이 아니다. 같은 팀/코스를 여러 룰에서 반복한 등반은 독립된 새 코스가 아니다. 공개 재생 일치는 데이터 재현 검증이며, 사람의 체감 난이도 검증을 대신하지 않는다.

## 원자료 찾기

[artifacts 안내](../../artifacts/README.md)의 최신 보고서를 먼저 읽고 필요한 audit/manifest/원자료로 이동한다. [전체 색인](../../artifacts/index.md)은 위치와 크기를 제공하며 [index.json](../../artifacts/index.json)의 manifest 참조는 `files[]`만 집계한다. 참조가 없다고 삭제해도 되는 파일이라는 뜻은 아니다.

과거 30/50층 경제·룰·벽 실험도 [전체 문서 목록](../README.md)에 남아 있다. 당시 수치를 최신 v8의 승률이라고 제시하지 않는다. 기존 로그의 개판룰은 현재 혼합룰과 같은 내부 ID chaos의 과거 화면 이름이다.
