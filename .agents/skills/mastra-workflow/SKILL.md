---
name: mastra-workflow
description: Design and implement Mastra v1 workflows (createStep, parallel critics, suspend/resume HITL, SSE bridge) for domain agents — use before reshaping storyteller orchestration or porting StoryForge patterns
---

# Mastra Workflow

Design or implement a **Mastra v1 workflow** for a domain agent pipeline. Extra context:

> {{user_input}}

Use this skill when replacing ad-hoc multi-agent graphs (council hops, manual event buses) with **typed workflows** — especially storyteller beat-draft → critique → human verdict → revise.

**Read first:** `AGENTS.md`, `.cursor/rules/mastra-agent-pattern.mdc`, `.local/storyforge/README.md` (PoC reference).

## Step 1 — Clarify the pipeline

Write down in 5 bullets:

- **Trigger** — chat message, API route, Trigger task, or Studio manual run?
- **Inputs** — Zod schema fields (`projectId`, `episodeId`, `traceId`, beat brief, …)
- **Steps** — plan / draft / parallel critics / verdict / revise (no prose in planner step)
- **HITL** — where humans approve, reject, or steer (map to Mastra **suspend**)
- **Outputs** — files, DB rows, SSE events, structured JSON only at boundaries

Reject designs that use **6+ writer agents** in sequence — that averages voice.

## Step 2 — Map to Mastra v1 primitives

| Need | Mastra v1 approach |
| --- | --- |
| Typed steps | `createStep` from `@mastra/core/workflows` with `inputSchema` / `outputSchema` |
| Parallel critics | Parallel step branch or `Promise.all` inside one step — 3 narrow critics, not 6 council agents |
| Human verdict | Workflow **suspend** + resume with `resumeData` (see StoryForge `chapter-workflow.ts` in `.local/storyforge/src/`) |
| Agent inside step | Instantiate domain `Agent` in `execute`, call with `RequestContext` — not `RuntimeContext` |
| Tool calls | `createTool` with `(inputData, context)` — delegate CRUD to existing services |
| Registration | Export workflow from domain; register on `getMastraInstance()` / domain Mastra entry |
| Tracing | Reuse domain `withSpan` / Langfuse patterns; one trace per workflow run |

**Don't:** root `@mastra/core` imports, `format` on agents, `z.any()` on step schemas, second Postgres store.

## Step 3 — Read existing code (before writing)

```bash
# Current storyteller orchestration (likely to shrink/replace)
rg -l 'createStep|Workflow' src/domains/storyteller/
head -80 src/domains/storyteller/agents/orchestration/StoryWorkflow.ts
rg -n 'WORKFLOW_EVENTS|WorkflowContext' src/domains/storyteller/

# App Mastra instance
rg -n 'workflow' src/shared/agent-kernel/MastraInstance.ts src/mastra/

# SSE adapter (thin — must not change frame order)
wc -l src/app/api/storyteller/chat/stream/route.ts
```

Read `docs/orchestration-rfc.md` § on suspend/resume and SSE (`closeOnSuspend`, I1–I4 invariants).

## Step 4 — Design the workflow graph

Produce a short design (in chat or a plan item) with:

1. **Workflow id** (stable, snake_case)
2. **Step list** — id, input/output schemas, which Agent(s) run inside
3. **Suspend point(s)** — what the human sees; what `resumeData` carries
4. **SSE mapping** — which workflow events become which SSE `type` frames (adapter-only in route)
5. **Deletion list** — council/orchestration files this replaces (after grep zero imports)

Reference topology from `.local/storyforge/README.md` § Architecture (author → 3 critics → verdict → revise).

## Step 5 — Implement (minimal vertical slice first)

Order:

1. Zod schemas in `core/types/` or next to workflow file
2. Workflow file under `src/domains/<module>/agents/workflows/` (or `orchestration/` if domain already uses it)
3. Wire **one** entry: tool (`run_beat_draft_workflow`) or server export — not 10 workflow tools
4. Register on Mastra instance; smoke in Studio if env allows
5. **Thin** SSE route change — invoke workflow, stream events — run `/sse-wire-contract` skill checks if touching route

Model strings from `ModelConfig` / `ChatModelCatalog` — never hardcode secrets.

## Step 6 — Verify

```bash
node scripts/fabro-verify.mjs          # module-scoped when PLAN says storyteller
npm run test:unit -- src/domains/storyteller   # add step unit tests where pure
npm run test:e2e smoke                   # if SSE path changed
```

Add at least one test for **pure** schema validation or step output shape (no LLM) when logic allows.

## Anti-patterns (reject these)

- Council loop: Psychologist → Gardener → Consequence → Devil's Advocate → Storyteller prose merge
- 57 workflow tools — one entry tool calling one workflow
- Rewriting SSE frame order to “fit” workflow events
- Critics that suggest replacement prose (diagnosis + quoted passage only)
