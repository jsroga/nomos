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

Uses Mastra `createScorer` definitions in `src/shared/agent-kernel/scorers/` (also registered on the Mastra instance). Golden set: 12 examples in `evals/datasets/storyteller-golden.ts` (3 per scorer), each with `referenceOutput` and per-example `metadata.scorers`. Results land in `evals/results/latest.json`; view via `npm run eval:dashboard`.

### Scorer gating matrix

Which scorers must not regress, by what you changed. Run at least the listed
scorers (`npm run eval -- --scorers=<ids>`) and compare to
`evals/results/latest.json` before merging:

| Change touches… | Gate on scorers |
| --- | --- |
| Author prompt (`GrrmSystemPrompt`), author model, draft/revise steps | `magic`, `prose-craft`, `stakes-cost` |
| Beat planner prompt/model, beat-plan schema, concreteness gate | `magic`, `stakes-cost` |
| Tools, context assembly, canon formatting | `consistency`, `hallucination` |
| Critic briefs / critic model | `prose-craft`, `stakes-cost` (critics feed the revise step) |
| Persona/skill content (`prompts/skills/`) | `persona-fidelity` |
| Anything in the workflow wiring only (no prompt/model change) | mechanics unit tests suffice; evals optional |

**Ratchet policy:** a change ships only if **no gated scorer drops below the
baseline in `evals/results/latest.json`**. An improvement in one scorer never
buys back a regression in another. When a change legitimately moves a
baseline (e.g. a new scorer lands), snapshot the old results first
(`cp evals/results/latest.json evals/results/<date>-baseline.json`) and say so
in the PR.

`prose-craft` and `stakes-cost` also run attached to the `draft-script` and
`revise` workflow steps (rate 1) — scores land in Mastra storage and are
inspectable in Studio under Observability, so prompt tweaks are comparable
across runs without a full eval sweep.

## Mastra / agent verification

- **Studio:** `npm run mastra:dev` — manual agent + tool smoke (stub executes in Studio; full side effects need the app).
- **Domain e2e:** `src/domains/storyteller/**/__tests__/*.e2e.test.ts` — excluded from default `test:unit`; run explicitly when DB/keys are available.
- **workflow-full tier:** `src/domains/storyteller/agents/workflows/__tests__/beat-draft-workflow.e2e.test.ts` — the beat-draft pipeline with real agents + DB (cheap role models). Needs `DATABASE_URL`, an LLM key, and `WORKFLOW_E2E_PROJECT_ID`/`WORKFLOW_E2E_EPISODE_ID` pointing at a scratch project. Asserts a persisted beat and that live critics quote a planted cliché without rewriting.

## What to add tests for

Prefer **colocated** tests under the module you change:

```
src/domains/<module>/agents/tools/__tests__/
src/domains/<module>/services/__tests__/
src/app/api/<route>/__tests__/
```

Pure logic in `core/` should be unit-testable without DB or LLM (see `docs/unified/ARCHITECTURE.md` §2).
