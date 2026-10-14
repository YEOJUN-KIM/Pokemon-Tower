# CSS 문제점과 구조 개선

작성: 2026-10-14. 현재 화면을 유지하면서 스타일의 적용 범위와 수정 담당 위치를 명확히 하는 작업이다.

## 변경 전 문제

1. 루트 `layout.tsx`에서 전역 CSS 16개를 함께 불러왔고, 배틀·도감 페이지가 `pokedex.css`를 추가했다. 파일을 나눴어도 CSS 선택자의 영향 범위는 전역이었다. Next 16.3.8의 설치된 CSS 가이드도 화면 이동 시 전역 스타일이 제거되지 않아 충돌할 수 있다고 설명한다.
2. HP 표시창 `.health-card`의 크기·배경·테두리·여백이 `globals.css`, `game-theme.css`, `retro-theme.css`, `battle-layout.css`에서 반복 정의됐다. 기본·테마·반응형 규칙을 여러 파일에서 추적해야 했다.
3. `body :is(button, .dex-card, .dex-party-slot, .nav-item, .health-card)`처럼 여러 화면의 요소를 함께 바꾸는 규칙이 있었다. 공통 디자인을 바꾸는 수정과 한 화면만 바꾸는 수정의 경계가 불명확했다.
4. 같은 파일의 뒤쪽에 재정의를 추가하는 방식과 여러 파일의 모바일 규칙이 섞여 있었다. 실제 모바일 배틀 검증에서는 일반 메시지와 최신 메시지의 줄 높이가 각각 24px와 23.2px로 달랐다.
5. 다수의 CSS가 한 줄에 여러 선택자와 선언을 압축해 놓았다. 중복 확인과 코드 리뷰가 어려웠다. 공통 색상 변수도 여러 `:root`에서 덮어썼다.

## 적용한 구조

```text
src/app/globals.css                  문서 배경·글꼴·화면별 문서 스크롤
src/web/styles/tokens.css            공통 디자인 변수의 단일 정의
src/web/styles/screen-styles.tsx     라우트별 CSS 적용 경계와 모듈 연결
src/web/styles/boundary.module.css  배치를 만들지 않는 경계(display: contents)
src/web/styles/*.module.css         화면·기능별 스타일
```

기존 스타일 17개를 CSS Modules로 옮겼다. 기존 DOM 클래스는 키보드 커서·초점 복귀·테스트에서 사용하므로 유지한다. CSS Modules가 생성한 고유한 `.scope` 클래스가 화면 전체를 감싸며, 모든 기존 선택자는 그 경계의 하위에서만 적용된다. `:where()`로 경계의 선택자 우선순위를 0으로 만들어 기존 우선순위를 보존했다.

```css
/* 실제 파일에서 .scope는 CSS Modules의 고유한 클래스가 된다. */
:where(.scope[data-ui-screen="battle"]) :global(.health-card) {
  position: absolute;
}
```

`data-ui-screen`은 title/battle/pokedex/settings/upgrades/account 중 하나다. 화면 소유 규칙은 해당 속성이 일치할 때만 적용한다. 도감은 배틀 시작 전에도 포함되므로 collection 규칙은 battle/pokedex 두 영역을 허용한다. 대화창은 DOM에서 경계 안에 있으므로 네이티브 모달의 최상위 표시에서도 적용된다.

화면 전용 모듈은 해당 화면에서만 경계 클래스가 활성화된다. CSS 파일이 화면 이동 후 남아 있어도 적용 조건이 사라진다. 공통 버튼·대화창·이미지·키보드 커서는 의도적으로 공유한다. 현재는 번들을 가장 작게 나누는 최적화보다 스타일 경계 보장을 우선한다.

## 수정 담당 위치

| 변경 내용 | 담당 파일 (`src/web/styles/`) |
|---|---|
| 공통 색상 변수 | `tokens.css` |
| 공통 기본 UI / 기존 게임·레트로 테마 | `foundation.module.css`, `game-theme.module.css`, `retro-theme.module.css` |
| HP 창·HP 상태·데스크톱/모바일 HP 배치 | **`battle-health.module.css`** |
| 배틀 배치·모바일 배틀 메시지 행 | `battle-layout.module.css` |
| 키보드 커서 | `battle-focus.module.css` |
| 도감 목록·선택 | `pokedex.module.css`, `pokedex-center.module.css` |
| 능력치·기술 등 공통 편집 창 | `pokedex-editors.module.css` |
| 타이틀 / 설정 / 계정 / 영구 상점 | `title-screen.module.css` / `settings-screen.module.css` / `account.module.css` / `permanent-shop.module.css` |
| 변신·테라·기술 연출 | `gimmick-theme.module.css`, `tera-theme.module.css`, `move-visuals.module.css` |
| 도전 중 관리 창 / 나머지 모바일 보정 | `run-maintenance.module.css` / `mobile-ui.module.css` |

## 해결 과정

1. 기존 미커밋 기능 변경을 포함한 CSS를 읽고 옮겼다. 게임 데이터·저장 처리·기능 구현은 이번 구조 개선의 변경 대상에 포함하지 않았다.
2. 설치된 `node_modules/next/dist/docs/01-app/01-getting-started/11-css.md`를 읽고 CSS Modules와 전역 CSS 사용 범위를 확인했다.
3. 선택자 우선순위·미디어 조건·선언 순서를 보존하며 모듈화하고, 긴 줄을 선언별로 펼쳤다. 문서 루트를 꾸미는 `html body` 글꼴은 전역 기본값으로 남겼다.
4. 화면 경계를 추가하고 화면 전용 모듈을 조건부로 활성화했다. 상태 표현에는 기존 `data-hp-state`, `data-command-mode`, `aria-pressed` 등을 그대로 사용한다.
5. HP 관련 규칙 100개를 담당 모듈로 이동했다. 같은 선택자·미디어 조건에서 뒤쪽에 덮어쓰는 독립 속성 3개를 제거했다. 공통 디자인 변수 14개는 중복 정의 없이 한 곳으로 통합했다.
6. 모바일 메시지 행의 중복 규칙을 `mobile-ui`에서 제거하고 `battle-layout`의 한 규칙으로 통일했다. 최신 메시지도 16px 글자·1.5 줄 높이를 사용한다. 이 부분은 기존 불일치를 수정한 의도적인 화면 변경이다.

## 앞으로 지킬 규칙

- `globals.css`에는 문서 기본값만 둔다. 화면별 전역 CSS import를 추가하지 않는다.
- 문서 자체의 스크롤·배경처럼 `html`/`body`를 수정해야 할 때는 `globals.css`에서 활성 화면 경계가 존재하는 조건으로 제한한다. `body`는 화면 경계 안의 하위 요소가 아니다.
- 기존 요소를 수정할 때 위 담당 파일의 원래 규칙을 수정한다. 다른 테마 파일 끝에 덮어쓰기 규칙을 추가하지 않는다.
- 기존 클래스에 대한 `:global()`은 반드시 로컬 `.scope` 경계 안에서 사용한다. 새 독립 컴포넌트는 자체 `.module.css`와 로컬 클래스를 우선한다.
- 공통 변수는 `tokens.css`에서 한 번만 정의한다. 상태는 속성으로 표현하고 꾸미기는 담당 모듈에 둔다.
- 동적으로 달라지는 HP 비율·이미지 크기·연출 좌표 같은 계산값은 인라인 스타일/CSS 변수로 전달할 수 있다. 고정 디자인을 인라인으로 추가하지 않는다.
- 화면 규칙 변경 후 데스크톱·모바일과 다른 화면으로 이동한 상태를 확인한다.

기존 테마 전체의 모든 중복을 한 번에 삭제하지는 않았다. 기본·테마·상태·반응형 분기는 필요한 경우 남아 있다. 이번 작업은 경계를 실제로 적용하고 HP와 모바일 메시지의 담당 위치를 통합했다. 다른 요소의 오래된 재정의는 그 요소를 변경할 때 담당 모듈로 통합한다. CSS Modules 자체가 내부 중복까지 자동으로 해결하는 것은 아니다.

## 검증

- `pnpm check:css`: 모듈 경계 없는 전역 선택자, 빈 선택자, 화면 전역 CSS import, 중복 디자인 변수를 검사한다.
- `pnpm typecheck`, `pnpm build`: 타입과 프로덕션 CSS 처리 확인.
- `scripts/css-snapshot.mjs`: 별도 검증 계정으로 6개 화면을 1280px/390px에서 읽고 스크린샷·계산된 스타일을 `test-results/css-structure/`에 저장한다. 개발 서버의 원본과 구조 변경 후 비교 12조건에서 검사 대상 스타일 차이 0건을 확인했다. 배틀 진입 화면은 시작 전 도감 상태였다. 모든 요소나 모든 배틀 상태의 픽셀 일치를 뜻하지 않는다.
- `e2e/css-isolation.spec.ts`: 타이틀→설정→타이틀→도감으로 실제 이동하며, 다른 화면의 동일 클래스 및 화면 경계 밖으로 배틀 스타일이 새지 않는지 검사한다.
- 실제 배틀은 `e2e/mobile-battle-touch.spec.ts`로 추가 확인한다. 최종 실행 결과는 아래에 기록한다.

최종 검증: CSS 구조 검사(3,129규칙·14변수), 타입 검사, 프로덕션 빌드 통과. CSS 격리 1건·실제 모바일 배틀 터치/대화창 1건·데스크톱 키보드 기술 선택 1건, 총 E2E 3건 통과. 6개 화면×2너비의 비교에서 검사 대상 스타일 차이 0건. 전체 E2E·전체 게임 규칙 테스트는 통과 범위에 포함하지 않는다.

일부 기존 E2E는 현재 로그인 요구사항을 준비하지 않거나 오래된 도감 개수를 기대한다. `battle-layout-keyboard`는 로그인되지 않아 시작 전 도감의 커서를 찾지 못했다. 서버 모듈을 직접 가져오는 테스트 묶음의 기본 Playwright 실행은 JSON import attribute 오류로 시작하지 못했다. 저장소의 기존 스크립트 안내에 따라 `node --import tsx node_modules/@playwright/test/cli.js test ...`로 수집할 수 있다. 이번에는 로그인된 배틀 테스트 2건과 신규 CSS 격리 테스트를 최종 검증 범위로 삼았다. 전체 E2E가 통과했다고 표시하지 않는다.

[개발 문서 목록으로](../../../docs/engineering/README.md)
