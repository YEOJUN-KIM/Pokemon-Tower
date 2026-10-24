# 현재 게임 상태

기준: **2026-10-24 · v1.0.0-beta.5**. [GitHub 공개 prerelease](https://github.com/YEOJUN-KIM/Pokemon-Tower/releases/tag/v1.0.0-beta.5)와 `package.json` 버전 모두 beta.5다. 공개 기준 커밋은 `54e10401a14ce2525581adf8bfe900abdad99b14`다.

## 공개와 검증

- Windows Release ZIP과 SHA256 파일을 공개했다. EXE와 production runtime을 함께 제공하며 EXE 단독 배포가 아니다.
- Node.js 24 이상 설치 → ZIP 완전 압축 해제 → `PokemonTower.exe` 실행으로 플레이한다. 플레이어에게 pnpm/Python/Git/개발 빌드 도구를 요구하지 않는다.
- 로컬 Windows 11 x64의 패키지·설치·재실행·프로세스·저장 보존 자동 검사를 완료했다. **다른 Windows PC에서도 공개 Release ZIP 다운로드 후 정상 실행·플레이 성공을 사용자가 확인했다.** 세부 항목별 실기 확인 범위는 [beta.5 완료 기록](releases/WINDOWS_BETA_5.md)에 구분한다.
- beta.5 빌드 당시 전체 단위 테스트 1,530개와 ZIP 11,009개 파일의 무결성 검사가 통과했다. 모든 화면·기기의 전체 E2E 또는 사람의 100층 완주 검증을 뜻하지 않는다.

## 현재 구현

| 영역 | 현재 동작 |
|---|---|
| 타워 | Normal Mode 100층, 전·후반 지역 테마와 50/100층 관문, 관장·사천왕·챔피언·챕터 히든보스 |
| 배틀 | Showdown 기반 3대3 턴제 싱글, 최대 6마리 보유 파티에서 3마리 출전. 기술·교체·특성·상태이상·도구 처리 |
| 기믹 | 기본·메가진화·다이맥스·테라스탈·Z기술·혼합 6개 룰, 원시회귀·거다이맥스·선택 폼 지원 |
| NPC·이벤트 | 공통 Sample/Rank와 지역별 네임드. 일반 이벤트, 다단계 Raid, 조직별 빌런 캠페인, Mirror 도전자, 히든보스 |
| 계정 | 로그인 중심 진입, 하단 가입/비밀번호 찾기 링크, 2단계 비밀번호 재설정·복구 키, 게스트 저장 연결, 30일 로그인 유지, 로그인 후 타이틀 이동 |
| 신규 게임 | 초기 성장포인트 **256P 최초 1회** 지급. 튜토리얼 진행·첫 스킵 모두 동일하며 반복 진입·스킵으로 중복 지급하지 않음. 기존 지급 완료/진행 저장에 임의 보충 없음 |
| 수집·육성 | 스타팅 최종 진화형 27종 기본 해금, 영입·알·기술·개체값·이로치 수집. 폼별 기술·특성·테라 설정과 공통 성장 관리 |
| 화면 역할 | 포켓몬 도감은 **모두 보기** 기본, 정보·성장·기술 관리. 게임 시작의 출전 파티 편성은 **보유 중** 기본, 선봉·중견·마무리 선택과 룰·도전 시작. 계정 저장은 공유 |
| 성장·경제 | 층 승리 시 성장포인트 즉시 지급, 종료 시 미지급분·보너스만 정산. 영구 업그레이드 3종과 별도 알뽑기 화면 |
| Windows | 한국어 UI/UTF-8 출력, production 서버와 health check, 브라우저 자동 열기, 트레이 재열기·종료, 중복 실행 차단, Windows Job으로 하위 프로세스 정리 |
| 저장 | 사용자 DB는 `%LOCALAPPDATA%/PokemonTower/saves/tower.sqlite`. 개발 DB·Docker 볼륨과 분리하며 배포 교체/버전 갱신 때 보존 |
| 저장 호환 | SQLite schema 47, 새 일반 전투 정책 tower-policy-v13. 기존 팀·시드·정책·이벤트/NPC snapshot·지급 영수증을 유지 |
| 자산 | 외부 runtime 8,578개를 고정 source/recipe/manifest로 복원·검증. 개발은 assets:setup/verify, Windows ZIP은 자산 동봉. project-original·라이선스·출처 기록은 Git 보존 |

현재는 PC 우선이다. 자동 검사·다른 PC 실행·실제 장기 플레이는 구별해 기록한다. 알의 지역/타입 선택·탐색 연구 UI와 이로치 상시 교환권 판매는 현재 제공하지 않으며 기존 저장 호환 경로는 유지한다.

[게임 규칙](gameplay/README.md) · [구조와 설정](engineering/ARCHITECTURE.md) · [실행과 저장](operations/README.md) · [앞으로 할 일](current/ROADMAP.md)
