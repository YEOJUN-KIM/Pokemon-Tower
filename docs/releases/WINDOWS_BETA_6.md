# Pokémon Tower v1.0.0-beta.6

- Status: Released (GitHub prerelease, 2026-11-03)
- Updated: 2026-11-03
- Applies To: beta.6 Windows 배포본. 이전 공개본은 [beta.5 기록](WINDOWS_BETA_5.md)

Windows x64 · Node.js 24 이상 필요. ZIP을 풀고 `PokemonTower.exe`를 실행합니다. beta.5 이전 저장은 그대로 이어서 쓸 수 있고, 이미 진행 중인 Run은 원래 규칙으로 계속되며 새 Run부터 beta.6 규칙을 사용합니다.

## 이번 버전에서 달라진 점

### 100층 진행
- 새 Run은 1~100층 전체에 걸쳐 상대의 종·기술·도구·AI가 단계적으로 강해집니다. 1~49층에는 일반 상대의 특수기믹이 없고, 50층 챔피언부터 기믹을 쓰며 후반은 Elite·Master 중심입니다.
- 50층 챔피언을 넘으면 첫 기믹을 **무료로 한 개 고를 수 있습니다.** 50층 전에는 기믹 장비를 팔지 않습니다.

### 영구 성장
- 포켓몬별 EV capacity를 성장 포인트로 확장합니다. 확보한 범위 안의 EV 재분배·성격·일반 특성 변경은 무료입니다.
- 추가로 쓸 수 있는 합법 기술을 포켓몬별로 영구 해금합니다.
- 실제 숨겨진 특성(Hidden Ability)을 포켓몬별로 영구 해금합니다.
- 계정 전체에 적용되는 **빛나는 부적**으로 알·타워·스카우트의 이로치 확률이 올라갑니다.

### 등반 코인 상점
- 10층마다 **지닌 도구 / 서포트 / 포켓몬 스카우트** 세 탭을 모두 쓸 수 있고, 각 탭은 4칸입니다. 기술머신 상점은 사라졌습니다(이미 가진 기술머신은 배낭에서 그대로 사용).
- **서포트**: 한 전투에만 쓰는 전술 아이템입니다. 능력치 +1(400코인), 크리티컬커터·이펙트가드(700코인), 그리고 한 전투 동안 부유·매직가드·멀티스케일·천진·재생력 효과를 빌려주는 특수 서포트(1,500코인). 회복 상품은 없습니다.
- **포켓몬 스카우트**: 층이 오를수록 강한 포켓몬이 후보 4마리로 나옵니다. 코인으로 영입하고(6마리면 교체할 멤버 선택), 코인으로 4마리를 모두 다시 뽑을 수 있습니다. 이로치도 나올 수 있습니다. 전투 승리 후 3마리 중 고르는 영입은 그대로입니다.
- 50층 이후에는 추가 기믹 장비를 지닌 도구 칸에서 코인으로 살 수 있습니다.

### 밸런스
- 경제와 후반 난이도를 시뮬레이션으로 검증해 기본 서포트 가격을 400코인으로 조정했습니다. 모든 가격·확률은 사람의 플레이 테스트 전 **임시값**이며 이후 조정될 수 있습니다.

### 품질
- 상점 개편으로 낡은 자동 테스트를 정리하고 새 상점의 자동 테스트를 추가했습니다.

## 알려진 제한
- 49층에서 50층으로 넘어갈 때 챔피언 때문에 난이도가 크게 오르는 점은 의도된 관문이지만 체감은 플레이 테스트로 확인할 예정입니다. 일부 챔피언(Leon 등)이 특히 어렵다는 시뮬레이션 결과가 있어 조정 후보로 보류했습니다.
- 개발용 E2E 중 beta.6 이전부터 실패하던 항목이 남아 있습니다(게임 실행에는 영향 없음).

## 공개 asset과 검증

[Release v1.0.0-beta.6](https://github.com/YEOJUN-KIM/Pokemon-Tower/releases/tag/v1.0.0-beta.6)는 **prerelease**이며 Latest로 지정하지 않았다. annotated tag `v1.0.0-beta.6`은 release commit `0553a3da330a648be9a9b50e2b347ce98857ff1f`를 가리킨다(이후 이 기록만 갱신한 docs commit은 tag에 포함되지 않는다).

| 파일 | 확인한 정보 |
|---|---|
| PokemonTower-Windows-v1.0.0-beta.6.zip | 160,381,046 bytes, 11,010개 항목(단일 최상위 `PokemonTower/`) |
| PokemonTower-Windows-v1.0.0-beta.6.zip.sha256 | 검증용 sidecar |

ZIP SHA256: `bd5aad721231cfb2794b83992fd11334bf670890f6c3083f430c013ad9e76ba2`. GitHub에서 다시 내려받은 파일의 SHA-256과 크기가 로컬 산출물과 일치함을 확인했다. EXE 단독 asset은 제공하지 않는다(beta.5와 동일).

| 검증 | 결과 |
|---|---|
| unit | `tests/*.test.ts` 1,576/1,576 |
| typecheck / production build | 통과 |
| 배포본 | `player:package:verify` 통과(11,009 파일, ZIP 전체 해시), 금지 경로(.git/.env/DB/WAL/test-results/artifacts 등) 없음 |
| 실제 배포 EXE | `player:package:test` 통과: 독립 home 최초 설치·빠른 재실행·중복 실행 차단·강제 종료 정리·이전 marker에서 갱신·초기 256P·저장 유지 |
| focused E2E | run-shop, rank-rewards, maintenance-items, shop-reroll, shop-bag-ux(메뉴 Bag) 17/17 |
| 기존 실패 | beta.6 이전 commit에서도 실패하던 E2E 26건은 이번 범위 밖(STATUS 참조) |

beta.5 이전 저장·진행 중 Run 호환은 기존 migration unit test(schema 49, 기존 Run은 legacy 규칙, 신규 Run만 hundred-floor-v2)로 확인했고 실제 사용자 DB는 사용하지 않았다. 사람의 100층 완주와 다른 PC 실사용 확인은 아직 없다.
