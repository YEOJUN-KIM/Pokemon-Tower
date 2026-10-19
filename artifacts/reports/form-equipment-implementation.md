# 특수 폼 도구 / 선택형 상점 구현 결과

기준: `a2f7f279995272f72e7146f036691bb8df19254a` Audit, 2026-10-19. 일반 플레이의 획득·장착·해제·전투 연결을 구현했다. Raid 보스/Phase/HP 배율/AI/밸런스 데이터는 변경하지 않았다.

| System | Item/Group | Shop | Form Link | Equip Restriction | Complete |
|---|---|---|---|---|---|
| 자시안 | Rusted Sword | 단일 상품 | 장착 Crowned / 해제 Hero, 타입·종족값·특성·화면 | Zacian 전용 | 완료 |
| 자마젠타 | Rusted Shield | 단일 상품 | 장착 Crowned / 해제 Hero | Zamazenta 전용 | 완료 |
| 오거폰 | Ogerpon Mask Choice | 선택형 1상품 | 3가면 교환 즉시 반영 / 해제 벽록, 전용 테라 타입 동기화 | Ogerpon 전용 | 완료 |
| 아르세우스 | Arceus Plate Choice | 17개를 1상품으로 | Multitype, 타입별 외형, Judgment 타입 / 해제 Normal | Arceus 전용 정책 | 완료 |
| 실버디 | Silvally Memory Choice | 17개를 1상품으로 | RKS System, 타입별 외형, Multi-Attack 타입 / 해제 Normal | Silvally 전용 | 완료 |
| 게노세크트 | Genesect Drive Choice | 4개를 1상품으로 | Drive별 외형 / Techno Blast 타입 / 해제 기본형 | Genesect 전용 | 완료 |
| 리자몽 / 뮤츠 | 각 Mega Stone Choice | 각각 1상품 | 기존 X/Y 메가진화 유지 | 기존 대상 제한 | 완료 |
| 메가지가르데 | Zygardite | 단일 상품 | Power Construct → Complete → 기존 Mega 행동 | Zygarde / 10% | 완료 |
| 메가레쿠쟈 | 도구 불필요 | 가짜 스톤 추가 없음 | Dragon Ascent + 허용된 Mega 행동 / 사용 제한 유지 | Z크리스탈 소지 시 Mega 불가 | 완료 |
| 울트라네크로즈마 | Ultranecrozium Z | 단일 상품 | 합체폼의 Ultra Burst 행동, 전용 Z기술 연계 | Dusk Mane / Dawn Wings 전용 | 완료 |
| 원시회귀 | Red Orb / Blue Orb | 기존 단일 상품 | 기존 등장 회귀·룰·사용 제한 유지 | 기존 Groudon / Kyogre 전용 | 회귀 검사 통과 |

## 새로 추가한 Choice Group

| 그룹 ID / 표시명 | 포함 실제 아이템 | 가격 | 카테고리 / 기존 등급 |
|---|---|---:|---|
| `choice:ogerpon` / 오거폰 가면 선택 | Wellspring / Hearthflame / Cornerstone Mask | 5,000 | special-form / legendary |
| `choice:arceus` / 아르세우스 플레이트 선택 | Flame, Splash, Zap, Meadow, Icicle, Fist, Toxic, Earth, Sky, Mind, Insect, Stone, Spooky, Draco, Dread, Iron, Pixie Plate | 3,000 | special-form / legendary |
| `choice:silvally` / 실버디 메모리 선택 | Fire, Water, Electric, Grass, Ice, Fighting, Poison, Ground, Flying, Psychic, Bug, Rock, Ghost, Dragon, Dark, Steel, Fairy Memory | 3,000 | special-form / legendary |
| `choice:genesect` / 게노세크트 카세트 선택 | Burn / Chill / Douse / Shock Drive | 3,000 | special-form / legendary |
| `choice:charizard` / 리자몽나이트 선택 | Charizardite X / Y | 5,000 | special-form / legendary |
| `choice:mewtwo` / 뮤츠나이트 선택 | Mewtwonite X / Y | 5,000 | special-form / legendary |

리자몽/뮤츠 가격은 예시 2,500이 아닌 **현재 커밋의 실제 메가스톤 가격 5,000**을 유지했다. 그룹 내부 옵션 가격은 모두 같다. 기본 Teal Mask와 Normal Plate/Memory는 추가하지 않았다.

상품 클릭은 선택창만 연다. 선택창에는 모든 옵션의 이름·아이콘·보유 상태를 표시하며, 배낭과 장착 도구를 합산해 보유 옵션을 비활성화한다. 마지막 한 옵션이어도 창을 유지한다. 선택을 확정할 때 서버가 그룹 소속·상점·리비전·도구 소유·장착 가능 대상·잔액을 다시 검사하고, 기존 SQLite 트랜잭션으로 차감·실제 도구 지급·구매 영수증을 처리한다.

취소는 서버 결제 요청을 보내지 않는다. Choice ID는 배낭에 들어가지 않는다. 같은 구매 요청의 재시도는 이중 지급하지 않고, 같은 슬롯에 다른 옵션을 뒤늦게 제출하면 거절한다. 구매 후 현재 슬롯은 구매 완료로 남으며, 미완성 그룹은 다음 상점/리롤 후보가 된다. 모든 옵션을 보유하면 이후 후보에서 제외된다.

## 새로 추가한 단일 상품

| 실제 아이템 | 표시명 | 대상 | 가격 | 상점 |
|---|---|---|---:|---|
| Rusted Sword | 녹슨검 | Zacian | 5,000 | 등록 |
| Rusted Shield | 녹슨방패 | Zamazenta | 5,000 | 등록 |
| Zygardite | 지가르데나이트 | Zygarde / Zygarde-10% | 5,000 | 등록 |
| Ultranecrozium Z | 울트라네크로Z | 합체 Necrozma | 5,000 | 등록 |

총 신규 실제 도구는 **45종**이다. 선택 그룹의 기존 X/Y 스톤 4종은 재사용했고 나머지 그룹 도구 41종과 위 단일 도구 4종을 등록했다. 기존 단일 Mega Stone, Red Orb, Blue Orb, Tera Orb, 일반 도구는 기존 구매/배낭 구조를 사용한다.

## 수정한 특수폼과 저장 처리

| Pokémon | 기존 문제 | 수정 결과 |
|---|---|---|
| Zacian / Zamazenta | 도구 주입 시험만 가능 | 정상 상품·아이콘·장착 제한·Crowned↔Hero 패킹/표시 연결. Iron Head/전용 강철 기술도 폼과 함께 정규화 |
| Ogerpon | 폼을 먼저 선택하면 가면 자동 고정, 해제 거절 | 실제 가면을 획득·장착·교환·해제. 신규 도전은 벽록에서 시작. 기존 저장에서 이미 제공된 가면은 1회 실제 장착 도구로 보존 |
| Arceus / Silvally | 엔진 타입만 존재, 도구/외형 연결 없음 | 도구 기반 폼 패킹·정면/후면/이로치 이미지·배틀 타입·기술 타입 표시 연결 |
| Genesect | Drive 획득·외형 없음 | 카세트 그룹, Drive 외형과 Techno Blast의 Fire/Ice/Water/Electric 타입 표시 |
| Zygarde | Zygardite/일반 Mega 경로 없음 | 스톤 장착 세트를 Power Construct로 정규화. HP 조건으로 Complete가 된 뒤 설치 엔진의 Mega 행동 사용 |
| Rayquaza | 무스톤 Mega 예외를 프로젝트가 차단 | 화룡점정 조건을 유지한 무스톤 예외. Mega 사용 제한 및 전투 화면 이미지/메시지 연결 |
| Necrozma | 엔진 Ultra Burst 요청을 게임이 무시 | `canUltraBurst → move … ultra` 전달, 버튼·한국어 표시명·NPC 행동·전용 Z기술 연계 |

장착 도구를 기준으로 `equippedFormSet`에서 species/ability/moves/teraType을 정규화하고, 그 결과를 기존 검증과 실제 엔진 양쪽에 사용한다. 오래된 Arceus 타입폼 같은 입력도 도구가 없으면 기본형으로 복구한다. 임의의 다른 종 폼은 계속 거절한다. 전투 중 장비 교환을 새로 도입하지 않았으며 기존 비전투 준비 단계에서만 변경한다.

기존 배틀 문자열·리플레이는 수정하지 않는다. 이전 FORMAT을 `PRE_FORM_ITEM_FORMAT`으로 보존했고 새로운 FORMAT에서만 도구 정규화·Rayquaza 예외·Ultra 경로를 적용한다. 데이터베이스에는 선택형 결제 영수증과 가면 마이그레이션 완료 표식만 추가했다. 기존 도구 판매/버리기 기능은 추가하지 않았다.

## 공용 데이터와 재사용 지점

- [form-items.ts](../../src/data/form-items.ts): 실제 폼 도구, 대상, 효과, 기본형/대응폼, 타입, 가격.
- [equipped-form.ts](../../src/data/equipped-form.ts): 도구 기반 세트 정규화. 일반 팀·NPC·향후 이벤트/보상/Phase Adapter에서 재사용 가능.
- [shop-products.ts](../../src/data/shop-products.ts): 데이터로 정의하는 그룹·옵션·가격, 그룹 단위 적격성·추첨·기존 상품 ID 호환.
- [held-item-shop.ts](../../src/data/held-item-shop.ts): `itemCategory('special-form')`과 기존 legendary/family 가중치 연결. 선택 그룹은 옵션 수와 관계없이 한 후보만 차지한다.
- [tower-store.ts](../../src/server/tower-store.ts): 기존 원자적 결제·중복 소유·장착 제한·리비전 검증 확장.
- [import-form-equipment-assets.ts](../../scripts/import-form-equipment-assets.ts): 도구 45종 아이콘과 폼 38개의 정면/후면/이로치 PNG. 다운로드 197개, 원본 URL·SHA-256을 [소스 명세](../../public/sprites/items/form-equipment-sources.json)에 기록.

희귀도별 등장 비율은 기존 데이터를 유지했다. 기존 legendary 내 가족 선택에 폼 도구 가족이 참여하며, 새 확률 밸런스 표를 임의로 만들지 않았다. 미래 특수 상점은 공용 category/옵션/적격성 필터를 사용할 수 있다. 기존 에픽 보상·도구 교환권 규칙은 그대로 유지했다.

## 남은 문제: Raid 전에 별도 처리할 범위

| 파일 / 원인 | 영향 / 필요한 다음 단계 |
|---|---|
| `src/battle/raid.ts`, `src/data/raids.ts`: Phase species만 주입 | Stellar/Tera/Dynamax는 폼과 별도 상태·트리거를 적용하는 Adapter가 필요하다. 이번에 Phase 데이터를 변경하지 않았다. |
| `src/server/raid-events.ts`, `src/battle/run.ts`: 기본 종으로 Phase 전용기 검증 | 합체 Necrozma, Kyurem, Hoopa의 Phase 전용기 적법성 검증은 별도 Adapter가 필요하다. 일반 선택폼 배틀은 기존대로 동작한다. |
| `src/battle/run.ts`, `src/battle/golisopod-mega.ts`: 공유 Dex와 로컬 특성 보정의 차이 | Golisopod-Mega의 Raid Tough Claws 검증 충돌은 기존 Audit 문제로 남는다. |
| `src/battle/gimmicks.ts`: 기존 양측 3마리 설치 조건 | 2 Phase Raid의 기믹 제한 훅 문제는 Raid 재사용 전에 해결해야 한다. 이번 요청의 일반 플레이/상점 범위에서는 보스/Phase를 변경하지 않았다. |
| 기존 Origin 폼/나머지 Z-A Mega | Giratina/Dialga/Palkia Origin의 기존 직접 선택+고정 도구 정책은 유지했다. 이번에 요청하지 않은 나머지 신규 Mega·Origin 도구 상점 확장은 별도 범위다. |

## 테스트 결과

- 전체 Node 테스트: **1,210개 중 1,207개 통과, 3개 실패**. 실패 3개는 모두 `tests/paldea-round2.test.ts`의 기존 데이터/옛 fixture 불일치다. 변경 전 커밋을 `.data/form-items-baseline`에 별도 추출하여 같은 3건이 재현됨을 확인했다(비교 실행 27개 중 24개 통과).
- 최종 표시명 수정 후 집중 검사: **24/24 통과**. 전체 도구 폼의 실전 `BattleView`, 기술 타입, 정면/후면 이미지, 장착/해제, 저장/재시작, Mega/Ultra 및 리플레이, 기존 원시회귀/Tera를 포함한다.
- NPC 보존·관련 회귀 묶음: **135/135 통과**. 사용자 요청으로 변경한 공용 도구/기믹 파일의 해시 기준만 갱신했으며 NPC 팀·기술·AI 정책 데이터는 변경하지 않았다.
- TypeScript, 최신 프로덕션 빌드, CSS 구조 검사 통과.
- `check:workspace`는 기존 보고 스크립트 15개의 docs 출력 경로 경고로 실패한다. 해당 스크립트는 이번 변경에 포함되지 않는다.
- 브라우저 검사 **5/5 통과**: 데스크톱·모바일 선택형 상점, Rayquaza Mega, Necrozma Ultra Burst, Zygarde Mega 이미지. 상세 결과: [검증 기록](form-equipment-validation.json). 테스트 파일: [form-item-shop.spec.ts](../../e2e/form-item-shop.spec.ts), [form-item-shop.test.ts](../../tests/form-item-shop.test.ts).
