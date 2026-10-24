# 기술 이펙트·배경·필드 연출 개선 구상

2026-10-24 실제 화면 검토: **Pixel Art Spells는 주력 배틀 VFX로 미채택**했다. 기존 프로젝트/Showdown VFX → 기존 자산의 간단한 색·크기·회전·속도·투명도 변형 → 코드 연출 → 그래도 부족한 역할만 외부 조사 순서를 따른다. [기존 VFX 전수 조사·역할별 후보·스타일 비교](../engineering/MOVE_EFFECTS.md#existing-vfx-inventory--projectile-재검토)를 우선한다. 이번 재검토에서 전체 기술 매핑이나 전용기/Impact/Beam/Stream을 새로 구현하지 않는다. 모바일은 이번 작업 범위에서 제외한다.

2026-10-24 업데이트: 등록 934개 전체의 공용 연출 설계를 데이터화하고 랭크 효과 중복·플로팅 텍스트를 정리했다. [전체 매핑](#전체-기술-연출-매핑), [공용 VFX 역산 목록](#역산한-공용-vfx-요구-목록), [구현 구조와 규칙](../engineering/MOVE_EFFECTS.md)을 따른다. 새 그래픽·오디오 에셋은 추가하지 않았다. 아래 기존 구상은 2026-10-18 작성한 후속 품질 보강 후보로 보존하며, 미구현 후보를 현재 완료 기능으로 취급하지 않는다.

일반 기술은 공용 효과 계열을 우선하고, 대표 전용기·Z기술·특수 기믹·보스만 선택적으로 전용 연출을 검토한다. 아래 시안·자산 후보는 확정 제작 목록이 아니다. [ROADMAP](../current/ROADMAP.md)의 조작→비주얼/연출→사운드→장기 플레이/QA 순서를 따른다. 기존 화염방사 프로토타입 (로컬 전용: `artifacts/reports/changes/FLAMETHROWER_PROTOTYPE.md`)은 구현 범위와 후속 품질 검토를 구분한다.

## 문제와 목표

현재 기술 이펙트는 기본적인 표현은 갖췄지만, 사용자 체감으로는 아직 초급 수준이고 같은 타입의 기술들이 거의 같은 모습으로 보인다. 특히 불꽃 타입은 기술마다 다른 개성과 타격감을 더 살릴 필요가 있다.

코드에 기술별 분기가 전혀 없는 것은 아니다. 현재 `src/web/move-animation-plan.ts`에는 화염방사·열풍이 `flame`, 불대문자·오버히트가 `fireblast`를 공유하고, 불꽃펀치·불꽃엄니·도깨비불에는 별도 구성이 있다. 등록되지 않은 기술은 타입과 물리/특수/변화 분류에 따른 공용 연출을 사용한다. 색상이나 입자 개수만 달리하면 같은 기술처럼 느껴지는 문제가 남는다.

목표는 일반 기술의 동작 계열이 구분되고, 대표 기술과 전용기는 개성이 드러나게 만드는 것이다. 모든 기술을 이름 없이 식별할 정도로 독창적으로 만드는 것은 목표로 두지 않는다. 원작에서 기술마다 연출이 다른 점을 참고하되, 아래 구상을 특정 세대의 원작 연출을 재현한 사양으로 취급하지 않는다. 원작 참고 세대와 재현 수준은 추후 결정한다.

## 제작 방향: 공용 템플릿 기반에 선택적으로 전용 연출

기본적인 기술은 재사용 가능한 공용 연출로 커버하고, 대표 기술·포켓몬 전용기·Z기술 등에 선택적으로 제작 시간을 더 쓰는 방향을 우선 검토한다. 공통 계열 보강은 1차 완성 계획이며, 개별 제작 착수와 자산 채택은 비교 후 정한다.

| 구분 | 제작 방향 | 후보 예시 |
|---|---|---|
| 일반 기술 | 동작 계열에 맞는 공용 템플릿과 파라미터 | 불꽃세례·물대포·몸통박치기 |
| 자주 보이는 대표 기술 | 공용 템플릿을 바탕으로 형태·타격감·자산을 보강 | 화염방사·10만볼트·냉동빔·섀도볼 |
| 시그니처·포켓몬 전용기 | 그 기술을 알아볼 수 있는 고유 동작이나 형태를 추가 | 전설·환상 및 스타팅 등의 상징적인 기술 |
| 기믹 필살기 | 공통 발동 단계와 기술별 공격 연출을 조합 | Z기술·맥스기술, 필요할 경우 테라 관련 특수 기술 |

기존 `move-animation-plan.ts`에도 빔·구체·파동·베기·펀치·물기·지면 효과 등 공용 구성이 있다. 새 엔진을 처음부터 만드는 것보다 기존 구성을 정리해 재사용성을 높이는 방식부터 검토한다. 향후 기술 데이터에는 템플릿 이름, 효과 자산, 길이·폭·크기, 준비·도달·유지·소멸 시간, 타격·불씨 등의 옵션을 지정하는 방향을 구상한다. `speed` 하나로 재생 시간과 이동 속도를 함께 표현하기보다 각각의 의미가 분명한 설정을 사용한다.

빔·투사체·폭발·파동·접촉·물기·상태·능력 변화 등의 계열을 출발점으로 삼되, 공용 템플릿 15~20개와 전용 연출 30~50개 같은 숫자는 확정 작업량이 아니다. 먼저 필요한 소수의 템플릿을 개선하고, 기존 것으로 표현하기 어려운 기술이 나올 때 추가한다. 타입마다 같은 엔진을 따로 만들지 않고, 동작을 공유하면서 타입에 맞는 자산과 색·질감을 선택한다.

이미지도 기술마다 한 장씩 제작하는 대신 불꽃 줄기·구체·폭발·불씨·타격·연기처럼 조합할 수 있는 조각을 재사용한다. 타입당 5~10개라는 수량을 먼저 채우지 않고 현재 자산과 사용자 제공 PNG를 우선 활용하며, 부족한 조각만 추가 제작 후보로 둔다.

Z기술은 준비 → 화면 분위기 변화 → 공격 → 타격 → 마무리 구성을 검토한다. 현재 `battle-presentation.ts`에 있는 `z-charge`·`z-release` 단계를 출발점으로 삼고, 새 재생 파이프라인이 반드시 필요하다고 가정하지 않는다. 타입별 범용 Z기술은 공통 준비와 타입별 필살기 템플릿을 공유하고, 포켓몬 전용 Z기술은 고유 연출 우선 후보로 둔다. 맥스기술도 타입별 공통 구성을 활용하고, 개성이 필요한 거다이맥스 기술 등을 별도로 검토한다. 실제 지원 범위·자주 쓰이는 기술을 확인한 뒤 우선순위를 정한다.

후속 작업의 출발점은 불꽃 기술을 연속 화염·작은 투사체·폭발·광역 파동·차지 방출·접촉·물기·부유 상태 효과로 분류하는 것이다. 분류 초안은 한꺼번에 만들 수 있지만 기술명과 타입만으로 확정하지 않고 물리/특수/변화, 대상, 연속 타격, 기술 고유 동작을 함께 확인한다. 같은 템플릿을 쓴 기술들을 비교 화면에서 검토하고, 공용 표현이 충분한 기술과 전용 보강이 필요한 기술을 나눈다.

전용 보강 후보는 Z기술·맥스기술 같은 필살기, 전설·환상 전용기, 스타팅·인기 포켓몬의 상징적인 기술, 자주 보는 대표 기술, 관장·보스의 상징적인 기술이다. 실제 노출 빈도와 개선 효과를 함께 고려해 작업 순서를 조정한다. 전용 연출도 기존 HP·빗나감·무효·스킵·종료 처리와 연결되는 같은 재생 구조를 사용한다.

## 불꽃 타입의 공용 이미지 구성 초안

2026-10-14 자산 목록 확인 기준. 우선 핵심 형태 4종으로 분사·투사체·폭발·광역 계열을 커버하는 구상을 둔다. 이미지 제작이나 추가 구현은 진행하지 않는다.

| 조각 | 용도 | 현재 상태와 제작 우선순위 |
|---|---|---|
| 불꽃 줄기 | 화염방사 등 길게 분사하는 효과 | 소유자가 직접 제작한 project-original `public/sprites/effects/flamethrower-beam.png`를 우선 재사용한다(2026-10-23 제작 확인). |
| 불꽃 구체 | 작은 불씨 발사, 구체 발사, 차지, 접촉 지점의 불꽃 | 기존 `public/vendor/showdown/fx/fireball.png`로 시작한다. 작은 불씨는 축소하거나 코드로 그릴 수 있다. |
| 불꽃 폭발 | 상대 위치에서 퍼지는 타격, 차지 뒤 방출 | 신규 `fire-burst.png` 후보. 중심에서 바깥으로 터지는 독립적인 형태를 먼저 제작할 후보로 둔다. |
| 넓은 화염 파동 | 열풍 등 넓게 밀려오는 효과 | 신규 `fire-wave.png` 후보. 분사 PNG를 단순히 넓히는 시안을 먼저 비교하고, 만족스럽지 않으면 넓은 초승달·부채꼴 불꽃 형태를 추가한다. |

지금 새로 만드는 우선 후보는 폭발 1장이고, 다음 후보는 광역 파동 1장이다. 필요 수량을 먼저 채우지 않는다. 불씨 전용 `ember.png`와 연기 `smoke.png`는 선택적인 품질 보강 자산이다. 기존 불꽃 줄기에는 이미 불씨·끝부분 연기가 포함돼 있어 프로토타입에서는 그대로 쓰되, 추후 분사·타격·잔상을 따로 제어하고 싶을 때 분리 자산을 검토한다.

기존 `bluefireball.png`는 도깨비불 계열의 초기 자산 후보, `fist.png`·`topbite.png`·`bottombite.png`·`impact.png`·`hitmarker.png`는 펀치·물기·타격 조합에 재사용할 수 있다. 전용 불꽃 주먹이나 불꽃 이빨 이미지를 필수로 만들지 않는다. 회전·소용돌이 계열은 구체나 불씨의 원형 궤적부터 시험한다. 불대문자의 고유 문양과 Z기술 전용 자산은 일반 기술용 기본 묶음에서 제외하고 별도로 검토한다.

추후 신규 자산 제작 시에는 투명 배경, 현재 화면과 어울리는 픽셀 질감과 색상, 다른 조각과 섞을 수 있는 독립된 효과 형태를 기준으로 한다. 파동·줄기는 방향과 발사점을 명확히 하고 폭발은 중심을 맞춘다. 정지 PNG의 확대·회전·투명도로 먼저 검토하되, 내부 불꽃의 움직임이 부족하면 선택한 자산만 짧은 프레임 시트로 보강한다.

## 연출을 구분하는 기준

- **형태:** 불꽃 줄기, 큰 폭발, 넓은 열기, 작은 불씨, 주먹·이빨에 붙은 불꽃을 구분한다.
- **진행 방식:** 시전자에서 발사되는지, 상대 주변에서 터지는지, 화면을 넓게 덮는지 구분한다.
- **리듬:** 준비 → 발사/접촉 → 타격 → 잔상의 구성을 기술에 맞춘다. 모든 기술의 타이밍을 똑같이 맞추지 않는다.
- **타격감:** 포켓몬 움직임, 피격 순간의 밝기·충격, 연기·불씨의 잔상을 함께 설계한다. 화면 흔들림이나 번쩍임을 늘리는 것만으로 품질을 높이려 하지 않는다.
- **화면과의 일관성:** 현재 도트 포켓몬과 어울리는 질감·해상도·색상 범위를 유지한다. 효과음과 타격 시점의 동기화도 후속 검토한다.

## 불꽃 타입부터 비교할 후보

아래는 개선 방향을 비교하기 위한 창작 연출 구상이다. 실제 채용 빈도와 현재 지원 기술 목록을 확인한 뒤 작업 대상을 정한다.

| 기술 | 구분할 핵심 | 연출 구상 |
|---|---|---|
| 불꽃세례 | 작고 가벼운 불씨 | 작은 불씨 몇 개가 날아가고 짧게 흩어진다. 화염방사의 축소판처럼 보이지 않게 한다. |
| 화염방사 | 이어지는 불꽃 줄기 | 발사 시작부터 끝까지 연결된 불꽃 흐름을 만들고, 상대 위치에서 불씨와 연기가 퍼진다. |
| 불대문자 | 알아볼 수 있는 큰 형태 | 상대 앞에서 큰 불꽃 문양이 펼쳐지고 터지는 구상을 검토한다. 작은 구체의 방사형 확산과 차이를 둔다. |
| 열풍 | 넓게 밀려오는 열기 | 넓은 불꽃·열기 층이 상대 쪽으로 밀려가도록 한다. 가느다란 화염방사와 폭·진행 방식을 구분한다. |
| 오버히트 | 힘을 모은 뒤 큰 방출 | 시전자 주변에 에너지를 집중시킨 뒤 한 번에 크게 방출하고 잔불·연기로 마무리한다. 불대문자와 준비·타격 리듬을 구분한다. |
| 불꽃펀치 | 접촉 순간의 불꽃 | 접근과 주먹 타격을 중심으로 접촉 지점에서 불꽃이 튀도록 한다. 원거리 발사 연출과 구분한다. |
| 불꽃엄니 | 물어붙이는 불꽃 | 이빨이 닫히는 순간 불꽃이 붙고 짧게 남는다. 주먹 연출과 형태를 구분한다. |
| 도깨비불 | 떠다니는 작은 푸른 불꽃 | 작은 불꽃이 느리게 접근해 상대 주변에 머무는 느낌을 검토한다. 강한 폭발보다 변화 기술의 분위기를 살린다. |

이 방식이 만족스러우면 물·전기·얼음 등 다른 타입으로 확장한다. 같은 타입 안에서도 광선, 구체, 파동, 접촉, 광역, 변화 기술을 구분한다. 공용 연출 자체를 일반 기술의 기본 완성 형태로 삼고, 선택한 기술만 전용 변형을 보강하는 방향을 검토한다.

## 기술의 발사점·타격점 구상

사용자 확인: 화염방사 프로토타입 GIF에서 불꽃이 리자몽의 몸을 뚫고 나오는 것처럼 보여 발사 위치가 어색하다. 현재 `move-visuals.tsx`는 포켓몬 이미지 사각형의 가로 중앙·세로 약 55%를 source/target 위치로 사용하므로, 입에서 발사하는 기술에 맞는 위치를 보장하지 않는다. 이미지의 투명 여백과 포켓몬 자세 차이도 위치 오차에 영향을 준다. 이 항목은 후속 설계 구상이며 현재 코드는 변경하지 않는다.

기술의 연출 템플릿과 포켓몬의 발사 위치를 별도로 정의하는 방향을 검토한다. 예를 들어 화염방사는 `mouth`, 펀치 계열은 `hand`, 몸 전체에서 에너지를 방출하는 기술은 `body`, 지면 효과는 `ground`를 선택하고, 포켓몬별 기준점 데이터가 화면 좌표로 변환되도록 한다. 각 기준점은 실제 사용하는 스프라이트의 프레임 안에서 정규화한 좌표로 기록하고, 표시 크기·이동·방향 변환을 반영한다. Canvas 전체나 화면의 고정 픽셀 좌표를 기술마다 넣지 않는다.

- 앞모습·뒷모습은 별도 위치를 사용한다. 뒷모습의 입이 가려진 경우에는 불꽃이 자연스럽게 보이기 시작할 얼굴 앞쪽 지점을 정한다. 좌우 반전만으로 모든 방향의 입 위치가 맞는다고 가정하지 않는다.
- 메가·폼 변화 등 실제 이미지가 바뀌는 경우에는 해당 이미지 키에 맞는 기준점을 사용한다. 크기만 바뀌는 경우는 같은 기준점을 표시 크기에 맞춰 변환한다.
- 모든 포켓몬의 입·손을 처음부터 수동 지정하지 않는다. 미등록 이미지에는 진행 방향 쪽의 몸 가장자리 같은 대체 위치를 사용하고, 리자몽 등 자주 보는 포켓몬부터 보정한다. 이 대체 위치는 실제 입을 찾은 위치가 아닌 근사치다.
- 타격점은 발사점과 구분한다. 입에서 출발하는 기술이라도 상대의 입을 목표로 하지 않고 몸통 중심 등 기술에 맞는 위치를 사용한다. 빗나감 오프셋은 계산된 타격점에 적용한다.
- 애니메이션 스프라이트에서는 고정 기준점이 움직이는 입을 정확히 따라가지 못할 수 있다. 우선 작은 위치 변화는 허용하는 프로토타입을 비교하고, 오차가 큰 이미지에 한해 프레임별 기준점 또는 공격 시 일정한 자세를 사용하는 방식을 검토한다. 단순한 색상·투명도 판별로 모든 이미지의 입을 자동 식별할 수 있다고 가정하지 않는다.
- 좌표만 옮겨도 빔의 넓은 뒷부분이 몸을 덮을 수 있으므로, PNG의 시작점·투명 여백과 불꽃 꼬리의 형태도 함께 확인한다. 필요하면 발사 위치를 얼굴 앞쪽으로 조금 이동하거나 시작 부분을 제한한다. 몸 뒤에 가려져야 하는 구간은 별도의 레이어·가림 처리가 필요한지 시안으로 판단한다.

후속 작업은 리자몽 뒷모습의 입 근처와 상대 방향에서 먼저 비교한다. 기준점을 화면에 표시하고 미리보기를 재생하는 작은 편집 도구가 반복 보정에 유용한지 검토한다. 이후 다른 종·폼·모바일·양쪽 공격 방향·스프라이트 움직임에서도 확인한다. 발사점 보정은 HP·피격·기절·스킵 타이밍과 분리된 시각 좌표 개선으로 다룬다.

## 배틀 배경과 필드 연출 구상

기술 이펙트와 함께 배틀 배경도 후속 개선 대상으로 둔다. 현재 배경은 사용자 체감으로 너무 간단하고 임시로 만든 느낌이 강하므로, 바닥의 질감·무늬, 포켓몬이 서 있는 자리, 뒤쪽 풍경과 깊이감 등을 더 디테일하게 만드는 방향을 검토한다. 도트 포켓몬과 어울리면서 기술 이펙트와 HP·메뉴가 잘 보이는 배경을 목표로 한다. 구체적인 배경 디자인과 제작 방식은 미정이다.

필드가 깔리면 이름이나 아이콘 표시뿐 아니라 **바닥과 배경의 색·질감도 바뀌어 전장 전체에 필드가 적용된 느낌**을 주도록 구상한다. 사용자가 첨부한 참고 사진에서는 일렉트릭필드가 깔린 배틀 바닥·배경에 노란 기운이 도는 점을 참고한다. 사진은 별도 프로젝트 파일로 저장하지 않으며, 원본 이미지를 가져오는 대신 이 시각적 방향을 글로 기록한다.

| 필드 | 색·바닥 표현 후보 |
|---|---|
| 일렉트릭필드 | 바닥과 배경에 노란 기운을 더하고, 바닥 무늬나 약한 전기 흐름으로 전기가 깔린 느낌을 준다. |
| 그래스필드 | 초록빛 바닥과 풀·잎의 질감으로 지면이 풀에 덮인 느낌을 준다. |
| 미스트필드 | 옅은 분홍·보랏빛과 지면 가까운 안개로 필드가 퍼져 있는 느낌을 준다. |
| 사이코필드 | 보랏빛 바닥과 은은한 파동·무늬로 특수한 공간이 형성된 느낌을 준다. |

일렉트릭필드 외 항목은 같은 방향을 확장한 제안이며 확정 디자인이 아니다. 기술 사용 순간의 짧은 효과와 달리, 필드 표현은 필드가 유지되는 동안 남고 교체·종료될 때 전환되는 방향을 검토한다. 배경 전체에 단색을 덮는 방식뿐 아니라 바닥 중심의 색 변화와 질감 표현을 비교해 본다.

후속 구현 때는 필드가 교체되거나 끝났을 때 기본 배경으로 정확히 돌아오는지, 양쪽 포켓몬과 UI의 색 대비가 유지되는지 확인한다. 날씨 연출과 함께 보이는 경우의 우선순위, 동작 감소 설정에서 정적인 색·무늬만으로 필드를 구분하는 방식도 추후 검토한다. 이번에는 배경·필드 코드나 에셋을 변경하지 않는다.

## 외부 자료 활용과 직접 제작

두 방향 모두 후보로 남겨둔다. 지금 어느 쪽으로 진행할지는 확정하지 않는다.

| 방향 | 기대하는 점 | 추후 확인할 점 |
|---|---|---|
| 외부 효과 에셋·기술별 연출 자료 활용 | 더 완성도 있는 형태나 동작을 출발점으로 삼을 수 있다. | 개별 파일의 출처·수정/게임 배포 조건·크레딧, 도트 화면과의 어울림, 모바일에서의 선명도, 기존 렌더러에 맞추는 작업량 |
| 기존 자산으로 직접 연출 개선 | 현재 화면에 맞춰 형태·궤적·타이밍을 세밀하게 조절할 수 있다. | 현재 PNG만으로 원하는 형태가 가능한지, 새 효과 이미지나 시트가 필요한지, 제작 시간과 유지보수 비용 |
| 두 방향을 혼합 | 범용 자산을 활용하면서 대표 기술의 동작은 직접 설계할 수 있다. | 자산 간 질감 차이, 출처 기록, 기술별 예외가 늘어나는 정도 |

기존에 확보한 Showdown 효과 PNG 22개와 기술별 참고 코드가 있으므로, 후속 검토는 그 자료로 표현 가능한 범위를 확인하는 데서 시작할 수 있다. 현재 연결 내용은 [기술 시각 연출 기록](../engineering/MOVE_EFFECTS.md), 기존 출처 기록은 [출처와 재사용](../references/THIRD_PARTY.md)을 참고한다. 이는 새 자료를 조사하거나 이용 허락을 추가 확인했다는 의미가 아니다.

새 자료를 실제로 가져올 때는 저장소 전체 라이선스와 개별 이미지·원작 자산의 조건을 구분해 기록한다. 원작 화면은 연출 참고와 파일 재사용을 별개로 검토한다.

## 나중에 시작할 때의 순서

1. 현재 화면에서 불꽃 기술들을 나란히 비교하고, 반복되는 형태와 타이밍을 기록한다.
2. 불꽃 기술들을 동작 계열로 분류하고 기존 공용 구성과 자산으로 커버할 범위를 정한다.
3. 필요한 공용 템플릿부터 개선해 여러 기술에 연결하고, 비교 화면에서 대표 샘플을 검토한다. 기존 자산 활용, 외부 자료 활용, 직접 제작의 작업량도 비교한다.
4. 부족한 대표 기술·전용기·Z기술을 골라 보강하고 다른 타입으로 확장한다. 처음부터 모든 기술을 한꺼번에 교체하지 않는다.

추후 완료 판단에는 같은 타입 기술의 구분 가능성, 도트 화면과의 조화, 양쪽 공격 방향과 모바일 가독성, 반복 관전 시 피로도를 포함한다. 스킵·동작 감소, 빗나감·무효·흡수 표현, HP 변경 시점, 장면 종료 시 정리 같은 현재 재생 동작도 유지해야 한다. 현재 대부분 950ms, 섀도볼 1100ms인 재생 시간과 파티클 제한은 검토할 기존 조건이며, 무조건 늘리는 것을 개선 기준으로 삼지 않는다.

## 미정 항목

- 원작 참고 세대와 원하는 재현 수준
- 먼저 개선할 기술과 목표 품질
- 외부 자료를 활용할 범위와 직접 제작에 들일 시간
- 신규 자산 형식과 효과음 조정 범위
- 배경의 디테일 수준·제작 방식과 필드별 색·질감, 날씨와의 조합
- 착수 순서 — UI/UX 정리 후 공용 계열부터 진행하며 개별 범위는 비교 후 결정

<!-- BEGIN GENERATED MOVE PRESENTATIONS -->
<!-- GENERATED: pnpm exec tsx scripts/document-move-presentations.ts -->

## 전체 기술 연출 매핑

등록 **934개**, 명시적 매핑 **934개**, 공용 프리셋 **69개**. 일반 기술·전용 Z기술·범용 Z기술·맥스·거다이맥스를 모두 포함한다. 전용 VFX를 새로 추가하지 않는다. 타입은 색·재질의 참고값이며 프리셋 선택 기준이 아니다. 표의 설정은 목표 설계이며 현재 rendererStyle 공용 adapter는 일부 형태를 근사한다.

시간은 1배속 ms의 전체 / 대표 타격 시점이다. 실제 HP·랭크·상태 효과는 항상 공개 프로토콜 결과가 결정한다. Protocol은 결과 표시를 기존 전투/필드 시스템에 위임한다는 뜻이다. None은 별도 VFX 파일이 필요하지 않다는 뜻이다.

| 기술 | 프리셋 | PokemonMotion | ScreenEffect | MainVFX / ImpactVFX | TargetEffect | Sound | SpecialSequence / 상태 | 시간 | 판단·검토 |
|---|---|---|---|---|---|---|---|---|---|
| 1000만볼트 (10,000,000 Volt Thunderbolt) | thunder | None | None | ElectricBurst / ElectricBurst | Shake | Energy | None / None | 950 / 180 | 대상 주변에서 전격을 집중·방출 |
| 흡수 (Absorb) | drain | None | None | Aura / None | Shake | Energy | Drain / None | 950 / 600 | 대상에서 사용자로 생명력을 회수 |
| 액셀록 (Accelerock) | fastdash | FastDash | None | None / HitSmall | Shake | Rush | None / None | 950 / 430 | 빠른 접근과 짧은 잔상 |
| 용해액 (Acid) | poisonorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 독·산성 액체·점액을 발사 |
| 녹기 (Acid Armor) | buff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 기술 준비 오라; 실제 랭크 변화는 결과 이벤트에서만 재생 |
| 애시드포이즌딜리트 (Acid Downpour) | poisonpulse | None | None | Smoke / HitSmall | Shake | Energy | None / None | 950 / 600 | 가루·가스·독 안개를 넓게 확산 |
| 애시드봄 (Acid Spray) | poisonorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 독·산성 액체·점액을 발사 |
| 애크러뱃 (Acrobatics) | jump | Jump | ShakeSmall | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 도약 또는 상승 후 내려치는 공격 |
| 경혈찌르기 (Acupressure) | buff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 기술 준비 오라; 실제 랭크 변화는 결과 이벤트에서만 재생 |
| 제비반환 (Aerial Ace) | slash | Dash | None | Slash / HitSmall | Shake | Impact | None / None | 950 / 430 | 날 또는 날개로 베는 궤적 |
| 에어로블라스트 (Aeroblast) | wind | None | None | Wave / HitSmall | Shake | Stream | None / None | 950 / 600 | 바람·냉기·폭풍이 전장을 가로지름 |
| 당신먼저 (After You) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 고속이동 (Agility) | buff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 기술 준비 오라; 실제 랭크 변화는 결과 이벤트에서만 재생 |
| 에어커터 (Air Cutter) | airslash | None | None | Slash / HitSmall | Shake | Energy | None / None | 950 / 600 | 공기·에너지·공간을 가르는 원거리 칼날 |
| 에어슬래시 (Air Slash) | airslash | None | None | Slash / HitSmall | Shake | Energy | None / None | 950 / 600 | 공기·에너지·공간을 가르는 원거리 칼날 |
| 전력무쌍격렬권 (All-Out Pummeling) | multihit | Dash | None | MultiHit / HitHeavy | Shake | Impact | None / None | 950 / 430 | 여러 번의 빠른 타격을 하나의 짧은 시퀀스로 표현 |
| 매혹의보이스 (Alluring Voice) | sound | None | None | SoundWave / None | None | Voice | SoundWave / None | 950 / 600 | 목소리·울림을 사용자에서 대상까지 동심원으로 전달 |
| 사이드체인지 (Ally Switch) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 망각술 (Amnesia) | buff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 기술 준비 오라; 실제 랭크 변화는 결과 이벤트에서만 재생 |
| 앵커샷 (Anchor Shot) | strike | Dash | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 머리·팔·뿔·도구를 이용한 근거리 타격 |
| 원시의힘 (Ancient Power) | mudorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 고체·모래·진흙·작은 물체를 던짐 |
| 사과산 (Apple Acid) | poisonorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 독·산성 액체·점액을 발사 |
| 아쿠아커터 (Aqua Cutter) | slash | Dash | None | Slash / HitSmall | Shake | Impact | None / None | 950 / 430 | 날 또는 날개로 베는 궤적 |
| 아쿠아제트 (Aqua Jet) | fastdash | FastDash | None | None / HitSmall | Shake | Rush | None / None | 950 / 430 | 빠른 접근과 짧은 잔상 |
| 아쿠아링 (Aqua Ring) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 아쿠아스텝 (Aqua Step) | kick | Jump | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 도약하며 발로 타격 |
| 아쿠아테일 (Aqua Tail) | whip | Dash | None | Slash / HitSmall | Shake | Impact | None / None | 950 / 430 | 꼬리·채찍을 휘두르는 긴 호 |
| 손바닥치기 (Arm Thrust) | multihit | Dash | None | MultiHit / HitHeavy | Shake | Impact | None / None | 950 / 430 | 여러 번의 빠른 타격을 하나의 짧은 시퀀스로 표현 |
| 아머캐논 (Armor Cannon) | fireorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 불꽃 구체 또는 포탄을 발사 |
| 아로마테라피 (Aromatherapy) | heal | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 회복 준비; 실제 HP 회복은 결과 이벤트에서 표시 |
| 아로마미스트 (Aromatic Mist) | mist | None | None | Smoke / None | None | Support | None / Protocol | 950 / 600 | 전장에 안개·바람이 잠시 확산 |
| 조수 (Assist) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 승부굳히기 (Assurance) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 놀래키기 (Astonish) | strike | Dash | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 머리·팔·뿔·도구를 이용한 근거리 타격 |
| 아스트랄비트 (Astral Barrage) | shadoworb | None | Darken | ShadowOrb / Smoke | Shake | Energy | None / None | 1100 / 600 | 그림자 에너지를 모아 구체로 발사 |
| 공격지령 (Attack Order) | mudorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 고체·모래·진흙·작은 물체를 던짐 |
| 헤롱헤롱 (Attract) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 파동탄 (Aura Sphere) | projectile | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 작은 에너지·별·구체를 날림 |
| 오라휠 (Aura Wheel) | spin | Spin | None | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 회전한 몸으로 타격 |
| 오로라빔 (Aurora Beam) | icebeam | None | None | IceBeam / HitSmall | Shake | Stream | None / None | 950 / 600 | 대상을 잇는 냉기 광선 |
| 오로라베일 (Aurora Veil) | shield | None | None | Ring / None | None | Support | None / Protocol | 950 / 600 | 사용자 주변 방어막을 짧게 펼침 |
| 바디퍼지 (Autotomize) | buff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 기술 준비 오라; 실제 랭크 변화는 결과 이벤트에서만 재생 |
| 눈사태 (Avalanche) | fall | None | ShakeSmall | Projectile / GroundImpactSmall | Shake | Impact | None / None | 950 / 600 | 대상 위에서 암석·얼음·물체가 낙하 |
| 발꿈치찍기 (Axe Kick) | kick | Jump | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 도약하며 발로 타격 |
| 초롱초롱눈동자 (Baby-Doll Eyes) | debuff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 위협·몸짓으로 대상에 압박을 전달 |
| 아그아그존 (Baddy Bad) | darkpulse | None | Darken | Wave / HitSmall | Shake | Energy | None / None | 950 / 600 | 어두운 에너지를 파동으로 방출 |
| 토치카 (Baneful Bunker) | shield | None | None | Ring / None | None | Support | None / Protocol | 950 / 600 | 사용자 주변 방어막을 짧게 펼침 |
| 독침천발 (Barb Barrage) | mudorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 고체·모래·진흙·작은 물체를 던짐 |
| 구슬던지기 (Barrage) | mudorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 고체·모래·진흙·작은 물체를 던짐 |
| 배리어 (Barrier) | shield | None | None | Ring / None | None | Support | None / Protocol | 950 / 600 | 사용자 주변 방어막을 짧게 펼침 |
| 배턴터치 (Baton Pass) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 부리캐논 (Beak Blast) | strike | Dash | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 머리·팔·뿔·도구를 이용한 근거리 타격 |
| 집단구타 (Beat Up) | multihit | Dash | None | MultiHit / HitHeavy | Shake | Impact | None / None | 950 / 430 | 여러 번의 빠른 타격을 하나의 짧은 시퀀스로 표현 |
| 거수탄 (Behemoth Bash) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 거수참 (Behemoth Blade) | slash | Dash | None | Slash / HitSmall | Shake | Impact | None / None | 950 / 430 | 날 또는 날개로 베는 궤적 |
| 트림 (Belch) | poisonorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 독·산성 액체·점액을 발사 |
| 배북 (Belly Drum) | buff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 기술 준비 오라; 실제 랭크 변화는 결과 이벤트에서만 재생 |
| 기프트패스 (Bestow) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 참기 (Bide) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 조이기 (Bind) | bind | None | None | Ring / HitSmall | Shake | Impact | None / Protocol | 950 / 600 | 조임·덫·휘감기로 대상 주변을 압박 |
| 물기 (Bite) | bite | Dash | None | Bite / HitSmall | Shake | Impact | None / None | 950 / 430 | 위아래 이빨로 물기 |
| 원념의칼 (Bitter Blade) | slash | Dash | None | Slash / HitSmall | Shake | Impact | None / None | 950 / 430 | 날 또는 날개로 베는 궤적 |
| 천추지한 (Bitter Malice) | psychicpulse | None | None | Aura / HitSmall | Shake | Energy | None / None | 950 / 600 | 대상에 에너지·초능력 압박을 집중 |
| 블랙홀이클립스 (Black Hole Eclipse) | darkpulse | None | Darken | Wave / HitSmall | Shake | Energy | None / None | 950 / 600 | 어두운 에너지를 파동으로 방출 |
| 블라스트번 (Blast Burn) | explosion | None | Flash | Explosion / HitHeavy | Shake | Impact | None / None | 950 / 600 | 중심에서 크게 확산하는 폭발 |
| 블레이즈킥 (Blaze Kick) | kick | Jump | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 도약하며 발로 타격 |
| 번액셀 (Blazing Torque) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 찬바람폭풍 (Bleakwind Storm) | wind | None | None | Wave / HitSmall | Shake | Stream | None / None | 950 / 600 | 바람·냉기·폭풍이 전장을 가로지름 |
| 눈보라 (Blizzard) | blizzard | None | None | IceImpact / HitSmall | Shake | Stream | None / None | 950 / 600 | 넓게 흩날리는 눈보라 |
| 블록 (Block) | hazard | None | None | GroundImpactSmall / None | None | Support | None / Protocol | 950 / 600 | 상대 진영에 설치 또는 포획 표시 |
| 블러드문 (Blood Moon) | psychicpulse | None | None | Aura / HitSmall | Shake | Energy | None / None | 950 / 600 | 대상에 에너지·초능력 압박을 집중 |
| 블룸샤인엑스트라 (Bloom Doom) | greenorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 씨앗·생명력·식물 구체를 전달 |
| 푸른불꽃 (Blue Flare) | fireburst | None | None | FireBurst / FireBurst | Shake | Impact | None / None | 950 / 600 | 큰 불꽃을 모아 대상에서 폭발 |
| 바디프레스 (Body Press) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 누르기 (Body Slam) | jump | Jump | ShakeSmall | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 도약 또는 상승 후 내려치는 공격 |
| 전격부리 (Bolt Beak) | strike | Dash | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 머리·팔·뿔·도구를 이용한 근거리 타격 |
| 뇌격 (Bolt Strike) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 뼈다귀치기 (Bone Club) | strike | Dash | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 머리·팔·뿔·도구를 이용한 근거리 타격 |
| 본러시 (Bone Rush) | multihit | Dash | None | MultiHit / HitHeavy | Shake | Impact | None / None | 950 / 430 | 여러 번의 빠른 타격을 하나의 짧은 시퀀스로 표현 |
| 뼈다귀부메랑 (Bonemerang) | mudorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 고체·모래·진흙·작은 물체를 던짐 |
| 폭음파 (Boomburst) | sound | None | None | SoundWave / None | None | Voice | SoundWave / None | 950 / 600 | 목소리·울림을 사용자에서 대상까지 동심원으로 전달 |
| 뛰어오르기 (Bounce) | jump | Jump | ShakeSmall | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 도약 또는 상승 후 내려치는 공격 |
| 생생버블 (Bouncy Bubble) | wave | None | None | WaterWave / HitSmall | Shake | Stream | None / None | 950 / 600 | 전장으로 넓게 밀려오는 물결 |
| 가지찌르기 (Branch Poke) | strike | Dash | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 머리·팔·뿔·도구를 이용한 근거리 타격 |
| 브레이브버드 (Brave Bird) | jump | Jump | ShakeSmall | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 도약 또는 상승 후 내려치는 공격 |
| 와이드브레이커 (Breaking Swipe) | whip | Dash | None | Slash / HitSmall | Shake | Impact | None / None | 950 / 430 | 꼬리·채찍을 휘두르는 긴 호 |
| 울트라대시어택 (Breakneck Blitz) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 깨뜨리다 (Brick Break) | strike | Dash | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 머리·팔·뿔·도구를 이용한 근거리 타격 |
| 소금물 (Brine) | wave | None | None | WaterWave / HitSmall | Shake | Stream | None / None | 950 / 600 | 전장으로 넓게 밀려오는 물결 |
| 세차게휘두르기 (Brutal Swing) | spin | Spin | None | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 회전한 몸으로 타격 |
| 거품 (Bubble) | waterorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 물 구체·거품을 발사 |
| 거품광선 (Bubble Beam) | waterorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 물 구체·거품을 발사 |
| 벌레먹기 (Bug Bite) | bite | Dash | None | Bite / HitSmall | Shake | Impact | None / None | 950 / 430 | 위아래 이빨로 물기 |
| 벌레의야단법석 (Bug Buzz) | sound | None | None | SoundWave / None | None | Voice | SoundWave / None | 950 / 600 | 목소리·울림을 사용자에서 대상까지 동심원으로 전달 |
| 벌크업 (Bulk Up) | buff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 기술 준비 오라; 실제 랭크 변화는 결과 이벤트에서만 재생 |
| 땅고르기 (Bulldoze) | quake | Shake | ShakeLarge | None / GroundImpactSmall | Shake | Rumble | Earthquake / None | 950 / 400 | 투사체 없이 전장과 참가 포켓몬을 흔드는 지진 |
| 불릿펀치 (Bullet Punch) | punch | Dash | None | HitSmall / HitHeavy | Shake | Impact | None / None | 950 / 430 | 주먹을 내밀어 단일 타격 |
| 씨기관총 (Bullet Seed) | greenorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 씨앗·생명력·식물 구체를 전달 |
| 불사르기 (Burn Up) | fireburst | None | None | FireBurst / FireBurst | Shake | Impact | None / None | 950 / 600 | 큰 불꽃을 모아 대상에서 폭발 |
| 화염의수호 (Burning Bulwark) | shield | None | None | Ring / None | None | Support | None / Protocol | 950 / 600 | 사용자 주변 방어막을 짧게 펼침 |
| 질투의불꽃 (Burning Jealousy) | fireburst | None | None | FireBurst / FireBurst | Shake | Impact | None / None | 950 / 600 | 큰 불꽃을 모아 대상에서 폭발 |
| 찌릿찌릿일렉 (Buzzy Buzz) | thunder | None | None | ElectricBurst / ElectricBurst | Shake | Energy | None / None | 950 / 180 | 대상 주변에서 전격을 집중·방출 |
| 명상 (Calm Mind) | buff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 기술 준비 오라; 실제 랭크 변화는 결과 이벤트에서만 재생 |
| 보호색 (Camouflage) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 유혹 (Captivate) | debuff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 위협·몸짓으로 대상에 압박을 전달 |
| 필살피카슛 (Catastropika) | jump | Jump | ShakeSmall | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 도약 또는 상승 후 내려치는 공격 |
| 비검천중파 (Ceaseless Edge) | slash | Dash | None | Slash / HitSmall | Shake | Impact | None / None | 950 / 430 | 날 또는 날개로 베는 궤적 |
| 축하 (Celebrate) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 충전 (Charge) | buff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 기술 준비 오라; 실제 랭크 변화는 결과 이벤트에서만 재생 |
| 차지빔 (Charge Beam) | beam | None | None | Beam / HitSmall | Shake | Stream | None / None | 950 / 600 | 사용자와 대상을 연결하는 에너지 광선 |
| 애교부리기 (Charm) | debuff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 위협·몸짓으로 대상에 압박을 전달 |
| 수다 (Chatter) | sound | None | None | SoundWave / None | None | Voice | SoundWave / None | 950 / 600 | 목소리·울림을 사용자에서 대상까지 동심원으로 전달 |
| 찬물끼얹기 (Chilling Water) | waterbeam | None | None | WaterStream / HitSmall | Shake | Stream | None / None | 950 / 600 | 가느다란 물줄기 또는 고압수 분사 |
| 썰렁개그 (Chilly Reception) | weather | None | None | Weather / None | None | Support | None / Protocol | 950 / 600 | 날씨 발동; 지속 상태는 기존 필드 레이어가 표시 |
| 야금야금 (Chip Away) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 클로로블라스트 (Chloroblast) | beam | None | None | Beam / HitSmall | Shake | Stream | None / None | 950 / 600 | 사용자와 대상을 연결하는 에너지 광선 |
| 배대뒤치기 (Circle Throw) | strike | Dash | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 머리·팔·뿔·도구를 이용한 근거리 타격 |
| 껍질끼우기 (Clamp) | bind | None | None | Ring / HitSmall | Shake | Impact | None / Protocol | 950 / 600 | 조임·덫·휘감기로 대상 주변을 압박 |
| 스케일노이즈 (Clanging Scales) | sound | None | None | SoundWave / None | None | Voice | SoundWave / None | 950 / 600 | 목소리·울림을 사용자에서 대상까지 동심원으로 전달 |
| 소울비트 (Clangorous Soul) | sound | None | None | SoundWave / None | None | Voice | SoundWave / None | 950 / 600 | 목소리·울림을 사용자에서 대상까지 동심원으로 전달 |
| 브레이징소울비트 (Clangorous Soulblaze) | sound | None | None | SoundWave / None | None | Voice | SoundWave / None | 950 / 600 | 목소리·울림을 사용자에서 대상까지 동심원으로 전달 |
| 클리어스모그 (Clear Smog) | poisonpulse | None | None | Smoke / HitSmall | Shake | Energy | None / None | 950 / 600 | 가루·가스·독 안개를 넓게 확산 |
| 인파이트 (Close Combat) | multihit | Dash | None | MultiHit / HitHeavy | Shake | Impact | None / None | 950 / 430 | 여러 번의 빠른 타격을 하나의 짧은 시퀀스로 표현 |
| 코칭 (Coaching) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 똬리틀기 (Coil) | buff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 기술 준비 오라; 실제 랭크 변화는 결과 이벤트에서만 재생 |
| 엑셀브레이크 (Collision Course) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 파이트액셀 (Combat Torque) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 연속펀치 (Comet Punch) | multihit | Dash | None | MultiHit / HitHeavy | Shake | Impact | None / None | 950 / 430 | 여러 번의 빠른 타격을 하나의 짧은 시퀀스로 표현 |
| 앙갚음 (Comeuppance) | strike | Dash | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 머리·팔·뿔·도구를 이용한 근거리 타격 |
| 비밀이야기 (Confide) | sound | None | None | SoundWave / None | None | Voice | SoundWave / None | 950 / 600 | 목소리·울림을 사용자에서 대상까지 동심원으로 전달 |
| 이상한빛 (Confuse Ray) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 염동력 (Confusion) | psychicpulse | None | None | Aura / HitSmall | Shake | Energy | None / None | 950 / 600 | 대상에 에너지·초능력 압박을 집중 |
| 휘감기 (Constrict) | bind | None | None | Ring / HitSmall | Shake | Impact | None / Protocol | 950 / 600 | 조임·덫·휘감기로 대상 주변을 압박 |
| 월즈엔드폴 (Continental Crush) | fall | None | ShakeSmall | Projectile / GroundImpactSmall | Shake | Impact | None / None | 950 / 600 | 대상 위에서 암석·얼음·물체가 낙하 |
| 텍스처 (Conversion) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 텍스처2 (Conversion 2) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 흉내쟁이 (Copycat) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 검토: 후속 호출 기술과 연결 |
| 코어퍼니셔 (Core Enforcer) | beam | None | None | Beam / HitSmall | Shake | Stream | None / None | 950 / 600 | 사용자와 대상을 연결하는 에너지 광선 |
| 초월나선연격 (Corkscrew Crash) | spin | Spin | None | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 회전한 몸으로 타격 |
| 부식가스 (Corrosive Gas) | poisonpulse | None | None | Smoke / HitSmall | Shake | Energy | None / None | 950 / 600 | 가루·가스·독 안개를 넓게 확산 |
| 코스믹파워 (Cosmic Power) | buff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 기술 준비 오라; 실제 랭크 변화는 결과 이벤트에서만 재생 |
| 코튼가드 (Cotton Guard) | buff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 기술 준비 오라; 실제 랭크 변화는 결과 이벤트에서만 재생 |
| 목화포자 (Cotton Spore) | poisonpulse | None | None | Smoke / HitSmall | Shake | Energy | None / None | 950 / 600 | 가루·가스·독 안개를 넓게 확산 |
| 카운터 (Counter) | strike | Dash | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 머리·팔·뿔·도구를 이용한 근거리 타격 |
| 코트체인지 (Court Change) | terrain | None | None | Wave / None | None | Support | None / Protocol | 950 / 600 | 바닥·공간에 필드 효과 발동 |
| 탐내다 (Covet) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 집게해머 (Crabhammer) | strike | Dash | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 머리·팔·뿔·도구를 이용한 근거리 타격 |
| 트릭가드 (Crafty Shield) | shield | None | None | Ring / None | None | Support | None / Protocol | 950 / 600 | 사용자 주변 방어막을 짧게 펼침 |
| 크로스촙 (Cross Chop) | slash | Dash | None | Slash / HitSmall | Shake | Impact | None / None | 950 / 430 | 날 또는 날개로 베는 궤적 |
| 크로스포이즌 (Cross Poison) | slash | Dash | None | Slash / HitSmall | Shake | Impact | None / None | 950 / 430 | 날 또는 날개로 베는 궤적 |
| 깨물어부수기 (Crunch) | bite | Dash | None | Bite / HitSmall | Shake | Impact | None / None | 950 / 430 | 위아래 이빨로 물기 |
| 브레이크클로 (Crush Claw) | slash | Dash | None | Slash / HitSmall | Shake | Impact | None / None | 950 / 430 | 날 또는 날개로 베는 궤적 |
| 묵사발 (Crush Grip) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 저주 (Curse) | buff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 기술 준비 오라; 실제 랭크 변화는 결과 이벤트에서만 재생 |
| 풀베기 (Cut) | slash | Dash | None | Slash / HitSmall | Shake | Impact | None / None | 950 / 430 | 날 또는 날개로 베는 궤적 |
| 악의파동 (Dark Pulse) | darkpulse | None | Darken | Wave / HitSmall | Shake | Energy | None / None | 950 / 600 | 어두운 에너지를 파동으로 방출 |
| 다크홀 (Dark Void) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| DD래리어트 (Darkest Lariat) | spin | Spin | None | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 회전한 몸으로 타격 |
| 매지컬샤인 (Dazzling Gleam) | fairypulse | None | Flash | Wave / HitSmall | Shake | Energy | None / None | 950 / 600 | 밝은 에너지를 넓게 방출 |
| 데코레이션 (Decorate) | buff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 기술 준비 오라; 실제 랭크 변화는 결과 이벤트에서만 재생 |
| 방어지령 (Defend Order) | buff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 기술 준비 오라; 실제 랭크 변화는 결과 이벤트에서만 재생 |
| 웅크리기 (Defense Curl) | buff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 기술 준비 오라; 실제 랭크 변화는 결과 이벤트에서만 재생 |
| 안개제거 (Defog) | mist | None | None | Smoke / None | None | Support | None / Protocol | 950 / 600 | 전장에 안개·바람이 잠시 확산 |
| 길동무 (Destiny Bond) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 판별 (Detect) | shield | None | None | Ring / None | None | Support | None / Protocol | 950 / 600 | 사용자 주변 방어막을 짧게 펼침 |
| 알티메이트드래곤번 (Devastating Drake) | dragonorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 용의 에너지를 구체로 전달 |
| 다이아스톰 (Diamond Storm) | fall | None | ShakeSmall | Projectile / GroundImpactSmall | Shake | Impact | None / None | 950 / 600 | 대상 위에서 암석·얼음·물체가 낙하 |
| 구멍파기 (Dig) | disappear | Disappear | None | None / HitHeavy | Shake | Impact | TwoTurn / Protocol | 950 / 430 | 검토: 잠복 준비 턴과 타격 턴 분리 |
| 페이탈클로 (Dire Claw) | claw | Dash | None | Claw / HitSmall | Shake | Impact | None / None | 950 / 430 | 발톱을 교차하여 할퀴기 |
| 사슬묶기 (Disable) | debuff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 위협·몸짓으로 대상에 압박을 전달 |
| 차밍보이스 (Disarming Voice) | sound | None | None | SoundWave / None | None | Voice | SoundWave / None | 950 / 600 | 목소리·울림을 사용자에서 대상까지 동심원으로 전달 |
| 방전 (Discharge) | thunder | None | None | ElectricBurst / ElectricBurst | Shake | Energy | None / None | 950 / 180 | 대상 주변에서 전격을 집중·방출 |
| 다이빙 (Dive) | disappear | Disappear | None | None / HitHeavy | Shake | Impact | TwoTurn / Protocol | 950 / 430 | 검토: 잠수 준비 턴과 타격 턴 분리 |
| 잼잼펀치 (Dizzy Punch) | punch | Dash | None | HitSmall / HitHeavy | Shake | Impact | None / None | 950 / 430 | 주먹을 내밀어 단일 타격 |
| 배껴그리기 (Doodle) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 파멸의소원 (Doom Desire) | meteors | None | Darken | Projectile / Explosion | Shake | Impact | None / None | 950 / 600 | 검토: 사용 턴과 지연 타격 구분 |
| 더블어택 (Double Hit) | multihit | Dash | None | MultiHit / HitHeavy | Shake | Impact | None / None | 950 / 430 | 여러 번의 빠른 타격을 하나의 짧은 시퀀스로 표현 |
| 더블펀처 (Double Iron Bash) | spin | Spin | None | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 회전한 몸으로 타격 |
| 두번차기 (Double Kick) | kick | Jump | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 도약하며 발로 타격 |
| 전광쌍격 (Double Shock) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 연속뺨치기 (Double Slap) | multihit | Dash | None | MultiHit / HitHeavy | Shake | Impact | None / None | 950 / 430 | 여러 번의 빠른 타격을 하나의 짧은 시퀀스로 표현 |
| 그림자분신 (Double Team) | clone | Clone | None | None / None | None | Support | DoubleTeamClone / Protocol | 950 / 600 | 본체 양옆 반투명 분신이 벌어졌다 합쳐짐 |
| 이판사판태클 (Double-Edge) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 용성군 (Draco Meteor) | meteors | None | Darken | Projectile / Explosion | Shake | Impact | None / None | 950 / 600 | 위에서 여러 물체를 떨어뜨림 |
| 화룡점정 (Dragon Ascent) | jump | Jump | ShakeSmall | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 도약 또는 상승 후 내려치는 공격 |
| 용의숨결 (Dragon Breath) | dragonbeam | None | None | Stream / HitSmall | Shake | Stream | None / None | 950 / 600 | 숨결을 대상에게 분사 |
| 드래곤옐 (Dragon Cheer) | sound | None | None | SoundWave / None | None | Voice | SoundWave / None | 950 / 600 | 목소리·울림을 사용자에서 대상까지 동심원으로 전달 |
| 드래곤클로 (Dragon Claw) | claw | Dash | None | Claw / HitSmall | Shake | Impact | None / None | 950 / 430 | 발톱을 교차하여 할퀴기 |
| 용의춤 (Dragon Dance) | buff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 기술 준비 오라; 실제 랭크 변화는 결과 이벤트에서만 재생 |
| 드래곤애로 (Dragon Darts) | mudorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 검토: 복수 대상 및 2회 타격 연결 |
| 드래곤에너지 (Dragon Energy) | beam | None | None | Beam / HitSmall | Shake | Stream | None / None | 950 / 600 | 사용자와 대상을 연결하는 에너지 광선 |
| 드래곤해머 (Dragon Hammer) | strike | Dash | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 머리·팔·뿔·도구를 이용한 근거리 타격 |
| 용의파동 (Dragon Pulse) | dragonorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 용의 에너지를 구체로 전달 |
| 용의분노 (Dragon Rage) | dragonorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 용의 에너지를 구체로 전달 |
| 드래곤다이브 (Dragon Rush) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 드래곤테일 (Dragon Tail) | whip | Dash | None | Slash / HitSmall | Shake | Impact | None / None | 950 / 430 | 꼬리·채찍을 휘두르는 긴 호 |
| 드레인펀치 (Drain Punch) | punch | Dash | None | HitSmall / HitHeavy | Shake | Impact | None / None | 950 / 430 | 주먹을 내밀어 단일 타격 |
| 드레인키스 (Draining Kiss) | drain | None | None | Aura / None | Shake | Energy | Drain / None | 950 / 600 | 대상에서 사용자로 생명력을 회수 |
| 꿈먹기 (Dream Eater) | psychicpulse | None | None | Aura / HitSmall | Shake | Energy | None / None | 950 / 600 | 대상에 에너지·초능력 압박을 집중 |
| 회전부리 (Drill Peck) | strike | Dash | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 머리·팔·뿔·도구를 이용한 근거리 타격 |
| 드릴라이너 (Drill Run) | strike | Dash | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 머리·팔·뿔·도구를 이용한 근거리 타격 |
| 드럼어택 (Drum Beating) | strike | Dash | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 머리·팔·뿔·도구를 이용한 근거리 타격 |
| 더블촙 (Dual Chop) | multihit | Dash | None | MultiHit / HitHeavy | Shake | Impact | None / None | 950 / 430 | 여러 번의 빠른 타격을 하나의 짧은 시퀀스로 표현 |
| 더블윙 (Dual Wingbeat) | slash | Dash | None | Slash / HitSmall | Shake | Impact | None / None | 950 / 430 | 날 또는 날개로 베는 궤적 |
| 다이맥스포 (Dynamax Cannon) | beam | None | None | Beam / HitSmall | Shake | Stream | None / None | 950 / 600 | 사용자와 대상을 연결하는 에너지 광선 |
| 폭발펀치 (Dynamic Punch) | punch | Dash | None | HitSmall / HitHeavy | Shake | Impact | None / None | 950 / 430 | 주먹을 내밀어 단일 타격 |
| 대지의힘 (Earth Power) | ground | None | ShakeSmall | GroundImpactSmall / HitHeavy | Shake | Rumble | None / None | 950 / 400 | 대상 발밑에서 지면·기둥을 솟구침 |
| 지진 (Earthquake) | quake | Shake | ShakeLarge | None / GroundImpactSmall | Shake | Rumble | Earthquake / None | 950 / 400 | 투사체 없이 전장과 참가 포켓몬을 흔드는 지진 |
| 에코보이스 (Echoed Voice) | sound | None | None | SoundWave / None | None | Voice | SoundWave / None | 950 / 600 | 목소리·울림을 사용자에서 대상까지 동심원으로 전달 |
| 괴전파 (Eerie Impulse) | sound | None | None | SoundWave / None | None | Voice | SoundWave / None | 950 / 600 | 목소리·울림을 사용자에서 대상까지 동심원으로 전달 |
| 섬뜩한주문 (Eerie Spell) | psychicpulse | None | None | Aura / HitSmall | Shake | Energy | None / None | 950 / 600 | 대상에 에너지·초능력 압박을 집중 |
| 알폭탄 (Egg Bomb) | mudorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 고체·모래·진흙·작은 물체를 던짐 |
| 일렉트릭필드 (Electric Terrain) | terrain | None | None | Wave / None | None | Support | None / Protocol | 950 / 600 | 바닥·공간에 필드 효과 발동 |
| 송전 (Electrify) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 일렉트릭볼 (Electro Ball) | electricorb | None | None | ElectricBolt / HitSmall | Shake | Energy | None / None | 950 / 600 | 짧은 전기 구체 또는 전격을 전달 |
| 라이트닝드라이브 (Electro Drift) | fastdash | FastDash | None | None / HitSmall | Shake | Rush | None / None | 950 / 430 | 빠른 접근과 짧은 잔상 |
| 일렉트로빔 (Electro Shot) | beam | None | None | Beam / HitSmall | Shake | Stream | None / None | 950 / 600 | 사용자와 대상을 연결하는 에너지 광선 |
| 일렉트릭네트 (Electroweb) | hazard | None | None | GroundImpactSmall / None | None | Support | None / Protocol | 950 / 600 | 상대 진영에 설치 또는 포획 표시 |
| 금제 (Embargo) | debuff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 위협·몸짓으로 대상에 압박을 전달 |
| 불꽃세례 (Ember) | fireorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 불꽃 구체 또는 포탄을 발사 |
| 앙코르 (Encore) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 죽기살기 (Endeavor) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 버티기 (Endure) | shield | None | None | Ring / None | None | Support | None / Protocol | 950 / 600 | 사용자 주변 방어막을 짧게 펼침 |
| 에너지볼 (Energy Ball) | greenorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 씨앗·생명력·식물 구체를 전달 |
| 동료만들기 (Entrainment) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 분화 (Eruption) | explosion | None | Flash | Explosion / HitHeavy | Shake | Impact | None / None | 950 / 600 | 중심에서 크게 확산하는 폭발 |
| 오라윙 (Esper Wing) | wind | None | None | Wave / HitSmall | Shake | Stream | None / None | 950 / 600 | 바람·냉기·폭풍이 전장을 가로지름 |
| 무한다이빔 (Eternabeam) | beam | None | None | Beam / HitSmall | Shake | Stream | None / None | 950 / 600 | 사용자와 대상을 연결하는 에너지 광선 |
| 와이드포스 (Expanding Force) | psychicpulse | None | None | Aura / HitSmall | Shake | Energy | None / None | 950 / 600 | 대상에 에너지·초능력 압박을 집중 |
| 대폭발 (Explosion) | explosion | None | Flash | Explosion / HitHeavy | Shake | Impact | None / None | 950 / 600 | 중심에서 크게 확산하는 폭발 |
| 신통력 (Extrasensory) | psychicpulse | None | None | Aura / HitSmall | Shake | Energy | None / None | 950 / 600 | 대상에 에너지·초능력 압박을 집중 |
| 나인이볼부스트 (Extreme Evoboost) | buff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 기술 준비 오라; 실제 랭크 변화는 결과 이벤트에서만 재생 |
| 신속 (Extreme Speed) | fastdash | FastDash | None | None / HitSmall | Shake | Rush | None / None | 950 / 430 | 빠른 접근과 짧은 잔상 |
| 객기 (Facade) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 페어리록 (Fairy Lock) | hazard | None | None | GroundImpactSmall / None | None | Support | None / Protocol | 950 / 600 | 상대 진영에 설치 또는 포획 표시 |
| 요정의바람 (Fairy Wind) | wind | None | None | Wave / HitSmall | Shake | Stream | None / None | 950 / 600 | 바람·냉기·폭풍이 전장을 가로지름 |
| 속이기 (Fake Out) | strike | Dash | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 머리·팔·뿔·도구를 이용한 근거리 타격 |
| 거짓울음 (Fake Tears) | debuff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 위협·몸짓으로 대상에 압박을 전달 |
| 사죄의찌르기 (False Surrender) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 칼등치기 (False Swipe) | slash | Dash | None | Slash / HitSmall | Shake | Impact | None / None | 950 / 430 | 날 또는 날개로 베는 궤적 |
| 깃털댄스 (Feather Dance) | debuff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 위협·몸짓으로 대상에 압박을 전달 |
| 페인트 (Feint) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 속여때리기 (Feint Attack) | fastdash | FastDash | None | None / HitSmall | Shake | Rush | None / None | 950 / 430 | 빠른 접근과 짧은 잔상 |
| 마지막일침 (Fell Stinger) | strike | Dash | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 머리·팔·뿔·도구를 이용한 근거리 타격 |
| 변덕레이저 (Fickle Beam) | beam | None | None | Beam / HitSmall | Shake | Stream | None / None | 950 / 600 | 사용자와 대상을 연결하는 에너지 광선 |
| 불꽃춤 (Fiery Dance) | flame | None | None | FireStream / HitSmall | Shake | Stream | None / None | 950 / 600 | 사용자에서 대상으로 연속 화염 분사 |
| 타오르는분노 (Fiery Wrath) | darkpulse | None | Darken | Wave / HitSmall | Shake | Energy | None / None | 950 / 600 | 어두운 에너지를 파동으로 방출 |
| 제살깎기 (Fillet Away) | buff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 기술 준비 오라; 실제 랭크 변화는 결과 이벤트에서만 재생 |
| 목숨걸기 (Final Gambit) | psychicpulse | None | None | Aura / HitSmall | Shake | Energy | None / None | 950 / 600 | 대상에 에너지·초능력 압박을 집중 |
| 불대문자 (Fire Blast) | fireburst | None | None | FireBurst / FireBurst | Shake | Impact | None / None | 950 / 600 | 큰 불꽃을 모아 대상에서 폭발 |
| 불꽃엄니 (Fire Fang) | firebite | Dash | None | Bite / FireBurst | Shake | Impact | None / None | 950 / 430 | 불꽃을 두른 이빨 |
| 불꽃채찍 (Fire Lash) | whip | Dash | None | Slash / HitSmall | Shake | Impact | None / None | 950 / 430 | 꼬리·채찍을 휘두르는 긴 호 |
| 불꽃의맹세 (Fire Pledge) | ground | None | ShakeSmall | GroundImpactSmall / HitHeavy | Shake | Rumble | None / None | 950 / 400 | 대상 발밑에서 지면·기둥을 솟구침 |
| 불꽃펀치 (Fire Punch) | firepunch | Dash | None | FireBurst / HitHeavy | Shake | Impact | None / None | 950 / 430 | 주먹 타격점의 불꽃 |
| 회오리불꽃 (Fire Spin) | vortex | None | None | Ring / Wave | Shake | Impact | None / Protocol | 950 / 600 | 회오리가 대상 주변을 감쌈 |
| 만나자마자 (First Impression) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 아가미물기 (Fishious Rend) | bite | Dash | None | Bite / HitSmall | Shake | Impact | None / None | 950 / 430 | 위아래 이빨로 물기 |
| 땅가르기 (Fissure) | ground | None | ShakeSmall | GroundImpactSmall / HitHeavy | Shake | Rumble | None / None | 950 / 400 | 대상 발밑에서 지면·기둥을 솟구침 |
| 바둥바둥 (Flail) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 불꽃튀기기 (Flame Burst) | fireburst | None | None | FireBurst / FireBurst | Shake | Impact | None / None | 950 / 600 | 큰 불꽃을 모아 대상에서 폭발 |
| 니트로차지 (Flame Charge) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 화염바퀴 (Flame Wheel) | spin | Spin | None | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 회전한 몸으로 타격 |
| 화염방사 (Flamethrower) | flame | None | None | FireStream / FireBurst | Shake | Stream | None / None | 950 / 600 | 사용자에서 대상으로 연속 화염 분사 |
| 플레어드라이브 (Flare Blitz) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 플래시 (Flash) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 러스터캐논 (Flash Cannon) | beam | None | None | Beam / HitSmall | Shake | Stream | None / None | 950 / 600 | 사용자와 대상을 연결하는 에너지 광선 |
| 부추기기 (Flatter) | debuff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 위협·몸짓으로 대상에 압박을 전달 |
| 플뢰르캐논 (Fleur Cannon) | beam | None | None | Beam / HitSmall | Shake | Stream | None / None | 950 / 600 | 사용자와 대상을 연결하는 에너지 광선 |
| 내던지기 (Fling) | mudorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 고체·모래·진흙·작은 물체를 던짐 |
| 퀵턴 (Flip Turn) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 둥실둥실폴 (Floaty Fall) | jump | Jump | ShakeSmall | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 도약 또는 상승 후 내려치는 공격 |
| 플라워힐 (Floral Healing) | heal | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 회복 준비; 실제 HP 회복은 결과 이벤트에서 표시 |
| 플라워가드 (Flower Shield) | buff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 기술 준비 오라; 실제 랭크 변화는 결과 이벤트에서만 재생 |
| 트릭플라워 (Flower Trick) | leaves | None | None | Leaf / HitSmall | Shake | Energy | None / None | 950 / 600 | 잎·꽃잎을 여러 궤적으로 날림 |
| 공중날기 (Fly) | jump | Jump | ShakeSmall | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 검토: 비행 준비 턴과 타격 턴 분리 |
| 플라잉프레스 (Flying Press) | jump | Jump | ShakeSmall | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 도약 또는 상승 후 내려치는 공격 |
| 기합구슬 (Focus Blast) | projectile | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 작은 에너지·별·구체를 날림 |
| 기충전 (Focus Energy) | buff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 기술 준비 오라; 실제 랭크 변화는 결과 이벤트에서만 재생 |
| 힘껏펀치 (Focus Punch) | punch | Dash | None | HitSmall / HitHeavy | Shake | Impact | None / None | 950 / 430 | 주먹을 내밀어 단일 타격 |
| 날따름 (Follow Me) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 발경 (Force Palm) | strike | Dash | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 머리·팔·뿔·도구를 이용한 근거리 타격 |
| 꿰뚫어보기 (Foresight) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 숲의저주 (Forest's Curse) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 속임수 (Foul Play) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 프리즈볼트 (Freeze Shock) | icebeam | None | None | IceBeam / HitSmall | Shake | Stream | None / None | 950 / 600 | 대상을 잇는 냉기 광선 |
| 프리즈드라이 (Freeze-Dry) | icebeam | None | None | IceBeam / HitSmall | Shake | Stream | None / None | 950 / 600 | 대상을 잇는 냉기 광선 |
| 얼어붙는시선 (Freezing Glare) | beam | None | None | Beam / HitSmall | Shake | Stream | None / None | 950 / 600 | 사용자와 대상을 연결하는 에너지 광선 |
| 꽁꽁프로스트 (Freezy Frost) | blizzard | None | None | IceImpact / HitSmall | Shake | Stream | None / None | 950 / 600 | 넓게 흩날리는 눈보라 |
| 하드플랜트 (Frenzy Plant) | ground | None | ShakeSmall | GroundImpactSmall / HitHeavy | Shake | Rumble | None / None | 950 / 400 | 대상 발밑에서 지면·기둥을 솟구침 |
| 얼음숨결 (Frost Breath) | wind | None | None | Wave / HitSmall | Shake | Stream | None / None | 950 / 600 | 바람·냉기·폭풍이 전장을 가로지름 |
| 화풀이 (Frustration) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 마구찌르기 (Fury Attack) | multihit | Dash | None | MultiHit / HitHeavy | Shake | Impact | None / None | 950 / 430 | 여러 번의 빠른 타격을 하나의 짧은 시퀀스로 표현 |
| 연속자르기 (Fury Cutter) | slash | Dash | None | Slash / HitSmall | Shake | Impact | None / None | 950 / 430 | 날 또는 날개로 베는 궤적 |
| 마구할퀴기 (Fury Swipes) | multihit | Dash | None | MultiHit / HitHeavy | Shake | Impact | None / None | 950 / 430 | 여러 번의 빠른 타격을 하나의 짧은 시퀀스로 표현 |
| 크로스썬더 (Fusion Bolt) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 크로스플레임 (Fusion Flare) | fireburst | None | None | FireBurst / FireBurst | Shake | Impact | None / None | 950 / 600 | 큰 불꽃을 모아 대상에서 폭발 |
| 미래예지 (Future Sight) | psychicpulse | None | None | Aura / HitSmall | Shake | Energy | None / None | 950 / 600 | 검토: 사용 턴과 지연 타격 구분 |
| 거다이고혹 (G-Max Befuddle) | poisonpulse | None | None | Smoke / HitSmall | Shake | Energy | None / None | 950 / 600 | 가루·가스·독 안개를 넓게 확산 |
| 거다이포격 (G-Max Cannonade) | waterbeam | None | None | WaterStream / HitSmall | Shake | Stream | None / None | 950 / 600 | 가느다란 물줄기 또는 고압수 분사 |
| 거다이백화 (G-Max Centiferno) | bind | None | None | Ring / HitSmall | Shake | Impact | None / Protocol | 950 / 600 | 조임·덫·휘감기로 대상 주변을 압박 |
| 거다이회심격 (G-Max Chi Strike) | multihit | Dash | None | MultiHit / HitHeavy | Shake | Impact | None / None | 950 / 430 | 여러 번의 빠른 타격을 하나의 짧은 시퀀스로 표현 |
| 거다이포옹 (G-Max Cuddle) | bind | None | None | Ring / HitSmall | Shake | Impact | None / Protocol | 950 / 600 | 조임·덫·휘감기로 대상 주변을 압박 |
| 거다이감쇠 (G-Max Depletion) | fireorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 불꽃 구체 또는 포탄을 발사 |
| 거다이난타 (G-Max Drum Solo) | greenorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 씨앗·생명력·식물 구체를 전달 |
| 거다이단원 (G-Max Finale) | fairyorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 빛 구체를 대상에서 확산 |
| 거다이화염구 (G-Max Fireball) | explosion | None | Flash | Explosion / HitHeavy | Shake | Impact | None / None | 950 / 600 | 중심에서 크게 확산하는 폭발 |
| 거다이포말 (G-Max Foam Burst) | wave | None | None | WaterWave / HitSmall | Shake | Stream | None / None | 950 / 600 | 전장으로 넓게 밀려오는 물결 |
| 거다이금화 (G-Max Gold Rush) | meteors | None | Darken | Projectile / Explosion | Shake | Impact | None / None | 950 / 600 | 위에서 여러 물체를 떨어뜨림 |
| 거다이천도 (G-Max Gravitas) | psychicpulse | None | None | Aura / HitSmall | Shake | Energy | None / None | 950 / 600 | 대상에 에너지·초능력 압박을 집중 |
| 거다이저격 (G-Max Hydrosnipe) | waterbeam | None | None | WaterStream / HitSmall | Shake | Stream | None / None | 950 / 600 | 가느다란 물줄기 또는 고압수 분사 |
| 거다이악취 (G-Max Malodor) | poisonpulse | None | None | Smoke / HitSmall | Shake | Energy | None / None | 950 / 600 | 가루·가스·독 안개를 넓게 확산 |
| 거다이융격 (G-Max Meltdown) | strike | Dash | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 머리·팔·뿔·도구를 이용한 근거리 타격 |
| 거다이일격 (G-Max One Blow) | multihit | Dash | None | MultiHit / HitHeavy | Shake | Impact | None / None | 950 / 430 | 여러 번의 빠른 타격을 하나의 짧은 시퀀스로 표현 |
| 거다이연격 (G-Max Rapid Flow) | multihit | Dash | None | MultiHit / HitHeavy | Shake | Impact | None / None | 950 / 430 | 여러 번의 빠른 타격을 하나의 짧은 시퀀스로 표현 |
| 거다이재생 (G-Max Replenish) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 거다이선율 (G-Max Resonance) | blizzard | None | None | IceImpact / HitSmall | Shake | Stream | None / None | 950 / 600 | 넓게 흩날리는 눈보라 |
| 거다이사진 (G-Max Sandblast) | vortex | None | None | Ring / Wave | Shake | Impact | None / Protocol | 950 / 600 | 회오리가 대상 주변을 감쌈 |
| 거다이천벌 (G-Max Smite) | fairyorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 빛 구체를 대상에서 확산 |
| 거다이수마 (G-Max Snooze) | sound | None | None | SoundWave / None | None | Voice | SoundWave / None | 950 / 600 | 목소리·울림을 사용자에서 대상까지 동심원으로 전달 |
| 거다이강철진 (G-Max Steelsurge) | ground | None | ShakeSmall | GroundImpactSmall / HitHeavy | Shake | Rumble | None / None | 950 / 400 | 대상 발밑에서 지면·기둥을 솟구침 |
| 거다이암진 (G-Max Stonesurge) | ground | None | ShakeSmall | GroundImpactSmall / HitHeavy | Shake | Rumble | None / None | 950 / 400 | 대상 발밑에서 지면·기둥을 솟구침 |
| 거다이감전 (G-Max Stun Shock) | thunder | None | None | ElectricBurst / ElectricBurst | Shake | Energy | None / None | 950 / 180 | 대상 주변에서 전격을 집중·방출 |
| 거다이감로 (G-Max Sweetness) | greenorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 씨앗·생명력·식물 구체를 전달 |
| 거다이산격 (G-Max Tartness) | greenorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 씨앗·생명력·식물 구체를 전달 |
| 거다이환영 (G-Max Terror) | vortex | None | None | Ring / Wave | Shake | Impact | None / Protocol | 950 / 600 | 회오리가 대상 주변을 감쌈 |
| 거다이편달 (G-Max Vine Lash) | whip | Dash | None | Slash / HitSmall | Shake | Impact | None / None | 950 / 430 | 꼬리·채찍을 휘두르는 긴 호 |
| 거다이분석 (G-Max Volcalith) | fall | None | ShakeSmall | Projectile / GroundImpactSmall | Shake | Impact | None / None | 950 / 600 | 대상 위에서 암석·얼음·물체가 낙하 |
| 거다이만뢰 (G-Max Volt Crash) | bolt | None | Darken | ElectricBolt / ElectricBurst | Shake | Energy | None / None | 950 / 180 | 상공에서 대상에게 수직 낙뢰 |
| 거다이옥염 (G-Max Wildfire) | fireburst | None | None | FireBurst / FireBurst | Shake | Impact | None / None | 950 / 600 | 큰 불꽃을 모아 대상에서 폭발 |
| 거다이풍격 (G-Max Wind Rage) | wind | None | None | Wave / HitSmall | Shake | Stream | None / None | 950 / 600 | 바람·냉기·폭풍이 전장을 가로지름 |
| 위액 (Gastro Acid) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 기어소서 (Gear Grind) | multihit | Dash | None | MultiHit / HitHeavy | Shake | Impact | None / None | 950 / 430 | 여러 번의 빠른 타격을 하나의 짧은 시퀀스로 표현 |
| 어시스트기어 (Gear Up) | buff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 기술 준비 오라; 실제 랭크 변화는 결과 이벤트에서만 재생 |
| 오리진즈슈퍼노바 (Genesis Supernova) | psychicpulse | None | None | Aura / HitSmall | Shake | Energy | None / None | 950 / 600 | 대상에 에너지·초능력 압박을 집중 |
| 지오컨트롤 (Geomancy) | buff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 기술 준비 오라; 실제 랭크 변화는 결과 이벤트에서만 재생 |
| 기가드레인 (Giga Drain) | drain | None | None | Aura / None | Shake | Energy | Drain / None | 950 / 600 | 대상에서 사용자로 생명력을 회수 |
| 기가임팩트 (Giga Impact) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 거대해머 (Gigaton Hammer) | strike | Dash | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 머리·팔·뿔·도구를 이용한 근거리 타격 |
| 스파킹기가볼트 (Gigavolt Havoc) | thunder | None | None | ElectricBurst / ElectricBurst | Shake | Energy | None / None | 950 / 180 | 대상 주변에서 전격을 집중·방출 |
| 블리자드랜스 (Glacial Lance) | mudorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 고체·모래·진흙·작은 물체를 던짐 |
| 얼어붙은세계 (Glaciate) | wind | None | None | Wave / HitSmall | Shake | Stream | None / None | 950 / 600 | 바람·냉기·폭풍이 전장을 가로지름 |
| 대검돌격 (Glaive Rush) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 뱀눈초리 (Glare) | debuff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 위협·몸짓으로 대상에 압박을 전달 |
| 콸콸오라 (Glitzy Glow) | psychicpulse | None | None | Aura / HitSmall | Shake | Energy | None / None | 950 / 600 | 대상에 에너지·초능력 압박을 집중 |
| 풀묶기 (Grass Knot) | bind | None | None | Ring / HitSmall | Shake | Impact | None / Protocol | 950 / 600 | 조임·덫·휘감기로 대상 주변을 압박 |
| 풀의맹세 (Grass Pledge) | ground | None | ShakeSmall | GroundImpactSmall / HitHeavy | Shake | Rumble | None / None | 950 / 400 | 대상 발밑에서 지면·기둥을 솟구침 |
| 풀피리 (Grass Whistle) | sound | None | None | SoundWave / None | None | Voice | SoundWave / None | 950 / 600 | 목소리·울림을 사용자에서 대상까지 동심원으로 전달 |
| 그래스슬라이더 (Grassy Glide) | fastdash | FastDash | None | None / HitSmall | Shake | Rush | None / None | 950 / 430 | 빠른 접근과 짧은 잔상 |
| 그래스필드 (Grassy Terrain) | terrain | None | None | Wave / None | None | Support | None / Protocol | 950 / 600 | 바닥·공간에 필드 효과 발동 |
| G의힘 (Grav Apple) | fall | None | ShakeSmall | Projectile / GroundImpactSmall | Shake | Impact | None / None | 950 / 600 | 대상 위에서 암석·얼음·물체가 낙하 |
| 중력 (Gravity) | terrain | None | None | Wave / None | None | Support | None / Protocol | 950 / 600 | 바닥·공간에 필드 효과 발동 |
| 울음소리 (Growl) | sound | None | None | SoundWave / None | None | Voice | SoundWave / None | 950 / 600 | 목소리·울림을 사용자에서 대상까지 동심원으로 전달 |
| 성장 (Growth) | buff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 기술 준비 오라; 실제 랭크 변화는 결과 이벤트에서만 재생 |
| 원념 (Grudge) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 가드셰어 (Guard Split) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 가드스왑 (Guard Swap) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 알로라의수호자 (Guardian of Alola) | psychicpulse | None | None | Aura / HitSmall | Shake | Energy | None / None | 950 / 600 | 대상에 에너지·초능력 압박을 집중 |
| 가위자르기 (Guillotine) | slash | Dash | None | Slash / HitSmall | Shake | Impact | None / None | 950 / 430 | 날 또는 날개로 베는 궤적 |
| 더스트슈트 (Gunk Shot) | poisonorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 독·산성 액체·점액을 발사 |
| 바람일으키기 (Gust) | wind | None | None | Wave / HitSmall | Shake | Stream | None / None | 950 / 600 | 바람·냉기·폭풍이 전장을 가로지름 |
| 자이로볼 (Gyro Ball) | spin | Spin | None | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 회전한 몸으로 타격 |
| 싸라기눈 (Hail) | weather | None | None | Weather / None | None | Support | None / Protocol | 950 / 600 | 날씨 발동; 지속 상태는 기존 필드 레이어가 표시 |
| 암해머 (Hammer Arm) | punch | Dash | None | HitSmall / HitHeavy | Shake | Impact | None / None | 950 / 430 | 주먹을 내밀어 단일 타격 |
| 해피타임 (Happy Hour) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 하드프레스 (Hard Press) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 단단해지기 (Harden) | buff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 기술 준비 오라; 실제 랭크 변화는 결과 이벤트에서만 재생 |
| 흑안개 (Haze) | mist | None | None | Smoke / None | None | Support | None / Protocol | 950 / 600 | 전장에 안개·바람이 잠시 확산 |
| 아프로브레이크 (Head Charge) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 양날박치기 (Head Smash) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 박치기 (Headbutt) | strike | Dash | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 머리·팔·뿔·도구를 이용한 근거리 타격 |
| 들이받기 (Headlong Rush) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 치료방울 (Heal Bell) | sound | None | None | SoundWave / None | None | Voice | SoundWave / None | 950 / 600 | 목소리·울림을 사용자에서 대상까지 동심원으로 전달 |
| 회복봉인 (Heal Block) | debuff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 위협·몸짓으로 대상에 압박을 전달 |
| 회복지령 (Heal Order) | heal | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 회복 준비; 실제 HP 회복은 결과 이벤트에서 표시 |
| 치유파동 (Heal Pulse) | heal | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 회복 준비; 실제 HP 회복은 결과 이벤트에서 표시 |
| 치유소원 (Healing Wish) | heal | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 회복 준비; 실제 HP 회복은 결과 이벤트에서 표시 |
| 하트스탬프 (Heart Stamp) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 하트스왑 (Heart Swap) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 히트스탬프 (Heat Crash) | jump | Jump | ShakeSmall | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 도약 또는 상승 후 내려치는 공격 |
| 열풍 (Heat Wave) | firewave | None | None | Wave / HitSmall | Shake | Stream | None / None | 950 / 600 | 넓게 퍼지는 뜨거운 바람 |
| 헤비봄버 (Heavy Slam) | jump | Jump | ShakeSmall | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 도약 또는 상승 후 내려치는 공격 |
| 도우미 (Helping Hand) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 병상첨병 (Hex) | psychicpulse | None | None | Aura / HitSmall | Shake | Energy | None / None | 950 / 600 | 대상에 에너지·초능력 압박을 집중 |
| 잠재파워 (Hidden Power) | projectile | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 작은 에너지·별·구체를 날림 |
| 10만마력 (High Horsepower) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 무릎차기 (High Jump Kick) | kick | Jump | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 도약하며 발로 타격 |
| 적당히손봐주기 (Hold Back) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 손에손잡기 (Hold Hands) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 손톱갈기 (Hone Claws) | buff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 기술 준비 오라; 실제 랭크 변화는 결과 이벤트에서만 재생 |
| 뿔찌르기 (Horn Attack) | strike | Dash | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 머리·팔·뿔·도구를 이용한 근거리 타격 |
| 뿔드릴 (Horn Drill) | strike | Dash | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 머리·팔·뿔·도구를 이용한 근거리 타격 |
| 우드혼 (Horn Leech) | strike | Dash | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 머리·팔·뿔·도구를 이용한 근거리 타격 |
| 멀리짖기 (Howl) | sound | None | None | SoundWave / None | None | Voice | SoundWave / None | 950 / 600 | 목소리·울림을 사용자에서 대상까지 동심원으로 전달 |
| 폭풍 (Hurricane) | vortex | None | None | Ring / Wave | Shake | Impact | None / Protocol | 950 / 600 | 회오리가 대상 주변을 감쌈 |
| 하이드로캐논 (Hydro Cannon) | waterbeam | None | None | WaterStream / HitSmall | Shake | Stream | None / None | 950 / 600 | 가느다란 물줄기 또는 고압수 분사 |
| 하이드로펌프 (Hydro Pump) | waterbeam | None | None | WaterStream / HitSmall | Shake | Stream | None / None | 950 / 600 | 가느다란 물줄기 또는 고압수 분사 |
| 하이드로스팀 (Hydro Steam) | waterbeam | None | None | WaterStream / HitSmall | Shake | Stream | None / None | 950 / 600 | 가느다란 물줄기 또는 고압수 분사 |
| 슈퍼아쿠아토네이도 (Hydro Vortex) | vortex | None | None | Ring / Wave | Shake | Impact | None / Protocol | 950 / 600 | 회오리가 대상 주변을 감쌈 |
| 파괴광선 (Hyper Beam) | beam | None | None | Beam / HitSmall | Shake | Stream | None / None | 950 / 600 | 사용자와 대상을 연결하는 에너지 광선 |
| 하이퍼드릴 (Hyper Drill) | strike | Dash | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 머리·팔·뿔·도구를 이용한 근거리 타격 |
| 필살앞니 (Hyper Fang) | bite | Dash | None | Bite / HitSmall | Shake | Impact | None / None | 950 / 430 | 위아래 이빨로 물기 |
| 하이퍼보이스 (Hyper Voice) | sound | None | None | SoundWave / None | None | Voice | SoundWave / None | 950 / 600 | 목소리·울림을 사용자에서 대상까지 동심원으로 전달 |
| 이차원러시 (Hyperspace Fury) | multihit | Dash | None | MultiHit / HitHeavy | Shake | Impact | None / None | 950 / 430 | 여러 번의 빠른 타격을 하나의 짧은 시퀀스로 표현 |
| 이차원홀 (Hyperspace Hole) | disappear | Disappear | None | None / HitHeavy | Shake | Impact | TwoTurn / Protocol | 950 / 430 | 숨었다 나타나 타격; 실제 잠복 상태는 공개 프로토콜 소유 |
| 최면술 (Hypnosis) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 아이스볼 (Ice Ball) | spin | Spin | None | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 회전한 몸으로 타격 |
| 냉동빔 (Ice Beam) | icebeam | None | None | IceBeam / IceImpact | Shake | Stream | None / None | 950 / 600 | 대상을 잇는 냉기 광선 |
| 콜드플레어 (Ice Burn) | icebeam | None | None | IceBeam / HitSmall | Shake | Stream | None / None | 950 / 600 | 대상을 잇는 냉기 광선 |
| 얼음엄니 (Ice Fang) | icebite | Dash | None | Bite / IceImpact | Shake | Impact | None / None | 950 / 430 | 냉기를 두른 이빨 |
| 아이스해머 (Ice Hammer) | punch | Dash | None | HitSmall / HitHeavy | Shake | Impact | None / None | 950 / 430 | 주먹을 내밀어 단일 타격 |
| 냉동펀치 (Ice Punch) | icepunch | Dash | None | IceImpact / HitHeavy | Shake | Impact | None / None | 950 / 430 | 주먹 타격점의 냉기 |
| 얼음뭉치 (Ice Shard) | mudorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 고체·모래·진흙·작은 물체를 던짐 |
| 아이스스피너 (Ice Spinner) | spin | Spin | None | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 회전한 몸으로 타격 |
| 고드름떨구기 (Icicle Crash) | fall | None | ShakeSmall | Projectile / GroundImpactSmall | Shake | Impact | None / None | 950 / 600 | 대상 위에서 암석·얼음·물체가 낙하 |
| 고드름침 (Icicle Spear) | mudorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 고체·모래·진흙·작은 물체를 던짐 |
| 얼어붙은바람 (Icy Wind) | wind | None | None | Wave / HitSmall | Shake | Stream | None / None | 950 / 600 | 바람·냉기·폭풍이 전장을 가로지름 |
| 봉인 (Imprison) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 불태우기 (Incinerate) | flame | None | None | FireStream / HitSmall | Shake | Stream | None / None | 950 / 600 | 사용자에서 대상으로 연속 화염 분사 |
| 백귀야행 (Infernal Parade) | blueflame | None | None | FireBurst / HitSmall | Shake | Energy | None / None | 950 / 600 | 푸른 도깨비불이 부유하며 이동 |
| 연옥 (Inferno) | fireburst | None | None | FireBurst / FireBurst | Shake | Impact | None / None | 950 / 600 | 큰 불꽃을 모아 대상에서 폭발 |
| 다이내믹풀플레임 (Inferno Overdrive) | explosion | None | Flash | Explosion / HitHeavy | Shake | Impact | None / None | 950 / 600 | 중심에서 크게 확산하는 폭발 |
| 엉겨붙기 (Infestation) | bind | None | None | Ring / HitSmall | Shake | Impact | None / Protocol | 950 / 600 | 조임·덫·휘감기로 대상 주변을 압박 |
| 뿌리박기 (Ingrain) | buff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 기술 준비 오라; 실제 랭크 변화는 결과 이벤트에서만 재생 |
| 지휘 (Instruct) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 플라스마샤워 (Ion Deluge) | terrain | None | None | Wave / None | None | Support | None / Protocol | 950 / 600 | 바닥·공간에 필드 효과 발동 |
| 철벽 (Iron Defense) | buff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 기술 준비 오라; 실제 랭크 변화는 결과 이벤트에서만 재생 |
| 아이언헤드 (Iron Head) | strike | Dash | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 머리·팔·뿔·도구를 이용한 근거리 타격 |
| 아이언테일 (Iron Tail) | whip | Dash | None | Slash / HitSmall | Shake | Impact | None / None | 950 / 430 | 꼬리·채찍을 휘두르는 긴 호 |
| 덩굴방망이 (Ivy Cudgel) | strike | Dash | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 머리·팔·뿔·도구를 이용한 근거리 타격 |
| 물고버티기 (Jaw Lock) | bite | Dash | None | Bite / HitSmall | Shake | Impact | None / None | 950 / 430 | 위아래 이빨로 물기 |
| 제트펀치 (Jet Punch) | punch | Dash | None | HitSmall / HitHeavy | Shake | Impact | None / None | 950 / 430 | 주먹을 내밀어 단일 타격 |
| 심판의뭉치 (Judgment) | projectile | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 작은 에너지·별·구체를 날림 |
| 점프킥 (Jump Kick) | kick | Jump | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 도약하며 발로 타격 |
| 정글힐 (Jungle Healing) | heal | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 회복 준비; 실제 HP 회복은 결과 이벤트에서 표시 |
| 태권당수 (Karate Chop) | strike | Dash | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 머리·팔·뿔·도구를 이용한 근거리 타격 |
| 숟가락휘기 (Kinesis) | debuff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 위협·몸짓으로 대상에 압박을 전달 |
| 킹실드 (King's Shield) | shield | None | None | Ring / None | None | Support | None / Protocol | 950 / 600 | 사용자 주변 방어막을 짧게 펼침 |
| 탁쳐서떨구기 (Knock Off) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 도각참 (Kowtow Cleave) | slash | Dash | None | Slash / HitSmall | Shake | Impact | None / None | 950 / 430 | 날 또는 날개로 베는 궤적 |
| 그라운드포스 (Land's Wrath) | quake | Shake | ShakeLarge | None / GroundImpactSmall | Shake | Rumble | Earthquake / None | 950 / 400 | 투사체 없이 전장과 참가 포켓몬을 흔드는 지진 |
| 예민해지기 (Laser Focus) | buff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 기술 준비 오라; 실제 랭크 변화는 결과 이벤트에서만 재생 |
| 분풀이 (Lash Out) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 비장의무기 (Last Resort) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 성묘 (Last Respects) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 분연 (Lava Plume) | explosion | None | Flash | Explosion / HitHeavy | Shake | Impact | None / None | 950 / 600 | 중심에서 크게 확산하는 폭발 |
| 리프블레이드 (Leaf Blade) | leafslash | Dash | None | Slash / Leaf | Shake | Impact | None / None | 950 / 430 | 잎날로 베기 |
| 리프스톰 (Leaf Storm) | leaves | None | None | Leaf / HitSmall | Shake | Energy | None / None | 950 / 600 | 잎·꽃잎을 여러 궤적으로 날림 |
| 그래스믹서 (Leaf Tornado) | vortex | None | None | Ring / Wave | Shake | Impact | None / Protocol | 950 / 600 | 회오리가 대상 주변을 감쌈 |
| 나뭇잎 (Leafage) | leaves | None | None | Leaf / HitSmall | Shake | Energy | None / None | 950 / 600 | 잎·꽃잎을 여러 궤적으로 날림 |
| 흡혈 (Leech Life) | bite | Dash | None | Bite / HitSmall | Shake | Impact | None / None | 950 / 430 | 위아래 이빨로 물기 |
| 씨뿌리기 (Leech Seed) | greenorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 씨앗·생명력·식물 구체를 전달 |
| 째려보기 (Leer) | debuff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 위협·몸짓으로 대상에 압박을 전달 |
| 투닥투닥프렌드타임 (Let's Snuggle Forever) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 핥기 (Lick) | strike | Dash | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 머리·팔·뿔·도구를 이용한 근거리 타격 |
| 생명의물방울 (Life Dew) | heal | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 회복 준비; 실제 HP 회복은 결과 이벤트에서 표시 |
| 빛의장막 (Light Screen) | shield | None | None | Ring / None | None | Support | None / Protocol | 950 / 600 | 사용자 주변 방어막을 짧게 펼침 |
| 하늘을태우는멸망의빛 (Light That Burns the Sky) | beam | None | None | Beam / HitSmall | Shake | Stream | None / None | 950 / 600 | 사용자와 대상을 연결하는 에너지 광선 |
| 파멸의빛 (Light of Ruin) | beam | None | None | Beam / HitSmall | Shake | Stream | None / None | 950 / 600 | 사용자와 대상을 연결하는 에너지 광선 |
| 아쿠아브레이크 (Liquidation) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 록온 (Lock-On) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 악마의키스 (Lovely Kiss) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 안다리걸기 (Low Kick) | kick | Jump | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 도약하며 발로 타격 |
| 로킥 (Low Sweep) | kick | Jump | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 도약하며 발로 타격 |
| 주술 (Lucky Chant) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 루미나콜리전 (Lumina Crash) | beam | None | None | Beam / HitSmall | Shake | Stream | None / None | 950 / 600 | 사용자와 대상을 연결하는 에너지 광선 |
| 초승달의기도 (Lunar Blessing) | heal | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 회복 준비; 실제 HP 회복은 결과 이벤트에서 표시 |
| 초승달춤 (Lunar Dance) | heal | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 회복 준비; 실제 HP 회복은 결과 이벤트에서 표시 |
| 덤벼들기 (Lunge) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 러스터퍼지 (Luster Purge) | beam | None | None | Beam / HitSmall | Shake | Stream | None / None | 950 / 600 | 사용자와 대상을 연결하는 에너지 광선 |
| 마하펀치 (Mach Punch) | punch | Dash | None | HitSmall / HitHeavy | Shake | Impact | None / None | 950 / 430 | 주먹을 내밀어 단일 타격 |
| 매직코트 (Magic Coat) | shield | None | None | Ring / None | None | Support | None / Protocol | 950 / 600 | 사용자 주변 방어막을 짧게 펼침 |
| 마법가루 (Magic Powder) | poisonpulse | None | None | Smoke / HitSmall | Shake | Energy | None / None | 950 / 600 | 가루·가스·독 안개를 넓게 확산 |
| 매직룸 (Magic Room) | terrain | None | None | Wave / None | None | Support | None / Protocol | 950 / 600 | 바닥·공간에 필드 효과 발동 |
| 매지컬리프 (Magical Leaf) | leaves | None | None | Leaf / HitSmall | Shake | Energy | None / None | 950 / 600 | 잎·꽃잎을 여러 궤적으로 날림 |
| 매지컬액셀 (Magical Torque) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 마그마스톰 (Magma Storm) | vortex | None | None | Ring / Wave | Shake | Impact | None / Protocol | 950 / 600 | 회오리가 대상 주변을 감쌈 |
| 마그넷봄 (Magnet Bomb) | mudorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 고체·모래·진흙·작은 물체를 던짐 |
| 전자부유 (Magnet Rise) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 자기장조작 (Magnetic Flux) | buff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 기술 준비 오라; 실제 랭크 변화는 결과 이벤트에서만 재생 |
| 매그니튜드 (Magnitude) | quake | Shake | ShakeLarge | None / GroundImpactSmall | Shake | Rumble | Earthquake / None | 950 / 400 | 투사체 없이 전장과 참가 포켓몬을 흔드는 지진 |
| 골드러시 (Make It Rain) | meteors | None | Darken | Projectile / Explosion | Shake | Impact | None / None | 950 / 600 | 위에서 여러 물체를 떨어뜨림 |
| 하이퍼다크크러셔 (Malicious Moonsault) | jump | Jump | ShakeSmall | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 도약 또는 상승 후 내려치는 공격 |
| 악독사슬 (Malignant Chain) | poisonorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 독·산성 액체·점액을 발사 |
| 마룻바닥세워막기 (Mat Block) | shield | None | None | Ring / None | None | Support | None / Protocol | 950 / 600 | 사용자 주변 방어막을 짧게 펼침 |
| 휘적휘적포 (Matcha Gotcha) | poisonorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 독·산성 액체·점액을 발사 |
| 다이제트 (Max Airstream) | wind | None | None | Wave / HitSmall | Shake | Stream | None / None | 950 / 600 | 바람·냉기·폭풍이 전장을 가로지름 |
| 다이아크 (Max Darkness) | darkpulse | None | Darken | Wave / HitSmall | Shake | Energy | None / None | 950 / 600 | 어두운 에너지를 파동으로 방출 |
| 다이번 (Max Flare) | explosion | None | Flash | Explosion / HitHeavy | Shake | Impact | None / None | 950 / 600 | 중심에서 크게 확산하는 폭발 |
| 다이웜 (Max Flutterby) | wind | None | None | Wave / HitSmall | Shake | Stream | None / None | 950 / 600 | 바람·냉기·폭풍이 전장을 가로지름 |
| 다이스트림 (Max Geyser) | waterbeam | None | None | WaterStream / HitSmall | Shake | Stream | None / None | 950 / 600 | 가느다란 물줄기 또는 고압수 분사 |
| 다이월 (Max Guard) | shield | None | None | Ring / None | None | Support | None / Protocol | 950 / 600 | 사용자 주변 방어막을 짧게 펼침 |
| 다이아이스 (Max Hailstorm) | fall | None | ShakeSmall | Projectile / GroundImpactSmall | Shake | Impact | None / None | 950 / 600 | 대상 위에서 암석·얼음·물체가 낙하 |
| 다이너클 (Max Knuckle) | strike | Dash | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 머리·팔·뿔·도구를 이용한 근거리 타격 |
| 다이썬더 (Max Lightning) | bolt | None | Darken | ElectricBolt / ElectricBurst | Shake | Energy | None / None | 950 / 180 | 상공에서 대상에게 수직 낙뢰 |
| 다이사이코 (Max Mindstorm) | beam | None | None | Beam / HitSmall | Shake | Stream | None / None | 950 / 600 | 사용자와 대상을 연결하는 에너지 광선 |
| 다이애시드 (Max Ooze) | poisonorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 독·산성 액체·점액을 발사 |
| 다이그래스 (Max Overgrowth) | greenorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 씨앗·생명력·식물 구체를 전달 |
| 다이할로우 (Max Phantasm) | shadoworb | None | Darken | ShadowOrb / Smoke | Shake | Energy | None / None | 1100 / 600 | 그림자 에너지를 모아 구체로 발사 |
| 다이어스 (Max Quake) | quake | Shake | ShakeLarge | None / GroundImpactSmall | Shake | Rumble | Earthquake / None | 950 / 400 | 투사체 없이 전장과 참가 포켓몬을 흔드는 지진 |
| 다이록 (Max Rockfall) | fall | None | ShakeSmall | Projectile / GroundImpactSmall | Shake | Impact | None / None | 950 / 600 | 대상 위에서 암석·얼음·물체가 낙하 |
| 다이페어리 (Max Starfall) | fairyorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 빛 구체를 대상에서 확산 |
| 다이스틸 (Max Steelspike) | ground | None | ShakeSmall | GroundImpactSmall / HitHeavy | Shake | Rumble | None / None | 950 / 400 | 대상 발밑에서 지면·기둥을 솟구침 |
| 다이어택 (Max Strike) | darkpulse | None | Darken | Wave / HitSmall | Shake | Energy | None / None | 950 / 600 | 어두운 에너지를 파동으로 방출 |
| 다이드라군 (Max Wyrmwind) | wind | None | None | Wave / HitSmall | Shake | Stream | None / None | 950 / 600 | 바람·냉기·폭풍이 전장을 가로지름 |
| 선취 (Me First) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 검은눈빛 (Mean Look) | debuff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 위협·몸짓으로 대상에 압박을 전달 |
| 요가포즈 (Meditate) | buff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 기술 준비 오라; 실제 랭크 변화는 결과 이벤트에서만 재생 |
| 메가드레인 (Mega Drain) | drain | None | None | Aura / None | Shake | Energy | Drain / None | 950 / 600 | 대상에서 사용자로 생명력을 회수 |
| 메가톤킥 (Mega Kick) | kick | Jump | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 도약하며 발로 타격 |
| 메가톤펀치 (Mega Punch) | punch | Dash | None | HitSmall / HitHeavy | Shake | Impact | None / None | 950 / 430 | 주먹을 내밀어 단일 타격 |
| 메가혼 (Megahorn) | strike | Dash | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 머리·팔·뿔·도구를 이용한 근거리 타격 |
| 추억의선물 (Memento) | debuff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 위협·몸짓으로 대상에 압박을 전달 |
| 문라이트블래스터 (Menacing Moonraze Maelstrom) | beam | None | None | Beam / HitSmall | Shake | Stream | None / None | 950 / 600 | 사용자와 대상을 연결하는 에너지 광선 |
| 메탈버스트 (Metal Burst) | strike | Dash | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 머리·팔·뿔·도구를 이용한 근거리 타격 |
| 메탈클로 (Metal Claw) | claw | Dash | None | Claw / HitSmall | Shake | Impact | None / None | 950 / 430 | 발톱을 교차하여 할퀴기 |
| 금속음 (Metal Sound) | sound | None | None | SoundWave / None | None | Voice | SoundWave / None | 950 / 600 | 목소리·울림을 사용자에서 대상까지 동심원으로 전달 |
| 스타어설트 (Meteor Assault) | strike | Dash | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 머리·팔·뿔·도구를 이용한 근거리 타격 |
| 메테오빔 (Meteor Beam) | beam | None | None | Beam / HitSmall | Shake | Stream | None / None | 950 / 600 | 사용자와 대상을 연결하는 에너지 광선 |
| 코멧펀치 (Meteor Mash) | punch | Dash | None | HitSmall / HitHeavy | Shake | Impact | None / None | 950 / 430 | 주먹을 내밀어 단일 타격 |
| 손가락흔들기 (Metronome) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 검토: 후속으로 실제 호출된 기술과 연출 중복 확인 |
| 파워풀에지 (Mighty Cleave) | slash | Dash | None | Slash / HitSmall | Shake | Impact | None / None | 950 / 430 | 날 또는 날개로 베는 궤적 |
| 우유마시기 (Milk Drink) | heal | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 회복 준비; 실제 HP 회복은 결과 이벤트에서 표시 |
| 흉내내기 (Mimic) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 깜짝헤드 (Mind Blown) | explosion | None | Flash | Explosion / HitHeavy | Shake | Impact | None / None | 950 / 600 | 중심에서 크게 확산하는 폭발 |
| 마음의눈 (Mind Reader) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 작아지기 (Minimize) | buff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 기술 준비 오라; 실제 랭크 변화는 결과 이벤트에서만 재생 |
| 미라클아이 (Miracle Eye) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 미러코트 (Mirror Coat) | psychicpulse | None | None | Aura / HitSmall | Shake | Energy | None / None | 950 / 600 | 대상에 에너지·초능력 압박을 집중 |
| 따라하기 (Mirror Move) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 검토: 후속 호출 기술과 연결 |
| 미러샷 (Mirror Shot) | beam | None | None | Beam / HitSmall | Shake | Stream | None / None | 950 / 600 | 사용자와 대상을 연결하는 에너지 광선 |
| 흰안개 (Mist) | mist | None | None | Smoke / None | None | Support | None / Protocol | 950 / 600 | 전장에 안개·바람이 잠시 확산 |
| 미스트볼 (Mist Ball) | fairyorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 빛 구체를 대상에서 확산 |
| 미스트버스트 (Misty Explosion) | explosion | None | Flash | Explosion / HitHeavy | Shake | Impact | None / None | 950 / 600 | 중심에서 크게 확산하는 폭발 |
| 미스트필드 (Misty Terrain) | terrain | None | None | Wave / None | None | Support | None / Protocol | 950 / 600 | 바닥·공간에 필드 효과 발동 |
| 문포스 (Moonblast) | fairyorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 빛 구체를 대상에서 확산 |
| 섀도레이 (Moongeist Beam) | beam | None | None | Beam / HitSmall | Shake | Stream | None / None | 950 / 600 | 사용자와 대상을 연결하는 에너지 광선 |
| 달빛 (Moonlight) | heal | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 회복 준비; 실제 HP 회복은 결과 이벤트에서 표시 |
| 아침햇살 (Morning Sun) | heal | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 회복 준비; 실제 HP 회복은 결과 이벤트에서 표시 |
| 킬러스핀 (Mortal Spin) | spin | Spin | None | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 회전한 몸으로 타격 |
| 빙산바람 (Mountain Gale) | fall | None | ShakeSmall | Projectile / GroundImpactSmall | Shake | Impact | None / None | 950 / 600 | 대상 위에서 암석·얼음·물체가 낙하 |
| 진흙폭탄 (Mud Bomb) | mudorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 고체·모래·진흙·작은 물체를 던짐 |
| 머드샷 (Mud Shot) | mudorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 고체·모래·진흙·작은 물체를 던짐 |
| 흙놀이 (Mud Sport) | terrain | None | None | Wave / None | None | Support | None / Protocol | 950 / 600 | 바닥·공간에 필드 효과 발동 |
| 진흙뿌리기 (Mud-Slap) | mudorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 고체·모래·진흙·작은 물체를 던짐 |
| 탁류 (Muddy Water) | wave | None | None | WaterWave / HitSmall | Shake | Stream | None / None | 950 / 600 | 전장으로 넓게 밀려오는 물결 |
| 멀티어택 (Multi-Attack) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 매지컬플레임 (Mystical Fire) | flame | None | None | FireStream / HitSmall | Shake | Stream | None / None | 950 / 600 | 사용자에서 대상으로 연속 화염 분사 |
| 신비의힘 (Mystical Power) | psychicpulse | None | None | Aura / HitSmall | Shake | Energy | None / None | 950 / 600 | 대상에 에너지·초능력 압박을 집중 |
| 나쁜음모 (Nasty Plot) | buff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 기술 준비 오라; 실제 랭크 변화는 결과 이벤트에서만 재생 |
| 자연의은혜 (Natural Gift) | mudorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 고체·모래·진흙·작은 물체를 던짐 |
| 자연의힘 (Nature Power) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 자연의분노 (Nature's Madness) | psychicpulse | None | None | Aura / HitSmall | Shake | Energy | None / None | 950 / 600 | 대상에 에너지·초능력 압박을 집중 |
| 바늘팔 (Needle Arm) | strike | Dash | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 머리·팔·뿔·도구를 이용한 근거리 타격 |
| 무한암야로의유인 (Never-Ending Nightmare) | shadoworb | None | Darken | ShadowOrb / Smoke | Shake | Energy | None / None | 1100 / 600 | 그림자 에너지를 모아 구체로 발사 |
| 나이트버스트 (Night Daze) | darkpulse | None | Darken | Wave / HitSmall | Shake | Energy | None / None | 950 / 600 | 어두운 에너지를 파동으로 방출 |
| 나이트헤드 (Night Shade) | psychicpulse | None | None | Aura / HitSmall | Shake | Energy | None / None | 950 / 600 | 대상에 에너지·초능력 압박을 집중 |
| 깜짝베기 (Night Slash) | slash | Dash | None | Slash / HitSmall | Shake | Impact | None / None | 950 / 430 | 날 또는 날개로 베는 궤적 |
| 악몽 (Nightmare) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 배수의진 (No Retreat) | buff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 기술 준비 오라; 실제 랭크 변화는 결과 이벤트에서만 재생 |
| 부르짖기 (Noble Roar) | sound | None | None | SoundWave / None | None | Voice | SoundWave / None | 950 / 600 | 목소리·울림을 사용자에서 대상까지 동심원으로 전달 |
| 포이즌액셀 (Noxious Torque) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 볼부비부비 (Nuzzle) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 데스윙 (Oblivion Wing) | drain | None | None | Aura / None | Shake | Energy | Drain / None | 950 / 600 | 대상에서 사용자로 생명력을 회수 |
| 블로킹 (Obstruct) | shield | None | None | Ring / None | None | Support | None / Protocol | 950 / 600 | 사용자 주변 방어막을 짧게 펼침 |
| 바다의심포니 (Oceanic Operetta) | wave | None | None | WaterWave / HitSmall | Shake | Stream | None / None | 950 / 600 | 전장으로 넓게 밀려오는 물결 |
| 대포무노포 (Octazooka) | waterorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 물 구체·거품을 발사 |
| 문어굳히기 (Octolock) | debuff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 위협·몸짓으로 대상에 압박을 전달 |
| 냄새구별 (Odor Sleuth) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 괴상한바람 (Ominous Wind) | wind | None | None | Wave / HitSmall | Shake | Stream | None / None | 950 / 600 | 바람·냉기·폭풍이 전장을 가로지름 |
| 한판내기 (Order Up) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 근원의파동 (Origin Pulse) | waterbeam | None | None | WaterStream / HitSmall | Shake | Stream | None / None | 950 / 600 | 가느다란 물줄기 또는 고압수 분사 |
| 역린 (Outrage) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 오버드라이브 (Overdrive) | sound | None | None | SoundWave / None | None | Voice | SoundWave / None | 950 / 600 | 목소리·울림을 사용자에서 대상까지 동심원으로 전달 |
| 오버히트 (Overheat) | fireburst | None | None | FireBurst / FireBurst | Shake | Impact | None / None | 950 / 600 | 큰 불꽃을 모아 대상에서 폭발 |
| 아픔나누기 (Pain Split) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 파라볼라차지 (Parabolic Charge) | thunder | None | None | ElectricBurst / ElectricBurst | Shake | Energy | None / None | 950 / 180 | 대상 주변에서 전격을 집중·방출 |
| 막말내뱉기 (Parting Shot) | sound | None | None | SoundWave / None | None | Voice | SoundWave / None | 950 / 600 | 목소리·울림을 사용자에서 대상까지 동심원으로 전달 |
| 고양이돈받기 (Pay Day) | mudorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 고체·모래·진흙·작은 물체를 던짐 |
| 보복 (Payback) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 쪼기 (Peck) | strike | Dash | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 머리·팔·뿔·도구를 이용한 근거리 타격 |
| 멸망의노래 (Perish Song) | sound | None | None | SoundWave / None | None | Voice | SoundWave / None | 950 / 600 | 목소리·울림을 사용자에서 대상까지 동심원으로 전달 |
| 꽃보라 (Petal Blizzard) | leaves | None | None | Leaf / HitSmall | Shake | Energy | None / None | 950 / 600 | 잎·꽃잎을 여러 궤적으로 날림 |
| 꽃잎댄스 (Petal Dance) | leaves | None | None | Leaf / HitSmall | Shake | Energy | None / None | 950 / 600 | 잎·꽃잎을 여러 궤적으로 날림 |
| 고스트다이브 (Phantom Force) | disappear | Disappear | None | None / HitHeavy | Shake | Impact | TwoTurn / Protocol | 950 / 430 | 검토: 사라짐의 지속과 복귀 |
| 포톤가이저 (Photon Geyser) | beam | None | None | Beam / HitSmall | Shake | Stream | None / None | 950 / 600 | 사용자와 대상을 연결하는 에너지 광선 |
| 피카피카썬더 (Pika Papow) | thunder | None | None | ElectricBurst / ElectricBurst | Shake | Energy | None / None | 950 / 180 | 대상 주변에서 전격을 집중·방출 |
| 바늘미사일 (Pin Missile) | mudorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 고체·모래·진흙·작은 물체를 던짐 |
| 플라스마피스트 (Plasma Fists) | electricpunch | Dash | None | ElectricBurst / HitHeavy | Shake | Impact | None / None | 950 / 430 | 주먹 타격점의 전기 |
| 친해지기 (Play Nice) | debuff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 위협·몸짓으로 대상에 압박을 전달 |
| 치근거리기 (Play Rough) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 쪼아대기 (Pluck) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 맹독엄니 (Poison Fang) | bite | Dash | None | Bite / HitSmall | Shake | Impact | None / None | 950 / 430 | 위아래 이빨로 물기 |
| 독가스 (Poison Gas) | poisonpulse | None | None | Smoke / HitSmall | Shake | Energy | None / None | 950 / 600 | 가루·가스·독 안개를 넓게 확산 |
| 독찌르기 (Poison Jab) | strike | Dash | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 머리·팔·뿔·도구를 이용한 근거리 타격 |
| 독가루 (Poison Powder) | poisonpulse | None | None | Smoke / HitSmall | Shake | Energy | None / None | 950 / 600 | 가루·가스·독 안개를 넓게 확산 |
| 독침 (Poison Sting) | mudorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 고체·모래·진흙·작은 물체를 던짐 |
| 포이즌테일 (Poison Tail) | whip | Dash | None | Slash / HitSmall | Shake | Impact | None / None | 950 / 430 | 꼬리·채찍을 휘두르는 긴 호 |
| 꽃가루경단 (Pollen Puff) | greenorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 씨앗·생명력·식물 구체를 전달 |
| 폴터가이스트 (Poltergeist) | psychicpulse | None | None | Aura / HitSmall | Shake | Energy | None / None | 950 / 600 | 대상에 에너지·초능력 압박을 집중 |
| 찍찍베기 (Population Bomb) | multihit | Dash | None | MultiHit / HitHeavy | Shake | Impact | None / None | 950 / 430 | 검토: 실제 명중 횟수에 맞춘 타격 동기화 |
| 달려들기 (Pounce) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 막치기 (Pound) | strike | Dash | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 머리·팔·뿔·도구를 이용한 근거리 타격 |
| 분진 (Powder) | poisonpulse | None | None | Smoke / HitSmall | Shake | Energy | None / None | 950 / 600 | 가루·가스·독 안개를 넓게 확산 |
| 눈싸라기 (Powder Snow) | wind | None | None | Wave / HitSmall | Shake | Stream | None / None | 950 / 600 | 바람·냉기·폭풍이 전장을 가로지름 |
| 파워젬 (Power Gem) | mudorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 고체·모래·진흙·작은 물체를 던짐 |
| 파워시프트 (Power Shift) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 파워셰어 (Power Split) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 파워스왑 (Power Swap) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 파워트릭 (Power Trick) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 기어오르기 (Power Trip) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 파워휩 (Power Whip) | whip | Dash | None | Slash / HitSmall | Shake | Impact | None / None | 950 / 430 | 꼬리·채찍을 휘두르는 긴 호 |
| 그로우펀치 (Power-Up Punch) | punch | Dash | None | HitSmall / HitHeavy | Shake | Impact | None / None | 950 / 430 | 주먹을 내밀어 단일 타격 |
| 단애의칼 (Precipice Blades) | ground | None | ShakeSmall | GroundImpactSmall / HitHeavy | Shake | Rumble | None / None | 950 / 400 | 대상 발밑에서 지면·기둥을 솟구침 |
| 프레젠트 (Present) | mudorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 고체·모래·진흙·작은 물체를 던짐 |
| 프리즘레이저 (Prismatic Laser) | beam | None | None | Beam / HitSmall | Shake | Stream | None / None | 950 / 600 | 사용자와 대상을 연결하는 에너지 광선 |
| 방어 (Protect) | shield | None | None | Ring / None | None | Support | None / Protocol | 950 / 600 | 사용자 주변 방어막을 짧게 펼침 |
| 환상빔 (Psybeam) | beam | None | None | Beam / HitSmall | Shake | Stream | None / None | 950 / 600 | 사용자와 대상을 연결하는 에너지 광선 |
| 사이코블레이드 (Psyblade) | slash | Dash | None | Slash / HitSmall | Shake | Impact | None / None | 950 / 430 | 날 또는 날개로 베는 궤적 |
| 자기암시 (Psych Up) | buff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 기술 준비 오라; 실제 랭크 변화는 결과 이벤트에서만 재생 |
| 사이코키네시스 (Psychic) | psychicpulse | None | None | Aura / HitSmall | Shake | Energy | None / None | 950 / 600 | 대상에 에너지·초능력 압박을 집중 |
| 사이코팽 (Psychic Fangs) | bite | Dash | None | Bite / HitSmall | Shake | Impact | None / None | 950 / 430 | 위아래 이빨로 물기 |
| 사이코노이즈 (Psychic Noise) | sound | None | None | SoundWave / None | None | Voice | SoundWave / None | 950 / 600 | 목소리·울림을 사용자에서 대상까지 동심원으로 전달 |
| 사이코필드 (Psychic Terrain) | terrain | None | None | Wave / None | None | Support | None / Protocol | 950 / 600 | 바닥·공간에 필드 효과 발동 |
| 사이코부스트 (Psycho Boost) | psychicpulse | None | None | Aura / HitSmall | Shake | Energy | None / None | 950 / 600 | 대상에 에너지·초능력 압박을 집중 |
| 사이코커터 (Psycho Cut) | slash | Dash | None | Slash / HitSmall | Shake | Impact | None / None | 950 / 430 | 날 또는 날개로 베는 궤적 |
| 사이코시프트 (Psycho Shift) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 배리어러시 (Psyshield Bash) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 사이코쇼크 (Psyshock) | psychicpulse | None | None | Aura / HitSmall | Shake | Energy | None / None | 950 / 600 | 대상에 에너지·초능력 압박을 집중 |
| 사이코브레이크 (Psystrike) | psychicpulse | None | None | Aura / HitSmall | Shake | Energy | None / None | 950 / 600 | 대상에 에너지·초능력 압박을 집중 |
| 사이코웨이브 (Psywave) | psychicpulse | None | None | Aura / HitSmall | Shake | Energy | None / None | 950 / 600 | 대상에 에너지·초능력 압박을 집중 |
| 진심의공격 (Pulverizing Pancake) | jump | Jump | ShakeSmall | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 도약 또는 상승 후 내려치는 공격 |
| 혼내기 (Punishment) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 정화 (Purify) | heal | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 회복 준비; 실제 HP 회복은 결과 이벤트에서 표시 |
| 따라가때리기 (Pursuit) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 화염볼 (Pyro Ball) | fireorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 불꽃 구체 또는 포탄을 발사 |
| 순서미루기 (Quash) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 전광석화 (Quick Attack) | fastdash | FastDash | None | None / HitSmall | Shake | Rush | None / None | 950 / 430 | 빠른 접근과 짧은 잔상 |
| 패스트가드 (Quick Guard) | shield | None | None | Ring / None | None | Support | None / Protocol | 950 / 600 | 사용자 주변 방어막을 짧게 펼침 |
| 나비춤 (Quiver Dance) | buff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 기술 준비 오라; 실제 랭크 변화는 결과 이벤트에서만 재생 |
| 분노 (Rage) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 분노의주먹 (Rage Fist) | punch | Dash | None | HitSmall / HitHeavy | Shake | Impact | None / None | 950 / 430 | 주먹을 내밀어 단일 타격 |
| 분노가루 (Rage Powder) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 레이징불 (Raging Bull) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 대격분 (Raging Fury) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 비바라기 (Rain Dance) | weather | None | None | Weather / None | None | Support | None / Protocol | 950 / 600 | 날씨 발동; 지속 상태는 기존 필드 레이어가 표시 |
| 고속스핀 (Rapid Spin) | spin | Spin | None | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 회전한 몸으로 타격 |
| 잎날가르기 (Razor Leaf) | leaves | None | None | Leaf / HitSmall | Shake | Energy | None / None | 950 / 600 | 잎·꽃잎을 여러 궤적으로 날림 |
| 셸블레이드 (Razor Shell) | slash | Dash | None | Slash / HitSmall | Shake | Impact | None / None | 950 / 430 | 날 또는 날개로 베는 궤적 |
| 칼바람 (Razor Wind) | airslash | None | None | Slash / HitSmall | Shake | Energy | None / None | 950 / 600 | 공기·에너지·공간을 가르는 원거리 칼날 |
| HP회복 (Recover) | heal | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 회복 준비; 실제 HP 회복은 결과 이벤트에서 표시 |
| 리사이클 (Recycle) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 리플렉터 (Reflect) | shield | None | None | Ring / None | None | Support | None / Protocol | 950 / 600 | 사용자 주변 방어막을 짧게 펼침 |
| 미러타입 (Reflect Type) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 리프레시 (Refresh) | heal | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 회복 준비; 실제 HP 회복은 결과 이벤트에서 표시 |
| 옛노래 (Relic Song) | sound | None | None | SoundWave / None | None | Voice | SoundWave / None | 950 / 600 | 목소리·울림을 사용자에서 대상까지 동심원으로 전달 |
| 잠자기 (Rest) | heal | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 회복 준비; 실제 HP 회복은 결과 이벤트에서 표시 |
| 원수갚기 (Retaliate) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 은혜갚기 (Return) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 잠재댄스 (Revelation Dance) | projectile | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 작은 에너지·별·구체를 날림 |
| 리벤지 (Revenge) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 기사회생 (Reversal) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 회생의기도 (Revival Blessing) | heal | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 검토: 비활성 아군 부활의 표시 위치 |
| 라이징볼트 (Rising Voltage) | thunder | None | None | ElectricBurst / ElectricBurst | Shake | Energy | None / None | 950 / 180 | 대상 주변에서 전격을 집중·방출 |
| 울부짖기 (Roar) | sound | None | None | SoundWave / None | None | Voice | SoundWave / None | 950 / 600 | 목소리·울림을 사용자에서 대상까지 동심원으로 전달 |
| 시간의포효 (Roar of Time) | beam | None | None | Beam / HitSmall | Shake | Stream | None / None | 950 / 600 | 사용자와 대상을 연결하는 에너지 광선 |
| 록블라스트 (Rock Blast) | mudorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 고체·모래·진흙·작은 물체를 던짐 |
| 록클라임 (Rock Climb) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 록커트 (Rock Polish) | buff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 기술 준비 오라; 실제 랭크 변화는 결과 이벤트에서만 재생 |
| 스톤샤워 (Rock Slide) | fall | None | ShakeSmall | Projectile / GroundImpactSmall | Shake | Impact | None / None | 950 / 600 | 대상 위에서 암석·얼음·물체가 낙하 |
| 바위깨기 (Rock Smash) | strike | Dash | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 머리·팔·뿔·도구를 이용한 근거리 타격 |
| 돌떨구기 (Rock Throw) | mudorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 고체·모래·진흙·작은 물체를 던짐 |
| 암석봉인 (Rock Tomb) | fall | None | ShakeSmall | Projectile / GroundImpactSmall | Shake | Impact | None / None | 950 / 600 | 대상 위에서 암석·얼음·물체가 낙하 |
| 암석포 (Rock Wrecker) | mudorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 고체·모래·진흙·작은 물체를 던짐 |
| 역할 (Role Play) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 돌려차기 (Rolling Kick) | kick | Jump | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 도약하며 발로 타격 |
| 구르기 (Rollout) | spin | Spin | None | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 회전한 몸으로 타격 |
| 날개쉬기 (Roost) | heal | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 회복 준비; 실제 HP 회복은 결과 이벤트에서 표시 |
| 일구기 (Rototiller) | buff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 기술 준비 오라; 실제 랭크 변화는 결과 이벤트에서만 재생 |
| 돌림노래 (Round) | sound | None | None | SoundWave / None | None | Voice | SoundWave / None | 950 / 600 | 목소리·울림을 사용자에서 대상까지 동심원으로 전달 |
| 카타스트로피 (Ruination) | psychicpulse | None | None | Aura / HitSmall | Shake | Energy | None / None | 950 / 600 | 대상에 에너지·초능력 압박을 집중 |
| 성스러운불꽃 (Sacred Fire) | fireburst | None | None | FireBurst / FireBurst | Shake | Impact | None / None | 950 / 600 | 큰 불꽃을 모아 대상에서 폭발 |
| 성스러운칼 (Sacred Sword) | slash | Dash | None | Slash / HitSmall | Shake | Impact | None / None | 950 / 430 | 날 또는 날개로 베는 궤적 |
| 신비의부적 (Safeguard) | shield | None | None | Ring / None | None | Support | None / Protocol | 950 / 600 | 사용자 주변 방어막을 짧게 펼침 |
| 소금절이 (Salt Cure) | mudorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 고체·모래·진흙·작은 물체를 던짐 |
| 모래뿌리기 (Sand Attack) | mudorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 고체·모래·진흙·작은 물체를 던짐 |
| 모래지옥 (Sand Tomb) | vortex | None | None | Ring / Wave | Shake | Impact | None / Protocol | 950 / 600 | 회오리가 대상 주변을 감쌈 |
| 열사의폭풍 (Sandsear Storm) | wind | None | None | Wave / HitSmall | Shake | Stream | None / None | 950 / 600 | 바람·냉기·폭풍이 전장을 가로지름 |
| 모래바람 (Sandstorm) | weather | None | None | Weather / None | None | Support | None / Protocol | 950 / 600 | 날씨 발동; 지속 상태는 기존 필드 레이어가 표시 |
| 쑥쑥봄버 (Sappy Seed) | ground | None | ShakeSmall | GroundImpactSmall / HitHeavy | Shake | Rumble | None / None | 950 / 400 | 대상 발밑에서 지면·기둥을 솟구침 |
| 절대포식회전참 (Savage Spin-Out) | bind | None | None | Ring / HitSmall | Shake | Impact | None / Protocol | 950 / 600 | 조임·덫·휘감기로 대상 주변을 압박 |
| 열탕 (Scald) | waterbeam | None | None | WaterStream / HitSmall | Shake | Stream | None / None | 950 / 600 | 가느다란 물줄기 또는 고압수 분사 |
| 스케일샷 (Scale Shot) | mudorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 고체·모래·진흙·작은 물체를 던짐 |
| 겁나는얼굴 (Scary Face) | debuff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 위협·몸짓으로 대상에 압박을 전달 |
| 열사의대지 (Scorching Sands) | mudorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 고체·모래·진흙·작은 물체를 던짐 |
| 할퀴기 (Scratch) | slash | Dash | None | Slash / HitSmall | Shake | Impact | None / None | 950 / 430 | 날 또는 날개로 베는 궤적 |
| 싫은소리 (Screech) | sound | None | None | SoundWave / None | None | Voice | SoundWave / None | 950 / 600 | 목소리·울림을 사용자에서 대상까지 동심원으로 전달 |
| 화염탄 (Searing Shot) | fireburst | None | None | FireBurst / FireBurst | Shake | Impact | None / None | 950 / 600 | 큰 불꽃을 모아 대상에서 폭발 |
| 선샤인스매셔 (Searing Sunraze Smash) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 비밀의힘 (Secret Power) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 신비의칼 (Secret Sword) | slash | Dash | None | Slash / HitSmall | Shake | Impact | None / None | 950 / 430 | 날 또는 날개로 베는 궤적 |
| 씨폭탄 (Seed Bomb) | greenorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 씨앗·생명력·식물 구체를 전달 |
| 시드플레어 (Seed Flare) | greenorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 씨앗·생명력·식물 구체를 전달 |
| 지구던지기 (Seismic Toss) | strike | Dash | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 머리·팔·뿔·도구를 이용한 근거리 타격 |
| 자폭 (Self-Destruct) | explosion | None | Flash | Explosion / HitHeavy | Shake | Impact | None / None | 950 / 600 | 중심에서 크게 확산하는 폭발 |
| 섀도볼 (Shadow Ball) | shadoworb | None | Darken | ShadowOrb / Smoke | Shake | Energy | None / None | 1100 / 600 | 그림자 에너지를 모아 구체로 발사 |
| 섀도본 (Shadow Bone) | strike | Dash | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 머리·팔·뿔·도구를 이용한 근거리 타격 |
| 섀도클로 (Shadow Claw) | claw | Dash | None | Claw / HitSmall | Shake | Impact | None / None | 950 / 430 | 발톱을 교차하여 할퀴기 |
| 섀도다이브 (Shadow Force) | disappear | Disappear | None | None / HitHeavy | Shake | Impact | TwoTurn / Protocol | 950 / 430 | 검토: 사라짐의 지속과 복귀 |
| 섀도펀치 (Shadow Punch) | punch | Dash | None | HitSmall / HitHeavy | Shake | Impact | None / None | 950 / 430 | 주먹을 내밀어 단일 타격 |
| 야습 (Shadow Sneak) | fastdash | FastDash | None | None / HitSmall | Shake | Rush | None / None | 950 / 430 | 빠른 접근과 짧은 잔상 |
| 각지기 (Sharpen) | buff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 기술 준비 오라; 실제 랭크 변화는 결과 이벤트에서만 재생 |
| 맥시멈사이브레이커 (Shattered Psyche) | psychicpulse | None | None | Aura / HitSmall | Shake | Energy | None / None | 950 / 600 | 대상에 에너지·초능력 압박을 집중 |
| 꼬리자르기 (Shed Tail) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 검토: 대타와 교체 연결 |
| 절대영도 (Sheer Cold) | psychicpulse | None | None | IceImpact / IceImpact | Shake | Energy | None / None | 950 / 600 | 검토: 절대영도 냉기 봉쇄의 공용 오라 대체 품질 |
| 셸암즈 (Shell Side Arm) | poisonorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 독·산성 액체·점액을 발사 |
| 껍질깨기 (Shell Smash) | buff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 기술 준비 오라; 실제 랭크 변화는 결과 이벤트에서만 재생 |
| 트랩셸 (Shell Trap) | explosion | None | Flash | Explosion / HitHeavy | Shake | Impact | None / None | 950 / 600 | 중심에서 크게 확산하는 폭발 |
| 농성 (Shelter) | buff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 기술 준비 오라; 실제 랭크 변화는 결과 이벤트에서만 재생 |
| 기어체인지 (Shift Gear) | buff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 기술 준비 오라; 실제 랭크 변화는 결과 이벤트에서만 재생 |
| 전격파 (Shock Wave) | electricorb | None | None | ElectricBolt / HitSmall | Shake | Energy | None / None | 950 / 600 | 짧은 전기 구체 또는 전격을 전달 |
| 모래모으기 (Shore Up) | heal | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 회복 준비; 실제 HP 회복은 결과 이벤트에서 표시 |
| 시그널빔 (Signal Beam) | beam | None | None | Beam / HitSmall | Shake | Stream | None / None | 950 / 600 | 사용자와 대상을 연결하는 에너지 광선 |
| 스레드트랩 (Silk Trap) | shield | None | None | Ring / None | None | Support | None / Protocol | 950 / 600 | 사용자 주변 방어막을 짧게 펼침 |
| 은빛바람 (Silver Wind) | wind | None | None | Wave / HitSmall | Shake | Stream | None / None | 950 / 600 | 바람·냉기·폭풍이 전장을 가로지름 |
| 심플빔 (Simple Beam) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 노래하기 (Sing) | sound | None | None | SoundWave / None | None | Voice | SoundWave / None | 950 / 600 | 목소리·울림을 사용자에서 대상까지 동심원으로 전달 |
| 섀도애로우즈스트라이크 (Sinister Arrow Raid) | mudorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 고체·모래·진흙·작은 물체를 던짐 |
| 이글이글번 (Sizzly Slide) | flame | None | None | FireStream / HitSmall | Shake | Stream | None / None | 950 / 600 | 사용자에서 대상으로 연속 화염 분사 |
| 스케치 (Sketch) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 스킬스왑 (Skill Swap) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 엄습하는일격 (Skitter Smack) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 로켓박치기 (Skull Bash) | strike | Dash | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 머리·팔·뿔·도구를 이용한 근거리 타격 |
| 불새 (Sky Attack) | jump | Jump | ShakeSmall | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 도약 또는 상승 후 내려치는 공격 |
| 프리폴 (Sky Drop) | jump | Jump | ShakeSmall | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 도약 또는 상승 후 내려치는 공격 |
| 스카이어퍼 (Sky Uppercut) | punch | Dash | None | HitSmall / HitHeavy | Shake | Impact | None / None | 950 / 430 | 주먹을 내밀어 단일 타격 |
| 게으름피우기 (Slack Off) | heal | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 회복 준비; 실제 HP 회복은 결과 이벤트에서 표시 |
| 힘껏치기 (Slam) | strike | Dash | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 머리·팔·뿔·도구를 이용한 근거리 타격 |
| 베어가르기 (Slash) | slash | Dash | None | Slash / HitSmall | Shake | Impact | None / None | 950 / 430 | 날 또는 날개로 베는 궤적 |
| 수면가루 (Sleep Powder) | poisonpulse | None | None | Smoke / HitSmall | Shake | Energy | None / None | 950 / 600 | 가루·가스·독 안개를 넓게 확산 |
| 잠꼬대 (Sleep Talk) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 검토: 후속 호출 기술과 연결 |
| 오물공격 (Sludge) | poisonorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 독·산성 액체·점액을 발사 |
| 오물폭탄 (Sludge Bomb) | poisonorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 독·산성 액체·점액을 발사 |
| 오물웨이브 (Sludge Wave) | poisonpulse | None | None | Smoke / HitSmall | Shake | Energy | None / None | 950 / 600 | 가루·가스·독 안개를 넓게 확산 |
| 떨어뜨리기 (Smack Down) | mudorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 고체·모래·진흙·작은 물체를 던짐 |
| 스마트혼 (Smart Strike) | strike | Dash | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 머리·팔·뿔·도구를 이용한 근거리 타격 |
| 정신차리기 (Smelling Salts) | strike | Dash | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 머리·팔·뿔·도구를 이용한 근거리 타격 |
| 스모그 (Smog) | poisonpulse | None | None | Smoke / HitSmall | Shake | Energy | None / None | 950 / 600 | 가루·가스·독 안개를 넓게 확산 |
| 연막 (Smokescreen) | mist | None | None | Smoke / None | None | Support | None / Protocol | 950 / 600 | 전장에 안개·바람이 잠시 확산 |
| 집게덫 (Snap Trap) | bind | None | None | Ring / HitSmall | Shake | Impact | None / Protocol | 950 / 600 | 조임·덫·휘감기로 대상 주변을 압박 |
| 바크아웃 (Snarl) | sound | None | None | SoundWave / None | None | Voice | SoundWave / None | 950 / 600 | 목소리·울림을 사용자에서 대상까지 동심원으로 전달 |
| 가로채기 (Snatch) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 노려맞히기 (Snipe Shot) | waterbeam | None | None | WaterStream / HitSmall | Shake | Stream | None / None | 950 / 600 | 가느다란 물줄기 또는 고압수 분사 |
| 코골기 (Snore) | sound | None | None | SoundWave / None | None | Voice | SoundWave / None | 950 / 600 | 목소리·울림을 사용자에서 대상까지 동심원으로 전달 |
| 설경 (Snowscape) | weather | None | None | Weather / None | None | Support | None / Protocol | 950 / 600 | 날씨 발동; 지속 상태는 기존 필드 레이어가 표시 |
| 물붓기 (Soak) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 알낳기 (Soft-Boiled) | heal | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 회복 준비; 실제 HP 회복은 결과 이벤트에서 표시 |
| 솔라빔 (Solar Beam) | greenbeam | None | None | Beam / HitSmall | Shake | Stream | None / None | 950 / 600 | 모은 빛을 직선으로 방출 |
| 솔라블레이드 (Solar Blade) | slash | Dash | None | Slash / HitSmall | Shake | Impact | None / None | 950 / 430 | 날 또는 날개로 베는 궤적 |
| 소닉붐 (Sonic Boom) | sound | None | None | SoundWave / None | None | Voice | SoundWave / None | 950 / 600 | 목소리·울림을 사용자에서 대상까지 동심원으로 전달 |
| 칠성탈혼퇴 (Soul-Stealing 7-Star Strike) | multihit | Dash | None | MultiHit / HitHeavy | Shake | Impact | None / None | 950 / 430 | 여러 번의 빠른 타격을 하나의 짧은 시퀀스로 표현 |
| 공간절단 (Spacial Rend) | airslash | None | None | Slash / HitSmall | Shake | Energy | None / None | 950 / 600 | 공기·에너지·공간을 가르는 원거리 칼날 |
| 스파크 (Spark) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 물거품아리아 (Sparkling Aria) | sound | None | None | SoundWave / None | None | Voice | SoundWave / None | 950 / 600 | 목소리·울림을 사용자에서 대상까지 동심원으로 전달 |
| 반짝반짝스톰 (Sparkly Swirl) | fairypulse | None | Flash | Wave / HitSmall | Shake | Energy | None / None | 950 / 600 | 밝은 에너지를 넓게 방출 |
| 섀도스틸 (Spectral Thief) | psychicpulse | None | None | Aura / HitSmall | Shake | Energy | None / None | 950 / 600 | 대상에 에너지·초능력 압박을 집중 |
| 스피드스왑 (Speed Swap) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 하바네로엑기스 (Spicy Extract) | buff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 기술 준비 오라; 실제 랭크 변화는 결과 이벤트에서만 재생 |
| 거미집 (Spider Web) | hazard | None | None | GroundImpactSmall / None | None | Support | None / Protocol | 950 / 600 | 상대 진영에 설치 또는 포획 표시 |
| 가시대포 (Spike Cannon) | mudorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 고체·모래·진흙·작은 물체를 던짐 |
| 압정뿌리기 (Spikes) | hazard | None | None | GroundImpactSmall / None | None | Support | None / Protocol | 950 / 600 | 상대 진영에 설치 또는 포획 표시 |
| 니들가드 (Spiky Shield) | shield | None | None | Ring / None | None | Support | None / Protocol | 950 / 600 | 사용자 주변 방어막을 짧게 펼침 |
| 휠스핀 (Spin Out) | spin | Spin | None | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 회전한 몸으로 타격 |
| 소울크래시 (Spirit Break) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 그림자꿰매기 (Spirit Shackle) | mudorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 고체·모래·진흙·작은 물체를 던짐 |
| 토해내기 (Spit Up) | projectile | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 작은 에너지·별·구체를 날림 |
| 원한 (Spite) | debuff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 위협·몸짓으로 대상에 압박을 전달 |
| 튀어오르기 (Splash) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 레이디얼에지스톰 (Splintered Stormshards) | fall | None | ShakeSmall | Projectile / GroundImpactSmall | Shake | Impact | None / None | 950 / 600 | 대상 위에서 암석·얼음·물체가 낙하 |
| 참방참방서핑 (Splishy Splash) | wave | None | None | WaterWave / HitSmall | Shake | Stream | None / None | 950 / 600 | 전장으로 넓게 밀려오는 물결 |
| 버섯포자 (Spore) | poisonpulse | None | None | Smoke / HitSmall | Shake | Energy | None / None | 950 / 600 | 가루·가스·독 안개를 넓게 확산 |
| 스포트라이트 (Spotlight) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 봄의폭풍 (Springtide Storm) | wind | None | None | Wave / HitSmall | Shake | Stream | None / None | 950 / 600 | 바람·냉기·폭풍이 전장을 가로지름 |
| 스텔스록 (Stealth Rock) | hazard | None | None | GroundImpactSmall / None | None | Support | None / Protocol | 950 / 600 | 상대 진영에 설치 또는 포획 표시 |
| 스팀버스트 (Steam Eruption) | waterbeam | None | None | WaterStream / HitSmall | Shake | Stream | None / None | 950 / 600 | 가느다란 물줄기 또는 고압수 분사 |
| 하드롤러 (Steamroller) | spin | Spin | None | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 회전한 몸으로 타격 |
| 철제광선 (Steel Beam) | beam | None | None | Beam / HitSmall | Shake | Stream | None / None | 950 / 600 | 사용자와 대상을 연결하는 에너지 광선 |
| 아이언롤러 (Steel Roller) | spin | Spin | None | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 회전한 몸으로 타격 |
| 강철날개 (Steel Wing) | slash | Dash | None | Slash / HitSmall | Shake | Impact | None / None | 950 / 430 | 날 또는 날개로 베는 궤적 |
| 끈적끈적네트 (Sticky Web) | hazard | None | None | GroundImpactSmall / None | None | Support | None / Protocol | 950 / 600 | 상대 진영에 설치 또는 포획 표시 |
| 비축하기 (Stockpile) | buff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 기술 준비 오라; 실제 랭크 변화는 결과 이벤트에서만 재생 |
| 라이트닝서프라이드 (Stoked Sparksurfer) | thunder | None | None | ElectricBurst / ElectricBurst | Shake | Energy | None / None | 950 / 180 | 대상 주변에서 전격을 집중·방출 |
| 짓밟기 (Stomp) | jump | Jump | ShakeSmall | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 도약 또는 상승 후 내려치는 공격 |
| 분함의발구르기 (Stomping Tantrum) | quake | Shake | ShakeLarge | None / GroundImpactSmall | Shake | Rumble | Earthquake / None | 950 / 400 | 투사체 없이 전장과 참가 포켓몬을 흔드는 지진 |
| 암석액스 (Stone Axe) | slash | Dash | None | Slash / HitSmall | Shake | Impact | None / None | 950 / 430 | 날 또는 날개로 베는 궤적 |
| 스톤에지 (Stone Edge) | ground | None | ShakeSmall | GroundImpactSmall / HitHeavy | Shake | Rumble | None / None | 950 / 400 | 대상 발밑에서 지면·기둥을 솟구침 |
| 어시스트파워 (Stored Power) | psychicpulse | None | None | Aura / HitSmall | Shake | Energy | None / None | 950 / 600 | 대상에 에너지·초능력 압박을 집중 |
| 업어후리기 (Storm Throw) | strike | Dash | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 머리·팔·뿔·도구를 이용한 근거리 타격 |
| 원더스팀 (Strange Steam) | wind | None | None | Wave / HitSmall | Shake | Stream | None / None | 950 / 600 | 바람·냉기·폭풍이 전장을 가로지름 |
| 괴력 (Strength) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 힘흡수 (Strength Sap) | drain | None | None | Aura / None | Shake | Energy | Drain / None | 950 / 600 | 대상에서 사용자로 생명력을 회수 |
| 실뿜기 (String Shot) | hazard | None | None | GroundImpactSmall / None | None | Support | None / Protocol | 950 / 600 | 상대 진영에 설치 또는 포획 표시 |
| 발버둥 (Struggle) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 벌레의저항 (Struggle Bug) | wind | None | None | Wave / HitSmall | Shake | Stream | None / None | 950 / 600 | 바람·냉기·폭풍이 전장을 가로지름 |
| 볼가득넣기 (Stuff Cheeks) | buff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 기술 준비 오라; 실제 랭크 변화는 결과 이벤트에서만 재생 |
| 저리가루 (Stun Spore) | poisonpulse | None | None | Smoke / HitSmall | Shake | Energy | None / None | 950 / 600 | 가루·가스·독 안개를 넓게 확산 |
| 지옥의바퀴 (Submission) | strike | Dash | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 머리·팔·뿔·도구를 이용한 근거리 타격 |
| 대타출동 (Substitute) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 검토: 대타 스프라이트의 지속·해제 표현 |
| 레이징지오프리즈 (Subzero Slammer) | blizzard | None | None | IceImpact / HitSmall | Shake | Stream | None / None | 950 / 600 | 넓게 흩날리는 눈보라 |
| 기습 (Sucker Punch) | fastdash | FastDash | None | None / HitSmall | Shake | Rush | None / None | 950 / 430 | 빠른 접근과 짧은 잔상 |
| 쾌청 (Sunny Day) | weather | None | None | Weather / None | None | Support | None / Protocol | 950 / 600 | 날씨 발동; 지속 상태는 기존 필드 레이어가 표시 |
| 메테오드라이브 (Sunsteel Strike) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 분노의앞니 (Super Fang) | bite | Dash | None | Bite / HitSmall | Shake | Impact | None / None | 950 / 430 | 위아래 이빨로 물기 |
| 썬더다이브 (Supercell Slam) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 엄청난힘 (Superpower) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 초음파 (Supersonic) | sound | None | None | SoundWave / None | None | Voice | SoundWave / None | 950 / 600 | 목소리·울림을 사용자에서 대상까지 동심원으로 전달 |
| 슈퍼소닉스카이스트라이크 (Supersonic Skystrike) | jump | Jump | ShakeSmall | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 도약 또는 상승 후 내려치는 공격 |
| 파도타기 (Surf) | wave | None | None | WaterWave / HitSmall | Shake | Stream | None / None | 950 / 600 | 전장으로 넓게 밀려오는 물결 |
| 수류연타 (Surging Strikes) | multihit | Dash | None | MultiHit / HitHeavy | Shake | Impact | None / None | 950 / 430 | 여러 번의 빠른 타격을 하나의 짧은 시퀀스로 표현 |
| 뽐내기 (Swagger) | debuff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 위협·몸짓으로 대상에 압박을 전달 |
| 꿀꺽 (Swallow) | heal | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 회복 준비; 실제 HP 회복은 결과 이벤트에서 표시 |
| 천사의키스 (Sweet Kiss) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 달콤한향기 (Sweet Scent) | debuff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 위협·몸짓으로 대상에 압박을 전달 |
| 스피드스타 (Swift) | projectile | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 작은 에너지·별·구체를 날림 |
| 바꿔치기 (Switcheroo) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 칼춤 (Swords Dance) | buff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 칼춤을 상징하는 준비 오라; 공격 상승 시각 효과는 결과에서 한 번만 재생 |
| 싱크로노이즈 (Synchronoise) | psychicpulse | None | None | Aura / HitSmall | Shake | Energy | None / None | 950 / 600 | 대상에 에너지·초능력 압박을 집중 |
| 광합성 (Synthesis) | heal | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 회복 준비; 실제 HP 회복은 결과 이벤트에서 표시 |
| 시럽봄 (Syrup Bomb) | poisonorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 독·산성 액체·점액을 발사 |
| 타키온커터 (Tachyon Cutter) | airslash | None | None | Slash / HitSmall | Shake | Energy | None / None | 950 / 600 | 공기·에너지·공간을 가르는 원거리 칼날 |
| 몸통박치기 (Tackle) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 반딧불 (Tail Glow) | buff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 기술 준비 오라; 실제 랭크 변화는 결과 이벤트에서만 재생 |
| 스위프뺨치기 (Tail Slap) | multihit | Dash | None | MultiHit / HitHeavy | Shake | Impact | None / None | 950 / 430 | 여러 번의 빠른 타격을 하나의 짧은 시퀀스로 표현 |
| 꼬리흔들기 (Tail Whip) | debuff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 위협·몸짓으로 대상에 압박을 전달 |
| 순풍 (Tailwind) | mist | None | None | Smoke / None | None | Support | None / Protocol | 950 / 600 | 전장에 안개·바람이 잠시 확산 |
| 돌진 (Take Down) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 브레이브차지 (Take Heart) | buff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 기술 준비 오라; 실제 랭크 변화는 결과 이벤트에서만 재생 |
| 타르샷 (Tar Shot) | mudorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 고체·모래·진흙·작은 물체를 던짐 |
| 도발 (Taunt) | debuff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 위협·몸짓으로 대상에 압박을 전달 |
| 눈물그렁그렁 (Tearful Look) | debuff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 위협·몸짓으로 대상에 압박을 전달 |
| 다과회 (Teatime) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 테크노버스터 (Techno Blast) | beam | None | None | Beam / HitSmall | Shake | Stream | None / None | 950 / 600 | 사용자와 대상을 연결하는 에너지 광선 |
| 라이징랜드오버 (Tectonic Rage) | quake | Shake | ShakeLarge | None / GroundImpactSmall | Shake | Rumble | Earthquake / None | 950 / 400 | 투사체 없이 전장과 참가 포켓몬을 흔드는 지진 |
| 흔들흔들댄스 (Teeter Dance) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 텔레키네시스 (Telekinesis) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 순간이동 (Teleport) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 열불내기 (Temper Flare) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 테라버스트 (Tera Blast) | beam | None | None | Beam / HitSmall | Shake | Stream | None / None | 950 / 600 | 사용자와 대상을 연결하는 에너지 광선 |
| 테라클러스터 (Tera Starstorm) | beam | None | None | Beam / HitSmall | Shake | Stream | None / None | 950 / 600 | 사용자와 대상을 연결하는 에너지 광선 |
| 대지의파동 (Terrain Pulse) | projectile | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 작은 에너지·별·구체를 날림 |
| 도둑질 (Thief) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 사우전드애로 (Thousand Arrows) | ground | None | ShakeSmall | GroundImpactSmall / HitHeavy | Shake | Rumble | None / None | 950 / 400 | 대상 발밑에서 지면·기둥을 솟구침 |
| 사우전드웨이브 (Thousand Waves) | ground | None | ShakeSmall | GroundImpactSmall / HitHeavy | Shake | Rumble | None / None | 950 / 400 | 대상 발밑에서 지면·기둥을 솟구침 |
| 난동부리기 (Thrash) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 지옥찌르기 (Throat Chop) | strike | Dash | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 머리·팔·뿔·도구를 이용한 근거리 타격 |
| 번개 (Thunder) | bolt | None | Darken | ElectricBolt / ElectricBurst | Shake | Energy | None / None | 950 / 180 | 상공에서 대상에게 수직 낙뢰 |
| 썬더프리즌 (Thunder Cage) | vortex | None | None | Ring / Wave | Shake | Impact | None / Protocol | 950 / 600 | 회오리가 대상 주변을 감쌈 |
| 번개엄니 (Thunder Fang) | electricbite | Dash | None | Bite / ElectricBurst | Shake | Impact | None / None | 950 / 430 | 전기를 두른 이빨 |
| 번개펀치 (Thunder Punch) | electricpunch | Dash | None | ElectricBurst / HitHeavy | Shake | Impact | None / None | 950 / 430 | 주먹 타격점의 전기 |
| 전기쇼크 (Thunder Shock) | electricorb | None | None | ElectricBolt / HitSmall | Shake | Energy | None / None | 950 / 600 | 짧은 전기 구체 또는 전격을 전달 |
| 전기자석파 (Thunder Wave) | electricorb | None | None | ElectricBolt / HitSmall | Shake | Energy | None / None | 950 / 600 | 짧은 전기 구체 또는 전격을 전달 |
| 10만볼트 (Thunderbolt) | thunder | None | None | ElectricBurst / ElectricBurst | Shake | Energy | None / None | 950 / 180 | 대상 주변에서 전격을 집중·방출 |
| 질풍신뢰 (Thunderclap) | thunder | None | None | ElectricBurst / ElectricBurst | Shake | Energy | None / None | 950 / 180 | 대상 주변에서 전격을 집중·방출 |
| 천둥차기 (Thunderous Kick) | kick | Jump | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 도약하며 발로 타격 |
| 간지르기 (Tickle) | debuff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 위협·몸짓으로 대상에 압박을 전달 |
| 정리정돈 (Tidy Up) | buff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 기술 준비 오라; 실제 랭크 변화는 결과 이벤트에서만 재생 |
| 뒤집어엎기 (Topsy-Turvy) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 플레어송 (Torch Song) | sound | None | None | SoundWave / None | None | Voice | SoundWave / None | 950 / 600 | 목소리·울림을 사용자에서 대상까지 동심원으로 전달 |
| 트집 (Torment) | debuff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 위협·몸짓으로 대상에 압박을 전달 |
| 맹독 (Toxic) | poisonorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 독·산성 액체·점액을 발사 |
| 독압정 (Toxic Spikes) | hazard | None | None | GroundImpactSmall / None | None | Support | None / Protocol | 950 / 600 | 상대 진영에 설치 또는 포획 표시 |
| 독실 (Toxic Thread) | hazard | None | None | GroundImpactSmall / None | None | Support | None / Protocol | 950 / 600 | 상대 진영에 설치 또는 포획 표시 |
| 개척하기 (Trailblaze) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 변신 (Transform) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 검토: 변신 전환과 복사 외형 |
| 트라이어택 (Tri Attack) | projectile | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 작은 에너지·별·구체를 날림 |
| 트릭 (Trick) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 트릭룸 (Trick Room) | terrain | None | None | Wave / None | None | Support | None / Protocol | 950 / 600 | 바닥·공간에 필드 효과 발동 |
| 핼러윈 (Trick-or-Treat) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 3연화살 (Triple Arrows) | mudorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 고체·모래·진흙·작은 물체를 던짐 |
| 트리플악셀 (Triple Axel) | kick | Jump | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 도약하며 발로 타격 |
| 트리플다이브 (Triple Dive) | multihit | Dash | None | MultiHit / HitHeavy | Shake | Impact | None / None | 950 / 430 | 여러 번의 빠른 타격을 하나의 짧은 시퀀스로 표현 |
| 트리플킥 (Triple Kick) | kick | Jump | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 도약하며 발로 타격 |
| 트로피컬킥 (Trop Kick) | kick | Jump | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 도약하며 발로 타격 |
| 마지막수단 (Trump Card) | projectile | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 작은 에너지·별·구체를 날림 |
| 트윈빔 (Twin Beam) | beam | None | None | Beam / HitSmall | Shake | Stream | None / None | 950 / 600 | 사용자와 대상을 연결하는 에너지 광선 |
| 더블니들 (Twineedle) | mudorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 고체·모래·진흙·작은 물체를 던짐 |
| 러블리스타임팩트 (Twinkle Tackle) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 회오리 (Twister) | vortex | None | None | Ring / Wave | Shake | Impact | None / Protocol | 950 / 600 | 회오리가 대상 주변을 감쌈 |
| 유턴 (U-turn) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 기선제압 (Upper Hand) | strike | Dash | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 머리·팔·뿔·도구를 이용한 근거리 타격 |
| 소란피기 (Uproar) | sound | None | None | SoundWave / None | None | Voice | SoundWave / None | 950 / 600 | 목소리·울림을 사용자에서 대상까지 동심원으로 전달 |
| V제너레이트 (V-create) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 진공파 (Vacuum Wave) | projectile | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 작은 에너지·별·구체를 날림 |
| 브이브이브레이크 (Veevee Volley) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 베놈트랩 (Venom Drench) | poisonpulse | None | None | Smoke / HitSmall | Shake | Energy | None / None | 950 / 600 | 가루·가스·독 안개를 넓게 확산 |
| 베놈쇼크 (Venoshock) | poisonorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 독·산성 액체·점액을 발사 |
| 승리의춤 (Victory Dance) | buff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 기술 준비 오라; 실제 랭크 변화는 결과 이벤트에서만 재생 |
| 덩굴채찍 (Vine Whip) | whip | Dash | None | Slash / HitSmall | Shake | Impact | None / None | 950 / 430 | 꼬리·채찍을 휘두르는 긴 호 |
| 찝기 (Vise Grip) | bind | None | None | Ring / HitSmall | Shake | Impact | None / Protocol | 950 / 600 | 조임·덫·휘감기로 대상 주변을 압박 |
| 받아던지기 (Vital Throw) | strike | Dash | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 머리·팔·뿔·도구를 이용한 근거리 타격 |
| 볼트체인지 (Volt Switch) | electricorb | None | None | ElectricBolt / HitSmall | Shake | Energy | None / None | 950 / 600 | 짧은 전기 구체 또는 전격을 전달 |
| 볼트태클 (Volt Tackle) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 잠깨움뺨치기 (Wake-Up Slap) | strike | Dash | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 머리·팔·뿔·도구를 이용한 근거리 타격 |
| 물대포 (Water Gun) | waterbeam | None | None | WaterStream / HitSmall | Shake | Stream | None / None | 950 / 600 | 가느다란 물줄기 또는 고압수 분사 |
| 물의맹세 (Water Pledge) | ground | None | ShakeSmall | GroundImpactSmall / HitHeavy | Shake | Rumble | None / None | 950 / 400 | 대상 발밑에서 지면·기둥을 솟구침 |
| 물의파동 (Water Pulse) | waterorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 물 구체·거품을 발사 |
| 물수리검 (Water Shuriken) | waterorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 물 구체·거품을 발사 |
| 물놀이 (Water Sport) | terrain | None | None | Wave / None | None | Support | None / Protocol | 950 / 600 | 바닥·공간에 필드 효과 발동 |
| 해수스파우팅 (Water Spout) | wave | None | None | WaterWave / HitSmall | Shake | Stream | None / None | 950 / 600 | 전장으로 넓게 밀려오는 물결 |
| 폭포오르기 (Waterfall) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 웨이브태클 (Wave Crash) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 웨더볼 (Weather Ball) | projectile | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 작은 에너지·별·구체를 날림 |
| 바다회오리 (Whirlpool) | vortex | None | None | Ring / Wave | Shake | Impact | None / Protocol | 950 / 600 | 회오리가 대상 주변을 감쌈 |
| 날려버리기 (Whirlwind) | mist | None | None | Smoke / None | None | Support | None / Protocol | 950 / 600 | 전장에 안개·바람이 잠시 확산 |
| 암흑강타 (Wicked Blow) | punch | Dash | None | HitSmall / HitHeavy | Shake | Impact | None / None | 950 / 430 | 주먹을 내밀어 단일 타격 |
| 다크액셀 (Wicked Torque) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 와이드가드 (Wide Guard) | shield | None | None | Ring / None | None | Support | None / Protocol | 950 / 600 | 사용자 주변 방어막을 짧게 펼침 |
| 와일드볼트 (Wild Charge) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 번개폭풍 (Wildbolt Storm) | bolt | None | Darken | ElectricBolt / ElectricBurst | Shake | Energy | None / None | 950 / 180 | 상공에서 대상에게 수직 낙뢰 |
| 도깨비불 (Will-O-Wisp) | blueflame | None | None | FireBurst / HitSmall | Shake | Energy | None / None | 950 / 600 | 푸른 도깨비불이 부유하며 이동 |
| 날개치기 (Wing Attack) | slash | Dash | None | Slash / HitSmall | Shake | Impact | None / None | 950 / 430 | 날 또는 날개로 베는 궤적 |
| 희망사항 (Wish) | heal | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 회복 준비; 실제 HP 회복은 결과 이벤트에서 표시 |
| 껍질에숨기 (Withdraw) | buff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 기술 준비 오라; 실제 랭크 변화는 결과 이벤트에서만 재생 |
| 원더룸 (Wonder Room) | terrain | None | None | Wave / None | None | Support | None / Protocol | 950 / 600 | 바닥·공간에 필드 효과 발동 |
| 우드해머 (Wood Hammer) | strike | Dash | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 머리·팔·뿔·도구를 이용한 근거리 타격 |
| 분발 (Work Up) | buff | None | None | Aura / None | None | Support | None / Protocol | 950 / 600 | 기술 준비 오라; 실제 랭크 변화는 결과 이벤트에서만 재생 |
| 고민씨 (Worry Seed) | greenorb | None | None | Projectile / HitSmall | Shake | Energy | None / None | 950 / 600 | 씨앗·생명력·식물 구체를 전달 |
| 김밥말이 (Wrap) | bind | None | None | Ring / HitSmall | Shake | Impact | None / Protocol | 950 / 600 | 조임·덫·휘감기로 대상 주변을 압박 |
| 쥐어짜기 (Wring Out) | bind | None | None | Ring / HitSmall | Shake | Impact | None / Protocol | 950 / 600 | 조임·덫·휘감기로 대상 주변을 압박 |
| 시저크로스 (X-Scissor) | slash | Dash | None | Slash / HitSmall | Shake | Impact | None / None | 950 / 430 | 날 또는 날개로 베는 궤적 |
| 하품 (Yawn) | state | None | None | Aura / None | None | Support | StateChange / Protocol | 950 / 600 | 상태·복사·교환·변신 발동; 결과는 공개 프로토콜 표시 |
| 전자포 (Zap Cannon) | electricorb | None | None | ElectricBolt / HitSmall | Shake | Energy | None / None | 950 / 600 | 짧은 전기 구체 또는 전격을 전달 |
| 사념의박치기 (Zen Headbutt) | strike | Dash | None | None / HitHeavy | Shake | Impact | None / None | 950 / 430 | 머리·팔·뿔·도구를 이용한 근거리 타격 |
| 찌리리따끔따끔 (Zing Zap) | dash | Dash | ShakeSmall | None / HitSmall | Shake | Impact | None / None | 950 / 430 | 몸통을 전진시켜 부딪치는 접촉 공격 |
| 파찌파찌액셀 (Zippy Zap) | fastdash | FastDash | None | None / HitSmall | Shake | Rush | None / None | 950 / 430 | 빠른 접근과 짧은 잔상 |

## 역산한 공용 VFX 요구 목록

existing: 기존 자산으로 제공. procedural: 코드로 표현하므로 파일 불필요. approximation: 현재 공용 대체가 있으며 후속 품질 보강 후보. 기술 이름으로 파일을 요구하지 않는다. 괄호의 기술 수는 같은 기술이 main/impact에 사용해도 한 번만 센다.

| VFX | 상태 | 사용 기술 수 | 현재 표현 | 후속 보강 |
|---|---|---|---|---|
| HitSmall | existing | 445 | hitmarker.png | 추가 파일 불필요 |
| HitHeavy | existing | 154 | impact.png | 추가 파일 불필요 |
| Slash | existing | 43 | leftslash.png + rightslash.png | 추가 파일 불필요 |
| Claw | existing | 4 | leftclaw.png + rightclaw.png | 추가 파일 불필요 |
| Bite | existing | 13 | topbite.png + bottombite.png | 추가 파일 불필요 |
| MultiHit | existing | 21 | fist.png 공용 반복 | 추가 파일 불필요 |
| Projectile | approximation | 106 | 기존 wisp·구체 PNG | 고체·별·바늘·구체의 공용 형태 및 재질 파라미터 |
| Beam | approximation | 32 | Canvas 선 + wisp stream | 직선 광선의 폭·끝점·충돌 형태 정리 |
| Stream | approximation | 1 | bluefireball stream | 숨결·입김 공용 분사 |
| FireStream | existing | 5 | flamethrower-beam.png 및 fireball stream | 추가 파일 불필요 |
| FireBurst | approximation | 16 | fireball.png 확산 | 독립적인 공용 불꽃 폭발 |
| WaterStream | approximation | 12 | waterwisp.png + Canvas 선 | 연속 물줄기 형태 |
| WaterWave | approximation | 8 | waterwisp.png 확산 | 넓은 물결 형태 |
| ElectricBolt | procedural | 10 | Canvas 수직 낙뢰 또는 electroball 구체 | 추가 파일 불필요 |
| ElectricBurst | existing | 18 | electroball.png 대상 주변 확산 | 추가 파일 불필요 |
| IceBeam | approximation | 5 | iceball.png + Canvas 선 | 연속 냉기 광선 |
| IceImpact | existing | 8 | iceball.png 확산 | 추가 파일 불필요 |
| Leaf | existing | 8 | leaf1.png + leaf2.png | 추가 파일 불필요 |
| ShadowOrb | existing | 4 | shadowball.png + blackwisp.png | 추가 파일 불필요 |
| Explosion | approximation | 15 | fireball.png + impact.png | 불꽃 재질에 한정되지 않는 공용 폭발 |
| Smoke | approximation | 27 | blackwisp·purplewisp 및 support adapter | 연기·가루의 재질과 퍼짐 |
| Aura | approximation | 217 | wisp·purplewisp 공용 오라 | 자기 강화·대상 압박·회복의 준비 오라 구분 |
| Ring | approximation | 43 | 공용 pulse·support adapter | 방어막·조임 링 |
| Wave | approximation | 52 | 공용 pulse·stream adapter | 불꽃 바람·에너지 파동의 폭과 재질 |
| Weather | approximation | 6 | 발동 support + 기존 필드 레이어 | 발동 시 날씨 입자 |
| GroundImpactSmall | approximation | 43 | mudwisp.png + impact.png | 작은 먼지·지면 균열·돌출 기둥 구분 |
| SoundWave | procedural | 36 | Canvas 동심원 | 추가 파일 불필요 |
| AuraUp | procedural | 실제 상승 결과 전체 | 공용 CSS | 추가 파일 불필요 |
| AuraDown | procedural | 실제 하락 결과 전체 | 공용 CSS | 추가 파일 불필요 |

기술별 사용처와 별도 검토 18개의 사유는 [기계 판독용 요구 목록](../assets/manifests/move-presentation-requirements.json)에도 기록한다. 모든 기술에 공용 설계가 있으며 검토 목록은 미매핑 목록이 아니다.

<!-- END GENERATED MOVE PRESENTATIONS -->
