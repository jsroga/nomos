# Reflective Memory & Confidence Calibration

> Research-grade components for agent self-improvement.

## Reflective Memory

Stores and retrieves past decisions for few-shot learning within a session.

### Core Concepts

```
┌─────────────────────────────────────────────────┐
│  DECISION → STORE → QUERY → FEW-SHOT → IMPROVE │
└─────────────────────────────────────────────────┘
```

### API Reference

| Method | Purpose |
|--------|---------|
| `record(entry)` | Store a decision with goal, thought, and outcome |
| `updateOutcome(id, outcome, feedback)` | Mark whether decision was successful |
| `query(filter)` | Find similar past decisions |
| `generateFewShotExamples(goal, limit)` | Create prompt examples from successful decisions |
| `getStats()` | Decision type distribution and success rate |

### Usage

```typescript
import { ReflectiveMemory } from './memory/reflective-memory'

const memory = new ReflectiveMemory(100) // Max 100 records

// Record a decision
const id = memory.record({
    goal: 'Generate login test',
    context: 'E2E testing',
    thought: 'Should start with happy path...',
    decision: { type: 'PROPOSE_PLAN', ... }
})

// Mark outcome
memory.updateOutcome(id, 'success', 'Test passed on first run')

// Generate few-shot examples for similar goals
const examples = memory.generateFewShotExamples('Generate signup test')
```

---

## Confidence Calibration

Tracks prediction accuracy to dynamically adjust agent autonomy.

### Core Concepts

**Calibration Error**: Measures how well an agent's confidence correlates with actual success rate. A well-calibrated agent saying "90% confident" should be right 90% of the time.

### API Reference

| Method | Purpose |
|--------|---------|
| `predict(prediction, confidence)` | Record a prediction with confidence 0-1 |
| `resolve(id, wasCorrect)` | Mark whether prediction was correct |
| `getCalibrationError()` | Calculate Expected Calibration Error (ECE) |
| `suggestAutonomyLevel()` | Returns 'high', 'medium', or 'low' based on ECE |

### Usage

```typescript
import { ConfidenceCalibrator } from './memory/reflective-memory'

const calibrator = new ConfidenceCalibrator(50) // Track last 50 predictions

// Agent makes prediction
const id = calibrator.predict('User wants happy path first', 0.85)

// Later, we verify
calibrator.resolve(id, true) // Prediction was correct

// Check calibration
const ece = calibrator.getCalibrationError() // 0.0 = perfect, 0.5 = terrible
const autonomy = calibrator.suggestAutonomyLevel() // 'high' | 'medium' | 'low'
```

### Autonomy Recommendations

| ECE Range | Autonomy Level | Behavior |
|-----------|----------------|----------|
| < 0.10 | High | Trust agent decisions, minimal checkpoints |
| 0.10 - 0.25 | Medium | Ask for approval on important decisions |
| > 0.25 | Low | Require human approval for most actions |
