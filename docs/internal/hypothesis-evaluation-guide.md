# Hypothesis-Driven Evaluation (removed)

The hypothesis / Confident AI experiment runner was removed in favor of **Mastra scorers** in `src/shared/agent-kernel/scorers/` (re-exported from `evals/scorers/` for the CLI).

Use:

```bash
npm run eval
npm run eval -- --samples=10
```

See [TESTING.md](../TESTING.md) and `evals/run.ts`.
