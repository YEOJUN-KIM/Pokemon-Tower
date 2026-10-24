# 게임 소개 화면

2026-10-20, 1차 완성 코드의 프로덕션 빌드를 Chrome에서 촬영했다. 별도 .data/readme-demo/tower.sqlite와 시연 계정을 사용했으며 실제 사용자 저장을 사용하지 않았다.

| 파일 | 장면 |
|---|---|
| overview-title.png | 1440×900 타이틀 |
| overview-battle.png | 1440×900 혼합룰 배틀·기술 선택 |
| overview-pokedex.png | 1440×900 분리 이전 도감·편성 화면 (현재 README에서는 제외) |
| overview-upgrades.png | 1440×900 영구 업그레이드 |
| overview-eggs.png | 1440×900 기본 알뽑기 |
| overview-mobile.png | 390×844 모바일 배틀 |

기존 촬영분을 게임 소개 예시로 사용하며 beta.5 신규 촬영으로 표기하지 않는다. 도감/출전 편성 분리 전 캡처는 현재 역할 설명과 충돌하므로 root README에서 제외했다. 별도 기믹 스크린샷은 아직 없으며 가짜 경로를 추가하지 않는다. 새 촬영 시 실제 게임·독립 시연 DB로 확인한다.

## README 기믹 아이콘

다이맥스는 기존 프로젝트 SVG를 유지한다. 메가진화·테라스탈·Z기술은 게임에서 사용하는 리자몽나이트Y·테라스탈오브·노말Z 아이콘을 재사용한다. runtime 폴더는 Git 제외이므로 README 전용 원본 사본 3개만 `gimmicks/`에 보관한다. 이미지 bytes는 변경하지 않으며 runtime의 Git 제외·복원 정책도 유지한다.

| 문서용 파일 | 제공원·고정 원본 |
|---|---|
| [리자몽나이트Y](gimmicks/charizardite-y.png) | [PokeAPI/sprites · 0dc105d5](https://raw.githubusercontent.com/PokeAPI/sprites/0dc105d5b12416932f29b594078282ab4be045f5/sprites/items/charizardite-y.png) |
| [테라스탈오브](gimmicks/tera-orb.png) | [PokéRogue assets · 325c7de6](https://raw.githubusercontent.com/pagefaultgames/pokerogue-assets/325c7de68e6c323e12243271ea510c6b0e1b992e/images/items/tera_orb.png) |
| [노말Z](gimmicks/normalium-z.png) | [PokeAPI/sprites · 0dc105d5](https://raw.githubusercontent.com/PokeAPI/sprites/0dc105d5b12416932f29b594078282ab4be045f5/sprites/items/normalium-z--bag.png) |

경로별 SHA256·제공원은 기존 [혼합 runtime manifest](../assets/manifests/mixed-runtime-assets.json)의 동일 파일을 따른다. 외부 자산이며 project-original로 분류하지 않는다. 권리·고지는 [출처 안내](../references/THIRD_PARTY.md)를 유지한다.
