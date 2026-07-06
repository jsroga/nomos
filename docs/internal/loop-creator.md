# Loop Creator Module Documentation

> **Last reviewed:** 2026-07-06

## Overview

The Loop Creator module is an AI-powered game design assistant. Designers architect gameplay loops, progression systems, and mechanical balance using a multi-agent Mastra system.

## Architecture

### Multi-Agent System (Game Design Lab)

**Mastra agents** collaborate under an imperative **supervisor orchestrator** (`src/domains/loop-creator/core/graph/loop-orchestrator.ts`). LangGraph was removed; `loop-graph.ts` is a thin re-export for backward compatibility.

| Agent | Role |
|-------|------|
| **Supervisor** | Routes user intent to specialists |
| **Loop Planner** | Core loop and meta-loop strategy |
| **Mechanics Designer** | Concrete mechanics (combat, interactions) |
| **Progression Architect** | XP curves, retention vectors |
| **Balance Analyst** | Fairness and difficulty scaling |
| **Market Analyst** | Competitor/genre context (Mastra Agent + tools) |

### State Management

Centralized graph state in `src/domains/loop-creator/core/graph/state.ts`:

#### Mechanic nodes

Building blocks with `inputs`/`outputs`, `balanceFactors` (effort, reward, frequency), and RAG `citations`.

#### Game loops

Collections of mechanics with psychological phases (`challenge` → `action` → `feedback`) and timeframes (`micro`, `session`, `meta`).

#### Progression systems

Long-term curves (`linear`, `exponential`, `logarithmic`, `s-curve`) and milestones.

### Streaming API

`streamLoopCreator()` yields `StreamEvent` objects (`node`, `message`, `action`, `token`, `error`) consumed by `/api/loop-creator/chat`.

### Integration

`useLoopDesign` hooks let Storyteller and other modules align narrative/spatial choices with mechanical loops.

## Workflow

1. **Initiate** — genre and player fantasy  
2. **Draft** — Loop Planner + Mechanics Designer first pass  
3. **Refine** — Balance + Progression stress-test  
4. **Finalize** — Concept evaluation; lock for production reference  

## Tests

```bash
npx vitest run src/domains/loop-creator
```

E2E: `npm run test:e2e full-loop`
