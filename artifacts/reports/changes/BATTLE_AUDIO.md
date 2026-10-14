> 문서 범위: 아래 내용과 검증 수치는 작성 당시 기록이다. 현재 기능·층수·가격·키 조작·상대 AI는 [STATUS](../../../docs/STATUS.md), 후속 작업은 [ROADMAP](../../../docs/current/ROADMAP.md), 실험 적용 상태는 [EXPERIMENTS](../../experiments/README.md)를 먼저 확인한다.

# 배틀 연출과 소리 (2026-10-09 문서 갱신)

## 2026-10-09 관장·챔피언 곡 통합

관장과 챔피언은 모두 현재 관장 곡 Battle Theme A를 동일한 음량(0.87배)으로 사용한다. 역할과 챔피언 배경은 구분하지만 음악 파일은 공유한다. 현재 9개 상황에 고유 곡 8개(CC0 파일 6개·자체 합성 2개)가 연결된다. 아래 곡 수·측정의 이전 기록은 당시 상태다. 추후 관장·챔피언 후보곡을 추가해 대결마다 그중 하나를 선택하는 구상은 PRESENTATION_PLAN에 기록하며 아직 구현하지 않는다.

## 2026-10-09 승리 곡과 크로스페이드

승리·보상 합성곡을 CC0 Victory Theme for RPG로 교체했다. 작곡가의 승리 테마 설명과 exciting/epic 태그를 기준으로 선정했으며 청감은 사용자 피드백으로 조정한다. 새 곡은 0.936배로 보정했다. 전체 9곡 재측정은 약 -13.4dB 가중 RMS이며 피크는 0.9 이하다.

전환용 gain과 사용자 볼륨 gain을 분리하여 전환 중 음소거·볼륨 변경이 모든 겹친 곡에 적용된다. 여러 번 빠르게 바꾸면 준비 중인 곡을 정리하고 실제 재생 중인 이전 곡을 이어받는다. 최종 출력의 공통 리미터로 겹친 소리의 피크도 제한한다. 박자 맞춤 전환이나 파일 자체의 루프 경계 편집은 적용하지 않았다. 지연 로딩·겹친 두 곡의 gain·음소거·빠른 연속 전환·정지와 실제 배틀/결과 화면을 Chrome에서 확인했다.

관장·빌런·챔피언, 상대 희귀 포켓몬 등장, 보상 선택·완주·패배의 음악 분기와 층별 배경을 자체 제작 초안으로 적용했다. [배경·BGM 기획](../../../docs/gameplay/BATTLE.md)에 적용 범위와 후속 계획을 정리했다.

서버의 Pokémon Showdown 공개 프로토콜을 공격 → 피격/HP → 기절/교체 순서로 재생한다. 클라이언트는 데미지나 승패를 계산하지 않는다. 연출 중 행동 버튼은 잠기며, 결과 팝업과 보상 UI는 연출 종료 후 표시한다. 건너뛰기는 이미 확정된 서버 결과를 즉시 표시한다. 페이지 새로고침 시 연출을 재현하지 않고 저장된 최종 상태로 복구한다.

사용자 결정으로 기술 투사체·임팩트는 보류한다. 공격자는 짧게 움직이고, 피격자는 360ms 동안 세 번 깜빡이며 약하게 흔들린다. 이는 직접 작성한 CSS 기본 동작이며 다른 게임의 코드·리소스를 사용하지 않는다. 회복·교체·기절 동작은 유지한다. 공개 로그의 체력은 백분율이므로 연출 중 자신의 HP도 %로 표시하고 종료 후 정확한 서버 HP로 되돌린다. 운영체제의 동작 줄이기 설정에서는 연출을 생략한다.

전투 5곡(관장·챔피언 공통)과 승리·보상 1곡은 OpenGameArt에 CC0로 공개된 완성 음원을 로컬 파일로 제공한다. 효과음과 완주·패배 음악 2곡은 자체 Web Audio 합성 코드다. 포켓몬 공식 음악을 편곡하거나 샘플링하지 않았다. BGM/효과음 볼륨은 독립적이며 기존 브라우저 음소거 설정을 보존한다. 처음에는 음소거이며, 설정 또는 배틀의 소리 켜기로 활성화한다. 브라우저 자동 재생 제한 시 사용자 클릭 후 재생한다. 화면 이동 시 음악을 정지하고, 탭이 숨겨지면 재생을 일시 중지한다.

현재 곡은 일반·엘리트·관장·빌런·챔피언·통합 희귀 포켓몬·보상·완주·패배의 9종이다. 설정에서 미리듣기가 가능하다. MediaElementAudioSourceNode를 통해 BGM 볼륨과 별도의 전환 GainNode로 출력한다. 다음 파일이 실제 재생되면 1.1초 동안 이전 곡을 줄이고 다음 곡을 키우는 선형 크로스페이드를 적용한다. 로딩 중에는 이전 곡을 유지한다. 처음 시작은 0.25초 페이드인, 정지는 0.18초 페이드아웃이다. 같은 곡은 행동마다 다시 시작하지 않고 탭 숨김에서는 재생 위치를 멈췄다가 복구한다. HTML audio loop로 파일 전체를 반복한다. 원음 파일 자체의 경계나 쉼은 남을 수 있으며 완전 무봉제 반복을 보장하지 않는다. 출처·원본 다운로드 URL·CC0 표시·크기·SHA256은 [음원 출처](../../../public/audio/music-sources.json)에 기록했다.

5층 무작위 관장/캡틴과 10층 무작위 챔피언/최종 상대는 각각 관장·챔피언 곡을 사용한다. 새 엘리트는 실제 등장과 전용 음악을 연결했다. 빌런은 곡·역할 분기와 트레이너 샘플을 준비했으며 실제 층 배치는 후속이다. 상대가 공개 프로토콜에 준전설·환상·전설로 등장하면 네임드 여부와 관계없이 특별 곡을 사용한다. 준전설·전설·환상은 같은 희귀 포켓몬 곡을 사용하며, 이후 일반 상대가 나와도 해당 경기에서 유지한다. 이전 브라우저 캐시의 세 분류도 통합 곡으로 복구한다. 공개 기록과 현재 상대, 같은 탭의 공개 등장 캐시로 새로고침에서도 복구한다. 다른 기기나 탭에서는 전달된 공개 기록 범위에 따른다. 플레이어의 희귀 포켓몬과 미공개 상대 파티는 음악을 바꾸지 않는다.

승패 음악은 연출이 끝난 뒤 보상·패배·완주 상태에 맞춰 바뀐다. 패배 후 새 도전 준비 및 완주 후 재도전에서는 정지한다. 배경은 현재 10층의 1~3층 야외, 4~6층 실내, 7~9층 야간, 마지막 층 정상이며, 타워 길이에 대한 진행 비율로 구간을 계산한다. 챔피언과 빌런은 전용 정상·시설 배경을 우선한다. 배경은 자체 CSS 그림이며 상대 타입과 무관하다.

## 공식 사운드 라이브러리 확인

2026-10-04 사용자가 제안한 [Pokémon Game Sound Library](https://soundlibrary.pokemon.co.jp/)의 [다운로드 안내](https://soundlibrary.pokemon.co.jp/en/download-info)와 [공식 가이드라인](https://soundlibrary.pokemon.co.jp/en/download)을 확인했다. 적·녹 45곡 음원 등을 무료 다운로드할 수 있으나, 가이드라인 ④에 `ゲーム・アプリ・ソフトウェア・プログラムへの利用でないこと`(게임·앱·소프트웨어·프로그램에 이용하지 않을 것)가 명시되어 있다. 비영리여도 이 웹 게임에는 사용할 수 없으므로 음원을 다운로드하거나 포함하지 않았다. 별도 허락을 받기 전에는 자체 제작 또는 게임 이용이 허용된 음악을 사용한다.

## 트레이너 등장과 시작 확인

새 배틀에서는 경기장에 플레이어 지우와 상대가 등장하고 하단에 ‘이름이/가 나타났다!’를 표시한다. Z 또는 화면 버튼을 누를 때까지 기다린 뒤 두 트레이너가 볼을 던진다. 투구 시간은 0.85초에서 0.55초로 줄였다. 지우는 생성 뒷모습 4프레임을 사용하며 상대 일반 NPC는 저장된 타입별 일반·엘리트·혼합 샘플을 사용한다. trainer 정보가 없는 이전 경기에서는 기존 4종 외형으로 복구한다. 5층 관장/캡틴·10층 챔피언/최종 상대는 각각 9명 중 도전별로 추첨한다.

도감 출발과 층 진입 모두 동일한 흐름이다. Shift/건너뛰기 버튼은 확인 대기와 뒤따르는 연출을 생략하고 확정된 서버 상태를 표시한다. 새로고침·이어하기는 등장 연출을 반복하지 않는다. 동작 줄이기 설정은 움직임을 줄이지만 시작 확인은 유지한다.

## 등장·기절과 울음소리 연결

새 배틀 시작·다음 층 진입·교체 때 CSS 도형으로 볼 열림 → 빛 테두리 → 포켓몬 확대 순서를 재생한다. 다른 게임의 코드나 효과 이미지를 가져오지 않았다. 새로고침으로 복구할 때는 다시 재생하지 않는다.

등장·기절 이벤트는 `public/audio/cries/{도감번호}.ogg` 재생에 연결했다. **울음소리 파일은 제공하지 않아 현재 실제 울음소리는 나지 않는다.** PokéAPI의 cries.latest/legacy와 PokeAPI/cries 저장소에서 제공 여부를 확인했으나 원본 음원의 게임 재사용 허락은 확인하지 못했다. API 접근 가능 여부와 음원 이용 허락을 구분한다. 사용 조건이 확인된 파일을 위 경로에 넣고 THIRD_PARTY에 출처를 기록해야 한다. 임의로 비슷한 울음소리를 합성하지 않는다. 음소거·효과음 볼륨을 적용하며 화면 이동·탭 숨김·다음 울음소리에서 이전 재생을 정지한다. 파일 없음·재생 실패는 게임 진행을 막지 않는다.

## 2026-10-09 이전 합성 편곡 초안 (전투곡은 이후 외부 음원으로 교체)

짧은 사각파 아르페지오를 반복하던 초안을 수정했다. 모든 곡을 64박자 스텝의 지속음·쉼표·응답 선율로 구성하고, 저역 필터와 미세한 디튠을 건 리드/패드, 배음 건반, 당김음 베이스, 킥·스네어·하이햇·필을 겹친다. 보상·패배와 환상 곡은 건반 선율을 사용한다. 유튜브 참고 링크 Bpz7WeAroxw의 음원은 도구에서 접근하지 못해 청취하지 못했다. 요청한 현대적인 배틀 편곡 방향을 기준으로 만든 자체 초안이며, 실제 청감은 사용자 피드백으로 조정한다. 이 초안은 외부 음원을 사용하지 않았으나, 이후 사용자 요청으로 전투곡은 아래 CC0 완성 음원으로 교체했다.


## 2026-10-09 전투 BGM 교체

기존 합성 전투곡을 다음 OpenGameArt 완성 음원으로 교체했다. 각 원본 페이지에서 CC0 표시를 확인했다. 파일을 다운로드해 로컬 제공하며 수정 없이 이름만 변경했다. 원본 파일과 해시·다운로드 URL은 [battle-music-sources.json](../../../public/audio/music-sources.json), 재현 스크립트는 `scripts/import-battle-music.mjs`에 기록했다. 저작자를 아래에 함께 표시한다. 포켓몬 공식 음원이나 유튜브 음원은 사용하지 않았다.

| 역할 | 곡 | 작곡가 | 라이선스 |
|---|---|---|---|
| trainer | [Boss Battle Theme](https://opengameart.org/content/boss-battle-theme) | Cleyton Kauffman | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| elite | [RPG Battle Theme II / Fighting is not an option](https://opengameart.org/node/51807) | Cleyton Kauffman | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| gym | [Battle Theme A](https://opengameart.org/content/battle-theme-a) | cynicmusic / Alex Smith | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| villain | [Unchained Destiny [Rock]](https://opengameart.org/content/unchained-destiny-rock) | nene | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| champion (관장 공통) | [Battle Theme A](https://opengameart.org/content/battle-theme-a) | cynicmusic / Alex Smith | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| rare | [The Final Battle](https://opengameart.org/content/the-final-battle) | skrjablin | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| reward | [Victory Theme for RPG](https://opengameart.org/content/victory-theme-for-rpg) | cynicmusic / Alex Smith | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |

## 2026-10-09 곡 선호 반영과 음량 보정

관장·챔피언·희귀 포켓몬 곡은 유지했다. 일반은 Battle Theme B for RPG, 엘리트는 Unchained Destiny [Rock], 빌런은 RPG Battle Theme II로 교체했다. 작곡가의 게시 설명과 사용자 피드백을 기준으로 골랐으며 청감의 최종 판단은 사용자에게 있다.

실제 파일 전체와 자체 결과 곡의 전체 루프를 디코딩/오프라인 렌더링하여 400ms 블록의 주파수 가중 RMS를 비교했다. 관장 곡 기준으로 곡별 GainNode를 보정하고, 출력의 큰 순간은 WaveShaper로 0.9 이하로 완만히 제한한다. 사용자 BGM 볼륨·음소거는 기존 마스터 GainNode가 제어한다. 측정은 정식 LUFS 인증이 아닌 음량 비교 근사이며 곡 중간의 강약은 유지한다.

보정 전 결과 3곡은 관장 대비 약 13~14dB 작았으며 승리 5.001배·완주 4.578배·패배 4.951배 보정했다. 보정 후 전체 9곡의 가중 RMS는 약 -13.4dB로 맞고 피크는 0.9 이하다. [보정 전](../../qa/audio/music-levels-before.json), [보정 후](../../qa/audio/music-levels.json), 재측정 `node scripts/measure-music-levels.mjs`.

## 2026-10-09 음악 역할 재배치

사용자 요청으로 엘리트와 빌런 곡을 서로 교환했다. 기존 관장 Boss Battle Theme를 일반 트레이너에 배치했다. 새 관장 곡은 cynicmusic의 CC0 Battle Theme A(브라스·현악 배틀)이며 일반전보다 한 단계 강한 관문 분위기를 목표로 선정했다. 직접 청취한 판단은 아니며 사용자 플레이 피드백으로 조정한다. 곡별 보정 값도 역할에 따라 옮기고 새 관장 곡은 0.87배로 조정했다. 재측정 기준 곡은 기존 관장에서 현재 일반 트레이너로 이동했다. 전체 9곡은 약 -13.4dB 가중 RMS를 유지한다.

## 2026-10-10 · 효과음 개편

PokéRogue의 [피격 이벤트](https://github.com/pagefaultgames/pokerogue/blob/beta/src/phases/damage-anim-phase.ts)와 [화염방사](https://github.com/pagefaultgames/pokerogue-assets/blob/beta/battle-anims/flamethrower.json), [10만볼트](https://github.com/pagefaultgames/pokerogue-assets/blob/beta/battle-anims/thunderbolt.json)의 소리 타이밍을 참고했다. 공개 피격 WAV를 메모리에서 디코딩해 일반 0.714초 / 강한 1.510초 / 약한 0.487초, 유효 파형 약 0.614 / 1.345 / 0.394초를 측정했다. 청감 비교 완료라는 의미는 아니다. 원본 파일은 저장하거나 게임에 배포하지 않았다.

게임 소리는 Web Audio로 직접 합성한다. 커서·결정·취소, 18타입 기술, 일반/약한/강한/급소 피격, 회복·교체·기절·능력 변화·영입·승패, 메가진화 단계와 다이맥스 단계를 분리했다. 불꽃은 겹친 분사음, 전기는 짧은 방전 후 타격, 강한 피격은 긴 잔향을 둔다. 현재 타입 공통음이며 모든 개별 기술의 원작 효과음을 재현한 것은 아니다.

설정에서 37종 미리듣기를 제공한다. scripts/render-sound-effects.mjs는 실제 Chrome OfflineAudioContext로 렌더링하고 음량을 보정한다. 보고서는 artifacts/qa/audio/effect-levels.json, 비교 파일은 artifacts/qa/audio/audio/effects-preview.wav이다. 미리듣기 순서: 커서 → 결정 → 취소 → 불꽃 → 물 → 전기 → 일반 피격 → 강한 피격 → 메가 충전 → 메가 해방 → 다이맥스 에너지 → 다이맥스 등장.

효과음은 기존 효과음 슬라이더를 따르고, 음소거·볼륨 0·숨김·Shift 건너뛰기·페이지 이탈 시 정지한다. 강한 타격/변신 때 BGM을 잠깐 낮추고 복귀한다. 포켓몬 울음소리는 경로 훅만 있으며 원본 음원은 아직 없다.

## 2026-10-10 · 울음소리 추가 조사

- PokéRogue audio/cry 목록에서 25.m4a, 445.m4a, 445-mega.m4a를 확인했다. [목록](https://github.com/pagefaultgames/pokerogue-assets/tree/beta/audio/cry).
- Showdown은 [울음소리 목록](https://play.pokemonshowdown.com/audio/cries/)에 피카츄·한카리아스·메가한카리아스 등 종/형태별 MP3/OGG를 제공한다. 일반: https://play.pokemonshowdown.com/audio/cries/garchomp.ogg / 메가: https://play.pokemonshowdown.com/audio/cries/garchomp-mega.ogg . 파일명/목록 확인이며 이번 조사에서 울음소리를 청취하거나 게임에 연결하지 않았다.
- PokéRogue [audio/REUSE.toml](https://github.com/pagefaultgames/pokerogue-assets/blob/beta/audio/REUSE.toml)은 cry/*를 Nintendo, Creatures Inc., GAME FREAK inc. 원작 자산, LicenseRef-FAIR-USE로 고지한다. 이는 우리 게임에 대한 권리자의 재사용 허가를 확인한 것이 아니다. 이전에 미확인이었던 음원 하위 고지를 이번에 확인했다.
- PokeAPI/cries는 Gen1~9 latest/legacy 자료를 제공하지만 LICENSE는 음원 내용의 Pokémon Company 저작권을 명시한다.
- CC0 대체 후보: [Ogrebane Monster Sound Effects Pack](https://opengameart.org/content/monster-sound-effects-pack), [pauliuw Some kind of beings sounds(7)](https://opengameart.org/content/some-kind-of-beings-sounds7). 페이지의 CC0 고지는 확인했으나 원작 포켓몬 울음소리는 아니며 음색 유사성/청감 검증은 하지 않았다. 사용자가 원작에 가까운 자료를 더 찾는 방향을 선택했으므로 임의 합성 울음소리/일반 몬스터 음원을 적용하지 않았다.

메뉴·기술·피격·변신 합성음만 실제 적용. Chrome 효과음 37종 재생/음소거/볼륨 0 검사, BGM 전환 및 배틀 키보드 E2E 총 10개 통과(기존 10층 배경 fixture의 total_floors=10 명시 후 재검증). 연출/기믹 단위 검사 15개와 프로덕션 빌드 통과.
