# `.agents/` configuration

How Fabro, Cursor, and Claude Code share prompts, skills, and session goals. **Goals are the entry point for ad-hoc planning**; **`/execute` / `fabro run`** is the entry point for the dark-factory loop.

## Diagram

```mermaid
flowchart TB
  subgraph entry["Entry points"]
    goals["goals/*.md"]
    exec["/execute · fabro run"]
  end

  goals -->|"Read goal prompt"| session["Claude Code · Cursor Agent"]
  exec --> workflow["Fabro execute workflow"]

  subgraph prompts[".agents/execute/ · stage prompts"]
    direction TB
    scope_md[scope.md]
    clarify_md[clarify-prep.md]
    plan_md[plan.md]
    impl_md[implement.md]
    retro_md[retro.md]
  end

  workflow --> scope_md --> clarify_md --> plan_md --> impl_md --> retro_md

  subgraph agents["Stage agents · named in workflow"]
    scope_runner[scope-runner]
    clarify_fac[clarify-facilitator]
    plan_author[plan-author]
    developer[developer]
    retro_author[retro-author]
  end

  scope_md -.-> scope_runner
  clarify_md -.-> clarify_fac
  plan_md -.-> plan_author
  impl_md -.-> developer
  retro_md -.-> retro_author

  subgraph adapters["Thin adapters · frontmatter only"]
    cursor_agents[".cursor/agents/"]
    claude_agents[".claude/agents/"]
  end

  agents --> adapters
  prompts -->|"workflow.fabro @ path"| workflow

  subgraph skills_block["skills (23)"]
    skills_root[".agents/skills/<name>/SKILL.md"]
  end

  developer -->|"use_skill"| skills_block
  session --> skills_block

  subgraph skill_discovery["Skill discovery"]
    fabro_sk[".fabro/skills → symlink"]
    cursor_sk[".cursor/skills/ → symlink"]
    claude_sk[".claude/skills/ → symlink"]
    fabro_home["~/.fabro/skills/ · local copy"]
  end

  skills_root --> fabro_sk
  skills_root --> cursor_sk
  skills_root --> claude_sk
  skills_root --> fabro_home
```

> **Canonical source:** [execute/partials/configuration-diagram.md](execute/partials/configuration-diagram.md) — edit there first, then sync this block (Fabro cannot `{% include %}` from outside `execute/`).

## Partial includes — what works where

| Consumer | `{% include "partials/…" %}` from `execute/*.md` | Notes |
| --- | --- | --- |
| **Fabro stage prompts** (`.agents/execute/*.md`) | **Yes** | Path must stay under `execute/` (Fabro template root) |
| **GitHub / Cursor plain markdown** | **No** | No Jinja — use the mermaid block above or open [execute/partials/configuration-diagram.md](execute/partials/configuration-diagram.md) |
| **Goals** (`goals/*.md`) | **No** | Session entry: `Read .agents/goals/…`; link here for orientation |
| **This file** (`CONFIGURATION.md`) | **No** | Not processed by Fabro — duplicate diagram is intentional |

**Workflow:** edit [execute/partials/configuration-diagram.md](execute/partials/configuration-diagram.md), then sync the fenced block in this file. Stage prompts that `{% include "partials/configuration-diagram.md" %}` update automatically on the next Fabro run.

## Quick reference

| Path | Role |
| --- | --- |
| `goals/` | Session entry — paste or `Read` a goal; not Fabro stages |
| `execute/` | Fabro workflow stage prompts (scope → retro) |
| `execute/partials/` | Snippets included by execute prompts (`architecture.md`, `configuration-diagram.md`, `session-scratch.md`) |
| `skills/` | Shared `SKILL.md` catalog — **skills (23)** in diagram, not every name |
| `.local/tmp/{session-id}/` | Optional gitignored scratch (scripts, inventories) — see `session-scratch` partial |
| `.local/findings/` | Scope stage output (`scope.md`) — Clarify input only |

## Runners

| Runner | Stage prompts | Skills |
| --- | --- | --- |
| **Fabro** | `workflow.fabro` → `@../../../.agents/execute/<stage>.md` | `.fabro/skills` symlink; local server: `~/.fabro/skills/` copy |
| **Cursor** | `.cursor/agents/*` → `Read` execute prompt | `.cursor/skills/<name>/` symlink |
| **Claude Code** | `.claude/agents/*` → `Read` execute prompt | `.claude/skills/<name>/` symlink |

See also [README.md](README.md) and [.fabro/workflows/execute/README.md](../.fabro/workflows/execute/README.md).
