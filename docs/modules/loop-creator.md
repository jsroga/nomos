# Loop Creator Module Documentation

## Overview

The Loop Creator module is an AI-powered game design assistant. It allows designers to architect gameplay loops, progression systems, and mechanical balances using a specialized multi-agent system. It bridge high-level concepting with systemic implementation.

## Architecture

### Multi-Agent System (Game Design Lab)

The module utilizes a LangGraph-based workflow where specialized game design agents collaborate:

- **Supervisor**: Manages the orchestration of the design process and handles routing.
- **Loop Planner**: The core strategist that defines the "Core Loop" and "Meta-Loops" of the game.
- **Mechanics Designer**: Translates abstract concepts into concrete gameplay mechanics (e.g., combat systems, interaction rules).
- **Progression Architect**: Designs XP curves, level-up systems, and long-term player retention vectors.
- **Balance Analyst**: Simulates and evaluates systemic fairness and difficulty scaling.
- **Concept Evaluator**: Validates that design decisions align with the intended genre and target audience.
- **Market/Genre Analyst**: Provides context on competitor games and genre expectations.

### State Management (`LoopState`)

State is maintained via a centralized graph state (defined in `src/domains/loop-creator/graph/state.ts`):

#### 1. Mechanic Nodes

The fundamental building blocks of gameplay.

- **Structure**:
  - `inputs`/`outputs`: Trigger/Effect logic.
  - `balanceFactors`: `effort` (1-10), `reward` (1-10), `frequency` (per session).
  - `citations`: RAG sources justifying the mechanic.
- **Types**: `core` (essential), `secondary` (depth), `meta` (retention), `progression`.

#### 2. Game Loops

Collections of mechanics forming a cycle.

- **Psychological Phases**: `challenge` -> `action` -> `feedback`.
- **Metrics**: `satisfactionPeak` and `playerExperience` descriptions.
- **Timeframes**: `micro` (seconds), `session` (minutes), `meta` (days).

#### 3. Progression Systems

Long-term retention vectors.

- **Curves**: `linear`, `exponential`, `logarithmic`, `s-curve`.
- **Milestones**: specific achievements with `requiredEffort` (hours) and `unlocks`.

### Implementation Details

#### `loop-graph.ts`

Defines the state machine for the design process. It supports branching paths (e.g., iterating on mechanics before finalizing progression) and ensures that all agent contributions are synthesized into a coherent design document.

#### Systems Integration (`useLoopDesign`)

The module provides hooks for other parts of the application to consume the generated design. This allows the Storyteller or Interior Designer to align narrative and spatial choices with the underlying mechanical loop.

## Workflow

1. **Initiate**: Define the core genre and player fantasy.
2. **Draft**: The Loop Planner and Mechanics Designer create a first-pass loop.
3. **Refine**: The Balance Analyst and Progression Architect stress-test the systems.
4. **Finalize**: The Concept Evaluator provides a final verdict, and the design is locked for production reference.
