# Storyteller

> Domain: `src/domains/storyteller/`. Public UI: `@/domains/storyteller` → workspace layout.  
> Mastra conventions: root [AGENTS.md](../AGENTS.md). Module map: [MODULES.md](./MODULES.md).

## Role

Virtual **writers’ room**: series bible, characters, episodes, beats, script drafts, critics, and generative media (moodboard / storyboard / poster) via Trigger.dev.

## Runtime surfaces

| Surface | Path / flag |
|---------|-------------|
| Chat SSE (default) | `/api/storyteller/chat/stream` — agent.stream + tools |
| AgentController chat | `FF_STORYTELLER_CONTROLLER=true` — plan-first modes |
| Autonomous draft | `FF_STORYTELLER_AUTONOMOUS=true` — durable agent + goals |
| Beat-draft workflow | Mastra workflow: plan → draft → critics → revise; editorial **suspend/resume** HITL |
| CLI probe | `npm run storyteller:controller` — interactive plan→approve→build REPL |
| Live tests | `npm run test:live` — `*.e2e.test.ts` against real agents/models/DB |

## AgentController (accepted ADR, 2026-07)

**Flag:** `FF_STORYTELLER_CONTROLLER=true`. Legacy stream path remains default when unset.

| Piece | Choice |
|-------|--------|
| Controller | `storyteller-chat`; **existing** Postgres Mastra store only |
| Session | per user/project tags; thread per conversation |
| Modes | **mutations-only plan-first**: `chat` (reads + `submit_plan`) → `build` (mutating tools) |
| Beat verdict | stays workflow suspend — compose with controller modes |
| SSE | reuse frozen `ChatFrameType` frames (`Start` / `Token` / `ToolResult` / `Questions` / …) |

Reads are never gated. Mutating tools are invisible in `chat` mode until a plan is approved.

Implementation: `src/domains/storyteller/ai/controller/`. Registration via `core/io/mastra-runtime.ts`.

## Beat-draft pipeline

Durable Mastra workflow (not the chat AgentController):

1. Plan beats / brief  
2. Draft prose  
3. Parallel critics (prose / stakes / continuity)  
4. Revise  
5. Human verdict via workflow suspend schemas  

Wire contract for chat frames: skill `sse-wire-contract` + e2e smoke.

## Layout (domain)

```
ai/agents/     # Muse, author, critics, chat adapter, …
ai/workflows/  # beat-draft, …
ai/controller/ # AgentController
services/      # CRUD, context assembly, RAG helpers
tasks/         # moodboard, storyboard, poster, …
ui/            # World Bible, timeline, writers room chrome
state/         # TanStack + UI stores
core/io/       # API clients, mastra-runtime seam
```

## UI highlights

- World Bible panel (lockable for central users)
- Phase navigator / beat board / character web
- Streaming writers’ room chat

## Evals

`npm run eval` — golden set + craft scorers. Policy in [DEVELOPMENT.md](./DEVELOPMENT.md).
