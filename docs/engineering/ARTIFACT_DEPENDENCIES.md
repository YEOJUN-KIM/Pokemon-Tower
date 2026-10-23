# artifacts 참조와 입력 경계

2026-10-23 기준. 프로젝트 전체의 Git 대상 텍스트에서 `artifacts/`와 `artifacts\`를 검색하고, 무시된 artifacts 내부 Markdown의 이동 참조도 별도로 갱신했다. 아래 표는 참조 파일 전부와 행 번호다. 입력·출력이 섞인 실험 도구에는 동적 prefix/source 경로도 포함한다. 자세한 실행 조건·source hash는 해당 스크립트의 코드와 로컬 manifest를 따른다.

## 필수 의존성 해소

| 대상 | 변경 |
|---|---|
| scripts/package-deploy.mjs | docs/releases/NONCOMBAT_EVENTS_RELEASE.md; --check는 비쓰기 입력 검사 |
| scripts/audit-battle-roster.ts | docs/assets/manifests/local-pokemon-sprites.json의 동일 고정 commit; 출력 부모 생성 |
| scripts/audit-sprite-assets.mjs | 같은 공식 manifest; 실제 캐시/출력 부모 생성 |
| scripts/import-battle-roster.ts, import-pokedex.mjs | 결과 출력 부모를 생성; artifacts 사전 존재 불필요 |
| tests/pokemon-image.test.ts | 공식 mega-sprite-sources.json |
| tests/raid-final, raid-floor-simulation, room-sample, sample-audit | tests/fixtures의 작은 고정 입력; 로컬 원자료 파일 목록 검사 제거 |
| scripts/check-workspace.mjs | docs/README/scripts 안내/fixture 문서만 검사; 로컬 artifacts 없어도 통과, 공식 artifacts 링크 거부 |

## 남는 선택 입력

과거 AI·난이도 비교/요약/재생 도구는 artifacts/experiments의 cases·courses·manifest·battle JSONL·이전 보고서를 읽는다. 이는 정상 개발/빌드/배포/기본 테스트의 필수 입력이 아니다. 해당 실험을 실행하려면 로컬 원자료를 확보하거나 선행 생성 단계를 실행해야 한다. 없으면 해당 명령은 실패할 수 있다. Git 제외된 거대 원자료를 docs로 복사하거나 최신 데이터인 것처럼 대체하지 않는다. 과거 hash가 고정된 실험은 경로 변경만으로 재현 검증을 통과한다고 보장하지 않는다.

`pnpm raid:simulate` 기본 모드는 새 결과를 출력한다. `--floor-brackets`는 이전 raid-winrate-simulation 결과와 gameplay/pool/source 해시 일치를 요구하는 선택 비교 모드다. 새 clone에서 이 모드를 실행하려면 동일 코드로 전체 baseline을 먼저 생성해야 한다. 테스트용 과거 비교 fixture로 대체하면 안 된다.

QA 합성/영상 도구의 이미지 입력도 같은 실행 파이프라인의 중간 결과이며 일반 게임 입력이 아니다. 출처 생성기는 artifacts에 실행 결과를 쓰고 docs 공식 스냅샷은 자동 수정하지 않는다. 게임 src에 남은 두 경로는 과거 보고서를 가리키는 주석뿐이다.

## 파일별 전체 참조 목록

행은 이번 조사 시점이다. 코드 입력은 read/readFile/createReadStream/readdir/copy 호출의 첫 인수와 prefix/source 변수·문자열 결합을 대조했다. 표의 docs/주석 경로는 입력 의존성이 아니다. 동적 manifest 안의 경로는 같은 실험 파이프라인의 입력이다.

| 파일 | 용도 | 입력 경로 또는 검색 행 |
|---|---|---|
| `.gitignore` | 문서/주석의 로컬 경로 안내 | 11 |
| `docs/README.md` | 문서/주석의 로컬 경로 안내 | 14, 19, 23 |
| `docs/STATUS.md` | 문서/주석의 로컬 경로 안내 | 5 |
| `docs/assets/README.md` | 문서/주석의 로컬 경로 안내 | 17 |
| `docs/current/ROADMAP.md` | 문서/주석의 로컬 경로 안내 | 3, 7 |
| `docs/engineering/ARTIFACT_PROMOTION.md` | 문서/주석의 로컬 경로 안내 | 34, 35, 36, 37, 38, 39, 40, 41, 42 |
| `docs/engineering/BAG.md` | 문서/주석의 로컬 경로 안내 | 81, 101, 105, 109 |
| `docs/engineering/CHALLENGER_SELECTION_UI.md` | 문서/주석의 로컬 경로 안내 | 49 |
| `docs/engineering/CSS_STRUCTURE.md` | 문서/주석의 로컬 경로 안내 | 19 |
| `docs/engineering/MAINTENANCE.md` | 문서/주석의 로컬 경로 안내 | 9, 10, 11, 12, 25 |
| `docs/engineering/MIRROR_CHALLENGER.md` | 문서/주석의 로컬 경로 안내 | 114 |
| `docs/engineering/MOVE_EFFECTS.md` | 문서/주석의 로컬 경로 안내 | 28 |
| `docs/engineering/NPC_DATA.md` | 문서/주석의 로컬 경로 안내 | 16, 57 |
| `docs/engineering/NPC_TRAINING.md` | 문서/주석의 로컬 경로 안내 | 17, 123 |
| `docs/engineering/RAID_EVENTS.md` | 문서/주석의 로컬 경로 안내 | 3, 40 |
| `docs/engineering/README.md` | 문서/주석의 로컬 경로 안내 | 20 |
| `docs/engineering/VILLAIN_CAMPAIGNS.md` | 문서/주석의 로컬 경로 안내 | 3, 91 |
| `docs/engineering/WORKSPACE.md` | 문서/주석의 로컬 경로 안내 | 11, 12, 13, 14, 33 |
| `docs/gameplay/BATTLE.md` | 문서/주석의 로컬 경로 안내 | 41 |
| `docs/gameplay/COLLECTION.md` | 문서/주석의 로컬 경로 안내 | 23 |
| `docs/gameplay/CONTROLS.md` | 문서/주석의 로컬 경로 안내 | 3, 39 |
| `docs/gameplay/EGGS.md` | 문서/주석의 로컬 경로 안내 | 21, 38 |
| `docs/gameplay/ITEMS.md` | 문서/주석의 로컬 경로 안내 | 28 |
| `docs/gameplay/MOVE_EFFECTS_PLAN.md` | 문서/주석의 로컬 경로 안내 | 5 |
| `docs/gameplay/NPC.md` | 문서/주석의 로컬 경로 안내 | 22 |
| `docs/gameplay/README.md` | 문서/주석의 로컬 경로 안내 | 18 |
| `docs/history/BATTLE_AUDIO.md` | 문서/주석의 로컬 경로 안내 | 3, 72, 84 |
| `docs/history/README.md` | 문서/주석의 로컬 경로 안내 | 8 |
| `docs/history/REFACTORING-2026-10-18.md` | 문서/주석의 로컬 경로 안내 | 102 |
| `docs/operations/COMPUTER_MOVE.md` | 문서/주석의 로컬 경로 안내 | 85 |
| `docs/operations/DEPLOYMENT.md` | 문서/주석의 로컬 경로 안내 | 15 |
| `docs/references/POKEROGUE_REFERENCE.md` | 문서/주석의 로컬 경로 안내 | 3 |
| `docs/references/REFERENCE_GAMES.md` | 문서/주석의 로컬 경로 안내 | 3 |
| `docs/references/THIRD_PARTY.md` | 문서/주석의 로컬 경로 안내 | 23, 25, 96, 100, 161 |
| `docs/releases/NONCOMBAT_EVENTS_RELEASE.md` | 문서/주석의 로컬 경로 안내 | 38 |
| `e2e/bag.spec.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 20, 23, 27, 57, 58, 110 |
| `e2e/battle-form-preview.spec.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 23 |
| `e2e/battle-ui-polish.spec.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 34, 35, 50 |
| `e2e/challenger-events.spec.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 44, 45, 46, 67, 68, 73 |
| `e2e/challenger-menu-flow.spec.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 18 |
| `e2e/dex-filter-keyboard.spec.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 41 |
| `e2e/display-consistency.spec.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 14 |
| `e2e/dynamax-demo.spec.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 22 |
| `e2e/egg-game-menu.spec.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 80 |
| `e2e/egg-result-layout.spec.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 23 |
| `e2e/followup-feedback.spec.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 29, 40 |
| `e2e/garchomp-mega-demo.spec.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 23 |
| `e2e/hidden-shop.spec.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 16, 22 |
| `e2e/mega-zygarde.spec.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 16 |
| `e2e/messages.spec.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 37 |
| `e2e/mirror-challenger.spec.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 21, 35 |
| `e2e/move-visuals.spec.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 24, 35, 89 |
| `e2e/mystery-chest.spec.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 66, 67 |
| `e2e/next-floor-keyboard.spec.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 22 |
| `e2e/permanent-header.spec.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 18 |
| `e2e/permanent-research.spec.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 18 |
| `e2e/permanent-upgrades.spec.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 17, 20, 23, 37, 41 |
| `e2e/play-feedback.spec.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 33, 34, 58, 79 |
| `e2e/pokedex-center.spec.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 16, 30, 32, 35, 43, 62, 73, 83, 96, 97, 120 |
| `e2e/pokedex-sprite-audit.spec.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 37, 39 |
| `e2e/primal-preview.spec.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 18 |
| `e2e/raid-events.spec.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 25, 46 |
| `e2e/raid-phase-demo.spec.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 25 |
| `e2e/raid-roster.spec.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 35 |
| `e2e/raid-transition-ux.spec.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 37 |
| `e2e/rank-rewards.spec.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 25, 37, 42, 58 |
| `e2e/recruit-message-continuity.spec.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 26 |
| `e2e/regional-themes.spec.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 36, 37 |
| `e2e/run-events.spec.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 56, 76, 96, 132 |
| `e2e/selectable-forms.spec.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 22 |
| `e2e/switch-policy.spec.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 9, 35 |
| `e2e/teleport.spec.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 39, 40, 50, 57, 62 |
| `e2e/tera.spec.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 10 |
| `e2e/title-composition.spec.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 19 |
| `e2e/villain-campaign.spec.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 12 |
| `e2e/villain-tracks.spec.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 10 |
| `e2e/z-moves.spec.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 27, 30 |
| `public/vendor/showdown/pokemon/README.md` | 문서/주석의 로컬 경로 안내 | 8 |
| `scripts/README.md` | 문서/주석의 로컬 경로 안내 | 26, 30, 34 |
| `scripts/analyze-support-decisions.mjs` | 선택 실험/QA 입력·출력 | `artifacts/experiments/ai/support-player-${...}-${...}-${...}-battles.jsonl`, `artifacts/experiments/ai/support-player-${...}-${...}-v9-turns.jsonl` |
| `scripts/assemble-shiny-preview.py` | 선택 실험/QA 파이프라인 입력·출력 | 5 |
| `scripts/audit-alola-npcs.ts` | 선택 실험/QA 입력·출력 | `artifacts/experiments/balance/alola-20261018/first-impression-reproduction.json` |
| `scripts/audit-back-sprite-paths.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 8, 9 |
| `scripts/audit-battle-roster.ts` | 공식 manifest 입력 + QA 출력 (artifacts 입력 제거) | 49, 50 |
| `scripts/audit-composition-diagnostics-v2.ts` | 선택 실험/QA 입력·출력 | `artifacts/experiments/samples/composition-diagnostics-${...}-manifest.json`, `artifacts/experiments/balance/simulation-composition-diagnostics-${...}-${...}-balanced.json`, `artifacts/experiments/balance/simulation-coverage-factors-${...}-${...}-immunity-balanced.json` |
| `scripts/audit-composition-diagnostics.ts` | 선택 실험/QA 파이프라인 입력·출력 | 9, 15, 17 |
| `scripts/audit-composition-replays.ts` | 선택 실험/QA 입력·출력 | `artifacts/experiments/samples/composition-experiment-manifest.json`, `artifacts/experiments/samples/${...}-battles.jsonl` |
| `scripts/audit-composition-survivors.ts` | 선택 실험/QA 입력·출력 | `artifacts/experiments/samples/composition-diagnostics-${...}-manifest.json`, `artifacts/experiments/samples/auto-suite-${...}-cases.json`, `artifacts/experiments/samples/composition-diagnostics-${...}-${...}-battles.jsonl` |
| `scripts/audit-corrected-support.ts` | 선택 실험/QA 입력·출력 | `artifacts/experiments/ai/support-correction-manifest.json`, `artifacts/experiments/ai/observed-damage-validation-courses.json`, `artifacts/experiments/balance/simulation-immunity-climb-${...}-matchup-balanced.json`, `artifacts/experiments/balance/simulation-support-corrected-${...}-balanced.json`, `artifacts/experiments/ai/support-corrected-climb-cases.json` |
| `scripts/audit-coverage-comparison.ts` | 선택 실험/QA 입력·출력 | `artifacts/experiments/ai/coverage-compare-${...}-manifest.json`, `artifacts/experiments/ai/observed-damage-validation-courses.json`, `artifacts/experiments/balance/simulation-coverage-compare-${...}-${...}-matchup-balanced.json`, `artifacts/experiments/balance/simulation-coverage-compare-${...}-${...}-adaptive-balanced.json` |
| `scripts/audit-coverage-factors.ts` | 선택 실험/QA 입력·출력 | `artifacts/experiments/ai/coverage-factors-${...}-manifest.json`, `artifacts/experiments/ai/observed-damage-validation-courses.json`, `artifacts/experiments/balance/simulation-coverage-factors-${...}-${...}-${...}-balanced.json` |
| `scripts/audit-forms-items.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 26 |
| `scripts/audit-galar-tuning.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 21 |
| `scripts/audit-immunity-recheck.ts` | 선택 실험/QA 입력·출력 | `artifacts/experiments/ai/observed-damage-validation-courses.json`, `artifacts/experiments/balance/tower-loss-diagnosis.json`, `artifacts/experiments/ai/immunity-recheck-${...}-manifest.json`, `artifacts/experiments/ai/immunity-recheck-${...}-summary.json`, `artifacts/experiments/balance/simulation-immunity-climb-${...}-matchup-balanced.json`, `artifacts/experiments/balance/simulation-observed-climb-${...}-v9-balanced.json` |
| `scripts/audit-observed-damage.ts` | 선택 실험/QA 입력·출력 | `artifacts/experiments/ai/observed-damage-${...}-manifest.json`, `artifacts/experiments/ai/${...}-battles.jsonl`, `artifacts/experiments/ai/${...}-summary.json`, `artifacts/experiments/ai/${...}-turns.jsonl`, `artifacts/experiments/balance/simulation-${...}-balanced.json`, `artifacts/experiments/balance/simulation-observed-climb-${...}-v9-balanced.json`, `artifacts/experiments/balance/simulation-observed-climb-${...}-${...}-balanced.json` |
| `scripts/audit-opponent-learning.ts` | 선택 실험/QA 입력·출력 | `artifacts/experiments/ai/opponent-learning-${...}-manifest.json`, `artifacts/experiments/balance/simulation-opponent-learning-${...}-${...}-${...}-balanced.json`, `artifacts/experiments/balance/simulation-sample-holdout-20261011-${...}-samples-balanced.json` |
| `scripts/audit-pixel-sprites.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 26 |
| `scripts/audit-pokemon-sizes.ts` | 결과 출력/메타데이터 (artifacts 입력 없음) | 10 |
| `scripts/audit-room-sample.ts` | 선택 실험/QA 입력·출력 | `artifacts/experiments/samples/room-sample-${...}-manifest.json`, `artifacts/experiments/balance/simulation-room-sample-${...}-${...}-${...}-balanced.json`, `artifacts/experiments/balance/simulation-opponent-learning-20261011-${...}-v8-balanced.json` |
| `scripts/audit-sample-holdout.ts` | 선택 실험/QA 입력·출력 | `artifacts/experiments/samples/sample-holdout-${...}-manifest.json`, `artifacts/experiments/balance/simulation-sample-holdout-${...}-${...}-${...}-balanced.json`, `artifacts/experiments/samples/sample-holdout-${...}-${...}-${...}-trace.jsonl` |
| `scripts/audit-sample-wall-factors.ts` | 선택 실험/QA 입력·출력 | `artifacts/experiments/samples/sample-wall-factors-${...}-manifest.json`, `artifacts/experiments/ai/observed-damage-validation-courses.json`, `artifacts/experiments/balance/simulation-sample-wall-factors-${...}-${...}-${...}-balanced.json`, `artifacts/experiments/balance/simulation-coverage-factors-${...}-${...}-immunity-balanced.json`, `artifacts/experiments/samples/sample-wall-factors-${...}-${...}-${...}-trace.jsonl` |
| `scripts/audit-sprite-assets.mjs` | 공식 manifest 입력 + QA 출력 (artifacts 입력 제거) | 7, 20 |
| `scripts/audit-support-ablation.ts` | 선택 실험/QA 입력·출력 | `artifacts/experiments/ai/support-ablation-${...}-manifest.json`, `artifacts/experiments/ai/${...}-battles.jsonl`, `artifacts/experiments/ai/${...}-summary.json`, `artifacts/experiments/ai/${...}-turns.jsonl`, `artifacts/experiments/balance/simulation-${...}-balanced.json`, `artifacts/experiments/balance/simulation-ablation-climb-${...}-v9-balanced.json`, `artifacts/experiments/balance/simulation-ablation-climb-${...}-${...}-balanced.json` |
| `scripts/audit-support-player-data.mjs` | 선택 실험/QA 입력·출력 | `artifacts/experiments/ai/support-player-manifest.json`, `artifacts/experiments/ai/${...}-summary.json`, `artifacts/experiments/ai/${...}-battles.jsonl`, `artifacts/experiments/ai/${...}-turns.jsonl` |
| `scripts/audit-support-player-replays.ts` | 선택 실험/QA 입력·출력 | `artifacts/experiments/ai/support-player-manifest.json`, `artifacts/experiments/ai/${...}-battles.jsonl` |
| `scripts/audit-support-recheck.ts` | 선택 실험/QA 입력·출력 | `artifacts/experiments/ai/support-recheck-manifest.json`, `artifacts/experiments/ai/${...}-battles.jsonl`, `artifacts/experiments/ai/${...}-summary.json`, `artifacts/experiments/ai/${...}-turns.jsonl`, `artifacts/experiments/balance/simulation-${...}-balanced.json`, `artifacts/experiments/balance/simulation-support-climb-${...}-v9-balanced.json`, `artifacts/experiments/balance/simulation-support-climb-${...}-v10-balanced.json` |
| `scripts/build-hau-guzma-preservation.mjs` | 출력/임시 검사 경로 (입력 데이터 불필요) | 13 |
| `scripts/build-npc-review.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 100 |
| `scripts/capture-alola-tuning-preservation.ts` | 선택 실험/QA 입력·출력 | `artifacts/experiments/balance/alola-tuning-20261018/baseline-runtime.json`, `artifacts/experiments/balance/alola-tuning-20261018/baseline-reviewed.json`, `artifacts/experiments/balance/alola-tuning-20261018/baseline-design.json` |
| `scripts/check-ability-learning.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 35 |
| `scripts/check-alola-entry-move.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 10 |
| `scripts/clean-generated.mjs` | 명시적 로컬 출력 정리 대상 (이번에 실행하지 않음) | 8 |
| `scripts/css-snapshot.mjs` | 출력/임시 검사 경로 (입력 데이터 불필요) | 7 |
| `scripts/diagnose-opponent-returns.ts` | 선택 실험/QA 입력·출력 | `artifacts/experiments/ai/opponent-learning-20261011-manifest.json`, `artifacts/experiments/ai/opponent-learning-20261011-${...}-v8-battles.jsonl` |
| `scripts/diagnose-tower-losses.ts` | 선택 실험/QA 입력·출력 | `artifacts/experiments/ai/observed-damage-validation-courses.json`, `artifacts/experiments/balance/simulation-observed-climb-${...}-v9-balanced.json` |
| `scripts/estimate-climb-time.ts` | 선택 실험/QA 입력·출력 | `artifacts/experiments/balance/simulation-regional-v6-balanced.json` |
| `scripts/export-egg-pools.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 18 |
| `scripts/export-npc-review-csv.mjs` | 선택 실험/QA 입력·출력 | `artifacts/reports/npc/${...}` |
| `scripts/import-additional-animations.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 121, 122 |
| `scripts/import-battle-roster.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 15, 86 |
| `scripts/import-common-npc-sprites.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 27, 29 |
| `scripts/import-local-pokemon-sprites.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 65, 66 |
| `scripts/import-mega-assets.mjs` | 출력/임시 검사 경로 (입력 데이터 불필요) | 17, 32 |
| `scripts/import-pixel-sprites.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 32 |
| `scripts/import-pokedex.mjs` | 출력/임시 검사 경로 (입력 데이터 불필요) | 43, 45 |
| `scripts/import-selectable-form-animations.mjs` | 출력/임시 검사 경로 (입력 데이터 불필요) | 43, 44 |
| `scripts/index-artifacts.mjs` | 출력/임시 검사 경로 (입력 데이터 불필요) | 5 |
| `scripts/launcher-window.ps1` | 출력/임시 검사 경로 (입력 데이터 불필요) | 251, 297 |
| `scripts/measure-music-levels.mjs` | 출력/임시 검사 경로 (입력 데이터 불필요) | 49 |
| `scripts/prepare-auto-suite-v2.ts` | 결과 출력/메타데이터 (artifacts 입력 없음) | 11, 56, 62 |
| `scripts/prepare-auto-suite.ts` | 결과 출력/메타데이터 (artifacts 입력 없음) | 11, 52, 58 |
| `scripts/prepare-composition-cases.ts` | 선택 실험/QA 입력·출력 | `artifacts/experiments/samples/diverse-team-cases.json` |
| `scripts/prepare-corrected-support-cases.ts` | 선택 실험/QA 입력·출력 | `artifacts/experiments/ai/support-recheck-climb-cases.json` |
| `scripts/prepare-diverse-cases.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 13 |
| `scripts/prepare-reliable-samples.ts` | 선택 실험/QA 입력·출력 | `artifacts/experiments/samples/auto-suite-${...}-cases.json` |
| `scripts/prepare-six-z-courses.ts` | 선택 실험/QA 입력·출력 | `artifacts/experiments/balance/hundred-floor-release-courses.json` |
| `scripts/prepare-support-player-cases.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 32 |
| `scripts/prune-unevolved-sprites.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 37, 38 |
| `scripts/refresh-z-ai-traces.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 10 |
| `scripts/render-egg-background-preview.py` | 출력/임시 검사 경로 (입력 데이터 불필요) | 8 |
| `scripts/render-run-event-preview.py` | 출력/임시 검사 경로 (입력 데이터 불필요) | 8 |
| `scripts/render-sound-effects.mjs` | 출력/임시 검사 경로 (입력 데이터 불필요) | 17, 18, 21 |
| `scripts/report-alola-tuning.ts` | 선택 실험/QA 입력·출력 | `artifacts/experiments/balance/alola-tuning-20261018/baseline-reviewed.json`, `artifacts/experiments/balance/alola-tuning-20261018/full-tests.log`, `artifacts/experiments/balance/alola-tuning-20261018/e2e.log`, `artifacts/reports/npc/alola-team-data.md`, `artifacts/reports/npc/alola-named-trainers.md` |
| `scripts/report-galar-ai.ts` | 선택 실험/QA 입력·출력 | `artifacts/experiments/balance/raw/galar-ai-all-tests.log`, `artifacts/experiments/balance/raw/galar-ai-build.log` |
| `scripts/report-galar-npcs.ts` | 선택 실험/QA 입력·출력 | `artifacts/experiments/balance/galar-20261019/summary.json`, `artifacts/experiments/balance/raw/galar-all-tests-final.log` |
| `scripts/report-galar-tuning.ts` | 선택 실험/QA 입력·출력 | `artifacts/experiments/balance/raw/galar-tuning-all-tests.log` |
| `scripts/report-hau-guzma.ts` | 선택 실험/QA 입력·출력 | `artifacts/experiments/balance/hau-guzma-20261019/after-mega-manifest.json` |
| `scripts/report-hoenn-npcs.ts` | 선택 실험/QA 입력·출력 | `artifacts/experiments/balance/hoenn-20261018/verification.md` |
| `scripts/report-johto-theme-comparison.mjs` | 출력/임시 검사 경로 (입력 데이터 불필요) | 4, 88 |
| `scripts/report-kalos-npcs.ts` | 선택 실험/QA 입력·출력 | `artifacts/experiments/balance/kalos-20261018/after-lineups.json`, `artifacts/experiments/balance/kalos-20261018/baseline-runtime.json`, `artifacts/experiments/balance/kalos-20261018/validation.json`, `artifacts/experiments/balance/kalos-20261018/before-focused-manifest.json`, `artifacts/experiments/balance/kalos-20261018/after-focused-manifest.json`, `artifacts/experiments/balance/kalos-20261018/coverage/after-focused-manifest.json` |
| `scripts/report-kalos-tuning.ts` | 선택 실험/QA 입력·출력 | `artifacts/experiments/balance/kalos-20261018/after-focused-manifest.json`, `artifacts/experiments/balance/kalos-tuning-20261018/baseline-reviewed.json`, `artifacts/experiments/balance/kalos-tuning-20261018/final/after-lineups.json`, `artifacts/experiments/balance/kalos-tuning-20261018/validation.json`, `artifacts/experiments/balance/kalos-tuning-20261018/holdout-cases.json` |
| `scripts/report-kanto-npc-balance.mjs` | 출력/임시 검사 경로 (입력 데이터 불필요) | 12, 36 |
| `scripts/report-magma-executives.ts` | 선택 실험/QA 입력·출력 | `artifacts/experiments/balance/magma-executives-20261018/after-lineups.json`, `artifacts/experiments/balance/magma-executives-20261018/before-lineups.json`, `artifacts/experiments/balance/magma-executives-20261018/baseline-runtime.json`, `artifacts/experiments/balance/magma-executives-20261018/baseline-source.json`, `artifacts/experiments/balance/magma-executives-20261018/traces`, `artifacts/experiments/balance/magma-executives-20261018/traces/${...}`, `artifacts/experiments/balance/magma-executives-20261018/before-focused-manifest.json`, `artifacts/experiments/balance/magma-executives-20261018/after-focused-manifest.json`, `artifacts/experiments/balance/magma-executives-20261018/validation-last/after-focused-manifest.json`, `artifacts/experiments/balance/magma-executives-20261018/verification.md`, `artifacts/reports/npc/hoenn-named-trainers.md`, `artifacts/reports/npc/hoenn-named-trainer-balance-report.md` |
| `scripts/report-named-selection.mjs` | 출력/임시 검사 경로 (입력 데이터 불필요) | 5, 19 |
| `scripts/report-npc-training.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 57, 58, 59 |
| `scripts/report-paldea-npcs.ts` | 선택 실험/QA 입력·출력 | `artifacts/experiments/balance/paldea-20261019/summary.json`, `artifacts/experiments/balance/paldea-20261019/battles.json`, `artifacts/experiments/balance/paldea-20261019/logs.jsonl`, `artifacts/experiments/balance/raw/paldea-all-tests.log` |
| `scripts/report-paldea-round2.ts` | 선택 실험/QA 입력·출력 | `artifacts/experiments/balance/raw/paldea-round2-all-tests.log` |
| `scripts/report-paldea-tuning.ts` | 선택 실험/QA 입력·출력 | `artifacts/experiments/balance/paldea-tuning-20261019/before/summary.json`, `artifacts/experiments/balance/paldea-tuning-20261019/after/summary.json`, `artifacts/experiments/balance/raw/paldea-tuning-all-tests.log` |
| `scripts/report-raid-roster.ts` | 선택 실험/QA 입력·출력 | `artifacts/reports/raid-roster-validation.json` |
| `scripts/report-sinnoh-npcs.ts` | 선택 실험/QA 입력·출력 | `artifacts/experiments/balance/sinnoh-20261018/after-lineups.json`, `artifacts/experiments/balance/sinnoh-20261018/baseline-runtime.json`, `artifacts/experiments/balance/sinnoh-20261018/validation.json` |
| `scripts/report-tower-themes.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 12, 13 |
| `scripts/report-trainer-samples.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 10, 12 |
| `scripts/report-unova-npcs.ts` | 선택 실험/QA 입력·출력 | `artifacts/experiments/balance/unova-20261018/after-lineups.json`, `artifacts/experiments/balance/unova-20261018/baseline-runtime.json`, `artifacts/experiments/balance/unova-20261018/validation.json`, `artifacts/experiments/balance/unova-20261018/after-focused-manifest.json`, `artifacts/experiments/balance/unova-20261018/before-focused-manifest.json`, `artifacts/experiments/balance/unova-20261018/route/after-route-manifest.json`, `artifacts/experiments/balance/unova-20261018/skyla-facade/electric-matchup.json` |
| `scripts/report-z-ai.mjs` | 출력/임시 검사 경로 (입력 데이터 불필요) | 5, 23, 120, 127 |
| `scripts/review-kanto-npc-samples.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 152 |
| `scripts/run-auto-suite.mjs` | 선택 실험/QA 입력·출력 | `artifacts/experiments/samples/auto-suite-${...}-manifest.json` |
| `scripts/run-composition-diagnostics-v2.mjs` | 선택 실험/QA 입력·출력 | `artifacts/experiments/ai/coverage-factors-${...}-manifest.json` |
| `scripts/run-composition-diagnostics.mjs` | 선택 실험/QA 입력·출력 | `artifacts/experiments/ai/coverage-factors-${...}-manifest.json` |
| `scripts/run-composition-simulation.mjs` | 선택 실험/QA 입력·출력 | `artifacts/experiments/samples/composition-team-cases.json`, `artifacts/experiments/samples/composition-experiment-manifest.json`, `artifacts/experiments/balance/simulation-${...}-balanced.json` |
| `scripts/run-coverage-comparison.mjs` | 선택 실험/QA 입력·출력 | `artifacts/experiments/samples/auto-suite-${...}-manifest.json` |
| `scripts/run-coverage-factors.mjs` | 선택 실험/QA 입력·출력 | `artifacts/experiments/samples/auto-suite-${...}-manifest.json` |
| `scripts/run-diverse-simulation.mjs` | 선택 실험/QA 입력·출력 | `artifacts/experiments/samples/diverse-team-cases.json` |
| `scripts/run-observed-damage.mjs` | 선택 실험/QA 입력·출력 | `artifacts/experiments/ai/observed-damage-selection.json`, `artifacts/experiments/ai/observed-damage-${...}-manifest.json`, `artifacts/experiments/ai/${...}-summary.json`, `artifacts/experiments/balance/simulation-${...}-balanced.json`, `artifacts/experiments/ai/observed-damage-dev-${...}-${...}-summary.json` |
| `scripts/run-opponent-learning.mjs` | 선택 실험/QA 입력·출력 | `artifacts/experiments/samples/sample-holdout-20261011-manifest.json` |
| `scripts/run-room-sample.mjs` | 선택 실험/QA 입력·출력 | `artifacts/experiments/ai/opponent-learning-20261011-manifest.json`, `artifacts/experiments/samples/reliable-samples-20261010-cases.json` |
| `scripts/run-sample-holdout.mjs` | 선택 실험/QA 입력·출력 | `artifacts/experiments/samples/sample-wall-factors-20261010-manifest.json`, `artifacts/experiments`, `artifacts/experiments/samples/sample-holdout-${...}-courses.json` |
| `scripts/run-sample-wall-factors.mjs` | 결과 출력/메타데이터 (artifacts 입력 없음) | 5, 6, 9, 16 |
| `scripts/run-support-ablation.mjs` | 선택 실험/QA 입력·출력 | `artifacts/experiments/ai/support-ablation-selection.json`, `artifacts/experiments/ai/support-ablation-${...}-manifest.json`, `artifacts/experiments/ai/${...}-summary.json`, `artifacts/experiments/balance/simulation-${...}-balanced.json`, `artifacts/experiments/ai/support-ablation-dev-${...}-${...}-summary.json` |
| `scripts/run-support-player-simulation.mjs` | 선택 실험/QA 입력·출력 | `artifacts/experiments/ai/support-player-manifest.json`, `artifacts/experiments/ai/${...}-summary.json` |
| `scripts/run-support-recheck.mjs` | 선택 실험/QA 입력·출력 | `artifacts/experiments/ai/support-player-cases.json` |
| `scripts/simulate-ablation-climb.ts` | 결과 출력/메타데이터 (artifacts 입력 없음) | 37, 173, 175 |
| `scripts/simulate-adaptive-coverage-climb.ts` | 결과 출력/메타데이터 (artifacts 입력 없음) | 42, 178, 180 |
| `scripts/simulate-alola-tuning.ts` | 선택 실험/QA 입력·출력 | `artifacts/experiments/balance/alola-tuning-20261018/baseline-design.json` |
| `scripts/simulate-composition-diagnostics.ts` | 결과 출력/메타데이터 (artifacts 입력 없음) | 43, 183, 185 |
| `scripts/simulate-coverage-factors.ts` | 결과 출력/메타데이터 (artifacts 입력 없음) | 42, 178, 180 |
| `scripts/simulate-currency-balance.ts` | 선택 실험/QA 입력·출력 | `artifacts/experiments/balance/currency-balance-baseline.json` |
| `scripts/simulate-fifty-floor-balance.ts` | 선택 실험/QA 입력·출력 | `artifacts/experiments/balance/balance-50-courses.json` |
| `scripts/simulate-galar-npcs.ts` | 결과 출력/메타데이터 (artifacts 입력 없음) | 16 |
| `scripts/simulate-hau-guzma.ts` | 선택 실험/QA 입력·출력 | `artifacts/experiments/balance/hau-guzma-20261019/baseline-design.json` |
| `scripts/simulate-hoenn-npcs.ts` | 결과 출력/메타데이터 (artifacts 입력 없음) | 30 |
| `scripts/simulate-immunity-climb.ts` | 결과 출력/메타데이터 (artifacts 입력 없음) | 41, 177, 179 |
| `scripts/simulate-immunity-recheck.ts` | 선택 실험/QA 입력·출력 | `artifacts/experiments/ai/observed-damage-validate-${...}-v9-battles.jsonl` |
| `scripts/simulate-johto-theme-comparison.ts` | 결과 출력/메타데이터 (artifacts 입력 없음) | 31 |
| `scripts/simulate-kalos-npcs.ts` | 결과 출력/메타데이터 (artifacts 입력 없음) | 31 |
| `scripts/simulate-normal-npc-balance.ts` | 결과 출력/메타데이터 (artifacts 입력 없음) | 31, 146, 168 |
| `scripts/simulate-observed-damage-climb.ts` | 결과 출력/메타데이터 (artifacts 입력 없음) | 38, 174, 176 |
| `scripts/simulate-observed-damage.ts` | 선택 실험/QA 입력·출력 | `artifacts/experiments/ai/support-player-cases.json` |
| `scripts/simulate-opponent-learning.ts` | 결과 출력/메타데이터 (artifacts 입력 없음) | 46, 193, 195 |
| `scripts/simulate-paldea-npcs.ts` | 결과 출력/메타데이터 (artifacts 입력 없음) | 19 |
| `scripts/simulate-raids.ts` | 선택 실험/QA 입력·출력 | `artifacts/experiments/balance`, `artifacts/experiments/balance/${...}`, `artifacts/experiments/balance/raid-winrate-simulation.json` |
| `scripts/simulate-regional-balance.ts` | 결과 출력/메타데이터 (artifacts 입력 없음) | 34, 170, 172 |
| `scripts/simulate-sample-wall-factors.ts` | 결과 출력/메타데이터 (artifacts 입력 없음) | 45, 185, 187 |
| `scripts/simulate-shop-economy.ts` | 결과 출력/메타데이터 (artifacts 입력 없음) | 28, 129 |
| `scripts/simulate-sinnoh-npcs.ts` | 결과 출력/메타데이터 (artifacts 입력 없음) | 32 |
| `scripts/simulate-support-ablation.ts` | 선택 실험/QA 입력·출력 | `artifacts/experiments/ai/support-player-cases.json` |
| `scripts/simulate-support-climb.ts` | 결과 출력/메타데이터 (artifacts 입력 없음) | 36, 172, 174 |
| `scripts/simulate-support-player.ts` | 선택 실험/QA 입력·출력 | `artifacts/experiments/ai/support-ai-new-courses.json`, `artifacts/experiments/balance/hundred-floor-six-z-courses.json`, `artifacts/experiments/ai/support-player-cases.json` |
| `scripts/simulate-support-recheck.ts` | 선택 실험/QA 입력·출력 | `artifacts/experiments/ai/support-player-cases.json` |
| `scripts/simulate-tower-balance.ts` | 선택 실험/QA 입력·출력 | `artifacts/experiments/balance/balance-courses.json` |
| `scripts/simulate-unova-npcs.ts` | 결과 출력/메타데이터 (artifacts 입력 없음) | 35 |
| `scripts/simulate-villain-battles.ts` | 결과 출력/메타데이터 (artifacts 입력 없음) | 32, 34 |
| `scripts/simulate-villain-campaigns.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 25, 26 |
| `scripts/simulate-z-ai.ts` | 결과 출력/메타데이터 (artifacts 입력 없음) | 37 |
| `scripts/summarize-auto-suite.ts` | 선택 실험/QA 입력·출력 | `artifacts/experiments/samples/auto-suite-${...}-manifest.json`, `artifacts/experiments/samples/auto-suite-${...}-samples.json`, `artifacts/experiments/samples/auto-suite-${...}-cases.json`, `artifacts/experiments/ai/observed-damage-validation-courses.json`, `artifacts/experiments/balance/simulation-auto-suite-${...}-${...}-balanced.json`, `artifacts/experiments/samples/auto-suite-${...}-${...}-battles.jsonl` |
| `scripts/summarize-composition-simulation.mjs` | 선택 실험/QA 입력·출력 | `artifacts/experiments/samples/composition-experiment-manifest.json`, `artifacts/experiments/samples/${...}-battles.jsonl`, `artifacts/experiments/balance/simulation-${...}-balanced.json`, `artifacts/experiments/balance/simulation-rule-basic-balanced.json` |
| `scripts/summarize-diverse-simulation.mjs` | 선택 실험/QA 입력·출력 | `artifacts/experiments/balance/simulation-diverse-${...}-balanced.json`, `artifacts/experiments/samples/diverse-team-cases.json`, `artifacts/experiments/samples/diverse-${...}-battles.jsonl`, `artifacts/experiments/balance/simulation-rule-basic-balanced.json` |
| `scripts/summarize-normal-npc-balance.mjs` | 선택 실험/QA 입력·출력 | `artifacts/experiments/balance/normal-mode-balance-20261013${...}/report.json`, `artifacts/experiments/balance/normal-mode-balance-20261013${...}/battles.jsonl`, `artifacts/experiments/balance/normal-mode-balance-20261013${...}/simulation-source.ts`, `artifacts/experiments/balance/NORMAL_MODE_BALANCE_CHECK.md` |
| `scripts/summarize-rule-simulations.py` | 선택 실험/QA 파이프라인 입력·출력 | 8, 9, 34, 37 |
| `scripts/validate-z-ai-traces.ts` | 출력/임시 검사 경로 (입력 데이터 불필요) | 7 |
| `scripts/write-composition-report.mjs` | 선택 실험/QA 입력·출력 | `artifacts/experiments/samples/composition-simulation-summary.json`, `artifacts/experiments/samples/composition-replay-audit.json` |
| `scripts/write-observed-damage-report.mjs` | 선택 실험/QA 입력·출력 | `artifacts/experiments/ai/observed-damage-dev-audit.json`, `artifacts/experiments/ai/observed-damage-validate-audit.json`, `artifacts/experiments/ai/observed-damage-selection.json` |
| `scripts/write-support-ablation-report.mjs` | 선택 실험/QA 입력·출력 | `artifacts/experiments/ai/support-ablation-dev-audit.json`, `artifacts/experiments/ai/support-ablation-validate-audit.json`, `artifacts/experiments/ai/support-ablation-selection.json` |
| `scripts/write-support-player-report.mjs` | 선택 실험/QA 입력·출력 | `artifacts/experiments/ai/support-player-audit.json`, `artifacts/experiments/ai/support-player-replay-audit.json`, `artifacts/experiments/ai/support-player-manifest.json` |
| `scripts/write-support-recheck-report.mjs` | 선택 실험/QA 입력·출력 | `artifacts/experiments/ai/support-recheck-audit.json`, `artifacts/experiments/ai/support-decision-diagnosis.json` |
| `src/data/hoenn-trainers.ts` | 주석의 과거 기록 참조 (런타임 입력 아님) | 9 |
| `src/web/music-score.ts` | 주석의 과거 기록 참조 (런타임 입력 아님) | 6 |
| `tests/fixtures/README.md` | 문서/주석의 로컬 경로 안내 | 3, 7, 8 |
| `tests/raid-floor-simulation.test.ts` | 출력 CLI 기본값/보호 경로 검사 (원자료 입력 제거) | 45, 47 |
| `tests/windows-setup.test.mjs` | 실행 중 생성하는 모의 설치 출력 | 30 |
