# 자산과 데이터의 공식 출처 기록

- Status: Active
- Updated: 2026-11-03
- Baseline Commit: `1c05b6f5079143ba4be7df3f3745155aee483ce7`
- Applies To: beta.6 개발 / 문서 담당 영역 (공개 패키지 표기는 beta.5)

현재 provider별 파일 수·용량·사용처·Git 정책, resolver와 fallback 및 importer 캐시 복구는 [외부 자산 분리 기반](EXTERNAL_ASSETS.md)을 따른다. 기존 source record를 중복 생성하지 않는다.

## Git / Drive 후속 정리 전 위치 안내

이번 문서 갱신은 위치·역할만 확인한다. Drive 업로드·이동·삭제·ZIP 생성·권리 재분류는 하지 않는다. 저장소 내 별도 `ExternalAssets` 폴더는 현재 없다. 실제 아래 경로를 기준으로 후속 분리 범위를 정하며 Drive 경로를 추정하지 않는다.

| 자료 | 실제 위치·역할 |
|---|---|
| 외부 원본·참고 | `external/pokemon-ip/`, `external/third-party/`, `external/reference/`, `external/user-provided/unverified/`. IP 원본·조건 명시 원본·코드 참고·미확인 제공물을 구분 |
| sprite·복구 입력 | `public/vendor/pokerogue/`, `public/vendor/showdown/pokemon/`, `public/vendor/pokeapi/`, `public/sprites/`; `scripts/assets/` lock/recipe/snapshots와 `docs/assets/manifests/`로 복원 |
| VFX | `public/vendor/showdown/fx/`, `public/sprites/effects/`, `external/third-party/devwizard-pixel-art-spells/`. DevWizard 팩은 주력 VFX 미채택·후보 원본 보존. [연출 구조](../engineering/MOVE_EFFECTS.md) |
| audio | `public/audio/bgm/`, `public/audio/sfx/`, `public/audio/music-sources.json`; 참고 원본 `external/third-party/kenney-impact-sounds/` |
| 외부 데이터 | `scripts/data/` 생성 입력, `src/data/` runtime, `docs/assets/manifests/` 출처·버전·해시. 그림의 권리와 엔진 코드 라이선스는 별개 |
| license / REUSE / SPDX | [THIRD_PARTY](../references/THIRD_PARTY.md), `public/fonts/NEODGM-LICENSE.txt`, 팩별 License/sources.json, PokéRogue `scripts/assets/pokerogue/snapshots/` 및 복원 고지. 루트 통합 REUSE.toml/.reuse/dep5/완성 SPDX inventory는 현재 없음. upstream 고지를 전체 이용 허가로 확대하지 않음 |
| 분석 | Git 제외 `artifacts/progression-audit/`, `artifacts/build-progression-audit/`, `artifacts/experiments/`, `artifacts/reports/`, `artifacts/qa/`. 생성 로그·시뮬레이션·캡처는 공식 정책과 분리 |
| 복구·배포 | `.data/backups/`, `.data/transfers/`, Windows 사용자 saves, `dist/` 배포 출력. 개인 저장·환경값은 공개 자산과 분리. [백업 안내](../operations/BACKUPS.md) |

파일별 source/license와 manifest는 기존 기록을 보존한다. 표가 모든 파일의 재배포 허가를 뜻하지 않는다. provider별 수·용량은 과거 고정 감사값이며 이번에 새 전수 해시 감사한 숫자가 아니다.

`manifests/`는 Git에 보존하는 검토 완료 출처 스냅샷이다. 원본 JSON의 날짜·URL·해시·버전·누락 항목은 그대로 보존했다. 과거 기록을 현재 상태나 새 이용 허가로 해석하지 않는다. 전체 이용 조건은 [THIRD_PARTY](../references/THIRD_PARTY.md), 현재 기능은 [STATUS](../STATUS.md)를 따른다.

2026-10-24 Projectile 검토: Pixel Art Spells는 **Reviewed / Rejected for primary battle VFX**다. [실제 화면 스타일 판단과 기존 VFX 재사용 조사](../engineering/MOVE_EFFECTS.md#existing-vfx-inventory--projectile-재검토), [선정 원본·source record](../../external/third-party/devwizard-pixel-art-spells/README.md)를 보존한다. CC0·구조는 적합하지만 시각 스타일이 맞지 않아 대표 기술 연결을 제거했다. prepare/verify는 참고용 오프라인 명령으로만 유지하며 필수 자산 목록·historical ownership은 바꾸지 않는다.

| 공식 manifest | 용도와 범위 | 자동 생성 원본 |
|---|---|---|
| [pokeapi-runtime-assets.json](manifests/pokeapi-runtime-assets.json) | PokeAPI 현재 전체 4,648개 runtime의 path·bytes·SHA-256. [공식 pinned 복원](POKEAPI_RESTORE.md) | 기준 Git blob; restore는 갱신하지 않음 |
| [showdown-pokemon-runtime-assets.json](manifests/showdown-pokemon-runtime-assets.json) | Showdown 현재 전체 1,393개 runtime의 golden 경로·bytes·SHA-256. [고정 snapshot 복원](SHOWDOWN_POKEMON_RESTORE.md) | 기준 Git blob; 복원 시 갱신하지 않음 |
| [pokerogue-runtime-assets.json](manifests/pokerogue-runtime-assets.json) | 기준 HEAD의 전체 2,002개 runtime 결과·크기·SHA-256. [독립 복원](POKEROGUE_RESTORE.md)에서 읽기 전용 비교 | 검토한 golden baseline; 복원 실행은 갱신하지 않음 |
| [resource-manifest.json](manifests/resource-manifest.json) | 2026-10-04 Showdown/Kenney 자료의 버전·파일 해시. `integrated:false`와 경로는 당시 상태이며 전체 현재 자산 목록이 아님. [현재 위치 매핑](EXTERNAL_ASSETS.md#비런타임-자료-이동--2026-10-23) | 공식본으로 이동; 같은 artifacts 사본 제거 |
| [pokedex-source.json](manifests/pokedex-source.json) | 1,025종 도감 데이터의 CSV URL·가져오기 시각 | `scripts/import-pokedex.mjs` |
| [battle-data-source.json](manifests/battle-data-source.json) | 612종 배틀 데이터 가져오기 시점의 URL·SHA-256·엔진 버전·예외 | `scripts/import-battle-roster.ts` |
| [move-data-source.json](manifests/move-data-source.json) | 초기 20종 기술 데이터 출처. 현재 통합 가져오기 기록은 battle-data-source가 우선 | 과거 출처로 이동; 같은 artifacts 사본 제거 |
| [mega-sprite-sources.json](manifests/mega-sprite-sources.json) | 메가 형태 방향별 PNG/GIF 제공원·URL·저장 경로 | `scripts/import-mega-assets.mjs` |
| [move-effects-integration.json](manifests/move-effects-integration.json) | 실제 연결한 효과 PNG·참고 revision·렌더러·안무 경로 | 공식본으로 이동; 같은 artifacts 사본 제거 |
| [pixel-sprite-assets.json](manifests/pixel-sprite-assets.json) | Showdown 도트 1,201개 파일의 URL·크기·SHA-256 | `scripts/import-pixel-sprites.ts` |
| [local-pokemon-sprites.json](manifests/local-pokemon-sprites.json) | PokeAPI 고정 commit·로컬 파일별 해시·누락 변형. 감사 도구의 고정 revision 입력 | `scripts/import-local-pokemon-sprites.ts` |
| [npc-sprite-review.json](manifests/npc-sprite-review.json) | 트레이너 이미지 반입·보류 판단과 제공원·크레딧·해시 | `scripts/import-common-npc-sprites.ts` |

자동 생성 원본은 각 스크립트가 `artifacts/qa/assets/reports/` 또는 `artifacts/reports/npc/`에 기록하는 개별 실행 결과다. 해당 결과는 로컬에 유지할 수 있지만 공식 기준으로 링크하거나 테스트 입력으로 사용하지 않는다. 재실행은 docs 공식본을 덮어쓰지 않는다. 스냅샷 갱신은 자산 변경·차이·권리 표기를 검토한 뒤 명시적으로 수행한다.

음악·장비·알·트레이너 등 기존 게임 자산 옆의 `sources.json`은 계속 그 위치가 기준이다. 생성 sprite pack의 Git 정책과 새 clone 복원은 [PokéRogue](POKEROGUE_RESTORE.md)와 [Showdown Pokémon](SHOWDOWN_POKEMON_RESTORE.md) 및 [PokeAPI](POKEAPI_RESTORE.md) 안내를 따른다. runtime URL과 src/data는 유지한다.

혼합 자산의 현재 소유권과 파일별 golden은 [MIXED_RUNTIME_ASSETS](MIXED_RUNTIME_ASSETS.md)와 [단일 current manifest](manifests/mixed-runtime-assets.json)를 따른다. trainers 194개, gimmicks 146개, items 195개만 외부 복원 대상으로 추적 해제하며 플레이어·generated item PNG/SVG·neutral VFX·project-original beam과 historical source JSON은 유지한다.

현재 잔여 자산의 공식 ownership은 [최종 정책](ASSET_OWNERSHIP.md)과 [runtime ownership manifest](manifests/runtime-ownership.json)에 기록한다. mixed golden의 project-original 20개는 참조로 재사용하며 해시를 중복 복제하지 않는다. historical eggs/music/resource source snapshot은 보존한다.

전체 준비는 `pnpm assets:setup`, 전체 검사는 `pnpm assets:verify`다. [개발자 명령어](../development/DEVELOPER_COMMANDS.md)와 [Windows 플레이어 구조](../operations/WINDOWS_PLAYER.md)에 개발/production 흐름을 분리했다. 제목/branding 3개는 project-original이며 삭제된 Tera draft는 현재 inventory에 없다.
