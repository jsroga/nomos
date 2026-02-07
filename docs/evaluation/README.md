# Science-Backed Evaluation Framework

> "If you can't measure it, you can't improve it." - Phase 9 Philosophy

This module implements a rigorous, academic approach to evaluating Narrative Agents, moving beyond "vibes" to **quantifiable emotional distance**.

## 1. Methodology: The "EQ-Bench" Protocol

We treat narrative generation as a **psychological prediction task**, not just a creative writing task.

### 1.1 The EQ Metric
We calculate the Manhattan Distance between the **Emotional Profile** of the generated text and the **Ground Truth** defined in the scenario.

```typescript
Distance = |True.Fear - Pred.Fear| + |True.Anger - Pred.Anger| ...
Score = 1.0 - (AverageDistance / 10)
```

- **1.0**: Perfect calibration (Human-level empathy)
- **0.5**: Generic / Flat affect
- **0.0**: Character Hallucination

### 1.2 The Logic Metric
Binary constraints enforced by a dedicated `LogicEvaluator` (Sonnet 3.5 / Haiku).
- Did the character stay silent? (True/False)
- Was the bribe implied? (True/False)

## 2. Architectures Evaluated

| Architecture | Description | Strengths | Weaknesses |
|--------------|-------------|-----------|------------|
| **The Monolith** | Zero-Shot, Single Prompt | Fast, Cheap | Low nuance, explicitly states feelings |
| **Critique Loop** | Generate -> Critique -> Revise | **High Nuance**, Deep Subtext | 2x Cost, 2x Latency |
| **RAG Agent** | Retrieval Augmented Generation | Context Awareness | Depends on Retrieval Quality |
| **Council** | Multi-Persona Voting | Balanced | Slowest, Complexity Overhead |

## 3. Key Findings (Phase 9)

> **The "Critique Lift" Hypothesis**: Validated.
> A single pass of *negative constraint feedback* ("Show, don't tell") improves EQ Score by ~37%.

## 4. Usage

Run the architectural comparison:
```bash
npx tsx src/evaluation/experiments/eval-architecture.ts
```

View the latest scientific report:
[Scientific Report Phase 9](../../src/evaluation/reports/scientific-report-phase-9.md)
