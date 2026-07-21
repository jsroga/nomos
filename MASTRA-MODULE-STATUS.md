# Mastra module status + MCP + how to test orchestration

Status of the Mastra migration across modules (storyteller set the convention), the MCP, and how to drive storyteller orchestration from a terminal. Snapshot: 2026-07-20.

---

## TL;DR

| Area | Status |
|---|---|
| **storyteller** | ✅ Full Mastra + conventions (central instance, `ai/` layer, role matrix, tools, workflows, file-based prompts, observability, controller/durable/goals) |
| **game-design** | ✅ **On convention** — Mastra `createTool` + `createWorkflow` + `Agent`, **now registered centrally** (`core/io/mastra-runtime.ts`), dynamic `model` callback; LangChain kept only for the domain pattern-RAG index (documented exception) |
| **loop-creator** | ◐ **On Mastra** — 6 specialists (flagged `LOOP_CREATOR_MASTRA=1`, registered) + market-analyst ReAct (native tools, registered, always-on); orchestration already Mastra-native. Only remaining LangChain is the flag-off fallback branch, retired after a keys-on A/B |
| **interior-designer / 3d-asset-exporter / world-building-toolkit** | — **N/A** — no agents; Trigger.dev tasks (correct, don't force Mastra) |
| **marketing** | — empty (no AI yet) |
| **MCP** | ✅ **Fixed** — `mcp:build` now on `src/mcp/tsconfig.json` (0 errors); runs via `tsx` (`mcp:start`) |
| **Terminal orchestration test** | ✅ **Built** — `npm run storyteller:repl` (interactive) + `npm run storyteller:orchestrate` (one-shot); Studio (`mastra:dev`) also works |

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

### game-design — ✅ On convention (central registration done)

**Has:** Mastra `createTool` (~13 tools), a Mastra `createWorkflow` (`game-loop-workflow`) with steps, one `new Agent`, **now registered on the central instance**. Invoked from `POST /api/workflows/game-design`.

**Done (2026-07-20 — keys-free wiring):**
- ✅ **Central registration** — `domains/game-design/core/io/mastra-runtime.ts` builds a sync agent + workflow graph and calls `registerMastraModule({ agents: { gameDesign }, workflows: { [GAME_LOOP_WORKFLOW_ID] } })`. Side-effect-imported by `src/mastra.ts` (Studio) and the game-design route (production ordering, before any `getMastraInstance()` via `withMastraSpan`). The agent + workflow now appear in Studio and share the instance's storage/observability/tracing.
- ✅ **Sync-constructible agent** — `GameDesignAgent.createSync()` + dynamic `instructions: () => resolveGameDesignInstructions()` and `model: () => resolveGameDesignModel()` callbacks defer prompt/model resolution to run time, so construction needs no keys/DB. `create()` kept as a backward-compatible async delegate. `mastraAgent` getter exposes the inner `Agent` for registration.
- ✅ `resolveGameDesignModel()` single source (dynamic `model` callback now — convention #3) · ✅ `withMastraSpan` observability · ✅ workflow module singleton.
- ✅ **Structure fix** — moved `ai/config/model-config.ts` → `config/model-config.ts` (`config/` is not an allowed `ai/` subfolder; matches storyteller's `domains/<x>/config/`). Cleared the `domain-structure` violation.

**Registration parity (storyteller precedent):** the REGISTERED `gameDesign` agent is **memoryless** (sync, same instructions/model/tools). The per-request production path (`createGameLoopWorkflow` in the route) additionally wires the domain `GameDesignMemory` pattern index. This is the same split storyteller uses (registered chat adapter memoryless; per-request agent carries Memory).

**Documented exception — domain PgVector.** `createGameDesignMemory` keeps its **own `PgVector`** as a game-design *pattern RAG index*, not agent memory — an explicit, documented exception to the "one store" rule (the invariant is one Mastra `PostgresStore`/memory, not "no domain vector indices"). Not on the module-load path, so it needs no keys to register.

**Optional remaining (not blocking convention):**
- Replace LangChain (`OpenAIEmbeddings`) in `GameDesignMemory` with the shared RAG embedding path.
- Route could invoke the registered workflow graph directly instead of its memoryed wrapper — kept as-is to preserve the pattern-RAG behavior.

> Live-run verification (Studio shows `gameDesign` + `game-loop-workflow`; a real design loop) is the operator step — needs `DATABASE_URL` + an LLM key. The compile/wiring is done (TSC 0 · ESLint 0 · domain-structure green for game-design).

### loop-creator — ❌ LangChain / LangGraph (biggest gap; migration started)

**Has:** a full **LangGraph** orchestration (`core/graph/loop-orchestrator.ts`, channels, `state.ts`) driving a **LangChain** multi-agent supervisor (`supervisor.ts`, `supervisor-routing.ts`, `balance-analyst`, `concept-evaluator`, `loop-planner`, `progression-architect`, `mechanics-designer`, `market-analyst` + ~60 market-analyst tool files) — `ChatOpenAI` + `@langchain/core/messages`. Each specialist is a `(state) => Partial<LoopCreatorState>` function that `ChatOpenAI.invoke`s, regex-parses JSON, and sets `nextAgent` for routing. Invoked from `/api/loop-creator/market-analysis*` + `/api/loop-creator/chat`.

**Gaps:** the framework itself (LangChain/LangGraph, not Mastra), no central registration, no Mastra tools/workflows/observability.

**Done (2026-07-20 — steps 1 & 2, keys-free, flagged like storyteller):**
- ✅ **Orchestration is already Mastra-native** — `core/graph/loop-orchestrator.ts` is an imperative supervisor loop (`streamLoopCreator`), no LangGraph `StateGraph`. The remaining LangChain surface was the specialists' single LLM call.
- ✅ **Model centralized** — `config/model-config.ts` `resolveLoopCreatorModel(override?)` (LangChain path) + `resolveLoopCreatorMastraModel(override?)` (`openai/…` for Mastra). Removed the dead `MechanicsDesignerDefaultModel` enum.
- ✅ **6 specialists on Mastra (flagged)** — `ai/agents/mastra/loop-creator-mastra-agents.ts` registers 6 `new Agent({ id, name, model: () => resolveLoopCreatorMastraModel(), instructions })` (supervisor, loop-planner, mechanics-designer, balance-analyst, progression-architect, concept-evaluator), matching the storyteller convention. `loop-creator-completion.ts` is one unified seam: `LOOP_CREATOR_MASTRA=1` routes each specialist's LLM call through `agent.generate` (per-call `instructions` override = the built system prompt; history flattened; `withMastraSpan` observability), else the **byte-identical** LangChain path (zero regression on the default). loop-planner's JSON-mode is preserved on both branches.
- ✅ **Central registration** — `core/io/mastra-runtime.ts` → `registerMastraModule({ agents })`; side-effect-imported by `src/mastra.ts` (Studio) + the loop-creator chat route (production ordering). Agents now show in Studio.
- ✅ TSC 0 · ESLint 0 errors · domain-structure green for loop-creator.

- ✅ **market-analyst fully on Mastra (2026-07-21)** — was already a Mastra `Agent` (`agent.generate` ReAct, `maxSteps: 25`) but its tools were LangChain `DynamicStructuredTool`s adapted at runtime. Converted the **single bridge** `tools/structured-tool.ts` to emit a native Mastra `createTool` — migrating all 18 tools at once with zero per-file change and the exact same `{ output }` result shape. Dropped the `langChainToolToMastra` runtime adapter; dynamic `model: () => resolveLoopCreatorMastraModel()`; singleton `marketAnalystAgent` registered centrally. No LangChain left in the market-analyst.

**Remaining:**
1. **Live A/B** — flip `LOOP_CREATOR_MASTRA=1` with keys and compare specialist output vs the LangChain default; once at parity, make Mastra the default and retire the LangChain branch. (Operator step — needs keys.)
2. Optionally replace the flattened-history text with structured Mastra messages once the AI-SDK ModelMessage version skew (Mastra v5 vs `ai` v3 provider-utils) is resolved.

> Both layers now run on Mastra like storyteller — the supervisor crew (6 specialists, flagged, registered) and the market-analyst ReAct (native tools, registered, always-on). The only LangChain still imported by loop-creator is the flag-off fallback branch in `loop-creator-completion.ts`, retired once the A/B confirms parity. The remaining loop-creator LangChain message types (`AIMessage` in state/orchestrator) are DTOs, not an LLM framework.

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

### C. Interactive REPL — **built** (`npm run storyteller:repl`)

`scripts/storyteller-repl.ts` — a nice-terminal-UI interactive chat (ANSI + readline, no
new deps, no args). Picks a project/episode interactively, streams the **same** chat
orchestration the web uses (`assembleContext → createStorytellerAgent → agent.stream`,
with live token/thinking/tool-call rendering), and a `/beat <brief>` command runs the
beat-draft workflow with the **editorial-verdict HITL** (approve / revise / kill) — the
exact loop the end-user works on. `npm run storyteller:repl` (needs keys + a project).

### C′. One-shot script (`npm run storyteller:orchestrate`)

`scripts/storyteller-orchestrate.ts` — non-interactive: runs one beat-draft (autoApprove)
and prints the final draft + critiques. The original ~40-line sketch:

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

1. ✅ **MCP build fix** — done (`src/mcp/tsconfig.json`; 0 errors).
2. ✅ **Terminal scripts** — done (`storyteller:repl` interactive + `storyteller:orchestrate` one-shot).
3. ✅ **game-design → convention** — done: central registration (`core/io/mastra-runtime.ts` + `registerMastraModule`), sync agent (`createSync` + dynamic `instructions`/`model`), structure fix (`config/model-config.ts`). Live-run is the operator step (keys).
4. ◐ **loop-creator → Mastra** — 6 specialists on registered Mastra agents (flagged `LOOP_CREATOR_MASTRA=1`) + market-analyst fully migrated (native `createTool`s, registered); orchestration was already Mastra-native. Remaining: keys-on A/B to make the specialist path default and retire the LangChain fallback.
5. — asset domains: leave on Trigger.dev.
