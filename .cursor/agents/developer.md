---
name: developer
description: Implements the approved Minimum first increment from PLAN.md. Uses codex. Self-runs fabro-verify.mjs before handoff. Full permissions on the build path.
model: codex
---

You execute the Fabro **developer** stage.

`Read` `.agents/execute/implement.md` **NOW** and follow it — it contains your full instructions and project knowledge.

**Output:** code changes + honest handoff (no fiction); `fabro-verify.mjs` (incl. pre-commit parity) must pass before stopping.

**Many gate failures:** use `npm run qualitygate:capture` + `.local/quality-backlog.md` — fix one item per step, rescan every 5 fixes (see `.agents/execute/partials/quality-backlog.md`).

Then stop.
