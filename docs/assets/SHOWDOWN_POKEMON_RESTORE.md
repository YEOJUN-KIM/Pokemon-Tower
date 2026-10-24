# Showdown Pokémon sprite pack 독립 복원

기준 HEAD: `171800c61af9d6b38b5f8b11c393e4ae865651dd`. 대상은 `public/vendor/showdown/pokemon/`뿐이다. 다른 자산 팩과 게임 데이터는 변경하지 않는다. Node.js 24 이상과 pnpm이 필요하며, 이 팩은 원본 배포 bytes를 복사하므로 Python·Pillow·이미지 encoder가 필요 없다.

## 현재 팩과 golden baseline

| 항목 | 값 |
|---|---:|
| 전체 | 1,393개 |
| GIF / PNG / Markdown | 440 / 952 / 1 |
| Git 원본 기준 bytes | 36,480,199 |
| catalog의 registry resolver가 반환하는 팩 내 경로 | 1,301개 |
| 위 catalog 열거에 나오지 않는 이미지 / 문서 | 91 / 1 |

참조 수는 catalog의 전체 species/form에 대해 앞·뒤·일반·이로치·정지·애니메이션을 열거한 후보 경로의 합집합이다. 모두 실제 화면에서 요청한다는 뜻은 아니며, 비참조 파일도 golden 팩에 포함한다. 위 후보의 누락은 0개다. README 하나가 유일한 팩 내부 metadata이고, 파일별 역사 source는 별도 manifests와 기존 importer에 남는다.

[기존 pixel-sprite-assets.json](manifests/pixel-sprite-assets.json)은 2026-10-09의 1,201개 반입 기록이다. 현재 파일과 경로가 겹치는 768개는 그 기록의 SHA-256과 일치하지만 현재 파일 625개는 그 기록에 없다. 역사 목록에는 현재 없는 파일도 있으므로 이를 덮어쓰지 않았다. 새 [golden manifest](manifests/showdown-pokemon-runtime-assets.json)는 기준 HEAD의 Git blob 1,393개 전체의 상대 경로·bytes·SHA-256이다. 복원 명령은 golden을 수정하지 않는다.

이미지 1,392개는 raw bytes 그대로 비교한다. README는 Git LF bytes를 기준으로 Windows checkout의 CRLF만 정규화해 검증한다. 온라인·오프라인 복원 파일 자체는 모두 Git blob bytes와 동일하다. 로컬 원본 보존 검사는 별도로 정규화하지 않은 SHA-256과 크기를 비교한다.

## 고정 snapshot 전략 B

기존 source는 `https://play.pokemonshowdown.com/sprites/`의 live 경로다. 이 URL에 hash만 붙여서 안정적인 복원이 보장된다고 취급하지 않는다.

공식 [smogon/sprites](https://github.com/smogon/sprites/tree/230bd7a051f167166065c91f8ec09ed36102eccf)의 고정 commit `230bd7a051f167166065c91f8ec09ed36102eccf`에서 sprite 원본 subtree를 조사했다. 현재 팩과 Git blob이 직접 일치하는 이미지 원본은 80개뿐이었다. 나머지를 그 원본과 배포 도구에서 다시 생성해 현재 SHA-256까지 일치시킬 수 있다는 증거는 확보하지 못했다. 공식 저장소의 원본·빌드 설정과 이미 제공된 배포 결과를 구분한다.

이번 복원 source는 **이미 공개된 프로젝트 baseline의 immutable Git snapshot**이다. upstream raw를 그대로 복사한다는 의미가 아니며 새로운 이미지 사본을 현 커밋에 넣지도 않는다.

- Snapshot repository: `YEOJUN-KIM/Pokemon-Tower`.
- Snapshot revision: `171800c61af9d6b38b5f8b11c393e4ae865651dd`.
- Snapshot root: `public/vendor/showdown/pokemon/`.
- 고정 raw 예: [Miraidon GIF](https://raw.githubusercontent.com/YEOJUN-KIM/Pokemon-Tower/171800c61af9d6b38b5f8b11c393e4ae865651dd/public/vendor/showdown/pokemon/gen5ani/miraidon.gif).
- `scripts/assets/showdown-pokemon/sources.lock.json`에 전체 1,393개 snapshot URL·bytes·SHA-256을 고정한다.

원래 artwork provenance는 Showdown live 반입 기록과 [THIRD_PARTY](../references/THIRD_PARTY.md), 보존한 runtime README를 따른다. snapshot repository가 그림의 원저작자라는 의미가 아니다. 엔진 MIT나 별도 효과음/이미지 CC0를 이 팩에 적용하지 않는다.

**보존 의존성:** 복원하려면 위 공개 repository와 고정 commit이 GitHub에서 계속 접근 가능해야 한다. 로컬 `.git`이나 과거 clone의 파일은 읽지 않지만 원격의 이 고정 snapshot은 사용한다. runtime 추적 해제는 이전 Git history의 자산을 지우거나 저장소 과거 크기를 줄이는 작업이 아니다. 향후 이 commit의 접근성을 없애기 전에는 전체 동일 bytes의 별도 immutable archive를 확보하고 빈 cache 온라인 복원을 검증한 뒤 source lock을 교체해야 한다. 스크립트는 snapshot 실패를 live URL로 우회하지 않는다.

## 구조와 명령

```text
scripts/assets/showdown-pokemon/
  common.mjs          # 고정 snapshot 정책·전체 coverage 검증
  download.mjs        # 팩별 URL allowlist
  restore.mjs         # download → staging verify → 누락 파일만 게시
  verify.mjs          # 전체 golden 비교
  sources.lock.json   # 1,393개 pinned source
scripts/assets/lib/download.mjs  # 두 팩의 공용 hash 검증 downloader
external/pokemon-ip/showdown/pokemon/source/  # source cache, Git 제외
public/vendor/showdown/pokemon/              # 기존 runtime URL 유지
docs/assets/manifests/showdown-pokemon-runtime-assets.json
```

기존 PokéRogue의 경로 검사·hash·파일 열거·verifier를 재사용한다. downloader는 공용 모듈로 분리하고 팩별 승인 URL 규칙은 각 wrapper에 유지했다. PokéRogue source·golden·변환 알고리즘은 변경하지 않았다. Showdown은 변환 recipe나 README snapshot 사본이 필요 없다. 전체 고정 snapshot에서 기존 README까지 직접 받는다.

```sh
pnpm assets:showdown-pokemon
pnpm assets:showdown-pokemon:verify

# 빈 output과 cache로 독립 온라인 검사
pnpm assets:showdown-pokemon --output .local-backups/showdown-check/online --cache .local-backups/showdown-check/source

# 같은 source cache, 별도의 빈 output으로 오프라인 검사
pnpm assets:showdown-pokemon --offline --output .local-backups/showdown-check/offline --cache .local-backups/showdown-check/source
pnpm assets:showdown-pokemon:verify --output .local-backups/showdown-check/offline
```

경로 옵션은 cwd 기준, 기본값은 저장소 기준이다. `.data/cache`는 읽지 않는다. cache는 읽을 때도 hash·길이를 검사하며 손상을 조용히 덮어쓰지 않는다. HTTP 실패·잘못된 hash·누락된 offline source는 실패한다. 8개 병렬, 요청당 60초·최대 3회 시도다. symlink 경로와 겹치는 cache/output 및 src·docs·scripts·.git·.data 출력은 거부한다.

결과 전체를 cache/work의 staging에서 검증한 뒤 없는 파일만 배타적으로 복사한다. 기존 runtime의 손상·추가 파일은 실패하며 사용자 편집을 덮어쓰지 않는다. 실패한 output은 별도 보존 위치로 옮긴 뒤 복원한다. `--offline`은 source cache가 완전해야 한다. 일반 실행에 downloader 자동 호출은 없다.

## 사용처와 authoring 경계

`src/assets/paths.ts` → `src/data/pixel-sprites.ts` → `src/assets/pokemon-sprites.ts`/registry → `PokemonImage`가 현재 경로를 유지한다. `src/web/catalog.ts`의 `spriteUrl`은 기존 pixel adapter를 직접 호출하므로 registry를 경유하지 않는 호환 경로다. 이번에 UI나 resolver 우선순위를 바꾸지 않았다.

기존 `import-pixel-sprites.ts`, `import-selectable-form-animations.mjs`, `import-form-equipment-assets.ts`, `import-additional-animations.ts`, `audit-pixel-sprites.ts`는 live 조사·게임 metadata 변경·추가 변환을 포함하는 authoring 도구로 남는다. `prune-unevolved-sprites.ts`는 별도 삭제 도구다. 이들은 clean clone 복원 명령이 아니다. 새 복원 명령은 src/data를 쓰지 않는다. verify-deploy·verify-container에는 기존 실제 sprite HTTP 확인도 남는다.

## 새 clone·일반 테스트·배포

개발 clone의 전체 설치·복원 명령은 [DEVELOPER_COMMANDS](../development/DEVELOPER_COMMANDS.md#처음-clone한-pc)를 따른다. 이 문서의 provider별 명령은 해당 팩의 독립 복구용이다. 일반 Windows 사용자는 [동봉 자산이 있는 Release ZIP](../operations/SETUP.md)을 사용한다.

일반 unit test와 기본 build는 팩 전체가 없는 상태를 허용한다. 테스트는 resolver·폼·방향·이로치 계약을 항상 검사하고, 팩 디렉터리가 전혀 없을 때만 그 팩의 디스크 검사를 제외한다. 부분 설치와 다른 추적 자산의 누락은 계속 검사하며 전체 pack 무결성은 verify로 확인한다. 이미지 후보가 모두 실패하면 기존 fallback/placeholder로 넘어가며 게임 전투는 계속 진행한다. dev에 자동 다운로드나 별도 의존성 설치는 추가하지 않는다.

asset integration/E2E 전에는 필요한 팩을 복원한다. 현재 GitHub Actions workflow는 없다. `package-deploy.mjs --check`와 실제 패키징은 이 팩을 포함한 외부 runtime 6개 aggregate 전체 hash를 읽기 전용 검사하고, 누락·추가·불일치가 있으면 해당 복원 명령을 안내하며 복사 전에 실패한다. 기존 Dockerfile의 --check도 같은 정책을 사용한다. Docker context는 호스트에서 복원한 public을 포함해야 한다. 일반 build의 fallback 허용과 완전한 자산을 요구하는 배포 검사는 구분한다.

Git 추적 해제는 온라인·오프라인 전체 일치와 clean 환경·fallback·build/test 검증이 모두 통과한 뒤에만 수행한다. runtime만 ignore하고 scripts·source lock·golden·문서는 Git에 유지한다. 기존 역사 manifest와 다른 자산 pack은 변경하지 않는다.

## 구축 당시 READY 및 추적 해제 기록 · 2026-10-23

모든 READY 조건 통과 후 `git rm -r --cached public/vendor/showdown/pokemon`으로 추적을 해제했다. ignore는 `/public/vendor/showdown/pokemon/`이다. scripts·source lock·golden·문서는 Git에 보존하고 로컬 원본 1,393개는 유지한다. 작업 전후 raw 총량은 36,480,210 bytes(README의 Windows CRLF 포함)이며 모든 raw SHA-256이 동일하다. Git LF golden·복원 결과 총량은 36,480,199 bytes다.

`env.download`는 시작 당시 이미 로컬에서 삭제돼 있었으며 Git 추적 코드·문서에서 사용처가 없었다. index에서도 제거하고 정확히 `/env.download`만 ignore해 재반입을 방지했다. 다른 환경 파일은 변경하지 않았다.

검증: runtime·source cache·.data/cache·환경 파일·node_modules가 없는 사본에서 `pnpm install --frozen-lockfile`을 독립 실행했다. 기존 의존성 junction을 공유하지 않았다.

| 검증 | 결과 |
|---|---|
| 빈 cache 온라인 복원 | 고정 공개 snapshot 1,393개 실제 다운로드; 36,480,199 bytes; missing/extra/mismatch 0 |
| source cache만 남긴 오프라인 복원 | 임시 온라인 output과 runtime을 제거하고 fetch·HTTP·socket을 차단해 재실행; 동일 1,393개·bytes·hash |
| 전체 팩이 없는 환경의 unit test | 1,506개 통과, 실패 0 |
| 원본 설치 자산 관련 unit test | 93개 통과; PokéRogue 공용 downloader 회귀 포함 |
| TypeScript / workspace / CSS | 통과 |
| 기본 Turbopack production build | 팩 없는 사본 및 복원 사본 모두 통과 |
| 팩 없는 production 서버 | PokéRogue·Showdown 사용 포켓몬 각각 fallback과 실제 전투 한 턴 E2E 통과 |
| 복원된 production 서버 | GIF/PNG HTTP hash, Showdown GIF→PNG fallback, PC/모바일 기술·reduced motion·화염방사 E2E 통과 |
| 배포 준비 | 두 팩 정상 시 --check 통과, 팩 누락 시 팩별 복원 안내와 함께 실패 |

E2E는 고유 검사 10개가 최종적으로 모두 통과했다. 신규 자산 E2E fixture에서 인증·튜토리얼과 현재 검색 접근성 이름을 반영했다. 기존 화염방사 clock 검사는 한 차례 `Cannot fast-forward to the past`로 실패했지만 파일 변경 없이 단독 재실행은 통과했다. 게임·타이밍 코드를 바꾸지 않았다.

배포 전제인 PokéRogue는 격리 환경에 별도로 기존 검증된 source cache에서 offline 재생성했다. Showdown 복원은 이 팩이나 .data/cache를 입력으로 사용하지 않는다. 실제 Docker 이미지 빌드는 이번 검사에 포함하지 않으며 기존 Dockerfile의 --check가 새 두 팩 guard를 실행한다.

당시 후속 계획은 PokeAPI 복원·검증·추적 해제였으며 현재는 [PokeAPI 복원](POKEAPI_RESTORE.md)으로 완료했다. 기존 고정 source manifest를 조사하고 현재 전체 팩과의 coverage·byte 일치를 먼저 확인한다. 이번 작업에서 PokeAPI와 다른 자산 pack은 변경하지 않았다. 커밋·push·history rewrite는 하지 않았다.

추적 해제 후에는 최종 Git index의 6,549개 파일만 두 번째 새 사본으로 복사했다. Showdown runtime·source cache·.data/cache·env.download·node_modules가 없음을 확인한 뒤 `pnpm install --frozen-lockfile` → `pnpm assets:showdown-pokemon` → `pnpm assets:showdown-pokemon:verify` → workspace → 기본 Turbopack production build를 다시 모두 통과했다. 이 두 번째 온라인 복원도 1,393개 / 36,480,199 bytes / missing·extra·mismatch 0이었다. 원본 폴더의 추적 해제 후 verify와 두 팩의 package-deploy --check도 통과했다. 최종 원본 tracked 0개·local 1,393개·raw hash 불변을 확인했다.
