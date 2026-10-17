# 개발 이어받기

기준: 2026-10-16. 다음 작업을 시작할 때 필요한 정보만 관리합니다.

## 읽는 순서

1. [현재 상태](STATUS.md)와 [다음 작업](current/ROADMAP.md).
2. [폴더 관리](engineering/WORKSPACE.md)와 수정할 영역의 개발 문서.
3. 게임 규칙은 [게임 안내](gameplay/README.md), 변경 근거는 [보고서 목록](../artifacts/README.md).
4. PC를 옮겼다면 [컴퓨터 이전](operations/COMPUTER_MOVE.md)과 [저장·백업](operations/BACKUPS.md).

## 저장과 실행

- 코드가 지원하는 저장 스키마는 **40**입니다. 기존 DB의 버전은 별도로 검사하며 서버 실행 시 지원되는 마이그레이션이 적용됩니다.
- 로컬 개발은 `.env.local`의 `TOWER_DB_PATH`, 통합 실행기는 Docker 볼륨의 `/data/tower.sqlite`를 사용합니다. 두 저장은 별개입니다.
- 받은 개인 저장은 `.data/transfers/`에서 검증·보관합니다. 이 PC의 비교 결과는 해당 폴더의 README와 verification JSON에 있습니다. 보관만으로 실행 중인 저장이 교체되지는 않습니다.
- 루트의 `포켓몬타워 실행.exe`로 서버 켜기·끄기, 주소 확인·복사, 게임 열기를 합니다. 업데이트 전 Docker DB를 백업하며 터널 시작 이후 로그에서 새 주소를 읽습니다.
- EXE·로컬 실행 CMD는 Git에서 제외합니다. Node.js·Docker가 준비된 다른 Windows PC에서는 최신 프로젝트 루트에 같은 EXE를 가져와 실행합니다. PC별 재생성은 필요 없으며 개인 저장은 별도 복원합니다. [EXE 역할·이전 순서](operations/COMPUTER_MOVE.md#실행-환경이-준비된-다른-pc에서-exe-사용)를 참고합니다.

## 이어서 수정할 때 유지할 기준

- Mirror는 별도 이벤트가 아닌 새 공통 도전자의 3% 특수 후보입니다. 일반전 실제 출전 팀/Elite 수치/랜덤 보상 snapshot을 복구하고, 영입 없이 기존 보상 선택 영수증으로 강화 대상을 처리합니다. 이로치 상시 교환은 종료했으며 기존 기록은 보존합니다. [구조·확률·풀](engineering/MIRROR_CHALLENGER.md)을 따릅니다.

- 상자·브리더 선물·여행 상인 이벤트는 층을 소모하지 않고 종류·선택·보상을 복구합니다. 현재 확률과 보상은 [이벤트](gameplay/EVENTS.md)를 따릅니다.
- 히든상점은 상품 4–5개와 재화/가격/effect/구매 한도를 발생 시 snapshot합니다. 두 재화 합계 2회 구매와 상품별 멱등 영수증을 유지합니다. [풀·가격·구조·조정 위치](engineering/HIDDEN_SHOP.md)를 따릅니다.
- 다이맥스밴드·테라스탈오브는 트레이너 장비로 동시 보유합니다. 배틀 생성 시 장비 배열을 고정하며 기존 NULL 스냅샷은 종전 규칙을 유지합니다. NPC 샘플의 장비 분리는 후속 항목입니다.
- 기술배치 무료 자동 저장, 현재 대화와 지난 기록의 분리, 모바일 길게 누르기·두 번 터치 스킵 등 현재 동작은 [화면과 조작](gameplay/CONTROLS.md)에서 확인합니다.
- 네임드 NPC 생성 입력은 `scripts/data/npc/`, 공통 랜덤 Sample은 `src/data/npc-samples.ts`, Rank는 `src/data/npc-ranks.ts`, 리뷰 표는 `artifacts/reports/npc/`입니다. 새 런의 일반층·도전자는 공통 Sample/Rank를 사용하고 구 런과 저장 상대는 유지합니다. 과거 실험의 해시는 당시 버전의 기록입니다.

## 작업 전후 확인

작업 전 `git status`로 변경사항을 확인합니다. Next.js 코드 수정 전 설치된 `node_modules/next/dist/docs/`의 관련 가이드를 읽습니다.

빠른 검사: `pnpm typecheck`, `pnpm check:css`, `pnpm check:workspace`. 브라우저 검증 전에는 빌드합니다. 테스트용 로그인과 tsx 실행 방법은 [설치·실행](operations/SETUP.md)을 따릅니다. 실험 원자료가 없는 경우 재현을 완료했다고 기록하지 않습니다.

선택 폼은 공통 개체·성장 데이터를 공유하고, `pokemon_form_training`에 폼별 기술·선택 특성·테라 타입을 저장합니다. 폼을 변경하면 해당 폼의 저장 설정을 불러오며, 현재 선택 폼의 기존 저장만 v37 이전 시 보존합니다. 기존 배틀·도전 스냅샷은 유지합니다.

2026-10-17 공통 배낭: 최신 동작/DB v41 의미 변환/호환성/30개 항목 보고는 [BAG](engineering/BAG.md). 새 Bag 재고 테이블 없이 기존 Run 저장을 통합했습니다. TM은 Run 동안 반복 사용하고 새 계정 기술 해금은 하지 않습니다. 기존 계정 기술 지식은 출처를 구별할 수 없어 보존합니다. 자동 도구 이동은 대상의 기존 도구를 Bag으로 반환하며 원 소지자와 자동 교환하지 않습니다. 전체 664개 단위·통합 및 Chrome 39개 회귀가 통과했습니다.
