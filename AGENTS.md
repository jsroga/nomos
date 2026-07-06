# AGENTS.md — Mastra development

This repo uses **Mastra v1** (`@mastra/core@^1.x`). Read this before changing agents, tools, workflows, or memory. Mirror patterns in `src/domains/storyteller/agents/*` and `src/mastra/*`.

## Dark factory

The dark-factory execute loop has three interchangeable runners that share the **same stages, prompts, gates, and verify script**:

- **Interactive (IDE):** `/execute <module>` skill in Cursor Agent → delegates to `.cursor/agents/*` subagents (one per Fabro stage), `AskQuestion` at the Clarify / Verification / Preview gates. See `.cursor/skills/execute/SKILL.md`.
- **Sandboxed:** `fabro run .fabro/workflows/execute/workflow.toml -I module=<x>` (Docker/Daytona). Stage prompts are the single source of truth in `.fabro/workflows/execute/prompts/` — the Cursor subagents `Read` those same files; never duplicate.
- **Headless / CI:** `src/shared/agent-kernel/cursor-runner.ts` (Cursor SDK, `local.autoReview` + `customTools` exposing `fabro_run` / `fabro_verify` / `npm_script`) → wrapped by the Trigger.dev task `src/trigger/cursor-execute.task.ts` (`cursor-execute`).

`.cursor/` config: scoped `rules/*.mdc`, `agents/*.md` subagents, `skills/execute/`, `hooks.json` (verify gate + destructive-command guard), `mcp.json` (trigger + fabro + world-building-kit). Automations: `.cursor/automations/pr-verify.md`, `nightly-module-sweep.md` (materialize via `/automate`).

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
| Mastra instance | `src/mastra/`, `src/shared/agent-kernel/MastraInstance.ts` |
| Agents | `src/domains/*/agents`, `src/mastra/agents/` |
| Tools | `src/domains/*/agents/tools`, `src/mastra/tools/` |
| Models | `src/agent-core/models.ts`, domain `ModelConfig/` |
| Memory | `@mastra/memory` + `PostgresStore` via shared storage |
| Observability | `@mastra/langfuse`, `src/agent-core/observability.ts` |
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

## Verify

`npm run typecheck` · `npm run lint` · `npm run test:unit`
