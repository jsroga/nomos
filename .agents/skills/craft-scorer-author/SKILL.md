---
name: craft-scorer-author
description: Author Mastra craft scorers (prose violations, stakes/cost) for storyteller evals and workflow steps — port StoryForge patterns without duplicating magic-scorer slop checks.
---

# Craft Scorer Author

Add **line-level and structural** Mastra scorers for storyteller prose. Extra context:

> {{user_input}}

Use when evals need measurable craft beyond generic `magic` / anti-slop. Pairs with `/storyteller-eval-golden` for dataset rows.

**Reference PoC:** `.local/storyforge/src/mastra/scorers/craft-scorers.ts` (`prose-craft`, `stakes-cost`).

**Existing scorers:** `src/shared/agent-kernel/scorers/magic-scorer.ts`, `consistency-scorer.ts`, etc.

## Step 1 — Scorer roles (don't duplicate)

| Scorer id | Measures | Not the same as |
| --- | --- | --- |
| `magic` | Creative quality, slop patterns | Counting clichés verbatim |
| `prose-craft` | Stated emotion, cliché quotes, POV breaks per 1k words | Single holistic magic score |
| `stakes-cost` | Beats with cost, unearned victories, frictionless scenes | Beat planner JSON validity |

If a criterion fits `magic-judge` prompt in `promptRepository`, extend that scorer instead of adding a new one.

## Step 2 — Mastra v1 scorer pattern

Follow repo conventions:

```ts
import { createScorer } from '@mastra/core/evals'
import { z } from 'zod'
import { toMastraJudgingModel, normalizeScore, outputToString } from './shared'

export const proseCraftScorer = createScorer({
  id: 'prose-craft',
  name: 'Prose Craft',
  description: '…',
  judge: {
    model: toMastraJudgingModel(),
    instructions: '…',
  },
})
  .analyze({ outputSchema: z.object({ … }), createPrompt: async ({ run }) => … })
  .generateScore(({ results }) => normalizeScore(…))
  .generateReason(({ results, score }) => …)
```

Rules:

- **`id`** — kebab-case, stable (stored in DB / Langfuse).
- **`outputSchema`** — structured counts/lists, not free-form essay (enables deterministic `generateScore`).
- **`extractProse`** — accept `{ draft, finalDraft }` or string; same helper for workflow step outputs.
- Register in `scorers/index.ts`; export from barrel.

## Step 3 — Port from StoryForge (adapt, don't copy-paste)

Read PoC scorers for rubric logic:

```bash
sed -n '1,120p' .local/storyforge/src/mastra/scorers/craft-scorers.ts
```

Adapt:

- Replace `CRITIC_MODEL` with `toMastraJudgingModel()`.
- Use `promptRepository.getPrompt` only when repo already has a matching prompt key; otherwise inline `createPrompt` like StoryForge.
- Score normalization: PoC uses violations per 1000 words → map to 0–1 via `normalizeScore`.

## Step 4 — Attach to workflow (optional)

StoryForge attaches scorers to draft/revise steps at `rate: 1` for regression tracking in Studio.

In this repo:

- Document attachment point in workflow design (`/mastra-workflow`).
- Do not attach scorers to chat stream route — eval harness and workflow steps only.

## Step 5 — Golden eval rows

For each new scorer, add 2–3 rows in `evals/datasets/storyteller-golden.ts`:

- High craft (few violations → high score)
- Low craft (stated emotions, clichés → low score)
- Edge: short passage (<250 words) — scorer should not divide-by-zero

Run `/storyteller-eval-golden` checklist when adding rows.

## Step 6 — Verify

```bash
npm run eval -- --scorers=prose-craft
npm run typecheck
npm run test:unit -- src/shared/agent-kernel/scorers 2>/dev/null || true
```

If scorer ids are new, confirm `evals/run.ts` passes them through `--scorers` filter.

## Step 7 — Deliverable

Post:

- Scorer ids + rubric summary
- Files touched
- Example golden ids
- Suggested thresholds (e.g. prose-craft ≥ 0.6 on strong rows)

Stop — no orchestration or SSE changes in this skill.
