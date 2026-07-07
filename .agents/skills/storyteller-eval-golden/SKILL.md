---
name: storyteller-eval-golden
description: Extend storyteller golden eval dataset and scorer wiring for the post-workflow GRRM pipeline — beat-plan JSON, critic outputs, anti-slop regression cases. Use after orchestration changes or before claiming eval parity.
---

# Storyteller Eval Golden

Update **this repo's Mastra scorer eval harness** for the simplified storyteller stack. Extra context:

> {{user_input}}

Complements generic `/llm-eval` — paths and schemas here are **repo-specific**.

**Read first:** `evals/run.ts`, `evals/datasets/storyteller-golden.ts`, `src/shared/agent-kernel/scorers/`, `docs/TESTING.md`.

## Step 1 — Know the harness

| Piece | Location |
| --- | --- |
| Runner | `evals/run.ts` — `npm run eval`, `--samples=N`, `--scorers=magic,consistency` |
| Golden dataset | `evals/datasets/storyteller-golden.ts` |
| Scorers | `src/shared/agent-kernel/scorers/` — `magic`, `consistency`, `hallucination`, `persona-fidelity` |
| Judge model | `JUDGING_MODEL` in `.env.local` (see header in `evals/run.ts`) |
| Dashboard | `npm run eval:dashboard` |

Current golden examples score **`referenceOutput` prose** offline (no live agent call). That stays valid for regression; add workflow-era cases as the pipeline changes.

## Step 2 — Map pipeline stages to eval cases

For each new orchestration stage, decide what gets a golden row:

| Stage | What to score | Example id pattern |
| --- | --- | --- |
| Beat planner | JSON only — no prose in output | `beat-plan-valid-01`, `beat-plan-slop-prose-01` |
| Author draft | Chapter/beat prose | `draft-strong-01`, `draft-slop-01` |
| Prose critic | Structured critique (optional) | `critic-prose-findings-01` |
| Verdict / revise | Delta quality vs draft | `revise-improves-01` |
| Chat adapter | Thin — prefer SSE/e2e tier | skip or 1 smoke row |

Each example needs: `id`, `input` (message, phase, facts/canon/persona when relevant), `referenceOutput`, `metadata.scorers[]`.

## Step 3 — Coverage checklist (before adding rows)

Ensure the dataset includes at least:

- [ ] **Magic** — strong scene, classic slop, mid competence (existing pattern)
- [ ] **Consistency** — contradicts established `facts[]`
- [ ] **Hallucination** — violates `canon[]`
- [ ] **Persona** — breaks `persona` voice constraints
- [ ] **Beat-plan** (new) — valid beat JSON vs planner that leaked prose
- [ ] **Regression** — one row per known past failure from Langfuse or retro notes

Do **not** edit a case to make a failing model pass — add a new id instead.

## Step 4 — Extend types and scorers (when adding dimensions)

1. Add scorer in `src/shared/agent-kernel/scorers/` via `createScorer` from `@mastra/core/evals` (see `magic-scorer.ts`).
2. Register in `scorers/index.ts` → `ALL_SCORERS`, `STORYTELLER_SCORERS`.
3. Extend `ScorerId` in `evals/datasets/storyteller-golden.ts`.
4. Wire filter in `evals/run.ts` if needed.

For **craft/stakes** scorers, use `/craft-scorer-author` instead of duplicating judge logic here.

## Step 5 — Live eval (optional, later wave)

When wiring live agent runs:

- Keep golden **reference** rows for offline CI-friendly runs.
- Add experiment config under `evals/` only if `run.ts` gains a `--live` mode — do not fork a second runner.

Until live mode exists, document in PLAN which rows are **offline-only**.

## Step 6 — Verify

```bash
npm run eval -- --samples=5
npm run eval -- --scorers=magic
npm run typecheck
```

Report: example count by category, scorers touched, threshold proposal (e.g. magic mean ≥ 0.7 on strong cases, slop cases ≤ 0.3).

## Step 7 — Deliverable

Post a short markdown summary:

- Rows added/changed (ids)
- Scorers registered
- Gaps deferred (live eval, workflow suspend cases)
- Suggested ship gate: "run `npm run eval -- --samples=12` before merge"

Stop — do not reshape orchestration in this skill.
