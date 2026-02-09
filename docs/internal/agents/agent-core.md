# Agent Core: Shared Agentic Infrastructure

> A research-grade, module-agnostic planning and autonomy layer for AI agents.

## Boundary Definition
This module (`src/agent-core`) contains the **pure cognitive primitives** required for an agent to plan, execute, and correct itself. It DOES NOT contain domain-specific logic (e.g., RPG rules, Storyteller prompts). Domain logic should be implemented in `src/domains/`.

## Architecture Overview

```
agent-core/
├── executive.ts       # The "Boss" - Decision loop with Co-Pilot protocol
├── planner.ts         # Plan management tool (CRUD operations)
├── schemas.ts         # Zod-validated data structures
├── middleware/        # Safety & control layers (Human-in-loop)
└── persistence/       # Storage adapters (JSON store)
```

### 1. Executive Agent
The central orchestrator implementing a **deliberative reasoning loop**:
`OBSERVE → THINK → DECIDE → ACT → LEARN`

1.  Read current plan state.
2.  Generate internal monologue (`<thinking>`).
3.  Output structured CoPilotInteraction.
4.  Execute tools or ask user.
5.  Update plan.

### 2. Co-Pilot Protocol
Standardized interaction format:
*   `PROPOSE_PLAN`: Agent suggests a task list.
*   `ASK_USER`: Agent requests clarification/approval.
*   `EXECUTE_STEP`: Agent performs a tool action.
*   `FINISH`: Agent completes the goal.

### 3. TodoArtifact Schema
Zod-validated task tracking with support for hierarchical IDs and dependencies.

## Extension Points

### Domain Planners
Extend `PlannerTool` and `ExecutiveAgent` with domain-specific capabilities:
*   **StorytellerPlanner**: Adds Hero's Journey templates & plot consistency checks.
*   **GameLoopPlanner**: Adds ECS component templates & system integrity checks.

### Middleware
*   **HumanInTheLoop**: Checkpoint-based approval.
*   **InterruptController**: Pause/resume execution.

## Strict Process
To maintain reliability in this core "OS":
1.  **Type Safety**: `tsc` must pass.
2.  **Linting**: `eslint` must be clean.
3.  **Tracing**: All "Thoughts" logged to LangSmith.
