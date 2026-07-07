---
name: refactor
description: Improve code structure without changing behavior, verified by types, lint, and tests
---

# Refactor

Refactor the target below. Extra context from the user:

> {{user_input}}

A refactor **changes structure, not behavior**. If the request actually implies a
behavior change, stop and clarify — that is a feature, not a refactor.

## Step 1 — Establish a safety net

- Read the code and its callers thoroughly before touching anything.
- Find the tests that cover the target. Run them first (`npm run test:unit`) to
  confirm a green baseline.
- If the target has **no** tests and the refactor is non-trivial, add
  characterization tests first that capture current behavior. You cannot safely
  refactor what you cannot verify.

## Step 2 — Identify the smell

Name the specific problem you are fixing. Common ones:

- Duplicated logic that should be extracted.
- A function or component doing too many things.
- Deep nesting / long parameter lists / primitive obsession.
- Leaky abstractions or unclear naming.
- Dead code and unused exports.

Refactor to *fix a named problem*, not to satisfy personal taste. If nothing is
actually wrong, don't churn the code.

## Step 3 — Refactor in small steps

Make one behavior-preserving move at a time. After each, keep the code compiling.
Common safe moves:

- **Extract function/component** from a large one.
- **Rename** for clarity (use project-wide rename so all references update).
- **Inline** a needless indirection.
- **Introduce a type/interface** to replace repeated inline shapes.
- **Consolidate** duplicated branches.
- **Replace conditionals** with polymorphism or lookup tables where it clarifies.

Constraints:

- Preserve public signatures unless the task is explicitly to change them; if you
  must, update **every** call site.
- Match existing conventions — this is not a rewrite in your preferred style.
- Keep the diff focused. Do not reformat untouched lines or drag in unrelated
  cleanups; that hides the real change.
- No new dependencies unless the task requires it.

## Step 4 — Verify behavior is unchanged

After each meaningful step, and again at the end:

1. `npm run typecheck` — zero errors.
2. `npm run lint` — zero new errors/warnings.
3. `npm run test:unit` — the same tests that were green stay green.

If a test goes red, your change altered behavior. Fix the change, not the test.

## Step 5 — Clean up

- Delete code that is now genuinely unused (dead exports, replaced helpers).
  Confirm it's unused with `grep` first.
- Remove noise comments; keep comments that explain non-obvious intent.
- Re-read the final diff: every hunk should serve the named smell.

## Anti-patterns

- Do not mix a refactor with a feature or bug fix in one pass — separate them.
- Do not "improve" code outside the requested scope.
- Do not weaken types or tests to make the refactor easier.
- Do not remove features or behavior that callers rely on.

## Catalog of safe moves

| Smell | Move |
| --- | --- |
| Same logic in 3+ places | Extract a shared function/hook |
| Function does many things | Split by responsibility |
| Unclear name | Rename (project-wide) |
| Pointless wrapper | Inline it |
| Repeated inline object shape | Introduce a named type/interface |
| Deep nesting | Early returns / guard clauses |
| Long param list | Group into an options object |
| Big switch on type | Lookup table or polymorphism |
| Dead export/branch | Delete (after confirming unused) |

## Deciding whether to refactor at all

Refactor when it makes an *imminent* change easier or removes real, recurring
pain. Do **not** refactor purely because code is "old" or stylistically different
from your preference. Churn without benefit adds review cost and regression risk
for no gain.

## Behavior-preservation rules

- Same inputs must produce the same outputs and the same side effects.
- Public signatures stay stable unless the task is explicitly to change them.
- Error behavior (what throws, what's caught) stays the same.
- Performance characteristics shouldn't regress meaningfully.

If any of these must change, it's no longer a pure refactor — flag it.

## Deliverable

Report: the smell you fixed, the sequence of moves you made, the files touched,
and confirmation that typecheck, lint, and the existing tests all pass with
behavior unchanged.
