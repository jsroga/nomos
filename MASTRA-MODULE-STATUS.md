# Mastra module status + MCP + how to test orchestration

Status of the Mastra migration across modules (storyteller set the convention), the MCP, and how to drive storyteller orchestration from a terminal. Snapshot: 2026-07-20.

---

## TL;DR

| Area | Status |
|---|---|
| **storyteller** | ✅ Full Mastra + conventions (central instance, `ai/` layer, role matrix, tools, workflows, file-based prompts, observability, controller/durable/goals) |
| **game-design** | ◐ **Partial** — Mastra `createTool` + `createWorkflow` + 1 `Agent`, but **not registered centrally**, hardcoded model string, still LangChain for embeddings |
| **loop-creator** | ❌ **LangChain** multi-agent supervisor — not migrated at all |
| **interior-designer / 3d-asset-exporter / world-building-toolkit** | — **N/A** — no agents; Trigger.dev tasks (correct, don't force Mastra) |
| **marketing** | — empty (no AI yet) |
| **MCP** | ◐ Runs via `tsx` (`mcp:start`); **`mcp:build` broken** (bare `tsc`, ignores tsconfig → `@/` aliases unresolved) |
| **Terminal orchestration test** | Studio (`mastra:dev`) works today; no standalone script yet — one is sketched below |

---

## 1. The storyteller convention (the baseline to measure against)

What "on Mastra, our way" means (see `AGENTS.md`):

1. **`domains/<x>/ai/` layer** — agents/tools/workflows/prompts under `ai/`, server-only via `import '@/shared/data/server-guard'`.
2. **Central registration** — the domain's `core/io/mastra-runtime.ts` calls `registerMastraModule({ agents, workflows })`; `create-mastra` consumes it. **One** Mastra instance + Postgres store, never a second.
3. **Dynamic models via the role matrix** — `model: () => resolveRoleModel(role)` (role matrix + picker override), not a hardcoded model string.
4. **Tools** — `createTool` (snake_case stable `id`, zod in/out), business logic in `services/`.
5. **Workflows** — `createWorkflow`/`createStep`; suspend/resume for HITL.
6. **Prompts** — dynamic builders in code; **static** base prompts → `src/mastra/agents/<id>/instructions.md` via `loadAgentInstructions` (file-based pilot).
7. **Observability** — native `Observability` registry + `tracingOptions`; real spans via `withMastraSpan` (no custom span tree).
8. **Memory** — shared `PostgresStore`; bounded windows.
9. **Long-running** — workflow suspend (verdict) · AgentController (plan-first) · durable+goals (autonomous). One gate, one owner.

---

## 2. Module-by-module status + plan

### game-design — ◐ Partial (closest to convention)

**Has:** Mastra `createTool` (~13 tools), a Mastra `createWorkflow` (`game-loop-workflow`) with steps, one `new Agent`. Invoked from `POST /api/workflows/game-design`.

**Gaps vs convention:**
- ❌ **Not registered centrally** — no `core/io/mastra-runtime.ts`, no `registerMastraModule`. The workflow is constructed ad-hoc per request, so it doesn't share the central instance's storage/observability/tracing.
- ❌ **Hardcoded model** — `game-design-agent.ts` uses `model: modelString`, not `resolveRoleModel`. No role matrix / picker.
- ❌ Still imports **LangChain** (`ChatOpenAI`, `OpenAIEmbeddings`) for embeddings/RAG.
- ❌ No `withMastraSpan` observability.

**Plan (medium effort, ~1–2 days):**
1. Add `domains/game-design/ai/config/model-config.ts` with a small role set (or reuse a shared resolver) → swap `modelString` for `resolveRoleModel`.
2. Add `core/io/mastra-runtime.ts`: `registerMastraModule({ agents: { gameDesignAgent }, workflows: { gameLoopWorkflow } })`; import it for the side-effect (like storyteller). Route calls the registered workflow instead of constructing one.
3. Replace LangChain embeddings with the shared `@/shared/ai/rag` path (already Mastra/`PgVector`-based) — or leave embeddings as an explicit exception.
4. Wrap the agent op in `withMastraSpan`.

### loop-creator — ❌ LangChain (biggest gap)

**Has:** a full **LangChain** multi-agent supervisor (`supervisor.ts`, `supervisor-routing.ts`, `balance-analyst`, `concept-evaluator`, `loop-planner`, `progression-architect`, `mechanics-designer`, `market-analyst`) — `ChatOpenAI` + `@langchain/core/messages`. Invoked from `/api/loop-creator/market-analysis*`.

**Gaps:** everything — different framework (LangChain, not Mastra), no central registration, no role matrix, no Mastra tools/workflows/observability.

**Plan (large, ~1 week — treat as its own migration):**
1. **Port the supervisor → a Mastra workflow** (`createWorkflow` with a routing step) or an **AgentController** with modes per specialist; each specialist becomes a Mastra `Agent` with `resolveRoleModel`.
2. Convert the LangChain "tools"/message plumbing → `createTool` + structured output.
3. Register via `core/io/mastra-runtime.ts`.
4. Keep it behind a flag and A/B against the LangChain path before switching.
5. The `market-analyst` web-search tools (Tavily/Twitter/Reddit) become `createTool`s.

> This is the one module where "convention" means a real framework migration, not just wiring. Scope it separately.

### interior-designer / 3d-asset-exporter / world-building-toolkit — N/A (leave as-is)

No Mastra agents — they use **Trigger.dev tasks** for image/3D generation, which is *already* the right durable-background primitive. **Do not force Mastra agents here.** If they ever need agentic reasoning (not just generation), revisit; until then they're correctly outside the convention.

### marketing — empty

No AI yet. When it gets agents, start on-convention from day one (`ai/` layer + central registration).

---

## 3. MCP status

**Layout:** `src/mcp/` — `stdio.ts` (entry), `server.ts`, `agent.ts`, `core/` (auth, request-context, types), `domains/{storyteller,entities,generation,trigger}/tools.ts`. Separate deployable.

**Tools exposed:** storyteller CRUD + chat (`list/get/create/update/delete character`, `list_episodes`, `list_beats`, …), entities, generation, trigger. **Note:** the MCP exposes storyteller **CRUD/chat**, not the full beat-draft **orchestration** (workflow) — that stays server-side.

**Works:** `npm run mcp:start` (via `tsx`, which honors `tsconfig` path aliases).

**Broken:** `npm run mcp:build`:
```
"mcp:build": "tsc src/mcp/stdio.ts --outDir dist/mcp --esModuleInterop --module nodenext --moduleResolution nodenext"
```
It runs **bare `tsc <file>`** (no `-p tsconfig`), so the `@/*` path aliases don't resolve and it can't compile. (Also historically a `schema`→`inputSchema` drift in `domains/trigger/tools.ts`.)

**Fix plan (small):**
1. Add `src/mcp/tsconfig.json` extending the root, with `"@/*": ["../*"]` paths, `module`/`moduleResolution: nodenext`, `outDir: ../../dist/mcp`, and `include: ["stdio.ts", "**/*.ts"]`.
2. Change the script to `tsc -p src/mcp/tsconfig.json` (aliases resolve; matches what `tsx` already does at runtime).
3. Verify `mcp:start` + `mcp:build` both green; add `mcp:build` to the Phase-7 gate sweep.

---

## 4. How to test storyteller orchestration from a terminal

Three ways, easiest → most scriptable:

### A. Mastra Studio (interactive, visual) — works today
```bash
npm run mastra:dev          # http://localhost:4111 (needs .env.local + keys)
```
Run the registered storyteller agents + the `beatDraftWorkflow`, watch each step, tool calls, and traces. Best for poking the pipeline by hand.

### B. The env-gated e2e test (automated, one-shot)
```bash
# needs DATABASE_URL + an LLM key + a scratch project/episode
WORKFLOW_E2E_PROJECT_ID=... WORKFLOW_E2E_EPISODE_ID=... \
  npx vitest run src/domains/storyteller/ai/workflows/__tests__/beat-draft-workflow.e2e.test.ts
```
Runs plan → draft → critics → revise with `autoApprove` and asserts a beat persists. Closest thing to a "does the whole pipeline work" check.

### C. A simple terminal script (recommended to add — the missing piece)

There's **no standalone REPL yet** (PLAN-V2 4.4 was never built). A ~40-line one-shot `tsx` script closes that gap:

```ts
// scripts/storyteller-orchestrate.ts   — run: npx tsx scripts/storyteller-orchestrate.ts "<brief>"
import 'dotenv/config'
import { createBeatDraftWorkflow, defaultBeatDraftDeps } from '@/domains/storyteller/ai/workflows/beat-draft-workflow'
import { beatDraftOutputSchema } from '@/domains/storyteller/ai/workflows/beat-draft-contract'
import { Mastra } from '@mastra/core/mastra'

async function main() {
  const brief = process.argv[2] ?? 'Vera confronts Marcus about the forged ledger; the confession must implicate Vera herself.'
  const workflow = createBeatDraftWorkflow(defaultBeatDraftDeps)
  void new Mastra({ workflows: { beatDraftWorkflow: workflow } })
  const run = await workflow.createRun()
  const result = await run.start({
    inputData: {
      projectId: process.env.STORYTELLER_PROJECT_ID ?? '',
      episodeId: process.env.STORYTELLER_EPISODE_ID ?? '',
      brief, characters: [], autoApprove: true,   // autoApprove: no human gate in the terminal
    },
  })
  if (result.status !== 'success') { console.error('run failed:', result); process.exit(1) }
  const out = beatDraftOutputSchema.parse(result.result)
  console.log('\n=== FINAL DRAFT ===\n' + out.finalDraft)
  console.log('\n=== CRITIQUES ===\n' + out.critiques)
}
void main()
```
```bash
STORYTELLER_PROJECT_ID=... STORYTELLER_EPISODE_ID=... \
  npx tsx scripts/storyteller-orchestrate.ts "your beat brief here"
```

**For the autonomous (goals) loop instead**, call `startAutonomousEpisodeDraft({ threadId, resourceId, objective, prompt })` (from `core/io/mastra-runtime`) and print the `fullStream` chunks — the same shape the flagged `/api/storyteller/autonomous` route maps. That exercises durable + goals from the terminal.

> A fuller interactive REPL (`/mode plan|build`, verdict a/r/k, `/beat`) is PLAN-V2 4.4 — worth building on top of the AgentController once one long-running owner is chosen.

**All three need keys** (`DATABASE_URL` + an LLM key, plus a scratch project/episode) — the compile/wiring is done; a live run is the operator step.

---

## Recommended order

1. **MCP build fix** (small, unblocks the Phase-7 gate) →
2. **Terminal script** (small, gives you a fast orchestration probe) →
3. **game-design → convention** (medium, it's already half-Mastra) →
4. **loop-creator → Mastra** (large, its own migration — flag + A/B) →
5. asset domains: leave on Trigger.dev.
