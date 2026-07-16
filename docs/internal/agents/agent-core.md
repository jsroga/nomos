# Agent Core: Shared Agentic Infrastructure

> Module-agnostic planning and autonomy primitives. **Last reviewed:** 2026-07-06.

## Boundary

| Layer | Path | Role |
|-------|------|------|
| **Cognitive primitives** | `src/shared/agent-kernel/` | Executive loop, planner, schemas, persistence, skills |
| **Mastra kernel** | `src/shared/agent-kernel/mastra/` | `createMastra`, Studio registry, Observability/workspace |
| **Production instance** | `src/shared/agent-kernel/MastraInstance.ts` | Singleton + Postgres memory for app |
| **Domain agents** | `src/domains/*/agents/` | Storyteller, loop-creator, game-design, etc. |

Domain logic (prompts, tools, workflows) stays in `src/domains/`. Do not put RPG/story rules in agent-core.

## Architecture Overview

```
shared/agent-kernel/
├── executive.ts           # Deliberative loop: OBSERVE → THINK → DECIDE → ACT
├── planner.ts             # Plan CRUD tool
├── schemas.ts             # Zod structures
├── models.ts              # Model registry
├── skills/                # Skill loader (migrating to Mastra Workspace)
├── mastra/
│   ├── create-mastra.ts   # Shared Mastra factory
│   ├── index.ts           # Mastra Studio entry
│   ├── agents/registry.ts
│   └── tools/bundles.ts   # Studio tool catalog
└── MastraInstance.ts      # App singleton + Postgres memory
```

### Executive Agent

Central orchestrator for plan-driven tasks:

`OBSERVE → THINK → DECIDE → ACT → LEARN`

### Co-Pilot Protocol

* `PROPOSE_PLAN` — suggest a task list  
* `ASK_USER` — request clarification  
* `EXECUTE_STEP` — run a tool  
* `FINISH` — complete the goal  

## Extension Points

* **StorytellerPlanner** — Hero's Journey templates (`domains/storyteller/ai/orchestration/`)
* **Loop orchestrator** — imperative supervisor (`domains/loop-creator/core/graph/loop-orchestrator.ts`)

## Observability

Mastra `Observability` + `MastraStorageExporter` (wired in `create-mastra.ts`) is the sole tracer — agent/LLM/tool spans land in Postgres. Legacy manual span helpers in `src/shared/observability/` are thin sanitization wrappers only. Eval scorers live in `src/shared/agent-kernel/scorers/` and register on the Mastra instance.

## Local development

```bash
npm run mastra:dev   # Studio at http://localhost:4111
```

Edit agents in code; restart Studio to pick up changes. In-Studio agent editing is not supported.
