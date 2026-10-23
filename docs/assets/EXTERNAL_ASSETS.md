# 외부 자산 분리 기반 · 2026-10-23

기준 HEAD: `f59ffba0b9f027bca0b141d65e4efb0327a265c7`. 이번 단계는 기존 runtime URL을 유지한 resolver·fallback·캐시 복구의 도입이다. 기존 자산 이동·복제·Git 추적 해제는 하지 않았다. 아래 분류는 동봉 고지와 기존 source record에 근거하며 새 이용 허가를 뜻하지 않는다.

## 현재 파일과 사용처

파일 수·용량에는 해당 그룹의 manifest·고지가 포함된다. 혼합 그룹은 provider별 권리를 하나로 취급하지 않는다. 새 placeholder 외 기존 표의 자산은 모두 추적 상태다.

| Provider | 현재 경로 | 분류 | 파일 / MiB | 실제 사용·코드 | source record | Git 추적 | 이동 위험 / 향후 external 위치 |
|---|---|---|---|---|---|---|---|
| PokeAPI | `public/vendor/pokeapi` | Pokémon IP | 4648 / 85.310 | 사용; pokemon-sprites / local-pokemon-sprites | `docs/assets/manifests/local-pokemon-sprites.json` | 4648/4648 | 높음; `pokemon-ip/pokeapi` |
| Showdown sprites | `public/vendor/showdown/pokemon` | Pokémon IP / 커뮤니티 그림 | 1393 / 34.790 | 사용; pixel-sprites / registry | `docs/assets/manifests/pixel-sprite-assets.json` | 1393/1393 | 높음; `pokemon-ip/showdown/pokemon` |
| PokéRogue | `public/vendor/pokerogue` | Pokémon IP / 파일별 고지 | 2002 / 37.556 | 사용; additional-animations.json → pokemon-sprites | `public/vendor/pokerogue/sources.json` | 2002/2002 | 높음; `pokemon-ip/pokerogue` |
| Showdown VFX | `public/vendor/showdown/fx` | 명시된 22개 CC0 파일 | 22 / 0.171 | 사용; move-visuals / registry | `docs/assets/manifests/move-effects-integration.json` | 22/22 | 중간; `third-party/showdown-fx` |
| Showdown / 프로젝트 제작 | `public/sprites/trainers` | 외부 트레이너 + 자체 생성 플레이어 혼합 | 199 / 1.185 | 사용; TrainerPortrait / PlayerMirrorPortrait / CSS | `public/sprites/trainers/sources.json; player-front-source.json` | 199/199 | 높음; `pokemon-ip/showdown/trainers (플레이어 제외)` |
| Showdown | `public/sprites/gimmicks` | Pokémon IP | 147 / 2.430 | 사용; pokemon-sprites / TeraTypeIcon / registry | `public/sprites/gimmicks/tera/sources.json; docs/assets/manifests/mega-sprite-sources.json` | 147/147 | 높음; `pokemon-ip/showdown/gimmicks` |
| PokeAPI / PokeSprite / PokéRogue / 자체 SVG | `public/sprites/items` | 외부 IP와 자체 제작 혼합 | 211 / 1.903 | 사용; AssetImage / GimmickItemIcon / HeldItemLabel / 서버 DTO | `같은 폴더의 *sources.json` | 211/211 | 높음; `provider별 분류 후 이동` |
| 사용자 제공 | `public/sprites/eggs` | 권리 미검증 입력 | 6 / 4.583 | 사용; egg-kinds / egg-station-menu | `public/sprites/eggs/sources.json` | 6/6 | 중간; `user-provided/unverified` |
| 사용자 제공 / 자체 SVG | `public/sprites/effects` | beam PNG와 자체 변신 SVG 혼합 | 4 / 0.419 | 사용; move-animation-plan / CSS | `docs/gameplay/MOVE_EFFECTS_PLAN.md; docs/references/THIRD_PARTY.md` | 4/4 | 중간; `원본과 자체 제작을 분리한 뒤 결정` |
| 프로젝트 제작 | `public/sprites/shop` | 과거 자체 SVG | 9 / 0.003 | 현재 직접 참조 없음; 이전 상점 미리보기 | `기존 THIRD_PARTY 직접 구현 기록` | 9/9 | 낮음; `현재 유지; 필요 시 project-original` |
| 미확인 초안 | `public/sprites/tera` | 출처 미확인 초안 | 1 / 0.675 | 현재 직접 참조 없음; normal-crown-draft.png | `확정 source record 없음` | 1/1 | 낮음; `user-provided/unverified 후보` |
| OpenGameArt | `public/audio/bgm` | 현재 재생 6개 CC0; 나머지 파일 별도 검토 | 13 / 45.874 | 현재 6개 파일 사용; music-score / game-audio / registry | `public/audio/music-sources.json` | 13/13 | 중간; `third-party/opengameart` |
| 프로젝트 제작 | `public/audio/sfx` | 합성음 음량 설정 | 1 / 0.001 | 사용; sound-design / game-audio | `public/audio/sfx/levels.json` | 1/1 | 중간; `프로젝트 설정 유지` |
| Neo둥근모 / NeoDGM | `public/fonts` | SIL OFL 1.1 | 3 / 0.667 | 사용; retro-theme CSS / Windows launcher | `public/fonts/NEODGM-LICENSE.txt` | 3/3 | 중간; `third-party/fonts` |
| Kenney | `external/third-party/kenney-impact-sounds` | 동봉 CC0 | 134 / 1.751 | runtime 미사용; 참고 음원 팩 | `pack/License.txt; docs/assets/manifests/resource-manifest.json` | 134/134 | 낮음; `third-party/kenney-impact-sounds` |
| Showdown client reference | `external/reference/showdown` | 파일별 MIT·CC0 고지 / 참고 코드 | 3 / 0.930 | 참고만 사용; 런타임 import 없음 | `원본 헤더; docs/assets/manifests/resource-manifest.json` | 3/3 | 낮음; `reference/showdown` |
| 사용자 제공 | `public/assets/items/tm` | 권리 미검증 입력 | 19 / 1.845 | 사용; tm-icon adapter | `public/assets/items/tm/README.md` | 19/19 | 중간; `user-provided/unverified` |
| 사용자 제공 | `public/images/events` | 권리 미검증 입력 | 3 / 0.554 | 사용; TeleportPortal | `public/images/events/README.md` | 3/3 | 중간; `user-provided/unverified` |
| 프로젝트 제작 | `public/assets/original` | 이번 작업의 직접 작성 SVG | 4 / 0.001 | fallback 사용; registry / AssetImage / TrainerPortrait | `외부 파일·상표·원작 그림을 사용하지 않은 기하 SVG` | 0/4 | 낮음; `현재 유지` |

PokeSprite는 trainer-equipment-sources.json의 다이맥스밴드 아이콘 제공원이다. PokéRogue 테라스탈오브와 제공원이 다르다. Pokémon 울음소리는 등록·배포한 파일이 없으며 registry는 null을 반환한다. 자체 제작 범위는 CSS/SVG·Web Audio 합성 및 source record에 생성 과정이 있는 플레이어 이미지다. 사용자 제공 알·TM·포탈·불꽃 PNG는 자체 제작물로 재분류하지 않는다.

## 사용하지 않는 음악의 출처 범위

BGM 폴더는 13개 파일이지만 현재 registry가 재생하는 것은 서로 다른 6개다. 그 밖의 reward-victory.mp3·villain-rpg.mp3는 현재 source record의 파일과 SHA-256이 같다. champion-orchestra.mp3·elite-metal.wav·trainer-rock.mp3·trainer-rpg.mp3·villain-dark-rock.mp3 다섯 파일은 현재 music-sources.json의 해시와 일치하지 않는다. 이 다섯 파일의 권리·현재 용도를 CC0라고 일괄 확정하지 않으며 과거 반입 기록 재확인 대상으로 남긴다. 이번에는 삭제·이동·manifest 재작성하지 않았다.
## 원본·runtime·Git 경계

`external/`은 향후 원본 보관, `public/assets/external-generated/`는 검증한 복사·변환 결과의 웹 제공 위치다. 실제 브라우저 URL은 public 아래에 있어야 한다. 현재 배포 스크립트는 기존 public 전체를 제공하므로 경로 이동을 먼저 실행하지 않는다.

- Pokémon IP: 새 external/pokemon-ip 원본과 새 generated runtime 위치만 ignore. 기존 public 자산은 유지. 자동 다운로드·출처·해시·수정/누락 목록·배포와 새 clone 복구까지 확인한 그룹만 추적 해제 후보로 삼는다.
- 명시적 제3자: 기존 CC0 음악·Kenney와 OFL 폰트·파일별 CC0 효과는 고지와 출처를 보존하는 조건으로 Git 유지 가능. source record와 라이선스 파일을 원본과 함께 취급한다.
- 자체 제작: 일반 소스와 함께 추적. 이번 placeholder 네 개는 직접 작성한 SVG다.
- 미검증: 새 user-provided/unverified 원본은 ignore. 현재 사용하는 파일을 이번에 제거하지 않으며 확인 전 권리를 추정하지 않는다.

기존 [manifest](README.md)·[THIRD_PARTY](../references/THIRD_PARTY.md)·public 내부 sources.json이 기준이다. 새로운 provider manifest는 만들지 않았다. 원본 JSON의 과거 날짜·해시는 수정하지 않는다.

## resolver와 누락 처리

`src/assets/registry.ts`가 포켓몬·트레이너·아이템·VFX·메가/테라 아이콘·BGM·cry를 제공한다. provider 디렉터리는 paths.ts에 두며 포켓몬 폼/방향/이로치 해석은 pokemon-sprites.ts가 담당한다. 기존 web/pokemon-image의 함수 export는 호환을 위해 유지한다. 파일 시스템·DB·React를 registry에 넣지 않는다.

| 유형 | 이번 적용 | 누락 동작 |
|---|---|---|
| Pokémon | 기존 species/form/방향/이로치 resolver를 React에서 분리 | GIF→해당 PNG 등 기존 후보 순서 유지; 모두 실패하면 호출자의 기존 fallback 또는 자체 placeholder |
| Trainer | TrainerPortrait | 자체 generic trainer SVG; 그것도 실패하면 접근성 이름을 가진 ? 표시 |
| Item / gimmick | HeldItemLabel·도구 선택·GimmickItemIcon·테라 버튼 | AssetImage가 자체 item/gimmick SVG로 교체; 그것도 실패하면 이미지 영역만 생략 |
| Move VFX | MoveVisuals / move-animation-plan | 오류·5초 타임아웃은 null; 가능한 중립 Canvas/beam 동작 유지, 없는 입자는 생략. 전투 결과·HP 처리 불변 |
| BGM | music-score / game-audio | 파일 오류는 voice를 해제하고 무음. autoplay 거절은 사용자 제스처 후 재시도 가능. 자체 결과 합성곡 유지 |
| Cry | game-audio | 미등록은 요청 자체를 하지 않고 무음; 향후 등록 파일도 오류 시 정지 |
| Font | 기존 CSS | font-display: swap·monospace 대체 유지 |

서버 DTO의 item 경로, TM/포탈 adapter, 알·플레이어 CSS와 일부 SVG 직접 경로는 이번 범위에서 유지한다. 모든 직접 경로가 제거된 상태는 아니다. 기존 경로 전수 파일 검사는 retained asset pack 무결성 검사이며, 자산을 제거하는 후속 단계에서는 별도의 경량 fixture 기반 검사와 선택 pack 검사로 나눠야 한다.

## importer cache 복구

scripts/lib/source-cache.mjs는 provider·URL·revision·cachePath를 명시한다. 기존 캐시를 우선 읽고 ENOENT일 때만 공식 source를 요청한다. HTTP 오류·빈 응답은 저장하지 않으며 부모 폴더를 재귀 생성한다. 권한 오류 등은 캐시 미존재로 숨기지 않는다. PokeAPI master는 기존 동작을 유지하는 명시적 가변 revision이고 Showdown 목록은 live directory다. 알려진 pinned sprite revision은 기존 importer/manifest에 그대로 둔다. CSV revision 변경은 콘텐츠 재검토와 함께 별도 수행한다.

| 도구 | 변경 | 비쓰기 처리 검사 |
|---|---|---|
| import-mega-assets.mjs | pokemon.csv 다운로드 fallback | --check-sources |
| import-paldea-trainer-sprites.mjs | 공식 트레이너 목록 다운로드 fallback | --check-sources |
| prune-unevolved-sprites.ts | forms/pokemon.csv 다운로드 fallback | --check-sources; 삭제/스캔 전에 종료 |
| import-selectable-forms.ts | forms의 CSV 경로로 읽기·쓰기 통일 | --check-sources |
| import-ability-descriptions.mjs | 실제 cache/import 부모 생성으로 수정 | --check-sources |

--check-sources는 cache만 읽거나 채운 후 종료하며 src/data·public·artifacts를 쓰지 않는다. 실제 importer 실행은 기존처럼 게임 데이터를 재생성할 수 있다. 이번 검증은 빈 임시 cwd에서 모의 공식 응답을 사용하고 두 번째 실행은 네트워크를 금지했다. 실제 upstream 전체 다운로드·재생성을 수행했다는 의미가 아니다.

## 이동 판단과 다음 순서

기반 도입 단계에서는 이동하지 않았으며, 후속 비런타임 자료 이동 결과는 아래에 기록한다. 역사 manifest는 다운로드 당시 경로를 그대로 보존한다.

1. runtime 미사용 Kenney·Showdown reference의 위치 정리를 완료했다. 두 그룹은 명시된 고지와 함께 Git 추적을 유지한다.
2. pinned revision·709개 반입 기록과 변환기가 있는 PokéRogue를 작은 파일럿으로 검증한다. 개별 이용 고지·변환 도구·누락 처리·업데이트·오프라인/온라인 복구를 먼저 확인한다.
3. Showdown/PokeAPI sprite를 각각 독립 pack으로 생성하는 명령과 해시 검증을 만든 뒤 대규모 runtime 경로를 전환한다. Showdown live 파일은 pinned snapshot 전략이 필요하다.
4. CC0 VFX·음악·OFL 폰트는 추적 유지가 가능하므로 급히 제거하지 않는다. 사용자 제공 파일은 별도 provenance 검토를 우선한다.

pokemon-showdown@0.11.11은 Dex·BattleStream·TeamValidator·배틀 계산의 핵심 npm 의존성이다. external로 이동하거나 package.json·lockfile을 변경하지 않았다. 이 계층은 그림·소리 누락만 다루며 엔진·게임 콘텐츠 JSON까지 없어진 상태의 실행을 보장하는 것은 아니다.

## 검증 결과

- 격리 사본의 저장소 기본 Next.js 16.3.8 Turbopack production build 통과. Webpack 대체 시도는 기존 Showdown default-import interop에서 실패했으며 최종 검증은 프로젝트 기본 빌드 방식을 사용했다.
- TypeScript, 관련 단위 검사 51개, workspace 검사와 CSS 구조 검사, git diff --check 통과.
- Chrome 3개 통과: PC 1280px·모바일 390px의 정상 기술 10종/양방향/즉시 스킵, 모든 vendor·sprites·audio·font 요청을 404로 차단한 실제 배틀 한 턴과 도감·generic trainer·테라 아이콘 fallback.
- hydration 전에 끝난 이미지 오류도 onError만 기다리지 않고 complete/naturalWidth를 확인해 복구한다. 게임 소스의 기존 custom Pokémon fallback은 그대로 유지한다.
- importer 5개는 실제 --check-sources 진입점을 임시 빈 cwd에서 실행해 캐시 생성 후 네트워크 금지 재실행까지 통과했다. HTTP 404·빈 응답은 캐시에 기록하지 않는 검사도 통과했다. 전체 실제 upstream 재다운로드는 실행하지 않았다.
- 원래 .data 파일 13,971개의 크기·수정시각·존재가 그대로다. 기존 public·vendor 자산, 공식 manifest, package.json·lockfile·스키마·migration의 diff는 없다. 기존 자산 추적 해제·파일 이동·커밋·푸시는 하지 않았다.

## 비런타임 자료 이동 · 2026-10-23

이동 기준 HEAD: `beacecfb1d04abe60395632ffb07eae6a17f5b5a`.

| 다운로드 당시 경로 | 현재 기준 위치 | 보존 정책 |
|---|---|---|
| `vendor/kenney-impact-sounds/` | `external/third-party/kenney-impact-sounds/` | 134개 파일 전체 보존; 원본 ZIP·130개 OGG·CC0 License.txt·URL 바로가기 포함; Git 유지 |
| `vendor/showdown-reference/` | `external/reference/showdown/` | 원본 TS 2개와 README 보존; MIT·CC0 헤더 및 고정 revision 유지; Git 유지 |

`manifests/resource-manifest.json`은 2026-10-04의 역사 스냅샷이므로 경로·bytes·sha256·integrated를 덮어쓰지 않았다. 기록을 현재 파일에 대조하려면 위 접두사 매핑을 적용한다. Showdown TS의 Git 원본 bytes/hash는 이 스냅샷과 일치한다. Windows checkout의 CRLF로 로컬 bytes/hash는 다를 수 있어, 이번 이동 무결성은 **이동 직전 로컬 파일의 SHA-256**과 비교하고 Git 원본 해시도 별도로 대조했다. Showdown README는 이동에 맞춰 상대 경로만 수정했다.

프로젝트 전체 검색에서 두 그룹의 runtime import·빌드 입력·scripts·tests 참조는 없었다. tsconfig는 src/tests/e2e만 포함하고, Next standalone 및 package-deploy는 실행 의존성과 public을 배포한다. Docker builder의 COPY . .에는 포함되지만 runner에는 이 참고 자료를 복사하지 않는다. 두 그룹 외에 vendor의 내용은 없어서 이동 후 빈 루트 vendor 폴더를 제거했다. public/vendor는 별개이며 변경하지 않았다. ignore 규칙 수정은 필요 없다.

현재 안내는 이 문서·MOVE_EFFECTS·THIRD_PARTY·assets README·external README들로 갱신했다. importer·tests·역사 manifest의 경로 수정은 필요하지 않았다.

이동 후 검증: Git 추적 목록만 복사한 격리 사본에서 기존 vendor와 사용자 .data 없이 시작했다. 의존성은 기존 node_modules 설치를 공유했으므로 의존성 재설치까지 검증한 것은 아니다. TypeScript, 전체 단위 테스트 1,495개(0 실패), asset registry 검사, workspace 65개 Markdown/338개 링크, CSS 검사, 기본 Turbopack production build, package-deploy --check, Chrome E2E 3개(외부 자산 누락·PC/모바일 전투 연출)가 통과했다. external README의 상대 링크 8개도 별도 확인했다. Windows junction/브라우저 실행은 확장 권한으로 검증했다. 원본 .data는 검증에 사용하지 않았으며 별도 비교했다. 이동 원본 137개 중 README를 제외한 136개는 이동 전 로컬 SHA-256과 일치한다.

### 다음 PokéRogue 단계의 진입 조건

- 고정 assets revision `325c7de68e6c323e12243271ea510c6b0e1b992e`와 sources.json의 원본 URL·atlas hash·결과 GIF hash가 있다. PNG 및 원본 texture 전체를 포괄하는 검증 목록은 추가로 필요하다.
- 기존 import-additional-animations.ts는 다운로드·atlas 변환을 구현했지만 현재 resolver가 정적 이미지로 판단한 view만 처리한다. 따라서 기존 애니메이션이 메타데이터에 남고 파일만 없는 새 clone을 완전히 복원하는 명령으로는 부족하다.
- importer는 Showdown 조회·src/data 수정·QA 출력도 함께 하며 credits는 가변 beta를 참조한다. provider 단독 복원, 변환기/Pillow 버전, credits 고정, 네트워크 재다운로드와 오프라인 재복원 검증을 먼저 준비해야 한다.
- public/vendor/pokerogue URL은 현재 유지 중이다. external 원본에서 runtime public 경로를 생성하는 전용 명령·빌드/패키징 연동은 아직 없다.

다음 작업 대상으로는 적절하나 **즉시 이동하거나 Git 추적을 해제할 준비가 끝난 상태는 아니다**. 단독 복원·전체 파일 해시·새 clone 생성/배포 검증을 먼저 구현한다. 이번에는 네트워크 원본 생존 여부를 직접 재검증하거나 PokéRogue 파일을 변경하지 않았다.

## 직접 경로 검색 목록

아래는 실제 자산 URL literal이 남은 src 파일을 검색한 목록이다. provider 이름만 등장하는 Showdown 엔진 import는 자산 참조와 구분한다.

| 파일 | 분류 |
|---|---|
| `src/assets/paths.ts` | 중앙 adapter 경로 |
| `src/data/additional-animations.json` | 간접 참조: runtime 메타데이터 |
| `src/data/egg-kinds.ts` | 직접 참조/기존 adapter (점진적 후속 대상) |
| `src/data/local-pokemon-sprites.ts` | 직접 참조/기존 adapter (점진적 후속 대상) |
| `src/data/pixel-sprites.ts` | 직접 참조/기존 adapter (점진적 후속 대상) |
| `src/server/hidden-shop.ts` | 직접 참조/기존 adapter (점진적 후속 대상) |
| `src/server/run-bag.ts` | 직접 참조/기존 adapter (점진적 후속 대상) |
| `src/web/asset-image.tsx` | 직접 참조/기존 adapter (점진적 후속 대상) |
| `src/web/battle-game.tsx` | 직접 참조/기존 adapter (점진적 후속 대상) |
| `src/web/egg-station-menu.tsx` | 직접 참조/기존 adapter (점진적 후속 대상) |
| `src/web/game-audio.ts` | 직접 참조/기존 adapter (점진적 후속 대상) |
| `src/web/gimmick-item-icon.tsx` | 직접 참조/기존 adapter (점진적 후속 대상) |
| `src/web/held-item-label.tsx` | 직접 참조/기존 adapter (점진적 후속 대상) |
| `src/web/move-animation-plan.ts` | 직접 참조/기존 adapter (점진적 후속 대상) |
| `src/web/move-visuals.tsx` | 직접 참조/기존 adapter (점진적 후속 대상) |
| `src/web/music-score.ts` | 간접 참조: registry + 출처 주석 |
| `src/web/player-mirror-portrait.tsx` | 직접 참조/기존 adapter (점진적 후속 대상) |
| `src/web/pokemon-image.tsx` | 직접 참조/기존 adapter (점진적 후속 대상) |
| `src/web/portal-effects.ts` | 직접 참조/기존 adapter (점진적 후속 대상) |
| `src/web/styles/gimmick-theme.module.css` | 직접 참조: CSS (이번 단계 유지) |
| `src/web/styles/retro-theme.module.css` | 직접 참조: CSS (이번 단계 유지) |
| `src/web/tera-type-icon.tsx` | 직접 참조/기존 adapter (점진적 후속 대상) |
| `src/web/tm-icon.tsx` | 직접 참조/기존 adapter (점진적 후속 대상) |
| `src/web/tool-voucher-dialog.tsx` | 직접 참조/기존 adapter (점진적 후속 대상) |
| `src/web/tower-shop.tsx` | 직접 참조/기존 adapter (점진적 후속 대상) |
| `src/web/trainer-portrait.tsx` | 직접 참조/기존 adapter (점진적 후속 대상) |
