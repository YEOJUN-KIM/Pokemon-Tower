# 자산과 데이터의 공식 출처 기록

`manifests/`는 Git에 보존하는 검토 완료 출처 스냅샷이다. 원본 JSON의 날짜·URL·해시·버전·누락 항목은 그대로 보존했다. 과거 기록을 현재 상태나 새 이용 허가로 해석하지 않는다. 전체 이용 조건은 [THIRD_PARTY](../references/THIRD_PARTY.md), 현재 기능은 [STATUS](../STATUS.md)를 따른다.

| 공식 manifest | 용도와 범위 | 자동 생성 원본 |
|---|---|---|
| [resource-manifest.json](manifests/resource-manifest.json) | 2026-10-04 Showdown/Kenney 자료의 버전·파일 해시. `integrated:false`는 당시 상태이며 전체 현재 자산 목록이 아님 | 공식본으로 이동; 같은 artifacts 사본 제거 |
| [pokedex-source.json](manifests/pokedex-source.json) | 1,025종 도감 데이터의 CSV URL·가져오기 시각 | `scripts/import-pokedex.mjs` |
| [battle-data-source.json](manifests/battle-data-source.json) | 612종 배틀 데이터 가져오기 시점의 URL·SHA-256·엔진 버전·예외 | `scripts/import-battle-roster.ts` |
| [move-data-source.json](manifests/move-data-source.json) | 초기 20종 기술 데이터 출처. 현재 통합 가져오기 기록은 battle-data-source가 우선 | 과거 출처로 이동; 같은 artifacts 사본 제거 |
| [mega-sprite-sources.json](manifests/mega-sprite-sources.json) | 메가 형태 방향별 PNG/GIF 제공원·URL·저장 경로 | `scripts/import-mega-assets.mjs` |
| [move-effects-integration.json](manifests/move-effects-integration.json) | 실제 연결한 효과 PNG·참고 revision·렌더러·안무 경로 | 공식본으로 이동; 같은 artifacts 사본 제거 |
| [pixel-sprite-assets.json](manifests/pixel-sprite-assets.json) | Showdown 도트 1,201개 파일의 URL·크기·SHA-256 | `scripts/import-pixel-sprites.ts` |
| [local-pokemon-sprites.json](manifests/local-pokemon-sprites.json) | PokeAPI 고정 commit·로컬 파일별 해시·누락 변형. 감사 도구의 고정 revision 입력 | `scripts/import-local-pokemon-sprites.ts` |
| [npc-sprite-review.json](manifests/npc-sprite-review.json) | 트레이너 이미지 반입·보류 판단과 제공원·크레딧·해시 | `scripts/import-common-npc-sprites.ts` |

자동 생성 원본은 각 스크립트가 `artifacts/qa/assets/reports/` 또는 `artifacts/reports/npc/`에 기록하는 개별 실행 결과다. 해당 결과는 로컬에 유지할 수 있지만 공식 기준으로 링크하거나 테스트 입력으로 사용하지 않는다. 재실행은 docs 공식본을 덮어쓰지 않는다. 스냅샷 갱신은 자산 변경·차이·권리 표기를 검토한 뒤 명시적으로 수행한다.

음악·장비·알·트레이너 등 기존 게임 자산 옆의 `sources.json`은 계속 그 위치가 기준이다. 이번 작업은 `public/`, `vendor/`, `src/data/`의 파일을 옮기지 않는다.
