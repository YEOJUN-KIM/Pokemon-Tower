# 출처와 재사용

2026-10-16 공통 NPC 클래스 확장: Showdown 원본 목록과 개별 아티스트 표기를 확인한 뒤 게임 기반 클래스 PNG 8종(lass-gen3, pokemonbreeder-gen3, gentleman-gen4, pokemonranger-gen3, veteran-gen4, backpacker, schoolkid-gen4, collector)을 수정 없이 추가했다. 이번 선택 자산에는 개별 아티스트 표기가 없었다. 제공원의 식별자·URL·SHA-256·확인일은 [초상화 출처 목록](../../public/sprites/trainers/sources.json), 반입/보류 구분은 [검토 결과](../assets/manifests/npc-sprite-review.json)에 기록한다. 개별 크레딧이 있는 pokemonbreeder-gen7(Beliot419), pokemonranger-gen6/veteran-gen7/acetrainer-gen6(kyledove)은 검토 후보로만 남기고 다운로드하지 않았다. 기존 원작 이미지 권리와 Showdown 엔진 라이선스의 구분을 유지한다.

2026-10-14 테라스탈 선택 아이콘: [Pokémon Showdown 타입 이미지](https://play.pokemonshowdown.com/sprites/types/)의 `Tera{Type}.png` 19종을 수정 없이 `public/sprites/gimmicks/tera/`에 저장했다. 테라스탈 버튼에서 현재 타입의 보석 아이콘을 표시한다. [개별 URL·해시](../../public/sprites/gimmicks/tera/sources.json)를 보존하며 재현은 `scripts/import-tera-type-icons.mjs`다. 기존 Pokémon 이미지의 원작 권리 구분을 따른다.

2026-10-14 기믹 도구 개별 아이콘: [PokeAPI/sprites 도구 자료](https://github.com/PokeAPI/sprites/tree/0dc105d5b12416932f29b594078282ab4be045f5/sprites/items)에서 메가스톤 48개와 Z크리스탈 34개의 PNG를 수정 없이 저장했다. 메가스톤은 개별 이름의 PNG를 사용하고 망나뇽나이트는 gen9 자료를 사용한다. Z크리스탈은 타입별 18개·전용 16개의 가방 아이콘을 각 도구 이름에 연결했다. 출처 URL·고정 커밋·크기·SHA256은 [아이콘 출처 목록](../../public/sprites/items/gimmick-icon-sources.json)에 기록한다. 재현 도구는 `scripts/import-gimmick-item-icons.mjs`다. 기존 포켓몬 이미지의 권리 구분을 동일하게 따른다.

2026-10-14 포켓몬 애니메이션 재점검: 기존 Showdown gen5ani 계열에 더해 [PokéRogue assets](https://github.com/pagefaultgames/pokerogue-assets/tree/325c7de68e6c323e12243271ea510c6b0e1b992e)의 도트 아틀라스를 GIF로 변환했다. 자르기 전 좌표와 투명도를 복원하고 PNG 대체 이미지도 저장했다. 244종·폼의 709개 방향/이로치 표시를 추가했다. 원본 URL·커밋·해시·변환 정보는 [출처 목록](../../scripts/assets/pokerogue/snapshots/sources.json), 제작자 크레딧과 원본 REUSE·CC BY-NC-SA 4.0·FAIR-USE 고지의 복원 정보는 [자산 안내](../../scripts/assets/pokerogue/snapshots/README.md)와 [독립 복원 절차](../assets/POKEROGUE_RESTORE.md)에 보존한다. 복원된 고지는 runtime 팩에 포함되며 배포 전 전체 검증한다. Showdown GIF는 수정 없이 저장하고 PNG 대체 이미지는 첫 프레임에서 추출했다. 엔진 소스의 라이선스를 그림에 적용하지 않는다.

2026-10-09 30층 이벤트: 기존 Showdown 초상화 출처를 확장해 조직원 6종을 수정 없이 저장했다. [원본 디렉터리](https://play.pokemonshowdown.com/sprites/trainers/)에서 작가 표시를 확인했으며 magmagrunt·skullgrunt는 ZacWeavile, flaregrunt는 kyledove에게 크레딧을 표기한다. rocketgrunt·galacticgrunt·plasmagrunt에는 해당 디렉터리의 별도 작가 표시가 없었다. 원본 URL과 작가는 [출처 목록](../../public/sprites/trainers/sources.json)에 기록한다. 당시 초상화는 52종이었다. 성도 테마 추가로 관장·사천왕·레드 12종을 더 저장해 현재는 64종이다. 원본 URL은 같은 출처 목록에 기록한다.

2026-10-09 트레이너 샘플 확장: Showdown 출처의 PNG를 수정 없이 저장해 샘플용 초상화 46종을 사용한다. 원본 URL과 로컬 파일명은 [초상화 출처 목록](../../public/sprites/trainers/sources.json)에 기록했다. 제공원의 실제 파일명을 로컬 식별자에 연결한 경우가 있어 `-gen4` 같은 로컬 이름만으로 그림 세대를 단정하지 않는다. 네임드의 출신 세대와 그림 파일의 버전은 별개다. 이는 기존 트레이너 자료의 확장이며 새로운 원작 이용 허락을 얻었다는 뜻은 아니다.

문서 갱신일: 2026-10-09. 외부 조사 날짜는 각 항목에 기록하며, 이번 갱신은 새 이용 허락 확인을 의미하지 않는다. 정확한 의존성은 pnpm-lock.yaml에 고정한다.

## Pokémon Showdown

플레이어는 사용자가 지정한 [성도편 지우 원본](https://play.pokemonshowdown.com/sprites/trainers/ash-johto.png)을 수정 없이 `public/sprites/trainers/ash-johto.png`에 저장해 사용한다.

사용자 요청으로 위 지우의 복장을 참고한 2D 뒷모습 4프레임을 이미지 생성 도구로 제작했다: `public/sprites/trainers/ash-johto-back-sheet.png`. 등장·투구에 사용하는 이 시트는 공식 원작 또는 Showdown에서 제공한 뒷모습이 아닌 생성 이미지다.

2026-10-12 플레이어 등장·투구 스프라이트는 이미지 생성 도구로 제작한 오리지널 트레이너로 교체했다: `public/sprites/trainers/player-back-sheet.png`. 청록색 모자·노란 재킷의 뒷모습 4프레임이며, 기존 트레이너와 도트 크기를 맞추기 위해 96×128 프레임과 제한된 색상으로 변환했다. 생성 원본은 `artifacts/qa/previews/player-trainer/original-sheet.png`에 보존한다. 이전 지우 시트도 보존하지만 현재 화면에서는 사용하지 않는다.

2026-10-16 Mirror 외형은 사용자 요청으로 위 플레이어와 같은 캐릭터의 정면으로 변경했다. built-in imagegen에서 기존 뒷모습 시트를 정체성/복장 참조로 사용해 생성하고 `public/sprites/trainers/player-front.png`(96×144, 64색, 투명 배경)에 보관한다. 생성 원본은 `artifacts/qa/previews/player-trainer/front-generated.png`, 최종 프롬프트·SHA-256은 `public/sprites/trainers/player-front-source.json`에 있다. 얼굴의 좁은 그늘은 SVG overlay이며 PNG에 굽지 않는다.

임시 NPC 비상·목호 이미지는 Showdown에서 받아 `public/sprites/trainers/`에 포함했다: [비상 원본](https://play.pokemonshowdown.com/sprites/trainers/falkner.png), [목호 원본](https://play.pokemonshowdown.com/sprites/trainers/lance.png). 로딩 실패 시 임시 트레이너 이미지로 대체한다. 포켓몬/NPC 원작 권리는 해당 권리자에게 있으며 Showdown 엔진 라이선스와 이미지 권리는 별개다.

2026-10-06 일반 NPC 샘플도 수정 없이 같은 폴더에 저장했다: [반바지 소년](https://play.pokemonshowdown.com/sprites/trainers/youngster-gen4.png), [등산가](https://play.pokemonshowdown.com/sprites/trainers/hiker-gen4.png), [낚시꾼](https://play.pokemonshowdown.com/sprites/trainers/fisherman-gen4.png), [엘리트 트레이너](https://play.pokemonshowdown.com/sprites/trainers/acetrainer-gen4.png). 파일 이름은 제공원의 식별자이며 세대별 콘텐츠 배치가 완료됐다는 뜻은 아니다.

- 소스: https://github.com/smogon/pokemon-showdown
- 사용 버전: npm pokemon-showdown 0.11.11.
- 시뮬레이터 문서: https://github.com/smogon/pokemon-showdown/blob/master/sim/SIMULATOR.md
- 라이선스: MIT. 설치된 패키지의 LICENSE와 배포 시 저작권·허가 고지를 유지한다.
- 재사용: Dex 데이터, 팀 검증, BattleStream, 플레이어별 스트림, 전투 계산과 프로토콜.
- 웹 클라이언트·서버 운영 코드·애니메이션은 가져오지 않았다.
- MIT 코드는 포켓몬 이름·캐릭터·이미지에 대한 별도 권리 허락을 의미하지 않는다.

## 개발 의존성

TypeScript(Apache-2.0), tsx(MIT), @types/node(MIT)를 개발 도구로 사용한다.
Node.js·pnpm 및 전이 의존성은 각각의 라이선스 고지를 따른다.
SQLite는 Node.js에 포함된 node:sqlite 모듈로 사용한다. 별도 ORM이나 Showdown의 SQLite 서버 코드는 재사용하지 않는다.
배포 전 실제 배포 파일에 포함되는 의존성·고지를 다시 점검한다.

## 웹 화면 의존성

Next.js·React·React DOM(MIT), Playwright(Apache-2.0)를 추가했다.
화면은 직접 구현했으며 Showdown 클라이언트 코드는 가져오지 않았다.
현재 레트로 글꼴은 [Neo둥근모 공식 웹폰트](https://github.com/neodgm/neodgm-webfont)이며 파일과 SIL OFL 1.1 고지를 `public/fonts/`에 포함한다. [로컬 라이선스](../../public/fonts/NEODGM-LICENSE.txt)를 배포 때 유지한다. 초기 Noto Sans KR 외부 CSS 요청 방식은 현재 화면의 글꼴 기준이 아니다.

Windows 실행기의 안내에는 [Neo둥근모 공식 v1.601](https://github.com/neodgm/neodgm/releases/tag/v1.601)의 `neodgm.ttf`를 앱 내부에서 읽어 사용한다. 시스템에 글꼴을 설치하지 않는다. SHA-256: `77305267996073aae07bad9313dad2e306a4128e55bfafbed4c41558fee57b4d`. 같은 OFL 고지를 함께 보관한다.

## 데이터·이미지

- PokéAPI: https://pokeapi.co/docs/v2
- 이미지 출처 후보: https://github.com/PokeAPI/sprites
- 실행 중 종마다 PokéAPI REST를 호출하지 않는다. 이름·학습 자료는 가져오기 단계에서 수집한다. 2026-10-12부터 기본·이로치 PNG와 기존 도트 애니메이션 GIF도 `public/vendor/pokeapi/pokemon/`에서 로컬 제공한다.
- 가져온 원본은 기존 감사 버전 `a3a1432e688ea028f12c51371d5253037cb9f17b`에 고정했다. `node --import tsx scripts/import-local-pokemon-sprites.ts`로 재실행하며 파일별 SHA-256과 원본에 없는 변형은 `docs/assets/manifests/local-pokemon-sprites.json`에 기록한다. 없는 변형은 로컬 기본 종 이미지로 대체한다.
- 현재 일반 도감 605종에 앞·뒷모습을 연결한다. 초기 7종/20종 ID 목록은 개발 이력이며 전체 지원 범위는 이미지 검사 JSON을 따른다.
- [저장소 고지](https://github.com/PokeAPI/sprites/blob/master/LICENCE.txt)는 저장소 CC0 1.0 배포와 이미지 콘텐츠의 The Pokémon Company 저작권을 함께 명시한다. 캐릭터·이미지가 자유 이용으로 전환됐다고 해석하지 않는다.
- 화면 하단에 이미지·엔진 출처를 표시한다. 1~5세대 포켓몬은 로컬에 저장한 기존 PokeAPI 도트 자료를 사용하며, 최신 세대는 아래의 로컬 Showdown 도트 자료를 사용한다. GIF의 도감 정지 프레임은 브라우저에서 만든다. 로컬 트레이너 PNG와 생성 플레이어 시트는 위 항목에 별도로 기록한다.
- 이미지 네트워크 실패 시 이름·대체 아이콘으로 계속 플레이할 수 있다.
- 데이터/API/이미지/전투 연출을 동일한 라이선스나 제공 범위로 가정하지 않는다.

## 직접 구현한 부분

아래의 3층·7종·20종 설명은 초기 개발 이력이다. 현재 범위는 605종·10층·영구 성장·강화 상점·키보드 커서·트레이너 등장이며 README와 UI_FLOW를 기준으로 읽는다. 이후 데이터·스프라이트 확장 출처는 이 문서의 각 후속 항목에 기록한다.

2026-10-04 추가 조사로 Showdown 연출 원본 2개·CC0 효과 이미지 22개 및 Kenney Impact Sounds CC0 공식 팩을 검토용으로 확보했다. 2026-10-12에는 CC0 효과 PNG 22개와 기술별 구성을 참고해 현재 배틀의 Canvas 연출에 연결했다. 별도 라이선스 이미지와 전체 클라이언트는 가져오지 않았고, Kenney 팩은 아직 연결하지 않았다. [현재 기술 연출](../engineering/MOVE_EFFECTS.md), 파일별 조건과 당시 조사 내용은 [RESOURCE_RESEARCH.md](THIRD_PARTY.md)를 참고한다. 기존 원본 출처와 해시는 `docs/assets/manifests/resource-manifest.json`, 현재 연결 목록은 `docs/assets/manifests/move-effects-integration.json`에 기록한다.

배틀 타입별 CSS 모션·공개 로그 순차 재생·Web Audio 임시 BGM/기술/승패 효과음은 직접 구현했다. 공식 음원이나 샘플을 포함하지 않았다. 2026-10-04 [Pokémon Game Sound Library 가이드라인](https://soundlibrary.pokemon.co.jp/en/download)은 게임·앱·소프트웨어 이용을 제외하므로 이 프로젝트의 음원 제공원으로 사용하지 않았다. 세부 확인과 음원 교체 방법은 [BATTLE_AUDIO.md](../history/BATTLE_AUDIO.md)를 참고한다.

CLI 입력, Showdown 연결 어댑터, 관측 정보 제한, 합법 행동 목록과 검증,
예상 데미지 규칙 AI, 재현 로그와 검증, 고정 팀 선정, 테스트와 프로젝트 문서.
웹 화면·한글 메시지·HP와 CSS 연출·HTTP API·세션 소유권과 행동 번호 검증·브라우저 테스트도 직접 구현했다.
팀 선택·3층 진행·보상·영입·도감 해금·지갑·관계형 스키마·트랜잭션·입력 기록과 재시작 복구도 직접 구현했다.
초기 20종·10층 고정 세팅과 난이도 측정 도구, 현재 605종 배틀 세트 생성·일반 상대 구성·영구 성장·5층 강화·기술머신 상점·기술 수집을 직접 구현했다. 특수 변신 기믹은 아직 구현하지 않았다.
추가 스프라이트 ID: 26, 76, 91, 94, 131, 135, 149, 196, 212, 248, 376, 445, 448. 기존과 같은 PokeAPI/sprites 출처·고지를 적용한다.
타이틀·설정 화면과 CSS 타워 도형, 브라우저별 소리 설정, Web Audio 메뉴 효과음도 직접 구현했다. 외부 음원·새 이미지 에셋은 추가하지 않았다.
도감 화면·검색/필터·조회 전용 API·특성 한글 표시를 직접 구현했다. 기존 Showdown 고정 세팅과 PokeAPI 스프라이트를 재사용했으며 새 데이터 제공원은 도입하지 않았다.

### 울음소리 제공원 조사
PokéAPI docs의 cries.latest/legacy 및 https://github.com/PokeAPI/cries 를 확인했다. 저장소는 Showdown·Veekun을 출처로 밝힌다. 음원의 게임 재사용 허락은 확인하지 못했으므로 파일을 다운로드하거나 외부 URL로 재생하지 않았다. 앱은 별도로 사용 조건이 확인된 로컬 /audio/cries/{id}.ogg 파일만 읽도록 준비했다.

### 일반 포켓몬 도감 확장

PokéAPI의 공개 CSV 데이터로 1,025종의 한글·영문 이름, 공식 영문 식별자, 타입, 세대, 기본 특성 이름을 로컬 JSON에 저장했다. 출처 URL과 가져온 시각은 `docs/assets/manifests/pokedex-source.json`, 재생성 스크립트는 `scripts/import-pokedex.mjs`에 기록한다. https://github.com/PokeAPI/pokeapi/tree/master/data/v2/csv

최종 진화 여부·메가진화/거다이맥스 가능 여부는 설치된 Showdown 종 데이터로 판단한다. 진화의휘석 활용 후보는 별도 수동 목록이며, 대표적인 전략 자료를 참고했다: https://www.smogon.com/dex/sv/pokemon/chansey/ , https://www.smogon.com/dex/sv/pokemon/porygon2/ , https://www.smogon.com/dex/sv/pokemon/duraludon/ , https://www.smogon.com/dex/sv/pokemon/dipplin/zu/ . 이 목록은 공식 분류나 모든 미진화체의 채용률 순위가 아니다.

도감의 추가 이미지도 기존 PokeAPI/sprites 기본 PNG를 외부 URL로 표시한다. 게임에 새로운 배틀 세트·변신 기능을 추가하거나 모든 종을 해금한 것은 아니다.

### 애니메이션 스프라이트 연결

같은 PokeAPI/sprites 저장소의 `sprites/pokemon/versions/generation-v/black-white/animated/`와 `sprites/pokemon/other/showdown/` GIF를 앞·뒷모습에 사용한다. Showdown GIF는 저장소 설명에서 Smogon 커뮤니티 출처로 안내한다. 파일 목록 기준의 현재 도감별 지원 감사는 `artifacts/qa/assets/reports/animated-sprite-coverage.json`에 저장소 commit 및 확인 시각과 함께 기록했다. 애니메이션 파일 자체를 로컬로 다운로드하지 않고 기존 PNG와 같이 외부 URL로 표시한다. https://github.com/PokeAPI/sprites#sprites

위 문단은 2026-10-05 연결 기록이다. 2026-10-09부터 6~9세대와 별도 최신 폼 이미지 키는 [Showdown gen5](https://play.pokemonshowdown.com/sprites/gen5/), [gen5-back](https://play.pokemonshowdown.com/sprites/gen5-back/), [gen5ani](https://play.pokemonshowdown.com/sprites/gen5ani/), [gen5ani-back](https://play.pokemonshowdown.com/sprites/gen5ani-back/)의 2D 도트 자료를 사용한다. `gen5`는 이 자료의 스타일 경로이며 최신 포켓몬도 포함한다.

사용자가 요청한 2D 교체를 위해 앞·뒷모습 PNG와 각 방향에서 사용 가능한 GIF를 수정 없이 `public/vendor/showdown/pokemon/`에 저장했다. 1,201개 파일, 22,842,975바이트이며 외부 이미지 서버 접근 실패를 피하기 위한 게임 자산이다. 원본 URL·크기·SHA256은 `docs/assets/manifests/pixel-sprite-assets.json`, 파일 목록은 `artifacts/qa/assets/reports/pixel-sprite-coverage.json`에 기록한다. 현재 605종 도감 중 6~9세대 241종은 양방향 도트 애니메이션 93종·정면만 애니메이션 42종·양방향 정지 도트 106종으로 표시한다. 앞·뒷모습 지원 여부를 독립적으로 판단하며, GIF가 없거나 로드에 실패하면 같은 방향의 도트 PNG를 사용한다. 3D GIF로 대체하지 않는다. 1~5세대의 기존 표시 경로는 유지한다.

포켓몬 그림과 커뮤니티 제작 스프라이트는 직접 제작한 자료가 아니다. 기존 포켓몬 이미지와 같은 원작·제작자 권리 구분을 유지하며 Showdown 엔진 MIT 또는 별도로 확보한 기술 효과 이미지 CC0 고지를 이 그림에 적용하지 않는다. 이번 교체는 별도 상업 이용 허가를 확보했다는 의미가 아니다. 로컬 출처 안내는 `public/vendor/showdown/pokemon/README.md`에 둔다.


### 기술·자력기 데이터

PokéAPI pokemon 엔드포인트의 version_group_details와 level-up 학습 방법을 사용하며, 지원 20종의 최신 가용 버전을 선택한다. move_names.csv와 move_flavor_text.csv의 한국어 항목을 기술명 및 설명에 사용한다. 엔진의 기술 세부 수치와 실제 배틀 규칙에 맞는 학습 가능 여부는 설치된 pokemon-showdown 0.11.11 데이터를 사용한다. 수집 출처와 버전은 docs/assets/manifests/move-data-source.json, 재생성 과정은 scripts/import-moves.ts에 기록한다. 도감 및 배틀 중 외부 API를 종마다 호출하지 않는다.

### 605종 배틀 데이터 확장

2026-10-05부터 일반 605종의 실제 배틀 세트를 지원한다. 자력기는 PokéAPI `pokemon_moves.csv`의 level-up 및 버전 그룹으로 수집하고, 한국어 기술·특성 이름은 공개 CSV에서 읽는다. 기술의 실수치와 종족값·특성·합법성·실제 처리는 설치된 Showdown 0.11.11을 사용한다. 새 통합 가져오기 명령은 `pnpm data:import`이며 이전 `scripts/import-moves.ts`도 같은 통합 가져오기로 연결한다. 각 원본 URL·SHA256·버전과 예외는 `docs/assets/manifests/battle-data-source.json`에 기록한다. 채용률 자료나 학습 모델을 가져온 것은 아니다.


## 2026-10-09 전투 BGM 교체

기존 합성 전투곡을 다음 OpenGameArt 완성 음원으로 교체했다. 각 원본 페이지에서 CC0 표시를 확인했다. 파일을 다운로드해 로컬 제공하며 수정 없이 이름만 변경했다. 원본 파일과 해시·다운로드 URL은 [battle-music-sources.json](../../public/audio/music-sources.json), 재현 스크립트는 `scripts/import-battle-music.mjs`에 기록했다. 저작자를 아래에 함께 표시한다. 포켓몬 공식 음원이나 유튜브 음원은 사용하지 않았다.

| 역할 | 곡 | 작곡가 | 라이선스 |
|---|---|---|---|
| trainer | [Boss Battle Theme](https://opengameart.org/content/boss-battle-theme) | Cleyton Kauffman | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| elite | [RPG Battle Theme II / Fighting is not an option](https://opengameart.org/node/51807) | Cleyton Kauffman | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| gym | [Battle Theme A](https://opengameart.org/content/battle-theme-a) | cynicmusic / Alex Smith | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| villain | [Unchained Destiny [Rock]](https://opengameart.org/content/unchained-destiny-rock) | nene | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| champion (관장 공통) | [Battle Theme A](https://opengameart.org/content/battle-theme-a) | cynicmusic / Alex Smith | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| rare | [The Final Battle](https://opengameart.org/content/the-final-battle) | skrjablin | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| reward | [Victory Theme for RPG](https://opengameart.org/content/victory-theme-for-rpg) | cynicmusic / Alex Smith | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |

## 지닌 도구 아이콘 · 2026-10-09

기존 포켓몬 이미지 제공원인 [PokeAPI/sprites](https://github.com/PokeAPI/sprites/tree/master/sprites/items)의 도구 PNG 5종을 수정 없이 public/sprites/items/에 저장했다: sitrus-berry, leftovers, charcoal, mystic-water, miracle-seed. 원본 주소는 https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/{파일명}.png 이다. 저장소 고지와 원작 이미지 권리 구분은 위 데이터·이미지 항목을 따른다. 상점·장착 관리·배틀 상세에서 24/32px로 표시하며 도트 확대는 pixelated를 사용한다.

도구 35종 확장으로 같은 제공원의 PNG를 28종 더 저장했다(총 33 PNG). `scripts/import-held-item-icons.mjs`가 카탈로그의 파일명을 사용해 다운로드하며 PNG 서명을 검사한다. 제공원에 PNG가 없는 요정의깃털과 통굽부츠는 직접 작성한 로컬 SVG 아이콘을 사용한다.

## 메가 형태 2D 스프라이트

2026-10-09 Pokémon Showdown sprite collection의 47종 앞·뒤 PNG/GIF 총 188개를 public/sprites/gimmicks에 저장했다. 개별 URL은 docs/assets/manifests/mega-sprite-sources.json에 기록한다. 메가스톤·다이맥스밴드의 공용 SVG 아이콘과 변신 연출 CSS는 직접 작성했다. 기존 포켓몬 자산의 권리·출처 안내를 동일하게 따른다.

### 메가 GIF 출처 정정

초기 ani/ani-back GIF는 모델 렌더링이었다. 현재는 gen5ani/gen5ani-back 도트 GIF만 사용하며 정면 23종·뒷모습 10종을 확보했다. 47종 양방향 PNG 94개와 GIF 33개, 총 127개의 현재 출처는 mega-sprite-sources.json에 기록한다. 없는 방향의 GIF는 2D PNG로 표시한다.

## 2026-10-10 · 울음소리 추가 조사

- PokéRogue audio/cry 목록에서 25.m4a, 445.m4a, 445-mega.m4a를 확인했다. [목록](https://github.com/pagefaultgames/pokerogue-assets/tree/beta/audio/cry).
- Showdown은 [울음소리 목록](https://play.pokemonshowdown.com/audio/cries/)에 피카츄·한카리아스·메가한카리아스 등 종/형태별 MP3/OGG를 제공한다. 일반: https://play.pokemonshowdown.com/audio/cries/garchomp.ogg / 메가: https://play.pokemonshowdown.com/audio/cries/garchomp-mega.ogg . 파일명/목록 확인이며 이번 조사에서 울음소리를 청취하거나 게임에 연결하지 않았다.
- PokéRogue [audio/REUSE.toml](https://github.com/pagefaultgames/pokerogue-assets/blob/beta/audio/REUSE.toml)은 cry/*를 Nintendo, Creatures Inc., GAME FREAK inc. 원작 자산, LicenseRef-FAIR-USE로 고지한다. 이는 우리 게임에 대한 권리자의 재사용 허가를 확인한 것이 아니다. 이전에 미확인이었던 음원 하위 고지를 이번에 확인했다.
- PokeAPI/cries는 Gen1~9 latest/legacy 자료를 제공하지만 LICENSE는 음원 내용의 Pokémon Company 저작권을 명시한다.
- CC0 대체 후보: [Ogrebane Monster Sound Effects Pack](https://opengameart.org/content/monster-sound-effects-pack), [pauliuw Some kind of beings sounds(7)](https://opengameart.org/content/some-kind-of-beings-sounds7). 페이지의 CC0 고지는 확인했으나 원작 포켓몬 울음소리는 아니며 음색 유사성/청감 검증은 하지 않았다. 사용자가 원작에 가까운 자료를 더 찾는 방향을 선택했으므로 임의 합성 울음소리/일반 몬스터 음원을 적용하지 않았다.

메뉴·기술·피격·변신 합성음만 실제 적용. Chrome 효과음 37종 재생/음소거/볼륨 0 검사, BGM 전환 및 배틀 키보드 E2E 총 10개 통과(기존 10층 배경 fixture의 total_floors=10 명시 후 재검증). 연출/기믹 단위 검사 15개와 프로덕션 빌드 통과.


## 2026-10-10 · 소모품·영양제 아이콘

PokéAPI item API에서 9종의 sprites.default 주소를 확인하고 PokeAPI/sprites의 30×30 PNG를 수정 없이 public/sprites/items에 저장했다. x-attack(플러스파워), x-speed(스피드업), guard-spec(이펙트가드), hp-up, protein, iron, calcium, zinc, carbos. 상점은 기존 임시 SVG 대신 이 PNG를 표시한다. 재현: scripts/import-shop-icons.mjs. 원본: https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/{이름}.png . 기존 이미지 출처·권리 안내를 동일하게 따른다.


소모품 8종 확장: 같은 PokeAPI/sprites 제공원의 x-defense, x-sp-atk, x-sp-def, x-accuracy, dire-hit 30×30 PNG 5종을 추가했다. 기존 import-shop-icons.mjs로 재현한다.


테라스탈의 타입 색상·예약 버튼은 [PokéRogue 공식 명령 UI](https://github.com/pagefaultgames/pokerogue/blob/beta/src/ui/handlers/command-ui-handler.ts)를 참고했다. 이번 결정 아이콘과 연출은 직접 만든 SVG/CSS이며 해당 게임의 이미지나 코드를 포함하지 않는다. 실제 타입·STAB·전용 폼 효과는 기존 pokemon-showdown 엔진을 사용한다. 상세는 테라스탈 (로컬 전용: `artifacts/reports/changes/TERASTALLIZATION.md`).


빌런 간부/보스용 tabitha, mars, zinzolin, xerosic, plumeria, guzma PNG를 [Pokémon Showdown 트레이너 제공원](https://play.pokemonshowdown.com/sprites/trainers/)에서 수정 없이 추가했다. 표기된 작가는 tabitha: kyledove, xerosic/guzma: Gnomowladny, plumeria: Beliot419이며 mars/zinzolin은 제공원에서 별도 작가 표기가 없다. URL·크레딧은 trainer-sprite-sources.json에 기록했다.


## 2026-10-10 · 1~9세대 트레이너 확장

트레이너 초상화는 총172종이다. 기존 Showdown 제공원의 PNG를 수정 없이 저장하고 원본 URL·표기된 모든 작가를 trainer-sprite-sources.json에 기록했다. 재현은 scripts/import-trainer-samples.mjs이며 디렉터리의 figure별 작가 표기를 함께 수집한다. 예: nemona-s·stargrunt-s는 kyledove, aetherfoundation·officeworker는 Beliot419다. 매크로코스모스 조직원은 회사원 이미지로 임시 표현한다. 원작 이미지를 자체 제작물로 설명하지 않는다.

다이맥스밴드 아이콘은 PokeSprite, 테라스탈오브 아이콘은 PokeRogue 원본 PNG를 사용합니다. URL·SHA-256·크레딧 경로는 [장비 아이콘 출처](../../public/sprites/items/trainer-equipment-sources.json)에 기록합니다. PokeRogue 크레딧과 권리 고지는 `public/vendor/pokerogue/`에 보존하며, 게임 엔진 라이선스와 이미지 권리는 별개입니다.

## 프로젝트 제작 알 이미지 (2026-10-23 소유자 확인)

일반·레어·슈퍼레어·이로치 알 PNG 네 장과 뽑기 기계 PNG는 사용자가 2026-10-14 제공한 이미지를 수정 없이 사용합니다. public/sprites/eggs/에 보관하며 [파일별 출처와 SHA-256](../../public/sprites/eggs/sources.json)을 함께 기록합니다. 레어 알 오라·슈퍼레어 후광·이로치 반짝임·부화·기계 들썩임과 알 배출 효과는 화면 CSS에서 추가합니다.

참고 자료의 현재 보관 위치는 `external/third-party/kenney-impact-sounds/`와 `external/reference/showdown/`이다. 두 그룹은 runtime에서 사용하지 않으며 라이선스와 함께 Git에 보존한다. 2026-10-04 manifest는 당시 경로를 유지하며 [현재 위치 매핑](../assets/EXTERNAL_ASSETS.md#비런타임-자료-이동--2026-10-23)을 함께 참고한다.

## 혼합 runtime 소유권과 재현 (2026-10-23)

trainers/gimmicks/items/effects의 원작·커뮤니티·자체·사용자 제공 경계를 [혼합 자산 ownership](../assets/MIXED_RUNTIME_ASSETS.md)에 기록했다. 외부 535개만 고정 소스로 복원하고 자체 제작 20개(직접 제작 확인된 화염방사 포함), 기존 source JSON 6개는 Git에 유지한다. Showdown과 과거 PokeAPI 도구 2개는 공개 프로젝트 commit `43aa154688a1ef31e75f175ee6bde90198caa58a`를 보존 snapshot으로 사용하며 원래 제공원·크레딧 기록은 변경하지 않는다. PokeAPI 191개, PokeSprite 1개, PokéRogue 1개는 공식 고정 commit을 사용한다. 스냅샷 고정과 Git 추적 변경은 새 이용 허가나 이미지의 권리 이전을 뜻하지 않는다.

## 최종 소유권 정정 (2026-10-23)

알 PNG 5개·TM PNG 18개·포털 GIF/PNG 2개·보존 BGM 5개·화염방사 beam은 소유자가 직접 만든 project-original이다. 과거 user-provided는 반입 경로를 기록한 말이며 현재 외부 저작자/미검증 판정으로 사용하지 않는다. historical source JSON의 원래 날짜·해시는 보존하고 현재 판정은 [ownership audit](../assets/ASSET_OWNERSHIP.md)에 기록했다. 외부 CC0 음원 8개는 공식 6개 원본과 해시 일치하는 복사본 2개이며 기존 저자·페이지·라이선스를 유지한다. NeoDGM v1.601 폰트 두 파일과 OFL 고지, 고정 Showdown client의 CC0 VFX 22개도 Git에 유지한다. VFX 개별 작가 이름은 upstream 고지에 명시되지 않아 임의 지정하지 않는다.

2026-10-24 소유자가 제목 reference GIF/PNG 및 branding 원본 PNG를 GPT로 프로젝트용으로 생성했다고 확인했다. current ownership은 project-original/generated-for-pokemon-tower로 정정했다. branding PNG는 원본을 유지하고 Windows build에서 여러 크기의 ICO로 변환한다. 소유자가 삭제한 Tera draft는 현재 자산 목록에서 제외했다.
