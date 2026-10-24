# 스타팅 기본 추천 기술과 신규 게임 초기 지급

추천 기술은 src/data/starter-moves.ts 한곳에서 관리합니다. 신규 스타팅은 아래 4개를 장착하고 시작하며, 기존 자력기 전체도 계속 보유합니다. 자속은 첫 번째 타입, 두 번째 타입 순으로 배치하고 변화기는 공격기 뒤에 모았습니다.

| 포켓몬 | 장착 순서 1 → 4 |
|---|---|
| Charizard | Flamethrower → Air Slash → Dragon Pulse → Roost |
| Blastoise | Surf → Ice Beam → Dark Pulse → Flash Cannon |
| Venusaur | Giga Drain → Sludge Bomb → Earth Power → Sleep Powder |
| Meganium | Giga Drain → Earthquake → Ancient Power → Synthesis |
| Typhlosion | Eruption → Flamethrower → Shadow Ball → Focus Blast |
| Feraligatr | Liquidation → Ice Punch → Crunch → Dragon Dance |
| Sceptile | Leaf Storm → Dragon Pulse → Focus Blast → Synthesis |
| Blaziken | Flare Blitz → Close Combat → Swords Dance → Protect |
| Swampert | Waterfall → Earthquake → Ice Punch → Knock Off |
| Torterra | Wood Hammer → Earthquake → Stone Edge → Synthesis |
| Infernape | Flare Blitz → Close Combat → U-turn → Knock Off |
| Empoleon | Surf → Flash Cannon → Ice Beam → Roost |
| Serperior | Leaf Storm → Dragon Pulse → Giga Drain → Glare |
| Emboar | Flare Blitz → Close Combat → Wild Charge → Knock Off |
| Samurott | Liquidation → Megahorn → Aqua Jet → Swords Dance |
| Chesnaught | Seed Bomb → Drain Punch → Rock Slide → Synthesis |
| Delphox | Mystical Fire → Psychic → Dazzling Gleam → Nasty Plot |
| Greninja | Surf → Dark Pulse → Ice Beam → U-turn |
| Decidueye | Leaf Blade → Spirit Shackle → Low Sweep → Roost |
| Incineroar | Flare Blitz → Darkest Lariat → Will-O-Wisp → Parting Shot |
| Primarina | Sparkling Aria → Moonblast → Ice Beam → Aqua Jet |
| Rillaboom | Grassy Glide → Wood Hammer → High Horsepower → Knock Off |
| Cinderace | Pyro Ball → High Jump Kick → Sucker Punch → U-turn |
| Inteleon | Snipe Shot → Ice Beam → Dark Pulse → U-turn |
| Meowscarada | Flower Trick → Knock Off → Triple Axel → U-turn |
| Skeledirge | Torch Song → Shadow Ball → Earth Power → Slack Off |
| Quaquaval | Aqua Step → Close Combat → Ice Spinner → Swords Dance |

## 기술명과 선택 결과

- 요청한 기술은 모두 프로젝트의 기술 카탈로그와 각 포켓몬의 장착 가능 목록에서 확인했습니다. 없는 기술 때문에 다른 기술로 대체한 항목은 없습니다.
- Aqua Break는 아쿠아브레이크의 실제 내부 이름인 Liquidation으로 맞췄습니다(장크로다일·대검귀).
- 메가니움은 Ancient Power, 브리가론은 기존 게임에서 직접 회복을 배우기 쉬운 Synthesis를 선택했습니다.
- Focus Blast, Sleep Powder, Stone Edge 등 명중률이 낮은 기술과 반동 공격은 이번 요청의 대표 배치를 따릅니다. 거북왕·토대부기에는 Shell Smash를 넣지 않았습니다.

## 기본 특성 확인

| 포켓몬 | 유지한 기본 특성 | 기존 선택 가능한 특성 | 기본 상태 동작 |
|---|---|---|---|
| Blaziken | Blaze | Speed Boost | Protect로 공격 방어 가능. Blaze에서 자동 스피드 상승은 없음 |
| Serperior | Overgrow | Contrary | Leaf Storm은 특공이 2단계 하락. Contrary 선택 시 반전되며, Giga Drain도 함께 제공 |
| Rillaboom | Overgrow | Grassy Surge | Grassy Glide는 필드 없이도 풀 공격으로 사용 가능. 그래스필드가 없으면 우선도 0 |

특성 시스템과 초기 특성, 날씨·필드·아이템·메가진화 규칙은 수정하지 않았습니다. 번치코의 맹화 상태 Protect 방어 효과는 실제 전투 엔진으로 검증합니다.

## 신규 게임 초기 지급

`INITIAL_GROWTH_POINTS = TRAINING_POINT_PRICE * 32 = 256P`를 신규 게임에 최초 한 번 지급합니다. `TUTORIAL_GROWTH_POINTS`는 호환 이름입니다. 지급은 튜토리얼 선택 전에 이뤄져 진행·첫 스킵 모두 같으며 반복 요청으로 늘어나지 않습니다. 초기 지급의 원자적 처리와 기존 저장 정책은 [튜토리얼·초기 지급](TUTORIAL.md#저장과-호환)을 따릅니다.

현재 +1당 8P이므로 한 능력치를 0 → 32까지 올리거나 여러 능력치에 나눌 수 있습니다. 안내 진행에 32를 강제하지 않으며 실제 +1 저장도 인정합니다.

## 검증

서버 테스트는 27종 × 4개 고유 기술, 카탈로그·장착 적법성, 타입·변화기 순서, 자력기 보존, 기존 커스텀·영입 설정 보존을 검증합니다. 튜토리얼 테스트는 32포인트 구매, 자유 배분, 재시작·중복 요청의 지급 멱등성을 검증합니다. 브라우저에서는 256P 지급과 실제 32포인트 저장, +1만 투자한 경우의 잔액 248P, 기존 안내 흐름을 검증합니다.

2026-10-22 검증 결과: 전체 서버 테스트 1,470개와 스타팅·튜토리얼 브라우저 테스트 6개가 모두 통과했습니다. TypeScript 검사, 프로덕션 빌드, CSS 구조 검사, 문서 링크 검사도 통과했습니다. 테스트는 메모리 DB와 별도 테스트 DB에서 실행했으며 실제 계정 저장 데이터는 수정하지 않았습니다.
