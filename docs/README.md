# 문서 안내

게임 소개와 다운로드는 [프로젝트 README](../README.md), 현재 공개 버전과 검증 범위는 [STATUS](STATUS.md)에서 확인합니다.

| 찾는 정보 | 시작할 문서 |
|---|---|
| 게임 | [조작·규칙](gameplay/README.md) · [도감과 출전 편성](gameplay/COLLECTION.md) · [튜토리얼·초기 지급](gameplay/TUTORIAL.md) |
| 개발 | [개발 명령어](development/DEVELOPER_COMMANDS.md) · [구조·영역별 개발](engineering/README.md) · [작업 인계](SESSION_HANDOFF.md) |
| 실행/배포 | [일반 사용자 실행](operations/SETUP.md) · [운영 문서 색인](operations/README.md) |
| 자산 | [복원·검증·manifest](assets/README.md) · [출처·라이선스](references/README.md) |
| 현재 상태 | [STATUS](STATUS.md) · [앞으로 할 일](current/ROADMAP.md) |
| 과거 기록 | [결정·조사 기록](history/README.md) · [beta.5 공개·검증 완료 기록](releases/WINDOWS_BETA_5.md) · [beta.1](releases/v1.0.0-beta.1.md) · [비전투 이벤트 릴리스](releases/NONCOMBAT_EVENTS_RELEASE.md) |

## 문서별 책임

- root README: 외부 게임 소개·특징·스크린샷·실행·기술 개요.
- STATUS: 현재 구현·버전·공개/검증 상태. ROADMAP: 앞으로 할 작업.
- gameplay: 플레이 규칙. engineering/development: 코드 구조와 개발 절차.
- operations: 사용자 실행·런처 내부·서버 배포·저장/백업을 담당 문서로 구분.
- assets/references: 현재 자산 복원 정책과 출처·권리·고정 조사 기록.
- releases/history: 특정 시점의 변경과 검증 근거. 과거 수치를 현재 기준으로 덮어쓰지 않음.

`docs/`는 Git에 보존하는 공식 안내·설계·정책·출처 기록입니다. `artifacts/`는 Git 제외 QA 로그·캡처·자동 보고서·실험 결과입니다. 새 clone의 일반 실행·빌드·테스트·문서 검사는 로컬 artifacts를 필수 입력으로 요구하지 않습니다. 필요한 고정 입력은 `src/`, `scripts/data/`, `tests/fixtures/` 또는 검토한 manifest에 둡니다. 자세한 경계는 [폴더 관리](engineering/WORKSPACE.md), 과거 정리 근거는 [문서 승격 기록](engineering/ARTIFACT_PROMOTION.md)을 따릅니다.
