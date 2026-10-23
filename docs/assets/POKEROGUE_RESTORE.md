# PokéRogue 팩 독립 복원

추적 해제 기준 HEAD: `71a9f17480e8b82b9a4a9c52d38ed68e48d49bbb`. `public/vendor/pokerogue/` 전체는 Git index에서 제거하고 ignore한다. 기존 PC의 로컬 파일과 runtime URL은 유지한다. 새 clone에는 이 팩이 없으므로 아래 명령으로 복원한다. Node.js 24 이상이 필요하다.

## 팩과 사용처

| 항목 | 수량 |
|---|---:|
| 전체 / Git 추적 파일 | 2,002 / 0 |
| 전체 크기 | 39,380,518 bytes (37.556 MiB) |
| GIF / PNG | 각각 997 |
| JSON | 1 (`sources.json`) |
| Markdown / TOML / TXT | 3 / 2 / 2 |
| runtime metadata에 참조된 이미지 | 1,458 |
| 현재 metadata에 참조되지 않는 이미지 | 536 |

참조 수는 `src/data/additional-animations.json`에 기록된 GIF·PNG URL 기준이며 실제 플레이 중 모두 요청한다는 뜻은 아니다. 미참조 파일도 golden 팩의 일부로 복원하며 삭제하지 않는다. 8개 metadata/고지 파일은 이미지 HTTP 요청과 구분한다. [전체 manifest](manifests/pokerogue-runtime-assets.json)의 `usage` 필드에서 파일별 분류를 확인할 수 있다.

현재 runtime 연결은 `src/assets/registry.ts` → `src/assets/pokemon-sprites.ts` → additional-animations.json 및 `src/web/pokemon-image.tsx`의 호환 API다. 해당 JSON만 PokéRogue URL을 직접 기록하며 src/data는 이번에 변경하지 않았다. tests/pokemon-image.test.ts는 resolver를 항상 검사하고 설치된 팩의 실제 파일도 검사한다. PokéRogue 디렉터리 전체가 없으면 해당 팩의 디스크 검사만 제외하며 부분 설치는 실패한다. scripts/import-additional-animations.ts는 기존 authoring 도구이며, 과거 조사 문서의 main/beta 링크는 역사 기록이다.

## 고정 source와 크레딧

- Assets repository: `pagefaultgames/pokerogue-assets`.
- Revision: `325c7de68e6c323e12243271ea510c6b0e1b992e`.
- Source base: `https://raw.githubusercontent.com/pagefaultgames/pokerogue-assets/325c7de68e6c323e12243271ea510c6b0e1b992e/`.
- Credits는 별도 repository `pagefaultgames/pokerogue`에 있다. 현재 CREDITS.md와 SHA-256이 같은 커밋 `9a63ce6e66709e02d15f0dca62b3a247d6878fce`를 찾아 고정했다. 이는 assets commit과 같은 커밋이라는 의미가 아니다.
- Credits SHA-256: `7eff2419be245d6a13d60e5efb035f834e3efd1e470914658932337abf7a6770`.
- 기존 runtime sources.json의 beta credits URL은 당시 기록으로 유지한다. 새 복원은 pack.json과 sources.lock.json의 고정 URL만 사용하며 main/master/beta 및 Showdown을 요청하지 않는다.

기존 sources.json의 imported 709개 중 PokéRogue 기록은 697개, Showdown 기록은 12개다. 나머지 PokéRogue 300쌍의 원본 경로는 방향·이로치·키를 바탕으로 해당 고정 tree의 atlas에 매핑한 뒤 전체 출력 해시로 검증했다. 기록이 없다는 이유로 파일을 제외하지 않았다.

## 경로와 역할

```text
scripts/assets/pokerogue/
  restore.mjs          # 독립 orchestration / 검증 후 출력
  download.mjs         # pinned source와 캐시 검증
  convert.py           # 기존 변환 알고리즘을 분리한 공용 변환기
  verify.mjs           # 전체 결과 비교
  common.mjs
  pack.json            # 997개 이미지 쌍 recipe와 metadata 생성 방법
  sources.lock.json    # 2,000개 upstream 입력의 URL·크기·SHA-256
  snapshots/
    README.md          # 프로젝트에서 작성했던 팩 설명의 고정본
    sources.json       # 과거 반입 기록의 고정본
external/pokemon-ip/pokerogue/source/  # 원본 source 캐시, Git 제외
public/vendor/pokerogue/               # 현재 runtime URL을 유지하는 결과
docs/assets/manifests/pokerogue-runtime-assets.json  # 공식 golden 검증 기준
```

원본 보관과 재사용 캐시는 external의 단일 source 경로로 통합한다. 기존 .data/cache/import/animation-reaudit는 읽거나 변경하지 않으며 같은 데이터를 별도로 복제하지 않는다. `--cache`로 빈 임시 캐시를 지정할 수 있다. source 캐시의 assets/에는 atlas 997개·texture 997개·고지 5개, credits/에는 크레딧 1개가 있다. 복원 staging은 cache/work에 잠시 만들고 성공·실패 후 제거한다.

README/sources snapshot은 이미지 복사본이 아니다. upstream만으로 재생성할 수 없는 프로젝트의 설명·과거 반입 기록을 보존하여 향후 runtime 폴더를 untrack한 뒤에도 8개 metadata를 복원한다. 원본 고지 5개와 크레딧은 pinned upstream에서 다운로드한다. snapshots와 pack/lock/manifest는 Git에 반드시 남긴다. 공식 manifest는 약 395 KiB로 검토 가능한 크기이며 명령 실행 때 덮어쓰지 않는다. 일회성 stdout/검증 로그는 공식 manifest와 구분한다.

## 요구 사항과 명령

Python 3.10 이상, Pillow **12.3.0**이 필요하다. 검증 환경은 Python 3.14.7 / Pillow 12.3.0이다. 다른 Pillow encoder 버전은 바이트 결과가 달라질 수 있으므로 명령이 명확하게 거부한다. 필요하면 사용자가 `python -m pip install Pillow==12.3.0`으로 설치한다. 스크립트는 시스템 패키지를 자동 설치하지 않는다. Python 실행 파일은 `PYTHON` 또는 `--python`으로 지정한다.

```sh
pnpm install
python -m pip install Pillow==12.3.0
pnpm assets:pokerogue
pnpm assets:pokerogue:verify
pnpm dev

# 기존 runtime은 건드리지 않고 빈 임시 output과 cache에서 온라인 복원
pnpm assets:pokerogue --output .local-backups/pokerogue-check/output --cache .local-backups/pokerogue-check/source

# source가 준비된 뒤, 비어 있는 별도 output으로 네트워크 없이 복원
pnpm assets:pokerogue --offline --output .local-backups/pokerogue-check/offline --cache .local-backups/pokerogue-check/source
pnpm assets:pokerogue:verify --output .local-backups/pokerogue-check/offline
```

모든 경로 옵션은 현재 cwd 기준이며 기본값은 저장소 기준이다. 미래 `assets:setup`에서 assets:pokerogue를 호출할 수 있지만 이번에는 전체 setup이나 build 자동 호출을 추가하지 않는다. Git 추적 해제 이후 새 clone 절차는 의존성 설치 → Python/Pillow 준비 → assets:pokerogue → verify → build/test 순서가 된다. 배포 패키징은 기존 public을 포함하므로 URL이나 배포 복사 규칙을 바꿀 필요가 없다.

## 실패와 검증 규칙

캐시를 읽을 때도 길이·해시를 확인하고 불일치는 조용히 재다운로드하지 않는다. 손상 캐시는 별도로 옮긴 뒤 온라인으로 재시도한다. 캐시가 없으면 고정 URL로 다운로드하고 HTTP 실패·빈 응답·해시 불일치를 오류 처리한다. offline에서는 source 하나라도 없으면 즉시 실패한다. 네트워크 다운로드는 최대 8개 병렬, 요청당 60초 제한·최대 3회 시도다.

새 결과 전체를 staging에서 검증한 뒤 출력한다. 기존 파일이 손상됐거나 예상 외 파일이 있으면 덮어쓰지 않고 실패하므로 해당 output을 별도로 옮겨 보존한 뒤 복원한다. 정상인 기존 파일은 쓰지 않으며 없는 파일만 배타적으로 생성한다. 게시 중 디스크 오류가 나면 일부 정상 파일만 남을 수 있고, 재실행으로 빠진 파일을 채울 수 있다. symlink output/cache는 거부한다. src/data·NPC·Showdown 조회·QA report·DB 변경은 없다.

manifest는 상대 경로·파일 수·크기·SHA-256을 모두 비교하며 누락·추가·hash mismatch를 구분한다. 텍스트 8개는 Git의 LF를 기준으로 CRLF만 정규화하며 이미지 1,994개는 원본 바이트 그대로 비교한다. PNG/GIF encoder 차이를 시각적으로 비슷하다는 이유로 허용하지 않는다. 이 기준은 현재 Git blob와 일치한다.

기존 통합 importer는 다운로드·Showdown 목록 조회·atlas 선택/변환·src/data 수정·metadata/고지 생성·QA 출력까지 수행한다. 이 동작은 별도 authoring 작업으로 유지하고, 기존 Python 진입점만 새 공용 변환기를 호출하는 호환 wrapper로 바꿨다. 복원 명령은 resolver의 현재 우선순위나 static 판정에 의존하지 않고 고정 997개 recipe를 모두 실행한다.

## 복원 체계 구축 단계의 검증 결과

- 빈 cache·빈 임시 output에서 실제 고정 upstream 2,000개를 다운로드하고 997개 atlas를 변환했다. 출력 2,002개 / 39,380,518 bytes 모두 golden과 일치했고 누락·추가·hash mismatch는 0이다.
- 위 임시 output만 제거하고 fetch가 호출되면 예외를 던지는 preload와 --offline으로 재실행했다. source 캐시만으로 같은 2,002개가 재생성됐다. 현재 정상 runtime을 대상으로 한 기본 pnpm 명령도 파일을 덮어쓰지 않고 통과했다.
- 사용자의 .data·환경 파일·빌드 캐시를 복사하지 않은 격리 사본에서 원래 PokéRogue 폴더 대신 오프라인 재생성 결과를 넣었다. TypeScript·workspace·CSS·기본 Turbopack production build·package-deploy --check가 통과했다. node_modules는 기존 설치를 공유했으므로 의존성 재설치를 증명한 것은 아니다.
- 복원·검증·다운로더·registry·포켓몬 이미지·기존 source cache 관련 20개 테스트 통과. 전체 단위 테스트는 1,501개 중 1,500개 통과, 변경하지 않은 rank-rewards의 난수 흐름 검사 1개 실패였다. 해당 파일 단독 재실행은 21개 모두 통과했다. 게임 보상 코드는 수정하지 않았다.
- Chrome E2E 4개 통과: 실제 production URL에서 GIF·PNG 기준 해시 확인 1개, 외부 자산 누락 상태의 실제 전투 1개, PC/모바일 기술 연출 2개.

복원 체계 구축 당시 판단은 **READY**였으며, 현재 추적 해제 단계에서 새 clone/CI/배포의 asset 준비 순서를 적용했다. 이전 구축 단계에서는 runtime·고지·sources.json의 추적과 내용을 유지했고, 현재 단계에서 runtime 팩 전체의 추적을 해제했다. 시스템 Python/Pillow 요구 사항과 별도 보상 테스트의 비결정적 실패는 위 검증 범위와 구분한다.

## 추적 해제 이후 개발·CI·배포

`/public/vendor/pokerogue/`만 ignore한다. pack.json, sources.lock.json, snapshots/, golden manifest와 이 문서는 계속 Git에서 관리한다. 8개 metadata/고지도 snapshots와 pinned upstream으로 복원하므로 runtime 내부 예외 규칙은 없다. Git history는 변경하지 않는다. 이미 clone한 PC는 추적 해제 커밋을 받기 전에 복원 절차를 준비한다.

일반 `pnpm dev`와 `pnpm build`에는 자동 다운로드나 Python 실행을 추가하지 않는다. 팩이 없으면 이미지 후보가 실패한 뒤 기존 fallback/자체 placeholder로 전환하며 게임은 계속 진행할 수 있다. dev 시작 시 전용 누락 로그는 없으므로 현대 포켓몬 이미지가 placeholder로 보이면 먼저 위 복원 명령을 실행한다.

현재 GitHub Actions workflow는 없다. 일반 `pnpm test`는 PokéRogue 없이 실행 가능하며 resolver·fallback 및 다른 추적 자산 검사는 계속 수행한다. 자산 통합 검증과 `e2e/pokerogue-assets.spec.ts` 앞에서는 `pnpm assets:pokerogue` → `pnpm assets:pokerogue:verify`를 실행한다. 다른 테스트 전체에 다운로드를 강제하지 않는다.

배포는 팩이 필수다. `node scripts/package-deploy.mjs --check`와 실제 패키징 모두 golden manifest의 전체 경로·크기·SHA-256을 읽기 전용 검사한다. 누락·추가·불일치가 있으면 복원 명령을 안내하고 복사 전에 실패한다. Dockerfile도 build 전에 같은 검사를 실행하므로 Docker build context에 호스트에서 복원한 public 폴더를 포함해야 한다. 일반 production build는 fallback 개발을 허용하지만 배포 준비 검사는 팩 전체를 요구한다.

```sh
pnpm assets:pokerogue
pnpm assets:pokerogue:verify
node scripts/package-deploy.mjs --check
pnpm deploy:package
# Docker도 위 복원 후 docker compose build 실행
```

## 추적 해제 검증 · 2026-10-23

- 기준 HEAD `71a9f17480e8b82b9a4a9c52d38ed68e48d49bbb`에서 runtime 2,002개만 `git rm --cached`로 index에서 제거했다. 최종 tracked 0개, 로컬 2,002개다. 원본의 각 raw SHA-256·크기는 작업 전후 동일하다. Windows CRLF를 포함한 로컬 총량은 39,410,340 bytes이며, 텍스트 정규화 후 golden 기준은 39,380,518 bytes다.
- 작업 전·추적 해제 직후·최종 `pnpm assets:pokerogue:verify` 모두 2,002개 일치, 누락·추가·불일치 0이다. 복원 scripts·pack/lock·snapshots·manifest·문서·package.json·pnpm-lock.yaml은 Git에 남으며 recipe와 golden 파일은 변경하지 않았다.
- index에 남은 파일만 별도 격리 사본으로 복사했다. runtime·external source cache·.data/cache·환경 파일·node_modules 없이 시작했으며 `pnpm install --frozen-lockfile`을 독립 실행했다. 기존 node_modules junction 공유가 아니다. Python 3.14.7 / Pillow 12.3.0을 확인했다.
- 온라인은 빈 cache에서 고정 upstream 2,000개(credits 포함)를 다운로드해 빈 임시 output으로 복원했다. 997개 atlas → 2,002개 파일, 39,380,518 bytes, 누락·추가·불일치 0이다. 출력 옵션은 기본 runtime 경로를 빈 상태로 유지하여 무자산 테스트와 병행하기 위한 것이며 복원 결과는 이후 기본 runtime 경로로 옮겨 다시 검증했다.
- 오프라인은 같은 source cache와 별도의 빈 output으로 복원했다. NODE_OPTIONS preload에서 fetch·HTTP·socket 연결을 예외 처리하고 Corepack 네트워크도 비활성화했다. `pnpm assets:pokerogue --offline` 결과는 온라인과 같은 2,002개 / 39,380,518 bytes / 누락·추가·불일치 0이다. 기존 원본 runtime과 .data/cache는 사용하지 않았다.
- runtime 없는 격리 사본에서 전체 unit test **1,502개 통과**, TypeScript·workspace·CSS·기본 Turbopack production build 통과. 실제 runtime이 없는 production 서버에서 PokéRogue 사용 포켓몬의 fallback·실제 전투 한 턴 E2E도 통과했다. partial pack을 정상 설치로 취급하지 않으며 전체 manifest 검증은 별도 verify/deploy 단계가 담당한다.
- 온라인 복원 결과를 기본 runtime 경로에 배치한 뒤 verify·기본 production build·관련 unit test **30개**·Chrome E2E **7개**·package-deploy --check 통과. E2E는 GIF/PNG HTTP SHA-256, 누락 fallback 실제 전투, PC/모바일 기술 연출, reduced motion, 화염방사 순서를 포함한다. 현재 작업 폴더의 TypeScript·production build·workspace·CSS·배포 준비 검사도 통과했다.
- 처음 현재 작업 폴더 전체 테스트에서는 rocket-campaign의 보상 rollback 1개가 실패했다(1,501/1,502). 해당 파일을 포함한 단독 관련 실행 27개와 최종 격리 전체 실행 1,502개는 모두 통과했다. 게임 보상 코드는 수정하지 않았다. fallback E2E는 무작위 상대 KO에 영향받지 않도록 합법적인 Protect 전용 상대 fixture를 쓴다.
- 팩 없는 상태에서 실제 package-deploy --check가 `2002 missing`과 복원 명령을 안내하며 실패하는 것을 확인했고, 실제 패키징도 복사 전에 같은 검사를 거친다. 새 테스트는 --check와 실제 패키징 진입점 모두 무자산 상태에서 파일을 쓰지 않고 실패하는 것을 검사한다. Dockerfile에도 같은 guard를 연결했으며 실제 Docker 이미지 빌드는 이번 검증 범위에 포함하지 않았다.
- Git staged 변경은 PokéRogue runtime 삭제 2,002개뿐이다. ignore·문서·테스트·배포 준비 검사는 unstaged로 남겼고 커밋·history rewrite·push는 하지 않았다. Git diff/check 통과.

다음은 **Showdown Pokémon sprite pack의 독립 복원 체계 구축**으로 진행할 수 있다. live URL 의존성을 pinned revision 또는 검증 가능한 고정 snapshot으로 만들고 recipe·고지·전체 hash·빈 cache 온라인/오프라인 복원·fallback·배포를 먼저 검증한다. 순서는 복원 체계 구축 → READY → 별도 Git 추적 해제이며, 이번 작업에서 Showdown 자산은 변경하지 않았다.
