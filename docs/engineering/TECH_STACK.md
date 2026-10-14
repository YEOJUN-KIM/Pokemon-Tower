# 기술 구성

정확한 버전은 `package.json`·`pnpm-lock.yaml`을 기준으로 합니다.

| 기술 | 용도 |
|---|---|
| Node.js 24 이상 | 서버·개발 도구 실행, 내장 SQLite |
| Next.js 16.3.8 / React 19.3.0 | 웹 화면·페이지·API |
| TypeScript / tsx | 타입 검사·개발 스크립트·테스트 실행 |
| Pokémon Showdown 0.11.11 | 배틀 계산·규칙·승패 |
| CSS Modules | 화면별 스타일 경계 |
| SQLite | 계정·게임 진행·복구 |
| node:test / Playwright | 코드 검사 / 브라우저 검사 |
| pnpm / Git / Docker | 의존성 / 이력 / 배포 환경 |

PostgreSQL·Prisma·별도 백엔드 프레임워크·머신러닝 모델은 현재 사용하지 않습니다.

[설치·실행](../operations/SETUP.md) · [코드 구조](ARCHITECTURE.md)
