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

## 과거 검증 (2026-10-12)

- 기술 전체의 파티클 시간·개수·자산 범위, 22개 파일 존재, 방향·자신 대상·실패·흡수 및 배틀 재생/특성 회귀: 13개 통과.
- Chrome 1280px·390px에서 대표 기술 10종, 양쪽 공격 방향, 키보드/더블 터치 즉시 스킵과 Canvas 정리, 동작 감소: 브라우저 검사 3개.
- Windows 프로덕션 빌드 통과. 실제 휴대폰의 성능과 사용자가 느끼는 연출 품질은 추가 플레이로 확인한다.

연출 비교 화면 (로컬 전용: `artifacts/qa/screenshots/move-effects`), [검증 테스트](../../e2e/move-visuals.spec.ts), [로컬 효과 자산](../../public/vendor/showdown/fx). 과거 원재료 contact-sheet는 현재 보관돼 있지 않아 실제 사용하는 자산 경로로 연결한다.
