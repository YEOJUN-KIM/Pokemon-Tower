# 실험 파일 목록

<code>node scripts/index-artifacts.mjs</code> 생성. 630개 파일, 5.09GiB. 안내문과 생성된 색인은 집계에서 제외한다. 전체 경로·크기·manifest 참조는 [index.json](index.json). 무결성 검증 결과나 삭제 가능 목록이 아니다.

| 디렉터리 | 파일 수 | MiB |
|---|---:|---:|
| artifacts/experiments | 1 | 0.0 |
| artifacts/experiments/ai | 153 | 1958.5 |
| artifacts/experiments/balance | 205 | 1636.4 |
| artifacts/experiments/balance/normal-mode-balance-20261013 | 5 | 4.5 |
| artifacts/experiments/balance/normal-mode-balance-20261013-leads | 4 | 1.2 |
| artifacts/experiments/balance/normal-mode-balance-20261013-lineup-refresh | 4 | 4.5 |
| artifacts/experiments/balance/normal-mode-balance-20261013-outliers | 4 | 1.0 |
| artifacts/experiments/balance/normal-mode-balance-20261013-retry-order | 6 | 0.4 |
| artifacts/experiments/samples | 89 | 1596.3 |
| artifacts/qa/assets/back-sprite-audit | 8 | 2.5 |
| artifacts/qa/assets/dynamax-frames | 2 | 0.0 |
| artifacts/qa/assets/garchomp-mega-frames | 3 | 0.0 |
| artifacts/qa/assets/reports | 18 | 2.2 |
| artifacts/qa/assets/reports/pokedex-sprites | 11 | 0.3 |
| artifacts/qa/audio | 4 | 0.0 |
| artifacts/qa/previews/player-trainer | 1 | 0.8 |
| artifacts/qa/previews/showdown-fx | 1 | 0.2 |
| artifacts/qa/screenshots | 9 | 0.8 |
| artifacts/qa/screenshots/battle-forms | 6 | 0.5 |
| artifacts/qa/screenshots/local-assets | 4 | 0.4 |
| artifacts/qa/screenshots/move-effects | 20 | 1.4 |
| artifacts/qa/screenshots/player-trainer | 3 | 0.3 |
| artifacts/qa/screenshots/pokedex-center | 7 | 0.8 |
| artifacts/qa/screenshots/primal | 4 | 0.3 |
| artifacts/qa/screenshots/recruit-summary-20261014 | 2 | 0.2 |
| artifacts/qa/screenshots/selectable-forms | 4 | 0.2 |
| artifacts/reports/changes | 32 | 0.2 |
| artifacts/reports/history | 2 | 0.2 |
| artifacts/reports/npc | 11 | 1.2 |
| artifacts/reports/planning | 4 | 0.0 |
| artifacts/reports/references | 3 | 0.0 |

## 재현 manifest

- [coverage-compare-20261010-manifest.json](experiments/ai/coverage-compare-20261010-manifest.json)
- [coverage-factors-20261010-manifest.json](experiments/ai/coverage-factors-20261010-manifest.json)
- [immunity-recheck-basic-manifest.json](experiments/ai/immunity-recheck-basic-manifest.json)
- [immunity-recheck-chaos-manifest.json](experiments/ai/immunity-recheck-chaos-manifest.json)
- [immunity-recheck-tera-manifest.json](experiments/ai/immunity-recheck-tera-manifest.json)
- [observed-damage-dev-manifest.json](experiments/ai/observed-damage-dev-manifest.json)
- [observed-damage-validate-manifest.json](experiments/ai/observed-damage-validate-manifest.json)
- [opponent-learning-20261011-manifest.json](experiments/ai/opponent-learning-20261011-manifest.json)
- [support-ablation-dev-manifest.json](experiments/ai/support-ablation-dev-manifest.json)
- [support-ablation-validate-manifest.json](experiments/ai/support-ablation-validate-manifest.json)
- [support-correction-manifest.json](experiments/ai/support-correction-manifest.json)
- [support-player-manifest.json](experiments/ai/support-player-manifest.json)
- [support-recheck-manifest.json](experiments/ai/support-recheck-manifest.json)
- [auto-suite-20261010-manifest.json](experiments/samples/auto-suite-20261010-manifest.json)
- [auto-suite-20261011-manifest.json](experiments/samples/auto-suite-20261011-manifest.json)
- [composition-diagnostics-20261010-audit-v2-manifest.json](experiments/samples/composition-diagnostics-20261010-audit-v2-manifest.json)
- [composition-diagnostics-20261010-manifest.json](experiments/samples/composition-diagnostics-20261010-manifest.json)
- [composition-experiment-manifest.json](experiments/samples/composition-experiment-manifest.json)
- [reliable-samples-20261010-manifest.json](experiments/samples/reliable-samples-20261010-manifest.json)
- [room-sample-20261011-manifest.json](experiments/samples/room-sample-20261011-manifest.json)
- [sample-holdout-20261011-manifest.json](experiments/samples/sample-holdout-20261011-manifest.json)
- [sample-wall-factors-20261010-manifest.json](experiments/samples/sample-wall-factors-20261010-manifest.json)
- [resource-manifest.json](qa/assets/reports/resource-manifest.json)
