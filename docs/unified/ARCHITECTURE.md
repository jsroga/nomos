# Unified Module Architecture (Target State)

> **Status:** Proposed · **Scope:** the canonical architecture every product module
> must converge on. Written against the *current* code (June 2026), grounded in
> concrete evidence from `storyteller` and `world-building-toolkit`.
>
> **Pilot modules:** `storyteller`, `world-building-toolkit`.
> **Applied next:** `3d-asset-exporter`, `chat`, then `loop-creator`,
> `interior-designer`, `game-design`, `deduction-puzzle-designer`.
>
> **Locked stack (non-negotiable):** Mastra · Radix · Supabase · TanStack Query ·
> Trigger.dev · Vercel. This document only changes *how* we use them, never *whether*.
>
> Companion docs:
> - `docs/unified/SPEC.md` — the migration plan that gets us here.
> - `docs/orchestration-rfc.md` — the storyteller orchestration core this doc generalizes.
> - `docs/quality-improvement-spec.md` — the quality gates this doc assumes.

---

## 0. TL;DR — the one-paragraph version

Every module is a **vertical slice** with an identical internal skeleton and a single
public entry point. Inside a slice, responsibilities are split across **five layers**
that may only depend *downward*: `ui → state → io → core ← (server) services/agents/tasks`.
**Server state lives in TanStack Query, never in Zustand.** Zustand holds *only*
ephemeral client/UI state. All long-running work goes through **Trigger.dev tasks
co-located with the module**, observed through **Trigger Realtime** (not hand-rolled
polling, not `window` CustomEvents). All persistence goes through **one Drizzle schema
+ typed server services**, never direct browser→Supabase writes. AI work goes through
**one Mastra orchestration kernel** behind ports/adapters. Cross-cutting concerns
(auth, errors, jobs, observability, design system) are **shared singletons**, owned
once.

---

## 1. Why this document exists (the critique)

We compared the two pilot modules across **8 separate questions** ("axes"). They sit at
opposite extremes on almost every one — neither is the target. The target borrows
storyteller's *discipline* and world-building-toolkit's *pragmatism*.

**How to read the table:** each row is **one independent question**, not a folder.
Some questions are about *file layout* (e.g. "Folder convention"), others about
*runtime behaviour* (e.g. "Long-running jobs" = how async work runs). They don't map
1:1 to folders here — the **"Fix lives in"** column shows where each one lands in the
§4 blueprint once fixed.

| # | Question (axis) | `storyteller` today | `world-building-toolkit` today | Verdict | Fix lives in (§4) |
|---|-----------------|---------------------|--------------------------------|---------|-------------------|
| 1 | **How are files organised?** | `PascalCase/` folder-per-unit + barrels; 10 ad-hoc root folders + feature folders (e.g. `mentions/`) at root | Flat: `components/`, `services/`, `store/`, `utils/` | Adopt storyteller's discipline; features ≠ layers | the whole blueprint |
| 2 | **Is there a public entry point?** | No — outsiders import `…/db/schema` directly | No — outsiders import `…/store/useWorldStore` directly | Both broken | `index.ts` |
| 3 | **Where does server data live?** | Mostly API→Drizzle; 1 good TanStack hook | **865-LOC god Zustand store** mixing data + UI + jobs | storyteller closer; TanStack everywhere | `state/queries/` |
| 4 | **Who talks to the DB?** | Server-only (Drizzle behind `requireAuth()`) | **Browser writes to Supabase directly** (split-brain security) | storyteller correct; no browser writes | `services/` + `io/` |
| 5 | **How does long work run?** | SSE god-route (~900 LOC) | **Hand-rolled polling** + `localStorage` + `window` events | Both bespoke → Trigger Realtime + `useJob` | `tasks/` + `shared/jobs` |
| 6 | **How are background tasks written?** | flat, untyped payloads | flat, `payload: {…; neighbors?: any}` | Both flat & untyped → `schemaTask` | `tasks/` |
| 7 | **How strict is typing?** | typed tools, but `Record<string,any>` maps | `any` throughout (`user`, `metadata`…) | Tighten both (`…spec ST-8`) | DTOs in `core/`/`io/` |
| 8 | **How is AI orchestrated?** | Mastra council, but ~8 agent-create sites, 3 result shapes | n/a (image module) | Generalize the kernel | `agents/` + `shared/agent-kernel` |

**Root cause (one sentence):** there is no shared *module contract*, so every module
re-invents structure, data access, async, and AI wiring. This doc defines that contract;
§4 is the contract; the "Fix lives in" column is the map from problem to folder.

### 1.1 The deeper smell: parallel Mastra stacks (the AI-layer critique)

Beyond structure, the AI layer runs **Mastra-native subsystems and hand-rolled
equivalents at the same time** — paying twice and getting the worst of both. This is
the single biggest source of agent-layer complexity and the focus of the §9 redesign.

| Concern | Mastra-native (already wired) | Hand-rolled in parallel (the debt) | Evidence |
|---------|-------------------------------|-------------------------------------|----------|
| **Observability** | `new Observability({ configs:{ storyteller:{ exporters:[langfuseExporter] }}})` → auto AI spans (agent/LLM/tool) | Raw `Langfuse` SDK singleton + `withSpan`/`createStepSpan`/`recordToolCall`/`recordAgentGeneration`/`recordAgentScore` building a **second, manual span tree** | `MastraInstance.ts:89-96` vs `agent-core/observability.ts` (whole file); manual `createStepSpan` in every `StoryWorkflow` step |
| **Workflows** | `Workflow.parallel().then().commit()`, `createStep` | Steps typed `inputSchema: z.any()`; manual Langfuse spans per step; hand-rolled `WorkflowContext` event-bus + ALS; hand-rolled refinement loop; `// @ts-expect-error` mutation of `agent.agent.tools`; **HITL done outside the workflow** | `StoryWorkflow.ts` (`z.any()` at `:112,143,168`, `createStepSpan` everywhere, `:271-275` tool mutation) |
| **Memory** | Mastra `Memory` with `workingMemory`, `semanticRecall`, resource-scoping | `new Memory({ options:{ lastMessages:10 }})` (no working memory, no recall) **and** a custom `class AgentMemory extends MastraMemory` that re-implements vector RAG with `getWorkingMemory()`→`null`, `updateWorkingMemory()`→no-op | `StorytellerAgent.ts:114-119`; `agent-core/memory/agent-memory.ts:87-101` |
| **Skills** | Mastra `Workspace({ skills:[…] })` + `workspace.skills.list()/get()` | Bespoke `skill-loader.ts` (`loadSkill`/`buildSkillsPrompt` reading SKILL.md from fs) | `MastraInstance.ts:74-79` + `StorytellerAgent.ts:415-431` vs `agent-core/skills/skill-loader.ts` |
| **Evals** | `createScorer` (4-step pipeline) attachable as **live scorers** on agents/steps | Entire bespoke `src/evaluation/**` + `agent-core/judging/mazur-judge.ts` (`generateObject` LLM-judge) + Langfuse `score()` — **offline only, zero `createScorer`** | `rg createScorer src` → 0 hits; `src/evaluation/judges/*`, `mazur-judge.ts` |
| **Guardrails** | input/output **processors** (PII, length, structured validation) | anti-slop / link-density / entity rules baked into a 320-line prompt + route regex | `StorytellerAgent.ts:150-407` |
| **DI / context** | `RuntimeContext` per-request injection | args threaded by hand + AsyncLocalStorage (`WorkflowContext`) | `StoryWorkflow.ts:24-28` |

**Consequence:** the orchestration-rfc invariant **I8** ("Langfuse span nesting + parentage
preserved") only *exists* because nesting is manually maintained across two systems.
Deleting the hand-rolled tree and trusting Mastra AI Tracing removes the invariant, not
just satisfies it.

### What we keep (the north stars already in the repo)
- storyteller's **layered decomposition** + Mastra agents + Zod-typed tools.
- **Mastra Workflows** for multi-agent council (`StoryWorkflow.ts`) — the right primitive, used wrong.
- Mastra **Observability/AI-Tracing** + `LangfuseExporter` (already wired in `MastraInstance`) — make it the *only* tracer.
- Mastra **Workspace skills** + the SKILL.md authoring format under `prompts/skills/`.
- The Mazur/creative-director **judge prompts** — excellent eval *content* to port onto `createScorer`.
- `requireAuth()` single session gate; server-side **Drizzle**; the **`useEntities` TanStack pattern**.
- Trigger.dev tasks with **`metadata` progress**; the **hexagonal orchestration core** (`docs/orchestration-rfc.md`).
- Radix + CVA + `tailwind-merge` design system in `src/components/ui`.

---

## 2. First principles (2026 startup defaults)

1. **Vertical slices over horizontal layers.** A feature lives in *one* module folder; you should be able to delete a module by deleting its folder.
2. **Dependencies point inward and downward.** `ui` never touches the DB; `core` never imports React; server code never imports a Zustand store.
3. **Server state ≠ client state.** Server state is *cached remote data* (TanStack Query, single source of truth, automatic invalidation). Client state is *ephemeral UI* (Zustand). They never mix in one store.
4. **The browser never holds a privileged credential.** All writes and all privileged reads go through API routes (or Server Actions) that call `requireAuth()` and Drizzle. RLS is defense-in-depth, not the primary gate.
5. **One schema, one direction.** Drizzle is the source of truth for table shape; Supabase migrations are generated/owned per the rule in `docs/ARCHITECTURE.md` §Migrations. Field names are `camelCase` end-to-end above the SQL boundary; mapping happens in exactly one place.
6. **Long work is a Job.** Anything > ~1s of server/GPU/LLM time is a Trigger.dev task, observed via Realtime, surfaced through one `useJob` hook and one global status store. No bespoke polling, no `window` events.
7. **AI is orchestrated, not scattered.** One kernel creates/streams/traces agents. Strategies (direct/council/plan) and surfaces (SSE/JSON/graph) are pluggable seams.
8. **Pure core is testable offline.** Business rules (`core/`) take data in and return data out — no DB, no LLM, no `Date.now()` unless injected. ≥90% of correctness provable in CI without external services.
9. **Typed boundaries.** Zod at every external edge (API body, tool input, task payload, **and every workflow step `inputSchema`/`outputSchema`**). `z.infer` the types; ban `any` at boundaries.
10. **Encapsulation via one barrel.** Each module exports a curated `index.ts`. Reaching into a module's internals from outside is a lint error.
11. **Use the framework, once.** If Mastra ships a primitive (Workflows, Memory, AI Tracing, Workspace skills, Scorers, Processors, RuntimeContext), we use *it* — not a hand-rolled parallel. Exactly **one** implementation per concern. Wrapping is allowed; re-implementing is not.
12. **Evaluation is continuous, not a script.** Judges are `createScorer` definitions attached as **live scorers** to agents/workflow steps (async, non-blocking) *and* reused for offline batch runs. One scorer definition, two run modes.

---

## 3. Repository topology (target)

```
src/
├─ domains/<module>/         # vertical slices — the unit of ownership
│   └─ … (see §4 blueprint)
├─ shared/                   # cross-module building blocks (NEW canonical home)
│   ├─ agent-kernel/         # generalized orchestration core (from agent-core/ + orchestration-rfc)
│   ├─ jobs/                 # useJob hook, Job types, Trigger Realtime client
│   ├─ data/                 # query-client, query-key factory, api fetcher, Result type
│   ├─ auth/                 # requireAuth, getUserSession (was lib/auth)
│   ├─ observability/        # withSpan, Langfuse/OTEL wiring
│   └─ errors/               # AppError, error→HTTP/SSE mappers, useErrorStore
├─ components/ui/            # Radix + CVA design system (shared primitives) — unchanged
├─ db/                       # Drizzle: single schema source of truth + client
├─ trigger/                  # thin re-export registry only (see §8)
└─ app/                      # Next.js App Router: routes + API; thin glue only
```

> `shared/` supersedes the ad-hoc spread across `src/lib`, `src/agent-core`,
> `src/infrastructure`, `src/store`. Migration is incremental (SPEC §P1); the
> *rule* is: anything imported by 2+ modules lives in `shared/`, never in a module.

### Dependency rule (enforced by lint, SPEC §P0)
```
app  ─▶ domains/<m>/index.ts ─▶ (its own internals)
domains/<m> ─▶ shared/*, components/ui, db
shared/*    ─▶ shared/*, db            (never imports a domain)
core/*      ─▶ (nothing app/React/db)  pure
```
- A module may **not** import another module's internals. Cross-module needs go through the other module's `index.ts`, or the shared layer.
- `app/` contains **no business logic** — it wires HTTP/RSC to a module's public functions.

---

## 4. The Module Blueprint (every domain looks like this)

This is the single canonical skeleton. `storyteller` already approximates it;
`world-building-toolkit` must be reshaped into it; new modules scaffold from it.

```
src/domains/<module>/
├─ index.ts            # PUBLIC API. The ONLY legal import target from outside.
│
├─ ui/                 # React components (client). PascalCase folder-per-component.
│   └─ <Component>/
│       ├─ <Component>.tsx
│       ├─ <Component>.test.tsx        # colocated
│       └─ index.ts                    # local barrel
│
├─ state/              # CLIENT state only (Zustand) + TanStack hooks (server state)
│   ├─ use<Module>UiStore.ts           # ephemeral UI: selection, modes, panels
│   └─ queries/                        # TanStack Query hooks (server state)
│       ├─ use<Entity>.ts              # read
│       └─ use<Entity>Mutation.ts      # write (calls io/, invalidates keys)
│
├─ io/                 # CLIENT→SERVER edge: typed fetchers, query keys, DTOs
│   ├─ <module>.api.ts                 # fetch wrappers over /api/<module>/*
│   ├─ <module>.keys.ts                # query-key factory
│   └─ <module>.dto.ts                 # Zod request/response schemas (shared w/ routes)
│
├─ core/               # PURE domain logic. No React, no DB, no I/O. Unit-tested.
│   ├─ <Concept>.ts                    # types, enums, reducers, merge/validate fns
│   └─ index.ts
│
├─ services/           # SERVER-ONLY. DB access (Drizzle) + external APIs. Class or fn.
│   └─ <Thing>Service.ts               # `import 'server-only'`
│
├─ agents/             # SERVER-ONLY. Mastra agents/tools/workflows (AI modules only)
│   ├─ <Agent>/<Agent>.ts
│   └─ tools/<tool>.ts                 # Zod-typed Mastra tools
│
├─ tasks/              # Trigger.dev tasks OWNED by this module (schemaTask)
│   └─ <task>.task.ts
│
├─ prompts/            # Prompt builders + skills (AI modules only)
│
└─ <module>.config.ts  # constants, model matrix, feature flags for this module
```

**Rules:**
- **`index.ts` is the contract.** It re-exports the module's components, hooks, public types, and (type-only) task handles. Nothing else is importable from outside.
- **`core/` is sacred.** If it imports `react`, `@/db`, `fetch`, or `Date.now()` directly, it's a bug. This is what makes the module testable offline (orchestration-rfc §5 generalized).
- **`services/` and `agents/` and `tasks/` are server-only** (`import 'server-only'` at top; bundler-guarded).
- **AI modules** (storyteller, chat, loop-creator…) use `agents/` + `prompts/`. **Asset modules** (world-building-toolkit, 3d-asset-exporter, interior-designer) skip them and lean on `tasks/`.
- **Naming:** folders & components `PascalCase`; files matching a single export use that export's name; hooks `useX.ts`; tasks `<verb>.task.ts`; services `<Noun>Service.ts`; Zod schemas/DTOs `*.dto.ts`. **Kill the flat-vs-folder split** — pick folder-per-unit (storyteller's convention) everywhere.

### Worked example — reshaping `world-building-toolkit`
```
world-building-toolkit/
├─ index.ts                       # exports <WorldCanvas/>, useTiles, useWorldUiStore, types
├─ ui/
│   ├─ WorldCanvas/  Tile/  RepaintCanvas/  Sidebar/  AssetsPanel/  TileReviewDialog/ …
├─ state/
│   ├─ useWorldUiStore.ts         # ← ONLY: viewport, selection, modes, brush, debug flags
│   └─ queries/
│       ├─ useTiles.ts            # ← replaces store.tiles + loadProject tile fetch
│       ├─ useProjects.ts         # ← replaces store.projects/fetchAllProjects
│       ├─ useAssets.ts           # ← replaces store.assets/fetchAssets
│       └─ useTileMutation.ts     # ← replaces addTile/removeTile/acceptGeneration (calls io/)
├─ io/
│   ├─ tiles.api.ts               # POST /api/world/tiles … (NO direct supabase in browser)
│   ├─ world.keys.ts
│   └─ world.dto.ts
├─ core/
│   ├─ TileGrid.ts                # neighbor math, RLE (was utils/rle.ts), pure
│   └─ ContextAssembly.ts         # pure variant/strategy selection (was in store debug blob)
├─ services/
│   ├─ TileService.ts             # server: Drizzle reads/writes for tiles
│   └─ FidelityService.ts  RepaintService.ts  SelectModeService.ts  UpscaleService.ts
├─ tasks/
│   ├─ generate-tile.task.ts      # ← moved from src/trigger/generate-tile.ts, schemaTask
│   ├─ upscale-tile.task.ts  enhance-fidelity.task.ts …
└─ world-building-toolkit.config.ts
```
The 865-LOC `useWorldStore` dissolves into: a ~150-LOC `useWorldUiStore` (pure UI),
TanStack query/mutation hooks (server state), and server `*Service` classes (DB).
The client-side polling (`TileGenerationService.startPolling`, the `localStorage`
recovery, the `window.dispatchEvent('generation-review-ready')`) is replaced by the
shared **`useJob`** hook on Trigger Realtime (§7).

---

## 5. Layer contracts (what each layer may and may not do)

| Layer | May import | May NOT import | Responsibility |
|-------|-----------|----------------|----------------|
| `ui/` | `state/`, `core/` (types), `components/ui`, `shared/jobs` | `services/`, `db`, `io/` directly, another module | Render + dispatch. No fetch, no business rules. |
| `state/` | `io/`, `core/`, `shared/data`, `shared/jobs` | `services/`, `db`, `react-dom` | Server-state caching (TanStack) + client-state (Zustand). Owns query keys + invalidation. |
| `io/` | `core/` (DTOs), `shared/data` | `services/`, `db`, `react` | Typed HTTP edge. One fetcher, Zod-validated responses. |
| `core/` | `core/`, `zod` | everything else | Pure logic: types, enums, reducers, merges, validators. |
| `services/` | `db`, `shared/*`, external SDKs | `state/`, `ui/`, `io/`, React | Server-only persistence + external API calls. Returns `Result<T>`. |
| `agents/` | `shared/agent-kernel`, `services/`, `prompts/`, `core/` | `ui/`, `state/` | Mastra agents/tools. |
| `tasks/` | `services/`, `agents/`, `core/`, `shared/jobs` | `ui/`, `state/`, `io/` | Trigger.dev tasks; idempotent, retried, instrumented. |

**The "no server-state-in-Zustand" rule is the highest-leverage single change.**
It directly dissolves `useWorldStore`'s `projects/tiles/assets/pendingGenerations` and
the `cache:'no-store'` / manual snake_case mapping hacks
(`useWorldStore.ts:285-291`, `:312-325`).

---

## 6. Data layer (Supabase + Drizzle + TanStack)

### 6.1 One write path
```
Browser ──fetch──▶ /api/<module>/* ──requireAuth()──▶ Service ──Drizzle──▶ Postgres(Supabase)
   ▲                                                                          │
   └──────────────── TanStack Query cache (invalidate on mutation) ◀──────────┘
```
- **No `getSupabaseClient()` writes in the browser.** (Today WBT does `supabase.from('projects').insert(...)` client-side — `useWorldStore.ts:332`. That must move into a `TileService`/`ProjectService` behind an API route.)
- **Supabase client roles:** `service-role` only on the server; browser uses the `anon` key strictly for Auth + (optionally) read-only Realtime channels. RLS stays on as defense-in-depth.

### 6.2 One schema source
- **Drizzle (`src/db/schema.ts`) is the source of truth** for table shape and TS types.
- The storyteller-local `src/domains/storyteller/db/schema.ts` is folded into the shared schema *or* explicitly namespaced and re-exported (it must not diverge).
- Field names are **camelCase** in Drizzle and in all DTOs; the snake_case→camelCase boundary is the Drizzle column map **only**. Manual remapping in stores/components (e.g. `master_prompt: projectData.masterPrompt || projectData.master_prompt`) is deleted.
- Migration ownership documented per `quality-improvement-spec.md` Q-9 (Drizzle generates; Supabase SQL is for RLS/policies/functions Drizzle can't express).

### 6.3 Server state pattern (generalize `useEntities`)
Every read is a TanStack hook with a key from the module's key factory:
```ts
// io/world.keys.ts
export const worldKeys = {
  all: ['world'] as const,
  tiles: (projectId: string) => [...worldKeys.all, 'tiles', projectId] as const,
  assets: (projectId: string) => [...worldKeys.all, 'assets', projectId] as const,
}
// state/queries/useTiles.ts
export const useTiles = (projectId: string) =>
  useQuery({ queryKey: worldKeys.tiles(projectId), queryFn: () => tilesApi.list(projectId) })
```
Mutations call `io/` then `queryClient.invalidateQueries({ queryKey: worldKeys.tiles(id) })`.
This kills stale-data bugs without `cache:'no-store'`.

---

## 7. Async / Jobs (the unified long-running-work model)

**Problem today:** three incompatible async patterns (SSE god-route; client polling +
`localStorage` + `window` events; wait-token HTTP). **Target:** one model.

```
                         ┌─────────────── Trigger.dev ───────────────┐
UI ──useJob(taskId,…)──▶ │ schemaTask  →  metadata.set(progress,stage) │
   ◀── Realtime stream ──│ wait.forToken (HITL)  →  return Result      │
   (status/progress/     └────────────────────────────────────────────┘
    output, typed)                         │
        │                                  ▼
   useGlobalStatusStore (one global op tray, already exists)
```

### Canonical rules
- **Trigger a task** from an API route (`tasks.trigger<typeof t>(…)` with a Zod-validated payload) and return `{ runId, accessToken }` (a scoped Realtime public token).
- **Observe** with `@trigger.dev/react-hooks` `useRealtimeRun` wrapped in a shared **`useJob`** hook (`shared/jobs/useJob.ts`). It exposes `{ status, progress, stage, output, error }` and registers/clears an entry in `useGlobalStatusStore` automatically.
- **Progress** is reported only via `metadata.set('progress'|'stage', …)` inside the task (WBT already does this — `generate-tile.ts:63-66`). Delete the polling loop in `TileGenerationService`.
- **HITL** (variant selection / action approval) uses `wait.forToken` + `useWaitToken`, not `window.dispatchEvent('generation-variant-selection-ready')` + a `/api/complete-token` poke.
- **Recovery** is free: re-subscribe to the `runId` (persist `runId` in TanStack/query or URL), not a hand-rolled `localStorage` scan.
- **Task hygiene:** every task declares `queue`/`concurrencyLimit`, `retry`, `machine`, and an `idempotencyKey` derived from its natural key (e.g. `tile-${projectId}-${x}-${y}`).

> **Streaming chat** is the one exception that stays SSE (it's a published wire
> contract — orchestration-rfc I1). It is modeled as the `toSSE` *surface adapter* of
> the agent kernel (§9), not a bespoke route.

---

## 8. Background tasks & queues (`tasks/` + `src/trigger`)

- Tasks are **authored inside the owning module** (`domains/<m>/tasks/<verb>.task.ts`) and **re-exported** from `src/trigger/index.ts` so Trigger's build can discover them. `src/trigger/` becomes a thin registry, not a junk drawer of 21 mixed-domain files.
- Every task is a **`schemaTask`** with a Zod payload (kills `payload: {…; neighbors?: any}` — `generate-tile.ts:34`).
- **Queues are explicit and named per resource**, with concurrency that protects the external provider:
  - `queue: { name: 'image-gen', concurrencyLimit: 5 }`, `queue: { name: 'mesh-3d', concurrencyLimit: 2 }`, `queue: { name: 'llm-council', concurrencyLimit: 10 }`.
  - Per-user fairness via `queue: { name: \`user-${userId}\` }` overrides on trigger.
- **Outputs are typed `Result`-shaped** so the `useJob` consumer never inspects `any`.
- **Env**: tasks receive only an explicit allowlist (`quality-improvement-spec.md` Q-5), not the whole `.env.local`.
- Shared task helpers (`providers/`, `utils/llm-logger.ts`) move to `shared/jobs/` or stay in `src/trigger/_shared` and are imported by module tasks.

---

## 9. AI subsystem (Mastra-native) — the heart of the redesign

The AI layer is **one orchestration kernel** over **six Mastra-native subsystems**.
The kernel owns lifecycle/routing; each subsystem is used *as Mastra provides it*,
with hand-rolled parallels (§1.1) deleted.

```
                         shared/agent-kernel
   ┌───────────────────────────────────────────────────────────────┐
   │  AgentExecutionKernel (one lifecycle: create · run · stream)    │
   │   ├─ RuntimeContext  (per-request DI: projectId/userId/model)   │
   │   ├─ Strategy:  Direct | Council(Workflow) | Plan               │
   │   └─ Surface:   toSSE() | toJSON() | toGraphState()             │
   └───────┬───────────┬───────────┬──────────┬──────────┬──────────┘
           ▼           ▼           ▼          ▼          ▼
      Workflows     Memory     AI Tracing   Skills    Scorers   Processors
   (suspend/resume) (working+  (Observability (Workspace (createScorer (input/output
                     semantic   +Langfuse      skills)    live+batch)   guardrails)
                     recall)     exporter)
```

### 9.1 Orchestration kernel (generalizing the RFC)
- **One `createAgent` + `run`/`stream` lifecycle** (`shared/agent-kernel`) replaces the ~8 `createStorytellerAgent` sites; reusable by `loop-creator`/`interior-designer` (kills the duplicated `new Agent({…}) + withSpan + record` boilerplate).
- Hexagonal **ports** make the core unit-testable offline (fake `AgentPort`/`ContextPort`, fixed `ClockPort`) — orchestration-rfc §5.
- **One `OrchestrationEvent` union**; surfaces are pure transforms (`toSSE` for chat, `toJSON` for REST/eval, `toGraphState` for MCP).
- **One model registry** (`shared/agent-kernel/models.ts`) unifying `agent-core/models.ts` + `AGENT_MODEL_MATRIX` + per-agent overrides.
- **`RuntimeContext` replaces arg-threading + AsyncLocalStorage.** Per-request deps (`projectId`, `userId`, `episodeId`, model overrides, `eventBus`) are injected via Mastra `RuntimeContext` and read inside tools/steps — deleting the bespoke `WorkflowContext` ALS plumbing (`StoryWorkflow.ts:24-28`).

### 9.2 Workflows (the council, done natively)
The multi-agent council is a **typed Mastra Workflow**, not a hand-traced pipeline.
- **Typed steps.** Every `createStep` gets real `inputSchema`/`outputSchema` (no `z.any()` — `StoryWorkflow.ts:112,143,168`). Data flows through `getStepResult` with inferred types.
- **Native control flow.** The hand-rolled refinement loop becomes `.branch()` on the creative-decision gate + `.dountil()` (refine until `critiqueScore ≥ threshold` or max passes). The `// @ts-expect-error` tool-mutation "nuclear option" (`:271-275`) is replaced by passing a scoped tool set / `toolChoice` through `RuntimeContext`.
- **HITL via `suspend()/resume()`.** Action approval (today done outside the workflow in the SSE route + `ActionApprovalModal`) becomes a workflow `suspend()` with a `resumeSchema`; the snapshot persists in Mastra storage and survives restarts. The SSE surface uses **`closeOnSuspend` + `resumeStream`** to close the stream on suspend and resume it when the user approves.
- **Streaming, not an event bus.** UI step events come from the workflow's `run.stream().fullStream` (Mastra-native step/agent/tool chunks), not the hand-rolled `WORKFLOW_EVENTS` emitter. The SSE adapter maps those chunks to `OrchestrationEvent`s.

### 9.3 Memory (working + semantic recall, resource-scoped)
- **Delete `AgentMemory`** (`agent-core/memory/agent-memory.ts`) — it stubs `getWorkingMemory()→null` and re-implements vector RAG that Mastra Memory does natively.
- Configure Mastra `Memory` with:
  - **`workingMemory`** (schema/template) — persistent structured state (e.g. active episode, user style preferences, locked bible facts), **resource-scoped** (`resource = projectId`) so it survives across threads/episodes.
  - **`semanticRecall`** — RAG over past messages using **pgvector + Voyage embeddings** (already in the stack), replacing the bespoke embed/upsert loop.
  - **thread/resource keys** standardized: `resource = projectId`, `thread = episodeId || project-<id>` (orchestration-rfc I9 — promote from invariant to config).
- `lastMessages` stays a tuning knob, but recall + working memory carry long-term context instead of a flat 10-message window.

### 9.4 Observability / AI Tracing (one tracer)
- **Mastra `Observability` + `LangfuseExporter` is the only tracer.** It already auto-emits agent/LLM/tool/workflow-step spans with correct parentage (`MastraInstance.ts:89-96`).
- **Delete the hand-rolled span tree** in `agent-core/observability.ts` (`withSpan`, `createStepSpan`, `recordToolCall`, `recordAgentGeneration`). Steps/tools no longer open manual spans — Mastra nests them.
- `shared/observability` keeps only: the `Observability` config factory, **score emission** (preferably via scorers, §9.6), and the sanitize/redact helpers (`sanitizeForLangfuse`, sensitive-field redaction) which are genuinely useful and framework-agnostic.
- Net effect: orchestration-rfc **I8 disappears** — there is no second tree to keep in sync.

### 9.5 Skills (one loader: Mastra Workspace)
- **One mechanism:** Mastra `Workspace({ skills })`; agents read via `workspace.skills`. Keep the SKILL.md + `references/` authoring format under `domains/<m>/prompts/skills/`.
- **Delete `agent-core/skills/skill-loader.ts`** (the parallel fs reader / `buildSkillsPrompt`). Skill discovery, listing, and injection go through the workspace.
- Skill **eval cases** (`eval-schema.ts`) become scorer datasets (§9.6), not a separate bespoke harness.

### 9.6 Scorers & Evals (continuous, native)
- **Port every judge to `createScorer`** (`type: 'agent'`, 4-step pipeline: `preprocess → analyze → generateScore → generateReason`): the Mazur creative-director dimensions (`mazur-judge.ts`), consistency, hallucination/RAG, safety/toxicity, routing.
- **Attach as live scorers** to the relevant agent/workflow step → they run **async after each response**, store automatically, and surface in Langfuse + the Scorers tab. No blocking the user.
- **Reuse the same definitions offline.** `src/evaluation/**` datasets/experiments call the *same* scorers in batch (CI eval tier) — one definition, two run modes (live + batch). The bespoke `Metric`/`MastraAgentJudge`-style classes and ad-hoc Langfuse `score()` calls are removed.
- `prepareRun`/`filterRun` trims agent message history so scorers stay cheap and focused.

### 9.7 Processors (guardrails as code, not prose)
- Move mechanical guardrails out of the 320-line system prompt into Mastra **input/output processors**:
  - **output processors:** entity-link density check, anti-slop blocklist, structured-output (Zod) validation, PII redaction.
  - **input processors:** prompt-size budgeting, injection screening.
- Processors are testable, reusable across modules, and keep the *creative* instructions in the prompt while the *rules* become deterministic gates. (Creative-quality judgment stays LLM-based via scorers, per quality-improvement-spec's "de-regex creative judgment".)

> Mastra stays the engine end-to-end. The redesign is **subtractive**: it removes the
> hand-rolled halves, leaving one Mastra-native implementation per concern behind the
> kernel's ports.

---

## 10. API & Server Actions conventions

- **Route = thin glue.** `requireAuth()` → Zod-parse body (`*.dto.ts`) → call a `Service`/kernel → map `Result` to HTTP. No business logic, no Drizzle queries inline beyond trivial reads, no 900-LOC handlers.
- **Folder shape mirrors modules:** `app/api/<module>/<resource>/route.ts`. (Today storyteller routes are under `api/storyteller/*`; WBT tasks are scattered at `api/trigger-tile`, `api/save-image`, `api/complete-token` — these consolidate under `api/world/*`.)
- **One response envelope:** success returns the resource (camelCase, DTO-validated); errors return `{ error: { code, message } }` mapped from `AppError` by one helper in `shared/errors`. No ad-hoc `{ error: 'string' }` vs throw.
- **One auth gate:** `requireAuth()` from `shared/auth` (post Q-8 single `getUserSession`). No per-route bypass headers in product paths.
- **OpenAPI** annotations (already used on storyteller routes) are the documentation contract; generated via `docs:generate`.

---

## 11. UI & design system

- **Primitives** come from `src/components/ui` (Radix + `class-variance-authority` + `tailwind-merge`). Modules compose primitives; they don't re-implement dialogs/tooltips.
- **Module components** live in `domains/<m>/ui/<Component>/` (folder-per-component + colocated test + local barrel). Split god components (`ActionApprovalModal` ~978 LOC, `CharacterWeb` ~922) per quality-improvement-spec ST-10; target < ~400 LOC.
- **Client vs server components:** default to Server Components in `app/`; mark interactive leaves `'use client'`. Data enters via TanStack hooks, never via a Zustand server cache.
- **State in components:** read server data from `state/queries/*`; read UI state from the module's `use<Module>UiStore`; trigger long work via `useJob`. No `fetch` in components.
- **React 19 + React Compiler** is on (`babel-plugin-react-compiler`); avoid manual `useMemo`/`useCallback` churn and premature memoization.

---

## 12. Cross-cutting concerns (owned once, in `shared/`)

| Concern | Single home | Replaces |
|---------|-------------|----------|
| Auth/session | `shared/auth` | `lib/auth` + `lib/api-utils` dupes (Q-8) |
| Errors | `shared/errors` (`AppError`, `toHttp`, `toSSE`, `useErrorStore`) | swallowed `catch {}`, `{ error: string }`, log-and-return-`''` (ST-9) |
| Jobs/status | `shared/jobs` (`useJob`, `JobType`/`JobStatus`, Realtime client) + `useGlobalStatusStore` | per-service polling, `window` events, `localStorage` recovery |
| Data | `shared/data` (`queryClient`, `apiFetch`, `Result<T>`, key-factory helper) | bespoke `fetch` + manual mapping |
| Observability | Mastra `Observability` + `LangfuseExporter` (config in `shared/observability`) | hand-rolled `withSpan`/`recordToolCall` span tree |
| Agent kernel | `shared/agent-kernel` (lifecycle, RuntimeContext, strategy, surface) | ~8 `createStorytellerAgent`, 3 result shapes |
| Memory | Mastra `Memory` (working + semanticRecall, resource-scoped) | `AgentMemory` subclass + `lastMessages:10` |
| Skills | Mastra `Workspace` skills | `agent-core/skills/skill-loader.ts` |
| Evals/Scorers | `createScorer` (live + batch) in `shared/agent-kernel/scorers` | `src/evaluation` bespoke judges + ad-hoc Langfuse scores |
| Guardrails | Mastra input/output **processors** | prompt-baked + route regex rules |
| DB | `src/db` (Drizzle schema + client) | dual schema files |

---

## 13. Testing & quality gates (assumed, see quality-improvement-spec)

- **`core/` and adapters** are unit-tested offline (no DB/LLM) — the ≥90% offline-provable target (orchestration-rfc §11).
- **Services/tasks** get integration tests behind a CI tier (Q-6).
- **Module e2e** (one smoke per module) gates behavior-preserving refactors.
- **Gates that must stay green:** `npm run typecheck`, `npm run lint:ratchet`, `npx knip`, `vitest run`. `any` at boundaries is banned (ST-8); unused vars ratcheted to error (Q-7).
- **Dependency-rule lint** (§3) is added so the architecture can't silently rot.

---

## 14. Module maturity scorecard (how we measure convergence)

A module is "on-architecture" when all are true:

- [ ] Single `index.ts` public barrel; no external deep imports (lint-clean).
- [ ] Server state in TanStack Query; Zustand holds only UI state.
- [ ] Zero browser→Supabase writes; all writes via API route + Service + Drizzle.
- [ ] All long work via Trigger task + `useJob`/Realtime; no bespoke polling or `window` events.
- [ ] Tasks are co-located `schemaTask`s with queue/retry/idempotency.
- [ ] `core/` is pure and unit-tested offline.
- [ ] AI work (if any) goes through `shared/agent-kernel`; one result shape.
- [ ] AI modules use **one** implementation per Mastra subsystem (no hand-rolled parallel tracer/memory/skill-loader/eval-harness); multi-agent flows are typed Workflows with `suspend/resume` HITL; judges are live `createScorer`s.
- [ ] Folder-per-unit + barrels; no file > ~400 LOC for components / ~300 for routes.
- [ ] DTOs are Zod, shared between `io/` and routes; no `any` at boundaries.

| Module | Barrel | TanStack | No client writes | Unified jobs | Pure core | Kernel | Mastra-native* |
|--------|:------:|:--------:|:----------------:|:------------:|:---------:|:------:|:--------------:|
| storyteller | ☐ | ◑ | ✅ | ☐ (SSE bespoke) | ◑ | ◑ | ☐ (dual stacks) |
| world-building-toolkit | ☐ | ☐ | ☐ | ☐ | ☐ | n/a | n/a |
| 3d-asset-exporter | ☐ | ☐ | ☐ | ☐ | ☐ | n/a | n/a |
| chat | ☐ | ☐ | n/a | ☐ | ◑ | ☐ | ☐ |

(✅ done · ◑ partial · ☐ not yet) — the SPEC turns every cell green.
*Mastra-native = single implementation per subsystem: Workflows (typed + suspend/resume),
Memory (working + semantic recall), AI Tracing only, Workspace skills, live `createScorer`s, processors.

---

## 15. Explicit non-goals

- Replacing Mastra/Supabase/TanStack/Trigger/Radix/Vercel.
- A microservice split — this is a modular **monolith** on Vercel; modules are code boundaries, not deploy boundaries.
- A big-bang rewrite. Convergence is incremental and gated (SPEC).
- New product features. This is structure only.
```
