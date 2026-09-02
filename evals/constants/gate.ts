/** Wire values for the eval gate and its freshness check. */

export const EVAL_BASELINE = {
  DIRECTORY: 'evals/baselines',
  EXTENSION: '.json',
  DEFAULT_DATASET: 'storyteller',
} as const

export const EVAL_RESULT_FILE = 'evals/results/latest.json'

export const EVAL_GATE_MESSAGE = {
  PASSED: '✅ No scorer regressed beyond its threshold.',
  REGRESSED: '❌ Eval regression — a scorer dropped further than run-to-run noise explains:',
  RUN_HAD_FAILURES: '❌ Scorers failed. A run with failures is not a measurement; fix it before comparing.',
  NO_BASELINE: '❌ No baseline chosen for dataset:',
  MALFORMED_BASELINE: '❌ Baseline is not an eval baseline:',
  OVER_BUDGET: '❌ The judges cost more than the baseline allows — see the line above.',
} as const
