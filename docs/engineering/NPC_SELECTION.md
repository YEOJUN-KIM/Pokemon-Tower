# 네임드 선출·배치 정책

현재 정책은 `src/data/npc-selection-rules.ts`, 적용은 `src/server/npc-templates.ts`와 팀 생성 경로, 검토 입력은 `scripts/data/npc/normal-npc-samples.json`을 기준으로 한다. selectionRules 도입 보고서의 정책 부분을 통합했다. 당시 적용 표·전수 감사 결과는 로컬 보고서로 남기며 현재 입력 수·단계·50층 예외는 [NPC_DATA](NPC_DATA.md)를 따른다.

```ts
selectionRules?: {
  required?: string[];
  atLeastOneOf?: string[];
  preferredLead?: string[];
  preferredLast?: string[];
}
```

- `required`는 기존 필수 멤버·에이스·기믹 담당과 합쳐 선출을 보장한다.
- `atLeastOneOf`는 지정 후보군에서 적어도 한 마리를 고른다.
- `preferredLead`와 `preferredLast`는 이미 선출된 멤버만 이동한다. 배열 앞쪽이 우선이며 새로운 선출 의무나 확률을 만들지 않는다. 같은 종에 양쪽 배치를 동시에 지정하지 않는다.
- 가능한 조합을 필수 조건으로 제한하고 기존 품질 가중치·시드로 선출한 뒤, 기존 셔플과 선봉·마지막 배치를 적용한다. 배치 규칙이 없으면 추가 난수를 소비하지 않는다.
- 후보에 없는 종, 중복·빈 목록, 알 수 없는 필드, 3마리에 담을 수 없는 필수 조건, 충족 불가능한 선택군은 export와 런타임에서 거부한다.
- `preferredLast`는 시작 팀의 세 번째 슬롯이다. 전투 중 교체·강제 교체로 실제 마지막 출전은 달라질 수 있다. 대표 에이스라는 이유만으로 무조건 마지막에 두지 않는다.
- 날씨 역할은 실제 특성·기술로 판단한다. 종 이름만 보고 날씨 시동자로 분류하거나 승률 이상만으로 임의의 고정 공격수를 추가하지 않는다.
- 이미 저장된 packed 팀·seed·순서는 수정하지 않는다. 재도전·재접속·재생은 기존 snapshot 호환을 유지한다.

[현재 NPC 안내](../gameplay/NPC.md) · [입력과 검증](NPC_DATA.md)
