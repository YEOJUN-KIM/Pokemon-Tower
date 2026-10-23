# 혼합 runtime 자산 소유권과 독립 복원

기준 HEAD: `43aa154688a1ef31e75f175ee6bde90198caa58a`. 네 폴더의 실제 파일 561개를 조사했다. 외부 535개만 조건부 추적 해제하며 자체 제작 20개(2026-10-23 beam 제작 확인 반영), historical metadata 6개는 그대로 추적한다. runtime URL과 기존 source 기록은 변경하지 않는다.

## 실제 파일 기준 조사

| 폴더 | 전체 | 로컬 bytes | 확장자 | 작업 전 tracked | 외부 | 자체 | 미검증 | metadata | 작업 후 tracked |
|---|---:|---:|---|---:|---:|---:|---:|---:|---:|
| trainers | 199 | 1,242,442 | .json 2, .png 197 | 199 | 194 | 3 | 0 | 2 | 5 |
| gimmicks | 147 | 2,548,123 | .gif 33, .json 1, .png 113 | 147 | 146 | 0 | 0 | 1 | 1 |
| items | 211 | 1,996,666 | .json 3, .png 199, .svg 9 | 211 | 195 | 13 | 0 | 3 | 16 |
| effects | 4 | 439,668 | .png 1, .svg 3 | 4 | 0 | 4 | 0 | 0 | 4 |

JSON/SVG golden은 Git LF 바이트 기준이다. 위 로컬 bytes에는 Windows CRLF가 포함된다. 외부 PNG/GIF golden은 raw bytes 그대로다. 파일별 전체 경로·bytes·SHA-256·ownership·source revision은 단일 [current golden](manifests/mixed-runtime-assets.json)에 있으며 historical manifest를 덮어쓰지 않았다.

## Ownership

| Group | Provider | Files | Ownership | Restore | Git |
|---|---|---:|---|---|---|
| showdown-trainers | Showdown | 194 | external | READY | removed |
| showdown-gimmicks | Showdown | 146 | external | READY | removed |
| pokeapi-gimmick-items | PokeAPI | 82 | external | READY | removed |
| pokeapi-items | PokeAPI | 109 | external | READY | removed |
| pokeapi-legacy-items | PokeAPI | 2 | external | READY | removed |
| pokesprite-items | PokeSprite | 1 | external | READY | removed |
| pokerogue-items | PokeRogue | 1 | external | READY | removed |
| trainers/project-original | project | 3 | project-original | n/a | kept |
| trainers/metadata | historical / user | 2 | metadata | n/a | kept |
| gimmicks/metadata | historical / user | 1 | metadata | n/a | kept |
| items/project-original | project | 13 | project-original | n/a | kept |
| items/metadata | historical / user | 3 | metadata | n/a | kept |
| effects/project-original | project | 4 | project-original | n/a | kept |

플레이어 앞·뒤와 과거 Ash 뒷모습 시트 3개는 THIRD_PARTY의 이미지 생성 기록으로 자체 제작을 확인했다. items의 SVG 9개와 generated PNG 4개(booster-energy, 동일 bytes의 pixel-draft, loaded-dice, eject-pack)는 프로젝트 제작이다. 기존 로컬 `artifacts/reports/changes/PLAYTEST_2026_10_13.md`의 생성 기록을 확인했다. 이 기록은 Git clone에 의존하는 복원 입력으로 사용하지 않는다. effects의 neutral 변신 SVG 3개는 로컬 SVG 소스이며 `flamethrower-beam.png`는 당시 MOVE_EFFECTS_PLAN에서 사용자 제공으로 기록했지만, 2026-10-23 소유자가 직접 제작했다고 확인해 현재 project-original로 정정했다. 임의 다운로드 recipe를 만들지 않았다.

## 고정 소스

| Group | Repository | Commit | 방식 / golden bytes |
|---|---|---|---|
| showdown-trainers | YEOJUN-KIM/Pokemon-Tower | `43aa154688a1ef31e75f175ee6bde90198caa58a` | preservation-snapshot / 282,936 |
| showdown-gimmicks | YEOJUN-KIM/Pokemon-Tower | `43aa154688a1ef31e75f175ee6bde90198caa58a` | preservation-snapshot / 2,542,198 |
| pokeapi-gimmick-items | PokeAPI/sprites | `0dc105d5b12416932f29b594078282ab4be045f5` | official-upstream / 26,537 |
| pokeapi-items | PokeAPI/sprites | `a3a1432e688ea028f12c51371d5253037cb9f17b` | official-upstream / 110,768 |
| pokeapi-legacy-items | YEOJUN-KIM/Pokemon-Tower | `43aa154688a1ef31e75f175ee6bde90198caa58a` | preservation-snapshot / 2,027 |
| pokesprite-items | msikma/pokesprite | `c5aaa610ff2acdf7fd8e2dccd181bca8be9fcb3e` | official-upstream / 751 |
| pokerogue-items | pagefaultgames/pokerogue-assets | `325c7de68e6c323e12243271ea510c6b0e1b992e` | official-upstream / 292 |

공식 소스를 우선했다. PokeAPI 191개는 upstream blob SHA도 일치한다. 기존 gimmick 아이콘 82개는 기존 기록의 0dc105d 커밋과 원래 gen9/`--bag` 경로를 유지했다. 나머지 109개는 a3a1432 커밋이다. rusted-sword/shield 2개는 그 upstream 바이트와 달라 원래 PokeAPI 출처 기록을 유지하면서 프로젝트의 공개 고정 커밋을 보존 snapshot으로 사용한다. PokeSprite는 조회한 master를 c5aaa610 커밋으로 고정했고 Tera Orb는 기존 PokéRogue 고정 커밋을 유지했다.

Showdown 공식 `smogon/sprites@230bd7a051f167166065c91f8ec09ed36102eccf`의 gen5 tree 6,451개 blob과 Mega runtime을 비교한 결과 정확한 바이트 일치가 없었다. 공식 client `f49fca99f83d7b61495c45274092de0dfe7de071`도 공개 trainer PNG/Tera 파일들을 포함하지 않았다. CDN의 live URL 대신 프로젝트의 공개 `43aa1546...` 커밋을 보존 snapshot으로 사용한다. upstream에서 재빌드했다는 의미가 아니다. 이 snapshot 커밋은 원격에 보존되어야 하며 history rewrite/원격 커밋 제거 시 복원 가용성을 다시 확인해야 한다. 각 파일에 originUrl과 실제 고정 다운로드 URL을 함께 기록한다.

## Runtime 사용처와 보존한 기록

- trainers: `src/assets/paths.ts` → registry → TrainerPortrait. PlayerMirrorPortrait와 boss-dialog/CSS는 player-front/player-back을 직접 참조한다. `sources.json`, `player-front-source.json`을 보존한다.
- gimmicks: registry/pokemon-sprites가 front/back Mega PNG/GIF를 사용하고 TeraTypeIcon은 tera PNG를 사용한다. `tera/sources.json`, `docs/assets/manifests/mega-sprite-sources.json`은 historical 기록이다. 기존 188개 기록 중 현재 Mega runtime 127개만 golden에 포함된다(전체 기믹 external은 Tera 19개 포함 146개).
- items: registry → HeldItemLabel/GimmickItemIcon/AssetImage 및 run-bag/hidden-shop DTO가 기존 직접 URL을 사용한다. `form-equipment-sources.json`, `gimmick-icon-sources.json`, `trainer-equipment-sources.json`을 보존한다. 배낭·상점 일반 아이콘은 공통 AssetImage를 사용해 원본 placeholder로 대체한다.
- effects: registry의 flamethrower-beam과 변신 CSS가 사용한다. MoveVisuals는 실패한 이미지 로딩을 종료시키고 canvas 공용 입자를 유지한다. `move-effects-integration.json`의 CC0 22개는 이번 네 폴더가 아닌 `public/vendor/showdown/fx`에 있으므로 추적 정책을 변경하지 않았다.

## 명령과 안전성

Node.js 24, pnpm lockfile 설치가 필요하다. 이 세 명령은 provider 하위 그룹을 순서대로 복원한다. effects에는 외부 provider가 없어 restore 명령을 만들지 않았다.

```sh
pnpm assets:trainers
pnpm assets:trainers:verify
pnpm assets:gimmicks
pnpm assets:gimmicks:verify
pnpm assets:items
pnpm assets:items:verify
pnpm assets:mixed
pnpm assets:mixed:verify
```

각 provider를 독립 실행할 수도 있다(각각 `:verify`도 제공).

```sh
pnpm assets:showdown-trainers
pnpm assets:showdown-gimmicks
pnpm assets:pokeapi-gimmick-items
pnpm assets:pokeapi-items
pnpm assets:pokeapi-legacy-items
pnpm assets:pokesprite-items
pnpm assets:pokerogue-items
```

기본 출력은 `public/sprites`, 캐시는 `external/pokemon-ip/mixed/<group>/source`다. `--output <sprites-root>`와 `--cache <cache-root>`는 별도 검증 환경에 사용할 수 있다. `--offline`은 캐시 누락/해시 오류 시 실패하며 네트워크로 대체하지 않는다. `.data/cache`는 사용하지 않는다.

복원은 pinned source bytes 검사 → cache 안 stage → golden 검사 → 누락 경로만 exclusive copy 순서다. 기존 내용이 다르면 덮어쓰지 않는다. 자체 파일에는 쓰지 않으며 모르는 파일은 extra로 보고 실패한다. symlink/junction 출력과 보호 경로를 거부한다. 한 provider 전체가 없으면 개발 fallback을 허용하지만 metadata가 있어도 다른 provider의 존재와 혼동하지 않는다. 부분 설치는 verify와 디스크 검증 모두 실패한다. `.gitignore`는 golden 외부 파일 535개의 정확한 절대 anchored 경로만 나열하므로 새 자체 제작 파일이 숨지 않는다.

## 배포와 검증

신규 배포에서는 기존 3팩과 이번 7개 provider가 모두 완전해야 한다. `node scripts/package-deploy.mjs --check`는 누락/extra/손상 provider와 복원 명령을 보고하며 패키징 전에 실패한다. effects/플레이어/자체 도구는 별도 복원 대상이 아니다. Docker는 호스트에서 전부 복원한 뒤 COPY context에 포함한다. 컨테이너 안 자동 다운로드는 추가하지 않았다.

온라인/오프라인: 7개 provider 535파일, 2,965,509 bytes 모두 matching, missing/extra/mismatched 0. 빈 캐시에서 고정 공개 URL로 다운로드한 뒤 임시 출력물을 지우고 fetch/http/https/net을 차단해 offline 재생성을 확인했다. 원래 로컬 runtime은 삭제하지 않았다.

최종 Git 추적 파일 1,382개만 복사한 `.local-backups/mixed-assets-final`에서 기존 3팩, 신규 535개 runtime, 모든 provider source cache, node_modules, `.data`가 없는 상태로 시작했다. `pnpm install --frozen-lockfile` 후 기존 3개 복원 명령과 `assets:trainers`, `assets:gimmicks`, `assets:items`를 모두 온라인으로 실행했다. 캐시 복사나 기존 node_modules 공유 없이 전체 8,578개 / 168,279,747 bytes를 재생성했고 모든 verify의 missing/extra/mismatched는 0이다.

| 검사 | 결과 |
|---|---|
| 신규 7개 provider online → output 삭제 → network 차단 offline | 535/535, 2,965,509 bytes, 해시 100% 일치 |
| 최종 clean 전 팩 온라인 복원/verify | 기존 3팩 + 신규 7그룹, 8,578파일 통과 |
| 복원/guard 단위 회귀 | 20/20 통과 |
| 외부 전부 없는 clean full unit | 1,514/1,515; 기존 tower 재시작 보상 338 ≠ 225; 단독 4/4 재실행 통과 |
| 최종 복원 clean full unit | 1,515/1,515 통과 |
| 관련 Chrome E2E | 최종 18/18 통과 |
| TypeScript / workspace | 통과; 공식 Markdown 69개, local link 368개 |
| production build | 외부 부재 환경과 전체 복원 환경 모두 통과 |
| package-deploy --check | 10개 pack/provider 전체 해시 통과 |
| 실제 Docker image build | 이번 단계 미실행; 기존 host restore → COPY → guard 정책 유지 |

E2E는 실제 배틀 턴·트레이너 fallback·원본 플레이어 파일·Mega/Tera 실전 활성화·PC/모바일 배낭/상점·지닌 도구 장착·도감·상세·승리 보상·모집·VFX/reduced-motion·provider별 HTTP SHA를 검증했다. 기존 beam 가상 시계 오류가 사전 batch에서 1회 발생했으나 단독 및 최종 전체 E2E에서 통과했다. 게임 보상/시계 로직은 수정하지 않았다. 서버와 테스트 DB는 검증용 복사본 안에서만 실행했다. 로컬 로그는 `artifacts/mixed-assets/`에 있으며 Git clone/복원 입력이 아니다.

이전 단계 완료 당시 기록(현재 ownership은 아래 정정 참조): 전체 tracked 1,912 → 1,382 (외부 535개 제거, recipe/golden/문서/단위/E2E 5개 신규). 네 혼합 폴더 tracked 561 → 26. project-original 19개, user-provided/unverified 1개, metadata 6개 유지. 로컬 외부 runtime 535개는 그대로 유지했고 `verify all`이 통과한다. 최종 상태는 staged 변경으로 남기며 커밋하지 않았다.

## 당시 후속 조사 기록 (현재 정정은 아래 참조)

audio/BGM, fonts는 공식 소스·파일별 고지를 먼저 조사하는 한 묶음으로 진행할 수 있다. eggs/TM/event/portal은 사용자 제공·프로젝트 제작이 섞일 수 있어 provenance 조사 묶음으로 분리하는 것이 적절하다. `public/vendor/showdown/fx`의 고정 sourceRevision과 CC0 22개는 재현 가능 소규모 후보이므로 다음 조사에 함께 넣을 수 있다. 출처 불명 파일은 Git에 남기며 외부 팩 성공을 이유로 일괄 제거하지 않는다. 이번 작업에서는 이 자산들과 개인 `.data`, Git history를 변경하지 않았다.

다음 범위는 현재 디스크에서 읽기 전용으로 재확인했다. audio는 15파일 / 48,107,939 bytes(음악 기록과 sfx 설정 포함), fonts는 3파일 / 699,910 bytes, eggs는 6파일 / 4,805,699 bytes다. 기존 source 기록상 알은 사용자 제공이고 포털 README도 사용자 제공 GIF와 첫 프레임 변환 PNG라고 명시한다. TM 19개와 포털/event 3개, 미확인 Tera 초안 1개는 출처 확인 없이 자동 다운로드 대상으로 전환할 수 없다. 따라서 다음 작업은 (1) BGM·폰트·CC0 Showdown fx의 immutable source와 고지 검증 후 조건부 분리, (2) 알·TM·event/portal·초안의 사용자 제공 보존 목록 확정으로 묶는 것을 제안한다. 두 묶음을 한 작업에서 조사할 수 있지만 각 provider/ownership별 판정은 독립적으로 유지한다.

## 현재 ownership 정정 (2026-10-23)

이전 조사에서 사용자 제공/미검증으로 기록한 beam은 프로젝트 소유자의 직접 제작 확인으로 project-original이다. 현재 mixed golden에는 자체 20개 + metadata 6개가 남고 외부 535개 복원 정의는 그대로다. 위 과거 검증 수치와 당시 후속 제안은 historical 기록이다. 알·TM·portal/event·자체 BGM의 현재 판정과 tracked permissive 자산 정책은 [최종 ownership](ASSET_OWNERSHIP.md)을 따른다.

## 전체 설치/검사 통합 (2026-10-24)

개별 명령은 유지하고 전체 순차 설치 `pnpm assets:setup`과 일괄 검증 `pnpm assets:verify`를 공식 진입점으로 추가했다. 기존 3팩 다음 trainers/gimmicks/items를 처리하며 기존 URL·golden·캐시 정책을 유지한다. [개발자 명령어](../development/DEVELOPER_COMMANDS.md)를 따른다.
