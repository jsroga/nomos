---
name: debug
description: Systematically find and fix the root cause of a bug using evidence, not guesses
---

# Debug

Investigate and fix the problem described below. Extra context from the user:

> {{user_input}}

Debug with **evidence**, not intuition. The goal is to fix the *root cause*, not
to make the symptom disappear.

## Step 1 — Reproduce

- Restate the bug precisely: what is the expected behavior, what actually happens,
  and under what conditions?
- Find or create the smallest reliable reproduction. If there's a failing test or
  error log, start there. If not, write a quick repro (a failing test is ideal —
  it becomes your regression test later).
- If you cannot reproduce it, gather more information before changing code. Ask
  for exact steps, inputs, environment, and the full error/stack trace.

## Step 2 — Localize

- Read the stack trace top to bottom; map each frame to a file.
- Use `grep`/`glob` to trace the data flow from the entry point to the failure.
- Form a hypothesis about *where* the invariant breaks, then confirm it with
  evidence before acting:
  - Add targeted logging or inspect state at the suspected boundary.
  - Check inputs at each layer — the bug is often "bad data arrived here",
    not "this function is wrong".
- Bisect if useful: `git log`/`git blame` on the suspect lines, or mentally
  bisect the code path to isolate the failing segment.

## Step 3 — Diagnose the root cause

State the root cause explicitly in one or two sentences: *"X happens because Y
assumes Z, but Z is false when W."* If you can't state it clearly, you haven't
found it yet — keep investigating.

Distinguish:

- **Root cause** — the actual defect.
- **Symptom** — what the user observed.
- **Contributing factors** — missing validation, absent test, unclear types.

## Step 4 — Fix the root cause

- Make the **minimal** change that correctly addresses the root cause.
- Match existing conventions and error-handling patterns.
- Do not paper over the symptom (e.g. swallowing an exception, adding a null
  check that hides why the value was null) unless that truly *is* the correct fix.
- If the bug reveals a broader class of problem, fix the immediate instance and
  note the class as a follow-up rather than silently expanding scope.

## Step 5 — Prove it's fixed

1. Turn your reproduction into a **regression test** that fails before the fix and
   passes after. Add it to the suite.
2. Run `npm run test:unit` — the new test passes and nothing else broke.
3. Run `npm run typecheck` and `npm run lint`.
4. Remove any temporary logging/instrumentation you added while investigating.

## Anti-patterns

- Do not guess-and-check by mutating code randomly until the symptom vanishes.
- Do not fix a symptom while leaving the root cause live.
- Do not delete or weaken the failing test to "resolve" the bug.
- Do not expand the change into an unrelated refactor.

## Deliverable

Report: the reproduction, the root cause (stated plainly), the fix and why it's
correct, the regression test you added, and confirmation that the suite,
typecheck, and lint all pass.
