# Agent Core: Shared Agentic Infrastructure

> A research-grade, module-agnostic planning and autonomy layer for AI agents.

## Architecture Overview

```
agent-core/
├── executive.ts       # The "Boss" - Decision loop with Co-Pilot protocol
├── planner.ts         # Plan management tool (CRUD operations)
├── schemas.ts         # Zod-validated data structures
├── middleware/        # Safety & control layers
│   └── human-in-loop.ts
├── modes/             # Specialized agent behaviors
│   └── auto-refactor.ts
├── persistence/       # Storage adapters
│   └── json-store.ts
└── templates/         # Reusable plan blueprints
    └── plan-templates.ts
```

## Core Concepts

### 1. Executive Agent
The central orchestrator that implements a **deliberative reasoning loop**:

```
┌─────────────────────────────────────────────────┐
│  OBSERVE → THINK → DECIDE → ACT → LEARN        │
│                                                 │
│  1. Read current plan state                     │
│  2. Generate <thinking> internal monologue      │
│  3. Output structured CoPilotInteraction        │
│  4. Execute tools or request human input        │
│  5. Update plan with results                    │
└─────────────────────────────────────────────────┘
```

### 2. Co-Pilot Protocol
A standardized interaction format for human-agent collaboration:

| Action | Description |
|--------|-------------|
| `PROPOSE_PLAN` | Agent suggests a structured task list |
| `ASK_USER` | Agent requests clarification or approval |
| `EXECUTE_STEP` | Agent performs a tool action |
| `FINISH` | Agent completes the goal |

### 3. TodoArtifact Schema
Zod-validated task tracking with dependency support:

```typescript
PlanItem {
  id: string           // Hierarchical ID (e.g., "1.2.3")
  title: string        // Concise task name
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'skipped'
  dependencies?: string[]  // IDs of prerequisite tasks
  metadata?: Record<string, unknown>  // Domain-specific data
}
```

## Extension Points

### Domain Planners
Extend `ExecutiveAgent` with domain-specific tools and prompts:

- **StorytellerPlanner**: Hero's Journey templates, plot consistency validation
- **GameLoopPlanner**: ECS component templates, system integrity checks

### Middleware
Inject control logic into the agent loop:

- **HumanInTheLoop**: Checkpoint-based approval for risky actions
- **InterruptController**: Pause/resume any agent execution

### Modes
Specialized agent configurations:

- **AutoRefactorAgent**: Self-planning codebase cleanup with ESLint/TSC

## Research Considerations

### Planned Improvements

1. **Reflective Memory**: Store and retrieve past decisions for few-shot learning
2. **Confidence Calibration**: Track prediction accuracy to modulate autonomy
3. **Multi-Agent Coordination**: Protocol for agents to delegate to each other
4. **Trace Lineage**: Full audit trail from goal → plan → actions → outcomes

### Known Limitations

- No long-term memory across sessions (persistence is per-plan only)
- Limited error recovery (failed tasks require manual intervention)
- Single-model architecture (no ensemble or routing)

## Quick Start

```typescript
import { ExecutiveAgent, ExecutiveConfig } from './executive'
import { PlannerTool } from './planner'
import { MemoryPersistence } from './persistence/json-store'

const planner = new PlannerTool(new MemoryPersistence())
const agent = new ExecutiveAgent({
  modelName: 'claude-3-haiku-20240307',
  planner,
  tools: [/* your domain tools */]
})

const result = await agent.runLoop('Your goal here', 'Context about the task')
console.log(result.thought) // Agent's reasoning
console.log(result.type)    // PROPOSE_PLAN | EXECUTE_STEP | ASK_USER | FINISH
```

## Related Documentation

- [Storyteller Planner](./storyteller-planner.md)
- [GameLoop Planner](./gameloop-planner.md)
- [Human-in-the-Loop Middleware](./human-in-loop.md)
- [Auto-Refactor Mode](./auto-refactor.md)
