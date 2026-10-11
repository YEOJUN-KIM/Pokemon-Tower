> 문서 범위: 아래 내용과 검증 수치는 작성 당시 기록이다. 현재 기능·층수·가격·키 조작·상대 AI는 [STATUS](../STATUS.md), 후속 작업은 [ROADMAP](../current/ROADMAP.md), 실험 적용 상태는 [EXPERIMENTS](../experiments/README.md)를 먼저 확인한다.

# 개발 기술과 도구

최종 문서 갱신: 2026-10-09. 정확한 패키지 버전은 package.json과 pnpm-lock.yaml을 기준으로 한다. 아래 도구 설치·런타임 수치는 개발 당시 확인 기록이며 이번 문서 작업에서 새 환경 설치를 검증한 것은 아니다.

## 현재 사용 중

| 도구 | 역할 | 현재 상태 |
|---|---|---|
| Node.js | TypeScript 실행 도구와 배틀 엔진의 런타임 | 이 환경에서 24.19.0 확인 |
| pnpm | 패키지 설치·스크립트 실행·버전 잠금 | 11.19.0 사용, Codex 번들 경로에서 실행 |
| TypeScript | 타입을 사용하는 애플리케이션 코드 | 개발 의존성 설치 완료 |
| tsx | TypeScript CLI와 테스트 실행 | 개발 의존성 설치 완료 |
| Pokémon Showdown | 턴 처리·데미지·상태·교대·승패 계산 | 0.11.11 설치 |
| node:test / assert | 첫 배틀의 통합·단위 테스트 | Node 내장 기능 사용 |
| Git | 소스와 문서 버전 관리 | 이 환경에서 실행 확인 |
| React + Next.js | 웹 화면과 Node.js 서버 API | React 19.3.0, Next.js 16.3.8 |
| CSS | 반응형 레이아웃·HP 변화·간단한 전투 연출 | 직접 구현 |
| Playwright | 브라우저 플레이·HTTP API·모바일 검증 | 1.63.0, 설치된 Chrome 사용 |
| SQLite / node:sqlite | 관계형 영구 저장·트랜잭션·행동 기록 | 로컬 프로토타입에 채택, Node 24 내장, 현재 SQLite 3.53.3 |

TypeScript는 별도 앱이 아니라 프로젝트에 설치하는 개발 도구다.
Node.js도 DB는 아니며 프로그램을 실행하는 런타임이다.

## 이후 도입할 구성

| 도구 | 용도 | 도입 시점 |
|---|---|---|
| PostgreSQL | 공개 서비스용 관계형 DB 후보 | 운영·배포 단계에서 SQLite 대체 검토 |
| Prisma | PostgreSQL 접근과 마이그레이션 후보 | 현재 미도입, 저장 계층 변경 시 검토 |
| GitHub Actions | 자동 테스트 | 공개 준비 단계 |

Vitest는 앞선 후보였으나 첫 CLI 테스트는 Node 내장 테스트 러너로 충분하여 아직 도입하지 않았다.
VS Code는 편집기로 추천하며 필수 런타임은 아니다. Docker는 로컬 DB 실행 후보로, 지금 설치할 필요는 없다.
배포 제공자와 인증 방식은 미정이다. NestJS·Spring 별도 서버는 현재 채택하지 않았다.
현재 PC에서 PostgreSQL·Docker 도구를 찾지 못해, 즉시 검증 가능한 SQLite를 임시 채택했다.
SQL은 TowerStore에 모아 화면·전투 코드와 분리했다. PostgreSQL 전환은 연결 설정만 바꾸면 끝나는 작업은 아니며 SQL·마이그레이션·동시성 검증이 필요하다.
Node 24의 내장 SQLite API 안정성 표시는 실험적일 수 있으므로 검증 런타임을 고정하고 공개 운영 전에 재검토한다.

## 선택 이유

Showdown의 Node API를 직접 연결하고 화면과 서버 코드를 TypeScript로 작성하기 위해 선택했다.
Next.js 프로젝트 안에서도 UI, 서버 API, 게임 도메인, 배틀 어댑터, 저장 계층의 역할은 분리한다.
백엔드 포트폴리오는 프레임워크 수보다 권한 검증·트랜잭션·멱등성·복구의 구현과 테스트로 보여준다.
