# Extended Thinking for Storyteller: Achieving GRRM/Gilligan Quality

## Executive Summary

This document explains how we can apply techniques from Cursor AI and Claude Code to dramatically improve the storytelling quality of our Storyteller module - bringing it closer to the narrative craftsmanship of **George R.R. Martin** (Game of Thrones) and **Vince Gilligan** (Breaking Bad).

---

## Part 1: What Makes GRRM & Gilligan Writing Great?

### George R.R. Martin Style

- **Moral Complexity**: No pure heroes or villains - everyone has contradictions
- **Consequences Matter**: Actions have weight, the Red Wedding wasn't random
- **Subverted Expectations**: Setup leads to surprising but inevitable outcomes
- **"The human heart in conflict with itself"**: Internal struggle > external battles
- **Iceberg Worldbuilding**: 90% of the world exists beneath what's shown

### Vince Gilligan Style

- **Character Transformation Arcs**: Walter White's journey is meticulously tracked
- **Visual Storytelling**: "Show don't tell" - every frame has meaning
- **Every Scene Earns Its Place**: No filler, each scene changes something
- **Foreshadowing Payoffs**: Chekhov's gun isn't just fired - it's earned
- **Specificity Over Generic**: "I am the one who knocks" not "I'm dangerous"

### What AI Writing Typically Lacks

- Generic emotions ("tension was palpable")
- Predictable plot beats (hero saves day)
- Interchangeable character voices
- Surface-level motivation
- Theme stated explicitly, not earned
- Deus ex machina resolutions

---

## Part 2: What Makes Cursor/Claude Code So Effective?

Based on research into Cursor AI and Claude Code architecture, these are the key techniques:

### 1. Extended Thinking (Chain of Thought)

> "When faced with complex tasks, giving Claude space to think can dramatically improve its performance."
> — [Claude Docs: Let Claude Think](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/chain-of-thought)

**How it works:**

- Model explicitly reasons step-by-step BEFORE generating output
- Uses `<thinking>` tags to separate reasoning from response
- Allocates "thinking budget" for complex tasks

**Why it matters for storytelling:**

- Forces consideration of character motivation BEFORE writing dialogue
- Ensures plot consequences are traced BEFORE committing to beats
- Catches inconsistencies during thinking, not after output

### 2. Structured Reasoning with XML Tags

> "As a feature unique to Claude, structuring with XML-like tags improves accuracy."
> — [Qodo: Claude Code vs Cursor](https://www.qodo.ai/blog/claude-code-vs-cursor/)

**How it works:**

```xml
<analysis>Character wants X but needs Y, creating conflict</analysis>
<decision>I will write the scene emphasizing internal struggle</decision>
<output>The actual scene content</output>
```

**Why it matters for storytelling:**

- Separates WHAT to write from WHY to write it
- Creates audit trail for creative decisions
- Enables self-critique before final output

### 3. The "Think" Tool Pattern

> "Extended thinking is about what Claude does before it starts generating a response—Claude deeply considers and iterates on its plan before taking action."
> — [Anthropic: The Think Tool](https://www.anthropic.com/engineering/claude-think-tool)

**How it works:**

- Model can "stop and think" between actions
- Evaluates if it has enough information
- Particularly helpful for long chains of actions

**Why it matters for storytelling:**

- Writer can pause mid-scene to check character consistency
- Plot architect can reflect on whether setup is sufficient
- Enables mid-stream course correction

### 4. Multi-Pass Verification

> "Ending complex prompts with a request for clarification dramatically improves response quality."
> — [Developer Toolkit](https://developertoolkit.ai/en/claude-code/productivity-patterns/prompt-engineering/)

**How it works:**

- First pass: Generate initial output
- Second pass: Self-critique against criteria
- Third pass: Refine based on critique

**Why it matters for storytelling:**

- Catches "AI slop" before it reaches the user
- Ensures scene serves multiple purposes (GRRM style)
- Validates character voice consistency (Gilligan style)

### 5. Iterative Refinement Pattern

> "First ask the AI to plan and then to implement. Improve code quality and stability by prompting incrementally."
> — [Prompt Engineering for Developers](https://www.andriifurmanets.com/blogs/prompt-engineering-for-developers)

**How it works:**

- Step 1: Plan what to write (outline, intention)
- Step 2: Write first draft
- Step 3: Critique against standards
- Step 4: Refine specific weaknesses

**Why it matters for storytelling:**

- Mirrors actual writers room process
- Separates "what happens" from "how it's told"
- Creates space for the Devil's Advocate pattern

---

## Part 3: Application to Storyteller Architecture

### Current Gaps in Our System

| Gap                                  | Impact on Quality                                 |
| ------------------------------------ | ------------------------------------------------- |
| No extended thinking                 | Agents write BEFORE thinking through implications |
| Reasoning templates exist but unused | GRRM-style analysis framework sits dormant        |
| No self-critique loop                | AI slop passes through unchecked                  |
| Single-pass generation               | No refinement cycle                               |
| Generic prompts                      | No GRRM/Gilligan specific standards               |

### Implemented Architecture: Efficient Extended Thinking

#### 1. "Theory of Mind" Compact Framework (Token Efficient)

To balance quality with latency and cost, we implemented a **3-step compact framework** that targets the highest-impact narrative drivers.

**The Prompt Structure:**

```
<thinking>
1. THEORY OF MIND (Subtext)
   - What is the character HIDING or lying about?
   - What is the unspoken power dynamic?

2. STATE CHANGE (Necessity)
   - What specific value changes by the end? (e.g., Hope -> Despair)
   - If nothing changes, the scene is filler.

3. ONE SPECIFIC DETAIL (Reality)
   - Name ONE unexpected, specific physical detail that anchors the scene.
</thinking>
```

**Why this works:**
- **Step 1** forces subtext (Gilligan style).
- **Step 2** forces narrative progression (GRRM style).
- **Step 3** prevents generic "AI hallucinations" by grounding the scene.
- **Efficiency**: Requires < 100 tokens of output, vs 500+ for full chain-of-thought.

#### 2. Dual-Mode Self-Critique Tool

We implemented a **hybrid critique system** to optimize for speed vs quality.

**Tool:** `self_critique`

| Mode | Trigger | Mechanism | Cost | Use Case |
| :--- | :--- | :--- | :--- | :--- |
| **FAST** (Default) | Every beat generation | Regex + Heuristics | **Free** | Catching "AI slop" words, formatting issues, passive voice. |
| **DEEP** (Opt-in) | User request or high stakes | `SelfCritiqueAgent` (LLM) | **High** | Deep narrative analysis, character consistency check. |

```typescript
// Example usage
await selfCritiqueTool.execute({
  draft: "...",
  mode: 'fast' // or 'deep'
})
```

#### 3. GRRM/Gilligan Quality Standards

We inject specific positive guidance into the system prompt:

- **Specific beats Generic**: "He counted the tiles" > "He was nervous"
- **Character = Contradiction**: Every character must have an internal conflict.
- **Subtext is Everything**: Dialogue must carry hidden agendas.


#### 4. Multi-Pass Generation Pipeline

```
User Request
    ↓
[PLAN] - What should happen? (outline)
    ↓
[DRAFT] - Write first version
    ↓
[CRITIQUE] - Self-evaluate against GRRM/Gilligan standards
    ↓
[REFINE] - Address specific issues
    ↓
[VALIDATE] - Magic score check
    ↓
Final Output
```

---

## Part 4: Expected Impact on Quality Metrics

### Hypothesis

By implementing extended thinking patterns, we expect:

| Metric          | Current (Est.) | Target | Mechanism                                    |
| --------------- | -------------- | ------ | -------------------------------------------- |
| Magic Score     | ~50%           | 70%+   | Structured reasoning prevents generic output |
| Character Voice | ~45%           | 65%+   | Voice verification in thinking phase         |
| Consistency     | ~70%           | 90%+   | Consequence tracing catches contradictions   |
| Subtext Quality | ~30%           | 55%+   | Explicit "show don't tell" checking          |
| Memorability    | ~40%           | 60%+   | Scene purpose validation                     |

### Validation Approach

1. **A/B Test**: Compare 10 samples with/without extended thinking
2. **Metrics Tracked**: Magic score, consistency, narrative coherence
3. **Human Validation**: Review outputs for GRRM/Gilligan qualities

---

## Part 5: Implementation Status

### Phase 1: Enhanced Reasoning Injection (✅ Completed)

- [x] Add 3-step `EXTENDED_THINKING_FRAMEWORK` to `extended-thinking.ts`
- [x] Inject standards into `StorytellerAgent` via dynamic prompt generation
- [x] Enable by default for v2 agents

### Phase 2: Self-Critique Tool (✅ Completed)

- [x] Create `self-critique-tool.ts` with dual modes
- [x] Implement heuristic checks (Fast Mode)
- [x] Implement `SelfCritiqueAgent` (Deep Mode)

### Phase 3: Agent Loop Integration (🚧 In Progress)

- [ ] Update `manage_beat` to automatically trigger critique on low confidence
- [ ] Allow agents to "repair" drafts based on critique feedback
- [ ] Tune the efficient 3-step prompt based on real-world usage

### Phase 4: Evaluation & Tuning (Planned)

- [ ] Run A/B tests with evaluation framework
- [ ] Tune thinking budget based on task complexity
- [ ] Adjust quality standards based on results

---

## Sources

- [Claude Docs: Let Claude Think (Chain of Thought)](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/chain-of-thought)
- [Claude Docs: Building with Extended Thinking](https://docs.claude.com/en/docs/build-with-claude/extended-thinking)
- [Anthropic: The "Think" Tool](https://www.anthropic.com/engineering/claude-think-tool)
- [Qodo: Claude Code vs Cursor Deep Comparison](https://www.qodo.ai/blog/claude-code-vs-cursor/)
- [Developer Toolkit: Prompt Engineering](https://developertoolkit.ai/en/claude-code/productivity-patterns/prompt-engineering/)
- [Frontend Masters: Write Better Prompts](https://frontendmasters.com/courses/prompt-engineering/)

---

## Conclusion

The techniques that make Cursor and Claude Code effective are directly applicable to creative writing AI. By giving our agents space to **think before writing**, **self-critique against prestige standards**, and **refine iteratively**, we can close the gap between generic AI output and the narrative craftsmanship of George R.R. Martin and Vince Gilligan.

The key insight: **Great writing isn't about the words - it's about the thinking behind them.**
