# 후속 플레이 피드백 5개 항목 — 2026-10-23

PC 기준으로 반영했습니다. 기존 이벤트 확률·코인 배율·아이템 가격·보상 공개 연출·세로 선택지는 유지했습니다.

## 구현

1. **영구 성장:** 일반 승리 20P, 주요 보스 승리 70P(20+50)를 계정에 즉시 지급합니다. 클리어 보너스 100P와 패배 확정 보너스 10P는 종료 시에만 지급하며, 포기는 추가 보너스가 없습니다. 기존 총 지급 공식을 유지합니다. 배틀 상단에 현재 보유 성장 포인트를 표시하고 기존 정비 조정 기능에서 바로 사용합니다.
**중복 방지:** 추가 테이블 run_growth_progress에 Run별 누적 지급액을 기록합니다. 승리·계정 지급·누적 기록은 기존 승리 트랜잭션에 포함됩니다. 기존 진행 중 저장은 보상 영수증을 바탕으로 미지급분만 재접속 시 정산하며, 최종 정산 영수증이 있는 저장은 재지급하지 않습니다. 재접속·중복 승리·사용 후 재접속·트랜잭션 실패를 검증했습니다. 저장된 배틀 스냅샷은 바꾸지 않습니다.
2. **기믹:** 포커스/커서는 아이콘 1.045배 확대·밝기·약한 외곽광·텍스트 강조, 실제 선택은 1.07~1.12배 확대와 3.2초 주기의 부드러운 빛/아우라로 구분합니다. 공통 버튼의 사각 배경·테두리를 되살리지 않고, 키보드 포커스 자체는 유지합니다. 움직임 감소 설정에서는 애니메이션을 끕니다.
3. **Z 설명:** 기술별 전투 묘사 및 실제 효과를 z-moves.json에 기록했습니다. 타입별 Z크리스탈 설명은 “해당 타입 기술을 지닌 포켓몬이 Z기술을 사용할 수 있게 해주는 결정” 형식으로 통일하고, 전용 결정에는 대응 기술을 표시합니다. PP·위력·명중률과 전투 효과 데이터는 유지합니다. 긴 기술 설명에만 상단 1.8초 대기 → 초당 18px 읽기 → 끝 2.4초 대기 후 반복을 적용합니다. 스크롤바를 숨기되 휠 스크롤을 유지하고, 마우스 올림/키보드 포커스 중에는 정지합니다. 직접 휠 조작 후 4초 동안 자동 읽기를 보류합니다. 짧은 설명과 움직임 감소 설정에서는 자동 이동하지 않습니다.
4. **50층:** 테마 챔피언/히든보스만 정확히 50층에서 기존 최종 관문 구성을 사용합니다. IV 상한 24, 능력 포인트 총량 상한 46으로 낮추며 100층은 기존 IV/능력 포인트 최적화를 유지합니다. 기존 대표 포켓몬·역할·기술·아이템·기믹을 재사용하고 N의 최종 구성에 있는 제크로무를 50층에서도 확보합니다. 일반층·관장·빌런의 성장 곡선은 유지합니다.
5. **도망치다!:** 현재 트레이너 배틀의 버튼은 선택 가능하며, 지정된 안내 메시지만 클라이언트에서 표시합니다. 서버 요청·턴·PP·상태·행동권 변경이 없고 다음 메뉴/기술 선택 시 안내를 해제합니다. 별도 도망 커맨드를 엔진이나 API에 추가하지 않았습니다.

## 50층 보스와 주요 세팅

아래는 고정 seed 1,2,3,4의 대표 3마리입니다. 원래 후보군과 대표 포켓몬을 유지하므로 실제 조합은 저장된 seed에 따라 달라질 수 있습니다. 능력치 표기는 이 프로젝트의 능력 포인트 체계입니다.

| 보스 | 대표 구성 · 지닌도구 | 기믹 |
|---|---|---|
| 그린 (named-blue) | Blastoise · Mystic Water / Pidgeot · Pidgeotite / Machamp · Leftovers | mega: Pidgeot |
| 레드 (named-red-kanto) | Venusaur · Black Sludge / Pikachu · Dynamax Band / Snorlax · Leftovers | dynamax: Pikachu |
| 목호 (named-lance) | Charizard · Heavy-Duty Boots / Gyarados · Expert Belt / Dragonite · Dragoninite | mega: Dragonite |
| 레드 (named-red) | Charizard · Heavy-Duty Boots / Lapras · Expert Belt / Pikachu · Dynamax Band | dynamax: Pikachu |
| 성호 (named-steven) | Armaldo · Lum Berry / Aggron · Choice Band / Metagross · Metagrossite | mega: Metagross |
| 윤진 (named-wallace) | Gyarados · Lum Berry / Whiscash · Sitrus Berry / Milotic · Waterium Z | z: Milotic |
| 난천 (named-cynthia) | Milotic · Leftovers / Gastrodon · Leftovers / Garchomp · Lum Berry | 기존 고정 빌드 |
| 용식 (named-barry) | Empoleon · Waterium Z / Snorlax · Leftovers / Roserade · Wise Glasses | z: Empoleon |
| 아이리스 (named-iris) | Archeops · Sitrus Berry / Haxorus · Focus Sash / Aggron · Choice Band | 기존 고정 빌드 |
| N (named-n) | Vanilluxe · Never-Melt Ice / Zekrom · Expert Belt / Zoroark · Focus Sash | 기존 고정 빌드 |
| 카르네 (named-diantha) | Aurorus · Assault Vest / Gardevoir · Gardevoirite / Goodra · Assault Vest | mega: Gardevoir |
| 세레나 (named-serena) | Delphox · Expert Belt / Absol · Absolite / Jolteon · Wise Glasses | mega: Absol |
| 쿠쿠이 (named-kukui) | Braviary · Choice Scarf / Incineroar · Incinium Z / Slowbro · Leftovers | z: Incineroar |
| 하우 (named-hau) | Noivern · Life Orb / Primarina · Assault Vest / Raichu-Alola · Aloraichium Z | z: Raichu-Alola |
| 단델 (named-leon) | Aegislash · Weakness Policy / Dragapult · Focus Sash / Charizard · Life Orb | dynamax: Charizard |
| 테사 (named-geeta) | Glimmora · Focus Sash / Espathra · Life Orb / Kingambit · Black Glasses | tera: Kingambit |
| 네모 (named-nemona) | Lycanroc · Focus Sash / Pawmot · Punching Glove / Meowscarada · Life Orb | tera: Meowscarada |

## 검증

- 전체 단위·통합 테스트: **1,487개 통과**.
- PC Chrome 회귀 테스트: **8개 통과**. 실제 리베로·변환자재, 레이드 지나가기/보상 공개, 기존 UI와 투명 아이콘, 빌런 강제 진행, 도망 메시지의 서버 상태 불변, Z기술 설명의 자동 읽기·정지·짧은 설명 고정 등을 검증했습니다.
- 프로덕션 빌드 및 TypeScript 검사: 통과.
- CSS 구조 검사: 통과 (3,963개 bounded rule, 공통 토큰 35개).
- 테스트 로그: artifacts/qa/play-feedback/logs/followup-verified-unit.log, followup-verified-browser.log, followup-build-final.log. 최종 아이콘 검증: followup-browser-final.log.

## 파일 목록

| 파일 | 수정 내용 |
|---|---|
| `e2e/followup-feedback.spec.ts` | 새 지급 시점·50층 기준 및 실제 UI 회귀 검증 |
| `src/data/z-crystals.json` | Z기술·결정의 설명 문구 정리 |
| `src/data/z-moves.json` | Z기술·결정의 설명 문구 정리 |
| `src/server/npc-templates.ts` | 50층 최종 구성과 제한된 IV/능력 포인트 적용·검증 |
| `src/server/opponent-team.ts` | 50층 최종 구성과 제한된 IV/능력 포인트 적용·검증 |
| `src/server/schema.ts` | 누적 성장 지급 기록, 즉시 지급 및 차액 정산 |
| `src/server/tower-store.ts` | 누적 성장 지급 기록, 즉시 지급 및 차액 정산 |
| `src/web/battle-commands.tsx` | 성장 포인트 표시, 도망 메시지와 설명 컴포넌트 연결 |
| `src/web/battle-game.tsx` | 성장 포인트 표시, 도망 메시지와 설명 컴포넌트 연결 |
| `src/web/reading-description.tsx` | 공통 자동 읽기·수동 읽기 우선 처리 |
| `src/web/restart-notice.ts` | 이미 지급된 성장 포인트를 누적 획득으로 안내 |
| `src/web/styles/reading-description.module.css` | 공통 자동 읽기·수동 읽기 우선 처리 |
| `src/web/styles/game-menu.module.css` | 공통 메뉴 배경·선택·호버 테두리 적용 대상에서 기믹 아이콘을 제외해 사각 프레임 충돌 방지 |
| `src/web/styles/tera-theme.module.css` | 기믹 포커스와 활성화 시각 효과 |
| `src/web/tower-clear.tsx` | 이미 지급된 성장 포인트를 누적 획득으로 안내 |
| `tests/encounters-moves.test.ts` | 새 지급 시점·50층 기준 및 실제 UI 회귀 검증 |
| `tests/followup-feedback.test.ts` | 새 지급 시점·50층 기준 및 실제 UI 회귀 검증 |
| `tests/hau-guzma.test.ts` | 새 지급 시점·50층 기준 및 실제 UI 회귀 검증 |
| `tests/kalos-named-trainers.test.ts` | 새 지급 시점·50층 기준 및 실제 UI 회귀 검증 |
| `tests/kanto-named-trainers.test.ts` | 새 지급 시점·50층 기준 및 실제 UI 회귀 검증 |
| `tests/npc-templates.test.ts` | 50층 최종 구성과 제한된 IV/능력 포인트 적용·검증 |
| `tests/run-settings.test.ts` | 새 지급 시점·50층 기준 및 실제 UI 회귀 검증 |
| `tests/thirty-floor.test.ts` | 새 지급 시점·50층 기준 및 실제 UI 회귀 검증 |
| `tests/trainer-catalog.test.ts` | 새 지급 시점·50층 기준 및 실제 UI 회귀 검증 |
| `tests/unova-named-trainers.test.ts` | 새 지급 시점·50층 기준 및 실제 UI 회귀 검증 |

## 추가 플레이 확인

50층의 승률과 100층 대비 체감 차이, 층별 지급으로 바뀐 성장 포인트의 소비 시점, 느린 읽기 속도와 기믹 광원의 체감을 추가 플레이로 조정할 수 있습니다.

![기믹 선택과 Z기술 설명](../../qa/play-feedback/followup-gimmick-selected.png)
