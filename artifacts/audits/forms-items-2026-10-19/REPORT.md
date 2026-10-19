# Pokémon Form / Mega / Item / Shop Audit

## Priority Summary

2026-10-19, 현재 체크아웃 기준. 기능·데이터·밸런스를 수정하지 않고 조사했다. **도감 미리보기, 일반 생성, 실제 변신, Raid Phase 진입은 서로 다른 경로**다. 전체 폼·메가·희귀종·아이템의 개별 행은 [전수 표](INVENTORY.md), 원본 수치·기술·이미지 경로·실행 결과는 같은 폴더의 JSON/CSV에 있다.

`Initial Select`는 게임의 `defaultProfile → validateProfile → packTeam` 경로다. `Raid Ready`의 직접은 기존 Phase 주입 훅 재사용 가능이라는 뜻이며, 현재 게임에 그 보스가 출시되어 있다는 뜻이 아니다. 현재 등록된 Raid 보스는 한카리아스와 뮤츠뿐이다. Adapter는 아직 구현하지 않았다.

| Pokémon | Forms Present | Dex | Initial Select | Required Mechanic | Gameplay Works | Raid Ready | Grade |
|---|---|---|---|---|---|---|---|
| Palafin | 기본 / Hero 엔진·화면 데이터 있음 | 두 폼 구분 | 기본만; Hero 거절 | Zero to Hero, 교체 후 재등장 | 플레이어·NPC 실제 전환 확인 | Hero 직접 주입 확인 | A |
| Terapagos | 기본 / Terastal / Stellar 모두 있음 | 세 폼 구분 | 기본만 | 등장 Tera Shift → 테라스탈 실행 | 두 단계 실제 확인. 자동 Stellar 없음 | Terastal 직접 가능; Stellar는 테라 상태 Adapter 필수 | A, Raid Stellar 연결 미완 |
| Necrozma | 기본 / Dusk Mane / Dawn Wings / Ultra 모두 있음 | 네 폼 구분 | 합체 2폼 가능; Ultra 거절 | Ultranecrozium Z + Ultra Burst | 합체폼 정상; Ultra 일반 경로 없음 | Ultra 직접 가능; 합체폼 전용기 검증 Adapter 필요 | Ultra B / 합체폼 A, Raid 제한 |
| Zygarde | 50% / 10% / Complete / Mega 엔진 존재 | 네 폼 미리보기 | 50% / 10% 가능 | Power Construct, Mega는 Zygardite | Complete 실제 HP 조건 통과; Mega 불가 | Complete 직접 가능; Mega 표시 Adapter 필요 | 공식 비메가 A / Mega C |
| Zacian | Hero / Crowned 있음 | 구분 | Hero만 | Rusted Sword | 도구를 시험 주입하면 Crowned 정상; 게임 도구·획득 경로 없음 | Crowned 주입 가능; 아이템 상태 Adapter 필요 | B |
| Zamazenta | Hero / Crowned 있음 | 구분 | Hero만 | Rusted Shield | 시험 주입 시 정상; 게임 도구·획득 경로 없음 | Crowned 주입 가능; 아이템 상태 Adapter 필요 | B |
| Ogerpon | 기본 / 우물 / 화덕 / 주춧돌 + Tera 4폼 | 비테라 4폼 구분; Tera 별도 미리보기 없음 | 비테라 4폼 가능 | 가면 3종; 기본 벽록은 전용 지닌도구 불필요 | 폼 선택 때 해당 가면 자동 고정. 장착·제거로 바꾸는 경로 없음 | 비테라 직접 가능; 가면/Tera 상태 연결 필요 | B |
| Groudon | 기본 / Primal 있음 | 구분 | 기본만 | Red Orb | 실제 원시회귀·타입·특성·스탯 갱신, 상점 있음 | 기존 주입 재사용 가능; 실제 회귀는 아이템 Adapter | A |
| Kyogre | 기본 / Primal 있음 | 구분 | 기본만 | Blue Orb | 실제 원시회귀·특성·스탯 갱신, 상점 있음 | 위와 같음 | A |
| Rayquaza | Mega 엔진·미리보기 있음; 런타임 catalog 없음 | Mega 미리보기 있음 | 기본만 | Dragon Ascent, Mega 행동 | 화룡점정 학습 가능하나 메가 행동 차단 | 엔진 주입 성공, 화면 타입 빈 배열; 표시 Adapter 필요 | C |
| Metagross | Mega 있음 | 구분 | 기본만 | Metagrossite | 실제 메가진화·특성·스탯·화면 갱신 | 기존 Phase 재사용 가능 | A |
| Diancie | Mega 있음 | 구분 | 기본만 | Diancite | 실제 메가진화·특성·스탯·화면 갱신 | 기존 Phase 재사용 가능 | A |
| Kyurem | 기본 / Black / White 있음 | 구분 | Black / White 가능 | 직접 선택 | 정상; 유전자쐐기 불필수 | 폼 주입 가능; Fusion Bolt/Flare를 기본형으로 검증해 거절, Adapter 필요 | A, Raid 전용기 제한 |
| Hoopa | Confined / Unbound 있음 | 구분 | Unbound 가능 | 직접 선택 | 정상; 항아리 불필수 | 폼 주입 가능; Hyperspace Fury가 기본형 검증에서 거절, Adapter 필요 | A, Raid 전용기 제한 |
| Shaymin | Land / Sky 있음 | 구분 | Sky 가능 | 직접 선택 | 정상; 꽃 불필수 | 기존 Phase 재사용 가능 | A |
| Arceus | 엔진 18타입; 게임 catalog는 기본만 | 타입폼 미노출 | 기본만 | Plate + Multitype | 시험 주입 시 실제 타입 변경; 폼 외형·도구 획득 경로 미완 | 타입폼 표시·도구 Adapter 필요 | C |
| Giratina | Altered / Origin 있음 | 구분 | Origin 선택 가능, Core 자동 고정 | Gen 9 Griseous Core | Origin 선택 정상; Core 장착·해제 동기화 경로 없음 | 직접 폼 가능; 아이템 상태 Adapter 필요 | B |
| Silvally | 엔진 18타입; 게임 catalog는 기본만 | 타입폼 미노출 | 기본만 | Memory + RKS System | 시험 주입 시 실제 타입 변경; 외형·도구 경로 미완 | 타입폼 표시·도구 Adapter 필요 | C |
| Genesect | 엔진 기본 + Drive 4폼; 게임 기본만 | Drive폼 미노출 | 기본만 | Drive, Techno Blast | 엔진 기술 타입 변경 정상; 외형·게임 도구 경로 미완 | 표시·도구 Adapter 필요 | C |
| Z-A 신규 Mega 전체 | 엔진 폼ID 49개, 미리보기 데이터 49개 | 48개 노출; Floette 누락 | 모두 일반 직접 선택 불가 | Mega Stone, 허용된 배틀 룰 | Dragonite / Golisopod 2개만 게임 등록·사용 가능 | 나머지는 catalog/아이템/룰 Adapter; Golisopod 특성 검증 충돌 | 대부분 C; Dragonite A / Golisopod D |

등급은 요청의 A–E 기준을 적용했다. A는 정상 일반 플레이와 기존 시스템 재사용을 확인한 범위이며 모든 Raid 보스 등록을 뜻하지 않는다. 복합 포켓몬은 폼별 등급을 분리했다. B는 Raid에서 해당 외형·전투폼을 직접 사용할 수 있으나 일반 플레이의 도구/트리거가 불완전한 경우다. C는 엔진/미리보기 데이터는 있으나 게임 연결이 부족하다. Golisopod는 일반 메가는 정상이나 Raid 상위 검증이 실패하므로 D로 별도 표시했다.

## Mega Audit

**기존 48폼 중 메가레쿠쟈를 제외한 47폼 + Z-A의 Dragonite / Golisopod 2폼 = 게임 등록 49폼**이다. 49종 메가스톤의 아이콘·가격·대상 연결·상점 추첨 가능성을 확인했다. 전부 실제 Mega 행동으로 변신했다. 기존 회귀 테스트는 팀당 사용 제한, NPC 사용, 스탯·특성 전환, 리플레이 재현도 검증한다.

| Pokémon | Mega Form | Mega Item | Shop | Gameplay | Raid | Grade |
|---|---|---|---|---|---|---|
| 기존 47폼 | [개별 47행](INVENTORY.md#mega-audit) | 각각 대응 스톤 | 2,500 | 통과 | 기존 Phase 훅 재사용 | A |
| Rayquaza | Rayquaza-Mega | 스톤 불필요, Dragon Ascent | N/A | 메가스톤 검사에서 차단 | 전투폼 주입되나 catalog 없음 | C |
| Dragonite | Dragonite-Mega | Dragoninite | 2,500 | 통과 | 재사용 | A |
| Golisopod | Golisopod-Mega | Golisopite | 2,500 | Tough Claws 보정 포함 통과 | Native Emergency Exit만 허용하는 검증에 거절 | D |
| 나머지 신규 47폼 | [개별 47행](INVENTORY.md#mega-audit) | 엔진에 대응 스톤 있음 | 게임 미등록 | 사용할 수 없음 | 표시/룰/아이템 연결 필요 | C |

97폼 전체의 종족값 6개, 타입, 엔진 특성, 보정 미리보기 특성, 전·후면 이미지, 가격은 [Mega 상세 표](INVENTORY.md#mega-data--sprite-details), [mega.csv](mega.csv), [mega.json](mega.json)에 있다. 97은 **폼ID 수**이며 성별/색상별 표현을 별도로 센다. Crucibelle 같은 CAP 메가는 제외했다. 신규 폼의 특성은 Z-A 원작에 특성 전투가 없다는 점과 구분하여, 설치된 Showdown의 턴제 전투 정의/프로젝트 보정값으로 기록했다. 이를 원작의 공식 특성 전수 검증이라고 판단하지 않았다.

메가지가르데는 프로젝트 커스텀이라는 근거가 없다. [공식 Pokémon 도감](https://www.pokemon.com/br/pokedex/zygarde)에 메가지가르데가 있고, [공식 소개](https://www.pokemon.com/uk/news/rosas-encouragement-mega-zygarde-ex-and-more-from-mega-evolution-perfect-order)는 Z-A에서 발견된 메가진화로 명시한다. 이 프로젝트는 엔진 `Zygarde-Mega`와 `10301` 미리보기 이미지를 사용한다. `Zygardite` 게임 등록·상점·일반 플레이는 없다. 별도의 커스텀 메가지가르데 레코드는 찾지 못했다.

전투 종료 복구는 배틀 객체를 되돌리는 방식이 아니라 다음 배틀을 저장된 기본 세트로 다시 생성하는 방식이다. Metagross/Diancie/Palafin/Terapagos의 새 세션에서 이를 확인했다. 원시회귀는 저장 종이 기본형이며 구슬을 유지하면 다음 배틀 등장 시 다시 회귀하는 것이 정상이다.

## Held Item Form Audit

| Pokémon | Required Item | Form Works | Shop | Player Usable | Raid Ready |
|---|---|---|---|---|---|
| Zacian | Rusted Sword | 시험 주입 시 Crowned·강철 타입·스탯·화면 갱신 | 없음 | 정상 획득 불가 | 폼 직접 가능; 도구 연결 필요 |
| Zamazenta | Rusted Shield | 시험 주입 시 Crowned·강철 타입·스탯·화면 갱신 | 없음 | 정상 획득 불가 | 위와 같음 |
| Ogerpon | Wellspring / Hearthflame / Cornerstone Mask | 선택 폼에 가면 자동 부여, 테라 변신도 통과 | 3종 모두 없음 | 폼 선택으로 사용 가능; 가면 교환·제거 불가 | 도구 상태/Tera Adapter |
| Ogerpon 기본형 | 별도 지닌도구 불필요 | Defiant, Grass 정상 | Teal Mask 판매 불필요 | 가능 | 기본형 가능 |
| Giratina | Griseous Core | Origin 직접 선택 시 Levitate·종족값·외형 정상 | 없음 | 선택 폼에 Core 고정 | 직접 가능; 일반 장착/해제 연결 필요 |
| Dialga / Palkia | Adamant Crystal / Lustrous Globe | Origin 선택 시 자동 고정 | 없음 | 폼 선택 가능 | 직접폼/전용도구 상태 구분 필요 |
| Arceus | 17 Plates | 엔진 실제 타입 변경; 화면 타입 이벤트 반영 | 전종 없음 | 정상 획득 불가; 타입별 외형 없음 | 표시·도구 Adapter |
| Silvally | 17 Memories | 엔진 실제 타입 변경; 화면 타입 이벤트 반영 | 전종 없음 | 정상 획득 불가; 타입별 외형 없음 | 표시·도구 Adapter |
| Genesect | Burn / Chill / Douse / Shock Drive | Techno Blast 각각 Fire / Ice / Water / Electric | 4종 없음 | 정상 획득 불가; Drive 외형 없음 | 표시·도구 Adapter |

`Giratina-Origin.requiredItem`은 현재 엔진에서 **Griseous Core**다. Griseous Orb는 비교용 구세대 아이템으로 별도 기록했다. 기본 Giratina(Pressure)에 Core만 시험 주입하면 검증 단계에서 Origin으로 정규화한 뒤 특성 불일치로 거절된다. 반면 플레이어 폼 선택 경로는 Origin·Levitate·Core를 함께 패킹하므로 통과한다.

Ogerpon의 비테라 폼 스탯은 동일하고 타입·특성이 달라지는 것이 정상이다. 기본 벽록폼은 다른 지닌도구를 사용할 수 있으므로 벽록의가면을 필수 전투 지닌도구로 추가할 필요가 없다. [공식 대전 설명](https://www.pokemon.com/us/features/top-new-pokemon-for-regulation-set-e-vgc-battles)도 이 기본폼의 도구 선택 자유를 설명한다. 우물·화덕·주춧돌 3종은 요청한 상점/장착 기반 구현 기준에서 미완성이다.

장착 제거 검증 결과: 일반 등록 도구는 `setHeldItem`에서 배낭 반환 후 다음 배틀을 재생성한다. 그러나 폼 전용 6도구는 `selectedForm.requiredItem`으로 강제되어 해제가 거절된다. 녹슨검/방패·플레이트·메모리·드라이브는 장착 API의 `isHeldItem` 검사도 통과하지 못한다. 따라서 “제거하면 기본폼 복구”를 게임에서 완성했다고 볼 수 없다. 원래 전투 중 빼앗을 수 없는 전용도구와 전투 준비 화면의 폼 변경/해제는 별개다.

## Special Transformation Audit

| Pokémon | Trigger | Form | Normal Gameplay | Raid Reuse | Problem |
|---|---|---|---|---|---|
| Palafin | Zero to Hero, 교체 후 복귀 | Hero | p1/p2 모두 실제 통과, 공격 70→160 | Hero 직접 주입 성공 | 일반 생성 Hero 선택은 의도적으로 거절 |
| Terapagos | 등장 Tera Shift | Terastal | p1/p2 통과, Tera Shell·스탯 갱신 | 직접 주입 가능 | 기본형을 Phase에 놓아도 등장 특성이 바로 Terastal로 변경 |
| Terapagos | Terastallization | Stellar | p1/p2 통과; 기다리기만 하면 Terastal 유지 | **상태 Adapter 필수** | Phase의 species만 Stellar면 tera 상태 없이 등장 가능 |
| Necrozma | Ultranecrozium Z + Ultra Burst | Ultra | 도구·행동 연결 없어 실패 | 직접 Ultra Phase 진입 성공 | 엔진 canUltraBurst는 true지만 legalActions가 ultra를 생성하지 않음 |
| Zygarde / 10% | Power Construct + HP ≤ 절반 | Complete | p1/p2, 양 폼 모두 실제 통과 | Complete 직접 진입 성공 | Mega와 별개로 판정해야 함 |
| Groudon / Kyogre | Red Orb / Blue Orb, 등장 | Primal | 실제 통과; mega/chaos 룰 제한 통과 | 직접폼 가능; 실제 회귀는 Adapter | Phase 전용 아이템 필드 없음 |
| Rayquaza | Dragon Ascent + Mega | Mega | 화룡점정은 학습 가능, Mega 행동 없음 | 표시 Adapter | 스톤 없는 정식 예외가 차단됨 |
| Darmanitan / Wishiwashi / Aegislash / Meloetta / Eiscue 등 | 엔진 특성·기술·HP 조건 | 각 전투폼 | 설치 엔진에 트리거 존재; 이번 전투 집중 검증 대상 외는 엔진 데이터/기존 검사 수준 | 일부 등장 특성에 의해 지정폼이 변경됨 | 일반 폼 교체로 일괄 처리하면 안 됨 |

테라파고스 스텔라의 종족 타입은 Normal이고 `terastallized='Stellar'`가 별도 상태다. 공격의 Stellar 보정과 방어 타입을 혼동하면 안 된다. 정상 세션은 `Terapagos-Terastal → move … terastallize → Terapagos-Stellar`, 특성은 `Tera Shell → Teraform Zero`로 바뀐다. `Tera Starstorm`의 ModifyType 및 실제 데미지 계산도 별도 프로브에 기록했다. `Tera Orb`는 가격 5,000의 트레이너 장비이며 현재 플레이에서는 옛 테라권 판매가 종료되어 있다.

Ultra는 합체 2폼에서만 엔진 `canUltraBurst`가 생긴다. 기본 Necrozma에는 생기지 않는다. 엔진 명령 `move … ultra`를 직접 실행한 시험은 Ultra로 정상 변신했지만, 이는 게임 사용 가능 판정이 아니다. 게임에는 `Ultranecrozium Z`가 등록되지 않았고 `Request`/`legalActions`/NPC 행동 경로도 해당 명령을 생성하지 않는다. Photon Geyser 같은 필요 기술은 학습/표시 데이터가 있다.

## Shop Audit

전수 결과는 [Shop Audit 144행](INVENTORY.md#shop-audit), [아이템 ID·표시명·아이콘 표](INVENTORY.md#item-ids--labels--icons), [shop.csv](shop.csv)에 있다. 표에 있는 가격은 정가다. 실제 상점은 룰, 현재 로스터의 대상 적합성, 이미 보유한 상품, 층 조건에 따라 걸러지고 할인은 별도 적용된다.

| Item | Target | Exists | Functional | Shop | Price | Problem |
|---|---|---|---|---|---|---|
| 등록 Mega Stone 49종 | 각 지정 종 | 게임 있음 | 실제 Mega 행동 통과 | 있음, 5층 클리어 이후 적격 | 2,500 | Golisopod는 Raid 특성 검증 별도 문제 |
| 미등록 신규 Mega Stone 43종 | 신규 폼 47개에 대응 | 엔진만 | 게임 경로 없음 | 없음 | — | 성별·색상 변형은 스톤을 공유하여 폼 수와 다름 |
| Red Orb / Blue Orb | Groudon / Kyogre | 게임 있음 | 실제 회귀 통과 | 있음 | 각각 5,000 | 정상 |
| Rusted Sword / Shield | Zacian / Zamazenta | 엔진만 | 시험 주입 통과 | 없음 | — | 등록·획득·아이콘 연결 필요 |
| Mask 3종 | Ogerpon | 엔진 및 고정폼 경로 | 폼 선택으로 사용 | 없음 | — | 상점 도구는 아니며 해제 불가 |
| Griseous Core | Giratina | 엔진 및 고정폼 경로 | Origin 직접 선택으로 사용 | 없음 | — | 일반 장착 동기화 없음 |
| Plates 17종 | Arceus | 엔진만 | 타입/심판 타입 엔진 처리 | 없음 | — | 전종 게임 등록 누락 |
| Memories 17종 | Silvally | 엔진만 | 타입/멀티어택 엔진 처리 | 없음 | — | 전종 게임 등록 누락 |
| Drives 4종 | Genesect | 엔진만 | Techno Blast 타입 실제 검사 | 없음 | — | 전종 게임 등록 누락 |
| Ultranecrozium Z | 합체 Necrozma | 엔진만 | 엔진 Ultra Burst 가능 | 없음 | — | 게임 도구·전환 행동 없음 |
| Tera Orb | 트레이너 | 게임 있음 | Stellar 변신에 실제 사용 | 있음 | 5,000 | 정상 |

144행 중 상점에 없는 것은 92행이다. 이 숫자에는 필수가 아닌 **Griseous Orb와 비지닌도구 Teal Mask** 2행이 포함된다. 따라서 이 검사 기준의 필수 상품 미등록은 **90종**이다. 이 중 6종은 선택폼 자동 고정 도구로는 사용 가능하다. 등록된 필수 상품 52종(스톤 49, 구슬 2, 오브 1)의 아이콘은 모두 실제 경로에 있고 정규화 ID 중복은 없었다. 미등록 항목은 게임 표시명·가격 자체가 없으므로 엔진 존재만으로 판매 완료/오타 없음 판정하지 않았다.

항아리·유전자쐐기·비추는거울·그라시데아꽃·네크로즈마 합체/분리 도구는 요청대로 상점 결함에 포함하지 않았다. 해당 TYPE A 폼은 직접 선택 경로를 검사했다.

## 전체 폼 및 희귀종 데이터

전국도감 원본은 1–1025번을 갖고 있다. `pokemonSets`는 648개 세트, 실제 컬렉션 도감은 615개 행이다. 전체 미리보기와 내부 전투 세트는 컬렉션 정책에 의해 제외되는 진화 전 포켓몬도 포함할 수 있어 숫자가 같지 않다.

복수폼 **241개 family / 682개 엔진·외형 레코드**를 A/B/C로 개별 분류했다. 기본폼, Mega, Gmax, 지역폼, 성별폼, 의상, 색상, Totem, 특성 전용 엔진 표현까지 포함한 레코드 수다. 알크리미 사탕 장식 조합처럼 엔진 종ID로 표현하지 않는 세부 장식은 이 숫자에 포함하지 않으며, 공식 외형 조합 전체 지원을 주장하지 않는다. 전수 [TYPE A/B/C 표](INVENTORY.md#type-a--b--c-전수-분류)와 [forms.csv](forms.csv)에서 게임 ID·도감·직접 생성·런타임 catalog를 구분했다.

게임의 선택 가능 폼은 62개이며 별도 컬렉션 36개, family 선택 26개다. Hoopa-Unbound, Shaymin-Sky, Kyurem-Black/White, 4영물폼, Deoxys 3폼, Calyrex 2기승폼, Necrozma 합체 2폼, Urshifu 연격 등을 포함한다. 이들 26 family 폼의 실제 배틀·저장·기술·특성·폼별 설정은 기존 테스트 전체가 통과했다. 등록 폼의 저장 종족값/타입을 엔진과 비교했을 때 불일치 0건, 선택 폼 ID 중복 0건, 컬렉션 도감 종 중복 0건이었다.

미지원 일반 폼 예시는 Wormadam-Sandy/Trash, Meowstic-F, Indeedee-F, Basculegion-F, Oinkologne-F, Toxtricity-Low-Key, Lycanroc-Midnight/Dusk, Oricorio 3폼, Gourgeist 크기폼, Basculin 색상폼, Tatsugiri 색상폼 등이다. 데이터 차이가 있는 성별폼과 단순 외형폼은 같은 결함으로 취급하지 않았다. 없는 폼마다 전체 데이터·도감·선택 여부를 전수표에서 확인할 수 있다. 진화 전 지역폼과 Totem은 현재 컬렉션 범위 차이를 먼저 고려해야 한다.

희귀종은 **준전설 44 / 제한 전설 27 / 환상 23 / UB 11 / 패러독스 20 = 125종**이다. [희귀종 전체 표](INVENTORY.md#전설준전설환상ub패러독스-전체), [rare.csv](rare.csv), [rareBattles.json](rareBattles.json) 참조. 121종의 내부 생성 및 양측 배틀 242회를 확인했다. Cosmog / Cosmoem / Poipole / Kubfu 4종은 엔진·전국도감 원본은 있으나 플레이 세트가 없고, 진화 전 컬렉션 정책으로 도감도 제외된다. Type: Null은 내부 세트는 있으나 도감에서 제외된다. 이를 엔진 미구현과 구별했다.

Gouging Fire / Raging Bolt / Iron Boulder / Iron Crown 4종은 데이터·전용기·배틀은 정상이나 설치 엔진 `tags=[]`, `rareEggSpeciesCategory=null`이다. 패러독스 알 분류가 누락된다. 엔진 태그만으로 희귀종 전수 목록을 만들면 이 네 종이 빠지므로 독립 목록으로 보완했다. 이번 Audit에서는 UB/사흉수 Raid Phase를 설계하지 않았다.

기술은 전체 폼의 등록 legalMoves와 메타데이터 유무를 저장했고, 우선 대상의 전용기 26개를 별도 확인하여 누락 0건이었다([signatures.json](signatures.json)). 전용기라고 항상 기본형도 배울 수 있는 것은 아니며, Raid 기본형 검증 문제는 아래에 별도로 기록했다.

## 도감 / 스프라이트 / UI

도감과 runtime catalog는 다른 데이터 소스를 사용한다. `mega-preview-forms.json`의 97폼이 도감 렌더링에 쓰이는 반면, 전투화면 catalog는 `mega-forms.json`의 49폼만 등록한다. 따라서 메가레쿠쟈·메가지가르데·나머지 신규 메가가 도감에서 보인다고 전투 스프라이트까지 연결됐다고 할 수 없다. 실제 Raid 세션의 Rayquaza-Mega / Zygarde-Mega는 전투 species가 바뀌었어도 전달 타입이 `[]`였다.

Floette-Mega는 미리보기 원본에는 있지만 컬렉션 필터가 Floette를 제외하여 도감에서 노출되지 않는다. Arceus 17타입 / Silvally 17타입 / Genesect 4드라이브는 엔진에는 있지만 개별 도감 폼·catalog·선택 UI가 없다. Ogerpon Tera 4폼, Darmanitan-Galar-Zen, Mimikyu-Busted, Morpeko-Hangry 같은 전투폼도 catalog가 있다고 모두 도감 폼 목록에 노출되지는 않는다.

도감에 노출된 폼은 실제 이미지 resolver의 전·후면 경로 중 최소 한 파일이 모두 존재했다. 정면/후면/이로치/애니메이션 후보 경로와 기본형 이미지와의 해시 일치 여부는 각 JSON에 저장했다. 다만 파일 존재는 올바른 그림이라는 시각 검증과 같지 않다. 메가지가르데는 `10301` 공식 아트워크 fallback으로 미리보기를 제공한다. 신규 메가 일부도 픽셀/후면 애니메이션 대신 아트워크 fallback을 쓰므로 전투용 전후면 픽셀 완성으로 보지 않았다. Ogerpon Tera는 비테라 sprite ID를 의도적으로 재사용하여 전용 외형이 구분되지 않는다. Minior-Meteor의 기본형 이미지와 해시 일치는 native 기본 sprite가 유성형인 구조이므로 단독 결함 판정하지 않았다.

Palafin/Terapagos/Metagross/Diancie/Primal의 실제 `BattleView`에서 species/displaySpecies, 능력치, 특성, 타입 이벤트 갱신을 확인했다. 전체 682폼을 브라우저에서 육안 검수하거나 모든 공식 원작 이미지와 대조한 것은 아니다. 그 범위는 미검증으로 남겼으며, 데이터 정합 검사 통과를 시각 QA 완료로 표시하지 않았다.

## Raid 재사용 가능성

| System | 분류 | 확인한 재사용 경로 | 필요한 조건 / 제한 |
|---|---|---|---|
| 일반 Form 교체 | 직접 재사용 + 전용기 Adapter | `installRaid → setSpecies → baseSpecies/ability/HP 재설정` | 기본형의 검증을 통과하지 못하는 폼 전용기 해결 필요 |
| Mega Evolution | 등록된 폼 직접 재사용 | 현재 Garchomp/Mewtwo Phase 방식 | 실제 진화 트리거 재사용은 행동/리소스 Adapter; 미등록 메가는 catalog 추가 필요 |
| Primal Reversion | Adapter 필요 | 직접 Primal 주입은 동작 | 실제 구슬 발동/아이템/룰 상태 연결 필요 |
| Held Item Form | Adapter 필요 | Crowned/가면/Origin 직접 주입 | Phase에 item 필드가 없어 필수 도구 상태가 보존되지 않음 |
| Ability Form | 일부 직접 재사용 | Hero 직접 진입 성공 | 등장 특성이 조건을 재평가하므로 지속 검증 필요 |
| Power Construct | 직접 재사용 가능 | Complete 직접 진입 성공 | 자연 변신을 원하면 HP·특성 트리거 사용; Phase 강제 지정과 구분 |
| Terastallization | Adapter 필요 | 일반 엔진 Tera 함수와 화면 이벤트 존재 | Stellar는 Terastal에 **테라 상태 적용 → 폼 전환**; species만 지정하면 불완전 |
| Ultra Burst | Adapter 필요 | Ultra 직접 Phase 진입은 가능 | 실제 트리거는 도구·ultra 행동·리소스 연결 필요 |
| Dynamax | Adapter 필요 | 일반 엔진 Dynamax/3턴/HP 배율 존재 | Gmax species 주입만으로 3턴 상태·HP 배율·Max Moves가 만들어지지 않음 |

462개 매핑/미리보기 레코드에 기존 Phase 훅을 붙인 엔진 진입 프로브를 수행했다. 455개는 지정 species가 등장 후에도 유지되었고, 7개는 조건 특성에 의해 즉시 변경되었다: Castform 날씨 3폼, Cherrim-Sunshine, Wishiwashi 기본형, Minior 코어, Terapagos 기본형. 이는 상태 조건의 정상 재평가일 수 있으므로 단순 성공/실패 대신 Adapter 필요 여부로 해석했다. 이 저수준 검사는 상위 서버 검증·필수 아이템·테라/다이맥스 상태까지 통과했다는 뜻이 아니다.

추가로 우선 폼 19개를 **실제 runBattle/BattleSession의 2 Phase 입력**으로 검사했다([raidSessions.json](raidSessions.json)). 여기서 다음 결함을 재현했다.

1. `Terapagos-Stellar`는 테라스탈 이벤트·상태 없이도 species만 주입된다. 일반 플레이는 정상이나 Raid에서는 조건을 지키는 Adapter가 없다.
2. `Necrozma-Dusk-Mane/Dawn-Wings`, `Kyurem-Black/White`, `Hoopa-Unbound`의 기본 법정 기술배치를 Phase에 사용하면 기본종으로 먼저 검증되어 Sunsteel Strike / Moongeist Beam / Fusion Bolt / Fusion Flare / Hyperspace Fury를 거절한다.
3. `Golisopod-Mega + Tough Claws`는 `runBattle`의 공유 Dex 특성 검증이 local battle 보정보다 먼저 실행되어 거절된다.
4. 2 Phase Raid는 `installTowerGimmicks`의 양측 정확히 3마리 조건을 충족하지 않아 플레이어 쪽 기믹 제한 훅이 설치되지 않는다. 추가 비교 시험에서 **basic 룰 + 장비 없음**인데도 2 Phase에는 terastallize 행동이 노출되고, 같은 입력의 3 Phase에는 노출되지 않음을 재현했다([raidRuleProbes.json](raidRuleProbes.json)). 룰·장비·팀별 사용 제한을 그대로 믿고 재사용할 수 없다.

현재 조사한 시스템은 대부분 기존 엔진과 작은 Adapter로 연결할 수 있다. 전면 Raid 전용 전투 엔진이나 폼 시스템 리팩터링이 필수라는 근거는 발견하지 못했다. 현재 Phase의 매 슬롯 새 HP/상태/PP 구조를 연속 개체처럼 취급할 때의 의미는 별도 설계 문제이며 이번에 변경하지 않았다.

## Missing / Broken

모든 경로는 저장소 루트 기준이다. 문제별 추천은 후속 작업 제안이며 이번에 구현하지 않았다.

| ID | 파일 / 클래스·함수 | 데이터 ID | 문제 / 영향 | 추천 수정 |
|---|---|---|---|---|
| F01 | `src/data/held-items.ts`, `TowerStore.equipItem`, `src/data/held-item-shop.ts` | Rusted Sword/Shield, Plates 17, Memories 17, Drives 4, Ultranecrozium Z | 엔진에만 존재; 정상 획득·장착 API·상점·표시명 없음 | 게임 아이템 등록, 대상/효과/아이콘·가격·획득 경로 연결 후 실사용 회귀 |
| F02 | `src/data/teams.ts:trainedSet/packTeam`, `src/server/tower-store.ts:heldItems/setHeldItem` | Ogerpon 3가면, Griseous Core, Adamant Crystal, Lustrous Globe | 폼을 먼저 선택하여 도구를 고정. 장착→폼/해제→기본 복구 모델이 없음. shop 미등록 | 폼 선택과 도구 결합 정책을 명확히 하고 요구된 장착/해제 동기화 추가 |
| F03 | `src/battle/policy.ts:Request/legalActions`, `src/data/z-crystals.json`, NPC 정책 | Necrozma-Ultra, Ultranecrozium Z | canUltraBurst를 무시해 플레이어·NPC Ultra 행동 없음 | 엔진 `ultra` 요청 전달, 도구·조건·사용권·리플레이/UI 연결 |
| F04 | `src/battle/gimmicks.ts:installTowerGimmicks`, 63행 | Rayquaza-Mega, Dragon Ascent | 스톤 미등록이면 canMegaEvo 제거; 정식 무스톤 예외 차단 | Dragon Ascent/비Z도구 조건의 Rayquaza 예외를 메가 사용권과 함께 허용 |
| F05 | `src/data/mega-items.json`, `mega-forms.json`, `battle-rules.ts`, `pokemon-catalog.ts` | 신규 Mega 47폼 / 미등록 스톤 43종, Zygarde-Mega 포함 | preview와 플레이 대상 불일치, 전투화면 타입/스프라이트 누락 | 공식/엔진 데이터 기준을 정하고 폼·스톤·룰·catalog를 함께 연결 |
| F06 | `src/data/pokemon-catalog.ts`, `src/server/pokedex-entries.ts:formPreviews` | Arceus-*, Silvally-*, Genesect-* | 타입/Drive 폼 개별 표시·스프라이트·선택 경로 없음 | 전투 타입 변경과 외형 표시를 결합하고 타입/Drive 폼 미리보기 등록 |
| F07 | `src/battle/raid.ts:installRaid`, `src/data/raids.ts:RaidPhaseDefinition` | Terapagos-Stellar / Ogerpon-*-Tera / *-Gmax | species 주입만으로 기믹 상태가 생성되지 않음 | 상태 적용 → 엔진 변신 트리거를 호출하는 Phase Adapter, 상태/표시 이벤트 회귀 |
| F08 | `src/server/raid-events.ts:createRaidSnapshot`, `src/battle/run.ts:runBattle` | 합체 Necrozma, Kyurem Black/White, Hoopa Unbound | Phase 기술을 기본 species로 검증해 정상 전용기 거절 | Phase별 폼/기술 적법성을 검증하고 기본 슬롯 검증과 분리하는 Adapter |
| F09 | `src/battle/run.ts` 66–71행, `src/battle/golisopod-mega.ts:installGolisopodMega` | Golisopod-Mega / Tough Claws | 일반 메가 보정은 정상이나 Raid phase ability 검증 실패 | 버전이 고정된 보정 Dex/공유 능력 검증을 같은 기준으로 사용 |
| F10 | `src/battle/gimmicks.ts:installTowerGimmicks` 26행 | 2 Phase Raid | 양측 pokemon.length===3 조건 때문에 기믹 훅 전체 설치 누락 | 적격 사이드와 팀 크기 검사를 분리하고 2/3 Phase 양쪽 룰·장비 회귀 |
| F11 | `src/server/egg-pool.ts:rareEggSpeciesCategory`, `src/server/opponent-team.ts:normalOpponentSpecies`, 설치 엔진 tags | Gouging Fire, Raging Bolt, Iron Boulder, Iron Crown | 패러독스 태그 누락, 알 분류 null. 정상 NPC 희귀도 필터에도 같은 태그 의존 경로가 있음 | 공식 분류 테이블 보완 또는 엔진 업데이트 후 알/NPC 분류 검증 |
| F12 | `src/data/pokedex-roster.ts:isCollectibleSpecies`, `src/server/pokedex-entries.ts:formPreviews` | Floette-Mega, Type: Null, 진화 전 희귀종 4종 | 범위 정책으로 도감 누락. Floette-Mega는 신규 메가 도감 전수 기준 미달 | 도감 정보 열람과 소유/출전 정책을 구분할지 결정 후 예외 추가 |
| F13 | `src/data/selectable-forms.json`, `battle-preview-forms.ts`, `pokemon-catalog.ts` | 전수표의 missing 폼들, Ogerpon Tera 4폼 | 다양한 성별/크기/타입/의상/전투폼이 미연결; Tera 가면은 기본폼 sprite 재사용 | 전투 데이터 차이가 있는 폼부터 연결. 장식폼은 지원 범위를 명시 |

## 검증 방법 / 한계 / 재현

새 도구 [scripts/audit-forms-items.ts](../../../scripts/audit-forms-items.ts)는 **보고서만 작성**한다. DB 검사는 기존 테스트의 격리된 테스트 저장소와 메모리 fixture만 사용하며 운영 저장 데이터를 고치지 않는다.

```powershell
node node_modules/tsx/dist/cli.mjs scripts/audit-forms-items.ts
node node_modules/typescript/bin/tsc --noEmit
node node_modules/tsx/dist/cli.mjs --test tests/selectable-forms.test.ts tests/form-equipment.test.ts tests/form-preview.test.ts tests/form-display-consistency.test.ts tests/form-moves.test.ts tests/bloodmoon-mega-abilities.test.ts tests/gimmicks.test.ts tests/primal-player.test.ts tests/tera.test.ts tests/raid-phases.test.ts tests/held-item-shop.test.ts tests/pokedex-entries.test.ts
```

기존 검증은 47/47 통과했고 TypeScript 검사도 통과했다. 프로젝트 tsconfig가 scripts를 제외하므로 새 Audit 스크립트도 별도 strict 타입 검사를 실행하여 통과했다([validation.json](validation.json)). Audit은 121종 기본형의 양측 배틀 242회, Mega 97폼 사용 가능 여부 프로브, 저수준 Phase 진입 462건, 상위 Raid 세션 19폼, 우선 8종 일반 세션 및 재생성, 플레이트 17·메모리 17·드라이브 4종 등의 도구 프로브를 기록한다. 기존 테스트 중 일부는 특정 폼이 선택 불가능함을 기대하므로 테스트 전체 성공이 모든 기능 완성을 뜻하지 않는다.

데이터 기준은 설치된 `pokemon-showdown@0.11.11`과 프로젝트의 PokeAPI 유래 데이터다. 신규 Mega와 공식/커스텀 구분은 [공식 Z-A 사이트](https://legends.pokemon.com/en-us/dlc)와 공식 도감으로 보조 확인했다. 새 특성 차이는 프로젝트가 참조하는 [상류 고정 커밋](https://github.com/smogon/pokemon-showdown/blob/490b7fb8c2e5e548df9b752f93a589a2a42ce398/data/pokedex.ts)과 `mega-abilities.ts`의 4건을 기록했다. 최신 공식 게임 전체의 기술 습득표·엔진에 없는 장식 조합·모든 이미지 육안 비교까지 독립적으로 전수 검증했다는 뜻은 아니다. 엔진의 모든 legalMoves를 원작과 개별 대조하지는 않았다.

### 질문1: 원하는 Form을 처음부터 NPC/Raid에 설정할 수 있는가

**선택 가능한 family 26폼은 일반 NPC용 패킹에서 직접 지정할 수 있다.** 특수폼은 일반 profile 경로에서는 거절되지만 기존 Raid의 species 주입은 Hero/Complete/Ultra/Crowned 등에서 실제로 동작한다. 다만 폼 전용기, 필수 도구, 표시 catalog, Stellar/Tera/Dynamax 상태에는 위 Adapter가 필요하므로 모든 폼이 그대로 Raid Ready인 것은 아니다.

### 질문2: 공식적인 핵심 조건으로 일반 플레이어가 변신할 수 있는가

**Palafin, Terapagos, Power Construct, 원시회귀, 등록 Mega 49종은 확인 범위에서 동작한다. Ultra Necrozma, Rayquaza Mega, 미등록 신규 Mega, Crowned의 정상 획득, Arceus/Silvally/Genesect의 도구 경로는 완성되지 않았다.** Ogerpon과 Giratina Origin은 폼 선택 + 도구 자동 고정 방식이면 동작하지만 요구된 장착/해제 모델과 상점은 미완성이다.
