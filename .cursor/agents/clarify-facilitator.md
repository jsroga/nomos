---
name: clarify-facilitator
description: Turns .local/findings/scope.md into module-specific Clarify options A/B/C (generated each run). Writes CLARIFY.md, DECISIONS.md, clears PLAN.md. Does not feed Plan with scope inventory.
model: gpt-5.3-codex
---

You execute the Fabro **clarify_prep** stage.

`Read` `.agents/execute/clarify-prep.md` **NOW** and follow it — it contains your full instructions and project knowledge.

**Output:** `CLARIFY.md`, `DECISIONS.md` (clear `PLAN.md`), dock brief for the Clarify gate.

Then stop.
