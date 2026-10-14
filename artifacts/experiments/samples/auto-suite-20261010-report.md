# 자동 샘플 점검과 대량 시뮬 · 20261010

도감 612종의 기본 설정, 기존 샘플, 자동 생성 18팀(48종)을 점검했다. 486등반 / 10770배틀을 실행했다. 마지막 패배 483개는 전체 공개 프로토콜로 재생해 일치 확인했다.

| 룰 | 100층 완주 | 50층 통과 | 평균 성공 층 |
|---|---:|---:|---:|
| basic | 2/162 | 17/162 | 22.0 |
| tera | 0/162 | 12/162 | 20.5 |
| chaos | 1/162 | 13/162 | 21.0 |

## 실패 신호

- early-loss: 236
- other-loss-needs-review: 203
- repeated-immune-attack: 74
- late-loss: 39

## 마지막 패배에서 공개된 무효 특성

- Wonder Guard: 73
- Levitate: 8
- Well-Baked Body: 5
- Water Absorb: 4
- Flash Fire: 3
- Dry Skin: 3
- Volt Absorb: 2

신호는 서로 겹치며 패배 원인을 증명하는 라벨이 아니다. 현재 무효 검사기는 일부 특성을 지원하지 않아 recognized-avoidable-immune 수치는 전체 엔진의 보장이 아니다. 정적 공격 범위 검사는 상태이상·날씨·PP·도구·테라·생존 여부를 완전히 모형화하지 않는다.

스타터 1~9세대 9팀과 시드로 뽑은 벽/트릭룸/혼합 각 3팀을 사용했다. 모든 자동 팀은 합법성 검사를 통과했으며, 경고가 있어도 기존 설정을 자동 변경하지 않는다. 완전 육성/층별 회복/자동 영입·구매 조건이다. 임의 3마리 조합의 사람 승률이나 최적화된 파티 승률은 아니다. 기존 9코스의 진단으로 지역과 룰 결과는 연관된다. 실제 게임 설정이나 상대 강도, 학습 모델은 변경하지 않았다.

재실행: node scripts/run-auto-suite.mjs 새숫자시드. 기존 시드 파일이 있으면 덮어쓰지 않는다. 완료된 기록만 재검사: node node_modules/tsx/dist/cli.mjs scripts/summarize-auto-suite.ts 20261010. cases/samples/manifest/룰별 battles/summary 파일은 같은 artifacts/experiments/samples/auto-suite-20261010 접두어다. 새 시드는 조합을 바꾸며 적 코스는 고정한다. 독립 검증에는 별도 적 코스가 필요하다.

## 공개 무효 사건의 자동 세부 분류

- no-static-direct-answer-among-survivors: 67
- static-answer-only-on-bench: 56
- static-answer-on-current-pokemon: 33
- public-ability-outside-current-policy-list: 5

위 수치는 해당 신호가 한 번 이상 나온 마지막 패배 수다. 별도 JSON의 immuneSignalEvents는 사건 수다. 유효 기술의 정적 존재만 확인하므로 PP·봉인·선택 잠금·교체 제한·생존 가능성 등 실제 합법성과 성공 가능성을 증명하지 않는다. 교체한 상대의 특성은 새 공개 이벤트까지 초기화하고 쓰러진 동료는 제외한다.

기본 도감 설정에서 직접 공격이 없는 메타몽·해무기·루브도 3종은 역할 검토 경고이며 설정 오류로 단정하지 않는다. 기존 마릴리/코터스 육성 불일치도 자동 검출했다.

## 적용 범위와 해석

# 자동 샘플 점검과 대량 시뮬

개별 포켓몬을 하나씩 수동 수정하기 전에 공통 오류와 반복 실패를 찾는 실험 도구다. 실제 게임 설정/세이브/NPC 정책은 변경하지 않는다.
