---
name: review
description: Review code changes for correctness, security, and quality with prioritized, actionable findings
---

# Code Review

Review the code changes described below. Extra context from the user:

> {{user_input}}

If no specific target is given, review the current diff (`git diff` and
`git diff --staged`, plus untracked files from `git status`).

## Step 1 — Scope the review

- Read `git status`, `git diff`, and `git diff --staged` to see every change.
- For each changed file, read enough surrounding code to understand the context —
  never review a hunk in isolation.
- Identify the intent of the change. Review against that intent, not your own
  preferred design.

## Step 2 — Review dimensions

Evaluate the changes across these dimensions, in priority order:

### Correctness (highest priority)

- Does the code do what it intends? Trace the important paths.
- Off-by-one, null/undefined, empty-array, and boundary conditions.
- Async correctness: unhandled rejections, race conditions, missing `await`.
- State management: stale closures, incorrect effect dependencies.

### Security

- Untrusted input reaching queries, file paths, shell, or `eval`.
- Missing authz/authn checks at boundaries; widened access as a side effect.
- Secrets or tokens committed, logged, or sent to the client.
- SSRF, injection, XSS, path traversal in any new I/O.

### Error handling & resilience

- Are boundary failures (network, DB, external APIs) handled the way the UX
  requires? Do errors surface usefully instead of being swallowed?
- Conversely, flag *over*-defensive code guarding impossible states.

### Types & API design

- `any`, unsafe casts, `@ts-ignore` masking real problems.
- Public function/prop/type signatures that are unclear or leak internals.

### Readability & maintainability

- Naming, structure, and consistency with the surrounding codebase.
- Dead code, duplicated logic, needless complexity.
- Comments: are non-obvious decisions explained? Are there noise comments that
  just restate the code (flag them)?

### Tests

- Are the risky paths covered? Are new tests meaningful (behavior, not
  implementation)? Any weakened or skipped tests?

### Performance (only when it matters)

- N+1 queries, unnecessary re-renders, large synchronous work on hot paths.
  Do not premature-optimize; flag only real, likely-hot issues.

## Step 3 — Report findings

Group findings by severity. For each, give the file/line, the problem, why it
matters, and a concrete suggested fix.

- **🔴 Blocking** — must fix before merge (bugs, security, data loss, broken types).
- **🟡 Should fix** — real issues that aren't strictly blocking.
- **🟢 Nit** — style/polish; optional.

Then a short **Summary**: overall assessment and a clear verdict —
*approve*, *approve with nits*, or *request changes*.

## Principles

- Be specific and actionable. "This is fragile" is useless; show the input that
  breaks it and the fix.
- Distinguish facts (bugs) from preferences (style). Label preferences as nits.
- Praise genuinely good decisions briefly — it calibrates the rest.
- Review the code, not the author. No "you're right"; just findings.
- Respect scope: don't demand unrelated refactors. If you spot something out of
  scope, note it as a follow-up, not a blocker.
- Do not modify code in this skill — this is a review. Report; let the author fix.

Keep the report skimmable: an experienced engineer should get the blocking items
in the first ten seconds.
