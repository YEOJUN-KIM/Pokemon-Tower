# NPC 팀 검토 자료

- [호연 필수 NPC 설계](hoenn-named-trainers.md) · [1차 밸런스 기준](hoenn-named-trainer-balance-report.md) · [1차 집계](hoenn-audit.json)
- [마그마 간부 두 명의 추가 조정](magma-executive-balance-report.md) · [추가 조정 집계](magma-executives-audit.json): 기준 commit 5325869와 최종 세트·선출·승률·메가 효과를 비교합니다.

- [일반 모드 두 단계 팀 표](NORMAL_MODE_SAMPLES.md): 단일 빌드 파일럿 이전의 단계별 비교 자료입니다. 도입 당시 6종 후보 변경은 [파일럿 명세](named-trainer-sample-pilot.md)를 함께 확인합니다.
- [최고 단계 참고 팀 표](NPC_TEAM_SAMPLES.md): 생성 기준을 검토하는 참고 자료입니다.

CSV는 `npc-team-*.csv`와 `normal-npc-*.csv`이며 개발 검증용입니다. 생성기 입력 JSON은 `scripts/data/npc/`, 실제 런타임 템플릿은 `src/data/normal-npc-templates.json`에 있습니다. 표의 균등 IV와 실제 배틀의 역할별 랜덤 IV는 구분합니다.

[현재 NPC 규칙](../../../docs/gameplay/NPC.md) · [데이터 구조·생성 명령](../../../docs/engineering/NPC_DATA.md)

현재 runtime 기준은 normal-npc-samples.json 검토 입력이다. normal CSV는 현재 입력으로 재생성했으며 summary v2 28열 180행, details v2 31열 911행이다. reference CSV 164행/492행과 옛 단계별 Markdown 팀 표는 참고 자료다. 현재 데이터 수정·생성·검증은 위 NPC 데이터 안내를 따른다.
