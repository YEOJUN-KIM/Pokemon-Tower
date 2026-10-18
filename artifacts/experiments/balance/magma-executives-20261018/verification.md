최종 실행 결과:

- `node --import tsx --test tests/magma-executives.test.ts tests/hoenn-named-trainers.test.ts tests/named-selection-rules.test.ts tests/npc-templates.test.ts tests/npc-gimmicks.test.ts`: 48개 통과, 실패 0. 후보 합법성, 실제 7개 선출 조합, 층별 포인트·기믹 경계, Tactical 상한, 이벤트 snapshot 직렬화와 v12 전투·재현을 확인했다.
- `node scripts/export-normal-npc-runtime.mjs --check`: 284개 검토 정의와 runtime 일치.
- `node node_modules/typescript/bin/tsc --noEmit`: 통과.
- `node --require ./scripts/windows-build-links.cjs node_modules/next/dist/bin/next build`: 최종 프로덕션 빌드 통과. 최초 실행은 Windows junction 접근 오류로 중단됐고, 권한 요청 뒤 동일 명령으로 재실행했다.
- `node --import tsx node_modules/@playwright/test/cli.js test e2e/hoenn-named-trainers.spec.ts`: 최종 빌드에서 4개 통과. 샌드박스 소켓 차단 후 권한 요청으로 실행했다. 이 E2E는 원규·철구·민지·회연의 1280/390px 진입·행동 제출·새로고침과 저장된 팀/seed 보존 검사다. 두 마그마 간부의 새 세트는 위 snapshot/전투 integration tests로 별도 확인했다.
- Primary Before/After 각 384전, final holdout(seed 17~20) Before/After 각 384전, 오류 0. 기존 크로뱃 패키지 제거 비교 384전, 최종 메가 비활성 비교 192전도 오류 0.
- Before/After 각 6,000회 선출 telemetry: 두 NPC × F45/F55/F95 × 1,000회. 에이스·구열 carrier 포함률과 규칙 충족률은 100%, 가능한 조합은 7개다.
- 기준 commit `5325869e2c042f27767501af521c4168ebddd8d6`와 비교해 다른 282개 검토/runtime 정의는 구조적으로 일치한다. 보고서 생성기는 공통 AI·Z 결정·selection rules·opponent team·templates·성장·NPC gimmicks·gimmick engine 파일이 기준과 같은지도 검사한다.
- `git diff --check`: 통과. 전체 859개 suite를 이번 작업에서 다시 실행했다고 주장하지 않는다.

최종 판정은 aggregate 승률 개선만으로 내리지 않았다. 두 NPC 모두 signature benchmark의 F45/F95 24전씩에서 플레이어 승률 100%가 남아, 요청된 반복 고승률 중단 기준에 따라 **마그마단 간부 추가 설계 필요**로 남긴다.
