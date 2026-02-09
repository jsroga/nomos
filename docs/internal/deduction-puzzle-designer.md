# Deduction Puzzle Designer Module Documentation

## Overview

The Deduction Puzzle Designer is a specialized tool for creating logic-based mysteries and puzzles (akin to _Return of the Obra Dinn_ or _The Case of the Golden Idol_). It allows writers to define complex causal chains, build interactive "sentence-based" solutions, and stage scenes for investigation.

## Core Pillars

### 1. Scenario Definition

Focuses on the high-level narrative and the core riddle the player must solve.

- **`SentenceBuilder`**: A UI component that allows designers to construct the "Solution Template" (e.g., "[Character] killed [Victim] with [Weapon] because of [Motive]").
- **`SolutionTemplateBuilder`**: Manages the permutation and validation logic for the correct puzzle answer.

### 2. Logic Map (`LogicMap`)

Uses **React Flow** to visualize the underlying truth and causal dependencies.

- **`DeductionLogicMap`**: A node-based graph where each node represents a fact, a piece of evidence, or a character state.
- **Causal Links**: Connections between nodes that define how one discovered fact unlocks the possibility of deducing another.

### 3. Scene Staging (`SceneStaging`)

Handles the spatial and visual representation of the puzzle.

- **`CollectableWordList`**: Manages the "vocabulary" players can collect from the environment to use in the Sentence Builder.
- **`ScenePreview`**: A viewport for staging evidence and character positions within a 3D or 2D scene.
- **`ValidationPanel`**: A tool for designers to test the solvability and logical consistency of the current puzzle configuration.

## State Management

- **`puzzle-store.ts`**: A Zustand store that tracks the current puzzle state, including nodes, edges, solution templates, and available vocabulary. It ensures a reactive relationship between the Logic Map and the Sentence Builder.

## Workflow

1. **Define**: Establish the core narrative facts in Scenario Definition.
2. **Map**: Build the web of evidence and deductions in the Logic Map.
3. **Stage**: Place physical evidence and "words" in the Scene Staging area.
4. **Validate**: Test the puzzle's internal logic to ensure it is solvable but challenging.
