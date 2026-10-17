# 텔레포트 포탈 효과

## 수정 파일

- `public/images/events/teleport-portal.gif`: 첨부 원본 보관. 프로젝트에는 이전에 이미지 asset 없이 `◉` placeholder만 있었다.
- `public/images/events/teleport-portal.png`: 원본 첫 프레임의 픽셀과 투명도를 보존한 정지 이미지. 새 디자인을 생성하지 않았다.
- `public/images/events/README.md`: 원본 해시와 파생 이미지 설명.
- `src/web/teleport-portal.tsx`: 포탈 이미지와 장식 레이어. 프레임별 React 업데이트 없이 표시한다.
- `src/web/portal-effects.ts`: 타이밍·강도·asset 경로 상수.
- `src/web/styles/teleport-portal.module.css`: 포탈 전용 CSS 효과.
- `src/web/run-event.tsx`: placeholder를 포탈 컴포넌트로 교체하고 도착 후 중복 대기를 제거했다.
- `src/web/battle-game.tsx`: 텔레포트 선택 시 활성화 시작 → 짧은 대기 → 기존 서버 요청 연결. 중복 요청 방지 lock을 유지하고 화면 종료 시 타이머를 정리한다.
- `src/web/styles/run-event.module.css`: 전체 이미지를 회전·확대하던 이전 도착 효과 제거. 텔레포트 선택지의 데스크톱 잘림을 방지하는 국소 여백 조정.
- `tests/portal-effects.test.ts`, `e2e/teleport.spec.ts`: 배속·reduced-motion·idle·활성화·거절·도착·레이아웃 검증.

## Idle

원본 첫 프레임을 그대로 고정해서 바깥 실루엣이 흔들리지 않는다. 가운데에만 원형 mask를 씌운 약한 conic-gradient를 22초 주기로 회전시켜 안쪽 에너지의 회전감을 준다. 원본 전체 이미지는 회전하지 않는다.

뒤쪽 aura는 3.2초마다 opacity와 최대 1.5% 크기 차이로 맥동한다. 주변 3px 장식 4개는 서로 다른 위상으로 약 1.5px 이동한다. 실제 원본을 여러 레이어로 잘라내거나 새 파티클 엔진을 만들지 않는다.

## Activate와 기존 흐름

`순간이동한다` 클릭 직후 같은 포탈이 activate 상태가 된다. 밝기가 최대 1.22배 올라가고 중심 glow·외곽 pulse·입자 움직임이 잠시 강화된다. 포탈 중심 안에서만 짧게 빛이 번졌다 사라진다. 전체 화면 flash는 없다.

기본 720ms, 2배/4배속은 최소 400ms로 처리하여 너무 빠르게 사라지지 않는다. 활성화가 끝나면 기존 `event-choice` API를 호출하고 도착 문구를 보여준다. 서버 응답 뒤에 기존 1초 대기를 추가하지 않는다. 결과 확인, 출전 준비, 목적지 snapshot, 전투/보상/DB 동작은 그대로 유지한다.

`이용하지 않는다`는 이 대기를 거치지 않는다. 새로고침으로 이미 도착한 이벤트를 열면 활성화를 다시 재생하지 않는다. 요청이 실패하면 finally에서 활성화 상태를 해제하여 원래 선택 화면으로 돌아온다.

## 조절 위치

`src/web/portal-effects.ts`의 `portalEffects`에서 회전·pulse·입자 주기, 활성화/빠른 진행/정적 모드 시간, aura 강도, 입자 변위를 조절한다. CSS에서는 중심 mask 범위, gradient 색, 제한된 밝기 변화와 flash 곡선을 조절할 수 있다.

## Reduced motion과 성능

`prefers-reduced-motion: reduce`에서는 idle 회전·맥동·입자 이동을 정지시키고 약한 정적 glow만 남긴다. 활성화는 120ms의 낮은 opacity 페이드만 사용한다. GIF 자체를 재생하지 않으므로 정적 모드에서도 원본 애니메이션이 계속 움직이지 않는다.

Idle은 transform/opacity 중심 CSS 애니메이션 6개로 구성되며 JS 프레임 루프·canvas·외부 라이브러리·레이아웃 측정 루프가 없다. 밝기 filter는 작은 이미지에서 활성화할 때만 짧게 사용한다. React state는 활성화 시작·끝에만 변경한다.

## 수동 확인

1. 텔레포트 이벤트를 열어 이미지 외곽이 고정된 채 중심 에너지와 작은 입자가 조용히 움직이는지 확인한다.
2. `순간이동한다`를 누르면 버튼이 잠기고 포탈이 즉시 반응하는지 확인한다. 약 0.7초 뒤 도착 문구, 계속하기 후 기존 출전 준비가 나타나야 한다.
3. 배틀 설정을 4배속으로 바꿔 약 0.4초의 짧은 연출을 확인한다.
4. OS/브라우저 reduced-motion에서 idle 정지와 120ms의 조용한 반응을 확인한다.
5. 거절 시 포탈 강화 없이 기존 이벤트가 닫히는지 확인한다. 모바일 390px과 데스크톱 1280px에서 두 선택지가 모두 패널 안에 보여야 한다.

현재 프로젝트의 Raid 수동 QA 강제 출현 설정은 유지되어 있다. 자동 확인은 `e2e/teleport.spec.ts`의 registry 주입 픽스처를 사용한다. 연출 확인을 위해 운영 이벤트 확률을 바꾸지 않았다.

운영 설정 변경 없이 픽스처 화면을 직접 확인하려면 빌드 후 아래 명령으로 Playwright Inspector에서 진행한다.

```powershell
node node_modules/@playwright/test/cli.js test e2e/teleport.spec.ts --headed --debug
```

## 검증과 후속 조정

- 관련 단위/회귀 테스트 28건 통과.
- 포탈 브라우저 테스트 5건: 데스크톱·모바일 idle/도착, 4배속, reduced-motion, 거절 통과.
- 최종 브라우저 회귀 묶음 27건 통과: 위 포탈 5건 + Raid 7건 + 상자·브리더·상인 15건. 수정 후 데스크톱의 두 번째 선택지도 패널 안에 표시되는 것을 확인했다.
- TypeScript, CSS 구조 검사, Next.js 프로덕션 빌드 통과.
- 향후 조정은 실제 플레이에서의 glow 강도와 회전 속도 미세 튜닝 정도다. 별도 VFX 시스템은 필요하지 않다.
