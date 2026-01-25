'use client'

import ReactMarkdown from 'react-markdown'
import { motion } from 'framer-motion'

const EVALUATION_GUIDE = `
# Storyteller Evaluation Guide

A step-by-step guide for running evaluations and viewing results in LangSmith.

---

## Step 1: Setup (One-Time)

### 1.1 Get Your API Keys

You need TWO API keys:

| Key | Where to Get It | What It's For |
|-----|-----------------|---------------|
| \`ANTHROPIC_API_KEY\` | https://console.anthropic.com/settings/keys | Claude Opus (LLM evaluation) |
| \`LANGCHAIN_API_KEY\` | https://smith.langchain.com/settings | LangSmith (results dashboard) |

**How to get Anthropic API Key:**
1. Go to https://console.anthropic.com/
2. Sign in (or create account)
3. Click **Settings** in the left sidebar
4. Click **API Keys**
5. Click **Create Key**
6. Copy the key (starts with \`sk-ant-...\`)

**How to get LangSmith API Key:**
1. Go to https://smith.langchain.com/
2. Sign in with GitHub/Google (or create account)
3. Click your **profile icon** (top right)
4. Click **Settings**
5. Click **API Keys** in the left menu
6. Click **Create API Key**
7. Copy the key (starts with \`lsv2_...\`)

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

- **magic-score**: Is it George RR Martin quality or AI slop? (target: >60%)
- **consistency**: Does it match the world bible? (target: >80%)
- **hallucination**: Did it avoid making things up? (target: >90%)
- **narrative-coherence**: Does the story structure work? (target: >70%)

---

## Step 3: Viewing Results in LangSmith

### 3.1 Open LangSmith Dashboard

1. Go to https://smith.langchain.com/
2. Sign in

### 3.2 Find Your Project

1. In the left sidebar, click **Projects**
2. Find **"storyteller-eval"** (or whatever you set in \`LANGCHAIN_PROJECT\`)
3. Click on it

### 3.3 View Traces (Individual Runs)

Each time the AI runs, it creates a "trace" - a log of everything that happened.

1. In your project, you'll see a list of runs
2. Click on any row to see details
3. You'll see: Input, Output, Latency, Tokens used

### 3.4 View Experiments

1. Click **Experiments** tab (top of the project page)
2. You'll see a list of experiment runs
3. Click on one to see all test cases and aggregated metrics

### 3.5 Compare Two Experiments

1. Go to **Experiments** tab
2. Check the boxes next to two experiments
3. Click **Compare** button
4. See side-by-side comparison of metrics

---

## Step 4: Understanding the Evaluators

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

### Consistency Evaluator

Checks if the output matches the world bible.

### Narrative Coherence Evaluator

Checks story structure: plot progression, character arcs, setup/payoff, pacing.

---

## Step 5: Troubleshooting

### "Rate limit error" (429)

Wait 1-2 minutes and try again with fewer samples:
\`\`\`bash
npx tsx src/evaluation/experiments/extended-thinking-ab-test.ts --samples=3
\`\`\`

### "ANTHROPIC_API_KEY not set"

Make sure \`.env.local\` is in the project root and restart your terminal.

### "No traces appearing in LangSmith"

Check these are set:
\`\`\`bash
export LANGCHAIN_TRACING_V2=true
export LANGCHAIN_API_KEY=lsv2_your-key
export LANGCHAIN_PROJECT=storyteller-eval
\`\`\`

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
          components={{
            h1: ({ children }) => (
              <h1 className="text-4xl font-black uppercase tracking-tighter font-syne mb-8 text-white">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-2xl font-bold uppercase tracking-tight font-syne mt-12 mb-4 text-primary">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-lg font-bold mt-8 mb-3 text-white/90">{children}</h3>
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
            td: ({ children }) => (
              <td className="border border-white/10 px-4 py-2">{children}</td>
            ),
            hr: () => <hr className="border-white/10 my-8" />,
            ul: ({ children }) => <ul className="list-disc list-inside space-y-1">{children}</ul>,
            ol: ({ children }) => (
              <ol className="list-decimal list-inside space-y-1">{children}</ol>
            ),
            li: ({ children }) => <li className="text-white/70">{children}</li>,
            p: ({ children }) => <p className="text-white/70 leading-relaxed">{children}</p>,
            strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
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
