# 기술 시각 연출

2026-10-12. 기존 배틀 로그 재생에 Showdown의 CC0 효과 PNG 22개를 연결했다. 원작 하트골드 애니메이션을 추출하거나 전체 Showdown 클라이언트를 가져온 구현은 아니다.

## 구성

- `src/web/move-animation-plan.ts`: 기술 이름별 구성, 발사·집중·타격·확산 타이밍. 이름별 구성이 없는 기술은 타입과 물리/특수/변화 분류에 따라 대체한다.
- `src/web/move-visuals.tsx`: 실제 포켓몬 이미지 좌표를 기준으로 Canvas에서 효과를 재생한다. 접근·피격은 Web Animations API를 사용한다. DPR은 2로 제한하고 동시에 표시하는 파티클을 제한한다.
- `src/web/battle-presentation.ts`: 공개 프로토콜의 사용자·상대·대상을 유지하고 연출이 끝난 뒤 HP 변경을 표시한다. 빗나감은 대상 옆으로, 무효·흡수는 피격 흔들림 없이 표현한다.
- 파일은 로컬 `/vendor/showdown/fx/`에서 한 번 불러온다. 스킵·장면 종료·페이지 이탈 시 RAF와 애니메이션을 취소한다. 동작 감소 설정에서는 이동·화면 색 변화·번개 선 대신 정적인 효과만 표시한다.

대표 구성: 화염방사(연속 불꽃), 파도타기(넓게 퍼지는 물), 10만볼트(직접 그린 번개 선+전기 구체), 냉동빔(광선+얼음 구체), 섀도볼(입자 집중·구체 발사·검은 연기), 리프스톰(잎 궤적), 드래곤클로(교차 발톱), 깨물어부수기(닫히는 위아래 이빨), 인파이트(연속 주먹), 지진(흙먼지·충격). 도깨비불·맹독·씨뿌리기 등에도 별도 구성이 있다.

## 출처

파일별 라이선스는 [보관한 원본](../../../vendor/showdown-reference/battle-animations.ts)과 [기술 코드](../../../vendor/showdown-reference/battle-animations-moves.ts)의 고지를 따른다. 참고 버전은 `c0f6bfc707a5e3bba4da3785e9cb06c8ae04f8d9`. `icicle`, `lightning`, `bone`, `rocks`, `rock1`, `rock2` 등 별도 조건의 이미지는 사용하지 않는다. 코드의 궤적·시간 구성을 참고하고 현재 화면에 맞는 렌더러를 직접 구현했다. [출처와 재사용](../../../docs/references/THIRD_PARTY.md).

기존 원자료 manifest는 당시 `integrated:false` 기록을 보존한다. 현재 연결 목록은 `artifacts/qa/assets/reports/move-effects-integration.json`에 기록한다.

## 검증

- 기술 전체의 파티클 시간·개수·자산 범위, 22개 파일 존재, 방향·자신 대상·실패·흡수 및 배틀 재생/특성 회귀: 13개 통과.
- Chrome 1280px·390px에서 대표 기술 10종, 양쪽 공격 방향, 키보드/더블 터치 즉시 스킵과 Canvas 정리, 동작 감소: 브라우저 검사 3개.
- Windows 프로덕션 빌드 통과. 실제 휴대폰의 성능과 사용자가 느끼는 연출 품질은 추가 플레이로 확인한다.

[연출 비교 화면](../../qa/screenshots/move-effects), [검증 테스트](../../../e2e/move-visuals.spec.ts), [원재료 목록](../../qa/previews/showdown-fx/contact-sheet.png).
