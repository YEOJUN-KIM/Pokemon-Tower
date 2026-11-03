# 상대 트레이너

- Status: Active
- Updated: 2026-11-03
- Baseline Commit: `1c05b6f5079143ba4be7df3f3745155aee483ce7`
- Applies To: beta.6 개발 / 문서 담당 영역 (공개 패키지 표기는 beta.5)

일반층은 공통 Sample 20개와 Normal/Elite/Master Rank를 조합한다. 네임드는 지역별 대표 파티·에이스·특성·도구·기믹과 AI 설정을 사용한다. 현재 검토 입력 180행 중 156행은 단일 후보 빌드이며, 실제 출전 3마리는 필수 멤버·선봉·에이스 등 선출 규칙을 적용해 구성한다.

신규 Run은 `hundred-floor-v2`다. [12구간 정책](../engineering/opponent-progression.md)이 기술·도구·AI·역할·Rank의 현재 기준이다.

| 구간 | v2 기준 |
|---|---|
| 1~10층 | 자속·서브웨폰, basic, Normal 중심·Master 추첨0, 무기믹 |
| 11~40층 | 기본 도구에서 setup/상태이상·회복/pivot/screen으로 발전, 무기믹 |
| 41~49층 | 전원 역할형 도구, 완성형 일반전, 무기믹 |
| 50층 | Champion 기믹·expert, 네임드 IV 상한16·포인트37 |
| 51~99층 | 전원 장비, Normal 무기믹·Elite/Master 중심 기믹. 71층 역할 조합·81층 약점 보완 |
| 100층 | Champion 에이스·기믹·expert, 네임드 IV 상한30·포인트50 |

50층 champion/final은 최종 후보군을 사용하며 N의 제크로무 등 기존 에이스를 보존한다. 기믹 없는 Champion은 기존 에이스 Tera를 사용하고 일반 무기믹 officer에는 일괄 부여하지 않는다. v1의 50층 IV24/포인트46·100층 포인트66은 superseded 참조로 기존 Run/전투에만 유지한다. [NPC_DATA](../engineering/NPC_DATA.md).

49→50 단차는 알려진 이슈다. 즉시 너프하지 않고 등반 코인·플레이어 성장·상점 개편 후 재측정하며 필요 시 49→50과 100층을 조정한다.

단일 allFloors 빌드는 같은 후보를 사용하지만 실제 층별 육성·기믹 해금은 별도로 적용한다. 지역별 고정 기믹·선출 제한도 해당 데이터가 기준이다. Normal/Elite/Master는 품질과 육성/기믹 비중의 내부 분류이며 상대 표시명 뒤에 붙이지 않는다.

플레이어 룰별로 동일 NPC의 파티를 따로 만들지 않는다. 대표 기믹과 팀 컨셉은 NPC의 입력이 정하며 선출·배치 정책은 [NPC_SELECTION](../engineering/NPC_SELECTION.md)을 따른다. 초기 두 단계 샘플 계획의 고정 3마리·328팀 수치를 현재 allFloors 구조에 적용하지 않는다. 하드모드·상대 6마리 공개 방식은 현재 일반 100층의 확정 규칙이 아니다.

새 일반 전투의 기본 정책은 tower-policy-v13이다. Basic/Tactical/Expert, 전술·지역별 동작은 능력치/팀 생성과 별개로 설정한다. AI는 공개 정보와 자신의 팀을 이용하며 플레이어의 비공개 후보 파티를 읽어 선출하지 않는다. 기존 전투는 저장된 정책으로 복구한다.

빌런은 신규 런의 독립 조직 트랙으로 진행한다. 조직·단계·간격·최소 층과 실패 누적 확률을 사용하며 일반 이벤트 종류 확률과 구별한다. [빌런 캠페인](../engineering/VILLAIN_CAMPAIGNS.md)을 따른다.

[현재 입력·생성·검증](../engineering/NPC_DATA.md) · [AI](../engineering/npc-ai.md) · 과거 검토 표/보고서 (로컬 전용: `artifacts/reports/npc/README.md`)
