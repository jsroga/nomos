# Agent session workspace (gitignored runtime)

When a user request spans **multiple tasks / systems / files**, agents **must** open a
session folder under `.local/sessions/` and keep it updated until handover.

`.local/` is gitignored — never commit secrets or session dumps. The **convention** is
documented here and in:

- `.agents/execute/partials/session-tracking.md` (Fabro / Cursor / Claude stage include)
- `.cursor/rules/session-tracking.mdc` (always-on Cursor rule)
- `AGENTS.md` · `CLAUDE.md` · `README.md`

## Folder name

```
.local/sessions/YYYY-MM-DD_<shortId>_<slug>/
```

| Part | Rule | Example |
|------|------|---------|
| `YYYY-MM-DD` | Local date | `2026-07-28` |
| `shortId` | 6–8 chars (Cursor chat id prefix, Fabro run id, or random) | `b14aa177` |
| `slug` | kebab-case ≤40 chars from the request | `perf-nav-mastra` |

Example: `.local/sessions/2026-07-28_b14aa177_perf-nav-mastra/`

## Required files

| File | Purpose |
|------|---------|
| `REQUESTS.md` | User asks in order (verbatim / paraphrased bullets) |
| `TODOS.md` | Checkbox list; update as work completes |
| `PLAN.md` | Approach, ranked risks, file touch list |
| `MEMORY.md` | Decisions, env gotchas, “do not redo” notes |
| `STATUS.md` | Current focus + blocked + next; rewrite each meaningful step |

Optional: `NOTES.md`, `DIFF-HINTS.md`, command logs.

## When to create

**Create** when any of:

- User asks for **2+ distinct deliverables** in one turn or thread
- Work spans **>1 subsystem** (e.g. UI + Mastra + hooks)
- Handover will take **>1 agent turn**

**Skip** for single-file / single-bug fixes with an obvious one-shot fix.

## Handover

Before claiming done: every `TODOS.md` item is `[x]` or explicitly deferred in `STATUS.md`
with a reason. Quality gate + (if Mastra files touched) Mastra smoke must pass.
