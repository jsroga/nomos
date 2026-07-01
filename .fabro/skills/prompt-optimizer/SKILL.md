---
name: prompt-optimizer
description: Diagnose why an LLM prompt underperforms and improve it through failure analysis and eval-gated iteration — never blind prompt-fiddling
---

# Prompt Optimizer

Improve an agent/prompt's behavior. Extra context from the user:

> {{user_input}}

Prompt engineering is an **empirical** discipline, not wordsmithing. You change a
prompt because you have evidence of a specific failure mode, and you keep the
change only if an eval confirms it helped without regressing anything else.
Blind edits that "feel better" are how prompts rot.

## This repo's prompt surface

- Agent system prompts are large and structured (see
  `src/domains/storyteller/agents/StorytellerAgent` — constraints, anti-slop,
  entity-link density, mandatory tool-usage, format contracts).
- Prompts are managed via `src/prompts/*` (repository + registry); some are pushed
  to a hub (`npm run prompts:push`).
- Quality is judged by `src/agent-core/judging/mazur-judge.ts` and iterated by
  `improvement-loop.ts`. Pair this skill with the `llm-eval` skill for scoring.

## Step 1 — Characterize the failure precisely

Do not touch the prompt until you can name the failure mode from real outputs:

- Collect a set of **actual bad outputs** (from Langfuse traces or a quick run).
- Classify the failure: instruction ignored? wrong format/schema? hallucinated
  facts? generic "slop"? missing tool call? verbosity? refusal? inconsistent
  persona?
- Localize the cause. Bad output usually comes from one of:
  - **Missing/weak instruction** — the behavior was never actually required.
  - **Conflicting instructions** — two rules the model can't satisfy at once.
  - **Buried instruction** — the critical rule is lost mid-wall-of-text.
  - **Under-specified format** — no explicit schema/example, so the model guesses.
  - **Context problem** — the needed data isn't in the prompt (a *context* bug,
    not a *prompt* bug — fix the retrieval, not the wording).
  - **Model/decoding** — temperature too high, or the model simply can't.

Fixing the wrong cause is the #1 waste of time. A context bug will never be fixed
by rephrasing instructions.

## Step 2 — Apply the right lever

Match the fix to the diagnosed cause:

- **Be imperative and specific.** Replace "try to be concise" with a concrete
  constraint ("≤ 3 sentences; cut filler words").
- **Show, don't just tell.** Add a *good* example and a *bad* example — few-shot
  contrast is the strongest lever for style/format (this repo already uses
  GOOD/BAD example pairs; extend that pattern).
- **Positive framing.** "Do X" beats "don't do Y"; if you must forbid, pair it
  with the desired alternative.
- **Structure & salience.** Put non-negotiable rules where the model attends:
  clear headers, early or immediately before the task, not buried on line 200.
- **Enforce format with a schema.** For structured output prefer a validated
  schema (`output_schema` / `structuredOutput`) over prose instructions.
- **Resolve conflicts.** Delete or reconcile contradictory rules; ranking
  ("if in conflict, prioritize X") beats two absolute commands.
- **Right-size context.** Add the missing data or trim noise; don't paper over a
  context gap with more instructions.

Change **one lever at a time** so the eval attributes the effect correctly.

## Step 3 — Prove it (eval-gated)

- Build or reuse an eval (see the `llm-eval` skill) whose cases include the
  failure mode you're fixing **plus** guardrail cases for behavior you must not
  break.
- Run baseline vs. candidate over the same frozen dataset, ≥ 3 samples/case.
- Accept the change only if it improves the target dimension **and** regresses no
  guardrail case. Use `mazur-judge` for subjective dimensions and programmatic
  checks for format/countable ones.

## Step 4 — Minimize and stabilize

- Prompts grow like scar tissue. Once the eval passes, try to **remove** now-redundant
  instructions and re-run — shorter prompts that hold the score are better (cheaper,
  clearer, less conflicting).
- Watch the token cost; a fix that doubles prompt size for a marginal gain is
  usually a bad trade.
- Version the change through `src/prompts/*` and note what failure it fixes and the
  eval delta.

## Anti-patterns

- Editing wording to fix what is actually a missing-context or model-capability
  problem.
- Stacking more RULES ALL CAPS on top of an already-conflicted prompt.
- Changing several things at once, then not knowing which helped.
- Shipping on the strength of one nice-looking sample.
- Letting the prompt balloon indefinitely; never pruning.

## Deliverable

The diagnosed failure mode, the single lever applied, the before/after eval
results (target dimension up, guardrails intact), the final (ideally trimmed)
prompt, and the version note describing what it fixes.
