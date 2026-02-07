'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { motion } from 'framer-motion'

const EVALUATION_GUIDE = `
# Storyteller Evaluation Guide: Benchmark 2.0

Comprehensive guide for running high-fidelity evaluations using **Critique & Revise** loops and **Reverse Intent** analysis.

---

## 🚀 Benchmark 2.0 Features

### 1. Reverse Intent Analysis (Cursor Pattern)
The **Reverse Intent** evaluator doesn't just check if instructions were followed. It attempts to "reverse engineer" the literary depth from the output alone. If a model generates "AI-slop," the intent remains opaque. If it generates high-fidelity prose, the hidden depth becomes detectable.

### 2. Critique & Revise Loop (Pro Plan)
Drawing from **EQ-Bench** science, our Pro Plan implements a three-stage generation process:
1. **Drafting**: Initial creative output.
2. **Critique**: A ruthless literary editor identifies generic tropes and weak voice.
3. **Revision**: A final rewrite focusing on subtext and specificity.

### 3. High-Parallelism Execution
Benchmark 2.0 runs **10 examples in parallel** by default, significantly reducing evaluation time while maintaining depth.

---

## 📊 Running Evaluations

### Standard Evaluation
\`\`\`bash
npm run eval:storyteller
\`\`\`

### Pro Evaluation (Benchmark 2.0)
\`\`\`bash
npx ts-node src/evaluation/experiments/eval-pro.ts
\`\`\`

---

## 🎨 Automated Reporting

After every run, Benchmark 2.0 generates a beautiful, literary HTML report for easy comparison.

**Location**: \`src/evaluation/reports/latest.html\`

---

## Step 1: Setup (One-Time)

### 1.1 Get Your API Keys

You need TWO API keys:

| Key | Where to Get It | What It's For |
|-----|-----------------|---------------|
| \`ANTHROPIC_API_KEY\` | https://console.anthropic.com/settings/keys | Claude Opus (LLM evaluation) |
| \`LANGCHAIN_API_KEY\` | https://smith.langchain.com/settings | LangSmith (results dashboard) |

---

#### How to get Anthropic API Key

1. Go to https://console.anthropic.com/
2. Sign in (or create account)
3. Click **Settings** in the left sidebar
4. Click **API Keys**
5. Click **Create Key**
6. Copy the key (starts with \`sk-ant-...\`)

---

#### How to get LangSmith API Key

1. Go to https://smith.langchain.com/
2. Sign in with GitHub/Google (or create account)
3. Click your **profile icon** (top right)
4. Click **Settings**
5. Click **API Keys** in the left menu
6. Click **Create API Key**
7. Copy the key (starts with \`lsv2_...\`)

---

### 1.2 Set Environment Variables

Create or edit \`.env.local\` in the project root:

\`\`\`bash
# Required for evaluation
ANTHROPIC_API_KEY=sk-ant-your-key-here
LANGCHAIN_API_KEY=lsv2_your-key-here
LANGCHAIN_TRACING_V2=true
LANGCHAIN_PROJECT=storyteller-eval

# Optional - also set for generation
OPENAI_API_KEY=sk-your-openai-key
\`\`\`

### 1.3 Verify Setup

Run this quick test:

\`\`\`bash
npx tsx src/evaluation/experiments/extended-thinking-ab-test.ts --mode=direct
\`\`\`

You should see output with magic scores. If you see scores, your setup is working!

---

## Step 2: Running Tests

### Quick Commands

| What You Want | Command |
|---------------|---------|
| Quick single test | \`npx tsx src/evaluation/experiments/extended-thinking-ab-test.ts --mode=direct\` |
| A/B test (5 samples) | \`npx tsx src/evaluation/experiments/extended-thinking-ab-test.ts --samples=5\` |
| A/B test (10 samples) | \`npx tsx src/evaluation/experiments/extended-thinking-ab-test.ts --samples=10\` |

### Understanding Test Output

When you run an A/B test, you'll see results like:

| Metric | Target | What It Measures |
|--------|--------|------------------|
| magic-score | >60% | Is it George RR Martin quality or AI slop? |
| consistency | >80% | Does it match the world bible? |
| hallucination | >90% | Did it avoid making things up? |
| narrative-coherence | >70% | Does the story structure work? |

---

## Real Example: Good vs Bad Prompt Design

This is **actual output** from running the A/B test. The prompt was:

> "Write a scene where a character discovers their mentor has been lying to them for years."

---

### BAD Example: Generic AI Output (Score: 21/100)

**Prompt used (baseline):**
\`\`\`
You are a prestige TV writer working at HBO/AMC standards.
Write your response directly. Make it memorable.
\`\`\`

**Output:**
\`\`\`
INT. DIMLY LIT STUDY - NIGHT

The room is a cavern of leather-bound volumes, their spines cracked,
whispering stories long forgot. A single desk lamp casts a pool of light...

CLARA
(softly)
Jonathan?

JONATHAN
(not looking up)
Clara. It's late.

CLARA
I found this.

She steps forward, crossing the threshold, and places the letter
on the desk. Jonathan glances at it, the color draining from his face.
\`\`\`

**Why it scored low (Magic Score: 21/100):**

- ❌ Generic setting ("dimly lit study" - cliché)
- ❌ "Color draining from his face" - AI slop phrase
- ❌ No character contradiction visible
- ❌ Dialogue is functional but lacks subtext
- ❌ "Whispering stories" - purple prose cliché

---

### GOOD Example: Specific, Character-Driven (Score: 58/100)

**Prompt used (extended thinking):**
\`\`\`
You are a prestige TV writer working at HBO/AMC standards.

Before writing, answer in <thinking> tags (2-3 sentences max):
- What do the characters WANT that conflicts?
- What ONE specific detail will make this feel real?

Then write your response in <output> tags.
\`\`\`

**Thinking process:**
\`\`\`
The protagonist, Alex, wants to believe in the integrity of their mentor,
Dr. Harper, whom they hold in high esteem. Dr. Harper desires to maintain
their reputation, even if it means perpetuating a lie about a scientific
discovery. A specific detail: a yellowed, handwritten letter from a deceased
colleague reveals the truth.
\`\`\`

**Output:**
\`\`\`
INT. DR. HARPER'S OFFICE - NIGHT

The soft hum of the ancient air conditioning unit resonates in the
dimly lit room. ALEX, late 20s, stands motionless in front of
DR. HARPER's weathered oak desk.

On the desk lies an open drawer with a stack of papers. Among them,
a yellowed letter bears the handwriting of Dr. Harper's late colleague,
Dr. Miriam Collins.

Alex's fingers tremble as they unfold the letter. The room empties of
air as Alex reads the damning confession: Miriam, not Harper, had
developed the breakthrough that revolutionized modern medicine.

ALEX
(voice cracking)
Why didn't you ever tell me?

Dr. Harper remains silent, a shadow in the dim light.
\`\`\`

**Why it scored higher (Magic Score: 58/100):**

- ✅ Specific detail (yellowed letter, Dr. Miriam Collins)
- ✅ Clear character wants in conflict
- ✅ Concrete stakes (scientific discovery theft)
- ✅ "Room empties of air" - more original than "color drained"
- ⚠️ Still has some clichés ("voice cracking")

---

### Key Insight: What Made the Difference

| Aspect | Bad Example | Good Example |
|--------|-------------|--------------|
| **Planning** | None - jumped straight to writing | Identified conflicts first |
| **Specificity** | "A letter of truth" (vague) | "Dr. Miriam Collins' letter about medical breakthrough" |
| **Character Wants** | Not defined | Alex: trust mentor. Harper: protect reputation |
| **Detail Selection** | Generic study description | Specific: air conditioning hum, weathered oak desk |

The extended thinking prompt forces the writer to **think before writing**, which results in more grounded, specific output.

---

## Step 3: Custom Prompts & Tests

### 3.1 Modify Test Prompts

Edit the test prompts in \`src/evaluation/experiments/extended-thinking-ab-test.ts\`:

\`\`\`typescript
const STORYTELLING_TEST_PROMPTS = [
  {
    id: 'my-custom-test',
    message: 'Write a scene where two rivals must work together...',
    phase: 'writing',
    category: 'dialogue',
  },
  {
    id: 'another-test',
    message: 'Create a twist that recontextualizes the mentor...',
    phase: 'breaking',
    category: 'plot',
  },
]
\`\`\`

---

### 3.2 Create Your Own Generator

Add a new generator function to test different prompting strategies:

\`\`\`typescript
async function myCustomGenerator(input: Record<string, unknown>) {
  const model = new ChatOpenAI({
    modelName: 'gpt-4o',
    temperature: 0.8,
  })

  const prompt = \`Your custom system prompt here...

## Quality Standards
- Be specific, not generic
- Show character contradictions
- Use subtext in dialogue

## Task
\${input.message}\`

  const response = await model.invoke(prompt)
  return {
    response: response.content,
    mode: 'my-custom-mode'
  }
}
\`\`\`

---

### 3.3 Run A/B Test with Custom Generator

\`\`\`typescript
import { runABTest } from './storyteller-experiments'

const result = await runABTest(
  'My Custom Prompt Test',
  {
    name: 'Baseline',
    generate: generateBaseline
  },
  {
    name: 'My Custom Version',
    generate: myCustomGenerator
  },
  { sampleSize: 10 }
)

console.log(\`Winner: \${result.winner}\`)
console.log(\`Significance: \${result.significance * 100}%\`)
\`\`\`

---

### 3.4 Adjust Evaluator Thresholds

Edit \`src/domains/storyteller/config/storyteller-config.ts\`:

\`\`\`typescript
guardrails: {
  antiSlop: {
    threshold: 60,        // Minimum magic score (0-100)
    blockOnCritical: true // Block output if score < 40
  }
}
\`\`\`

---

## Step 4: Viewing Results in LangSmith

### 4.1 Open LangSmith Dashboard

1. Go to https://smith.langchain.com/
2. Sign in

---

### 4.2 Find Your Project

1. In the left sidebar, click **Projects**
2. Find **"storyteller-eval"** (or whatever you set in \`LANGCHAIN_PROJECT\`)
3. Click on it

---

### 4.3 View Traces (Individual Runs)

Each time the AI runs, it creates a "trace" - a log of everything that happened.

1. In your project, you'll see a list of runs
2. Click on any row to see details
3. You'll see: Input, Output, Latency, Tokens used

---

### 4.4 View Experiments

1. Click **Experiments** tab (top of the project page)
2. You'll see a list of experiment runs
3. Click on one to see all test cases and aggregated metrics

---

### 4.5 Compare Two Experiments

1. Go to **Experiments** tab
2. Check the boxes next to two experiments
3. Click **Compare** button
4. See side-by-side comparison of metrics

---

---

## Step 7: Automated Reports (Pro Plan)

If you use the Pro Plan automation, you can view a premium, side-by-side comparison of results.

| Command | Action |
|---------|--------|
| \`npm run eval:pro\` | Run 10x parallel A/B test and generate report |

### View Latest Analysis
The report is generated as a local file for maximum privacy and speed:
- **Location**: \`src/evaluation/results/report.html\`
- **Quick Open**: \`open src/evaluation/results/report.html\`

---

## Step 8: Understanding the Evaluators

### Magic Score Evaluator

Uses Claude Opus to judge creative quality against GRRM/Gilligan standards.

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

---

### Consistency Evaluator

Checks if the output matches the world bible.

---

### Narrative Coherence Evaluator

Checks story structure: plot progression, character arcs, setup/payoff, pacing.

---

## Step 6: Troubleshooting

### "Rate limit error" (429)

Wait 1-2 minutes and try again with fewer samples:

\`\`\`bash
npx tsx src/evaluation/experiments/extended-thinking-ab-test.ts --samples=3
\`\`\`

---

### "ANTHROPIC_API_KEY not set"

Make sure \`.env.local\` is in the project root and restart your terminal.

---

### "No traces appearing in LangSmith"

Check these are set:

\`\`\`bash
export LANGCHAIN_TRACING_V2=true
export LANGCHAIN_API_KEY=lsv2_your-key
export LANGCHAIN_PROJECT=storyteller-eval
\`\`\`

---

### "JavaScript heap out of memory"

Run tests directly with \`npx tsx\` instead of building first.

---

## Quick Reference

### File Locations

| File | Purpose |
|------|---------|
| \`src/evaluation/experiments/extended-thinking-ab-test.ts\` | Main A/B test runner |
| \`src/evaluation/evaluators/magic-score.ts\` | Quality scoring logic |
| \`src/evaluation/evaluators/narrative-coherence.ts\` | Story structure checks |
| \`src/domains/storyteller/prompts/extended-thinking.ts\` | GRRM quality standards |
| \`src/domains/storyteller/config/storyteller-config.ts\` | Thresholds & settings |

---

### Commands Cheat Sheet

\`\`\`bash
# Quick test (1 comparison)
npx tsx src/evaluation/experiments/extended-thinking-ab-test.ts --mode=direct

# Small A/B test (5 samples)
npx tsx src/evaluation/experiments/extended-thinking-ab-test.ts --samples=5

# Medium A/B test (10 samples)
npx tsx src/evaluation/experiments/extended-thinking-ab-test.ts --samples=10
\`\`\`
`

export default function EvaluationPage() {
  return (
    <div className="prose prose-invert prose-primary max-w-none">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <h1 className="text-4xl font-black uppercase tracking-tighter font-syne mb-8 text-white">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-2xl font-bold uppercase tracking-tight font-syne mt-16 mb-6 text-primary">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-lg font-bold mt-10 mb-4 text-white/90">{children}</h3>
            ),
            h4: ({ children }) => (
              <h4 className="text-base font-semibold mt-8 mb-3 text-white/80">{children}</h4>
            ),
            code: ({ className, children, ...props }) => (
              <code
                className={`${className || ''} bg-white/5 px-1.5 py-0.5 rounded font-mono text-sm`}
                {...props}
              >
                {children}
              </code>
            ),
            pre: ({ children }) => (
              <pre className="bg-[#0a0a0a] border border-white/5 p-6 rounded-xl overflow-x-auto my-6 font-mono text-sm">
                {children}
              </pre>
            ),
            table: ({ children }) => (
              <div className="overflow-x-auto my-6">
                <table className="w-full border-collapse border border-white/10 text-sm">
                  {children}
                </table>
              </div>
            ),
            th: ({ children }) => (
              <th className="border border-white/10 bg-white/5 px-4 py-2 text-left font-semibold">
                {children}
              </th>
            ),
            td: ({ children }) => <td className="border border-white/10 px-4 py-2">{children}</td>,
            hr: () => <hr className="border-white/10 my-10" />,
            ul: ({ children }) => (
              <ul className="list-disc list-inside space-y-2 my-4">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal list-inside space-y-2 my-4">{children}</ol>
            ),
            li: ({ children }) => <li className="text-white/70">{children}</li>,
            p: ({ children }) => <p className="text-white/70 leading-relaxed my-4">{children}</p>,
            strong: ({ children }) => (
              <strong className="text-white font-semibold">{children}</strong>
            ),
            a: ({ href, children }) => (
              <a
                href={href}
                className="text-primary hover:underline"
                target={href?.startsWith('http') ? '_blank' : undefined}
                rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
              >
                {children}
              </a>
            ),
          }}
        >
          {EVALUATION_GUIDE}
        </ReactMarkdown>
      </motion.div>
    </div>
  )
}
