# 영구 회귀 입력

일반 테스트는 Git에서 제외된 `artifacts/`에 의존하지 않는다. 다음 작은 입력만 테스트용으로 고정했다. 실행 로그·전체 시뮬레이션 결과는 복사하지 않았다.

| 입력 | 원래 로컬 자료 | 보존 범위 |
|---|---|---|
| `raid/tune2-definitions.json` | `artifacts/experiments/balance/raid-final-baseline.json` | 구 Tune2 저장 호환에 필요한 definitions만 보존. 약 3.5 MB의 전체 보고서 제외 |
| `raid/overall-comparison.json` | `artifacts/experiments/balance/raid-winrate-simulation.json` | 층별 보고서 비교용 metadata 해시와 보스별 winRate만 보존. 현재 승률이 아님 |
| `sample-audit/` | support-recheck-climb-cases / support-corrected-climb-cases | 공격 분류·투자 오류와 Wonder Guard 보완을 검증하는 원본·수정 입력 |
| `room-sample/` | reliable-samples / room-sample 계열 cases | 지정 기술만 바뀌는 개입 조건과 실제 엔진 동작 검증용 입력 |

로컬 원자료는 실험 재현용으로 별도 보존한다. 이 fixture는 해당 실험의 최신 출력이 아니며 자동 생성 스크립트로 덮어쓰지 않는다. 자산 출처 입력은 [공식 manifest](../../docs/assets/README.md)를 사용한다.
