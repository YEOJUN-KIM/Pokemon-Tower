# 현재 게임 상태

- Status: Active
- Updated: 2026-11-03
- Baseline Commit: `1c05b6f5079143ba4be7df3f3745155aee483ce7` (`main`)
- Applies To: beta.6 개발 상태; package/Windows launcher 버전 표기는 아직 `1.0.0-beta.5`

위 HEAD의 구현 상태이며 beta.6 패키징·공개 완료를 뜻하지 않는다. beta.5 공개본의 파일·해시·당시 검증은 [릴리스 기록](releases/WINDOWS_BETA_5.md)에 보존한다.

## 구현 완료

| 영역 | 현재 동작과 기준 |
|---|---|
| 타워 | 신규 Run `hundred-floor-v2`, 100층·전후반 두 지역, 50/100층 챔피언. 기존 v1/legacy와 저장된 배틀은 보존 |
| 상대 성장 | 종·기술·역할·도구·AI·기믹을 단계적으로 강화. 1–49층 정규 기믹 금지, 50층 모든 지역 챔피언 기믹 지정, 이후 Elite/Master 중심. [12구간 정책](engineering/opponent-progression.md) |
| 전투·영입 | 최대 6마리 중 3마리 출전하는 3v3. 다음 전투는 완전 회복 상태로 시작. 일반 승리 후 방금 싸운 상대 3마리 중 1마리 선택, 랜덤 리롤 후보가 아님. 옛 비수집 종 snapshot·특수 이벤트는 별도 예외 |
| 영구 성장 | 포켓몬별 ev_capacity 확장에 성장 포인트 사용; 확보한 capacity 안 EV 재분배·성격·일반 특성 변경 무료. 실제 Hidden Ability만 포켓몬별 1회 해금. Special slot은 무료 |
| 기술 | 포켓몬별 추가 합법 기술 영구 해금. 기존 move_unlocks를 알/TM과 공유하며 이미 얻은 기술은 중복 결제하지 않음. [육성·임시 가격](gameplay/COLLECTION.md) |
| 빛나는 부적 | eggFocus를 대체한 계정 전체 업그레이드. 같은 레벨을 알·타워의 별도 이로치 확률표에 적용. Scout 표/헬퍼는 준비됐지만 Scout 자체는 미구현 |
| 타워 이로치 | 상대 생성 시 packed team에 고정. 전투·재접속·재도전·영입 후보·실제 영입까지 보존. 부적 구매 후 기존 상대를 재추첨하지 않음 |
| 도감·튜토리얼 | 도감은 정보/육성, 게임 시작은 출전 편성. 스타팅 최종 진화형 27종. 초기 256P는 안내/스킵과 무관하게 최초 1회 지급 |
| 상점·재화 | 현재 Held Items / Consumables / TM. 영구 화면은 리롤·재도전·출발 지원금·빛나는 부적, 알뽑기는 별도. 가격·확률은 최종 확정 밸런스가 아님 |
| 이벤트 | 일반 이벤트·도전자·빌런 캠페인·히든보스·20종 다단계 Raid·Mirror. v2 신규 Raid/Mirror 제시는 50층 관문 이후, 기존 pending snapshot 유지 |
| 저장 | SQLite **schema 49**, 일반 정책 tower-policy-v13. Run progression·이벤트·NPC snapshot·AI 버전을 구분. [migration](engineering/DATABASE.md) |
| 운영·자산 | Node 24+ Windows production 실행·별도 사용자 DB. 외부 runtime은 lock/recipe/manifest로 복원, 원본·라이선스·출처 기록 유지 |

성장 포인트는 단순 영구 공격력 배수보다 **빌드 자유도·선택지·영구 해금**에 사용한다. EV capacity는 실제 투자 한도이므로 능력치에 영향을 주지만 종족값/공격력 배수를 추가하는 시스템은 아니다.

## 현재와 계획의 경계

- 현재: 장비 선구매 가능, v2 플레이어 기믹 발동은 **50층 전투부터** 가능. 50층 클리어 무료 기믹 선택은 아직 없다.
- Planned: 50층 클리어 후 첫 기믹 무료 선택, 추가 기믹은 기존 Held Item 4칸 pool에서 코인 구매. 별도 기믹 상점 없음.
- Planned: 등반 코인/상점 개편, Held Items / Support / Pokémon Scout 3탭·각 4카드. [ROADMAP](current/ROADMAP.md).
- **49→50 난이도 점프는 알려진 이슈**다. 즉시 상대를 너프하지 않고 등반 코인·플레이어 성장·상점 개편 후 49→50 및 필요 시 100층을 재측정한다.

## 검증 상태

위 HEAD에서 2026-11-03 직접 실행한 영구 성장·부적·이로치 unit 4파일 **31/31**, TypeScript·production build 통과. 관련 E2E와 명령은 [개발자 검증](development/DEVELOPER_COMMANDS.md#beta6-기준-검증)을 따른다. 전체 unit/E2E 또는 사람의 100층 완주가 모두 green이라는 뜻은 아니다.

이전 상대 개편의 1,000 Run×100층 및 통제 전투는 해당 변경 당시 분석이다. 원자료는 Git 제외 `artifacts/build-progression-audit/`, `artifacts/progression-audit/`에 있으며 이번 HEAD에서 전체를 다시 생성하지 않았다. 인간의 생존곡선·구매 정책은 포함하지 않는다.
