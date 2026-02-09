# DeepEval Hypothesis Evaluation

Local Python evaluation using DeepEval's G-Eval metrics for storyteller hypothesis testing.

## Setup

```bash
# Create virtual environment
cd scripts/deepeval
python3 -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# Install dependencies
pip install -r requirements.txt

# Set OpenAI API key (for LLM-as-Judge)
export OPENAI_API_KEY=sk-...
```

## Test the Setup

```bash
python evaluate.py --test
```

## Usage

### From File

```bash
python evaluate.py input.json
```

### From Stdin

```bash
echo '{"testCases": [...]}' | python evaluate.py
```

### With Metric Filter

```bash
python evaluate.py input.json --metrics "Anti-Slop Score,Mazur Character Voice"
```

## Input Format

```json
{
  "testCases": [
    {
      "input": "User prompt that started the conversation",
      "actualOutput": "The script/beats/content to evaluate",
      "expectedOutput": "Optional: baseline for comparison",
      "context": [
        "Character: Detective Kowalski - grizzled, cynical",
        "Setting: 1940s noir Chicago"
      ]
    }
  ],
  "metrics": ["Anti-Slop Score", "Mazur Character Voice"]
}
```

## Output Format

```json
{
  "success": true,
  "testCases": [
    {
      "input": "User prompt...",
      "metrics": [
        {
          "name": "Anti-Slop Score",
          "score": 0.85,
          "success": true,
          "reason": "Writing shows concrete details...",
          "threshold": 0.7
        }
      ]
    }
  ],
  "timestamp": "2026-02-05T12:00:00Z",
  "metricsRun": ["Anti-Slop Score", "Mazur Character Voice"]
}
```

## Available Metrics

| Metric | Description | Threshold |
|--------|-------------|-----------|
| EQ-Bench Magic Score | Emotional intelligence, craft | 0.7 |
| Anti-Slop Score | AI pattern detection | 0.7 |
| EQ-Bench Consistency | Character/plot consistency | 0.7 |
| Mazur Character Voice | Distinct character voices | 0.7 |
| Mazur Narrative Coherence | 10-element framework | 0.7 |
| Gilligan-Martin Quality | Breaking Bad + GRRM principles | 0.7 |

## Integration with TypeScript

The TypeScript bridge (`src/evaluation/deepeval/bridge.ts`) spawns this script and parses the JSON output. Usage:

```typescript
import { runDeepEval } from '@/evaluation/deepeval/bridge'

const result = await runDeepEval({
  testCases: [...],
  metrics: ['Anti-Slop Score']
})
```
