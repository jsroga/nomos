
# Research Note: EQ-Bench & Tree of Thoughts Synergy

**Goal**: Enhance the "ReflectiveAgent" (Critique Loop) with structured exploration of emotional possibilities.

## 1. EQ-Bench (Emotional Intelligence Benchmark)
- **Core Insight**: Predicting emotional states requires modeling the *latent variable* of a character's internal state.
- **Limitation**: Standard generation (greedy decoding) picks the most likely next token, which often defaults to "safe" or "cliché" emotions.
- **Paper**: *EQ-Bench: A Benchmark for Emotional Intelligence in Large Language Models* (Paillat et al., 2023)

## 2. Tree of Thoughts (ToT)
- **Core Insight**: Complex reasoning requires exploring multiple branches of possibility, evaluating them, and backtracking.
- **Application to Narrative**: instead of "What is the next logical step?", ask "What are the 3 possible emotional reactions?"
  - Branch A: Anger (Fight)
  - Branch B: Fear (Flight)
  - Branch C: Manipulation (Fawn)

## 3. The Synergy: "Emotional Tree Search"
We can combine these to create a **TreeSearchAgent** (Task 10.6).

**Algorithm:**
1. **Expand**: Generate N possible dialogue responses with distinct emotional vectors.
2. **Evaluate**: Use `EQEvaluator` (Task 9.11) to score each branch against the Ground Truth profile.
3. **Select**: Prune branches that deviate from the character's psychological profile.
4. **Refine**: Apply "Critique Loop" (Reflexion) only to the winning branch.

**Hypothesis**: This will prevent the "Monolith" failure mode where it commits early to the wrong emotion.

## 4. Implementation Plan (Phase 10)
- **Step 1**: Implement `TreeSearchAgent` using BFS/DFS.
- **Step 2**: Use `Claude 4.5` (Creative) for Branch Generation.
- **Step 3**: Use `Gemini Flash 3` (Fast) for Branch Evaluation.
