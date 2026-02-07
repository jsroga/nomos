
# Agent Core Architecture

**Goal**: A shared, module-agnostic library for "Agentic Planning" & "Autonomy".
**Status**: Phase 12 (Active)

## Boundary Definition
This directory (`src/agent-core`) contains the **pure cognitive primitives** required for an agent to plan, execute, and correct itself. It DOES NOT contain domain-specific logic (e.g., RPG rules, Storyteller prompts, Game Loop ECS).

### 📦 Agent Core (Shared)
*   **Artifacts**: `TodoArtifact` (JSON Schema for tasks).
*   **Tools**: `PlannerTool` (Read/Write todo.md), `ExecutiveAgent` (The Loop).
*   **Protocols**: `CoPilotProtocol` (E2E requirements gathering).
*   **Memory**: Abstract interfaces for Task Persistence.

### 🧩 Modules (Extensions)
Domain-specific logic should EXTEND the core:
*   `src/domains/storyteller/planner`: Extends `PlannerTool` with "Hero's Journey" templates.
*   `src/domains/game-loop/planner`: Extends `PlannerTool` with ECS/Component templates.
*   `e2e/agent`: Uses `ExecutiveAgent` with `PlaywrightTool` for self-driving tests.

## Strict Process
To maintain reliability in this core "OS":
1.  **Type Safety**: `tsc` must pass after every change.
2.  **Linting**: `eslint` must be clean.
3.  **Tracing**: All "Thoughts" must be logged to LangSmith.

## Directory Structure
```
agent-core/
├── schemas.ts       # Zod schemas for Plans, Todos, Memories
├── planner.ts       # The "Brain" (Read/Write Logic)
├── executive.ts     # The "Boss" (Agent Loop)
├── tools/           # Generic Tools (FileSearch, Calculator)
└── prompt-templates/# Base prompts (Co-Pilot, Refactor)
```
