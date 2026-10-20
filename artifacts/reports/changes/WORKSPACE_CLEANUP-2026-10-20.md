# 1차 완성 후 파일·문서 정리

기준: 2026-10-20, HEAD 82c870ed. 이번 작업은 저장 호환을 유지한 작업 공간 정리다. 사용자가 추가 요청한 일반 이벤트 발생률 90→15% 외에는 게임 밸런스를 바꾸지 않았다.

## 삭제·배치

- 이전 dist 배포본 9개, 테스트/배포/재시작 임시 DB, 일회성 캡처, 변경 전 코드 사본/ZIP을 삭제했다. 첫 정리에서 84,171파일·8.56GiB를 제거했다.
- artifacts 루트의 참조 없는 오래된 출력 562개·3.11GiB를 삭제했다. 남은 참조 원자료 105개는 실험 유형의 raw/로 이동했다. 위 두 단계 합계 약 11.66GiB다.
- 옛 전체 NPC 부트스트랩, 일회성 Raid threshold/stats/stats2/final 측정 스크립트, 미사용 Pikachu 미리보기 스크립트를 삭제했다. 현재 NPC export·공용 Raid 측정 경로를 유지한다.
- 날짜별 UI/기능 보고서는 reports/changes, NPC 설계/튜닝 기록은 reports/npc, Raid/재화 실험은 experiments/balance로 이동했다. 현재 docs 루트에는 README·STATUS·SESSION_HANDOFF만 둔다.
- Markdown 링크, 스크립트 생성/읽기 경로, 테스트 입력, 기록의 경로 참조를 함께 수정했다. 과거 측정 source hash는 새 결과로 바꾸지 않았다.
- 이동한 기존 Git 관리 JSON/CSV 42개의 새 경로를 개별 허용했다. 로컬 대용량 원자료는 Git에서 계속 제외한다.
- 실제 저장 DB·WAL/SHM·환경변수·backups·transfers·외부 자산/라이선스·저장 재생용 과거 정책은 보존했다.

## 현재 문서

| 문서 | 최신화한 내용 |
|---|---|
| [루트 README](../../../README.md) | 100층 타워·기믹·네임드·이벤트·수집/육성·실행 중심 소개, 최신 화면 6종 촬영 |
| [STATUS](../../../docs/STATUS.md) | 1차 완성, NPC 180/911, Raid 20종, 독립 빌런, 별도 알 페이지, schema 46·AI v13 |
| [ROADMAP](../../../docs/current/ROADMAP.md)·[인계](../../../docs/SESSION_HANDOFF.md) | 완료된 개발 단계를 후속 미구현으로 되살리지 않도록 정리, 유지보수/향후 검토 구분 |
| [ARCHITECTURE](../../../docs/engineering/ARCHITECTURE.md) | 현재 영역별 책임과 빈도/가격/보상/트랙/육성 설정 위치 |
| [DATABASE](../../../docs/engineering/DATABASE.md) | schema 46, 독립 트랙 테이블, 이벤트/AI/DB 버전 차이와 복구 |
| [EVENT_SYSTEM](../../../docs/engineering/EVENT_SYSTEM.md) | 15% 발생·종류 weight·내부 결과 분리, v1 호환과 독립 빌런, 신규 콘텐츠 추가 절차 |
| [NPC_DATA](../../../docs/engineering/NPC_DATA.md) | 실제 검토 입력→export→runtime→게임, 단계형/단일형 후보와 CSV 180/911 |
| [Raid](../../../docs/engineering/RAID_EVENTS.md)·[빌런](../../../docs/engineering/VILLAIN_CAMPAIGNS.md)·[히든보스](../../../docs/engineering/HIDDEN_BOSS.md) | 현재 보스/트랙·HP/변신·영입·수동 메시지 확인·4개 히든보스 테마 |
| [NPC AI](../../../docs/engineering/npc-ai.md) | v13 기본 조합, 지역 설정, 과거 정책의 실제 저장 재생 책임 |
| [게임 안내](../../../docs/gameplay/README.md)와 담당 문서 | 이벤트·알·영구 상점·기술 설정·조작·진행·NPC의 폐기된 설명 제거 |
| [WORKSPACE](../../../docs/engineering/WORKSPACE.md)·[MAINTENANCE](../../../docs/engineering/MAINTENANCE.md) | 코드/문서/보고서/임시/실제 저장의 분류, 삭제와 Git 포함 기준 |
| [개발 도구](../../../scripts/README.md)·운영 문서 | 현행 생성/검증 명령과 스키마, 옛 명령/화면 설명 제거 |
| artifacts 안내·색인 | 이동한 결과를 주제별로 연결하고 과거 숫자와 현재 규칙 구분 |

NPC CSV 생성기는 단계형 후보를 고정 3마리로 잘못 가정하고 있었다. select 기반 후보 수/예산 검사로 맞춘 뒤 summary 180행·details 911행의 모든 셀을 CSV 저장/재읽기로 검증했다. runtime 입력/생성 JSON은 변경하지 않았다.

## 검사와 정리 기준

- pnpm test: **1,459 통과, 실패 0**.
- 이후 미사용 import 정리에 대해 관련 지역 테스트 **152 통과**.
- 현재 이벤트/장비/표시 경로 표적 검사 **43 통과**.
- 타이틀·알뽑기·영구 연구 Playwright **15 통과**.
- typecheck·프로덕션 build·CSS 구조·문서/명령/버전 경계·NPC runtime --check 통과.
- README 화면은 별도 시연 DB/계정으로 촬영했다. 실사용 계정의 재화나 진행을 사용하지 않았다. 사람의 100층 플레이를 이번에 새로 검증한 것은 아니다.

과거 특정 패치의 범위 밖 파일을 당시 해시와 같게 강제하던 일회성 검사 8개는 이후 의도된 변경과 충돌해 제거했다. 현재 NPC projection·합법성·선출·전투·복구 검사는 유지한다. 이전 UI의 전체 대화문 SSR 선노출·문구 가정은 현재 대화 영역/장면 검증으로 바꿨고, 장비 렌더링 테스트의 CSS 로더를 보완했다. 과거 팔데아 변형 비교는 현재 팀을 예전 상태로 가정하지 않고 명시적인 비교 사본을 사용한다.

check:workspace는 루트 문서 배치, package 스크립트 경로, 현재 DB/AI 문서 기준도 검사한다. clean:temp에는 재시작 테스트 출력 경로를 추가했다. 별도 Git 커밋/푸시는 하지 않았다.
