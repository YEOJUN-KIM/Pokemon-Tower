# PokeAPI Pokémon sprite pack 독립 복원

기준 HEAD: `42c6e5a254df9c768798f441df0dd6413aff40cf`. 대상은 `public/vendor/pokeapi/` 전체다. Node.js 24 이상과 pnpm이 필요하며 이 팩에는 Python·Pillow·이미지 encoder가 필요 없다. runtime URL과 게임 데이터는 유지한다.

## 현재 pack

| 항목 | 값 |
|---|---:|
| 전체 파일 | 4,648 |
| PNG / GIF | 3,182 / 1,466 |
| Git blob 및 로컬 raw bytes | 89,453,521 |
| 현재 도감/폼이 registry에서 받는 PokeAPI 후보 경로 합집합 | 3,775 |
| 위 후보의 golden 누락 | 0 |
| 위 열거에 나오지 않는 보존 파일 | 873 |

현재 runtime 내부에는 이미지 외 metadata·README·source 파일이 없다. 출처는 Git에 보존한 기존 [THIRD_PARTY](../references/THIRD_PARTY.md)와 역사 manifest, 이번 source lock에 기록한다. 미참조 파일도 기준 pack의 일부로 복원한다. 참조 수는 실제 모든 게임 화면의 요청 횟수가 아니라 현재 도감의 종/폼·방향·이로치·정지/애니메이션 후보의 합집합이다. 전체 Dex catalog에는 제거한 미진화 종도 남아 있으므로 실제 도감/플레이 폼과 구분했다.

| runtime 하위 디렉터리 | 파일 수 |
|---|---:|
| pokemon/ | 795 |
| pokemon/back/ | 795 |
| pokemon/shiny/ | 795 |
| pokemon/back/shiny/ | 795 |
| pokemon/other/official-artwork/ | 1 |
| pokemon/other/official-artwork/shiny/ | 1 |
| pokemon/versions/generation-v/black-white/animated/ | 375 |
| 위 animated/back/ | 360 |
| 위 animated/shiny/ | 372 |
| 위 animated/back/shiny/ | 359 |

## 공식 upstream과 고정 revision

- Repository: [PokeAPI/sprites](https://github.com/PokeAPI/sprites/tree/a3a1432e688ea028f12c51371d5253037cb9f17b).
- Revision: `a3a1432e688ea028f12c51371d5253037cb9f17b`.
- Source root: `https://raw.githubusercontent.com/PokeAPI/sprites/a3a1432e688ea028f12c51371d5253037cb9f17b/sprites/`.
- Runtime의 `pokemon/...` 상대 경로를 source root 뒤에 그대로 붙인다.
- 전략: **단일 고정 공식 upstream에서 원본 bytes를 그대로 복사**. master/main/live branch나 프로젝트의 historical snapshot fallback을 사용하지 않는다.

기존 importer와 역사 manifest도 위 commit을 기록했다. 공식 Git tree를 필요한 14개 디렉터리로 나누어 조사했으며 현재 Git blob 4,648개가 모두 동일 path·blob hash로 존재했다. 이후 빈 cache의 실제 다운로드 결과를 golden SHA-256으로 다시 전수 검증했다. 시각적 유사성이나 재인코딩을 허용하지 않는다. source 저장소/commit의 원격 접근성은 온라인 복원의 전제다. 완전한 source cache가 있으면 네트워크 없이 복원할 수 있다.

## historical manifest와 current golden

기존 [local-pokemon-sprites.json](manifests/local-pokemon-sprites.json)은 7,370개 파일과 upstream에 없는 선택 변형 292개의 기록이다. commit·source·파일별 bytes/SHA-256·missing을 포함하며 import timestamp 필드는 없다. 현재 pack과 겹치는 4,386개는 모두 기존 해시와 일치하지만, 현재 262개는 그 목록에 없다. 또한 과거 목록에는 현재 제거한 파일도 있어 current golden 역할로 사용하지 않았다.

역사 JSON과 원본 경로·해시는 변경하지 않는다. 새 [pokeapi-runtime-assets.json](manifests/pokeapi-runtime-assets.json)은 기준 HEAD의 전체 Git blob 4,648개에 대해 상대 경로·bytes·SHA-256을 고정한다. 모든 파일이 이미지이므로 LF/CRLF 정규화 없이 raw bytes를 비교한다. restore/verify는 golden이나 src/data를 갱신하지 않는다.

## 구조

```text
scripts/assets/pokeapi/
  common.mjs        # source allowlist, 전체 lock/golden coverage 검증
  download.mjs      # 공용 downloader의 PokeAPI 정책 wrapper
  restore.mjs       # 공용 copy-only restore 진입점
  verify.mjs        # 전체 path/bytes/SHA-256 비교
  sources.lock.json # 4,648개 URL·bytes·SHA-256
scripts/assets/lib/download.mjs      # 기존 공용 pinned/hash downloader
scripts/assets/lib/restore-files.mjs # Showdown과 공유하는 검증 후 게시
external/pokemon-ip/pokeapi/source/  # source cache, Git 제외
public/vendor/pokeapi/               # runtime generated output
```

PokéRogue의 hash·경로 검사·파일 열거·verifier를 재사용한다. Showdown의 copy-only restore는 공용 모듈로 분리했으며 source 정책은 팩별 wrapper에 유지한다. 기존 두 팩의 source lock·golden·runtime은 변경하지 않는다. 이 팩은 추가 변환 recipe나 metadata snapshot이 필요 없다.

## 명령과 복원 동작

```sh
pnpm assets:pokeapi
pnpm assets:pokeapi:verify

# 원본 runtime을 건드리지 않는 빈 output/cache 검증
pnpm assets:pokeapi --output .local-backups/pokeapi-check/online --cache .local-backups/pokeapi-check/source

# output은 비어 있어야 하며 source cache는 완전해야 한다
pnpm assets:pokeapi --offline --output .local-backups/pokeapi-check/offline --cache .local-backups/pokeapi-check/source
pnpm assets:pokeapi:verify --output .local-backups/pokeapi-check/offline
```

기본 output/cache는 저장소 기준이며 옵션 경로는 cwd 기준이다. `.data/cache`는 입력으로 읽지 않는다. 캐시는 매번 길이·hash를 검사하고 손상을 조용히 덮어쓰지 않는다. HTTP 오류·잘못된 bytes/hash·없는 offline source는 실패한다. 다운로드는 8개 병렬, 요청당 60초·최대 3회 시도다.

전체 결과를 source cache의 일시 staging에 복사하고 golden 검증 후 output의 누락 파일만 배타적으로 생성한다. 기존 정상 파일은 쓰지 않고, 손상·추가 파일이 있으면 실패한다. output/cache의 겹침·symlink와 src·scripts·docs·.git·.data 대상은 거부한다. 실패한 output은 별도 보존 위치로 옮긴 뒤 재시도한다. 일반 dev/build/test에 자동 다운로드를 추가하지 않는다.

## runtime 사용처와 authoring 경계

`src/assets/paths.ts` → `src/data/local-pokemon-sprites.ts` → `src/assets/pokemon-sprites.ts`/registry → `src/web/pokemon-image.tsx`가 전투·도감·파티·상세·영입 이미지를 제공한다. 일반/이로치·앞/뒤·GIF/PNG·일부 폼의 official artwork는 기존 metadata 선택과 fallback을 유지한다.

`src/web/catalog.ts`의 `spriteUrl`은 기존 pixel/local adapter를 직접 호출하는 registry 우회 호환 경로다. 직접 source URL을 새 UI에 넣거나 resolver를 대규모 수정하지 않는다. `src/data/form-sprite-availability.json`은 official artwork 상대 경로도 기록한다.

기존 `import-local-pokemon-sprites.ts`는 일부 runtime 생성과 src/data/local-sprite-missing 갱신·QA 기록을 수행하는 authoring 도구다. `import-selectable-forms.ts`도 같은 고정 revision을 사용하지만 게임 metadata를 바꾸는 importer다. `prune-unevolved-sprites.ts`는 별도 정리 도구다. 새 clone은 이 도구들을 실행하지 않고 위 독립 restore 명령을 사용한다. audit-battle-roster와 audit-sprite-assets는 역사 manifest의 commit을 계속 읽는다.

## pack 없음과 partial install

- **팩 전체 없음:** 일반 개발과 unit test는 허용한다. 이미지 후보가 모두 실패하면 기존 fallback/placeholder로 전환한다. 도감·파티·상세·배틀·보상/영입의 React render와 게임 진행은 유지한다. verify와 배포 readiness는 전체 누락으로 실패한다.
- **일부 파일만 존재:** 전체 absence로 취급하지 않는다. 테스트 helper가 설치된 팩을 검사하며, verify는 누락·추가·hash mismatch를 명확하게 실패 처리한다. 정상 파일 1개만 있는 실제 golden 검사에서는 matching 1, missing 4,647로 실패한다.

resolver·종/폼/방향/이로치 계약은 자산이 없어도 계속 검사한다. 디스크 존재 검사는 해당 팩 전체가 없을 때만 제외하며 다른 추적 자산 검사는 유지한다. 테스트에 downloader를 강제하지 않는다.

## 새 clone과 배포

개발 clone의 전체 설치·복원 명령은 [DEVELOPER_COMMANDS](../development/DEVELOPER_COMMANDS.md#처음-clone한-pc)를 따른다. 이 문서의 provider별 명령은 해당 팩의 독립 복구용이다. 일반 Windows 사용자는 [동봉 자산이 있는 Release ZIP](../operations/SETUP.md)을 사용한다.

`package-deploy.mjs --check`와 실제 패키징은 생성 3팩과 혼합 trainers/gimmicks/items를 포함한 6개 aggregate의 전체 path·bytes·SHA-256을 읽기 전용 검사한다. 누락·추가·불일치는 해당 팩 이름과 복원 명령을 안내하며 public 복사 전에 실패한다. 일반 production build는 팩이 없는 fallback 개발을 허용한다.

Dockerfile은 COPY 이후 build 전에 같은 --check를 실행한다. **Docker build 전에 호스트에서 전체 외부 자산을 복원해 public을 context에 포함**해야 한다. fresh clone에서 자산 없이 곧바로 Docker build하면 readiness가 실패하는 것이 의도다. Docker 내부 자동 대량 다운로드는 추가하지 않는다. 실제 Docker 이미지 빌드는 이번 검증과 구분한다.

Git 추적 해제는 공식 source·online/offline 전수 일치·clean restore·fallback·tests·build·deploy readiness가 모두 통과한 뒤에만 수행한다. runtime만 ignore하고 scripts·source lock·golden·문서는 Git에 보존한다. history rewrite나 과거 Git blob 삭제는 하지 않는다.

## 구축 당시 READY와 검증 결과 · 2026-10-23

모든 필수 조건 통과 후 runtime 4,648개를 `git rm -r --cached public/vendor/pokeapi`로 index에서만 제거했다. `/public/vendor/pokeapi/`를 ignore하고 로컬 파일 4,648개 / 89,453,521 bytes를 그대로 유지했다. 작업 전후 모든 raw SHA-256이 동일하다. 추적 해제 직후 원본 폴더의 `pnpm assets:pokeapi:verify`도 통과했다.

| 검증 | 결과 |
|---|---|
| 공식 고정 source 조사 | 단일 commit의 동일 path·Git blob 4,648개, 차이·누락 0 |
| 빈 cache 온라인 복원 | 실제 4,648개 다운로드, 89,453,521 bytes, missing/extra/mismatch 0 |
| source-only 오프라인 복원 | 격리 output을 제거하고 fetch·HTTP·socket 차단, 같은 전체 결과 |
| partial pack | 정상 1개만 놓은 실제 golden 검사: matching 1 / missing 4,647, 실패 |
| clean 환경 | 3개 generated runtime·PokeAPI source cache·.data/cache·환경 파일·node_modules 없이 시작; pnpm frozen install 독립 실행 |
| TypeScript / workspace / CSS | 통과 |
| 기본 Turbopack production build | 팩 없는 환경과 복원된 환경 모두 통과 |
| 최종 전체 unit test | 1,510개 통과, 실패 0, skip 0 |
| 복원·source lock 회귀 | 신규 PokeAPI 및 기존 두 팩 검사 15개 통과; 최종 전체 검사에도 포함 |
| 무자산 production E2E | 세 provider 포켓몬의 실제 전투와 도감·파티·상세·보상·영입 UI 4개 통과 |
| 복원 production E2E | 고유 검사 13개가 최종 모두 통과; 실패 항목 단독 재실행 포함 |
| 배포 readiness | 3개 팩 준비 후 --check 통과; 없는 팩별 이름·누락 수·복원 안내와 함께 실패 |

최초 팩 없는 전체 unit 실행은 1,509/1,510으로 기존 rocket-campaign의 보상 rollback 1개가 실패했다(338 vs 225). 해당 파일 12개 단독 재실행과 최종 복원 환경 전체 1,510개는 모두 통과했다. 보상/게임 코드는 변경하지 않았다. 새 E2E는 도감에 나타나는 두 fallback 중 상세 표시 영역을 명시해 검사하도록 locator를 수정했다. 이미지 fallback 자체나 UI 동작 변경은 없다.

격리 환경의 기존 두 팩은 별도 검증된 source cache에서 offline 재생성해 배포 검사를 준비했다. PokeAPI restore는 그 팩들과 .data/cache를 입력으로 사용하지 않는다. 원본 .data나 환경 파일을 격리 사본에 복사하지 않았다. 실제 Docker 이미지 빌드는 수행하지 않았으며 Dockerfile의 기존 --check가 이제 세 팩 guard를 사용한다.

기존 historical JSON·src/data·UI/game logic·다른 자산 pack의 파일은 변경하지 않았다. 새 scripts·source lock·golden·문서·검증 코드만 Git에 남기고 커밋·push·history rewrite는 하지 않았다.

## 다음 혼합 자산 단계

권장 순서는 **trainers → gimmicks → items → effects**다. 디렉터리 전체를 곧바로 untrack하지 않고 각 단계에서 자체 제작·외부 provider·사용자 제공 입력·고지/metadata를 먼저 분류한다.

1. trainers: 기존 source 기록과 자체 player portrait 경계를 먼저 확정하고 외부 trainer 팩만 recipe로 분리한다. 자체 제작 파일은 소스로 유지한다.
2. gimmicks: 기존 메가/테라 source manifest와 실제 사용처를 바탕으로 provider별 고정 source와 결과 hash를 정리한다.
3. items: PokeAPI·PokeSprite·PokéRogue·자체 SVG 등 제공원이 섞여 있어 provider별 recipe/source mapping을 먼저 완성한다.
4. effects: 2026-10-23 제작 확인으로 SVG 3개와 beam PNG 1개 모두 project-original/Git 유지다. restore가 필요 없다.

각 팩은 복원 구축 → 빈 cache online/offline 전체 일치 → clean 환경·fallback·build/test·deploy → READY → 같은 작업에서 해당 generated 부분만 추적 해제 순서를 따른다. 이번에 위 혼합 자산은 수정하지 않았다.

## 추적 해제 후 실제 clean clone 흐름 재검증

최종 Git index에 남은 1,912개 파일만 두 번째 새 사본으로 복사했다. 세 runtime pack·세 source cache·.data/cache·개인 환경 파일·node_modules가 없는 상태에서 `pnpm install --frozen-lockfile`을 독립 실행했다. Python 3.14.7 / Pillow 12.3.0을 확인하고 다음 **기본 명령을 온라인으로 순서대로** 실행했다. 기존 source cache나 기존 runtime 사본을 가져오지 않았다.

```sh
pnpm assets:pokerogue
pnpm assets:showdown-pokemon
pnpm assets:pokeapi
pnpm assets:pokerogue:verify
pnpm assets:showdown-pokemon:verify
pnpm assets:pokeapi:verify
node scripts/package-deploy.mjs --check
pnpm build
```

| 팩 | 복원 결과 | 누락·추가·불일치 |
|---|---|---|
| PokéRogue | 2,002개 / 39,380,518 bytes | 모두 0 |
| Showdown Pokémon | 1,393개 / 36,480,199 bytes | 모두 0 |
| PokeAPI | 4,648개 / 89,453,521 bytes | 모두 0 |

workspace·세 팩 readiness·기본 Turbopack production build까지 모두 통과했다. 원본 PokeAPI runtime의 raw bytes·SHA-256은 여전히 작업 전과 동일하며 tracked 0개 / local 4,648개다. Git diff/check 통과. 변경은 staged 상태이며 커밋하지 않았다.
