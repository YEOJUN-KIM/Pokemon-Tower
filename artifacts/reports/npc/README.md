# NPC 팀 검토 자료

- [호연 필수 NPC 설계](../../../docs/gameplay/hoenn-named-trainers.md) · [밸런스 검증](../../../docs/gameplay/hoenn-named-trainer-balance-report.md) · [선출·승률·기믹 집계](hoenn-audit.json): 마그마 간부 둘은 추가 조정 대상으로 남아 있습니다.

- [일반 모드 두 단계 팀 표](NORMAL_MODE_SAMPLES.md): 단일 빌드 파일럿 이전의 단계별 비교 자료입니다. 현재 6종 후보 변경은 [파일럿 명세](../../../docs/gameplay/named-trainer-sample-pilot.md)를 함께 확인합니다.
- [최고 단계 참고 팀 표](NPC_TEAM_SAMPLES.md): 생성 기준을 검토하는 참고 자료입니다.

CSV는 `npc-team-*.csv`와 `normal-npc-*.csv`이며 개발 검증용입니다. 생성기 입력 JSON은 `scripts/data/npc/`, 실제 런타임 템플릿은 `src/data/normal-npc-templates.json`에 있습니다. 표의 균등 IV와 실제 배틀의 역할별 랜덤 IV는 구분합니다.

[현재 NPC 규칙](../../../docs/gameplay/NPC.md) · [데이터 구조·생성 명령](../../../docs/engineering/NPC_DATA.md)

현재 runtime의 기준은 normal-npc-samples.json 검토 입력입니다. 최신 CSV는 summary v2 28열(후보 수·최대 6마리), details v2 31열이며 normal은 320행/977행, reference는 164행/492행입니다. 옛 비교 표를 현재 전체 후보 목록으로 취급하지 않습니다.
