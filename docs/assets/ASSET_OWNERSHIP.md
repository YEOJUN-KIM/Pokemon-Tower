# 최종 자산 ownership과 Git 정책

기준 HEAD: `a71393c671da0b1c6677d86d384bc340bc0f99ba`. 확인일 2026-10-23. 소유자의 직접 제작 확인을 파일별 디스크·SHA-256·기존 provider 기록과 대조했다. 폴더 전체를 일괄 자체 제작으로 판정하지 않았다. 바이너리 파일·runtime URL·게임 동작은 변경하지 않는다. 이번 단계 추가 Git 제거는 0개다.

## 최종 정책

| Category | Provider/Owner | 실제 자산 수 | Git | Restore |
|---|---|---:|---|---|
| Pokémon runtime | PokéRogue / Showdown / PokeAPI | 2,002 / 1,393 / 4,648 | 제외 | 기존 3명령 |
| trainers external | Showdown | 194 | 제외 | assets:trainers |
| gimmicks external | Showdown | 146 | 제외 | assets:gimmicks |
| external items | PokeAPI / PokeSprite / PokéRogue | 195 | 제외 | assets:items |
| player portraits | project | 3 | 유지 | 없음 |
| project items | project | 13 | 유지 | 없음 |
| eggs | project | 5 PNG + historical JSON 1 | 유지 | 없음 |
| TM | project | 18 PNG + README 1 | 유지 | 없음 |
| portal/event | project | GIF 1 + PNG 1 + README 1 | 유지 | 없음 |
| effects | project | SVG 3 + beam PNG 1 | 유지 | 없음 |
| project BGM | project | 5 | 유지 | 없음 |
| OpenGameArt BGM | external / CC0 | 8 files / 6 unique recordings | 유지 | 없음 |
| fonts | NeoDGM / OFL-1.1 | 2 fonts + notice 1 | 유지 | 없음 |
| Showdown VFX | external / CC0 | 22 PNG | 유지 | 없음 |
| original fallbacks / legacy shop SVG | project | 4 / 9 | 유지 | 없음 |
| title/reference/branding images | project (GPT generated) | 3 | 유지 | 없음 |

현재 ownership/사용처/bytes/extension/tracked/출처는 단일 [remaining runtime inventory](manifests/runtime-ownership.json)에 파일별로 있다. `bytes`/SHA는 JSON·SVG·문서의 LF canonical 기준이며 실제 디스크 바이트는 `diskBytes`다. 기존 [mixed golden](manifests/mixed-runtime-assets.json)의 자체 제작 20개·metadata 6개는 reference로 재사용한다. 이번 inventory의 자체 제작 46개와 합해 **감사한 파일형 project-original 자산 66개**를 관리한다. CSS/TS 안의 inline SVG·합성음까지 별도 파일로 세지는 않는다. historical source JSON은 날짜·해시·반입 기록을 덮어쓰지 않았다.

## 제작 확인에 따라 정정한 31파일

이전 user-provided는 파일의 반입 경로였으며 현재 확인된 저자는 프로젝트 소유자다. current ownership은 owner=project, source=created-for-pokemon-tower, ownership=project-original이다. 기존 eggs sources.json과 music-sources.json은 historical snapshot으로 그대로 둔다. TM/portal README에는 현재 제작 확인을 추가했다.

- `public/sprites/eggs/machine.png`
- `public/sprites/eggs/normal.png`
- `public/sprites/eggs/rare.png`
- `public/sprites/eggs/shiny.png`
- `public/sprites/eggs/super-rare.png`
- `public/assets/items/tm/bug.png`
- `public/assets/items/tm/dark.png`
- `public/assets/items/tm/dragon.png`
- `public/assets/items/tm/electric.png`
- `public/assets/items/tm/fairy.png`
- `public/assets/items/tm/fighting.png`
- `public/assets/items/tm/fire.png`
- `public/assets/items/tm/flying.png`
- `public/assets/items/tm/ghost.png`
- `public/assets/items/tm/grass.png`
- `public/assets/items/tm/ground.png`
- `public/assets/items/tm/ice.png`
- `public/assets/items/tm/normal.png`
- `public/assets/items/tm/poison.png`
- `public/assets/items/tm/psychic.png`
- `public/assets/items/tm/rock.png`
- `public/assets/items/tm/steel.png`
- `public/assets/items/tm/water.png`
- `public/images/events/teleport-portal.gif`
- `public/images/events/teleport-portal.png`
- `public/audio/bgm/champion-orchestra.mp3`
- `public/audio/bgm/elite-metal.wav`
- `public/audio/bgm/trainer-rock.mp3`
- `public/audio/bgm/trainer-rpg.mp3`
- `public/audio/bgm/villain-dark-rock.mp3`
- `public/sprites/effects/flamethrower-beam.png`

## BGM 파일별 대조

13파일 중 프로젝트 제작곡 5개는 현재 registry에 연결되지 않은 보존곡이다. 이번 작업에서 재생 선택을 변경하지 않는다. 외부는 현재 사용하는 CC0 원곡 6종과 동일 bytes의 과거 복사본 2개다. 제작곡에 CC0를 적용하거나 복사본을 자체 제작으로 재분류하지 않는다.

| File | Ownership | Bytes | Source / author | Runtime |
|---|---|---:|---|---|
| champion-orchestra.mp3 | project-original | 4,646,747 | project owner / 직접 제작 확인 | retained |
| elite-metal.wav | project-original | 7,493,242 | project owner / 직접 제작 확인 | retained |
| elite-rock.wav | external | 10,667,486 | [nene](https://opengameart.org/content/unchained-destiny-rock) / CC0-1.0 | active |
| gym-battle-a.mp3 | external | 3,289,143 | [cynicmusic / Alex Smith](https://opengameart.org/content/battle-theme-a) / CC0-1.0 | active |
| gym-rpg.mp3 | external | 6,859,825 | [Cleyton Kauffman](https://opengameart.org/content/boss-battle-theme) / CC0-1.0 | active |
| rare-epic.ogg | external | 2,822,466 | [skrjablin](https://opengameart.org/content/the-final-battle) / CC0-1.0 | active |
| reward-victory-v2.mp3 | external | 1,361,839 | [cynicmusic / Alex Smith](https://opengameart.org/content/victory-theme-for-rpg) / CC0-1.0 | active |
| reward-victory.mp3 | external | 1,361,839 | [cynicmusic / Alex Smith](https://opengameart.org/content/victory-theme-for-rpg) / CC0-1.0 | retained |
| trainer-rock.mp3 | project-original | 2,893,343 | project owner / 직접 제작 확인 | retained |
| trainer-rpg.mp3 | project-original | 1,584,901 | project owner / 직접 제작 확인 | retained |
| villain-dark-rock.mp3 | project-original | 2,309,141 | project owner / 직접 제작 확인 | retained |
| villain-rpg-v2.mp3 | external | 1,406,059 | [Cleyton Kauffman](https://opengameart.org/node/51807) / CC0-1.0 | active |
| villain-rpg.mp3 | external | 1,406,059 | [Cleyton Kauffman](https://opengameart.org/node/51807) / CC0-1.0 | retained |

공식 OpenGameArt 여섯 페이지의 CC0 고지, author, exact download URL을 재확인했고 원본을 메모리로 다운로드해 SHA-256/bytes가 모두 일치함을 확인했다. 복사본 reward-victory.mp3와 villain-rpg.mp3도 원본과 같은 해시다. 원래 음악 source record의 상황 ID는 음악 파일 수와 다르며 gym/champion은 같은 파일을 공유한다.

외부 음원 8개는 합계 29,174,716 bytes(중복 포함)다. 작은 이미지보다는 크지만 CC0 출처와 정확한 원본이 확인되어 있으며, 신규 6개 다운로드·캐시·offline·배포 guard를 추가하는 비용에 비해 이번 단계의 Git 유지가 단순하다. 현재 저장소에서 원본과 고지를 직접 제공할 수 있어 배포 시 추가 네트워크 의존도 만들지 않는다. 이후 용량 정책이 달라지면 이 정확한 해시/URL을 기준으로 별도 복원 팩을 만들 수 있다.

## Font와 Showdown VFX

NeoDGM은 [공식 v1.601 release](https://github.com/neodgm/neodgm/releases/tag/v1.601)의 `neodgm.ttf`와 `neodgm.woff2` 체크섬이 로컬과 일치한다. author는 동봉 notice의 Eunbin Jeong (Dalgona.)이며 OFL-1.1 notice와 Reserved Font Name을 보존한다. 3파일 / 699,910 디스크 bytes라 Git 유지가 간단하다. woff2는 retro-theme CSS, ttf는 Windows launcher가 사용하며 runtime font package 설치는 필요 없다.

VFX는 22 PNG / 179,347 bytes이며 `smogon/pokemon-showdown-client@c0f6bfc707a5e3bba4da3785e9cb06c8ae04f8d9`의 `play.pokemonshowdown.com/fx/` 고정 URL과 전부 해시가 일치했다. [해당 revision의 파일별 고지](https://github.com/smogon/pokemon-showdown-client/blob/c0f6bfc707a5e3bba4da3785e9cb06c8ae04f8d9/play.pokemonshowdown.com/src/battle-animations.ts)는 이 fx 이미지에 CC0를 명시하며 예외 이미지(icicle/lightning/bone/rocks/rock1/rock2)는 현재 22개에 없다. 개별 PNG 작가명은 고지에 명시되지 않아 upstream contributors로 출처를 기록하고 작가를 임의 추정하지 않았다. registry→move-animation-plan→MoveVisuals가 실제 22개를 preload/사용한다. 작고 재배포 고지가 명확하므로 Git 유지가 복원 시스템 추가보다 단순하다.

## 제목/브랜딩 확인과 삭제된 초안 (2026-10-24)

`public/art/title/title-reference.gif`, `title-reference-still.png`, `public/branding/pokemon-tower-original.png`는 소유자가 GPT로 프로젝트용으로 생성했다고 확인했다. ownership은 project-original, source는 generated-for-pokemon-tower다. 원본 파일을 유지하고 branding PNG는 EXE icon build 입력으로도 사용한다.

`public/sprites/tera/normal-crown-draft.png`는 소유자가 삭제했으며 실제 파일이 없어 현재 inventory에서 제외했다. 다시 생성하거나 다운로드하지 않는다. 이전 미확인 판정은 historical 기록이며 현재 불명확 자산으로 남겨두지 않는다. Kenney/Showdown 참고 자료는 기존 고지와 함께 Git 유지다.

## 기존 명령과 통합 준비

신규 명령은 추가하지 않았다. 사용자용 6개 복원 명령은 서로 다른 출력을 담당한다.

```sh
pnpm assets:pokerogue
pnpm assets:showdown-pokemon
pnpm assets:pokeapi
pnpm assets:trainers
pnpm assets:gimmicks
pnpm assets:items
```

각 명령의 `:verify`를 사용한다. mixed 하위 provider 7개 명령은 부분 복구용이며 aggregate와 동시에 중복 실행할 이유가 없다. `assets:mixed`/`:verify`는 trainers·gimmicks·items를 묶은 편의 명령이다. 효과/음악/폰트/자체 이미지는 동봉 자산이므로 새로운 restore 명령이 없다. 통합 setup은 위 여섯 aggregate를 순서대로 각 한 번 복원하고 최종 verify를 실행한다. 기존 immutable source·golden·provider cache·offline·명시적 실패 처리·배포 guard가 갖춰져 있어 **통합 setup과 verify를 사용할 수 있다**. 2026-10-24 통합 명령 assets:setup/ assets:verify를 구현했다. 현재 절차는 [개발자 명령어](../development/DEVELOPER_COMMANDS.md)를 따른다.

Git clone에는 project-original·폰트·CC0 VFX/BGM이 즉시 존재한다. 대형 외부 팩은 기존 restore를 사용한다. 새 readiness 조건은 추가하지 않았고 Docker는 기존 host restore→COPY→guard 정책을 유지한다. 개인 .data와 Git history는 변경하지 않는다.

## 이번 검증

- TypeScript, workspace docs check, production build, package-deploy --check: 통과.
- ownership/registry/mixed/audio/music/VFX/portal/egg 관련 단위 테스트: 30/30 통과.
- 관련 Chrome E2E: 10개 확인. VFX 5개, 알 PC/mobile/landscape 3개, 동봉 자산 HTTP SHA 및 실제 BGM/폰트 2개가 통과했다. 신규 오디오 테스트의 튜토리얼 준비 누락은 UI skip을 추가해 고쳤고 신규 2개 재실행이 통과했다. 앱 동작 수정은 없다.
- 공식 BGM source page/CC0 및 여섯 원곡의 bytes/SHA-256, 고정 VFX 22개 upstream bytes/CC0, 폰트 v1.601 체크섬 재확인 통과.
- current audit는 추가로 찾은 제목/브랜딩까지 84개 파일을 기록한다. historical source snapshot 4개는 HEAD와 동일하며 binary 자산 변경/삭제/이동은 0개다.
- 전체 대규모 unit/외부 팩 온라인 재다운로드/최종 clean clone 검증은 이번 문서 ownership 변경 때문에 반복하지 않았다. 기존 10 pack/provider readiness는 통과했고 최종 clean clone은 다음 assets:setup 단계에서 실행한다.
- 빌드/E2E는 개인 DB와 분리된 `.local-backups/mixed-assets-final` 검증 복사본에서 실행했다. 원래 `.data`는 건드리지 않았다. 로그는 ignored `artifacts/ownership-final/`에 있다.
- Git: 이번 추가 제거 0개, 기존 1,382 tracked 파일 유지 + 문서/manifest/unit/E2E 4개 신규로 1,386개. 커밋하지 않는다.

2026-10-24 현재 standalone ownership inventory는 83파일이며 자체 46개 + 외부 32개 + metadata 5개다. mixed 자체 20개를 참조해 감사한 project-original은 66개다. 아래 이전 검증의 84개/미확인 분류/다음 단계 제안은 당시 기록이고, 당시 통합·clean 설치 검증은 [beta.5 기준 문서 이력](https://github.com/YEOJUN-KIM/Pokemon-Tower/blob/54e10401a14ce2525581adf8bfe900abdad99b14/docs/operations/WINDOWS_PLAYER.md)에 보존한다. 현재 설치 구조는 [Windows 플레이어 구조](../operations/WINDOWS_PLAYER.md), 공개 배포 결과는 [beta.5 완료 기록](../releases/WINDOWS_BETA_5.md)을 따른다.
