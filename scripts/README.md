# 개발 도구 안내

저장소 루트에서 실행합니다. 게임 실행 방법은 [설치·실행](../docs/operations/SETUP.md), 결과물 보관 위치는 [폴더 관리](../docs/engineering/WORKSPACE.md)를 따릅니다.

| 작업 | 명령·도구 |
|---|---|
| 타입·CSS·문서 경계 확인 | pnpm typecheck / pnpm check:css / pnpm check:workspace |
| 프로덕션 빌드 | pnpm build |
| 알려진 테스트·임시 출력 정리 | pnpm clean:temp |
| 실제 DB 수동 백업 | node --env-file=.env.local scripts/backup-db.mjs ([저장·백업 안내](../docs/operations/BACKUPS.md)) |
| 특정 로컬 계정 플레이 초기화 | 게임 서버를 종료한 뒤 node --env-file=.env.local --import tsx scripts/reset-local-player.ts 계정아이디. DB 자동 백업 후 해당 계정의 진행만 신규 기본값으로 복원하며 로그인 정보와 다른 플레이어는 유지합니다. |
| 개인용 통합 실행기 | 루트 포켓몬타워 실행.exe → launcher-window.ps1 → launch-preview.mjs / preview.mjs |
| Windows 최초 설치 | 루트 포켓몬타워 설치.cmd → setup-windows.mjs → npm exec로 pnpm 11.19.0 실행 → 로컬 실행 CMD. 로그: .data/setup-logs/ 또는 Windows TEMP/Pokemon-Tower/ |
| 설치 CMD 회귀 검사 | node --test tests/windows-setup.test.mjs (Windows CMD, 패키지 도구·게임 실행은 모의 처리) |
| 외부 터널 없이 로컬 실행 | 범용 포켓몬타워 로컬 실행.cmd (Git 포함, PATH에 Node.js 24 이상 필요) 또는 node scripts/launch-local.mjs |
| Windows 실행 파일 다시 만들기 | powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/build-windows-launcher.ps1 |
| 실행기 화면만 렌더링 (서버 연결 없음) | powershell.exe -NoProfile -ExecutionPolicy Bypass -STA -File scripts/launcher-window.ps1 -NodePath (Get-Command node).Source -Preview |
| 터널 주소 선택 회귀 검사 | node --test tests/preview-origin.test.mjs |
| 배포 묶음 생성·검증 | pnpm deploy:package / pnpm deploy:verify |
| NPC 입력·런타임 생성 | 현재 검토 입력 수정 → node scripts/export-normal-npc-runtime.mjs; 원본 일치 검사에는 --check |
| NPC 리뷰 CSV 내보내기 | node scripts/export-npc-review-csv.mjs 또는 normal-npc-samples.json normal-npc 인자 (summary v2는 후보 최대 6마리) |
| 자산·데이터 가져오기 | import-*.ts/mjs |
| PokéRogue만 독립 복원·검증 | pnpm assets:pokerogue / pnpm assets:pokerogue:verify ([요구 사항·offline 복원](../docs/assets/POKEROGUE_RESTORE.md)) |
| 시뮬레이션 실행 | run-*.mjs → simulate-*.ts |
| 실험 검증·보고서 | audit-* / summarize-* / write-*-report.mjs |

NPC 입력은 scripts/data/npc/, 리뷰 표·CSV는 artifacts/reports/npc/입니다. 실험 보고서와 원자료는 artifacts/experiments/ai·balance·samples로 분류합니다. 보고서 목록 (로컬 전용: `artifacts/README.md`)에서 주제별로 찾습니다.

보고서 생성기는 현재 상태·인계 문서를 수정하지 않습니다. 과거 실험의 소스 해시는 당시 버전의 기록입니다. 경로 정리 후 기존 고정 감사의 소스 일치 조건을 만족한다고 가정하지 말고 해당 버전과 입력을 확인하세요. 새 실험에는 새 ID를 사용합니다.

CSS 화면 비교는 node scripts/css-snapshot.mjs before / after입니다. 실행 중인 로컬 서버와 별도 검증 계정을 사용하며 출력·세션은 artifacts/temporary/css-structure/에 저장합니다. 작업 종료 후 삭제합니다.

브라우저 테스트의 JSON import attribute 수집 오류가 나면 node --import tsx node_modules/@playwright/test/cli.js test ... 로 실행합니다. 실제 E2E는 최신 빌드와 설치된 Chrome을 사용합니다.

옛 단계별 전체 NPC 부트스트랩과 일회성 Raid 튜닝 스크립트는 삭제했습니다. 현재 NPC는 검토 입력 → export → --check를 사용합니다. Raid 측정은 pnpm raid:simulate --out artifacts/temporary/raid-새실험 형식으로 출력 경로를 지정합니다. 이전 측정은 Git과 분류된 보고서로 확인합니다.

공식 문서·출처는 [docs](../docs/README.md)가 기준입니다. `node scripts/package-deploy.mjs --check`는 artifacts 없이 배포 입력을 검사합니다. 과거 실험 입력을 요구하는 선택 도구와 출력 경로는 [의존성 목록](../docs/engineering/ARTIFACT_DEPENDENCIES.md)을 확인하세요. 자동 가져오기 결과는 artifacts에 쓰며 공식 manifest는 검토 후 별도로 갱신합니다.
