최종 검증 기록:

- `node --import tsx --test tests/*.test.ts`: 859개 통과, 실패 0. 후속 데이터 보정 뒤 호연·관동·성도·선출·기믹 집중 검사 92개 통과, 원규 Tactical 상한 반영 뒤 호연·AI·기믹 검사 46개 통과.
- `node scripts/export-normal-npc-runtime.mjs --check`: 검토 원본과 런타임 284개 일치.
- `node node_modules/typescript/bin/tsc --noEmit`: 통과.
- `node --require ./scripts/windows-build-links.cjs node_modules/next/dist/bin/next build`: 최종 프로덕션 빌드 통과. Windows 샌드박스 접근 오류 후 권한을 요청한 동일 명령으로 검증했다.
- 호연·재도전·히든보스·레이드·run events·Teleport E2E 37개 통과. 마지막 AI 설정 반영 빌드에서 호연 4개를 다시 실행해 통과했다. 호연 화면은 1280/390px, 행동 제출·새로고침·저장된 팀/seed/정책의 동일성을 확인한다.
- `simulate-johto-theme-comparison.ts`: Hoenn 1~100층 × 네 benchmark × 여섯 룰 × 두 시드 = before/after 각각 4,800전, 오류 0. 일반 encounters 3,840개는 동일하며 캐시 키는 팀·seed·AI·기믹·장비를 포함한다.
- `simulate-hoenn-npcs.ts`: 기존 NPC before 3,648전 / 전체 NPC after 4,416전, 오류 0. 67개 NPC/층 조합 × 1,000회 = 67,000회 실제 선출 검사에서 규칙 충족률 100%.
- v12 정책·Z 판단 구현은 변경하지 않았다. Z 보유 여섯 NPC 각각 96 available/compatible battles를 집계했다. 종길은 사용 0, 추정 Z-only KO opportunity도 0이며 이를 AI 결함으로 단정하지 않는다. 전체 추정 Miss/Waste는 각각 0이다. 이는 해당 시드/benchmark의 공개 정보 기반 추정이지 기회가 절대 없다는 증명은 아니다.
- 실제 미혜 전투 protocol에서 `Snow Warning → Snowscape`를 확인했다. 우박으로 가정하지 않았다.
- `git diff --check`: 통과. 다른 지방의 255개 런타임 정의와 기존 Johto/Rocket 구성은 해시 회귀 검사로 보존한다.

전체 테스트 이후 마지막 수정은 마그마 간부 크로뱃의 한 기술/도구·선봉 선호와 원규의 요청된 Tactical 상한이다. 관련 집중 테스트와 최종 빌드/E2E를 다시 확인했다. 새 AI tier, 전용 trainer 분기, 스탯 배율, 추가 selection rule, 엔진 재작성은 없다.

기준 before 실험을 완전히 재현하려면 기록된 기준 commit의 catalog/AI 메타데이터도 함께 사용해야 한다. 현재 catalog에서 원규의 Tactical 상한을 유지한 채 runtime만 기준 파일로 교체하면 과거 Expert 조건과 달라질 수 있다. 기록된 before 결과는 상한 변경 전에 측정했다.
