> 구현 구조와 출처의 공식 문서다. 2026-10-24에 전체 기술 설계와 랭크 연출을 정리했다. 전체 매핑과 후속 보강은 [연출 계획](../gameplay/MOVE_EFFECTS_PLAN.md#전체-기술-연출-매핑)을 따른다.

# 기술 시각 연출

2026-10-12. 기존 배틀 로그 재생에 Showdown의 CC0 효과 PNG 22개를 연결했다. 원작 하트골드 애니메이션을 추출하거나 전체 Showdown 클라이언트를 가져온 구현은 아니다.

## 구성

- `src/data/move-presentations.json`: `moveInfo`에 등록된 934개 기술을 69개 의미 기반 프리셋에 명시적으로 연결한다. 타입만으로 자동 분류하지 않는다. Z·맥스·거다이맥스·전용기도 공용 조합을 사용한다.
- `src/web/move-presentation.ts`: PokemonMotion, ScreenEffect, MainVFX, ImpactVFX, TargetEffect, Sound, SpecialSequence, 상태 표시, 시간과 판단 이유를 정의한다. 개별 예외는 `movePresentationOverrides`에 둔다. 미등록 미래 기술의 안전 대체는 공용 projectile이며 등록 기술 누락은 테스트가 차단한다.
- `src/web/move-animation-plan.ts`: 설계 프리셋의 `rendererStyle`을 기존 파티클 엔진에 연결하는 adapter다. 목표 VFX가 모두 새로 제작된 것은 아니다. 빔·물결·방어막·설치물 등은 기존 이미지나 support 효과로 근사하며 정확한 상태는 아래 자산 목록에 기록한다. 타입 색상은 재질의 참고값이며 기술 동작의 분류 기준이 아니다. 테라버스트의 물 재질은 명시적 동적 예외다.
- `src/web/move-visuals.tsx`: 실제 포켓몬 이미지 좌표를 기준으로 Canvas에서 효과를 재생한다. 접근·피격은 Web Animations API를 사용한다. DPR은 2로 제한하고 동시에 표시하는 파티클을 제한한다.
- `src/web/battle-presentation.ts`: 공개 프로토콜의 사용자·상대·대상을 유지하고 연출이 끝난 뒤 HP 변경을 표시한다. 빗나감은 대상 옆으로, 무효·흡수는 피격 흔들림 없이 표현한다.
- 파일은 로컬 `/vendor/showdown/fx/`에서 한 번 불러온다. 스킵·장면 종료·페이지 이탈 시 RAF와 애니메이션을 취소한다. 동작 감소 설정에서는 이동·화면 색 변화·번개 선 대신 정적인 효과만 표시한다.

대표 구성: 화염방사(연속 불꽃), 파도타기(물결), 번개(수직 낙뢰), 10만볼트(대상 주변 전기 Burst), 전기쇼크(작은 전기 구체), 냉동빔(광선), 섀도볼(구체·연기), 리프스톰(잎 궤적), 드래곤클로(발톱), 깨물어부수기(이빨), 인파이트(연속 주먹), 지진(전장·참가 포켓몬 흔들림·작은 흙먼지), 그림자분신(좌우 반투명 스프라이트 복제), 전광석화(빠른 접근·잔상), 울음소리(Canvas 음파). 분신·잔상·음파·지진 흔들림에 새 파일은 필요하지 않다.

## 랭크 변화 규칙

모든 능력치(공격·방어·특수공격·특수방어·스피드·명중률·회피율)는 상승 1종(AuraUp)과 하락 1종(AuraDown)을 공유한다. 별도의 능력치명 플로팅 텍스트는 제거하고 포켓몬의 빛·방향 입자와 전투 대사만 표시한다. HP 회복 표시는 유지한다.

공개 프로토콜에서 연속된 `-boost`/`-unboost`가 하나의 효과 묶음이다. 같은 묶음 안에서는 actor와 방향으로 중복을 제거한다. 서로 다른 포켓몬은 각각 재생한다. 상승·하락이 섞이면 각각 최대 1회다. 다른 이벤트 또는 `[from]`/`[of]` 원인이 바뀌면 새 묶음으로 시작하므로 다음 기술·아이템·특성의 변화가 누락되지 않는다. `[silent]`와 0단계는 시각 효과를 만들지 않는다. 원본 프로토콜, 능력치 계산과 효과 판정은 수정하지 않는다.

인파이트: 기술 → 피해 → 공용 하락 1회와 “방어가 떨어졌다!” → 다음 메시지 “특수방어가 떨어졌다!”. 각 메시지는 기존 진행/스킵 경로를 사용하며 화면에 순서대로 남는다. 두 단계는 “크게”, 세 단계 이상은 “매우 크게”로 표현한다. 전체 로그는 원문/원인 정보를 유지한다. 칼춤 등의 준비 오라는 실제 상승 결과와 구별되며, 결과 이벤트 외에서 랭크 효과를 미리 재생하지 않는다.

## 배속·사운드·취소

모든 설계 시간은 1배속 타임라인(ms)이다. 기존 `playbackDuration`에 1·2·4배속을 적용하고 Canvas 경과 시간·WAAPI rate·프로시저 사운드의 길이/지연에도 같은 배속을 적용한다. WAAPI는 생성 즉시 rate를 설정하여 부모 effect 실행 순서에 의존하지 않는다. 랭크 변화는 important 대사로 취급하고 최소 시각 유지 220ms와 기존 메시지 읽기 시간을 보장한다. 기술 이름은 기존 기술 사용 대사로 유지한다. 최종 HP 변경은 연출 프레임 다음의 프로토콜 결과 프레임에서 처리한다.

사운드는 Impact/Rush/Rumble/Voice/Support의 동작별 합성과 Energy/Stream의 기존 재질 합성을 조합한다. 신규 오디오 파일은 없다. 미스·무효·흡수에는 대상 피격을 재생하지 않으며 기존 즉시 스킵·캔버스 정리·움직임 감소 설정을 유지한다.

## 공용 VFX 목록과 재생성

`src/web/shared-vfx.ts`는 공용 기술 VFX 27종과 랭크 2종의 현재 지원 상태를 기록한다. existing(기존 자산), procedural(코드 표현), approximation(현재 대체 표현과 후속 보강)을 구분한다. 이번 작업에서 파일을 수급하거나 제작하지 않았다.

`pnpm exec tsx scripts/document-move-presentations.ts`로 [전체 매핑표](../gameplay/MOVE_EFFECTS_PLAN.md#전체-기술-연출-매핑)와 [기계 판독용 역산 목록](../assets/manifests/move-presentation-requirements.json)을 재생성한다. 후자는 VFX별 실제 사용 기술 배열, 현재 대체, 후속 필요 사항, 별도 검토 18건을 포함한다. 공용 형태를 지정한 934개 중 미매핑 기술은 0개다. 분신/호출/잠복/지연/부활/다중 타격의 추가 품질 검토는 효과 판정의 변경을 뜻하지 않는다.

## 향후 개별 연출 확장

개별 기술의 데이터 키를 유지한 채 `movePresentationOverrides`에서 공용 구성·시간·SpecialSequence를 교체한다. 새로운 특별 시퀀스는 같은 Canvas/WAAPI·배속·취소 경로에 handler를 추가한다. `dedicatedVfx`는 향후 자산 resolver 확장 지점이며 현재 전용 파일 loader는 구현하지 않았다. 전용 VFX를 도입할 때만 resolver와 로컬 자산 등록/라이선스 검증을 추가한다. 데미지·기술 효과 로직은 계속 Showdown 공개 결과가 소유한다.

## 현재 변경 검증 (2026-10-24)

- 관련 단위·회귀 30개 통과: 전체 등록 기술 커버리지, VFX 사용처 일치, 인파이트·혼합 방향·여러 대상·새 원인 경계·0단계·silent, 배속별 대사 유지, 피해/특성 순서.
- 전체 TypeScript 테스트 1,535개 중 샌드박스 실행에서 1,527개 통과. 실패 8개는 이번 변경과 무관한 임시 파일 rename 권한·로컬 런처 시작 제한이었으며 해당 5개 파일을 정상 권한 환경에서 재검사하여 30/30 통과했다.
- Chrome 관련 E2E 총 12개 시나리오 통과: 최신 배속·랭크·공통 모션 3개, 기존 기술/양방향/모바일/동작 감소/스킵/HP 순서 5개, 특성·회복 4개. 최종 모션 검사에는 에어슬래시의 원거리 베기도 포함한다. 모바일 하락 화면에서 플로팅 능력치 텍스트가 없는 것을 직접 확인했다.
- 최종 프로덕션 빌드(내장 TypeScript 포함), CSS 구조, 문서/작업공간 구조 검사 통과. Windows junction·Chrome localhost 권한이 필요한 검사는 정상 권한 실행을 사용했다.

## 이번 변경 파일 (2026-10-24)

| 역할 | 파일 |
|---|---|
| 전체 기술 데이터 | `src/data/move-presentations.json` |
| 공용 설계·VFX 지원 상태 | `src/web/move-presentation.ts`, `src/web/shared-vfx.ts` |
| 런타임 adapter·Canvas/스프라이트 | `src/web/move-animation-plan.ts`, `src/web/move-visuals.tsx` |
| 랭크 묶음·대사·팝업 제거 | `src/web/battle-presentation.ts`, `src/web/battle-message-data.ts`, `src/web/battle-pokemon.tsx` |
| 배속·공용 사운드 연결 | `src/web/battle-game.tsx`, `src/web/sound-design.ts` |
| 재생성·문서 정책 | `scripts/document-move-presentations.ts`, `scripts/check-workspace.mjs`, `scripts/README.md` |
| 공식 문서·사용처 manifest | 이 문서, `docs/gameplay/MOVE_EFFECTS_PLAN.md`, `docs/assets/manifests/move-presentation-requirements.json` |
| 회귀 테스트 | `tests/move-presentation.test.ts`, `tests/move-animation-plan.test.ts`, `tests/battle-message-data.test.ts`, `tests/effects.test.ts`, `e2e/move-presentation.spec.ts`, `e2e/effects.spec.ts` |

기존 특성 E2E는 계정 인증 도입 이전의 guest fixture를 현재 계정 방식으로 갱신했다. 저수 효과의 원인 설명은 팝업·로그에만 두는 현행 정책에 맞춰 대사 중복 기대값도 갱신했다.

## 출처

파일별 라이선스는 [보관한 원본](../../external/reference/showdown/battle-animations.ts)과 [기술 코드](../../external/reference/showdown/battle-animations-moves.ts)의 고지를 따른다. 참고 버전은 `c0f6bfc707a5e3bba4da3785e9cb06c8ae04f8d9`. `icicle`, `lightning`, `bone`, `rocks`, `rock1`, `rock2` 등 별도 조건의 이미지는 사용하지 않는다. 코드의 궤적·시간 구성을 참고하고 현재 화면에 맞는 렌더러를 직접 구현했다. [출처와 재사용](../references/THIRD_PARTY.md).

기존 원자료 manifest는 당시 `integrated:false` 기록을 보존한다. 현재 연결 목록은 `docs/assets/manifests/move-effects-integration.json`에 기록한다.

## Pixel Art Spells · Projectile 후보 8종

확인일: 2026-10-24. 이번 단계는 외부 공용 Projectile 원본 수급·분류와 선택 카탈로그 제공까지다. 전체 기술 매핑, 기존 Showdown 효과, 전투 재생·피해·랭크 로직은 바꾸지 않았다. 카탈로그 등록이 전투 적용을 뜻하지 않는다.

### 출처와 라이선스

- 팩: [Pixel Art Spells](https://opengameart.org/content/pixel-art-spells), 제작자 [DevWizard](https://opengameart.org/users/devwizard).
- 공식 다운로드: [pixelart_spells_1.zip](https://opengameart.org/sites/default/files/pixelart_spells_1.zip), 32,481 bytes. SHA-256 `bf6e751559942aad40a50359ab5ae8f9750054546de0b21b4519d39904e163cb`.
- 배포 페이지는 CC0를 명시하고 크레딧을 선택 사항으로 설명한다. [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)에 따라 상업·비상업 사용, 수정, 복제와 재배포가 가능하다. 출처 표기·동일조건 배포·소스 공개 의무는 없으며 별도 재배포 제한도 게시되지 않았다. 특허·상표 권리나 제작자 보증을 제공한다는 의미는 아니다.
- 자발적 크레딧: `Pixel Art Spells by DevWizard (CC0 1.0, OpenGameArt)`.
- ZIP에는 라이선스 문서가 없다. [프로젝트 작성 라이선스 기록](../../external/third-party/devwizard-pixel-art-spells/LICENSE.txt)과 [공식 attribution 문서](../references/THIRD_PARTY.md)에 확인 근거를 남겼다. 공식 법률문은 온라인 검토했고, 별도 `legalcode.txt` 다운로드의 HTTP 403에는 우회를 시도하지 않았다.

### 실제 ZIP 검사 결과

전체 ZIP은 조사용 QA 위치에서만 열었으며 추적 원본·runtime에는 선택 8종만 반입했다. PNG **22개**, `.ase` **21개**이고 개별 프레임 PNG, GIF, JSON atlas, 엔진 import 설정, FPS/Loop 설명 문서는 없다. 배포 페이지의 ASP라는 설명과 달리 실제 확장자는 `.ase`, 원본 폴더명은 `Asprite Files`다. Arcane Bolt에는 대응 ASE가 없다. 페이지의 Magic shield/Shield 이름과 달리 ZIP의 해당 실제 파일은 `Pixelart Shield.png/.ase` 한 쌍이므로 가상의 별도 파일을 만들지 않는다.

PNG는 한 행의 가로 Sprite Sheet다. Rock Sling만 단일 프레임 PNG다. 8종 모두 프레임 16×16, alpha=0/255의 투명 배경이며 중간 alpha는 없다. ASE의 header/frame chunk를 [Aseprite 공식 형식 명세](https://github.com/aseprite/aseprite/blob/main/docs/ase-file-specs.md)에 맞춰 검사했다. 동봉 7개 ASE의 프레임 시간은 각각 100ms(10fps)다. Arcane Bolt의 6프레임은 96×16 시트와 실제 여섯 칸을 대조한 값이며 원본 시간은 **미확인**이다. 재생 카탈로그의 100ms는 이 기술에 대한 프로젝트 권장 기본값이다.

어느 ASE에도 animation tag chunk가 없어 원본 Loop 여부·반복 횟수·명시적 방향 설정은 **미지정**이다. PNG도 시간·반복 정보를 담지 않는다. 아래 방향은 화살촉·꼬리의 시각적 검토 결과다. 반복 가능해 보이는 모양과 작성자가 설정한 Loop를 혼동하지 않는다. 비행 중 반복/정지 유지는 프로젝트 권장값이고 도착 시 반복을 끝내야 한다. 선정 8종 자체에는 별도 종료/Impact 시퀀스가 없으며 팩의 `Splash.png`는 분리된 물 착탄 후보다.

### 저장 경계와 이름

- Git 추적 원본: `external/third-party/devwizard-pixel-art-spells/pack/PNG Files/{원본 이름}.png` 8개, `pack/Asprite Files/{원본 이름}.ase` 7개.
- 단일 원본 기록: [sources.json](../../external/third-party/devwizard-pixel-art-spells/sources.json). ZIP 식별 해시, 전체 22종 인벤토리, 미선정 여부, 선정 파일 해시·프레임·판단 근거를 함께 보존한다. 기존 historical manifests를 덮어쓰거나 비슷한 source record를 docs에 복제하지 않는다.
- 웹 제공 사본: `public/assets/external-generated/devwizard-pixel-art-spells/{원본 이름}.png` 8개. 기존 `.gitignore`의 generated 규칙을 사용하고 원본 bytes를 그대로 복사한다.
- 역할 카탈로그: [projectile-vfx.ts](../../src/assets/projectile-vfx.ts), `assetRegistry.projectileVfx(role)`. URL은 공백을 인코딩하며, 알 수 없는 역할은 null이다. 폴더를 Energy/Solid/Liquid/Small별로 중복 생성하지 않는다. Small은 Energy/Liquid 등과 겹치는 크기/형태 태그다. Fire/Wind는 Energy 아래 Elemental 변형으로 기록한다.

파일명은 변경하지 않고 공용 역할 ID를 별도 매핑했다. 원본 파일과 SHA-256을 바로 대조할 수 있고, 다른 팩으로 교체할 때도 기술명·파일명에 종속되지 않는다. 기존 `/vendor/showdown/fx`나 자체 제작 `/sprites/effects`에는 외부 팩을 섞지 않았다.

### 선정 8종의 실측 정보

원본 파일 열의 PNG는 위 `pack/PNG Files/` 아래, ASE는 `pack/Asprite Files/` 아래다. Loop는 전부 원본 미지정이며 권장 재생만 별도로 적었다.

| 원본 이름 / 원본 파일 | 공용 VFX 역할 | 분류 / Small 태그 | 프레임 수 | 프레임 / PNG 전체 크기 | 권장 재생 / 방향 |
|---|---|---|---:|---|---|
| Arcane bolt · `Arcane Bolt.png` · ASE 없음 | `Projectile_Energy_Small` | Energy / Small | 6 | 16×16 / 96×16 | 비행 중 반복 / 오른쪽 |
| Magic orb · `Magic Orb.png`, `Magic Orb.ase` | `Projectile_Energy_Orb` | Energy / Orb | 6 | 16×16 / 96×16 | 비행 중 반복 / 방향 중립 |
| Fireball · `Fireball.png`, `Fireball.ase` | `Projectile_Elemental_Fire` | Energy / Elemental Fire | 6 | 16×16 / 96×16 | 비행 중 반복 / 오른쪽 |
| Rock sling · `Rock Sling.png`, `Rock Sling.ase` | `Projectile_Solid_Rock` | Solid / Rock | 1 | 16×16 / 16×16 | 정지 이미지를 이동 / 방향 중립 |
| Ice lance · `Ice Lance.png`, `Ice Lance.ase` | `Projectile_Solid_Ice` | Solid / Ice / Small | 4 | 16×16 / 64×16 | 비행 중 반복 / 오른쪽 |
| Water bolt · `Water Bolt.png`, `Water Bolt.ase` | `Projectile_Liquid_Small` | Liquid / Small | 6 | 16×16 / 96×16 | 비행 중 반복 / 오른쪽 |
| Water blast · `Water Blast.png`, `Water Blast.ase` | `Projectile_Liquid_Blast` | Liquid / Blast | 6 | 16×16 / 96×16 | 비행 중 반복 / 오른쪽 |
| Wind bolt · `Wind Bolt.png`, `Wind Bolt.ase` | `Projectile_Elemental_Wind` | Energy / Elemental Wind / Small | 6 | 16×16 / 96×16 | 비행 중 반복 / 오른쪽 |

| 원본 | 색상 변경 적합성 | 추천 활용 기술군 | 비고 |
|---|---|---|---|
| Arcane Bolt | 높음: 보라 본체·분홍 하이라이트·파랑 잔상의 3색 팔레트 치환 | 작은 특수 에너지탄·전기쇼크 같은 짧은 전달체 | 흑백 아님. 원본 FPS 미확인. 에너지의 의미를 기술별로 구분할 사운드·착탄은 후속 작업 |
| Magic Orb | 높음: 본체·하이라이트의 2색 팔레트 치환 | 에너지볼·섀도볼·문포스 등 구체 | 회전/좌우 반전이 필수는 아님. 색상만으로 전용기 전체를 표현하는 용도로 확대하지 않음 |
| Fireball | 제한적: 불꽃 재질 유지 우선; 필요 시 제한 팔레트 치환 | 불꽃세례·불꽃 구체 | 화염방사 Stream 대체가 아님 |
| Rock Sling | 낮음: 흙·암석 명암 유지 | 돌떨구기·락블레스트 | 단일 프레임. 포물선·회전은 코드로 처리할 후보 |
| Ice Lance | 중간: 냉기 명암 유지 권장 | 얼음뭉치·고드름침·빙결 창 | 가는 1px 줄기의 4배속·모바일 가독성 확인 필요 |
| Water Bolt | 중간~높음: 액체 3색 치환 | 작은 물탄·거품, 독액 변형 후보 | 단순 multiply로 파랑을 보라로 바꾸기보다 팔레트 치환 권장 |
| Water Blast | 중간~높음: 물결 하이라이트 유지 | 큰 물탄·물의파동 | 상대적으로 부피가 클 뿐 원본 해상도는 16×16. 고해상도 대형 물줄기는 아님 |
| Wind Bolt | 높음: 민트 3색의 밝기 보존 Tint/팔레트 치환 | 바람탄·짧은 공기파 | Electric/Psychic/Fairy/Dragon 변형 후보. 색상이 달라도 바람 형태의 인상이 유지됨 |

### 미선정 14종과 추가 확보 후보

아래는 ZIP에서 확인만 했으며 추적 원본과 generated 사본에 포함하지 않았다. 추가 확보 시 위 공식 ZIP 안의 `Pixelart Spells/PNG Files/{파일명}`, 대응 원본은 `Pixelart Spells/Asprite Files/{동일 이름}.ase`에서 선택하면 된다.

| 실제 PNG 이름 | 프레임 / 프레임 크기 | 후보 용도 / 이번 미선정 사유 |
|---|---|---|
| `Black And White Ray.png` | 8 / 16×16 | 리컬러용 Beam 타일. Projectile 8역할 밖이므로 보류 |
| `Black And White Sparks.png` | 6 / 16×16 | 중립 Spark/Burst. 투사체 본체가 아니므로 보류 |
| `Bolt Of Purity.png` | 6 / 16×16 | 밝은 Energy Orb/Small Bolt. Arcane/Magic Orb와 역할 중복 |
| `Darkness Bolt.png` | 6 / 16×16 | Dark 에너지탄. 우선 공용 팔레트로 실험 |
| `Darkness Orb.png` | 6 / 16×16 | Dark 구체. Magic Orb와 중복 |
| `Firebomb.png` | 6 / 16×16 | 상대적으로 굵은 Fire Projectile. 별도 폭발 애니메이션은 아님 |
| `Light Bolt.png` | 6 / 16×16 | Small Bolt·리컬러. 초기 8종과 중복 |
| `Magic Ray.png` | 8 / 16×16 | 유색 Beam 타일. Beam 연결은 범위 밖 |
| `Magic Sparks.png` | 6 / 16×16 | 유색 Spark/Burst. 착탄 단계 조사 후보 |
| `Pixelart Shield.png` | 6 / 48×48 | Shield. Projectile 범위 밖 |
| `Plant Missle.png` | 6 / 16×16 | 식물/잎 투사체. 우선 8역할 밖이며 원본 오타 Missle 유지 |
| `Pure Bolt 2.png` | 6 / 16×16 | 밝은 작은 별탄. 초기 Energy Small과 중복 |
| `Splash.png` | 6 / 32×32 | 분리된 Liquid Impact. 다음 착탄 단계 우선 후보 |
| `Water Orb.png` | 6 / 16×16 | Liquid Orb. 초기 Small/Blast로 시작 |

### Recolor 판단과 웹 렌더링 제안

제작자는 흑백 자산을 엔진에서 착색하도록 안내한다. 실제 `Black And White Ray.png`의 불투명 픽셀 중 약 76.9%, `Black And White Sparks.png`는 약 82.8%가 무채색이다. 나머지는 베이지 `(231,214,195)` 또는 `(183,165,145)`다. 따라서 두 파일을 완전한 grayscale mask라고 가정하면 안 된다. `Bolt Of Purity.png`, `Light Bolt.png`, `Pure Bolt 2.png`도 흰색·밝은 시안 중심의 후속 후보다. 이 다섯 파일은 **이번 8종에 포함되지 않았다**.

이번 반입 파일 중 우선 리컬러 후보는 Arcane Bolt와 Magic Orb다. Electric/Psychic/Fairy/Poison/Dark/Dragon은 base/highlight/accent 2~3색 팔레트를 런타임으로 지정할 수 있다. 같은 원본 PNG를 타입별로 복제하지 않는다. Water Bolt/Blast의 독액 변형, Wind Bolt의 밝은 에너지 변형도 비교 후보다. 이는 픽셀 팔레트와 형태를 확인한 적합성 판단이며 실제 타입별 전투 품질 검증 완료를 의미하지 않는다.

현재 Canvas 2D 방식에서는 이미지를 한 번 읽어 원본 RGB→목표 팔레트를 치환한 offscreen canvas를 만들고 `asset ID + palette ID`별로 캐시하는 방식을 권장한다. 중립 Ray/Sparks를 채택하면 luminance 기반 shadow/base/highlight 매핑에 베이지 예외를 포함하고 alpha를 그대로 보존한다. `source-in` 단색 채우기는 명암을 없애고 단순 multiply는 기존 보라/파랑을 남길 수 있으므로 기본값으로 삼지 않는다. `imageSmoothingEnabled=false`와 정수 배율을 유지하고 이동 중 매 프레임 `getImageData`를 호출하지 않는다. Unity에서도 같은 팔레트/밝기 기반 shader 접근이 가능하나 이번에는 Unity 파일이나 shader를 만들지 않는다.

### 향후 Projectile 시스템 연결

1. 저장소 루트에서 `node scripts/assets/pixel-art-spells/runtime.mjs prepare`, `verify`를 실행한다. 인터넷·Aseprite 설치 없이 추적 원본에서 8개 PNG를 복사한다. 해시·PNG 크기·ASE 프레임 시간을 검사하고 기존 파일이 다르면 덮어쓰지 않는다. 현재 선택 팩이므로 필수 전체 assets 명령에 넣지 않는다.
2. `assetRegistry.projectileVfx('Projectile_Energy_Small')`에서 URL·프레임 크기·columns·프레임 수·원본 시간·권장 시간을 얻는다. 원본 파일명이 아닌 역할 ID로 요청한다. 존재하지 않는 역할은 null이며 이미지 로딩은 기존 `loadAssetImage`의 실패/시간초과 처리를 사용한다.
3. 기존 `move-animation-plan`의 궤적 좌표에 sprite-sheet descriptor를 선택적으로 붙이고 Canvas `drawImage(image,sx,sy,sw,sh,dx,dy,dw,dh)`로 한 프레임만 자른다. **시트 전체를 구체 이미지처럼 그리면 안 된다.** 이 renderer adapter는 후속 작업이며 이번에는 구현하지 않았다.
4. `flightElapsed = elapsed × BattleSpeed` 타임라인을 기존 재생기와 공유한다. ASE 100ms 기준이면 현재 프레임은 비행 시간에서 산출하고, 도착 시 반복을 종료한다. Rock Sling은 이미지 1장을 이동/회전시킨다. 오른쪽 기준 자산은 source→target 각도로 회전하고 방향 중립 구체는 회전을 선택적으로 적용한다.
5. 대형 934기술 매핑을 한 번에 바꾸지 않고 8역할 미리보기로 크기·중심·양방향·1/2/4배속·착탄 시점·스킵·동작 감소를 먼저 비교한다. 그 후 필요한 기술군만 연결한다. `.ase` 원본·원본 ZIP·출처 JSON을 브라우저가 요청하도록 하지 않는다.

### Coverage와 판단

Energy Small/Orb, Solid Rock/Ice, Liquid Small/Blast와 Fire/Wind의 기본 비행 본체는 확보했다. Small Projectile은 Arcane Bolt·Ice Lance·Water Bolt·Wind Bolt가 겹쳐 담당한다. 기본 팩으로 계속 쓰기 적합하지만 16×16의 단순한 소형 표현이라는 한계가 있다.

부족한 것은 금속·바늘·씨앗·파편 등 Solid 변형, 더 큰 해상도의 대형 Projectile, 점성/독 액체의 고유 형태, 공용 에너지/암석/얼음 착탄이다. Splash·중립 Sparks·Ray는 같은 팩에서 다음으로 검토할 수 있으므로 먼저 다른 팩 전체를 들일 필요는 없다. 큰 효과와 재질별 착탄이 필요해지면 그 범위만 다른 팩으로 보완하는 것이 적절하다. Firebomb의 이름이나 Water Blast의 상대적 크기만으로 대형 연출 요구를 충족했다고 판단하지 않는다.

### 이번 에셋 조사 검증

선정 PNG 총 3,122 bytes, ASE 원본 총 7,412 bytes다. 생성 PNG 8개는 원본과 bytes/SHA-256이 일치하며 미선정 파일·ASE를 public에 복사하지 않았다. 원본 8종 외에 기존 ownership·registry·기술 재생·피해/메시지 회귀를 포함한 관련 테스트 **35개 통과**, 프로덕션 빌드와 내장 TypeScript, CSS·문서/작업공간 구조 검사도 통과했다. 오프라인 새 출력 생성·재실행, 수정된 출력 덮어쓰기 거부, 미선정 Splash 혼입 검출을 확인했다. 기존 기술에 연결하지 않았으므로 새 팩의 전투상 크기·리컬러·착탄·배속 품질은 후속 연결 단계의 검증 대상이다.

## 과거 검증 (2026-10-12)

- 기술 전체의 파티클 시간·개수·자산 범위, 22개 파일 존재, 방향·자신 대상·실패·흡수 및 배틀 재생/특성 회귀: 13개 통과.
- Chrome 1280px·390px에서 대표 기술 10종, 양쪽 공격 방향, 키보드/더블 터치 즉시 스킵과 Canvas 정리, 동작 감소: 브라우저 검사 3개.
- Windows 프로덕션 빌드 통과. 실제 휴대폰의 성능과 사용자가 느끼는 연출 품질은 추가 플레이로 확인한다.

연출 비교 화면 (로컬 전용: `artifacts/qa/screenshots/move-effects`), [검증 테스트](../../e2e/move-visuals.spec.ts), [로컬 효과 자산](../../public/vendor/showdown/fx). 과거 원재료 contact-sheet는 현재 보관돼 있지 않아 실제 사용하는 자산 경로로 연결한다.
