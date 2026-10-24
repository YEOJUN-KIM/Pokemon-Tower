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

**최종 상태: Reviewed / Rejected for primary battle VFX (2026-10-24).** 라이선스 적합, 원본/카탈로그 관리 구조 적합, 실제 Pokémon 배틀 스타일 적합성 낮음. 소유자가 실제 데스크톱 화면에서 확인한 디테일 밀도·확대 픽셀·명암·아이콘 같은 인상을 근거로 주력 배틀 VFX로 채택하지 않는다. 라이선스 문제나 구현 오류가 아닌 유효한 시각 검증 결과다. 대표 8기술의 시험 연결과 이 팩용 렌더러/스케일/방향 처리·프로토타입 테스트를 제거하고 기존 VFX로 복원했다. 원본·ASE·역할 카탈로그·라이선스는 외부 후보/참고 자료로 보존한다. 이하 수급 단계 기록은 채택 상태를 뜻하지 않으며, 현재 후속 방향은 아래 Existing VFX Inventory를 따른다. 모바일 보정과 검증은 이번 작업 범위에서 제외했다.

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

### 수급 당시 연결 검토안 (실전 적용 중단)

아래는 재현 가능한 후보 관리 구조를 설명하는 수급 당시 검토안이다. Pixel Art Spells를 실전 기술에 다시 연결하라는 현재 계획이 아니다.

1. 저장소 루트에서 `node scripts/assets/pixel-art-spells/runtime.mjs prepare`, `verify`를 실행한다. 인터넷·Aseprite 설치 없이 추적 원본에서 8개 PNG를 복사한다. 해시·PNG 크기·ASE 프레임 시간을 검사하고 기존 파일이 다르면 덮어쓰지 않는다. 현재 선택 팩이므로 필수 전체 assets 명령에 넣지 않는다.
2. `assetRegistry.projectileVfx('Projectile_Energy_Small')`에서 URL·프레임 크기·columns·프레임 수·원본 시간·권장 시간을 얻는다. 원본 파일명이 아닌 역할 ID로 요청한다. 존재하지 않는 역할은 null이며 이미지 로딩은 기존 `loadAssetImage`의 실패/시간초과 처리를 사용한다.
3. 기존 `move-animation-plan`의 궤적 좌표에 sprite-sheet descriptor를 선택적으로 붙이고 Canvas `drawImage(image,sx,sy,sw,sh,dx,dy,dw,dh)`로 한 프레임만 자른다. **시트 전체를 구체 이미지처럼 그리면 안 된다.** 이 renderer adapter는 후속 작업이며 이번에는 구현하지 않았다.
4. `flightElapsed = elapsed × BattleSpeed` 타임라인을 기존 재생기와 공유한다. ASE 100ms 기준이면 현재 프레임은 비행 시간에서 산출하고, 도착 시 반복을 종료한다. Rock Sling은 이미지 1장을 이동/회전시킨다. 오른쪽 기준 자산은 source→target 각도로 회전하고 방향 중립 구체는 회전을 선택적으로 적용한다.
5. 대형 934기술 매핑을 한 번에 바꾸지 않고 8역할 미리보기로 크기·중심·양방향·1/2/4배속·착탄 시점·스킵·동작 감소를 먼저 비교한다. 그 후 필요한 기술군만 연결한다. `.ase` 원본·원본 ZIP·출처 JSON을 브라우저가 요청하도록 하지 않는다.

### Coverage와 판단

수급 당시 Energy Small/Orb, Solid Rock/Ice, Liquid Small/Blast와 Fire/Wind의 후보 본체를 확보했다. Small Projectile은 Arcane Bolt·Ice Lance·Water Bolt·Wind Bolt가 겹쳐 담당한다. 그러나 실제 화면 검토에서 현재 Pokémon 배틀과 스타일이 맞지 않는 것으로 확인했으므로 기본 팩으로 사용하지 않는다. 단순 scale 증가나 라이선스 적합성을 채택 근거로 삼지 않는다.

부족한 것은 금속·바늘·씨앗·파편 등 Solid 변형, 더 큰 해상도의 대형 Projectile, 점성/독 액체의 고유 형태, 공용 에너지/암석/얼음 착탄이다. Splash·중립 Sparks·Ray는 같은 팩에서 다음으로 검토할 수 있으므로 먼저 다른 팩 전체를 들일 필요는 없다. 큰 효과와 재질별 착탄이 필요해지면 그 범위만 다른 팩으로 보완하는 것이 적절하다. Firebomb의 이름이나 Water Blast의 상대적 크기만으로 대형 연출 요구를 충족했다고 판단하지 않는다.

### 이번 에셋 조사 검증

선정 PNG 총 3,122 bytes, ASE 원본 총 7,412 bytes다. 생성 PNG 8개는 원본과 bytes/SHA-256이 일치하며 미선정 파일·ASE를 public에 복사하지 않았다. 원본 8종 외에 기존 ownership·registry·기술 재생·피해/메시지 회귀를 포함한 관련 테스트 **35개 통과**, 프로덕션 빌드와 내장 TypeScript, CSS·문서/작업공간 구조 검사도 통과했다. 오프라인 새 출력 생성·재실행, 수정된 출력 덮어쓰기 거부, 미선정 Splash 혼입 검출을 확인했다. 기존 기술에 연결하지 않았으므로 새 팩의 전투상 크기·리컬러·착탄·배속 품질은 후속 연결 단계의 검증 대상이다.

## Existing VFX Inventory · Projectile 재검토

확인일 2026-10-24. 기준 커밋 `de7877bef00400c75e6ffb3b830aa6a2cdc3ba3f`. **이 단계는 기존 자산 조사·설계와 미채택 팩 연결 제거만 수행한다.** 새 외부 파일 다운로드, 전체 기술 매핑 변경, Impact/Beam/Stream 신규 구현, 데미지·AI·밸런스 변경을 하지 않는다. 모바일은 제외한다.

### 복원과 정리

어시스트파워·섀도볼·불꽃세례·돌떨구기·얼음뭉치·물대포·물의파동·바람일으키기의 Pixel Art Spells opt-in을 모두 제거했다. `move-animation-plan.ts`와 `move-visuals.tsx`는 기준 커밋의 내용으로 복원했다. 임시 `projectile-renderer.ts`, 해당 팩의 프로토타입 E2E·단위 테스트도 제거했다. 이 모듈은 팩 전용 Role/파일·대표 기술 매핑에 결합돼 있었으며 기존의 공용 MoveParticle 궤적 엔진과 기능이 중복되므로 별도 보존하지 않았다. 기존 범용 입자 엔진·Sprite clone·화면 효과는 유지한다.

원본 `external/third-party/devwizard-pixel-art-spells/`, `src/assets/projectile-vfx.ts`, 조회용 registry·paths, 오프라인 참고 사본 도구·해시 검사는 보존한다. 어느 기술도 이 카탈로그를 선택하거나 배틀 preload에서 불러오지 않는다. `sources.json.review`에 미채택 판단·이유·날짜를 기록하며 이전 원본 URL·해시·라이선스 근거는 그대로 유지한다. generated 사본이 로컬에 남아 있어도 채택된 실전 자산이 아니다.

### 조사 범위와 판별

ignore된 generated/runtime 경로까지 포함해 `public/`, `public/assets/`, `public/sprites/effects/`, `public/vendor/showdown/fx/`, external 원본과 현재 registry/Canvas/CSS 사용처를 대조했다. 저장소 루트의 독립 `assets/`나 `fx/` 폴더는 없으며 `src/assets/`는 resolver 코드다.

- **현재 기술 효과:** `public/vendor/showdown/fx/` PNG 22개. 모두 실제 PNG를 열어 크기·투명도·명암 정보를 확인했다. 모두 **단일 프레임**이며 sprite sheet가 아니다. 프레임 열을 잘라 쓰지 않고 `MoveParticle`의 위치/크기/회전/alpha와 반복 배치로 움직임을 만든다.
- **자체 제작:** `public/sprites/effects/flamethrower-beam.png` 1개, 1448×1086, 단일 프레임. 현재 화염방사에서만 사용하며 Projectile 후보가 아닌 기존 Stream/Hybrid로 유지한다.
- **기믹 전용:** 같은 폴더의 `mega-orb.svg`, `mega-shards.svg`는 240×240 viewBox, `dynamax-ball.svg`는 160×160 viewBox다. CSS 메가/다이맥스 연출용이며 구체라는 이유로 기술 Projectile에 전용하지 않는다.
- **기타:** `public/images/events/teleport-portal.png`는 512×512·1프레임, `.gif`는 512×512·6프레임이며 비전투 포털/이벤트 자료다. TM·도구·상점 아이콘(예: spell-tag, effect-guard), Pokémon 스프라이트·fallback 아이콘과 `public/audio/sfx/`의 음량 설정은 기술 비행 VFX에서 제외했다.
- **미채택 참고:** Pixel Art Spells의 원본 8 PNG/7 ASE와 선택 generated 8 PNG는 후보 보존 상태이며 아래 기존 실전 자산 수에 합치지 않는다.

### 현재 이미지 전수 목록

아래 PNG는 `flamethrower-beam.png`만 `public/sprites/effects/`, 나머지는 모두 `public/vendor/showdown/fx/`에 있다. RGB는 불투명/반투명 픽셀의 고유 RGB 수, alpha는 투명 0을 포함한 alpha 단계 수다. **alpha 단계가 많은 단색 glow를 수백 RGB 색이라고 세지 않는다.** 참조 수는 등록 934개 기술의 현재 `moveAnimationPlan`에서 해당 PNG를 한 번 이상 참조하는 구성 수이며, 그 수만큼 모두 Projectile이라는 뜻은 아니다. 예시는 현재 코드에서 역산한 실제 사용처다.

| 파일 | 원본 크기 | 프레임 | RGB / alpha 단계 | 구성 참조 수 | 현재 사용 예 |
|---|---|---:|---|---:|---|
| `blackwisp.png` | 100×100 | 1 | 1 / 256 | 22 | Twister · Sand Tomb · Whirlpool |
| `bluefireball.png` | 32×32 | 1 | 316 / 102 | 22 | Rock Slide · Dragon Breath · Rock Tomb |
| `bottombite.png` | 108×64 | 1 | 18 / 2 | 13 | Bite · Crunch · Thunder Fang |
| `electroball.png` | 100×100 | 1 | 207 / 243 | 24 | Thunder Fang · Thunder Punch · Thunder Shock |
| `energyball.png` | 100×100 | 1 | 125 / 188 | 20 | Solar Beam · Draining Kiss · Leech Seed |
| `fireball.png` | 32×32 | 1 | 317 / 100 | 34 | Flamethrower · Fire Blast · Fire Fang |
| `fist.png` | 55×49 | 1 | 61 / 7 | 41 | Ice Punch · Thunder Punch · Focus Punch |
| `hitmarker.png` | 100×100 | 1 | 8 / 11 | 253 | Tackle · Body Slam · Take Down |
| `iceball.png` | 100×100 | 1 | 87 / 243 | 31 | Ice Beam · Blizzard · Aurora Beam |
| `impact.png` | 127×119 | 1 | 1 / 189 | 296 | Tackle · Body Slam · Take Down |
| `leaf1.png` | 32×26 | 1 | 408 / 99 | 8 | Magical Leaf · Razor Leaf · Petal Dance |
| `leaf2.png` | 40×26 | 1 | 485 / 102 | 7 | Magical Leaf · Razor Leaf · Petal Dance |
| `leftclaw.png` | 44×60 | 1 | 5 / 2 | 4 | Metal Claw · Dragon Claw · Shadow Claw |
| `leftslash.png` | 57×56 | 1 | 33 / 115 | 43 | Slash · False Swipe · Aerial Ace |
| `mudwisp.png` | 100×100 | 1 | 1391 / 240 | 56 | Sand Attack · Earthquake · Mud Shot |
| `purplewisp.png` | 100×100 | 1 | 1 / 252 | 75 | Confusion · Psychic · Sludge Bomb |
| `rightclaw.png` | 44×60 | 1 | 5 / 2 | 4 | Metal Claw · Dragon Claw · Shadow Claw |
| `rightslash.png` | 57×56 | 1 | 33 / 115 | 43 | Slash · False Swipe · Aerial Ace |
| `shadowball.png` | 100×100 | 1 | 181 / 248 | 4 | Shadow Ball · Max Phantasm · Astral Barrage |
| `topbite.png` | 108×64 | 1 | 18 / 2 | 13 | Bite · Crunch · Thunder Fang |
| `waterwisp.png` | 100×100 | 1 | 1 / 256 | 25 | Surf · Water Gun · Hydro Pump |
| `wisp.png` | 100×100 | 1 | 1 / 251 | 287 | Swords Dance · Hyper Beam · Swift |
| `flamethrower-beam.png` | 1448×1086 | 1 | 28657 / 256 | 1 | Flamethrower |

파일별 기존 권리/해시는 [move-effects-integration](../assets/manifests/move-effects-integration.json)과 [runtime ownership](../assets/manifests/runtime-ownership.json)이 기준이다. 이번에 같은 해시 manifest를 중복 만들지 않았다. 원시 이미지 실측·934개 구성의 전체 역산 사용처·contact sheet는 로컬 QA `artifacts/qa/assets/existing-vfx/`에 보관한다. Showdown 참고 코드에 등장하는 `rocks/rock1/rock2`, `icicle`, `lightning`, `bone` 등은 현재 디스크에 없으며 파일별 별도 라이선스 예외가 있으므로 확보한 후보처럼 표기하지 않는다.

### 역할별 후보 비교와 추천

경로는 위 전수 목록을 따른다. 후보는 역할마다 최대 3개다. 적합성은 실제 이미지의 형태·기존 배틀 재생과 소유자의 화면 검토를 함께 반영한 상대 평가다. 같은 물리/특수/타입이라고 자동 배정하지 않는다.

| 역할 | 후보 파일 / 크기·프레임 | 현재 사용 기술 | 스타일 적합성 / 재사용 | 필요 변형 | 추천 |
|---|---|---|---|---|---|
| Energy Small | `wisp.png` 100×100·1f; `purplewisp.png` 100×100·1f; `bluefireball.png` 32×32·1f | Swift/Hyper Beam; Stored Power/Psychic; Dragon Pulse/Dragon Breath | 높음. 부드러운 alpha를 유지한 작은 빛·에너지 전달에 재사용 가능 | 크기·색·비행 시간; bluefireball은 불꽃 형태임을 고려 | Keep: wisp/purplewisp 우선 |
| Energy Orb | `energyball.png`, `shadowball.png`, `electroball.png` 각 100×100·1f | Energy Ball; Shadow Ball; Electro Ball/Volt Switch | 높음. 기존 구체의 명암·외곽 glow를 그대로 활용 가능 | 크기·충전 시간·material/palette 선택 | Keep |
| Fire Projectile | `fireball.png`, `bluefireball.png` 각 32×32·1f | Ember/Fire Blast; Will-O-Wisp | 높음. 실제 불씨 모양과 명암이 기존 화면과 일관됨 | 회전·이동·짧은 반복 trail·필요 시 청염 | Keep |
| Water Projectile | `waterwisp.png` 100×100·1f; `wisp.png` 100×100·1f | Water Gun/Water Pulse/Surf; 공용 빛/지원 효과 | waterwisp 높음, wisp는 중립 대체. 물 덩어리/분사 조합에 재사용 가능 | 폭·alpha·발사 간격; wisp 사용 시 물 재질 변형 필요 | Keep waterwisp / Adjust neutral |
| Ice Projectile | `iceball.png` 100×100·1f; `wisp.png` 100×100·1f | Ice Beam/Blizzard/Freeze-Dry; 공용 빛 | 냉기 glow는 높음. 고체 얼음침 형태는 현재 없음 | 축소·늘이기·차가운 색/짧은 코드 궤적 | Keep 냉기 / 고드름 형태는 gap |
| Rock / Solid Projectile | `mudwisp.png` 100×100·1f; `impact.png` 127×119·1f | Rock Throw/Rock Blast/Mud Shot; 공용 타격/Earthquake | 먼지·진흙은 어울리지만 **실제 바위/고체 본체가 아니다**. impact는 착탄용 | 먼지 scale/arc, 필요 시 단순 코드 고체와 조합 | Adjust, 진짜 바위 형태는 부족 |
| Wind / Air Projectile | `wisp.png` 100×100·1f; `leftslash.png`, `rightslash.png` 각 57×56·1f | 공용 빛; Air Slash/Air Cutter | 중간~높음. 중립 빛·얇은 공기 베기 후보이며 전용 Wind 이미지라고 단정하지 않음 | 낮은 alpha·길쭉한 scale·회전·코드 trail | Hybrid 우선 |
| Dark / Ghost Projectile | `shadowball.png`, `blackwisp.png`, `purplewisp.png` 각 100×100·1f | Shadow Ball; Dark Pulse/Whirlpool/Shadow Ball; Psychic/Shadow Ball 준비 | 높음. 그림자 구체·어두운 연기·오라를 역할별로 재사용 | 크기·어둡기·확산·pulse 빈도 | Keep |
| Electric Projectile | `electroball.png`, `wisp.png` 각 100×100·1f | Thunder Shock/Electro Ball/Thunderbolt; 공용 빛 | 높음. 전기 구체와 코드 bolt 조합에 적합 | 노란/청색 팔레트·짧은 flash·코드 지그재그 | Keep / Hybrid |
| Psychic Projectile | `purplewisp.png`, `wisp.png` 각 100×100·1f | Stored Power/Psychic/Psyshock; 공용 빛 | 높음. 압박/pulse와 작은 에너지탄에 적합 | alpha·보라/분홍 색·pulse/선형 이동 구분 | Keep |
| Poison Projectile | `purplewisp.png`, `blackwisp.png` 각 100×100·1f | Sludge Bomb/Acid Spray/Sludge Wave; 어둠·연기 효과 | 자주색 안개/탄은 높음. 점성 덩어리·독방울 전용 형태는 부족 | 보라/녹색 색, 구체 비율·낮은 arc·가스 alpha | Keep 안개 / Adjust 점성 |
| Grass / Seed / Leaf Projectile | `leaf1.png` 32×26·1f; `leaf2.png` 40×26·1f; `energyball.png` 100×100·1f | Razor Leaf/Magical Leaf/Leaf Storm; Energy Ball/Seed Bomb/Bullet Seed | 잎·생명력 구체는 높음. 실제 씨앗 알갱이 형태는 없음 | 두 잎의 회전/교차 arc·구체 축소·발사 개수 | Keep 잎/구체, 씨앗 형태는 gap |

현재 대체의 의미상 한계도 그대로 기록한다. **Ice Shard는 mudwisp**, **Gust는 iceball**, **Rock Slide는 bluefireball 낙하** 구성을 쓰고 있다. 파일 이름만 보고 얼음침·바람·암석 전용 텍스처를 이미 갖췄다고 판단하면 안 된다. 이 조사에서 해당 기술을 바꾸지는 않았으며, 다음 소수 대표군 구현 때 의미에 맞는 기존 재질/코드 조합을 선택한다.

### 실제 화면 스타일 비교

| 기준 | Pixel Art Spells | 기존 프로젝트 / Showdown |
|---|---|---|
| 해상도·디테일 밀도 | 반입 8종은 프레임 16×16. 대부분 2~3 RGB 색, 넓은 단색 면 | 불씨 32×32, 구체·wisp 100×100, 잎 32×26/40×26 등. 형태별 디테일·빛 표현이 현재 배틀에 이미 사용됨 |
| 명암 단계 | 단색/소수 단계와 hard alpha. 확대 시 면과 계단이 크게 보임 | wisp는 1 RGB라도 alpha 251~256단계로 배경과 섞임. shadowball 181 RGB/248 alpha, fireball 317 RGB/100 alpha 등 |
| 픽셀 크기 | 3×/4× 확대 시 한 원본 픽셀이 큰 블록이 되어 포켓몬 스프라이트와 밀도 차이가 두드러짐 | 현재 화면 크기에 맞춰 축소/스케일하는 glow·입자 조합. 기존 포켓몬의 정보 밀도를 과도하게 단순화하지 않음 |
| 윤곽·배경 조화 | 두꺼운 계단 윤곽과 평면적 중심부가 떠 있는 아이콘처럼 보임 | 반투명 외곽·빛/연기가 배경과 자연스럽게 섞임. 잎·발톱·물기 등 명시적 윤곽은 해당 동작에만 사용 |
| 색상 채도 | 소수 고채도 색이 넓은 면적을 차지 | 기존 재질의 하이라이트/alpha/확산과 조합. 기존 자산도 채도가 높을 수 있으므로 채도 수치만으로 적합성을 판정하지 않음 |
| 애니메이션 | 6프레임/100ms(Arcane 시간 미확인), Ice 4f, Rock 1f | 22개 모두 1f. 화면의 연속 이동·크기·회전·alpha·여러 입자 배치가 실제 애니메이션이며, 프레임 수가 적다는 이유로 열등하지 않음 |
| 화면 크기 | 단순 확대는 디테일을 늘리지 않아 작은 아이콘을 띄운 인상이 남음 | 기존 unit 기반 크기와 충전·비행·확산 구성이 현재 씬에 맞음. 역할별 개별 조정은 여전히 필요 |
| 최종 판단 | 라이선스/구조 적합, **primary battle VFX 미채택** | 우선 재사용. 모든 기존 fallback이 기술 의미까지 완벽하다는 뜻은 아님 |

이는 실제 화면 검토로 사용 가능 범위를 좁힌 유효한 프로토타입 결과다. 라이선스 적합성은 반입 조건이며, 최종 채택은 게임 화면의 통일감으로 결정한다. 고해상도 파일이라는 이유만으로 항상 더 좋다고 일반화하지 않는다.

### 자산과 연출의 분리·재사용 우선순위

1. 기존 프로젝트/Showdown 효과를 그대로 재사용한다.
2. 기존 자산의 색·크기·회전·속도·alpha를 간단히 변형한다. 중립 wisp·purplewisp는 원본 alpha 보존 tint 캐시, fireball/leaf는 원재질 유지와 scale/rotation부터 검토한다. 새로운 타입별 PNG 복제는 우선하지 않는다.
3. 별도 파일 없이 Sprite 복제·잔상·opacity·scale·rotation·flash·Canvas 선/링·trail·화면 흔들림을 사용한다.
4. 그래도 표현할 수 없는 구체적 역할이 남을 때만 그 역할의 외부 VFX를 검토한다. 이번 조사에서 다운로드는 0건이다.

구조는 계속 **기술 → 연출 방식 → 공용 VFX 역할 → 실제 자산**이다. 예를 들어 `Shadow Ball → shadoworb 구성 → ShadowOrb(Energy Orb/Dark 재질) → adapter의 shadowball + blackwisp`, `Rock Throw → mudorb 구성 → Projectile(Solid 의도) → 현재 mudwisp 대체`로 읽는다. `src/data/move-presentations.json`은 프리셋만 지정하고 실제 파일 선택은 `move-animation-plan`/`assetRegistry` 경계에 남긴다. 이번에 기술 데이터에 파일명을 삽입하거나 새로운 외부 팩 종속 renderer를 만들지 않는다.

### 이미지가 필요한 역할과 코드 연출 분류

| 분류 | 기술/역할 예 | 현재 또는 다음 표현 | 판단 |
|---|---|---|---|
| Asset Reusable | 섀도볼·에너지볼·불꽃세례·잎 투사체 | 기존 구체·불씨·잎을 현재 입자 엔진으로 이동/확산 | 우선 재사용 |
| Code Only | 그림자분신·울음소리 | 현재 Sprite 실루엣 복제/합침, Canvas 음파와 사운드 | 외부 Projectile 파일 후보에서 제외 |
| Code Only 후보 | 순간 이동·opacity 전환 | 기존 상태/교체 메시지와 연결할 fade/순간 위치 전환 | 현재 전용 Teleport 시퀀스가 구현됐다는 뜻은 아님 |
| Hybrid | 전광석화·지진·번개·바람 베기 | 잔상+기존 Hit, 화면/참가자 흔들림+먼지, 코드 bolt+electroball, 코드 trail+slash | 기존 VFX+코드 조합부터 개선 |
| Asset Required / gap | 재질이 분명한 바위·씨앗·금속/바늘·독성 점액 | 현재 먼지/빛 대체와 구별되는 본체가 필요할 수 있음 | 코드로 충족 가능한지 먼저 판단; 외부 다운로드 확정 아님 |
| Dedicated Later | 상징적 전용기·복잡한 다단 변신/필살기 | 현재 공용 설계를 유지 | 이번 구현/반입 대상 아님 |

### 다음 단계

**2. 기존 VFX + 코드 연출 조합부터 구현**을 추천한다. 섀도볼/불꽃세례처럼 바로 재사용 가능한 대표와, 돌떨구기/얼음뭉치/바람처럼 의미상 대체를 점검할 대표를 소수 선정한다. 먼저 기존 질감·타격 시점·배속·양방향을 맞추고, 실제 고체/점액 등 구체적 gap만 남으면 해당 역할만 추가 조사한다. 전체 Projectile 교체나 새 팩 수집을 선행하지 않는다.

### 이번 복원 검증과 변경 범위

- 기존 기술 VFX·배틀 메시지·피해/상태·랭크·교체·필드·자산 lookup 관련 단위/회귀 **44개 통과**. 원본 PNG·ASE와 라이선스·역할별 프레임 메타데이터 보존 검사도 유지했다.
- 데스크톱 Chrome **8개 E2E 통과**. 복원한 8기술 × 양방향 16회에서 실제 Canvas 효과가 표시되고, Pixel Art Spells 요청이 **0건**이며 스킵 후 Canvas가 비워지는 것을 확인했다. 기존 1/2/4배속 랭크·공통 모션, 일반 기술, 화염방사, HP 반영 순서, 동작 감소 회귀도 통과했다. 모바일은 실행 대상에서 제외했다.
- 복원된 프로덕션 빌드(내장 TypeScript), 별도 타입 검사, CSS·문서 구조 검사 통과. 실제 복원 화면은 로컬 QA `artifacts/qa/screenshots/existing-vfx-restored/`, 로그·전수 실측·역산 사용처는 `artifacts/qa/assets/existing-vfx/`에 보존한다.
- 추가: `e2e/existing-vfx-restoration.spec.ts`. 수정: 이 문서와 기존 계획/자산/출처/외부 원본 안내, 후보 카탈로그 설명, `sources.json.review`, 기존 후보 보존 테스트. 제거: 이번 작업 중 만든 미커밋 `src/web/projectile-renderer.ts`, `e2e/projectile-prototype.spec.ts`, `tests/projectile-renderer.test.ts`. 두 전투 렌더링 파일은 기준 커밋으로 복원되어 최종 코드 diff가 없다. 원본 이미지·기존 자산·전체 기술 매핑 데이터는 변경하지 않았다.

## 과거 검증 (2026-10-12)

- 기술 전체의 파티클 시간·개수·자산 범위, 22개 파일 존재, 방향·자신 대상·실패·흡수 및 배틀 재생/특성 회귀: 13개 통과.
- Chrome 1280px·390px에서 대표 기술 10종, 양쪽 공격 방향, 키보드/더블 터치 즉시 스킵과 Canvas 정리, 동작 감소: 브라우저 검사 3개.
- Windows 프로덕션 빌드 통과. 실제 휴대폰의 성능과 사용자가 느끼는 연출 품질은 추가 플레이로 확인한다.

연출 비교 화면 (로컬 전용: `artifacts/qa/screenshots/move-effects`), [검증 테스트](../../e2e/move-visuals.spec.ts), [로컬 효과 자산](../../public/vendor/showdown/fx). 과거 원재료 contact-sheet는 현재 보관돼 있지 않아 실제 사용하는 자산 경로로 연결한다.
