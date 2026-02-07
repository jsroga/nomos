#!/usr/bin/env python3
"""
DeepEval Evaluation Runner for Hypothesis Experiments

Reads JSON input from stdin or file, runs metrics, outputs JSON results.

Usage:
    python evaluate.py input.json
    python evaluate.py < input.json
    python evaluate.py --test

Input JSON format:
{
    "testCases": [
        {
            "input": "User prompt",
            "actualOutput": "Content to evaluate",
            "expectedOutput": "Optional baseline",
            "context": ["Context item 1", "Context item 2"]
        }
    ],
    "metrics": ["Anti-Slop Score", "Mazur Character Voice"]  // Optional filter
}

Output JSON format:
{
    "success": true,
    "testCases": [
        {
            "input": "User prompt...",
            "metrics": [
                {"name": "Anti-Slop Score", "score": 0.85, "success": true, "reason": "..."}
            ]
        }
    ]
}
"""

import sys
import os
import json
import argparse
from typing import Optional
from datetime import datetime, timezone
from io import StringIO
from contextlib import redirect_stdout, redirect_stderr

# Suppress DeepEval's verbose output during import
_original_stdout = sys.stdout
_original_stderr = sys.stderr

try:
    # Suppress import-time output
    sys.stdout = StringIO()
    sys.stderr = StringIO()
    
    from deepeval import evaluate
    from deepeval.test_case import LLMTestCase
    from metrics import ALL_METRICS, get_metrics_by_name, METRIC_NAMES
    
    # Restore stdout/stderr
    sys.stdout = _original_stdout
    sys.stderr = _original_stderr
except ImportError as e:
    sys.stdout = _original_stdout
    sys.stderr = _original_stderr
    print(json.dumps({
        "success": False,
        "error": f"Import error: {e}. Run: pip install -r requirements.txt",
        "testCases": []
    }))
    sys.exit(1)


def run_evaluation(input_data: dict) -> dict:
    """Run DeepEval metrics on the provided test cases."""
    test_cases = []
    
    # Build test cases
    for tc in input_data.get("testCases", []):
        test_case = LLMTestCase(
            input=tc.get("input", ""),
            actual_output=tc.get("actualOutput", ""),
            expected_output=tc.get("expectedOutput"),
            context=tc.get("context", []),
        )
        test_cases.append(test_case)
    
    if not test_cases:
        return {
            "success": False,
            "error": "No test cases provided",
            "testCases": []
        }
    
    # Select metrics
    metric_names = input_data.get("metrics")
    metrics = get_metrics_by_name(metric_names)
    
    if not metrics:
        return {
            "success": False,
            "error": f"No valid metrics found. Available: {METRIC_NAMES}",
            "testCases": []
        }
    
    # Run evaluation with new API (deepeval 3.x)
    # Suppress all stdout/stderr from DeepEval
    try:
        from deepeval.evaluate.configs import AsyncConfig, DisplayConfig
        
        # Capture and discard DeepEval's verbose output
        captured_stdout = StringIO()
        captured_stderr = StringIO()
        
        with redirect_stdout(captured_stdout), redirect_stderr(captured_stderr):
            results = evaluate(
                test_cases=test_cases,
                metrics=metrics,
                async_config=AsyncConfig(run_async=False),
                display_config=DisplayConfig(
                    show_indicator=False,
                    print_results=False,
                ),
            )
    except Exception as e:
        return {
            "success": False,
            "error": f"Evaluation failed: {str(e)}",
            "testCases": []
        }
    
    # Format output
    output = {
        "success": True,
        "testCases": [],
        "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "metricsRun": [m.name for m in metrics],
    }
    
    # Extract results for each test case
    for i, test_case in enumerate(test_cases):
        tc_output = {
            "input": test_case.input[:200] + "..." if len(test_case.input) > 200 else test_case.input,
            "metrics": []
        }
        
        # Get scores from each metric
        for metric in metrics:
            try:
                # DeepEval stores score and reason on the metric after evaluation
                score = getattr(metric, 'score', None)
                reason = getattr(metric, 'reason', None)
                success = getattr(metric, 'success', None)
                
                # If score is None, try to get from metric evaluation
                if score is None:
                    score = 0.0
                if success is None:
                    success = score >= metric.threshold if score else False
                    
                tc_output["metrics"].append({
                    "name": metric.name,
                    "score": round(score, 4) if score else 0.0,
                    "success": success,
                    "reason": reason or "No reason provided",
                    "threshold": metric.threshold,
                })
            except Exception as e:
                tc_output["metrics"].append({
                    "name": metric.name,
                    "score": 0.0,
                    "success": False,
                    "reason": f"Error extracting result: {str(e)}",
                    "threshold": metric.threshold,
                })
        
        output["testCases"].append(tc_output)
    
    return output


def run_test():
    """Run a quick test to verify the setup works."""
    test_input = {
        "testCases": [
            {
                "input": "Write a scene where a character discovers betrayal",
                "actualOutput": """Maya found the emails on accident. The subject line was innocuous: "Re: Thursday."
                
But the thread went back two years. Two years of her secrets, forwarded with commentary.

"She's such a mess lol," Sarah had written.

Maya read for twenty minutes. Her coffee went cold. Outside, a dog barked at nothing.

She closed the laptop carefully, the way you'd close a door on a room where something died.""",
                "context": [
                    "Character: Maya - successful architect, trusting nature",
                    "Character: Sarah - Maya's best friend of 15 years"
                ]
            }
        ],
        "metrics": ["Anti-Slop Score", "Mazur Character Voice"]
    }
    
    print("Running test evaluation...", file=sys.stderr)
    result = run_evaluation(test_input)
    print(json.dumps(result, indent=2))
    return result["success"]


def main():
    parser = argparse.ArgumentParser(
        description="DeepEval evaluation runner for hypothesis experiments"
    )
    parser.add_argument(
        "input_file",
        nargs="?",
        help="Path to JSON input file (reads from stdin if not provided)"
    )
    parser.add_argument(
        "--test",
        action="store_true",
        help="Run a quick test to verify the setup"
    )
    parser.add_argument(
        "--metrics",
        help="Comma-separated list of metrics to run"
    )
    args = parser.parse_args()
    
    # Run test mode
    if args.test:
        success = run_test()
        sys.exit(0 if success else 1)
    
    # Read input
    try:
        if args.input_file:
            with open(args.input_file, 'r') as f:
                input_data = json.load(f)
        else:
            input_data = json.load(sys.stdin)
    except json.JSONDecodeError as e:
        print(json.dumps({
            "success": False,
            "error": f"Invalid JSON input: {str(e)}",
            "testCases": []
        }))
        sys.exit(1)
    except FileNotFoundError:
        print(json.dumps({
            "success": False,
            "error": f"File not found: {args.input_file}",
            "testCases": []
        }))
        sys.exit(1)
    
    # Override metrics from command line if provided
    if args.metrics:
        input_data["metrics"] = [m.strip() for m in args.metrics.split(",")]
    
    # Run evaluation
    result = run_evaluation(input_data)
    print(json.dumps(result, indent=2))
    
    # Exit with error code if evaluation failed
    sys.exit(0 if result["success"] else 1)


if __name__ == "__main__":
    main()
