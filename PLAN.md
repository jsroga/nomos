# Storyteller Module — Architecture Alignment Plan

> **Clarify decision: [A] Recommended defaults.** This plan is a **staged**
> migration led by the public `index.ts` barrel. Job orchestration, schema
> convergence, and broad Mastra consolidation are **planned but sequenced after**
> the module-boundary and state-layer fixes. User-visible behavior is preserved
> where practical. This supersedes an earlier draft that assumed [C] full
> blueprint migration. See `DECISIONS.md`.
>
> **This is a plan only. Nothing is implemented. Implement after human approval at
> Verification.** All findings below were spot-checked against the actual code.

## Summary

`src/domains/storyteller` is the repo's most feature-complete module but is still
**legacy-shaped**: it has **no public barrel** (`index.ts` — verified absent), so
~30 `src/app/api/storyteller/*` routes plus sibling modules (`chat`, `loop-creator`,
`interior-designer`, `game-design`) deep-import its internals (`db/schema`, `lib/`,
`services/`, `agents/`, `core/`, `components/`, `config/`, `hooks/`, `mentions/`,
`prompts/`). Its folders are `components/hooks/lib/db/tools/mentions/config` rather
than `ui/state/io/tasks`; `core/EntityExtractor` imports UI + prompt types (impure);
`services/` contains **client-side** polling/orchestration (verified: no service has
`import 'server-only'`); server state lives in custom hooks/context instead of
TanStack Query; and the AI layer runs `z.any()` workflow steps + hand-rolled tracing
in parallel with Mastra.

Per the [A] decision, the plan **establishes the module contract first** (barrel +
stop deep imports + pure core), **then** migrates internals behind it in risk-ordered
slices (folders → server state → god-file splits), and **stages last** the
server-only/jobs seam, schema convergence, typed boundaries, and scoped Mastra
consolidation. It deliberately does **not** attempt a one-pass folder reshape (that's
[C]) nor stop at boundaries only (that's [B]).

---

## Prioritized items

### [P0] Introduce the public `index.ts` barrel (façade over current paths)
- **Problem:** No `src/domains/storyteller/index.ts` exists (verified via glob).
  Outsiders import internals directly — `src/app/app/[projectId]/storyteller/page.tsx`
  pulls from `components/`, `core/ActionTypes`, `core/Enums`, `config/*`,
  `mentions/MentionsProvider`, `hooks/*`, `prompts/schemas/agent-schemas`, and
  `services/{Poster,Moodboard}GenerationService`; `chat` imports `core/ConsistencyTypes`,
  `components/{ConsistencyMessage,ReferenceText}`, `core/ReferenceParser` (verified).
- **Impact:** Breaks invariant #6/#10 (single barrel is the only legal import target).
  Internals are de-facto public, so every later move is outsider-breaking. **Blocks all
  structural work.**
- **Change:** Create `src/domains/storyteller/index.ts` re-exporting exactly the surface
  outsiders use today (the `page.tsx` components + lazy-component types, the `chat`
  cross-module symbols, public types `StoryPlan`/`ActionTypes`/`Enums`, the hooks
  `page.tsx` consumes). Keep type-only exports type-only. Do **not** move files yet — the
  barrel is a stable façade over current paths. Mark any interim server-only re-exports
  (`access-verification`, `db/schema`) in a clearly-labeled section for P2 removal.
- **Effort:** M
- **Verification:** `npm run typecheck` green; barrel compiles; no consumer paths changed.
- **Depends on:** none. **Do first.**
- **Risk flag:** establishes invariant #6 — no boundary crossed yet (façade only).

### [P0] Migrate external consumers to the barrel + add deep-import lint rule
- **Problem:** ~30 route files and 4 sibling-module files deep-import storyteller
  internals (verified list includes `db/schema`, `lib/access-verification`, `services/*`,
  `agents/*`, `core/*`, `config/*`, `components/*`, `prompts/*`).
- **Impact:** Until consumers use the barrel, the surface can't be enforced and internals
  can't be safely reshaped. Invariant #6.
- **Change:** Repoint all `@/domains/storyteller/<internal>` imports in `src/app/**` and
  in `src/domains/{chat,loop-creator,interior-designer,game-design}/**` to
  `@/domains/storyteller`. Add an ESLint `no-restricted-imports` /
  `import/no-internal-modules` rule banning `@/domains/storyteller/*` from outside the
  module; start `warn`, ratchet to `error` once clean. `access-verification` and
  `db/schema` are really shared concerns consumed by other modules — re-export them
  through the barrel now as an **interim seam**, with true relocation tracked in P2.
- **Effort:** L (many files, mechanical)
- **Verification:** `npm run typecheck` + `npm run lint` green; grep for
  `@/domains/storyteller/<segment>` outside the module → 0; lint fires on a deliberate
  violation.
- **Depends on:** P0 barrel.
- **Risk flag:** touches the app→module and cross-module dependency boundary. The
  `access-verification`/`db/schema` re-exports are interim compatibility, flagged for P2.

### [P0] Make `core/` pure (dependency-rule violation on a shared path)
- **Problem:** `core/EntityExtractor/EntityExtractor.ts:1-2` imports `StoryPlan` from
  `prompts/schemas/agent-schemas` and `EntityReference` from `components/ReferenceText`
  (verified); core also stamps runtime `Date`.
- **Impact:** Breaks invariant #8 + the dependency rule (`core/` may import only
  `core/`/`zod`). `core/` is what every layer points at, so impurity is a hot-path
  problem and blocks offline unit tests.
- **Change:** Move `EntityReference` into `core/` (e.g. `core/EntityTypes`) and have
  `ReferenceText` import from there; relocate the `StoryPlan` schema/type so `core/`
  depends only on `core/`+`zod` (re-export to `prompts/`/`io/`); inject a clock instead
  of direct `new Date()`.
- **Effort:** M
- **Verification:** grep shows `core/**` imports only `core/`/`zod`; `npm run typecheck`;
  existing `core/**/__tests__` pass under `npm run test:unit` (offline).
- **Depends on:** P0 barrel (so moved-type references resolve through the barrel).

### [P1] Reshape folders toward the blueprint (staged, one folder per commit)
- **Problem:** Top-level `components/`, `hooks/`, `lib/`, `db/`, `tools/`, `mentions/`,
  `config/` instead of `ui/`, `state/`, `io/`, `core/`, `services/`, `agents/`, `tasks/`,
  `prompts/` (verified via `find`). Target folders `ui/`, `state/`, `io/`, `tasks/` do
  not exist.
- **Impact:** Blueprint §4 + naming contract. Ad-hoc folders mix client/server and make
  every later item harder. Because the barrel (P0) hides paths, these moves are
  non-breaking to outsiders.
- **Change (in dependency order; each slice keeps the barrel + lint green):**
  1. `components/` → `ui/` (already folder-per-component + colocated tests; just relocate
     + update the barrel).
  2. `hooks/` split: server-data hooks (`useEntity`/`useEntities`, `useEpisodeData`,
     bible fetch parts) → `state/queries/`; ephemeral-UI hooks (`useLoadingStates`) →
     `state/`.
  3. `mentions/` → treat as a UI feature under `ui/` (it is UI, not a layer).
  4. `config/` → `storyteller.config.ts` (constants/model matrix); move pure
     `tool-result-mapper`/`action-config` logic into `core/`.
  5. `lib/entity-loader.ts` (client fetcher) → `io/`; `lib/access-verification.ts`
     (server auth) → `services/` interim (flagged for `shared/auth` in P2).
  - Delete each legacy folder once empty.
- **Effort:** L
- **Verification:** `npm run typecheck` + `npm run lint` after each slice; barrel exports
  unchanged; `npx knip` shows no new orphans. Behavior-preserving — no logic changes
  during moves.
- **Depends on:** P0 barrel + P0 consumer migration.
- **Risk flag:** large mechanical churn; one folder per commit for cheap review/revert.

### [P1] Migrate server state to TanStack Query with `io/` fetchers
- **Problem:** `components/WorldBible/BibleContext.tsx` (575 LOC) and
  `hooks/useBibleState.ts` fetch lock/session/remote state via `useEffect`/`cachedFetch`
  + manual invalidation; episode data via `hooks/useEpisodeData.ts`. A good precedent
  exists: `hooks/useEntity.ts` (`useEntities`) is already a proper TanStack hook (§6.3).
- **Impact:** Breaks invariant #1 (server state in TanStack, never in custom stores) and
  the `state → io` contract; bypasses cache consistency.
- **Change:** Add `io/storyteller.api.ts` (typed fetchers over `/api/storyteller/*`),
  `io/storyteller.keys.ts` (key factory), `io/storyteller.dto.ts` (Zod DTOs shared with
  routes). Add `state/queries/`: `useBible`, `useEpisodes`, `useEpisode`, `useCharacters`,
  `useBeats` (+ mutations, e.g. `useBibleLockMutation`) modeled on `useEntities`.
  Mutations call `io/` then invalidate keys. Reduce `BibleContext` to ephemeral panel/edit
  UI state (moved toward a `useStorytellerUiStore`).
  **Behavior preservation (Q2):** keep lock/edit UX identical; only rewire the data path.
- **Effort:** L
- **Verification:** `npm run typecheck` + `npm run test:unit`; manual World Bible
  lock/edit smoke; no `cache:'no-store'`/manual invalidation left in the bible/episode
  paths.
- **Depends on:** P1 folder reshape (needs `io/`, `state/queries/`).
- **Risk flag:** touches state→io boundary + user-facing UX (highest-value, most
  behavior-sensitive). Gate on manual smoke before merge.

### [P1] Split the god files while relocating them
- **Problem:** `components/WorldBible/BibleContext.tsx` (575),
  `agents/StorytellerAgent/StorytellerAgent.ts` (639), `tools/agent-tools.ts` (730)
  exceed the ~400 LOC guardrail (verified via `wc -l`).
- **Impact:** Invariant #8; these concentrate responsibilities and slow migration.
- **Change:** `BibleContext` — query hooks leave in the P1 TanStack item, residual UI
  context lands < 400 LOC. `StorytellerAgent` — extract prompt-building/guardrail-prose
  into `prompts/` builders (keep `withSpan`/Langfuse + memory bounds intact).
  `agent-tools.ts` — split into `agents/tools/<tool>.ts` families (feeds P2 typed
  boundaries).
- **Effort:** M
- **Verification:** each target < ~400 LOC; `npm run typecheck` + `npm run test:unit`
  (esp. `tools/__tests__/*`); export signatures unchanged.
- **Depends on:** P1 folder reshape + P1 TanStack (Bible), P1 reshape (agents).

### [P2] Make `services/` server-only; move client orchestration to `state/`
- **Problem:** `services/MoodboardGenerationService.ts` (290) and
  `services/PosterGenerationService.ts` (362) are **client** code: they import
  `@/store/useGlobalStatusStore`, call `fetch`, hold `pollingIntervals: Map<..,Timeout>`,
  use per-op localStorage-key helpers, and take `providerConfig: any` (verified). No
  storyteller service has `import 'server-only'` (verified: 0 matches). `page.tsx`
  dynamically imports these client services.
- **Impact:** Breaks the service contract (`services/` = server-only) + invariant #4.
  **Staged to P2 per Q3** (structural seams now; `useJob` UX later).
- **Change (seam only this run):** relocate the client polling/orchestration out of
  `services/` into `state/` (e.g. `useMoodboardGeneration`/`usePosterGeneration`), so
  `services/` becomes truly server-only; add `import 'server-only'` to genuine server
  services; replace `providerConfig: any` with a Zod-typed payload. The `useJob`/Trigger
  Realtime replacement is deferred (P3).
- **Effort:** M
- **Verification:** every `services/*` server file starts with `import 'server-only'`;
  `services/` has no `fetch`/`window`/`useGlobalStatusStore`/polling; `npm run typecheck`;
  moodboard/poster smoke unchanged.
- **Depends on:** P1 folder reshape (needs `state/`).
- **Risk flag:** high-risk UX path (image generation). Keep behavior identical this run.

### [P2] Typed boundaries: kill `z.any()` in workflows and `any` in tools/payloads
- **Problem:** `agents/StoryWorkflow/StoryWorkflow.ts` has `inputSchema: z.any()` at
  lines 112, 143, 168, 216 (verified); `MoodboardGenerationService` takes
  `providerConfig: any`; assessment cites loose tool/plan payload typing.
- **Impact:** Breaks invariant #5 (Zod at every edge; ban `any` at boundaries); lets
  runtime drift through and makes refactors unsafe.
- **Change:** Replace each workflow step `z.any()` with explicit `inputSchema`/
  `outputSchema` from `core/`/`agents` DTOs; flow via `getStepResult` inferred types.
  Give each tool (post P1 split) strict Zod `inputSchema`/`outputSchema`. Type the
  moodboard/poster payloads (folds into the P2 services seam).
- **Effort:** M
- **Verification:** `grep z.any() src/domains/storyteller` → 0; no `: any` at
  tool/task/workflow boundaries; `npm run typecheck`;
  `agents/__tests__/schema-validation.test.ts` + `tools/__tests__/*` pass.
- **Depends on:** P1 god-file split (tool families), P2 services seam (payloads).

### [P2] Schema convergence: fold module-local `db/schema` into `src/db/schema.ts`
- **Problem:** `src/domains/storyteller/db/schema.ts` is the effective source of truth,
  imported by ~15 `src/app/api/storyteller/*` routes plus `save-model`/`debug`/`relations`
  routes and `src/lib/db.ts` (verified). It defines `projects`, `characters`, `episodes`,
  `beats`, `storyPlans`, `seriesBibles`, `entityReferences`, `relationshipEdges`, etc.,
  while `src/db/schema.ts` also defines `projects` — two definitions coexist.
- **Impact:** Breaks invariant #3 (one schema, camelCase end-to-end) + topology. Blocks
  encapsulation; risks migration drift.
- **Change (dedicated workstream, sequenced after barrel/boundary per Q4):**
  - Diff the two `projects` column maps and reconcile into `src/db/schema.ts` (do not
    assume identical); move storyteller-only tables + `relations(...)` there.
  - Confine Drizzle access to `services/`; remove manual snake_case↔camelCase remapping.
  - Delete `src/domains/storyteller/db/schema.ts` once `src/db/schema.ts` is the source
    and all consumers use services/the barrel; drop the interim barrel re-export from P0.
- **Effort:** L
- **Verification:** `npm run typecheck`; Drizzle diff/generate shows no unintended
  migration; grep shows zero `@/domains/storyteller/db/schema` imports;
  `npm run test:unit`.
- **Depends on:** P0 consumer migration, P1 reshape (services own DB).
- **Risk flag:** persistence-layer change + invariant #3; sequence last among structural
  work; reconcile `projects` before deleting the module copy.

### [P3] Scoped Mastra-native consolidation (local complexity only)
- **Problem:** Storyteller keeps hand-rolled Langfuse spans, a `WORKFLOW_EVENTS` bus, a
  `core/WorkflowContext` ALS, and prompt-time skill injection alongside Mastra primitives
  (arch §1.1/§9).
- **Impact:** Breaks invariant #7 ("use the framework once"); double complexity for
  tracing/workflow behavior.
- **Change (Q5 default — only where it reduces storyteller-local complexity; **not** a
  shared-kernel rewrite):** land the typed workflow steps (the P2 item, which removes the
  `z.any()` parallel); remove obviously-redundant per-step manual spans that Mastra AI
  Tracing already nests, leaving Mastra `Observability` + `LangfuseExporter` as the tracer
  for those paths. **Explicitly deferred:** deleting `AgentMemory`, the `skill-loader`,
  porting judges to `createScorer`, building `shared/agent-kernel`, replacing the event
  bus with `run.stream().fullStream`, and `WorkflowContext` ALS → `RequestContext` — these
  are cross-module AI-platform work.
- **Effort:** M (scoped) — full consolidation is L+ and deferred.
- **Verification:** `npm run typecheck` + `npm run test:unit`; `agents/__tests__/*.e2e`
  pass; Langfuse traces still nest; targeted `npm run eval` (storyteller/tools) for parity.
- **Depends on:** P2 typed boundaries.
- **Risk flag:** correctness-sensitive AI path; keep to low-risk removals; eval-gate.

### [P3] Deferred `useJob`/Trigger Realtime migration for image generation
- **Problem:** Bespoke polling/status-store wiring for moodboard/poster (see P2 seam).
- **Impact:** Invariant #4. Deferred per Q3 (structural seams now, UX later).
- **Change:** After the P2 seam lands, replace polling with a shared `shared/jobs`
  `useJob` hook on Trigger Realtime; author `tasks/generate-moodboard.task.ts` /
  `tasks/generate-poster.task.ts` as `schemaTask`s (queue/retry/idempotency), re-exported
  from `src/trigger/index.ts`.
- **Effort:** L
- **Verification:** no client polling loops remain; job status flows via `useJob`;
  image-gen smoke unchanged.
- **Depends on:** P2 services seam. **Deferred — plan target, not this increment.**

---

## Suggested sequence (first shippable increment first)

**Increment 1 — establish the contract (first shippable, low behavior risk):**
1. P0 — `index.ts` barrel (façade). Non-breaking, independently shippable.
2. P0 — Migrate consumers to the barrel + add the deep-import lint rule.
3. P0 — Make `core/` pure (`EntityExtractor`).
> *End state: contract established, deep imports gone, core pure — everything after
> is safer.*

**Increment 2 — reshape + state (the big structural win):**
4. P1 — Folder reshape toward the blueprint (one folder per commit).
5. P1 — Migrate server state to TanStack Query + `io/` fetchers/DTOs.
6. P1 — Split the god files while relocating them.

**Increment 3 — server-only seam + typing (staged per Q3/Q5):**
7. P2 — Make `services/` server-only; move client orchestration to `state/`.
8. P2 — Typed boundaries (kill `z.any()` / `any` at edges).

**Increment 4 — deferred workstreams (last):**
9. P2 — Schema convergence into `src/db/schema.ts` (dedicated, last structural change).
10. P3 — Scoped Mastra consolidation, then the deferred `useJob` migration.

Increment 1 is the first shippable increment; each later increment is independently
reviewable and reversible. Jobs, schema, and Mastra work are intentionally staged last
per the [A] decision.

---

## Deferred / out of scope

- **Full `shared/agent-kernel` / `shared/*` build** (arch §9.1, §12): `src/shared/` does
  not yet exist; building the kernel (model registry, `OrchestrationEvent` union, ports,
  `useJob`) is a repo-wide, cross-module effort. This plan introduces only the minimum
  shared surface storyteller needs.
- **Full `useJob`/Trigger Realtime UX migration** (arch §7): staged after the server-only
  seam per Q3; listed as P3 deferred.
- **Mastra Memory / Scorers / Processors migration** (§9.3, §9.6, §9.7): deleting
  `AgentMemory`, porting judges to `createScorer`, and processor guardrails are follow-on
  work driven by the shared-kernel plan and eval evidence — beyond a module cleanup (Q5).
- **True relocation of `access-verification` → `shared/auth`:** only the import boundary
  is fixed this run (barrel/services interim); moving it to `shared/*` is repo-wide.
- **Chat/loop-creator/etc. changes beyond repointing their storyteller imports to the
  barrel:** each is a separate module with its own convergence track.
- **`prompts/` reorganization:** already matches the target authoring format; no
  divergence found, left as-is.
- **New product behavior / World Bible UX redesign:** Q2 chose preservation; out of scope.
