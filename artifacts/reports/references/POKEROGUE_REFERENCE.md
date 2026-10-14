> 문서 범위: 아래 내용과 검증 수치는 작성 당시 기록이다. 현재 기능·층수·가격·키 조작·상대 AI는 [STATUS](../../../docs/STATUS.md), 후속 작업은 [ROADMAP](../../../docs/current/ROADMAP.md), 실험 적용 상태는 [EXPERIMENTS](../../experiments/README.md)를 먼저 확인한다.

# PokéRogue 참고 조사 · 2026-10-04

사용자가 [PokéRogue](https://pokerogue.net/)를 배틀 연출/구현 방식의 참고 대상으로 지정했다. 사이트와 공개 코드/리소스 고지를 조사했고 브라우저에서 한국어 타이틀/로그인 화면을 확인했다. 실제 플레이·로컬 구동·우리 게임 연동은 아직 수행하지 않았다. 추가 참고작 「올라라! 포켓몬 타워!」와 우리 기획의 관계는 [REFERENCE_GAMES.md](REFERENCE_GAMES.md)에 기록했다.

## 확인한 구현과 출처

- [package.json](https://github.com/pagefaultgames/pokerogue/blob/main/package.json): TypeScript, Phaser 3, Vite 기반의 브라우저 게임. 웹에서도 게임 엔진을 사용해 배틀 연출을 구현하는 실제 사례다.
- [battle-anims.ts](https://github.com/pagefaultgames/pokerogue/blob/main/src/data/battle-anims.ts): 기술별 JSON을 읽고 스프라이트 시트·배경·효과음을 로드한다. 각 프레임의 위치, 확대/축소, 회전, 투명도 및 지정 프레임의 소리 이벤트로 연출한다.
- [화염방사 연출 데이터](https://github.com/pagefaultgames/pokerogue-assets/blob/beta/battle-anims/flamethrower.json): 기술 ID 53, `PRAS- Fire` 그래픽 이름, 기술 연출 프레임 목록을 실제 확인했다. 단일 기술에 이미지 파일 하나를 표시하는 수준이 아니라 기존 효과 시트와 재생 데이터가 함께 필요하다.
- [CREDITS.md](https://github.com/pagefaultgames/pokerogue/blob/main/CREDITS.md): 기술 애니메이션 출처는 Pokémon Reborn, 효과음은 Pokémon Emerald / Black·White로 기재한다. 포켓몬 스프라이트는 원작 및 여러 커뮤니티 제작자, 배경·음악에는 별도 제작/커미션도 포함되어 있다. 모두 자체 제작한 것이 아니다. Reborn 연출의 원래 제작/변환 과정까지 이번 조사로 확인한 것은 아니다.
- [자산 서브모듈](https://github.com/pagefaultgames/pokerogue/blob/main/.gitmodules): 이미지/음원/기술 데이터는 별도 `pokerogue-assets` 저장소에서 관리한다. 별도 API 키로 기술 애니메이션을 받아오는 방식이 아니다.

## 재사용 조건과 아직 확인하지 못한 부분

[공식 README](https://github.com/pagefaultgames/pokerogue#licensing)는 소스 코드의 기본 라이선스를 AGPL-3.0-only로 설명하고, 문서/자산은 파일별 고지를 확인하도록 한다. 적용 가능한 자산은 기본 CC-BY-NC-SA-4.0이지만 assets에서 REUSE 고지가 없는 파일은 이용 조건이 확인되지 않은 것으로 취급하라고 명시한다.

[자산 REUSE.toml](https://github.com/pagefaultgames/pokerogue-assets/blob/beta/REUSE.toml)은 `battle-anims/*.json`에 AGPL-3.0-only를 명시한다. 로고는 NO-REUSE로 고지되어 있다. 소스 재사용은 무조건 금지가 아니라 해당 라이선스 준수 범위를 먼저 결정할 사항이다. JSON 라이선스가 그 JSON이 참조하는 원작 이미지/음원에 자동으로 적용되지는 않는다.

화염방사에 필요한 개별 이미지/효과음의 정확한 이용 고지는 아직 확인하지 못했다. 경로를 추정해 요청한 하위 REUSE.toml은 읽지 못했으며, 이것만으로 파일이 없거나 모든 자산이 사용 금지라고 판단하지 않는다. PokéRogue 리소스를 우리 게임에 다운로드·연결하거나 라이선스를 변경하지 않았다.

## 이 프로젝트에서 검토할 방향

1. 연출 품질의 참고 대상으로 PokéRogue를 사용한다. 포켓몬 움직임·기술 효과·피격·HP·효과음이 하나의 타임라인에서 맞물리는 방식이 핵심이다.
2. Next.js/Node/SQLite/Showdown은 유지하며 배틀 영역에 Phaser를 넣는 방식을 기술 후보로 검토한다. Phaser 공식 [React 통합 템플릿](https://github.com/phaserjs/template-react)이 존재하지만 우리 Next.js 프로젝트에서의 연동은 아직 검증하지 않았다.
3. 재사용 자산과 코드의 파일별 조건을 확인한 대표 기술 시제품을 먼저 만든다. 지금 확보한 Showdown CC0 자료와 PokéRogue/Reborn 자료를 실제 품질·연동 난이도로 비교할 수 있다. 사용 조건이 막힌 경우 해당 파일과 이유를 구체적으로 설명한다.
4. 웹 연동이 요구 품질이나 작업량 기준에 맞지 않는 것으로 확인되면 Pokémon Essentials 전환을 검토한다. 프레임워크 변경은 사용자의 결정 전에 실행하지 않는다.

현재 게임에는 기존 임시 CSS 연출/합성음이 그대로 남아 있다. 조사 결과를 실제 연동 완료로 주장하지 않는다.

## 2026-10-05 · 특성 알림과 대상 효과 참고

사용자는 특성/도구 발동 표시는 PokéRogue의 공개 소스를 참고하되 카페에 추가로 접근하지 말라고 지정했다. 이후 참고 범위는 공개 GitHub 소스와 사용자가 제공한 화면으로 한정한다.

- [ShowAbilityPhase](https://github.com/pagefaultgames/pokerogue/blob/main/src/phases/show-ability-phase.ts): 발동 주인의 포켓몬/특성 이름을 저장하고 소속에 맞춰 `abilityBar.showAbility`를 호출한다. 다른 특성 표시가 있으면 숨김/다음 표시를 순서대로 처리한다.
- [StatStageChangePhase](https://github.com/pagefaultgames/pokerogue/blob/main/src/phases/stat-stage-change-phase.ts): 실제 능력치 변화를 받는 포켓몬에 상승/하락 애니메이션을 적용한다. 하락은 파란 스프라이트를 아래로, 상승은 빨간 스프라이트를 위로 이동하며, 효과 이후 메시지·능력치 갱신을 처리한다.
- [PokemonHealPhase](https://github.com/pagefaultgames/pokerogue/blob/main/src/phases/pokemon-heal-phase.ts): 회복 가능 여부와 회복 차단을 검사하고 공통 회복 애니메이션·회복 수치·정보 갱신·메시지를 연결한다. HP가 이미 가득 찬 경우를 구분한다.

우리 구현은 위 책임 분리와 순서를 참고하여 기존 Showdown 공개 이벤트를 React/CSS 재생 프레임으로 해석한다. 특성 주인의 임시 팝업, 실제 대상의 능력치 화살표/회복 표시, 하단 로그를 연결했다. 코드·그림·음원은 복사하지 않았으며 PokéRogue와 같은 시각 품질을 주장하지 않는다. 현재 데이터에 도구는 미장착이며 기합의띠 등은 별도 테스트 팀으로 실제 엔진 발동을 검증한다.

## 2026-10-09 · 2D 불꽃·전기 기술 이펙트 재확인

- 화염방사 JSON을 다시 읽었다. 기술 ID 53, `PRAS- Fire` 그래픽 참조와 프레임별 좌표·확대율·투명도·이미지 프레임 번호가 있다. [화염방사 데이터](https://github.com/pagefaultgames/pokerogue-assets/blob/beta/battle-anims/flamethrower.json)
- 10만볼트 JSON도 읽었다. 기술 ID 85, `PRAS- Electric` 그래픽 참조와 대상 주변에 배치되는 여러 이미지 프레임이 있다. [10만볼트 데이터](https://github.com/pagefaultgames/pokerogue-assets/blob/beta/battle-anims/thunderbolt.json)
- 실제 이미지 디렉터리에서 `015-Fire01.png`, `017-Thunder01.png`, `Flames.png` 등 불꽃·번개 효과 이미지 파일 목록을 확인했다. 이 파일들이 위 두 기술의 직접 참조 시트라는 의미는 아니다. `PRAS- Fire`와 `PRAS- Electric`의 PNG 자체는 이번 웹 조회에서 읽지 못했으므로 해당 시트의 그림 품질은 시각 검증하지 않았다. [효과 이미지 디렉터리](https://github.com/pagefaultgames/pokerogue-assets/tree/beta/images/battle_anims)
- 연출 코드는 그래픽을 스프라이트 시트로 로드하고 JSON 프레임에 따라 위치·크기·각도 등을 적용한다. 따라서 2D 이미지와 재생 데이터를 결합하는 방식이다. [연출 코드](https://github.com/pagefaultgames/pokerogue/blob/main/src/data/battle-anims.ts)
- 기술명이 정확히 ‘번개’인 `thunder.json`은 웹 조회 오류로 내용을 확인하지 못했다. 전기 이펙트와 10만볼트 연출의 존재는 확인했지만, 번개 개별 기술 데이터까지 확인 완료로 표시하지 않는다.

이번 작업은 공개 자료 재확인이다. 실제 애니메이션 재생·이미지 품질 확인·우리 게임 연동·개별 자산 이용 조건의 추가 검증은 수행하지 않았다.

## 2026-10-10 · 울음소리 추가 조사

- PokéRogue audio/cry 목록에서 25.m4a, 445.m4a, 445-mega.m4a를 확인했다. [목록](https://github.com/pagefaultgames/pokerogue-assets/tree/beta/audio/cry).
- Showdown은 [울음소리 목록](https://play.pokemonshowdown.com/audio/cries/)에 피카츄·한카리아스·메가한카리아스 등 종/형태별 MP3/OGG를 제공한다. 일반: https://play.pokemonshowdown.com/audio/cries/garchomp.ogg / 메가: https://play.pokemonshowdown.com/audio/cries/garchomp-mega.ogg . 파일명/목록 확인이며 이번 조사에서 울음소리를 청취하거나 게임에 연결하지 않았다.
- PokéRogue [audio/REUSE.toml](https://github.com/pagefaultgames/pokerogue-assets/blob/beta/audio/REUSE.toml)은 cry/*를 Nintendo, Creatures Inc., GAME FREAK inc. 원작 자산, LicenseRef-FAIR-USE로 고지한다. 이는 우리 게임에 대한 권리자의 재사용 허가를 확인한 것이 아니다. 이전에 미확인이었던 음원 하위 고지를 이번에 확인했다.
- PokeAPI/cries는 Gen1~9 latest/legacy 자료를 제공하지만 LICENSE는 음원 내용의 Pokémon Company 저작권을 명시한다.
- CC0 대체 후보: [Ogrebane Monster Sound Effects Pack](https://opengameart.org/content/monster-sound-effects-pack), [pauliuw Some kind of beings sounds(7)](https://opengameart.org/content/some-kind-of-beings-sounds7). 페이지의 CC0 고지는 확인했으나 원작 포켓몬 울음소리는 아니며 음색 유사성/청감 검증은 하지 않았다. 사용자가 원작에 가까운 자료를 더 찾는 방향을 선택했으므로 임의 합성 울음소리/일반 몬스터 음원을 적용하지 않았다.

메뉴·기술·피격·변신 합성음만 실제 적용. Chrome 효과음 37종 재생/음소거/볼륨 0 검사, BGM 전환 및 배틀 키보드 E2E 총 10개 통과(기존 10층 배경 fixture의 total_floors=10 명시 후 재검증). 연출/기믹 단위 검사 15개와 프로덕션 빌드 통과.
