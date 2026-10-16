# 개발 이어받기

기준: 2026-10-16. 다음 작업을 시작할 때 필요한 정보만 관리합니다.

## 읽는 순서

1. [현재 상태](STATUS.md)와 [다음 작업](current/ROADMAP.md).
2. [폴더 관리](engineering/WORKSPACE.md)와 수정할 영역의 개발 문서.
3. 게임 규칙은 [게임 안내](gameplay/README.md), 변경 근거는 [보고서 목록](../artifacts/README.md).
4. PC를 옮겼다면 [컴퓨터 이전](operations/COMPUTER_MOVE.md)과 [저장·백업](operations/BACKUPS.md).

## 저장과 실행

- 코드가 지원하는 저장 스키마는 **33**입니다. 기존 DB의 버전은 별도로 검사하며 서버 실행 시 지원되는 마이그레이션이 적용됩니다.
- 로컬 개발은 `.env.local`의 `TOWER_DB_PATH`, 통합 실행기는 Docker 볼륨의 `/data/tower.sqlite`를 사용합니다. 두 저장은 별개입니다.
- 받은 개인 저장은 `.data/transfers/`에서 검증·보관합니다. 이 PC의 비교 결과는 해당 폴더의 README와 verification JSON에 있습니다. 보관만으로 실행 중인 저장이 교체되지는 않습니다.
- 루트의 `포켓몬타워 실행.exe`로 서버 켜기·끄기, 주소 확인·복사, 게임 열기를 합니다. 업데이트 전 Docker DB를 백업하며 터널 시작 이후 로그에서 새 주소를 읽습니다.
- EXE·로컬 실행 CMD는 Git에서 제외합니다. Node.js·Docker가 준비된 다른 Windows PC에서는 최신 프로젝트 루트에 같은 EXE를 가져와 실행합니다. PC별 재생성은 필요 없으며 개인 저장은 별도 복원합니다. [EXE 역할·이전 순서](operations/COMPUTER_MOVE.md#실행-환경이-준비된-다른-pc에서-exe-사용)를 참고합니다.

## 이어서 수정할 때 유지할 기준

- 상자·브리더 선물·여행 상인 이벤트는 층을 소모하지 않고 종류·선택·보상을 복구합니다. 현재 확률과 보상은 [이벤트](gameplay/EVENTS.md)를 따릅니다.
- 다이맥스밴드·테라스탈오브는 트레이너 장비로 동시 보유합니다. 배틀 생성 시 장비 배열을 고정하며 기존 NULL 스냅샷은 종전 규칙을 유지합니다. NPC 샘플의 장비 분리는 후속 항목입니다.
- 기술배치 무료 자동 저장, 현재 대화와 지난 기록의 분리, 모바일 길게 누르기·두 번 터치 스킵 등 현재 동작은 [화면과 조작](gameplay/CONTROLS.md)에서 확인합니다.
- NPC 생성 입력은 `scripts/data/npc/`, 리뷰 표는 `artifacts/reports/npc/`입니다. 과거 실험의 해시는 당시 버전의 기록입니다.

## 작업 전후 확인

작업 전 `git status`로 변경사항을 확인합니다. Next.js 코드 수정 전 설치된 `node_modules/next/dist/docs/`의 관련 가이드를 읽습니다.

빠른 검사: `pnpm typecheck`, `pnpm check:css`, `pnpm check:workspace`. 브라우저 검증 전에는 빌드합니다. 테스트용 로그인과 tsx 실행 방법은 [설치·실행](operations/SETUP.md)을 따릅니다. 실험 원자료가 없는 경우 재현을 완료했다고 기록하지 않습니다.
