# 개발 이어받기

기준: 2026-10-20. **1차 완성 후 정리·유지보수 단계**다. 기능은 [STATUS](STATUS.md), 이후 방향은 [ROADMAP](current/ROADMAP.md), 파일 책임은 [WORKSPACE](engineering/WORKSPACE.md)를 따른다.

## 유지할 기준

- DB schema 46, 새 일반 전투 기본 정책 tower-policy-v13. 이벤트 rules v1/v2·NPC snapshot v1/v2·빌런 트랙 버전·AI 버전은 각각 별개다.
- 일반 이벤트 발생률 15%·통과 순서 쿨다운 2. 신규 빌런 트랙은 독립 판정이다. [이벤트 설정과 추가 절차](engineering/EVENT_SYSTEM.md).
- NPC 입력은 scripts/data/npc/normal-npc-samples.json, runtime은 export 생성물이다. 현재 180행·911마리 후보, allFloors 156행. 옛 전체 재생성 부트스트랩은 삭제했다. [NPC 데이터](engineering/NPC_DATA.md).
- 알은 별도 기본 뽑기 페이지다. 지역/타입 선택·알 탐색 연구 UI를 다시 추가하지 않는다. 관련 서버 경로와 기존 영수증은 호환을 위해 유지한다. [알](gameplay/EGGS.md).
- 팀·시드·기믹·보상·영수증·정책은 저장 당시 snapshot으로 복구한다. 옛 버전이라는 이유로 저장 호환 분기를 삭제하지 않는다.
- 공통 game-menu·game-keyboard·GameDialogue·PokemonSettings와 기존 이미지/음향 경로를 재사용한다.

## 저장과 개인 실행

개발은 .env.local의 TOWER_DB_PATH, 통합 실행기는 Docker 볼륨 /data/tower.sqlite를 사용한다. 두 저장은 별개다. 실제 DB·WAL/SHM·환경변수·.data/backups·.data/transfers는 임시 파일이 아니다. [백업](operations/BACKUPS.md)·[PC 이전](operations/COMPUTER_MOVE.md)을 따른다.

루트 포켓몬타워 실행.exe는 개인 PC용이며 Git에 포함하지 않는다. 재생성 소스와 명령은 [개발 도구 안내](../scripts/README.md)에 있다. 이전 dist 배포본은 삭제했으므로 묶음이 필요하면 현재 코드에서 새로 만든다.

## 작업 전후

1. Git 변경과 담당 문서를 확인한다. Next.js 수정 전 설치된 next/dist/docs의 관련 안내를 읽는다.
2. 관련 테스트·타입·빌드·브라우저 검사를 선택한다. 실사용과 자동 검사를 구별한다.
3. 현재 설명은 기존 담당 문서를 갱신한다. 날짜별 작업 보고서는 artifacts/reports/changes, 실험은 artifacts/experiments로 분류한다.
4. pnpm check:workspace로 링크·설정 경로·폴더 경계를 확인한다. 임시 출력은 pnpm clean:temp로 지운다.
