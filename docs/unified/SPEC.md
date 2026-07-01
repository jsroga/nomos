# Unified Architecture — Implementation Spec

> **Status:** Proposed · **Companion to:** `docs/unified/ARCHITECTURE.md` (the target).
> This is the *how*: a phased, gated, behavior-preserving migration that converges
> every module onto the blueprint, starting with `storyteller` and
> `world-building-toolkit`.
>
> Written spec-first: each work item has **Problem → Evidence (file) → Spec →
> Acceptance → Verification**. Implement against the spec, not the prose.
>
> Reuses, does not duplicate:
> - `docs/orchestration-rfc.md` — the storyteller orchestration cutover (P0–P5). This
>   spec **promotes** its output to `shared/agent-kernel` (item **K-***).
> - `docs/quality-improvement-spec.md` — the quality gates (`Q-*`, `ST-*`). This spec
>   **assumes** them as prerequisites and references rather than restating.

---

## 0. How to read this spec

- Work items are grouped by **stream**: `F-*` foundation, `D-*` data layer, `J-*` jobs,
  `K-*` kernel, `A-*` Mastra subsystems, `M-*` per-module migration, `G-*` governance.
- Each item is independently shippable and **behavior-preserving** unless marked
  `BREAKING`. Pick one, satisfy Acceptance, verify, ship.
- **Gate before every PR:** `npm run typecheck` · `npm run lint:ratchet` ·
  `npx knip` · `vitest run` all green and not regressed.
- **Order:** Foundation (F) → Data (D) + Jobs (J) in parallel → Kernel (K) →
  per-module (M) → Governance (G). Do not start M-* for a module before its
  D/J prerequisites land.

---

## 1. Guiding constraints

1. **No big-bang.** Old paths stay until the new one is proven equivalent (branch-by-abstraction + flags), per orchestration-rfc §7.
2. **No new product behavior.** Pure structure; e2e smoke must stay green.
3. **No scope creep.** Adjacent debt → file a new item, don't grow the PR.
4. **Server state out of Zustand is the spine.** Most items orbit this single change.
5. **Stack is fixed:** Mastra, Radix, Supabase, TanStack, Trigger, Vercel.

---

## 2. Foundation stream (F) — do first

### F-1 — Create `shared/` and the dependency-rule lint `P0`
**Problem:** No enforced module boundaries; cross-module deep imports rot the design.
**Evidence:** consumers import `@/domains/world-building-toolkit/store/useWorldStore`, `@/domains/storyteller/db/schema` directly; no module has a root `index.ts`.
**Spec:**
- Create `src/shared/{auth,errors,jobs,data,observability,agent-kernel}` (empty stubs that re-export current homes initially — `shared/auth` → `lib/auth`, etc.). No code moves yet; this is the *target import path*.
- Add an ESLint rule (`no-restricted-imports` / `eslint-plugin-boundaries`) encoding ARCHITECTURE §3:
  - `app/**` may import `domains/*/index` and `shared/*` only.
  - `domains/<m>/**` may not import `domains/<other>/**` (only its `index`).
  - `core/**` may not import `react`, `@/db`, `@/shared/data`, `next/*`.
  - `shared/**` may not import `domains/**`.
- Rule starts at **`warn`** with a ratchet (like `lint:ratchet`); flips to `error` per-scope as modules migrate.
**Acceptance:**
- [ ] `src/shared/*` exists; old paths still work via re-export.
- [ ] Boundary rule present; baseline count recorded; CI fails on regression.
**Verification:** `npm run lint:ratchet`; add a deliberate cross-module import → CI warns/red.

### F-2 — Module public barrels (`index.ts`) `P0`
**Problem:** No module exposes a curated surface; everything is reachable.
**Evidence:** `find domains/*/index.ts` → none.
**Spec:** add `src/domains/<m>/index.ts` for `storyteller`, `world-building-toolkit`, `3d-asset-exporter`, `chat` that re-exports their currently-consumed symbols (grep existing external imports to build the surface). Update external importers to use the barrel. Internal imports unchanged.
**Acceptance:**
- [ ] Each pilot module has `index.ts`; all *external* importers go through it.
- [ ] Boundary lint (F-1) for "no deep external import" is `error` for migrated modules.
**Verification:** `rg "@/domains/<m>/(?!index)" src/app src/components` returns nothing for migrated modules; `npm run typecheck`.

### F-3 — Adopt the folder-per-unit convention repo-wide `P1`
**Problem:** storyteller uses `PascalCase/` folder-per-unit; WBT/3d/chat are flat.
**Evidence:** ARCHITECTURE §1 table.
**Spec:** codemod each non-conforming module to the §4 skeleton (`ui/ state/ io/ core/ services/ tasks/`). Move files, add local barrels, rewrite import specifiers (alias-based codemod like the one in quality-improvement-spec "Storyteller modularization"). Behavior-preserving.
**Acceptance:**
- [ ] Each pilot module matches the §4 skeleton folder set.
- [ ] `tsc` 0 new errors, `knip` clean, tests green.
**Verification:** `npm run typecheck && npx knip && vitest run`.

---

## 3. Data-layer stream (D)

### D-1 — Single Drizzle schema source `P1`
**Problem:** Two Drizzle schemas (`src/db/schema.ts`, `src/domains/storyteller/db/schema.ts`) + Supabase `database.types.ts` + 34 SQL migrations → drift.
**Evidence:** `find src -name schema.ts -path '*db*'` → 2 files; `supabase/migrations/` = 34.
**Spec:** Designate `src/db/schema.ts` as source of truth. Fold the storyteller schema in (or namespace + re-export so there is one importable schema). Document migration ownership in `docs/ARCHITECTURE.md` (Drizzle generates table DDL; Supabase SQL owns RLS/policies/functions) — satisfies quality-improvement-spec **Q-9**.
**Acceptance:**
- [ ] One schema import path; storyteller `db/schema.ts` re-exports or is removed.
- [ ] `npm run db:generate` produces no unexpected diff.
- [ ] Migrations ownership section added.
**Verification:** `npm run db:generate`; grep for the old schema path.

### D-2 — `shared/data`: query client, key factory, typed fetcher, `Result` `P1`
**Problem:** TanStack installed but used in 1 hook; bespoke `fetch` + manual mapping elsewhere.
**Evidence:** `rg -l '@tanstack/react-query'` → `hooks/useEntity.ts`, `lib/react-query.tsx` only.
**Spec:** create `shared/data` with `queryClient`, `apiFetch` (Zod-validating wrapper), a `createKeys` helper, and `Result<T> = {ok:true,value}|{ok:false,error}`. Generalize the `useEntities` pattern (`hooks/useEntity.ts`) as the reference.
**Acceptance:**
- [ ] `shared/data` exports the four primitives with tests.
- [ ] `useEntities` refactored onto the shared primitives (no behavior change).
**Verification:** `vitest run shared/data`.

### D-3 — `io/` + DTOs per module `P1`
**Problem:** No typed client→server edge; snake/camel mapping done ad hoc in stores/components.
**Evidence:** `useWorldStore.ts:285-291`, `:312-325` (manual `master_prompt` mapping, direct supabase).
**Spec:** per module, add `io/<m>.api.ts` (typed fetchers), `io/<m>.keys.ts` (key factory), `io/<m>.dto.ts` (Zod request/response, **camelCase**). API routes import the same DTOs.
**Acceptance:**
- [ ] Each migrated module has `io/` with Zod DTOs reused by its routes.
- [ ] No manual snake/camel remapping outside the Drizzle column map.
**Verification:** `npm run typecheck`; grep for `_filename`/`master_prompt` remapping in `state/`/`ui/` → none.

### D-4 — Server state → TanStack; Zustand → UI-only `P1` `BREAKING(internal)`
**Problem:** 865-LOC god store mixes server cache + UI + job orchestration.
**Evidence:** `world-building-toolkit/store/useWorldStore.ts` (`projects`, `tiles`, `assets`, `pendingGenerations`, `jobs` + UI flags + direct supabase + polling glue).
**Spec (per module):**
1. Extract server data (`tiles/projects/assets`) into `state/queries/*` TanStack hooks calling `io/`.
2. Move all writes (`createProject/addTile/acceptGeneration/...`) into mutation hooks → API route → `Service` → Drizzle; invalidate keys.
3. Shrink the Zustand store to **UI-only** (`useWorldUiStore`: viewport, selection, modes, brush, debug flags).
4. Delete `cache:'no-store'` hacks (server cache now invalidation-driven).
**Acceptance:**
- [ ] No server entity arrays/records in any Zustand store.
- [ ] No `getSupabaseClient()` write in browser code (grep clean).
- [ ] UI store < ~200 LOC.
- [ ] Module e2e smoke green (behavior preserved).
**Verification:** `rg "getSupabaseClient\(\)" src/domains/<m>` → reads gone too (moved to services); `vitest`/e2e smoke.

### D-5 — Move browser Supabase writes behind API + Service `P0` (security)
**Problem:** Browser holds privileged data path; inconsistent with storyteller.
**Evidence:** `useWorldStore.ts:332` (`supabase.from('projects').insert`), `:403` (`tiles.upsert`), `:760`/`:827` (accept flows).
**Spec:** create server `*Service` classes (`TileService`, `ProjectService`, `AssetService`) with `import 'server-only'`, exposed via `app/api/world/*` routes guarded by `requireAuth()`. Browser calls `io/` only.
**Acceptance:**
- [ ] Zero browser→Supabase writes for WBT/3d/interior.
- [ ] Routes use `requireAuth()` + DTO validation.
**Verification:** grep; e2e smoke; manual auth check.

---

## 4. Jobs stream (J)

### J-1 — `shared/jobs`: `useJob` on Trigger Realtime `P1`
**Problem:** 3 async patterns; hand-rolled polling + `localStorage` + `window` events.
**Evidence:** `TileGenerationService.startPolling` (adaptive polling), `resumePendingGenerations` (`localStorage` scan), `window.dispatchEvent('generation-review-ready'|'generation-variant-selection-ready')`.
**Spec:** build `shared/jobs`:
- `useJob(taskId, runId, accessToken, { onComplete })` wrapping `@trigger.dev/react-hooks` `useRealtimeRun`; exposes `{ status, progress, stage, output, error }`; auto-registers/clears `useGlobalStatusStore`.
- Server helper `triggerJob(task, payload)` → returns `{ runId, accessToken }` (scoped public token).
- `JobType`/`JobStatus` move here (from `types/enums`).
**Acceptance:**
- [ ] `useJob` + `triggerJob` shipped with tests (mock Realtime).
- [ ] `useGlobalStatusStore` integration automatic.
**Verification:** `vitest run shared/jobs`.

### J-2 — Co-locate tasks as `schemaTask`; `src/trigger` becomes a registry `P1`
**Problem:** 21 mixed-domain flat task files; untyped payloads.
**Evidence:** `src/trigger/*` (tile, upscale, fidelity, poster, portrait, moodboard, 3d, retexture…); `generate-tile.ts:34` (`neighbors?: any`).
**Spec:** move each task to `domains/<owner>/tasks/<verb>.task.ts` as a **`schemaTask`** with Zod payload + typed `Result` output; add `queue`/`concurrencyLimit`/`retry`/`machine`/`idempotencyKey`. `src/trigger/index.ts` re-exports all module tasks for Trigger build discovery. Shared helpers → `src/trigger/_shared` or `shared/jobs`.
**Acceptance:**
- [ ] Every task is a `schemaTask`; no `any` in payloads.
- [ ] Tasks live under their owning module; `src/trigger` only re-exports.
- [ ] Each task declares a named queue + idempotency key.
**Verification:** `npm run typecheck`; `npm run trigger:dev` discovers all tasks.

### J-3 — Replace WBT polling/HITL with Realtime + wait tokens `P1` `BREAKING(internal)`
**Problem:** Bespoke polling + CustomEvents drive tile-review/variant dialogs.
**Evidence:** `TileGenerationService.ts` entirely; `/api/trigger-tile/status`, `/api/complete-token`.
**Spec:** UI uses `useJob` for progress; review/variant gating uses `wait.forToken` in the task + `useWaitToken` in UI. Delete `startPolling`, `scheduleNextPoll`, `resumePendingGenerations`, the `window.dispatchEvent` calls, and the status route once parity holds.
**Acceptance:**
- [ ] No `setTimeout` polling, no `window.dispatchEvent`, no `localStorage` run recovery in WBT.
- [ ] Tile gen/upscale/fidelity/repaint flows work via Realtime (e2e smoke).
**Verification:** grep clean; manual smoke of generate→review→accept.

---

## 5. Kernel stream (K) — generalize the orchestration RFC

> Prerequisite: execute `docs/orchestration-rfc.md` P0–P4 for storyteller first. K-*
> **promotes** the result into `shared/agent-kernel` for reuse.

### K-1 — Promote orchestration core to `shared/agent-kernel` `P2`
**Problem:** ~8 `createStorytellerAgent` sites, 3 result shapes, no reuse across AI modules.
**Evidence:** orchestration-rfc §1 evidence table; quality-improvement-spec next-steps #9/#10.
**Spec:** after orchestration-rfc P4 collapses storyteller to one kernel, move `AgentExecutionKernel`, `OrchestrationEvent`, ports, strategies, and surface adapters (`toSSE/toJSON/toGraphState`) into `shared/agent-kernel`. storyteller imports from there.
**Acceptance:**
- [ ] `createStorytellerAgent` prod call sites = 1 (via kernel).
- [ ] One `OrchestrationEvent` union + adapters in `shared/agent-kernel`.
**Verification:** orchestration-rfc §11 metrics; suites green.

### K-2 — Unify model registry `P2`
**Problem:** 3 model-config sources.
**Evidence:** `agent-core/models.ts`, `agents/v2/model-config.ts` (`AGENT_MODEL_MATRIX`), premise-architect `MODELS.generation.primary` (quality-improvement-spec next-steps #10).
**Spec:** one `shared/agent-kernel/models.ts` registry + `AGENT_RUNTIME_DEFAULTS`; verify Mastra sampling knob before wiring temperature/topP (the noted blocker).
**Acceptance:**
- [ ] Single model registry; others re-export or removed.
**Verification:** agent e2e; `npx knip`.

### K-3 — Adopt kernel in a second AI module (`loop-creator` or `chat`) `P3`
**Spec:** prove reuse by migrating one more AI module's agent boilerplate onto `shared/agent-kernel`.
**Acceptance:** [ ] second module uses the kernel; duplicated `new Agent + withSpan + record` removed.
**Verification:** that module's tests/eval green.

---

## 5b. Mastra subsystem consolidation stream (A)

> Goal: exactly **one** implementation per Mastra concern (ARCHITECTURE §9). Each item
> **deletes a hand-rolled parallel** after the native path is proven equivalent. These
> are storyteller-first, then reused by other AI modules via the kernel. All are
> behavior-preserving and gated by the storyteller agent e2e + eval suites.

### A-1 — Single tracer: Mastra AI Tracing, delete the manual span tree `P1`
**Problem:** Two observability stacks emit two Langfuse trees; nesting is kept in sync by hand (orchestration-rfc I8 exists *because* of this).
**Evidence:** `MastraInstance.ts:89-96` (native `Observability`+`LangfuseExporter`) vs `agent-core/observability.ts` (`withSpan`/`createStepSpan`/`recordToolCall`/`recordAgentGeneration`); `StoryWorkflow.ts` manual `createStepSpan` per step.
**Spec:**
- Confirm Mastra emits agent/LLM/tool/workflow-step spans to Langfuse with correct parentage (it is already wired). Add the storyteller `serviceName`/exporter config to `shared/observability`.
- Remove manual span creation from agents/tools/workflow steps. Keep only: the `Observability` config factory, the sanitize/redact helpers (`sanitizeForLangfuse`, sensitive-field redaction), and a thin score emitter (interim, until A-5).
- Delete `withSpan`/`createStepSpan`/`recordToolCall`/`recordAgentGeneration`/`recordAgentThinking` once no caller remains.
**Acceptance:**
- [ ] One Langfuse trace tree per request (verified in Langfuse UI for a storyteller run).
- [ ] No manual `langfuse.span(...)` in agents/tools/workflow steps.
- [ ] orchestration-rfc **I8** retired (documented as obsolete) — nesting is framework-owned.
**Verification:** storyteller agent e2e; inspect a trace in Langfuse for single-tree nesting.

### A-2 — Typed Workflows + native control flow + `RuntimeContext` `P1`
**Problem:** Council workflow steps are untyped, manually traced, and mutate agent internals; refinement loop is hand-rolled.
**Evidence:** `StoryWorkflow.ts` (`inputSchema: z.any()` at `:112,143,168`; `// @ts-expect-error` tool mutation `:271-275`; manual refinement in `synthesisStep`).
**Spec:**
- Give every `createStep` real `inputSchema`/`outputSchema`; pass data via typed `getStepResult`.
- Replace the manual refinement with `.branch()` on the creative-decision gate + `.dountil()` (refine until `critiqueScore ≥ threshold` or `MAX_PASSES`).
- Replace `agent.agent.tools` mutation with a scoped tool set / `toolChoice` injected via **`RuntimeContext`**; remove the `WorkflowContext` AsyncLocalStorage event bus (events now come from workflow streaming, A-3).
**Acceptance:**
- [ ] No `z.any()` step schema; no `@ts-expect-error` in the workflow.
- [ ] Refinement loop expressed with native `.branch`/`.dountil`.
- [ ] `RuntimeContext` carries `projectId/userId/episodeId/model/toolPolicy`.
**Verification:** `npm run typecheck`; storyteller council e2e; eval parity (Mazur scores not worse).

### A-3 — HITL via `suspend()/resume()` + `resumeStream` `P2`
**Problem:** Action approval happens outside the workflow (SSE route + `ActionApprovalModal`), so the workflow can't model the pause.
**Evidence:** orchestration-rfc I3/I6 (actions buffered after final message); approval flow in stream route.
**Spec:**
- Model approval as a workflow `suspend()` with a `resumeSchema`; snapshot persists in Mastra storage.
- SSE surface uses `closeOnSuspend: true`; the kernel's `toSSE` adapter emits the pending action, closes, and `resumeStream({ resumeData })` continues on approval.
- Keep the published SSE wire contract (orchestration-rfc I1–I4) — prove byte-parity on fixtures first.
**Acceptance:**
- [ ] Approval round-trip runs through `suspend/resume`; survives a server restart (snapshot reload).
- [ ] SSE frames unchanged (snapshot parity vs current).
**Verification:** orchestration-rfc characterization fixtures; manual approve/reject smoke.

### A-4 — Native Memory: working memory + semantic recall; delete `AgentMemory` `P2`
**Problem:** `lastMessages:10` only; `AgentMemory` stubs working memory and re-implements vector RAG.
**Evidence:** `StorytellerAgent.ts:114-119`; `agent-core/memory/agent-memory.ts:87-101` (`getWorkingMemory→null`, `updateWorkingMemory` no-op).
**Spec:**
- Configure Mastra `Memory` with `workingMemory` (schema/template: active episode, locked bible facts, user style prefs), **resource-scoped** (`resource = projectId`); and `semanticRecall` backed by **pgvector + Voyage** embeddings.
- Standardize keys: `resource = projectId`, `thread = episodeId || project-<id>` (promote orchestration-rfc I9 to config).
- Delete `AgentMemory`; migrate any consumers to the native memory.
**Acceptance:**
- [ ] Working memory persists across episodes within a project (verified).
- [ ] Semantic recall returns relevant prior messages (verified on a fixture).
- [ ] `agent-core/memory/agent-memory.ts` removed; `knip` clean.
**Verification:** storyteller multi-turn e2e (`storyteller-features.e2e.test.ts`); manual cross-episode recall check.

### A-5 — Judges → live `createScorer`s (one definition, two run modes) `P2`
**Problem:** Evals are bespoke and offline-only; zero `createScorer`; live prod traces aren't scored.
**Evidence:** `rg createScorer src` → 0; `agent-core/judging/mazur-judge.ts`, `src/evaluation/judges/*`, ad-hoc `langfuse.score()`.
**Spec:**
- Port judges (Mazur dimensions, consistency, hallucination/RAG, safety) to `createScorer` (`type:'agent'`, 4-step pipeline) in `shared/agent-kernel/scorers`. Reuse the existing judge *prompts* as the `analyze`/`generateScore` prompt objects.
- Attach as **live scorers** to the storyteller agent + key workflow steps (async, non-blocking; auto-stored, surface in Langfuse/Scorers tab).
- Refactor `src/evaluation/**` experiments to call the **same** scorers in batch (CI eval tier, Q-6). Use `prepareRun`/`filterRun` to trim history.
- Remove the bespoke `Metric`/judge-class scaffolding and ad-hoc score emission once parity holds.
**Acceptance:**
- [ ] ≥1 scorer per dimension defined with `createScorer`; attached live to ≥1 agent.
- [ ] Offline experiments reuse the same scorer definitions (no duplicate judge logic).
- [ ] Scores appear automatically on prod traces.
**Verification:** run a storyteller turn → scores appear in Langfuse; `npm run eval` uses shared scorers.

### A-6 — Guardrails → Mastra processors `P3`
**Problem:** Mechanical rules (entity-link density, anti-slop blocklist, structured-output validation, PII) live in a 320-line prompt + route regex.
**Evidence:** `StorytellerAgent.ts:150-407`.
**Spec:** implement output processors (link-density, anti-slop blocklist, Zod structured-output validation, PII redaction) and input processors (size budget, injection screen). Keep *creative* guidance in the prompt; move *rules* to processors. Creative-quality judgment stays in scorers (A-5).
**Acceptance:**
- [ ] Link-density / anti-slop / structured-output enforced by processors with unit tests.
- [ ] System prompt shrinks; rules no longer duplicated in route code.
**Verification:** processor unit tests; storyteller e2e; eval parity.

### A-7 — One skills mechanism (Workspace), delete the fs loader `P3`
**Problem:** Two skill systems (Mastra Workspace + `skill-loader.ts`).
**Evidence:** `MastraInstance.ts:74-79` + `StorytellerAgent.ts:415-431` vs `agent-core/skills/skill-loader.ts`.
**Spec:** standardize on Mastra `Workspace` skills (keep SKILL.md format under `domains/<m>/prompts/skills/`); delete `skill-loader.ts`/`buildSkillsPrompt`; fold skill eval cases into A-5 scorers.
**Acceptance:**
- [ ] Skills loaded only via workspace; `skill-loader.ts` removed (`knip` clean).
**Verification:** `npm run skills:validate` (or replacement); storyteller e2e shows skills injected.

---

## 6. Per-module migration stream (M)

Each module follows the same recipe (compose F/D/J/K items). Track via the scorecard
in ARCHITECTURE §14.

### M-1 — `storyteller` (reference module) `P1`
- Already closest. Remaining: F-2 barrel, K-1/K-2 kernel, the full **A-stream** (A-1…A-7: single tracer, typed workflows + RuntimeContext, suspend/resume HITL, native memory, live scorers, processors, one skills loader), finish orchestration-rfc (SSE loop extraction = quality-improvement-spec ST-2), ensure `core/` purity, fold `db/schema.ts` (D-1).
- **Acceptance:** scorecard row all ✅ (incl. Mastra-native\*) except where SSE-by-design (documented).

### M-2 — `world-building-toolkit` (heaviest lift) `P1`
- Apply F-3 (skeleton), D-3/D-4/D-5 (TanStack + services + no client writes), J-1/J-2/J-3 (jobs), F-2 (barrel).
- **Acceptance:** `useWorldStore` split into `useWorldUiStore` (<200 LOC) + queries + services; zero client writes; zero polling; scorecard all ✅.
- **Verification:** WBT e2e smoke (generate/upscale/repaint/select/assets) green pre- and post-migration.

### M-3 — `3d-asset-exporter` `P2`
- Currently only `components/`. Scaffold full skeleton; move `src/trigger/{generate-3d-model,text-to-3d,remesh-3d-model,retexture-model,surface-material}.ts` → `tasks/`; add `io/` + TanStack + `useJob`.
- **Acceptance:** scorecard all ✅.

### M-4 — `chat` `P2`
- Has `components/hooks/mentions`. Add `core/` (pure stream-reducer — already partly in `useChatStream`), `io/`, route via `shared/agent-kernel` `toSSE`. Keep SSE wire contract.
- **Acceptance:** scorecard ✅ (SSE documented); `useChatStream` reducer unit-tested.

### M-5+ — `loop-creator`, `interior-designer`, `game-design`, `deduction-puzzle-designer` `P3`
- Apply the recipe; AI ones adopt K-* kernel.

---

## 7. Governance stream (G)

### G-1 — Scaffolding generator `P2`
**Spec:** a `scripts/new-module.mjs` that emits the §4 skeleton (barrel, `ui/state/io/core/services/tasks`, config, sample DTO + query hook + UI store + test). New modules start on-architecture.
**Acceptance:** [ ] running it produces a typechecking, lint-clean empty module.

### G-2 — Promote boundary + `any`-at-boundary lint to `error` `P2`
**Spec:** as modules migrate, flip F-1 boundary rule and the `no-explicit-any`-at-DTO/tool/payload rules to `error` per-scope (ties to quality-improvement-spec ST-8, Q-7).
**Acceptance:** [ ] migrated module dirs are `error`-level clean.

### G-3 — Update `docs/ARCHITECTURE.md` to reference this target `P3`
**Spec:** add a "Target module architecture" pointer + the migrations-ownership section (D-1). Keep the current C4 system doc intact.
**Acceptance:** [ ] cross-links present; no current content removed.

---

## 8. Sequencing

```
Phase 0 (foundation):   F-1, F-2, D-1
Phase 1 (data+jobs):    D-2, D-3, J-1, J-2                 (parallelizable)
Phase 2 (WBT lift):     D-4, D-5, J-3, M-2                 ← biggest structural payoff
Phase 3 (AI consolidation): orchestration-rfc P1–P4, A-1, A-2, A-4, A-5  ← biggest agent-quality payoff
Phase 3b (AI native):   A-3, A-6, A-7, K-1, K-2, M-1
Phase 4 (spread):       M-3, M-4, F-3 (remaining), K-3
Phase 5 (governance):   G-1, G-2, G-3
```
Rationale: lock boundaries first (nothing new rots), build the shared data/jobs rails,
convert the worst structural offender (WBT) to prove the rails, then **collapse the
parallel Mastra stacks** (single tracer → typed workflows → native memory → live
scorers are the highest-leverage AI items and are mostly subtractive), then generalize
the kernel and spread. A-1 (single tracer) is sequenced before A-2/A-3 because typed
workflows and suspend/resume are far easier to verify once there is one trace tree.

---

## 9. Risk register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| WBT behavior regression during store split | Med | High | e2e smoke gate per flow; migrate one slice (tiles) at a time behind the existing store API |
| Realtime token scoping/security mistakes | Med | High | scoped public tokens per run; review in `shared/jobs`; no service-role in browser |
| Trigger task discovery breaks after move | Med | Med | `src/trigger/index.ts` re-export registry; `trigger:dev` smoke in CI |
| Drizzle/Supabase schema merge drift (D-1) | Med | Med | `db:generate` diff gate; ownership doc |
| Boundary lint churn blocks delivery | Low | Med | ratchet at `warn` first, `error` per-migrated-scope |
| Kernel promotion couples modules prematurely | Low | Med | only promote after orchestration-rfc P4 proves the seams |
| Deleting manual tracer loses spans Mastra doesn't emit (A-1) | Med | Med | audit Mastra trace coverage in Langfuse *before* deletion; keep redact/sanitize helpers; bridge gaps with scorers/events |
| Native memory changes agent context → eval drift (A-4) | Med | Med | gate on Mazur/consistency eval parity; roll out behind a memory-config flag |
| Live scorers add latency/cost (A-5) | Low | Med | scorers run async post-response (non-blocking); `prepareRun`/`filterRun` trims history; sample in prod |
| suspend/resume changes SSE bytes (A-3) | Med | High | orchestration-rfc snapshot-parity gate before cutover; `closeOnSuspend`+`resumeStream` only |

---

## 10. Definition of Done (per item)

1. Acceptance checkboxes ticked.
2. Verification command green locally.
3. `typecheck` + `lint:ratchet` + `knip` + `vitest` not regressed.
4. No new `any` at a boundary; no new cross-module deep import.
5. Behavior-preserving items: module e2e smoke unchanged.

## 11. Out of scope

- Swapping any locked-stack dependency.
- Microservice extraction / multi-deploy.
- New product features.
- A coverage-percentage target (we target risk areas + offline-provable core).
