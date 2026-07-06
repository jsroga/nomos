# Testing

> **Last reviewed:** 2026-07-06

## Tiers

| Tier | Command | Location | CI |
|------|---------|----------|-----|
| **Unit** | `npm run test:unit` | `src/**/__tests__/**` (colocated) | Yes (vitest) |
| **E2E** | `npm run test:e2e [scenario]` | Playwright via `scripts/run-e2e.ts` | No (local / scheduled) |
| **Eval** | `npm run eval [-- --samples=5]` | `evals/` (Mastra scorers) | No |

There is **no top-level `tests/` folder**. Legacy `tests/integration/` was removed; coverage lives next to the code it exercises.

## Unit tests (Vitest)

Config: `vitest.config.ts`

- **Include:** all `*.test.ts` / `*.spec.ts` under `src/`
- **Exclude:** `**/*.e2e.test.{ts,tsx}` (need DB/LLM; run separately)
- **Alias:** `@/` → `src/`; `next/server` → `vitest/mocks/next-server.ts`

Examples:

```bash
npm run test:unit
npx vitest run src/domains/storyteller/agents/tools/__tests__/storytelling.test.ts
npx vitest run src/domains/loop-creator
```

## E2E tests (Playwright)

See [internal/testing/e2e.md](./internal/testing/e2e.md).

```bash
npm run test:e2e actions          # storyteller actions smoke
npm run test:e2e full-loop        # loop creator flow
npm run test:e2e swiss-knife      # cross-domain entities
```

Requires running app (`npm run dev`), `.env.local`, and usually a database.

## Eval experiments

```bash
npm run eval
npm run eval -- --samples=5
npm run eval -- --scorers=consistency
```

Uses Mastra `createScorer` metrics in `evals/scorers/`. Golden set: 12 examples in `evals/datasets/storyteller-golden.ts` (3 per scorer), each with `referenceOutput` and per-example `metadata.scorers`. Results land in `evals/results/latest.json` and the evaluation dashboard at `/evaluation/dashboard`.

## Mastra / agent verification

- **Studio:** `npm run mastra:dev` — manual agent + tool smoke (stub executes in Studio; full side effects need the app).
- **Domain e2e:** `src/domains/storyteller/agents/__tests__/*.e2e.test.ts` — excluded from default `test:unit`; run explicitly when DB/keys are available.

## What to add tests for

Prefer **colocated** tests under the module you change:

```
src/domains/<module>/agents/tools/__tests__/
src/domains/<module>/services/__tests__/
src/app/api/<route>/__tests__/
```

Pure logic in `core/` should be unit-testable without DB or LLM (see `docs/unified/ARCHITECTURE.md` §2).
