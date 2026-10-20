# 영입 정보/결과 표시 추가 정리 — 2026-10-20

## 결과 표시

RecruitCelebration 컴포넌트와 완료 dialog, 계속 버튼 및 이를 기다리던 상태를 제거했다. 기존 recruit API가 성공하면 즉시 다음 층/이벤트/클리어로 진행한다. 결과는 기존 GameDialogue를 재사용하여 화면 아래 공통 GameMenuBar의 메시지 한 줄로 표시한다.

- 동료: “OOO가/이 동료로 합류했다!”
- 도감: “OOO를/을 도감에 등록했다.”

별도 결과 modal은 만들지 않는다. 메시지는 다음 배틀을 성공적으로 불러오면 재생 시작 전에 지운다. 레이드의 기존 특별 보상 modal은 유지하며 그 위에서도 공통 하단 결과 메시지를 읽을 수 있다. 정상 결과와 오류를 구분하여 저장 실패 시에는 기존 오류 문구를 후보 화면 안에도 표시하고, 성공 메시지를 만들지 않는다.

## 정보창

기존 PokemonSummary의 comparison이 있는 영입 화면에만 압축 레이아웃을 적용한다. 도감 상세 및 포켓몬 설정은 기존 배치를 유지한다.

데스크톱은 최대 1050px의 2열이다. 왼쪽은 이미지·이름·공통 성별 아이콘·TypeBadge·특성·성격·종족값 육각형 그래프, 오른쪽은 기술 4개와 NEW! 및 하단 IV 비교표다. 종족값 그래프의 다각형은 종족값만 사용한다. 그래프의 IV 개선 주석은 제거하고 종족값 숫자와 항목명을 조금 키웠다. IV 개선은 오른쪽 비교표에서만 표시한다. 중복 테라·변신 안내는 후보 화면에서 생략한다. 폼은 기존 폼 이름과 스프라이트로 구분한다.

1280×900 및 1280×720에서 일반적인 4기술 정보가 내부 세로 스크롤 없이 들어오는 것을 검사했다. 700px 이하에서는 정보 그룹을 한 열로 배치하고 내부 스크롤을 허용한다. 390px에서 마지막 기술까지 접근 가능하고 가로 내용이 잘리지 않는지 검사했다.

## NEW!와 IV 판정

- 종 NEW!: 기존 tower.unlocked의 종 등록 여부를 RecruitChoices가 owned로 전달한다. Run에 없더라도 계정 도감에 등록되어 있으면 표시하지 않는다. 완전히 새 종만 정보 패널의 포켓몬 이름 옆에 작은 금색 NEW!를 표시한다.
- 기술 NEW!: 기존 run.collectionMoves와 후보 기술을 비교한다. 서버가 제공하는 collectionMoves는 해당 종의 selfMoves/보유 기술/수집 해금 데이터를 포함하는 기존 unlockedMoves 결과다. 현재 장착 4칸으로 판단하지 않으며, 기존 정규화 비교를 그대로 재사용했다. 새 기술에만 기술명 옆 작은 금색 NEW!를 붙인다.
- IV: 기존 candidateIVs / collectionIVs를 그대로 사용한다. 같은 종이 등록되어 있고 후보가 더 높은 경우에만 “기존 → 신규 ↑”를 표시한다. 기존값과 화살표는 일반 색, 신규값과 ↑만 #eb9292로 강조한다. 같거나 낮은 경우 후보 숫자만 표시한다. 새 종은 비교 없이 후보 IV만 표시한다.

서버 저장, 후보 생성, IV 최대값 병합, 기술 수집, 영입 제한, 배틀 밸런스, DB는 변경하지 않았다.

## 수정 파일

| 파일 | 내용 |
| --- | --- |
| src/web/battle-game.tsx | 성공 메시지 및 완료 대기 제거, 다음 진행 즉시 연결 |
| src/web/recruit-dialog.tsx | 완료 팝업 제거, 조사 처리된 짧은 결과 문자열 |
| src/web/game-menu-context.tsx | 기존 footer에 선택적 GameDialogue 메시지 표시 |
| src/web/styles/game-menu-context.module.css | 메시지와 공통 키 안내가 겹치지 않도록 높이/여백 조절 |
| src/web/pokedex-dialog.tsx | 공통 dialog의 로컬 CSS 클래스 참조 갱신; 기존 화면 동작 유지 |
| src/web/base-stat-radar.tsx | 기존 종족값 그래프 재사용; IV 개선 주석 제거 |
| src/web/pokemon-summary.tsx | 영입에만 2열 배치, NEW!/IV 표현, 공통 TypeBadge 연결 |
| src/web/recruit-candidate-details.tsx | 후보 정보창 폭 확장 |
| src/web/styles/recruit-comparison.module.css | 압축 레이아웃과 금색 NEW!/신규 IV만 붉은색 |
| src/web/styles/post-battle.module.css | 후보 정보창 폭 |
| src/web/recruit-choices.tsx | 후보 내부 오류 표시 |
| src/web/tower-controls.tsx | 기존 오류 상태 전달 |
| e2e/recruitment.spec.ts | 결과 팝업 없음, 하단 메시지, 계정 NEW!, 개선 IV, 기술 NEW!, 스크롤/오류/저장 검사 |
| e2e/raid-events.spec.ts | 영입 완료 대기 없이 특별 보상으로 진행 검증 |
| e2e/raid-recruitment.spec.ts | 하단 메시지와 레이드 폼 저장 검증 |
| 이 문서 | 작업 결과 |

## 검증

- 프로덕션 빌드, TypeScript, CSS 구조, 공백 검사 통과.
- 일반/레이드 영입 저장 회귀 테스트 16개 통과.
- 브라우저 회귀 검증 27개 통과: 영입 UI 8개, 레이드 이벤트 7개, 레이드 분기 폼 4개, 기존 도감 설정 8개. 영입 마지막 실행은 8개 모두 통과했다.
- 마지막 층에서도 완료 팝업 없이 클리어로 진행하며 하단 결과를 표시하고, 다음 배틀 로딩 성공 시 결과 메시지가 사라지는 것까지 확인했다.
- 물리 게임패드, Chrome 외 브라우저, 모든 긴 폼 이름 조합은 수동 확인 범위다.

후속 배치 변경: 기존 IV 비교표를 우측 하단으로 이동하고 왼쪽 아래에 공통 BaseStatRadar를 다시 표시했다. 720px 높이를 유지하도록 기술 카드 간격을 압축했다.
