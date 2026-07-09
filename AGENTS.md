# AGENTS.md — Mastra development

This repo uses **Mastra v1** (`@mastra/core@^1.x`). Read this before changing agents, tools, workflows, or memory. Mirror patterns in `src/domains/storyteller/agents/*` and `src/shared/agent-kernel/mastra/*`.

## Dark factory

The dark-factory execute loop has three interchangeable runners that share the **same stages, prompts, gates, and verify script**:

- **Interactive (IDE):** `/execute <module>` skill in Cursor Agent → delegates to `.cursor/agents/*` subagents (one per Fabro stage), `AskQuestion` at the Clarify and Verification gates. See `.cursor/skills/execute/SKILL.md`.
- **Claude Code:** same stages via `.claude/agents/*` subagents → `Read` `.agents/execute/*.md`.
- **Sandboxed:** `fabro run .fabro/workflows/execute/workflow.toml -I module=<x>` (Docker/Daytona). Stage prompts load from **`.agents/execute/`** — never duplicate.
- **Headless / CI:** `src/shared/agent-kernel/cursor-runner.ts` (Cursor SDK, `local.autoReview` + `customTools` exposing `fabro_run` / `fabro_verify` / `npm_script`) → wrapped by the Trigger.dev task `src/trigger/cursor-execute.task.ts` (`cursor-execute`).

`.cursor/` + `.claude/` config: scoped `rules/*.mdc`, thin subagents in `.cursor/agents/` and `.claude/agents/` (pointers only), **prompts in `.agents/execute/`**, **skills in `.agents/skills/`** (IDE symlinks + `.fabro/skills` → same), `skills/execute/`, `hooks.json`, `mcp.json`. Automations: `.cursor/automations/`.

## Rules

- Import from `@mastra/core/agent`, `/tools`, `/mastra`, `/workspace` — not package root.
- Use `RequestContext`, not `RuntimeContext`.
- `createTool` execute: `(inputData, context)` — separate params.
- No `format` on agents; use `structuredOutput`.
- Model strings: `'openai/gpt-4o-mini'`, `'anthropic/claude-…'` (`provider/model`).
- Keep Mastra packages on the same v1 version.

## Layout

| Concern | Location |
|---------|----------|
| Mastra instance | `src/mastra.ts` (Studio CLI), `src/shared/agent-kernel/MastraInstance.ts` (app) |
| Agents | `src/domains/*/agents` |
| Tools | `src/domains/*/agents/tools`, `src/shared/agent-kernel/mastra/tools/` |
| Models | `src/agent-core/models.ts`, domain `ModelConfig/` |
| Memory | `@mastra/memory` + `PostgresStore` via shared storage |
| Observability | `@mastra/observability`, `src/shared/observability/observability.ts` |
| Evals / scorers | `@mastra/core/evals` `createScorer`, `src/shared/agent-kernel/scorers/` |
| Prompts | `src/prompts/*`, domain `prompts/` |

## Tool pattern

```ts
export const myTool = createTool({
  id: 'my_tool',
  description: 'When the model should call this — be specific.',
  inputSchema: z.object({ … }),
  outputSchema: z.object({ … }),
  execute: async (inputData, context) => { … },
})
```

Delegate business logic to `src/services/*` when it exists. Tool `id` is snake_case and stable.

## Agent pattern

Register through the central Mastra instance so storage, workspace, and tracing are shared. Wrap runs in `withSpan` where the domain already does. Bound memory (`lastMessages: 10` or similar).

Subagents → `agents` config (`agent-<key>` tools). Mastra workflows ≠ Fabro workflows (`.fabro/workflows/execute/`).

## Don't

- Second Postgres store or Mastra instance.
- `RuntimeContext`, root `@mastra/core` imports, old single-arg `execute`.
- Hardcoded secrets or model strings.
- Remove tracing or shrink memory windows without reason.
- **Type assertions** (`as any`, `as Type`) — use guards, Zod, or `recordFromJson`; `as const` only.
- **Cross-domain imports** (`src/domains/foo` importing `@/domains/bar`) — lift to `@/shared`.
- **Local `deepMerge`** — use `@/shared/data/deep-merge`.
- **Magic string protocol values** as bare literals — use **`enum`**, not `as const` object maps.
- **File-level `eslint-disable`** for quality rules (`local/no-magic-string`, `local/complexity-strict`, `local/max-lines-strict`, etc.) — forbidden without explicit user approval.

## Verify

**During work:** `npm run qualitygate:file -- <path>` · `npm run qualitygate:changed` · `npm run qualitygate:tsc -- --files <path>` — not full-repo `tsc` mid-task. **Many failures:** `npm run qualitygate:capture` → `.local/quality-backlog.md` (fix one, `qualitygate:backlog -- done <id>`, rescan every 5).

**Before handoff:** `npm run typecheck` · `npm run lint` · `npm run test:unit`
