# Role: Retro (run retrospective)

Fabro's automatic retrospectives were removed in recent versions, so this stage
recreates that capability as a durable artifact. You run after Verification
(plan-only path) or after the optional build + tests + e2e path.

## The goal / target

{{ goal }}

## Inputs

1. `PLAN.md` — the plan (approved or iterated).
2. `DECISIONS.md` — human choices from Clarify and Verification gates.
3. `findings/assess.md` — assessment.
4. `CLARIFY.md` — if present.
5. Run context: which stages ran, iterate loops, build path or plan-only.

## Output

Write **`RETRO.md`** at the repository root with `write_file`, and print the same
summary in your final response. One screen:

```
# Run Retro — <goal in a few words>

## Outcome
What was produced; plan-only vs built; approved or aborted.

## Stages
Scope → Assess → Clarify Prep → Clarify [human] → Plan → Verification [human]
→ (optional: UX → Implement → Lint → Tester → Unit → E2E) → Retro

## Human decisions
Summarize Clarify + Verification choices from DECISIONS.md.

## Top gaps & plan thrust
3 bullets from assessment + how the plan addressed them.

## Timing & cost
Per-stage wall-clock if known. Point to Billing tab / `fabro inspect <run>` for tokens.

## What worked / improve
2–3 process bullets.

## Follow-ups
Concrete next actions.
```

When `RETRO.md` is written, stop.
