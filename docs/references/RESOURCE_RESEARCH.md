> 문서 범위: 아래 내용과 검증 수치는 작성 당시 기록이다. 현재 기능·층수·가격·키 조작·상대 AI는 [STATUS](../STATUS.md), 후속 작업은 [ROADMAP](../current/ROADMAP.md), 실험 적용 상태는 [EXPERIMENTS](../experiments/README.md)를 먼저 확인한다.

# 배틀 리소스 조사 · 2026-10-04

## 사용자 요구와 작업 기준

사용자가 추가한 주요 참고 대상은 PokéRogue다. Phaser 기반 배틀 화면, Pokémon Reborn 출처의 기술 연출, 스프라이트 시트/JSON/타이밍 효과음 구조를 확인했다. 상세 출처·재사용 조건·검증 전 항목은 [POKEROGUE_REFERENCE.md](POKEROGUE_REFERENCE.md)를 참고한다.

기존 포켓몬 기술을 표현할 리소스/연출을 우선 찾아 확보하고 재사용한다. 확보나 연동이 어려운 부분만 임시 제작한다. CSS 도형과 합성음을 만들었다는 이유만으로 연출 품질을 충족했다고 판단하지 않는다. 사용자에게 설명 없이 자체 연출을 추가하거나 프레임워크를 변경하지 않는다.

웹에서 원하는 품질의 연출을 제공하기 어렵다면 RPG Maker XP 기반 Pokémon Essentials를 실제 대안으로 검토한다. 전환은 큰 방향 변경이므로 검증 결과와 이전 범위를 설명한 뒤 사용자가 결정한다.

## 실제 확보한 자료

### Pokémon Showdown

- [기술별 연출 코드](https://github.com/smogon/pokemon-showdown-client/blob/c0f6bfc707a5e3bba4da3785e9cb06c8ae04f8d9/play.pokemonshowdown.com/src/battle-animations-moves.ts): CC0-1.0 파일 고지. 화염방사/파도타기/냉동빔/10만볼트/베어가르기 정의 확인.
- [연출 엔진 및 효과 정의](https://github.com/smogon/pokemon-showdown-client/blob/c0f6bfc707a5e3bba4da3785e9cb06c8ae04f8d9/play.pokemonshowdown.com/src/battle-animations.ts): 배틀 재생/연출 엔진 자체 MIT, 다수 효과/이미지 CC0라는 파일별 고지 확인.
- 불꽃·물·에너지·섀도볼·얼음 구체·잎·베기·타격·주먹·물기 이미지 22개를 `public/vendor/showdown/fx`에 확보했다. 원본 코드는 `vendor/showdown-reference`에 보관한다.
- 전체 클라이언트는 AGPLv3이지만 위 파일별 예외가 존재한다. 앞서 전체 라이선스만 보고 설명한 것은 불완전했다. 이미지 예외인 icicle/lightning/bone 및 GPL 별도 고지인 rocks/rock1/rock2는 이번 수집에서 제외했다.
- 이것은 Showdown의 기존 연출이며 원작 모든 세대의 애니메이션과 일치한다는 의미는 아니다. 동일한 연출을 공유하거나 placeholder를 사용하는 기술도 있다.

연동 과제: 기존 연출은 `scene.showEffect`, 스프라이트 좌표·크기·투명도·타임라인, jQuery 기반 장면 API 등을 사용한다. 현재 React 화면에 파일 하나를 import하면 끝나는 구조가 아니다. 필요한 연출 API를 연결하거나 분리된 Showdown 장면을 도입하는 작은 검증이 필요하다. 현재 서버의 공개 배틀 로그를 연결할 수 있다는 설계상 판단이며 아직 실행 검증은 하지 않았다.

### 효과음

[Kenney Impact Sounds](https://kenney.nl/assets/impact-sounds) 공식 배포 ZIP을 확보하여 `vendor/kenney-impact-sounds/pack`에 압축 해제했다. 동봉 `License.txt`는 CC0이며 개인/교육/상업 프로젝트 사용을 명시한다. 타격/부딪힘 등의 사운드 후보이며 포켓몬 원작 기술 효과음 팩이 아니다. 실제 기술 매칭과 청취 검증 전이므로 게임에 연결하지 않았다.

Showdown의 시각 연출 라이선스가 공식 BGM·울음소리·원작 기술 효과음까지 허가하는 것은 아니다. Sound Library의 게임 이용 제외 조건은 그대로 적용된다. 필요한 기술 효과음을 모두 확보했다는 주장은 하지 않는다.

## 다른 팬게임은 무엇을 쓰는가

전부 직접 그려야 하는 것은 아니다. Pokémon Essentials처럼 포켓몬용 게임 틀을 사용하거나, ROM 해킹/디컴파일 기반에서 기존 배틀 애니메이션 데이터와 그래픽을 활용하는 경로가 실제 존재한다. [Essentials 저장소](https://github.com/Maruno17/pokemon-essentials)는 RPG Maker XP 기반이며 자체적으로 완전한 프로젝트가 아니고 별도 Essentials 프로젝트가 필요하다고 설명한다. [pokeemerald](https://github.com/pret/pokeemerald/tree/master/graphics/battle_anims)에는 기존 배틀 애니메이션 그래픽 디렉터리가 존재한다.

어느 특정 팬게임이 무엇을 썼는지는 그 프로젝트의 출처를 확인해야 한다. 다른 팬게임에 사용된다는 사실을 우리에게 주어진 재배포 허가로 간주하지는 않는다. 기존 코드와 원작 이미지/음원은 권리 범위가 서로 다를 수 있다.

## 툴 선택의 비교

| 방식 | 활용할 수 있는 것 | 이 프로젝트에 미치는 영향 |
|---|---|---|
| 현재 웹 + Showdown 기존 연출 | 기술별 기존 연출 코드와 효과 이미지, 현재 서버 전투 엔진/저장 유지 | 장면 연결 작업 필요. 웹·백엔드 포트폴리오 목표에 가장 가까움. 현재 우선 검증 후보 |
| RPG Maker XP + Pokémon Essentials | 포켓몬용 배틀/게임 틀 활용 | 웹 UI를 그대로 이전할 수 없음. 현재 Node/DB와의 연동 및 전투 엔진 유지 여부를 재설계해야 함. 실제 대안으로 유지 |
| Godot | 스프라이트 시트/애니메이션 편집 도구 | 포켓몬 기술 리소스가 자동 제공되지는 않음. 화면 제작 도구는 달라지지만 리소스 확보 과제는 남음 |

[Godot 공식 애니메이션 문서](https://docs.godotengine.org/en/stable/tutorials/2d/2d_sprite_animation.html)는 별도 이미지/스프라이트 시트를 가져와 AnimatedSprite2D/AnimationPlayer로 재생하는 흐름을 설명한다.

다음 판단 근거는 화염방사·파도타기·10만볼트 같은 대표 기술의 **기존 리소스 재사용 시제품**이다. 성공하면 그 방식으로 확장하고, 연동 또는 품질이 부적합하면 어떤 부분이 막혔는지 설명하고 Essentials 전환을 논의한다. 이번 조사에서는 다운로드와 원본/라이선스 확인만 수행했다. 게임 연출 변경·엔진 설치·툴 전환은 수행하지 않았다.
