# AGENTS.md — AI Development with Mastra

Guidance for coding agents building and modifying **AI agents, tools, workflows,
and memory** in this repo. This project uses **Mastra v1** (`@mastra/core@^1.x`,
released Jan 2026). Pair this with `CLAUDE.md` (Trigger.dev + dev commands) and
the domain code under `src/domains/*/agents` and `src/agent-core`.

> If you touch agent/tool/workflow/memory code, read this first. When in doubt,
> mirror the existing patterns in `src/domains/storyteller/agents/*` and
> `src/agent-core/*` rather than inventing new ones.

## Golden rules (Mastra v1)

- **Subpath imports only.** Import from `@mastra/core/agent`, `@mastra/core/tools`,
  `@mastra/core/mastra`, `@mastra/core/workspace` — not the package root.
- **`RequestContext`, not `RuntimeContext`.** v1 renamed it everywhere.
- **`createTool` execute signature is `(inputData, context)`** — input and
  context are separate params in v1.
- **No `format` param** on agent methods; use `structuredOutput` for typed output.
- **Model is a string** like `'openai/gpt-4o-mini'` or `'anthropic/claude-...'`
  (note this repo normalizes `provider:model` → `provider/model`; see
  `StorytellerAgent`).
- Keep all Mastra packages on the same `@latest` v1 version to avoid mismatches.

## Where things live

| Concern | Location |
| --- | --- |
| Central Mastra instance (storage, workspace, observability) | `src/domains/storyteller/agents/MastraInstance/` |
| Agents | `src/domains/storyteller/agents/*`, `src/domains/game-design/agent.ts` |
| Tools | `src/domains/*/tools/*` (many via `createTool`) |
| Model config | `src/domains/storyteller/agents/ModelConfig/`, `src/agent-core/models.ts` |
| Memory | `@mastra/memory` (`Memory` + `PostgresStore` from `@mastra/pg`) |
| Skills (workspace) | loaded via `SKILLS_DIR` in `MastraInstance` |
| Observability | Langfuse via `@mastra/langfuse` + `src/agent-core/observability.ts` |
| Prompts | `src/prompts/*` (repository + registry), domain prompt builders |

## Defining a tool

```ts
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

export const manageBeatTool = createTool({
  id: 'manage_beat',
  description: 'Create or update a story beat. Explain when to use it — the model reads this.',
  inputSchema: z.object({ episodeId: z.string(), title: z.string() }),
  outputSchema: z.object({ id: z.string() }),
  execute: async (inputData, context) => {
    // inputData is validated against inputSchema
    // context exposes requestContext + execution metadata (v1)
    return { id: '…' }
  },
})
```

- Give every tool a precise `description` — it drives tool selection.
- Keep tool business logic thin; delegate to `src/services/*` where shared logic
  already exists (so REST, MCP, and agents stay consistent).
- `id` is snake_case and is what the model calls; keep it stable.

## Defining an agent

```ts
import { Agent } from '@mastra/core/agent'
import { Memory } from '@mastra/memory'

const agent = new Agent({
  id: 'storyteller',
  name: 'Storyteller',
  instructions,                 // system prompt string
  model: 'openai/gpt-4o-mini',  // provider/model string
  tools: toolsMap,              // Record<toolId, tool>
  memory,                       // new Memory({ storage, options })
  workspace,                    // from mastra.getWorkspace() — enables skills
})
```

- Register agents/tools through the central instance
  (`getMastraInstance()` in `MastraInstance`) so they share storage, workspace,
  and observability.
- **Subagents:** add via the `agents` config → exposed as tools named
  `agent-<key>`. **Workflows:** add via `workflows` config → `workflow-<key>`.
- Run with `.generate(prompt, opts)` for a full response or `.stream(prompt, opts)`
  for tokens. Control tools at call time with `toolChoice` / `activeTools`.
- This repo wraps runs in `withSpan(...)` for tracing — keep that instrumentation
  when editing run methods.

## Memory

```ts
import { Memory } from '@mastra/memory'
const memory = new Memory({
  storage: getStorageInstance(),          // PostgresStore
  options: { lastMessages: 10 },          // keep bounded — long windows burn tokens
})
```

Thread-based persistence with semantic recall + working memory. Reuse
`getStorageInstance()`; don't spin up a second Postgres store.

## Workflows (Mastra, when used for AI orchestration)

- Build with `createWorkflow(...)` + `createStep(...)`, chain with `.then()` /
  `.map()`, finish with `.commit()`. Supports suspend/resume.
- v1 renames: `createRunAsync` → `createRun`; `runCount` → `retryCount`.
- Agents can be composed as steps; pass `structuredOutput` to a step for typed,
  chainable output.

> Note: Mastra workflows are the *in-app* AI orchestration. The Fabro workflows
> under `.fabro/workflows/*` are a *separate* dev-time agent-orchestration tool.
> Don't conflate them.

## Structured output

Prefer `structuredOutput` (schema-validated typed objects) over parsing free text.
Do not use the removed `format` parameter.

## Observability & models

- Tracing goes to **Langfuse** (`@mastra/langfuse`) via the instance's
  `Observability` config; keep `serviceName`/exporters intact.
- Pull models/defaults from `ModelConfig` / `src/agent-core/models.ts` rather than
  hardcoding model strings in agents.
- Serialization limits are set via `MASTRA_SERIALIZATION_*` env in
  `MastraInstance` — don't remove that setup.

## Do / Don't

**Do**

- Reuse the central Mastra instance, storage, and workspace.
- Keep tool descriptions sharp and `inputSchema`/`outputSchema` strict (Zod).
- Put shared logic in `src/services/*`; keep tools/agents as thin adapters.
- Preserve `withSpan`/Langfuse instrumentation and memory bounds.
- Follow the strict TypeScript bar (no `any` escape hatches, no `@ts-ignore`).

**Don't**

- Import from the `@mastra/core` root or use `RuntimeContext` (v1: `RequestContext`).
- Use the old `(context)`-only `createTool` execute signature.
- Instantiate a second Postgres store or Mastra instance.
- Hardcode secrets or model strings; use env + `ModelConfig`.
- Remove existing agents, tools, prompts, or instrumentation when refactoring.

## Verify before handing off

`npm run typecheck` · `npm run lint` · `npm run test:unit` (and
`npm run skills:validate` when touching skills). All must pass.
