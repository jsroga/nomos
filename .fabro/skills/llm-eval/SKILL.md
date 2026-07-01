---
name: llm-eval
description: Design, run, and correctly interpret evaluations of agents, prompts, and skills — turning "it feels better" into measured, defensible signal
---

# LLM Evaluation

Build a rigorous evaluation for an AI change. Extra context from the user:

> {{user_input}}

The purpose of an eval is to replace vibes with **evidence**. A change to a
prompt, model, or tool is not an improvement until an eval says so on cases you
committed to *before* you looked at the results. Treat evals as the unit test of
non-determinism.

## This repo's eval machinery (use it, don't reinvent)

- **Harness:** `scripts/run-eval.ts` (`npm run eval <experiment>`),
  `scripts/run-langfuse-evals.ts` (`npm run eval:langfuse`), experiments under
  `src/evaluation/experiments/*` (`eval-pro`, `eval-continuity`, `eval-reasoning`,
  `eval-architecture`, `eval-personas`).
- **LLM-as-judge:** `src/agent-core/judging/mazur-judge.ts` — `judgeMazur` /
  `judgeWithPersona` returning a validated `MazurJudgmentSchema`. Use it as the
  scoring engine rather than hand-rolling a judge.
- **Improvement loop:** `src/agent-core/judging/improvement-loop.ts`.
- **Benchmarks:** `src/evaluation/langfuse/eq-bench-evaluator.ts`,
  `src/evaluation/confident-ai/eval-dataset.ts`.
- **Skill evals:** `src/agent-core/skills/eval-schema.ts`
  (`SkillEvalCase`: `prompt`, `expected_output`, `assertions`) validated by
  `npm run skills:validate`.
- **Scores + traces:** Langfuse (`src/agent-core/observability.ts`) with
  `NUMERIC | CATEGORICAL | BOOLEAN` scores attached to trace IDs.

## Step 1 — Define what "good" means (before any runs)

- Write the **decision** the eval informs: "Ship prompt B over A iff …".
- Turn quality into **measurable criteria**. Prefer specific rubric dimensions
  (e.g. instruction-adherence, factual grounding, entity-link density, anti-slop,
  format validity) over a single fuzzy "quality" score. Mirror the dimensions the
  domain already cares about (this repo scores things like link density and
  slop explicitly).
- Decide the **aggregation + threshold** up front: e.g. "mean adherence ≥ 4/5 AND
  no regression on any guardrail case." Freeze it so you can't move the goalposts.

## Step 2 — Build the dataset

- **Coverage over volume.** A curated 20-50 cases spanning the real distribution
  beats 1000 near-duplicates. Include: typical happy paths, hard/ambiguous cases,
  known past failures (regression cases), and adversarial/edge inputs.
- **Golden cases:** where a correct answer exists, pin `expected_output` /
  `assertions` (skill-eval style). Where it's open-ended, rely on rubric judging.
- **Hold the line:** never edit a case after seeing a model do badly on it just to
  make the score look better. Add new cases instead.
- Store cases as data (JSON/dataset), versioned, not embedded in prose.

## Step 3 — Choose the scoring method per criterion

| Criterion type | Method |
| --- | --- |
| Exact/format/schema | Programmatic check (Zod, regex, JSON parse) |
| Countable property (e.g. link density) | Deterministic counter |
| Subjective quality | LLM-as-judge (`judgeMazur`) with an explicit rubric |
| Comparative (A vs B) | Pairwise judge, randomized order to kill position bias |

Programmatic checks first — they're free, deterministic, and unarguable. Use the
LLM judge only for what code can't measure.

## Step 4 — Guard against the classic eval traps

- **Judge bias:** LLM judges favor longer, first-shown, and self-authored answers.
  Randomize order, strip length cues where possible, and calibrate the judge on a
  few human-labeled cases before trusting it.
- **Contamination:** don't let the model being evaluated also be the judge of its
  own run without a blind rubric.
- **Variance:** LLMs are stochastic. Run each case ≥ 3× (or fix seed/temperature)
  and report mean + spread, not a single lucky sample.
- **Overfitting to the eval:** if you tune until the eval is perfect, the eval
  stops measuring reality. Keep a held-out set you don't optimize against.
- **Silent guardrail regressions:** a change can lift the average while breaking a
  critical case. Track per-case deltas, not just the aggregate.

## Step 5 — Run, compare, decide

1. Run baseline (A) and candidate (B) over the **same frozen dataset**.
2. Emit Langfuse scores per case/dimension (`observability.ts`), tagged so you can
   slice by dimension and case.
3. Report: per-dimension means, the aggregate against your pre-committed
   threshold, per-case win/lose/tie deltas, and any guardrail regressions.
4. State the verdict against the Step 1 decision — **ship / don't ship / need
   more data** — and show the numbers that justify it. Report the effect size and
   whether it clears noise, not just direction.

## Step 6 — Make it repeatable

- Wire the eval into the harness (an experiment under `src/evaluation/experiments`
  or a `SkillEvals` file) so it can be re-run on every future change.
- Keep the dataset and rubric in version control; note the model/prompt versions
  evaluated so results are reproducible.

## Anti-patterns

- Declaring victory from a handful of cherry-picked outputs.
- Editing cases or thresholds after seeing scores.
- One run per case on a stochastic system.
- A single scalar "quality" score hiding dimension-level regressions.
- Trusting an uncalibrated LLM judge as ground truth.

## Deliverable

The dataset, the rubric + scoring methods, the pre-committed threshold, the A/B
results (per-dimension + per-case deltas), and a defensible ship/no-ship verdict
wired into the repo's eval harness so it runs again next time.
