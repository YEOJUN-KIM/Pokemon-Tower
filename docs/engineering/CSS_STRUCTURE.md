# CSS 관리

화면 스타일은 `src/web/styles/*.module.css`에 있습니다. `ScreenStyles`가 로컬 경계와 `data-ui-screen`을 제공하므로 다른 화면이나 경계 밖의 동일 클래스에 스타일이 적용되지 않습니다. 기존 클래스 이름은 키보드 조작·초점 복귀에 계속 사용합니다.

| 수정할 것 | 담당 파일 |
|---|---|
| 공통 디자인 변수 | `tokens.css` |
| 문서 글꼴·배경·스크롤 | `src/app/globals.css` |
| 공통 UI와 기본 테마 | `foundation.module.css`, `game-theme.module.css`, `retro-theme.module.css` |
| HP 표시·상태·반응형 배치 | `battle-health.module.css` |
| 배틀 배치·모바일 메시지 행 | `battle-layout.module.css` |
| 도감 목록·편집 창 | `pokedex.module.css`, `pokedex-center.module.css`, `pokedex-editors.module.css` |
| 설정·계정·상점·타이틀 | 각 화면 이름의 `.module.css` |

담당 파일의 원래 규칙을 수정하고 다른 테마 파일 끝에 덮어쓰기를 추가하지 않습니다. 공통 변수는 한 번만 정의하며, 상태는 `data-*`·`aria-*`로 표시합니다. 기존 선택자의 `:global()`은 로컬 경계 안에서 사용합니다. 새 독립 컴포넌트는 자체 로컬 클래스를 우선합니다.

동적 HP 비율·이미지 크기·연출 좌표는 계산값을 전달할 수 있지만 고정 디자인은 화면 코드의 인라인 스타일에 추가하지 않습니다. `pnpm check:css`로 경계 없는 전역 선택자·중복 변수를 확인합니다.

기본·테마·상태·반응형 분기 일부는 유지합니다. CSS Modules가 내부 중복까지 자동 제거하는 것은 아닙니다. [문제점·이동 과정·검증 기록](../../artifacts/reports/history/CSS_STRUCTURE-2026-10-14.md)은 개발 근거가 필요할 때만 읽습니다.
