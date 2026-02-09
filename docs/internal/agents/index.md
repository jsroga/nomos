# Agent Internals Overview

Welcome to the internal agent documentation. This section covers the core architecture, design patterns, and specific agent implementations used in the Tilemap system.

## Core Architecture

[Agent Core Architecture](./agent-core)
The fundamental "operating system" for our agents, including the Executive loop, memory management, and tool execution.

## Key Concepts

### 1. Multi-Agent Systems (MAS)
We use a graph-based approach (LangGraph) where specialized agents collaborate to solve complex tasks.

### 2. Handoffs & Routing
Instead of a single supervisor, agents use a **Handoff Protocol** to pass control to specialists when they encounter tasks outside their domain.

### 3. Skills
Agents are equipped with "Skills" — modular bundles of prompts and tools that can be loaded on-demand.

## Active Agents

*   **Storyteller Module**: [Docs](/docs/modules/storyteller)
    *   Virtual Writers Room
    *   Character Psychology
    *   Plot Architect
*   **Research Agent**: (In development)
*   **Coder Agent**: (In development)

## Debugging

To debug agent interactions:
1.  Check LangSmith traces.
2.  Use the `Log` tab in the Writer's Room UI.
3.  Verify the `WritersRoomState` in Redux devtools.
