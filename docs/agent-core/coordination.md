# Multi-Agent Coordination & Trace Lineage

> Research-grade components for agent orchestration and observability.

## Agent Coordinator

Enables agents to discover each other and delegate tasks.

### Architecture

```
┌─────────────┐    delegate    ┌─────────────┐
│  Agent A    │ ────────────▶  │  Agent B    │
│ (Planner)   │                │ (Executor)  │
└─────────────┘    result      └─────────────┘
       ▲        ◀────────────         │
       │                              │
       └────────── Coordinator ───────┘
```

### API Reference

| Method | Purpose |
|--------|---------|
| `register(agent)` | Register agent with capabilities |
| `findByCapability(cap)` | Find agents that can handle a task type |
| `delegate(from, to, task)` | Send task to another agent |
| `broadcast(from, payload)` | Send message to all agents |
| `onMessage(agentId, handler)` | Register message handler |

### Usage

```typescript
import { AgentCoordinator } from './coordination/multi-agent'

const coordinator = new AgentCoordinator()

// Register agents
coordinator.register({
    id: 'planner-1',
    name: 'StoryPlanner',
    capabilities: ['story', 'character-arc'],
    status: 'idle'
})

coordinator.register({
    id: 'executor-1',
    name: 'ChapterWriter',
    capabilities: ['prose', 'dialogue'],
    status: 'idle'
})

// Find capable agent
const writers = coordinator.findByCapability('prose')

// Delegate task
await coordinator.delegate('planner-1', 'executor-1', {
    task: 'Write chapter 3',
    context: { characters: [...], setting: '...' }
})
```

---

## Trace Lineage

Full audit trail from goal to outcome.

### Core Concepts

**Spans**: Timed execution contexts with parent-child relationships.
**Events**: Discrete occurrences within a span.

```
Goal "Write Chapter"
├── Span: "Plan Chapter" (2.3s)
│   ├── Event: plan_created
│   └── Event: task_started
├── Span: "Generate Outline" (1.1s)
│   ├── Event: tool_called (get_plot_phase)
│   └── Event: task_completed
└── Span: "Write Draft" (5.4s)
    ├── Event: tool_called (generate_prose)
    ├── Event: user_input (approval)
    └── Event: task_completed
```

### API Reference

| Method | Purpose |
|--------|---------|
| `startSpan(name, metadata)` | Begin a new trace span |
| `endSpan(success)` | Complete current span |
| `addEvent(type, data)` | Log event in current span |
| `getLineage(spanId)` | Get full parent chain |
| `getSummary()` | Statistics on spans and events |

### Event Types

| Type | Description |
|------|-------------|
| `plan_created` | New plan was generated |
| `task_started` | Task execution began |
| `task_completed` | Task finished successfully |
| `tool_called` | External tool was invoked |
| `user_input` | Human provided input |
| `error` | Something went wrong |

### Usage

```typescript
import { TraceLineage } from './coordination/multi-agent'

const trace = new TraceLineage()

const spanId = trace.startSpan('Write Chapter 3', { chapter: 3 })
trace.addEvent('plan_created', { tasks: 5 })

// ... do work ...

trace.addEvent('tool_called', { tool: 'generate_prose', args: {...} })
trace.endSpan(true)

// Get audit trail
const lineage = trace.getLineage(spanId)
console.log(lineage.map(s => s.name).join(' → '))

// Get summary
const summary = trace.getSummary()
console.log(`Success rate: ${summary.successRate * 100}%`)
```
