# Hypothesis-Driven Evaluation Guide

Run A/B experiments on storyteller prompts and logic to scientifically test improvements.

## Quick Start

```bash
# Run a hypothesis experiment
npm run eval hypothesis -- --config experiments/hyp-001-emotional-markers.json

# Push results to Confident AI dashboard
npm run eval hypothesis -- --config experiments/hyp-001-emotional-markers.json --push-to-confident-ai
```

## How It Works

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        HYPOTHESIS EXPERIMENT FLOW                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. DEFINE HYPOTHESIS (JSON config)                                     │
│     ↓                                                                   │
│  2. SIMULATE CONVERSATIONS (baseline vs variant)                        │
│     ↓                                                                   │
│  3. CAPTURE OUTPUTS (world bible, beats, script)                        │
│     ↓                                                                   │
│  4. RUN DEEPEVAL (6 scientific metrics)                                 │
│     ↓                                                                   │
│  5. GENERATE REPORT (.md with recommendations)                          │
│     ↓                                                                   │
│  6. PUSH TO CONFIDENT AI (optional dashboard)                           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Creating a Hypothesis

Create a JSON file in `experiments/`:

```json
{
  "id": "hyp-004",
  "name": "Structured dialogue tags improve voice distinction",
  "description": "Test if adding speaker emotion tags like [ANGRY] or [HESITANT] helps differentiate character voices",
  
  "variable": {
    "type": "prompt",
    "name": "dialogue_emotion_tags",
    "baseline": "Write dialogue naturally",
    "variant": "Write dialogue with emotion tags like [ANGRY], [HESITANT], [CONFIDENT] before each line"
  },
  
  "messageFlow": [
    {
      "role": "user",
      "content": "Create a crime drama with two detectives - one veteran, one rookie"
    },
    {
      "role": "user", 
      "content": "Add a scene where they argue about how to handle a suspect"
    },
    {
      "role": "user",
      "content": "Write the confrontation dialogue between them"
    }
  ],
  
  "outputScope": ["script", "beats"],
  
  "targetMetrics": [
    "Mazur Character Voice",
    "Gilligan-Martin Quality"
  ]
}
```

### Hypothesis Config Fields

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Unique ID like `hyp-001`, `hyp-002` |
| `name` | Yes | Short descriptive name |
| `description` | Yes | What you're testing and why |
| `variable.type` | Yes | `prompt`, `temperature`, `model`, `context` |
| `variable.name` | Yes | What's being changed |
| `variable.baseline` | Yes | Control value (current behavior) |
| `variable.variant` | Yes | Test value (proposed change) |
| `messageFlow` | Yes | Array of conversation turns to simulate |
| `outputScope` | Yes | What to capture: `worldBible`, `beats`, `script`, `characters` |
| `targetMetrics` | Yes | Which metrics matter for this hypothesis |

### Variable Types

**prompt** - Test prompt modifications:
```json
{
  "type": "prompt",
  "name": "consequence_tracking",
  "baseline": "",
  "variant": "Always track consequences of character actions and reference them in future scenes"
}
```

**temperature** - Test creativity levels:
```json
{
  "type": "temperature",
  "name": "creativity_boost",
  "baseline": "0.7",
  "variant": "0.9"
}
```

**context** - Test context additions:
```json
{
  "type": "context",
  "name": "genre_reference",
  "baseline": "",
  "variant": "Reference classic noir films like Chinatown and The Maltese Falcon"
}
```

## Available Metrics

The system evaluates using 6 scientific metrics:

| Metric | What It Measures | Score Range |
|--------|-----------------|-------------|
| **Anti-Slop Score** | Originality, avoids clichés and generic phrases | 0-1 |
| **EQ-Bench Magic Score** | Emotional resonance and reader engagement | 0-1 |
| **EQ-Bench Consistency** | Internal logic and continuity | 0-1 |
| **Mazur Character Voice** | Distinct voices for each character | 0-1 |
| **Mazur Narrative Coherence** | Story structure and flow | 0-1 |
| **Gilligan-Martin Quality** | Overall dramatic craft quality | 0-1 |

## Running Experiments

### Basic Run (Local Only)
```bash
npm run eval hypothesis -- --config experiments/your-hypothesis.json
```

### With Confident AI Dashboard
```bash
npm run eval hypothesis -- --config experiments/your-hypothesis.json --push-to-confident-ai
```

### View Results

1. **Local Report**: Check `src/evaluation/hypothesis/reports/` for `.md` files
2. **Confident AI**: Visit the URL printed after `--push-to-confident-ai`
3. **Langfuse**: Traces are automatically logged for debugging

## Understanding Results

### Verdict Types

| Verdict | Meaning |
|---------|---------|
| **ACCEPTED** | Variant improved target metrics by >5% |
| **REJECTED** | Variant worsened target metrics by >5% |
| **INCONCLUSIVE** | Changes within ±5% margin |

### Example Report Output

```
═══════════════════════════════════════════════════════════
  ✅ EXPERIMENT COMPLETE: ACCEPTED
═══════════════════════════════════════════════════════════

  📊 Metric Comparisons:
    ✅ Mazur Character Voice: 0.58 ↑ 0.72 (+24.1%)
    ✅ Gilligan-Martin Quality: 0.61 ↑ 0.68 (+11.5%)

  📋 Summary:
    Adding structured emotion tags significantly improved character
    voice distinction while maintaining dialogue quality.

  💡 Top Recommendations:
    • [high] Implement emotion tags in production prompts
    • [medium] Consider training examples with varied emotional contexts
```

## Example Hypotheses to Test

### 1. Character Depth
```json
{
  "id": "hyp-depth",
  "name": "Background details improve character psychology",
  "variable": {
    "type": "prompt",
    "baseline": "",
    "variant": "Include each character's childhood trauma and core fear in their profile"
  },
  "targetMetrics": ["Mazur Character Voice", "EQ-Bench Magic Score"]
}
```

### 2. Dialogue Quality
```json
{
  "id": "hyp-subtext",
  "name": "Subtext instructions improve dialogue",
  "variable": {
    "type": "prompt",
    "baseline": "",
    "variant": "Every line of dialogue should contain subtext - what the character really means vs what they say"
  },
  "targetMetrics": ["Gilligan-Martin Quality", "Anti-Slop Score"]
}
```

### 3. Story Consistency
```json
{
  "id": "hyp-timeline",
  "name": "Explicit timeline tracking improves consistency",
  "variable": {
    "type": "context",
    "baseline": "",
    "variant": "Maintain a detailed timeline of all events with exact timestamps"
  },
  "targetMetrics": ["EQ-Bench Consistency", "Mazur Narrative Coherence"]
}
```

### 4. Avoiding Generic Writing
```json
{
  "id": "hyp-specificity",
  "name": "Specificity prompts reduce slop",
  "variable": {
    "type": "prompt",
    "baseline": "",
    "variant": "Never use generic descriptions. Every detail must be specific and unique to this story"
  },
  "targetMetrics": ["Anti-Slop Score", "EQ-Bench Magic Score"]
}
```

## Workflow for Prompt Improvement

1. **Identify Problem**: Notice low scores in a specific metric
2. **Form Hypothesis**: Guess what change might help
3. **Create Config**: Write JSON with baseline/variant
4. **Run Experiment**: `npm run eval hypothesis -- --config ...`
5. **Analyze Results**: Check report for verdict and recommendations
6. **Iterate or Deploy**: 
   - If ACCEPTED → Update production prompts
   - If REJECTED → Try different approach
   - If INCONCLUSIVE → Refine hypothesis

## Troubleshooting

### "DeepEval not ready"
```bash
cd scripts/deepeval
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### "OPENAI_API_KEY not configured"
Ensure `.env.local` contains:
```
OPENAI_API_KEY=sk-...
```

### "Confident AI push failed"
Ensure `.env.local` contains:
```
CONFIDENT_AI_API_KEY=...
```

### Low tool call counts
The storyteller workflow may have internal issues. Outputs are still captured from conversation text for evaluation.

## Files Reference

```
experiments/                    # Hypothesis configs
├── hyp-001-emotional-markers.json
├── hyp-002-temperature-creativity.json
└── hyp-003-consequence-tracking.json

src/evaluation/hypothesis/      # Core framework
├── types.ts                    # TypeScript interfaces
├── conversation-simulator.ts   # Runs A/B conversations
├── output-capture.ts           # Extracts story artifacts
├── recommendation-generator.ts # LLM analysis
├── run-experiment.ts           # CLI entry point
└── reports/                    # Generated .md reports

scripts/deepeval/               # Python evaluation
├── requirements.txt
├── metrics.py                  # 6 scientific metrics
└── evaluate.py                 # DeepEval runner
```
