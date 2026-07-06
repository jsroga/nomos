# Agent Internals Overview

Welcome to the internal agent documentation. This section covers the core architecture, design patterns, and specific agent implementations.

## Core Architecture

[Agent Core Architecture](./agent-core)  
Shared planning primitives (`ExecutiveAgent`, planner tools) and the Mastra kernel (`shared/agent-kernel/`).

[Storyteller Agent Architecture](./architecture)  
The Writers Room council model and specialist agents.

## Stack

**Mastra v1** (`@mastra/core`) is the sole agent runtime — agents, tools, workflows, memory, observability. LangGraph was removed from loop-creator (2026-07); orchestration uses Mastra agents plus imperative supervisors where streaming events are custom.

## Key Concepts

### 1. Multi-Agent Systems (MAS)

Specialized Mastra agents collaborate via tool calls (`consult_*`), sub-agents, and workflows (`StoryWorkflow`).

### 2. Handoffs & Routing

The Showrunner delegates to council specialists when deep expertise is required. Loop Creator uses a supervisor orchestrator (`loop-orchestrator.ts`) to route between planner, mechanics, balance, and market agents.

### 3. Skills

Agents load Mastra **Workspace** skills (SKILL.md under storyteller prompts) on demand.

## Active Agents

* **Storyteller**: [Docs](/docs/modules/storyteller) — Showrunner + council (Gardener, Psychologist, Premise Architect, etc.)
* **Loop Creator**: [internal/loop-creator.md](../loop-creator.md) — game loop design lab
* **Game Design**: Haute Game framework tools

## Debugging

1. Langfuse traces (when `LANGFUSE_*` keys are set)
2. Mastra Studio: `npm run mastra:dev`
3. Writer's Room UI log tab
4. Stream route SSE events (`/api/storyteller/chat/stream`)
