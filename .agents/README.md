# `.agents/` — shared prompts, skills & session goals

**Single source of truth** for dark-factory execute **stage prompts**, **project skills**, and ad-hoc **session goals**. Fabro, Cursor, and Claude Code read from here — do not duplicate bodies elsewhere.

**Configuration map:** [CONFIGURATION.md](CONFIGURATION.md) (mermaid diagram + include rules).

## Layout

```
.agents/
  README.md
  CONFIGURATION.md      ← how runners wire together (diagram)
  execute/              ← Fabro workflow stage prompts (scope, plan, implement, …)
    scope.md
    clarify-prep.md
    plan.md
    implement.md
    retro.md
    partials/           ← included by execute prompts (Fabro {% include %})
      architecture.md
      configuration-diagram.md
      session-scratch.md
  skills/               ← use_skill + /slash skills (23 — see skills/README.md)
    README.md
    <name>/SKILL.md
  goals/                ← session entry — one-off planning prompts (not Fabro stages)
    storyteller-grrm-plan-prompt.md
```

## Stage prompts (`execute/`)

| Runner | How it loads |
| --- | --- |
| **Fabro** | `workflow.fabro` → `@../../../.agents/execute/<stage>.md` |
| **Cursor** | `.cursor/agents/<adapter>.md` → `Read` `.agents/execute/<stage>.md` |
| **Claude Code** | `.claude/agents/<adapter>.md` → `Read` `.agents/execute/<stage>.md` |

Adapters hold YAML frontmatter only. All stage rules live in `.agents/execute/`.

## Skills (`skills/`)

| Runner | How it loads |
| --- | --- |
| **Fabro** | `.fabro/skills` → symlink to `.agents/skills/`; local: copy to `~/.fabro/skills/` |
| **Cursor** | `.cursor/skills/<name>/` → symlink to `.agents/skills/<name>/` |
| **Claude Code** | `.claude/skills/<name>/` → symlink to `.agents/skills/<name>/` |

See [skills/README.md](skills/README.md) for catalog and `~/.fabro/skills` setup.

## Session goals (`goals/`)

**Entry point for ad-hoc sessions** — not part of the Fabro execute graph. Paste into Claude Code, e.g.:

```text
Read .agents/goals/storyteller-grrm-plan-prompt.md and follow it.
```

Orientation: [CONFIGURATION.md](CONFIGURATION.md).

## Local scratch (optional, gitignored)

Agents may use **`.local/tmp/{session-id}/`** for throwaway session artifacts (helper scripts,
saved command output, extra notes). Optional — not a required deliverable path. See
`execute/partials/session-scratch.md` (included in Scope, Plan, Implement prompts).

## Editing rules

1. Change content under `.agents/` only.
2. Run `fabro validate .fabro/workflows/execute/workflow.fabro` after template changes in `execute/`.
3. After skill changes, refresh `~/.fabro/skills/` if you use local Fabro (`cp -R .agents/skills/. ~/.fabro/skills/`).
4. Never copy prompt or skill bodies into `.cursor/`, `.claude/`, or `.fabro/` adapters — they symlink or point here.
