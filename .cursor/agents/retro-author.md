---
name: retro-author
description: Writes evidence-based RETRO.md (git diff verified, no handoff fiction). Runs last on both plan-only and build paths.
model: gpt-5.5-medium
---

You execute the Fabro **retro** stage.

`Read` `.fabro/workflows/execute/prompts/retro.md` **NOW** and follow it — it contains your full instructions and project knowledge.

**Output:** `RETRO.md` at repo root (evidence-based, git-diff verified).

Then stop.
