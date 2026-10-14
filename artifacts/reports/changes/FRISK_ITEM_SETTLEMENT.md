# 통찰 공개 이벤트의 도구 정산 수정

갱신: 2026-10-14. 개발 서비스50, DB 스키마28.

40층 고디모아젤의 통찰이 연격 우라오스의 밴드를 공개할 때 엔진은 `|-item|p1a: Urshifu|dynamaxband|[from] ability: Frisk|...`를 기록했다. 기존 정산은 모든 `-item` 이벤트를 도구 획득으로 취급했고, 표시명 `Dynamax Band` 대신 내부 ID `dynamaxband`가 오면 미지원 도구로 판단해 장착을 삭제했다.41층 상점에 밴드가 다시 판매되고 우라오스 장착이 사라진 원인이다.

- 통찰은 장착 공개만 하므로 저장 도구를 변경하지 않는다.
- 실제 도구 획득·교환 이벤트의 내부 ID는 `normalizeHeldItem`으로 정규화한다. API 장착 입력의 기존 엄격 검증은 유지한다.
- 배틀 도구 표시와 한국어 이름에도 같은 정규화를 적용한다.
- 탁쳐서떨구기 등 실제 제거와 소비 효과는 기존 정산을 유지한다. 통찰 이후 실제 제거가 있으면 제거한다.

이번 피해 저장은 SQLite backup API로 `.data/backups/pre-frisk-band-repair-20261014-*.sqlite`에 백업하고 무결성 검사를 통과한 뒤 복구했다.40층 원본 팀·통찰 기록·제거 기록 없음·현재41층 준비 상태·밴드 미보유를 거래 안에서 확인하고 연격 우라오스에게 밴드1개를 재장착했다. 경기 로그·상점 상품·다른 도구·코인은 변경하지 않았다. 실제 저장을 다시 읽어 장착 유지와 기존 상점 밴드의 중복 구매 차단을 확인했다. 이는 모든 과거 도구 소모를 소급 지급하는 변경이 아니다.

회귀21개와 타입 검사 통과. 실제 통찰→40층 승리→41층 상점→다음 경기 장착, 정산 중복 방지, 실제 탁쳐서떨구기·트릭, 기존 도구·폼·출전 순서를 검증했다.

```powershell
node --import tsx --test tests/frisk-held-items.test.ts tests/held-items.test.ts tests/team-order.test.ts tests/playtest-oct13.test.ts
node node_modules/typescript/bin/tsc --noEmit
```

[도구 규칙](HELD_ITEMS.md) · [폼·도구 후속](FORM_EQUIPMENT_FIXES.md)
