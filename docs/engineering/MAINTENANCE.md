# 문서 작성과 정리 규칙

| 정보 종류 | 보관 위치 |
|---|---|
| 현재 기능·규칙 | `docs/STATUS.md`, `docs/gameplay/` |
| 다음 작업·보류 결정 | `docs/current/ROADMAP.md` |
| 실행·계정·복구 | `docs/operations/` |
| 개발 구조·수정 담당 위치 | `docs/engineering/` |
| 시뮬레이션·비교 보고서 | `artifacts/experiments/ai|balance|samples/` |
| 변경 원인·검증 기록 | `artifacts/reports/changes/` |
| NPC 리뷰 표·CSV | `artifacts/reports/npc/` |
| 일시적인 확인 자료 | `artifacts/temporary/`, 확인 후 삭제 |

현재 설명에 날짜별 완료 로그·테스트 개수·옛 승률을 덧붙이지 않습니다. 같은 주제는 기존 담당 문서를 갱신하고 작은 수정마다 새 파일을 만들지 않습니다.

같은 실험의 짧은 요약과 상세 보고서를 따로 늘리지 않습니다. 상세 보고서에 목적·조건·결론·채택 여부를 함께 적고, 읽기용 목록에는 한 줄과 링크만 둡니다. 시뮬레이션 결과는 현재 게임 규칙이나 사람 승률과 구분합니다.

보고서 생성기는 결과물 폴더만 수정합니다. `STATUS`와 인계 문서에 실험 소식을 자동 삽입하지 않습니다. 중복 보고서는 고유한 해석을 기준 보고서에 통합한 뒤 삭제하고, 오래된 문서 백업은 Git 이력으로 대체합니다.

[폴더별 역할과 삭제 기준](WORKSPACE.md) · [보고서 목록](../../artifacts/README.md)
