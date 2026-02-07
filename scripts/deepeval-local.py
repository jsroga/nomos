#!/usr/bin/env python3
"""
Local DeepEval evaluation script - no cloud account needed.

Usage:
    python scripts/deepeval-local.py --input conversation.json
    
Or via stdin:
    echo '{"input": "...", "output": "..."}' | python scripts/deepeval-local.py
"""

import sys
import json
import argparse
from typing import Optional

try:
    from deepeval import evaluate
    from deepeval.test_case import LLMTestCase
    from deepeval.metrics import GEval
    from deepeval.metrics.indicator import Metric
except ImportError:
    print(json.dumps({
        "error": "deepeval not installed. Run: pip install deepeval",
        "score": 0,
        "criteria": {}
    }))
    sys.exit(1)


# ============================================
# Scientific Metrics (EQ-Bench, Mazur, Gilligan)
# ============================================

def create_magic_score_metric():
    """EQ-Bench Magic Score metric"""
    return GEval(
        name="EQ-Bench Magic Score",
        criteria="""Evaluate the creative writing for MAGIC using EQ-Bench methodology.

DIMENSIONS TO SCORE (0-100 each):
1. ORIGINALITY - Conceptual freshness, avoiding clichés
2. CHARACTER SPECIFICITY - Characters with distinct traits, contradictions, blind spots
3. PROSE VOICE - Distinctive style, not generic AI voice
4. EMOTIONAL TRUTH - Feelings are earned, not manipulated
5. MEMORABILITY - Lines/moments that could be quoted, discussed
6. RISK-TAKING - Bold choices, unexpected decisions

SLOP INDICATORS (red flags that reduce score):
- "heart pounding" / "breath caught" clichés
- Generic emotional descriptions
- Purple prose ("orbs" for eyes, "crimson liquid" for blood)
- AI-typical phrases ("delve into", "tapestry of", "myriad of")

Score 0-1 where 0-0.4=competent, 0.5-0.6=flashes of magic, 0.7-0.8=genuine magic, 0.9-1.0=masterwork.""",
        evaluation_params=[
            "actual_output",
        ],
        threshold=0.5,
    )


def create_anti_slop_metric():
    """Anti-Slop detection metric"""
    return GEval(
        name="Anti-Slop Score",
        criteria="""Detect AI-typical writing patterns ("slop").

SLOP CATEGORIES:
1. HEDGING - "It's important to note...", "It's worth mentioning..."
2. FILLER - "In order to", "Due to the fact that"
3. AI PATTERNS - "delve into", "tapestry of", "myriad of"
4. PURPLE PROSE - "orbs" instead of eyes, "crimson liquid" instead of blood
5. TELLING NOT SHOWING - "She felt sad" instead of showing sadness
6. WEAK VERBS - Overuse of "was", "seemed", "appeared"

Score 0-1 where:
- 0.8-1.0: Clean, professional writing (no AI tells)
- 0.6-0.8: Some slop but generally human-like
- 0.4-0.6: Notable slop issues
- 0.0-0.4: Heavy slop, clearly AI content""",
        evaluation_params=["actual_output"],
        threshold=0.6,
    )


def create_consistency_metric():
    """EQ-Bench Consistency metric"""
    return GEval(
        name="Consistency Score",
        criteria="""Evaluate creative writing for CONSISTENCY.

DIMENSIONS:
1. FACT CONSISTENCY - No contradictions with established facts
2. CHARACTER CONSISTENCY - Voice, motivation, knowledge, ability maintained
3. WORLD LOGIC - Rules of the world followed
4. TIMELINE - Events in correct sequence
5. EMOTIONAL CONTINUITY - Trauma and joy have lasting effects

Score 0-1 where:
- 0.9-1.0: No inconsistencies
- 0.7-0.8: Minor issues, immersion intact
- 0.5-0.6: Major issues noticed
- 0.0-0.5: Critical inconsistencies""",
        evaluation_params=["actual_output", "context"],
        threshold=0.7,
    )


def create_narrative_coherence_metric():
    """Mazur Benchmark narrative coherence"""
    return GEval(
        name="Narrative Coherence",
        criteria="""Evaluate NARRATIVE COHERENCE using Mazur's 10 elements:

1. CHARACTER - Specific, not generic characters
2. ATTRIBUTE - Distinguishing features
3. ACTION - Characters DO things
4. OBJECT - Items have significance
5. LOCATION - Places affect events
6. MOMENT - Timing matters
7. CORE CONCEPT - Clear premise
8. METHOD - Specificity in execution
9. RELATIONSHIP - Elements interconnected
10. GOAL - Clear stakes

Score 0-1 based on how many elements are engaged meaningfully.""",
        evaluation_params=["actual_output", "context"],
        threshold=0.6,
    )


def create_prestige_tv_metric():
    """Gilligan + GRRM quality metric"""
    return GEval(
        name="Gilligan-Martin Quality",
        criteria="""Evaluate using Gilligan Method and GRRM principles.

GILLIGAN METHOD:
- CONSEQUENCE TRACKING - Every action has proportional consequence
- MYSTERY VS CONFUSION - Withhold for tension, not confusion
- SPECIFICITY - "I am the one who knocks" vs "I'm dangerous"
- SHOW DON'T TELL - Actions reveal character

MARTIN (GRRM) PRINCIPLES:
- MORAL COMPLEXITY - No pure good/evil
- HUMAN HEART IN CONFLICT - Internal struggles drive plot

RED FLAGS (automatic deduction):
- Coincidental timing saving characters
- Villain monologuing exposition
- Deus ex machina resolution

Score 0-1 where 0.9-1.0 = prestige TV quality.""",
        evaluation_params=["actual_output", "context"],
        threshold=0.6,
    )


def run_evaluation(input_text: str, output_text: str, context: Optional[list] = None):
    """Run all metrics on the given input/output"""
    
    # Create test case
    test_case = LLMTestCase(
        input=input_text,
        actual_output=output_text,
        context=context or [],
    )
    
    # Create metrics
    metrics = [
        create_magic_score_metric(),
        create_anti_slop_metric(),
        create_consistency_metric(),
        create_narrative_coherence_metric(),
        create_prestige_tv_metric(),
    ]
    
    # Run evaluation
    results = evaluate([test_case], metrics, print_results=False)
    
    # Format results
    criteria = {}
    total_score = 0
    
    for metric in metrics:
        score = metric.score if hasattr(metric, 'score') else 0
        reason = metric.reason if hasattr(metric, 'reason') else ""
        
        criteria[metric.name.lower().replace(" ", "_").replace("-", "_")] = {
            "score": round(score * 10, 1),  # Convert to 0-10 scale
            "comment": reason or ("Passed" if score >= metric.threshold else "Below threshold"),
        }
        total_score += score
    
    avg_score = total_score / len(metrics) if metrics else 0
    
    return {
        "score": round(avg_score * 10, 1),  # Convert to 0-10 scale
        "feedback": f"Local DeepEval evaluation with {len(metrics)} scientific metrics (EQ-Bench, Mazur, Gilligan)",
        "criteria": criteria,
        "traceId": "local-deepeval",
    }


def main():
    parser = argparse.ArgumentParser(description="Local DeepEval evaluation")
    parser.add_argument("--input", "-i", help="Path to JSON file with input/output")
    args = parser.parse_args()
    
    # Read input
    if args.input:
        with open(args.input, 'r') as f:
            data = json.load(f)
    else:
        # Read from stdin
        data = json.load(sys.stdin)
    
    input_text = data.get("input", "")
    output_text = data.get("output", data.get("actualOutput", ""))
    context = data.get("context", [])
    
    if not output_text:
        print(json.dumps({
            "error": "No output text provided",
            "score": 0,
            "criteria": {}
        }))
        sys.exit(1)
    
    try:
        result = run_evaluation(input_text, output_text, context)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({
            "error": str(e),
            "score": 0,
            "criteria": {}
        }))
        sys.exit(1)


if __name__ == "__main__":
    main()
