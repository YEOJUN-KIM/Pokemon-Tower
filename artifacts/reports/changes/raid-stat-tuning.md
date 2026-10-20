# Raid stat tuning / premium recruitment

강한 8종만 Raid 전투 IV와 포인트를 1차 완화했다. HP threshold, 기술, 특성, 폼, Aura, Phase, random branch, 등장 조건, 기존 돈/도구 보상은 유지한다. 조정하지 않은 12종은 재측정한 모든 요약 지표가 Threshold 기준과 정확히 일치한다.

모든 새 Raid Pokémon 보상은 `raid-premium`으로 분리했다. 플레이어 기본 build + 6V + 역할별 성격 + 합법 최대 66포인트를 생성 시 recruitTeam에 고정 저장한다. 프리뷰와 실제 영입, 영구 컬렉션 및 런 프로필에 같은 보상을 반영하며 Volcarona/Kyurem P2 보상과 shiny 확률을 유지한다. Mewtwo X 보상은 Jolly/Atk 육성과 맞는 합법 물리형 플레이어 build(Zen Headbutt / Drain Punch / Earthquake / Ice Punch)를 사용하며 Phase build를 그대로 복사하지 않는다. 기존 저장 스냅샷은 소급 재추첨하지 않는다.

- `pnpm typecheck`, `pnpm build`, `pnpm check:css`: 통과.
- Raid 기능 테스트: 151/151 통과. 전투/보상 분리, 모든 route·6개 층의 적법성, retry·disk reopen·replay·폼·determinism·native HP 회귀를 검증했다.
- Chrome E2E: 4/4 통과. 데스크톱/모바일에서 IV·포인트 표시와 reload 전후 동일성, 실제 지급 및 P2 폼을 확인했다.
- 전체 테스트: 1,437개 중 1,422개 통과, 15개 실패. 실패 15개 이름 모두 수정 전 HEAD의 별도 소스에서 재현했다. 기존 UI 문구 기대값, NPC baseline hash/Paldea 고정 build 기대값, encounter 설정 10/90 차이, trainer-equipment CSS import 문제가 포함된다. 이 작업 범위에서는 수정하지 않았다.
- 20개 Boss의 IV/Training/rewardProfile을 제외한 전체 선언 데이터가 HEAD와 동일함을 확인했다. HP mechanics와 shiny 소스도 HEAD와 동일하다.

## 측정 결과

20 × 500 = 10,000전, Boss마다 85/95층 각각 250전. 기존 seed·Player policy·team pool·AI를 유지했다. 첫 조정값은 결과를 보고 수정하지 않았다.

<35%: Mewtwo 5.6%, Zacian 13.6%, Rayquaza 26.6%, Kyogre 28.8%, Groudon 34.2%. >85%는 없다. 특히 Mewtwo와 Zacian은 권장 스탯 완화만으로 목표에 도달하지 않았다. Aura 등 후속 변경은 이번 작업에서 적용하지 않았다.

자세한 전투/보상 표, 세 모델 비교, Phase/branch 지표는 [Endgame 보고서](../../experiments/balance/raid-stat-tuned-endgame.md), 자동 검증 결과는 [validation JSON](../../experiments/balance/raid-stat-tuned-endgame.validation.json)을 참조한다. 원시 전투별 actual IV/points/seed/HP/protocol hash는 로컬 `artifacts/reports/raid-stat-tuned-endgame.battles.csv`에 보존한다.
