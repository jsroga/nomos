---
name: trace-forensics
description: Diagnose why an AI agent misbehaved by reading its Langfuse traces and spans — reconstruct the decision path, find the exact failing step, fix the root cause
---

# Trace Forensics

Investigate an agent misbehavior from its execution trace. Extra context from the
user:

> {{user_input}}

Agent bugs rarely live in one line of code — they live in the **sequence** of
context, model decisions, and tool calls. The trace is the crime scene. Read it
before touching code; the goal is to pinpoint the *exact step* where reality
diverged from intent, then fix that step's root cause.

## This repo's observability

- **Tracing:** Langfuse via `src/agent-core/observability.ts` (`langfuse`,
  `withSpan(...)`). Agent runs wrap work in spans with a `traceId`; tool executions
  and LLM calls are nested observations.
- **Scores:** `NUMERIC | CATEGORICAL | BOOLEAN` attached to trace/observation IDs
  (e.g. judge scores, guardrail pass/fail).
- **Redaction:** inputs/outputs are sanitized (`SENSITIVE_PATTERNS`) before export —
  expect secrets to appear redacted; don't chase a "missing" value that was scrubbed.
- **Mastra:** agent runs also export via `@mastra/langfuse`; `MastraInstance`
  configures the `Observability` exporter and serialization limits.

## Step 1 — Reconstruct the timeline

From the trace, lay out the ordered path:

1. **Inputs / context** the agent received (system prompt version, retrieved
   context, user message, prior memory).
2. Each **LLM turn**: what the model saw → what it produced (text + tool calls).
3. Each **tool call**: name, arguments, result (or error).
4. **Scores / guardrail outcomes** attached along the way.
5. Final output and where it went.

Note token counts and latency per step — spikes and truncation are clues.

## Step 2 — Find the divergence point

Walk forward until the first step where the run went wrong, and classify it:

- **Context defect** — the model never received the data it needed (retrieval
  gap, memory truncated, wrong `projectId`/`episodeId` in context). The model
  behaved reasonably given bad input.
- **Reasoning defect** — context was correct, but the model chose wrong (ignored
  an instruction, hallucinated, picked the wrong tool). → a *prompt/model* problem.
- **Tool-call defect** — right intent, malformed arguments, or the tool itself
  errored / returned bad data. → a *tool/schema/service* problem.
- **Orchestration defect** — steps ran in the wrong order, a loop repeated, a
  retry clobbered state, or a guardrail didn't fire. → a *workflow/agent-loop* problem.
- **Serialization/observability artifact** — the trace looks wrong but the run was
  fine (redaction, truncated large payloads, dropped span). Rule this out before
  "fixing" a non-bug.

The single most valuable question: **"Given exactly what this step saw, was its
output reasonable?"** If yes, the bug is upstream (context); if no, the bug is here.

## Step 3 — Confirm the hypothesis

- Isolate the divergent step and re-run it with the *same* inputs from the trace
  (replay the tool with the logged args; re-prompt with the logged context).
- If it reproduces → you've found it. If not → variance; increase samples or look
  for nondeterministic context (time, ordering, memory state).
- Distinguish a one-off stochastic miss from a systematic failure by checking
  other traces / scores for the same signature.

## Step 4 — Fix the root cause at the right layer

| Divergence class | Fix location |
| --- | --- |
| Context defect | retrieval / memory / context-builder (add the data, fix the id) |
| Reasoning defect | prompt (use `prompt-optimizer`) or model/decoding settings |
| Tool-call defect | tool `inputSchema`/`execute`, or the underlying `src/services/*` |
| Orchestration defect | agent loop, `maxSteps`, retry logic, guardrail wiring |
| Observability artifact | tracing/serialization config — not the product code |

Make the minimal fix at that layer. Don't patch a reasoning problem with a
post-hoc string hack, or a context bug by rewording the prompt.

## Step 5 — Prevent regression

- Add the failing scenario to the eval set (see `llm-eval`) and/or a unit test for
  the tool/context bug so it can't silently return.
- If the failure was invisible until a human noticed, add a **guardrail score**
  (a programmatic or judge check emitted to Langfuse) so the next occurrence is
  caught automatically.
- Verify the fix by replaying the original trace's inputs and confirming the new
  path is correct.

## Anti-patterns

- Guessing at code before reading the trace.
- "Fixing" a redaction/truncation artifact that was never a real bug.
- Treating a stochastic one-off as systematic (or vice versa) without checking
  multiple traces.
- Patching the symptom at the output layer instead of the diverging step.
- Fixing the bug but leaving no score/test to catch its return.

## Deliverable

The reconstructed decision path, the identified divergence step and its class, the
root-cause fix at the correct layer, and the eval case / guardrail score / test
added so the failure is caught automatically next time.
