# Storyteller Evaluation Guide

A step-by-step guide for running evaluations and viewing results in LangSmith.

---

## Step 1: Setup (One-Time)

### 1.1 Get Your API Keys

You need TWO API keys:

| Key                 | Where to Get It                             | What It's For                 |
| ------------------- | ------------------------------------------- | ----------------------------- |
| `ANTHROPIC_API_KEY` | https://console.anthropic.com/settings/keys | Claude Opus (LLM evaluation)  |
| `LANGCHAIN_API_KEY` | https://smith.langchain.com/settings        | LangSmith (results dashboard) |

**How to get Anthropic API Key:**

1. Go to https://console.anthropic.com/
2. Sign in (or create account)
3. Click **Settings** in the left sidebar
4. Click **API Keys**
5. Click **Create Key**
6. Copy the key (starts with `sk-ant-...`)

**How to get LangSmith API Key:**

1. Go to https://smith.langchain.com/
2. Sign in with GitHub/Google (or create account)
3. Click your **profile icon** (top right)
4. Click **Settings**
5. Click **API Keys** in the left menu
6. Click **Create API Key**
7. Copy the key (starts with `lsv2_...`)

### 1.2 Set Environment Variables

Create or edit `.env.local` in the project root:

```bash
# Required for evaluation
ANTHROPIC_API_KEY=sk-ant-your-key-here
LANGCHAIN_API_KEY=lsv2_your-key-here
LANGCHAIN_TRACING_V2=true
LANGCHAIN_PROJECT=storyteller-eval

# Optional - also set for generation
OPENAI_API_KEY=sk-your-openai-key
```

### 1.3 Verify Setup

Run this quick test:

```bash
npx tsx src/evaluation/experiments/extended-thinking-ab-test.ts --mode=direct
```

You should see output like:

```
Direct Comparison Test
========================
Running same prompt with both methods side-by-side

Test Prompt: Write a scene where a character discovers their mentor has been lying...

--- BASELINE OUTPUT ---
[Some creative writing output...]

--- EXTENDED THINKING OUTPUT ---
[More creative writing output...]

--- MAGIC SCORES ---
Baseline: 21/100
Extended: 19/100
```

If you see scores, your setup is working.

---

## Step 2: Running Tests

### Quick Commands

| What You Want         | Command                                                                         |
| --------------------- | ------------------------------------------------------------------------------- |
| Quick single test     | `npx tsx src/evaluation/experiments/extended-thinking-ab-test.ts --mode=direct` |
| A/B test (5 samples)  | `npx tsx src/evaluation/experiments/extended-thinking-ab-test.ts --samples=5`   |
| A/B test (10 samples) | `npx tsx src/evaluation/experiments/extended-thinking-ab-test.ts --samples=10`  |

### Understanding Test Output

When you run an A/B test, you'll see:

```
DETAILED RESULTS
==================

### Baseline (No Extended Thinking)
   magic-score: 6.9%
   consistency: 35.5%
   hallucination: 72.0%
   narrative-coherence: 14.6%

### Extended Thinking (GRRM/Gilligan)
   magic-score: 5.8%
   consistency: 51.0%
   hallucination: 58.0%
   narrative-coherence: 38.4%

### Improvement
   magic-score: ↓ -15.9%
   consistency: ↑ 43.7%
   hallucination: ↓ -19.4%
   narrative-coherence: ↑ 162.6%

===================
WINNER: Extended Thinking (GRRM/Gilligan)
   Significance: 75.0%
===================
```

**What the metrics mean:**

| Metric                | Good Score | What It Measures                           |
| --------------------- | ---------- | ------------------------------------------ |
| `magic-score`         | > 60%      | Is it George RR Martin quality or AI slop? |
| `consistency`         | > 80%      | Does it match the world bible?             |
| `hallucination`       | > 90%      | Did it avoid making things up?             |
| `narrative-coherence` | > 70%      | Does the story structure work?             |

---

## Step 3: Viewing Results in LangSmith

### 3.1 Open LangSmith Dashboard

1. Go to https://smith.langchain.com/
2. Sign in

### 3.2 Find Your Project

1. In the left sidebar, click **Projects**
2. Find **"storyteller-eval"** (or whatever you set in `LANGCHAIN_PROJECT`)
3. Click on it

### 3.3 View Traces (Individual Runs)

**What are traces?**
Each time the AI runs, it creates a "trace" - a log of everything that happened.

**To view traces:**

1. In your project, you'll see a list of runs
2. Click on any row to see details
3. You'll see:
   - **Input**: What was sent to the AI
   - **Output**: What the AI returned
   - **Latency**: How long it took
   - **Tokens**: How many tokens were used

### 3.4 View Experiments

**What are experiments?**
When you run A/B tests, each batch is saved as an "experiment" for comparison.

**To view experiments:**

1. Click **Experiments** tab (top of the project page)
2. You'll see a list of experiment runs
3. Click on one to see:
   - All individual test cases
   - Aggregated metrics
   - Comparison charts

### 3.5 Compare Two Experiments

1. Go to **Experiments** tab
2. Check the boxes next to two experiments you want to compare
3. Click **Compare** button (appears at top)
4. You'll see a side-by-side comparison of metrics

---

## Step 4: Understanding the Evaluators

### Magic Score Evaluator

Uses Claude Opus to judge creative quality.

**Dimensions scored (0-100 each):**

- Conceptual Originality
- Character Specificity
- Prose Voice
- Risk-Taking
- Memorability
- World-Building Depth
- Character Voice Distinction
- Subtext Quality
- Unexpected Choices

**Slop Indicators (red flags):**

- "heart pounding" clichés
- "breath caught" clichés
- Generic emotional descriptions
- Formulaic structure

### Consistency Evaluator

Checks if the output matches the world bible.

**What it checks:**

- Character names are correct
- Locations exist in the world
- Timeline makes sense
- Character knowledge is accurate

### Narrative Coherence Evaluator

Checks story structure quality.

**What it checks:**

- Plot progression (does each scene cause the next?)
- Character arcs (do characters change?)
- Setup/payoff (are Chekhov's guns fired?)
- Pacing (is there variety in intensity?)

---

## Step 5: Troubleshooting

### "Rate limit error" (429)

**Problem:** Too many API calls too fast.

**Solution:** Wait 1-2 minutes and try again with fewer samples:

```bash
npx tsx src/evaluation/experiments/extended-thinking-ab-test.ts --samples=3
```

### "ANTHROPIC_API_KEY not set"

**Problem:** The API key isn't being read.

**Solution:** Make sure `.env.local` is in the project root (not a subfolder) and restart your terminal.

### "No traces appearing in LangSmith"

**Problem:** Tracing isn't enabled.

**Solution:** Check these are set:

```bash
export LANGCHAIN_TRACING_V2=true
export LANGCHAIN_API_KEY=lsv2_your-key
export LANGCHAIN_PROJECT=storyteller-eval
```

### "JavaScript heap out of memory"

**Problem:** TypeScript compiler running out of memory.

**Solution:** Run tests directly with `npx tsx` instead of building first:

```bash
npx tsx src/evaluation/experiments/extended-thinking-ab-test.ts --mode=direct
```

---

## Step 6: Running Custom Tests

### Modify Test Prompts

Edit `src/evaluation/experiments/extended-thinking-ab-test.ts`:

```typescript
const STORYTELLING_TEST_PROMPTS = [
  {
    id: 'my-custom-test',
    message: 'Write a scene where...',
    phase: 'writing',
    category: 'dialogue',
  },
  // Add more...
]
```

### Create Your Own Generator

```typescript
async function myCustomGenerator(input: Record<string, unknown>) {
  const model = new ChatOpenAI({
    modelName: 'gpt-4o',
    temperature: 0.8,
  })

  const prompt = `Your custom prompt here...

  Task: ${input.message}`

  const response = await model.invoke(prompt)
  return { response: response.content }
}
```

### Run A/B Test With Your Generator

```typescript
await runABTest(
  'My Custom Test',
  { name: 'Baseline', generate: generateBaseline },
  { name: 'My Version', generate: myCustomGenerator },
  { sampleSize: 10 }
)
```

---

## Quick Reference

### File Locations

| File                                                      | Purpose                |
| --------------------------------------------------------- | ---------------------- |
| `src/evaluation/experiments/extended-thinking-ab-test.ts` | Main A/B test runner   |
| `src/evaluation/evaluators/magic-score.ts`                | Quality scoring logic  |
| `src/evaluation/evaluators/narrative-coherence.ts`        | Story structure checks |
| `src/domains/storyteller/prompts/extended-thinking.ts`    | GRRM quality standards |

### Environment Variables

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...
LANGCHAIN_API_KEY=lsv2_...
LANGCHAIN_TRACING_V2=true
LANGCHAIN_PROJECT=storyteller-eval

# Optional
OPENAI_API_KEY=sk-...
STORYTELLER_EXTENDED_THINKING=true
```

### Commands Cheat Sheet

```bash
# Quick test (1 comparison)
npx tsx src/evaluation/experiments/extended-thinking-ab-test.ts --mode=direct

# Small A/B test (5 samples)
npx tsx src/evaluation/experiments/extended-thinking-ab-test.ts --samples=5

# Medium A/B test (10 samples)
npx tsx src/evaluation/experiments/extended-thinking-ab-test.ts --samples=10
```

---

## What's Next?

After running tests:

1. **Check LangSmith** for detailed traces
2. **Compare experiments** to see which approach wins
3. **Modify prompts** in `extended-thinking.ts` to improve quality
4. **Run more tests** to validate improvements
5. **Merge winning changes** to the main codebase
