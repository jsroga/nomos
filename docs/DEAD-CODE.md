# Dead Code Report

> Auto-generated on 2026-02-19 by [Knip](https://knip.dev). Do not edit manually.
> Updates automatically via CI on every push to main and on PRs.

## Summary

| Category | Count |
|----------|-------|
| Unlisted dependencies | 5 |
| Unresolved imports | 7 |
| Unused exports | 5 |
| **Total** | **17** |

## Unlisted Dependencies

Imported but missing from package.json.

- `@anthropic-ai/sdk` in `scripts/run-langfuse-evals.ts:10`
- `@anthropic-ai/sdk` in `src/evaluation/experiments/eval-continuity.ts:1`
- `@anthropic-ai/sdk` in `src/evaluation/experiments/eval-reasoning.ts:1`
- `@anthropic-ai/sdk` in `src/evaluation/experiments/run-sonnet-strategies.ts:1`
- `@mastra/observability` in `src/domains/storyteller/agents/v2/mastra-instance.ts:5`

## Unresolved Imports

Import paths that don't resolve to any module.

- `../evaluators/eq-evaluator` in `src/evaluation/experiments/eval-architecture.ts:9`
- `../evaluators/self-correction-evaluator` in `src/evaluation/experiments/eval-architecture.ts:10`
- `../evaluators/advanced-evaluators` in `src/evaluation/experiments/eval-architecture.ts:14`
- `../evaluators/magic-score` in `src/evaluation/experiments/extended-thinking-ab-test.ts:15`
- `../evaluators/consistency` in `src/evaluation/experiments/loop-creator.ts:15`
- `../evaluators/hallucination` in `src/evaluation/experiments/loop-creator.ts:16`
- `./runner` in `e2e/parallel-runner.ts:1`

## Unused Exports

Exported but never imported. Remove `export` or delete.

| Export | File |
|--------|------|
| `beatTools` | `src/domains/storyteller/tools/v2/beat-tools.ts:482` |
| `characterTools` | `src/domains/storyteller/tools/v2/character-tools.ts:482` |
| `continuityTools` | `src/domains/storyteller/tools/v2/continuity-tools.ts:295` |
| `scriptTools` | `src/domains/storyteller/tools/v2/script-tools.ts:173` |
| `ragTools` | `src/domains/storyteller/tools/v2/rag-tools.ts:401` |

## How to Fix

```bash
# Run locally
npx knip

# Only dependencies
npx knip --dependencies

# Only exports
npx knip --exports
```

False positives? Update `knip.json`:
- **Files**: add to `entry` or `ignore`
- **Dependencies**: add to `ignoreDependencies`
- **Exports**: ensure consuming code is listed in `entry`
