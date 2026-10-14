# 개발 이어받기

기준: 2026-10-14. 이 파일은 다음 작업의 시작점만 담고, 과거 완료 로그는 누적하지 않습니다.

1. [현재 상태](STATUS.md), [다음 계획](current/ROADMAP.md)을 읽습니다.
2. [폴더와 파일 관리](engineering/WORKSPACE.md)에서 수정 위치와 결과물 보관 기준을 확인합니다.
3. 게임 규칙은 [게임 안내](gameplay/README.md), 특정 변경 근거는 [보고서 목록](../artifacts/README.md)에서 찾습니다.

현재 실제 로컬 저장은 환경 설정의 `TOWER_DB_PATH`를 사용합니다. 이 PC에서는 `.data/dev-migrated.sqlite`이며 함께 사용하는 WAL/SHM 파일을 임시 파일로 취급하지 않습니다. 미커밋된 기능 변경이 있으므로 작업 전 `git status`를 확인합니다.

보고서는 AI·밸런스·팀 샘플로 분류했습니다. NPC 생성기의 입력은 `scripts/data/npc/`, 리뷰용 표는 `artifacts/reports/npc/`에 있습니다. 과거 실험의 소스 해시는 당시 버전의 기록이며, 경로 정리 후 현재 소스와 같다는 뜻이 아닙니다.

빠른 검사: `pnpm typecheck`, `pnpm check:css`, `pnpm check:workspace`. 브라우저 검증 전에는 빌드를 수행합니다. 테스트별 로그인 준비와 JSON import 지원은 [실행 안내](operations/SETUP.md)를 확인합니다.
