# 플레이 피드백 반영 보고 — 2026-10-23

최종 요청에 따라 PC 기준으로 수정·검증했습니다. 전투 엔진·AI·포켓몬 데이터·보상 추첨표·저장 스키마·메가/다이맥스 규칙은 변경하지 않았습니다.

## 적용 값

| 항목 | 적용 값 |
|---|---|
| 이벤트 기본 발생 확률 | 20% (판정 대상 층 기준) |
| 기존 이벤트 제한 | 5의 배수 층 제외 및 2층 쿨다운 유지 |
| 일반 트레이너 전투 | 기존 기본 보상 × 1.25, 반올림 |
| 엘리트 트레이너 | 기본 보상 × 1.25 × 1.5, 반올림 |
| 마스터 트레이너 | 기본 보상 × 1.25 × 2, 반올림 |
| 기본 180코인 예시 | 일반 225 / 엘리트 338 / 마스터 450코인 |
| 기존 전투 및 네임드 보스 | 저장된 보상액과 네임드 보스 기본 보상 유지 |

## 핵심 도구 가격

| 대상 | 이전 | 변경 |
|---|---:|---:|
| 다이맥스밴드 | 5,000 | 3,750 |
| 테라스탈오브 | 5,000 | 3,750 |
| 메가스톤 50종 | 각 5,000 | 각 3,750 |
| 주홍구슬·쪽빛구슬 | 각 5,000 | 각 3,750 |
| Z크리스탈 34종 | 각 3,000 | 각 2,250 |

일반 소비 아이템, 일반 지닌도구 및 별도 폼 변경 도구의 가격은 유지했습니다. 할인은 공통 아이템 카탈로그에서 계산하므로 상점 UI와 서버 결제에 같은 가격이 적용됩니다.

## UI와 연출

- 주요 텍스트는 대체로 12~18% 확대했습니다. 특히 작은 캡션은 12px 이상으로 올렸고 공통 메뉴 행 높이도 확장했습니다.
- 특성 메시지/팝업 → 타입 변경 안내 → 기술 → 애니메이션/피해 순으로 재생합니다. 저장된 전투 로그와 실제 배틀 규칙은 유지합니다.
- 이벤트 결과는 승리/발견 안내 → 발견 오브젝트 → 확인/개봉 → 실제 보상 공개 → 기존 받기/진행을 거칩니다. 새 지급 요청을 추가하지 않아 중복 지급하지 않습니다.
- 일반 이벤트의 기존 지나가기 선택을 유지하고 레이드에서도 실제로 선택할 수 있게 했습니다. 빌런은 데이터와 UI 모두 강제 도전입니다.
- 테라 아이콘 19개 및 다이맥스밴드/테라스탈오브 PNG를 검사했습니다. 알파 0~255가 정상이고 불필요한 사각 배경은 공통 버튼 CSS가 원인이어서 에셋 재작성 없이 수정했습니다.

## 검증

- 전체 테스트: **1,481 / 1,481 통과** (`node --import tsx --test --test-concurrency=4 tests/*.test.ts`).
- PC Chrome: **7 / 7 통과**. 1280×900·1600×900에서 전투/레이드 선택/보상 공개/폰트/투명 아이콘, 실제 변환자재·리베로 재생 및 재접속, 빌런 강제 진행 검증.
- `npm run build`: 통과 (프로덕션 빌드 및 포함된 TypeScript 검사).
- `tsc --noEmit`, `node scripts/check-css-structure.mjs`: 통과. CSS 3,948개 bounded rule, 공통 design token 35개.
- 초기 병렬 테스트/빌드 실행 중 자원 경합으로 테스트 작업자가 중단되어, 최종 전체 테스트는 동시 실행 수를 4로 제한해 다시 검증했습니다.
- Windows 샌드박스의 junction 생성 제한 때문에 빌드와 Chrome 테스트는 확장 권한에서 실행했습니다.
- 모바일 추가 검증은 마지막 요청에 따라 진행하지 않았습니다.
- 최종 로그: `artifacts/qa/play-feedback/logs/artifacts-playtest-all.log`, `artifacts/qa/play-feedback/logs/artifacts-playtest-desktop-verified.log`, `artifacts/qa/play-feedback/logs/artifacts-playtest-build-final.log`.

![PC 전투 화면](../../qa/play-feedback/battle-1280.png)

![발견·개봉 후 보상 공개](../../qa/play-feedback/reward-1280.png)

## 파일별 변경

| 파일 | 핵심 내용 |
|---|---|
| `e2e/ability-timing.spec.ts` | 실제 변환자재·리베로 특성 메시지, 타입 변경, 공격 연출과 재접속 타입 유지 검증. |
| `e2e/play-feedback.spec.ts` | PC 1280px·1600px에서 레이드 지나가기·보상 비노출/개봉·폰트·투명 아이콘·화면 너비 검증. |
| `src/app/globals.css` | 기본 글꼴 크기를 공통 md(16px) 토큰으로 전환. |
| `src/data/economy.ts` | 기본 전투 보상 1.25배, 엘리트 1.5배·마스터 2배, 시스템 도구 가격 0.75배 공통 설정. |
| `src/data/held-items.ts` | 메가스톤 50종, Z크리스탈 34종, 다이맥스밴드·테라스탈오브·원시구슬에만 할인 적용. |
| `src/data/run-events.ts` | 공통 이벤트 확률 20%, 빌런 도입 이벤트의 지나가기 제거. |
| `src/server/tower-store.ts` | 새 일반·엘리트·마스터 전투의 저장 보상 계산에 공통 배율 적용. 기존 전투 스냅샷과 네임드 보스 보상 유지. |
| `src/web/battle-event-order.ts` | BeforeMove 특성의 표시 시점을 선언적으로 등록하고 같은 소유자의 연속 효과를 기술 앞으로 이동. 반응형 특성과 저장 프로토콜 순서는 보존. |
| `src/web/battle-presentation.ts` | BeforeMove 특성 팝업에 해당 특성의 새 메시지를 함께 지정해 이전 메시지 잔류 방지. |
| `src/web/event-presentation.ts` | 탐색·레이드·NPC·희귀 보상의 발견 메시지와 오브젝트 공통 설정. |
| `src/web/reward-chest.tsx` | 기존 보물상자 SVG를 보상 공개에서도 재사용하도록 분리. |
| `src/web/reward-modal.tsx` | 발견·확인 버튼 → 650ms 개봉 연출 → 기존 RewardPanel 공개. 지급·선택·확인은 기존 서버 처리 사용. |
| `src/web/run-event.tsx` | 승리 안내에서 실제 보상을 숨기고 Reward Reveal 연결. 레이드 즉시 도전 처리를 없애 도전·지나가기 선택 복구. |
| `src/web/styles/account.module.css` | 기존 배치·반응형 구조를 유지하며 화면/컴포넌트의 글자 크기를 공통 typography 토큰으로 전환. |
| `src/web/styles/bag.module.css` | 기존 배치·반응형 구조를 유지하며 화면/컴포넌트의 글자 크기를 공통 typography 토큰으로 전환. |
| `src/web/styles/battle-focus.module.css` | 기존 배치·반응형 구조를 유지하며 화면/컴포넌트의 글자 크기를 공통 typography 토큰으로 전환. |
| `src/web/styles/battle-health.module.css` | 기존 배치·반응형 구조를 유지하며 화면/컴포넌트의 글자 크기를 공통 typography 토큰으로 전환. |
| `src/web/styles/battle-layout.module.css` | 기존 배치·반응형 구조를 유지하며 화면/컴포넌트의 글자 크기를 공통 typography 토큰으로 전환. |
| `src/web/styles/battle-result.module.css` | 기존 배치·반응형 구조를 유지하며 화면/컴포넌트의 글자 크기를 공통 typography 토큰으로 전환. |
| `src/web/styles/challenge-rule-choice.module.css` | 기존 배치·반응형 구조를 유지하며 화면/컴포넌트의 글자 크기를 공통 typography 토큰으로 전환. |
| `src/web/styles/challenger-candidates.module.css` | 기존 배치·반응형 구조를 유지하며 화면/컴포넌트의 글자 크기를 공통 typography 토큰으로 전환. |
| `src/web/styles/egg-station-menu.module.css` | 기존 배치·반응형 구조를 유지하며 화면/컴포넌트의 글자 크기를 공통 typography 토큰으로 전환. |
| `src/web/styles/foundation.module.css` | 기존 배치·반응형 구조를 유지하며 화면/컴포넌트의 글자 크기를 공통 typography 토큰으로 전환. |
| `src/web/styles/game-dialogue.module.css` | 기존 배치·반응형 구조를 유지하며 화면/컴포넌트의 글자 크기를 공통 typography 토큰으로 전환. |
| `src/web/styles/game-menu-context.module.css` | 기존 배치·반응형 구조를 유지하며 화면/컴포넌트의 글자 크기를 공통 typography 토큰으로 전환. |
| `src/web/styles/game-menu.module.css` | 기존 배치·반응형 구조를 유지하며 화면/컴포넌트의 글자 크기를 공통 typography 토큰으로 전환. |
| `src/web/styles/game-theme.module.css` | 기존 배치·반응형 구조를 유지하며 화면/컴포넌트의 글자 크기를 공통 typography 토큰으로 전환. |
| `src/web/styles/hidden-shop.module.css` | 기존 배치·반응형 구조를 유지하며 화면/컴포넌트의 글자 크기를 공통 typography 토큰으로 전환. |
| `src/web/styles/item-target-list.module.css` | 기존 배치·반응형 구조를 유지하며 화면/컴포넌트의 글자 크기를 공통 typography 토큰으로 전환. |
| `src/web/styles/mobile-ui.module.css` | 기존 배치·반응형 구조를 유지하며 화면/컴포넌트의 글자 크기를 공통 typography 토큰으로 전환. |
| `src/web/styles/party-preparation.module.css` | 기존 배치·반응형 구조를 유지하며 화면/컴포넌트의 글자 크기를 공통 typography 토큰으로 전환. |
| `src/web/styles/permanent-shop.module.css` | 기존 배치·반응형 구조를 유지하며 화면/컴포넌트의 글자 크기를 공통 typography 토큰으로 전환. |
| `src/web/styles/pokedex-center.module.css` | 기존 배치·반응형 구조를 유지하며 화면/컴포넌트의 글자 크기를 공통 typography 토큰으로 전환. |
| `src/web/styles/pokedex-editors.module.css` | 기존 배치·반응형 구조를 유지하며 화면/컴포넌트의 글자 크기를 공통 typography 토큰으로 전환. |
| `src/web/styles/pokedex-menu.module.css` | 기존 배치·반응형 구조를 유지하며 화면/컴포넌트의 글자 크기를 공통 typography 토큰으로 전환. |
| `src/web/styles/pokedex.module.css` | 기존 배치·반응형 구조를 유지하며 화면/컴포넌트의 글자 크기를 공통 typography 토큰으로 전환. |
| `src/web/styles/pokemon-settings.module.css` | 기존 배치·반응형 구조를 유지하며 화면/컴포넌트의 글자 크기를 공통 typography 토큰으로 전환. |
| `src/web/styles/post-battle.module.css` | 기존 배치·반응형 구조를 유지하며 화면/컴포넌트의 글자 크기를 공통 typography 토큰으로 전환. |
| `src/web/styles/raid.module.css` | 기존 배치·반응형 구조를 유지하며 화면/컴포넌트의 글자 크기를 공통 typography 토큰으로 전환. |
| `src/web/styles/recruit-comparison.module.css` | 기존 배치·반응형 구조를 유지하며 화면/컴포넌트의 글자 크기를 공통 typography 토큰으로 전환. |
| `src/web/styles/retro-theme.module.css` | 기존 배치·반응형 구조를 유지하며 화면/컴포넌트의 글자 크기를 공통 typography 토큰으로 전환. |
| `src/web/styles/retry-preparation.module.css` | 기존 배치·반응형 구조를 유지하며 화면/컴포넌트의 글자 크기를 공통 typography 토큰으로 전환. |
| `src/web/styles/reward-panel.module.css` | 공통 크기 토큰 적용 및 보상 발견·개봉 오브젝트, 최소 버튼 높이·줄바꿈·감소된 모션 설정. |
| `src/web/styles/run-event.module.css` | 기존 배치·반응형 구조를 유지하며 화면/컴포넌트의 글자 크기를 공통 typography 토큰으로 전환. |
| `src/web/styles/run-maintenance.module.css` | 기존 배치·반응형 구조를 유지하며 화면/컴포넌트의 글자 크기를 공통 typography 토큰으로 전환. |
| `src/web/styles/settings-screen.module.css` | 기존 배치·반응형 구조를 유지하며 화면/컴포넌트의 글자 크기를 공통 typography 토큰으로 전환. |
| `src/web/styles/shiny-sendout.module.css` | 기존 배치·반응형 구조를 유지하며 화면/컴포넌트의 글자 크기를 공통 typography 토큰으로 전환. |
| `src/web/styles/tera-theme.module.css` | 공통 크기 토큰 적용 및 메뉴의 !important 배경·테두리·그림자가 특수 아이콘 버튼에 붙지 않도록 모든 상태에서 투명화. |
| `src/web/styles/title-screen.module.css` | 기존 배치·반응형 구조를 유지하며 화면/컴포넌트의 글자 크기를 공통 typography 토큰으로 전환. |
| `src/web/styles/tokens.css` | 12px 이상 보조 텍스트와 공통 typography 크기 설정. 공통 메뉴 최소 행 높이 48→52px. |
| `src/web/styles/training-wallet.module.css` | 기존 배치·반응형 구조를 유지하며 화면/컴포넌트의 글자 크기를 공통 typography 토큰으로 전환. |
| `src/web/styles/tutorial.module.css` | 기존 배치·반응형 구조를 유지하며 화면/컴포넌트의 글자 크기를 공통 typography 토큰으로 전환. |
| `src/web/styles/upgrade-complete.module.css` | 기존 배치·반응형 구조를 유지하며 화면/컴포넌트의 글자 크기를 공통 typography 토큰으로 전환. |
| `tests/ability-timing.test.ts` | 변경된 확률·가격·전투 보상 또는 강제 이벤트 규칙에 맞게 검증 기준 갱신. |
| `tests/content.test.ts` | 변경된 확률·가격·전투 보상 또는 강제 이벤트 규칙에 맞게 검증 기준 갱신. |
| `tests/gimmicks.test.ts` | 변경된 확률·가격·전투 보상 또는 강제 이벤트 규칙에 맞게 검증 기준 갱신. |
| `tests/maintenance-settings.test.ts` | 변경된 확률·가격·전투 보상 또는 강제 이벤트 규칙에 맞게 검증 기준 갱신. |
| `tests/play-feedback.test.ts` | 20/100 확률 경계, 보상·가격, 레이드 무보상 건너뛰기, 빌런 선택, BeforeMove 큐 및 실제 React UI 검증. |
| `tests/primal-player.test.ts` | 변경된 확률·가격·전투 보상 또는 강제 이벤트 규칙에 맞게 검증 기준 갱신. |
| `tests/rocket-campaign.test.ts` | 변경된 확률·가격·전투 보상 또는 강제 이벤트 규칙에 맞게 검증 기준 갱신. |
| `tests/shop-economy.test.ts` | 변경된 확률·가격·전투 보상 또는 강제 이벤트 규칙에 맞게 검증 기준 갱신. |
| `tests/teleport.test.ts` | 옛 스키마 테스트 픽스처가 현재 스키마 버전에 관계없이 정확히 v42를 만들도록 보정. 운영 마이그레이션 변경 없음. |
| `tests/tower.test.ts` | 변경된 확률·가격·전투 보상 또는 강제 이벤트 규칙에 맞게 검증 기준 갱신. |
| `tests/trainer-equipment.test.ts` | 변경된 확률·가격·전투 보상 또는 강제 이벤트 규칙에 맞게 검증 기준 갱신. |
| `tests/villain-tracks.test.ts` | 변경된 확률·가격·전투 보상 또는 강제 이벤트 규칙에 맞게 검증 기준 갱신. |
| `tests/z-moves.test.ts` | 변경된 확률·가격·전투 보상 또는 강제 이벤트 규칙에 맞게 검증 기준 갱신. |

## 추가 플레이로 확인할 밸런스

- 11층·21층 상점까지의 누적 코인과 주요 시스템 하나를 구매하는 시점.
- 엘리트 출현 편차에 따른 재화 수급 차이와 일반 소비 아이템 구매 여력.
- 20% 기본 확률에 기존 쿨다운·관문 제외가 함께 적용될 때의 실제 이벤트 체감 빈도.
- 최대 배속에서 특성 메시지와 보상 연출이 충분히 읽히는지.

## 할인 대상 전체 이름

메가스톤(각 5,000 → 3,750): 갑주무사나이트, 눈설왕나이트, 앱솔나이트, 프테라나이트, 보스로라나이트, 후딘나이트, 파비코리나이트, 전룡나이트, 다부니나이트, 다크펫나이트, 독침붕나이트, 거북왕나이트, 번치코나이트, 폭타나이트, 리자몽나이트X, 리자몽나이트Y, 디안시나이트, 엘레이드나이트, 한카리아스나이트, 가디안나이트, 팬텀나이트, 얼음귀신나이트, 갸라도스나이트, 헤라크로스나이트, 헬가나이트, 캥카나이트, 라티아스나이트, 라티오스나이트, 이어롭나이트, 루카리오나이트, 썬더볼트나이트, 입치트나이트, 요가램나이트, 메타그로스나이트, 뮤츠나이트X, 뮤츠나이트Y, 피죤투나이트, 쁘사이저나이트, 깜까미나이트, 보만다나이트, 나무킹나이트, 핫삼나이트, 샤크니아나이트, 야도란나이트, 강철톤나이트, 대짱이나이트, 마기라스나이트, 망나뇽나이트, 이상해꽃나이트, 지가르데나이트.

Z크리스탈(각 3,000 → 2,250): 알로라이츄Z, 벌레Z, 악Z, 모크나이퍼Z, 드래곤Z, 이브이Z, 전기Z, 페어리Z, 격투Z, 불꽃Z, 비행Z, 고스트Z, 풀Z, 땅Z, 얼음Z, 어흥염Z, 짜랑고우거Z, 루나아라Z, 루가루암Z, 마샤도Z, 뮤Z, 따라큐Z, 노말Z, 피카츄Z, 지우피카츄Z, 독Z, 누리레느Z, 에스퍼Z, 바위Z, 잠만보Z, 솔가레오Z, 강철Z, 카푸Z, 물Z.

파일 목록은 이번 게임 개선에서 수정한 파일만 포함합니다. 함께 작업 중 변경된 README·ROADMAP은 이 보고서의 작업 범위에 포함하지 않았습니다.
