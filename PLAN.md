# Storyteller Module — Architecture Alignment Plan

> **Clarify decision: [C] Full blueprint migration.** This plan converges
> `src/domains/storyteller` **fully** onto the canonical blueprint in
> `docs/unified/ARCHITECTURE.md` §4 — the legacy-folder mass-move is IN scope
> (not deferred), and legacy folders are deleted once empty. See `DECISIONS.md`.

## Summary

`src/domains/storyteller` is the repo's most feature-complete module but is still
**legacy-shaped**: it has no public barrel (`index.ts`), uses legacy folders
(`components/`, `hooks/`, `lib/`, `db/`, `mentions/`, `config/`, `tools/`) instead
of the target `ui/state/io/core/services/agents/tasks/prompts` blueprint, leaks its
internals to a 3,204-line god route (37 internal imports) and to the `chat` module
(4 internal imports), and owns a **second Drizzle schema** with a duplicate
`projects` table (38 files import it, including many API routes). Client hooks fetch
server state ad hoc, one client hook holds a privileged Supabase auth client,
cross-component coordination runs on `window` CustomEvents, and AI orchestration
layers manual Langfuse spans, a hand-rolled event bus, and `z.any()` step schemas
on top of Mastra primitives.

Per the [C] decision, the plan sequences a **complete** migration: **(1)** stop the
bleeding on the two correctness/boundary risks (duplicate schema + browser
privileged auth); **(2)** establish the enforcement seam — the `index.ts` barrel and
target folder skeleton — so every move is lint-guarded; **(3)** mass-move each legacy
folder into its target layer (server state → TanStack/`io`, route → `ui`+`state`,
tools → `agents/tools`), deleting legacy folders as they empty; **(4)** converge AI
orchestration on Mastra-native primitives. Nothing here is implemented. All findings
below were spot-checked against the actual code.

---

## Prioritized items

### [P0] Consolidate the duplicate Drizzle schema into `src/db/schema.ts`
- **Problem:** `src/domains/storyteller/db/schema.ts` defines its own `projects`
  (`:16`) plus `characters`, `episodes`, `beats`, `setups`, `documentEmbeddings`,
  `entityReferences`, `relationshipSnapshots`, `relationshipEdges`, `seriesBibles`,
  `storyPlans`. `src/db/schema.ts` is the canonical source of truth and **also**
  defines `projects` (`:24`) — two `projects` table definitions coexist (verified).
  **38 files** import `@/domains/storyteller/db/schema` (verified), including
  services/tools *and* many `src/app/api/storyteller/**/route.ts` routes.
- **Impact:** Breaks invariant #3 (one schema, camelCase end-to-end) and the topology
  rule that `src/db/` owns schema. Two `projects` definitions risk drift/migration
  conflicts and block cross-module reuse. This is a correctness/data-integrity hazard.
- **Change:**
  - Diff the two `projects` column maps first (`:16` vs `:24`) — do **not** assume
    identical. Reconcile into the canonical `src/db/schema.ts` definition; delete the
    module copy.
  - Move the storyteller-only tables and their `relations(...)` into
    `src/db/schema.ts`.
  - Update **all 38 importers** to `@/db/schema`: the 5 services
    (`EntityAutoLinkerService`, `RagService`, `EntityGraphService`,
    `ContextAssemblyService`, `EntityRegistryService`), the 4 tools
    (`world-building-tools`, `agent-tools`, `beat-tools`, `storytelling-adapter`),
    `lib/access-verification.ts`, and the ~28 `src/app/api/**` route files.
  - Delete `src/domains/storyteller/db/schema.ts` and the `db/` folder once empty.
- **Effort:** M
- **Verification:** `npm run typecheck` (all 38 importers resolve), `npm run test:unit`,
  and a Drizzle diff/generate check confirming no unintended migration. Grep confirms
  **zero** remaining `domains/storyteller/db/schema` imports.
- **Depends on:** none. Do first — everything server-side sits on top of this.
- **Risk flag:** touches invariant #3 and shared persistence; the `projects`
  reconciliation must be verified before deleting the module copy.

### [P0] Remove the browser-side privileged Supabase auth client
- **Problem:** `hooks/useBibleState.ts:31` dynamically imports
  `createClientComponentClient()` and reads auth in the browser (verified).
- **Impact:** Breaks invariant #2 (no browser→Supabase privileged access; the gate is
  API route → `requireAuth()` → Service → Drizzle). Couples a UI hook to Supabase auth
  internals and bypasses the typed boundary.
- **Change:** Move the identity read behind a module `io/` call to an API route that
  runs `requireAuth()` server-side. `useBibleState` consumes server state via a
  TanStack query hook (see the state-migration item), not Supabase directly. Delete
  the client Supabase import.
- **Effort:** S–M
- **Verification:** grep confirms no `@supabase/*` client import remains under
  `src/domains/storyteller/**` client code; `npm run typecheck`; manual check that
  bible-lock state still loads.
- **Depends on:** ideally lands with the barrel + `io/` seam (P1); can be done
  standalone with a temporary API route.
- **Risk flag:** touches invariant #2 (auth boundary).

### [P1] Establish the module public barrel (`index.ts`) and target folder skeleton
- **Problem:** No `src/domains/storyteller/index.ts` (verified). Module exposes ad-hoc
  roots (`components/`, `hooks/`, `db/`, `lib/`, `tools/`, `mentions/`, `config/`);
  target folders `ui/`, `state/`, `io/`, `tasks/` do not exist (`ls` confirmed).
- **Impact:** Breaks invariant #6 (single barrel) and the module blueprint. Without the
  barrel there is no seam to enforce the dependency rule, so the mass-move would break
  the 37 route imports and 4 `chat` imports. This item **unblocks** the migration.
- **Change:**
  - Create `src/domains/storyteller/index.ts` re-exporting **only** the intended public
    surface (the UI components + types the route and `chat` actually consume today).
    Keep it trimmed to the target API — not a legacy dumping ground.
  - Create empty target folders `ui/`, `state/` (with `state/queries/`), `io/`,
    `tasks/`, and `agents/tools/`, alongside existing `core/`, `services/`, `agents/`,
    `prompts/`, plus `storyteller.config.ts` (folds in today's `config/`). These are
    landing zones for the later mass-move items.
  - Repoint the route and `chat` to import from `@/domains/storyteller` (barrel).
  - Add/enable the dependency-rule lint that forbids reaching past the barrel
    (per SPEC §P0).
- **Effort:** M
- **Verification:** `npm run typecheck`; lint rule flags any new deep import; grep shows
  the route and `chat` import only `@/domains/storyteller`.
- **Depends on:** none (parallel with P0).
- **Risk flag:** touches invariant #6 and the dependency rule — this is the enabling
  step that establishes them.

### [P1] Extract `chat`'s cross-module dependencies out of storyteller internals
- **Problem:** `chat` imports storyteller internals (verified):
  `ConsistencyCheckResult` from `core/ConsistencyTypes` (`chat/types.ts:2`), and
  `ConsistencyMessage`, `ReferenceText` (`components/*`), `hasReferences`
  (`core/ReferenceParser`) in `chat/components/AgentLog.tsx:29-31`.
- **Impact:** Breaks the dependency rule (no cross-module internal imports). A full
  blueprint migration cannot leave `chat` reaching into internals, so these must be
  resolved for real (not left frozen).
- **Change:** Classify each symbol:
  - Truly shared presentation/parse concerns consumed by 2+ modules
    (`ReferenceText`, `ReferenceParser`/`hasReferences`, `ConsistencyMessage`,
    `ConsistencyCheckResult`) → move to `src/shared/*` (or `src/components/ui` for the
    pure presentational primitive) per the 2+-consumers topology rule.
  - Anything that stays storyteller-owned → export **only** via the barrel; `chat`
    imports from `@/domains/storyteller`.
- **Effort:** S–M
- **Verification:** grep shows `chat` has zero `@/domains/storyteller/components|core`
  deep imports; `npm run typecheck`; `npm run test:unit`.
- **Depends on:** P1 barrel item.

### [P1] Migrate storyteller server state to TanStack Query with `io/` fetchers
- **Problem:** Episode lists/details, bible-lock state, characters, beats, and script
  data are fetched via `fetch`/`cachedFetch`/`useState` in `hooks/useEpisodeData.ts`,
  `hooks/useBibleState.ts`, and inline in `page.tsx`; action history + state overrides
  persist to `localStorage` (`hooks/useStorytellerActions.ts:70-95`,
  `hooks/useEpisodeData.ts:26-31`).
- **Impact:** Breaks invariant #1 (server state in TanStack Query, never mixed with UI
  state) and invariant #4 (no bespoke `localStorage` recovery). Loses standardized
  invalidation, cache ownership, and loading/error semantics.
- **Change:**
  - Add `io/storyteller.api.ts` (typed fetchers), `io/storyteller.keys.ts` (query
    keys), `io/storyteller.dto.ts` (Zod DTOs shared with the routes).
  - Add `state/queries/`: `useEpisodes`, `useEpisode`, `useBibleLock`, `useCharacters`,
    `useBeats`, `useScript` (+ mutations, e.g. `useBibleLockMutation`). Generalize the
    existing `useEntity`/`useEntities` pattern (`hooks/useEntity.ts`) per §6.3.
  - Replace `useEpisodeData`/`useBibleState` server-fetch bodies with these hooks; keep
    only ephemeral UI state (moved to Zustand `useStorytellerUiStore` in the next item).
  - Remove the `localStorage` action-history/state-override channels — durable progress
    flows through query cache + (for long work) the shared job hook. Keep only truly
    ephemeral UI flags client-side.
- **Effort:** L
- **Verification:** `npm run typecheck`; `npm run test:unit`; manual check that
  episodes/bible/characters load and mutations invalidate; grep shows no raw
  `fetch`/`cachedFetch` and no `localStorage` for these entities in client code.
- **Depends on:** P0 schema (DTOs align to consolidated tables), P1 barrel/skeleton.
- **Risk flag:** touches invariants #1 and #4.

### [P1] Break up the 3,204-line storyteller route into module-owned `ui/` + `state/`
- **Problem:** `src/app/app/[projectId]/storyteller/page.tsx` is 3,204 LOC (verified)
  with 37 direct storyteller internal imports; it owns domain types, fetch
  orchestration, local + server state, dynamic wiring, and cross-module event behavior.
- **Impact:** Breaks invariant #8 (routes < ~300 LOC; `app/` holds no business logic)
  and the dependency rule. Makes the module untestable and un-migratable.
- **Change:**
  - Move composition + behavior into a module-owned container under `ui/`
    (e.g. `ui/StorytellerWorkspace/`), backed by the new `state/queries/*` hooks and
    `state/useStorytellerUiStore.ts` (Zustand: selection/modes/panels only).
  - Move domain types out of the route into `core/` (or DTOs in `io/`).
  - Reduce `page.tsx` to a thin route importing only `@/domains/storyteller` (render
    the workspace, pass `projectId`). Target < ~300 LOC.
  - Split any resulting container > ~400 LOC (invariant #8).
- **Effort:** L
- **Verification:** `wc -l page.tsx` < 300; route imports only the barrel;
  `npm run typecheck`; `npm run test:unit`; manual smoke of the storyteller page.
- **Depends on:** P1 barrel/skeleton and P1 TanStack migration.
- **Risk flag:** large blast radius on the hot path — extract sections one at a time.

### [P1] Complete the legacy-folder mass-move into the target blueprint
- **Problem:** Under [C] Full blueprint migration, the module must end in the canonical
  shape. Legacy folders `components/`, `hooks/`, `lib/`, `mentions/`, `config/`, `tools/`
  still exist (`ls` confirmed) and must be migrated, not left in place.
- **Impact:** Achieves the full blueprint (invariant #6/#10, §4). Leaving legacy folders
  half-migrated is exactly the mid-migration ambiguity the assessment flagged.
- **Change (moves land as their owning items complete, then folders are deleted):**
  - `components/*` → `ui/<Component>/` (PascalCase folder-per-component + colocated
    `.test.tsx` + local `index.ts`), consumed via the barrel.
  - `hooks/*` → `state/` (client UI store) and `state/queries/*` (server state), per the
    TanStack item. Pure helpers → `core/`.
  - `tools/*` (AI-facing Mastra tools) → `agents/tools/<tool>.ts` with
    `import 'server-only'` guards (see the server-only item).
  - `lib/*` → `core/` (pure) or `services/` (server I/O), by nature of each file.
  - `mentions/*` → classify into `core/` (pure parsing) vs `ui/` (rendering).
  - `config/*` → `storyteller.config.ts`.
  - Delete each legacy folder once empty; confirm the barrel is the only external entry.
- **Effort:** L
- **Verification:** `ls src/domains/storyteller` shows only the blueprint folders +
  `index.ts` + `storyteller.config.ts`; grep shows no external deep imports;
  `npm run typecheck`; `npm run test:unit`; dependency-rule lint passes.
- **Depends on:** P1 barrel/skeleton; individual moves ride on the TanStack, route,
  server-only, and `core`-purity items. This item tracks the *completion* of the
  mass-move and the folder deletions.
- **Risk flag:** touches invariant #6/#10 and the dependency rule across the module;
  do folder-by-folder with the lint as the guardrail.

### [P2] Fix the services/agents split and add `server-only` guards; relocate AI tools
- **Problem:** `services/ScriptOperationsService.ts` directly constructs agents;
  server code lacks `import 'server-only'` guards; AI-facing tools live in top-level
  `tools/` rather than `agents/tools/` (finding).
- **Impact:** Breaks §4 server-only rules and naming placement; weakens server/client
  bundle protection and blurs `services` vs `agents`.
- **Change:** Keep `services/` for server data/external-API work (returning `Result<T>`)
  and `agents/` for Mastra agents/tools/workflows; add `import 'server-only'` to server
  units; move AI tools to `agents/tools/` (coordinates with the mass-move item). Have
  `ScriptOperationsService` delegate agent construction rather than owning it.
- **Effort:** M
- **Verification:** grep shows every `services/*` and `agents/*` server file starts with
  `import 'server-only'`; `tools/` no longer exists; `npm run typecheck`;
  `npm run test:unit`.
- **Depends on:** P0 schema (importers repointed), P1 barrel/skeleton.

### [P2] Replace `window` CustomEvent coordination with typed `io/` calls / jobs
- **Problem:** `components/StoryPlanBoard/StoryPlanBoard.tsx:85-114` dispatches
  `window` CustomEvents (`update_episode_premise`, `trigger-agent-action`,
  `generate-episode-poster`, `trigger-storyboard-generation`); `EpisodeManager.tsx:67`
  listens (verified).
- **Impact:** Breaks invariant #4 (no bespoke `window` events; long work is a
  Trigger.dev Job observed via shared job hooks). Creates hidden coupling.
- **Change:** Route each event through a typed module `io/` call into an API
  route/service, or — for long-running work (poster/storyboard generation) — a
  Trigger.dev `schemaTask` under `tasks/` observed via the shared job hook. Remove the
  `dispatchEvent` calls and their listeners.
- **Effort:** M
- **Verification:** grep shows no `CustomEvent`/`dispatchEvent` under
  `src/domains/storyteller/**`; `npm run typecheck`; manual check that premise update,
  agent actions, poster, and storyboard flows still trigger.
- **Depends on:** P1 `io/` skeleton; P1 barrel; `tasks/` skeleton.
- **Risk flag:** touches invariant #4.

### [P2] Converge AI orchestration on Mastra-native primitives (remove bespoke plumbing)
- **Problem:** `agents/StoryWorkflow/StoryWorkflow.ts` uses **4** `z.any()` step schemas
  (verified), a manual Langfuse span helper, and a hand-rolled `WORKFLOW_EVENTS` bus;
  `tools/agent-tools.ts` uses `: any` at **8** sites (verified); `core/WorkflowContext`
  threads a bespoke AsyncLocalStorage context.
- **Impact:** Breaks invariant #7 (use the framework once) and invariant #5 (typed
  boundaries). Duplicates observability/orchestration.
- **Change (per ARCHITECTURE §9.1–9.4, staged):**
  - Give every `createStep` real `inputSchema`/`outputSchema` — replace `z.any()`;
    flow data via `getStepResult` inferred types.
  - Type tool `execute` signatures — replace `: any` with schema-inferred input types.
  - Replace hand-rolled refinement control flow with native `.branch()` / `.dountil()`.
  - Drop manual `langfuse.span` for Mastra `Observability` + `LangfuseExporter`
    (already configured in `MastraInstance`).
  - Replace the `WORKFLOW_EVENTS` bus with `run.stream().fullStream` chunks mapped to
    the SSE surface; replace `core/WorkflowContext` ALS with Mastra `RequestContext`.
- **Effort:** L
- **Verification:** grep shows no `z.any()` in `StoryWorkflow` step schemas and no
  `: any` in `agent-tools` execute signatures; no manual `langfuse.span` /
  `WORKFLOW_EVENTS`; `npm run typecheck`; `npm run test:unit`; targeted `npm run eval`
  (storyteller/tools) for behavior parity.
- **Depends on:** sequence after boundary work; split into sub-steps (typing → event
  bus → tracing). Partly leans on the shared `agent-kernel` direction (see Deferred).
- **Risk flag:** touches invariants #5 and #7 and the AI hot path — do incrementally
  with eval gates.

### [P2] Restore `core/` purity in `EntityExtractor`
- **Problem:** `core/EntityExtractor/EntityExtractor.ts` imports `StoryPlan` from
  `prompts/schemas/agent-schemas` and `EntityReference` from `components/ReferenceText`
  (verified `:1-2`) — core depends on UI and prompt layers.
- **Impact:** Breaks the `core/` purity rule and dependency rule (core imports nothing
  higher). Undermines offline unit-testability.
- **Change:** Move `EntityReference` into `core/` and have UI import from core (not the
  reverse). Relocate the `StoryPlan` type so `core/` depends only on `core/` + `zod`.
- **Effort:** S–M
- **Verification:** grep shows `core/EntityExtractor` imports only `core/`/`zod`;
  `npm run typecheck`; `npm run test:unit` (runs offline).
- **Depends on:** P1 barrel (so UI re-imports the moved type cleanly).

### [P2] Split the 639-LOC `StorytellerAgent` god file
- **Problem:** `agents/StorytellerAgent/StorytellerAgent.ts` is ~639 LOC (verified) and
  couples prompt assembly, model/memory config, skill loading, tool orchestration, and
  agent construction.
- **Impact:** Breaks invariant #8 size guidance; slows safe migration.
- **Change:** Extract prompt building → `prompts/`, model/memory config → module config
  / shared kernel seam, agent factory → a thin `agents/` unit. Keep `withSpan`/Langfuse
  instrumentation and memory bounds intact.
- **Effort:** M
- **Verification:** `wc -l StorytellerAgent.ts` well under 400; `npm run typecheck`;
  `npm run test:unit`; targeted `npm run eval` storyteller for parity.
- **Depends on:** best after the P2 Mastra convergence so seams align.

### [P3] Batch: replace remaining `as any`/unchecked casts at UI edges and add missing edge Zod
- **Problem:** UI casts like `(storyPlan as any)` in `StoryPlanBoard` and scattered
  untyped edges (finding).
- **Impact:** Breaks invariant #5; lower risk than workflow/tool `any`s but invites drift.
- **Change:** Once DTOs exist (P1 `io/*.dto.ts`), replace UI `as any` with inferred DTO
  types; add Zod at remaining unguarded UI→server edges. Batch as a cleanup pass.
- **Effort:** S
- **Verification:** grep for `as any` under `src/domains/storyteller/**` trends to zero on
  touched files; `npm run typecheck`; `npm run lint`.
- **Depends on:** P1 TanStack/DTO item.

---

## Suggested sequence

**Increment 1 (independently shippable, low-risk correctness):**
1. P0 — Consolidate Drizzle schema into `src/db/schema.ts` (repoint all 38 importers).
2. P0 — Remove browser-side privileged Supabase auth (minimal server route if barrel
   isn't ready).

**Increment 2 (the enforcement seam — unblocks the mass-move):**
3. P1 — Create `index.ts` barrel + target folder skeleton + dependency-rule lint.
4. P1 — Repoint `chat` off storyteller internals (classify shared symbols → `shared/`
   or barrel).

**Increment 3 (state + route, the big structural win):**
5. P1 — Migrate server state to TanStack Query with `io/` fetchers + DTOs (removing
   `localStorage` channels).
6. P1 — Break up `page.tsx` into `ui/StorytellerWorkspace` + `state/` (Zustand UI store).

**Increment 4 (complete the blueprint per [C]):**
7. P2 — Fix services/agents split, add `server-only` guards, relocate tools →
   `agents/tools/`.
8. P2 — Replace `window` CustomEvents with typed `io/` calls / Trigger.dev tasks.
9. P2 — Restore `core/EntityExtractor` purity.
10. P1 — Complete the legacy-folder mass-move and delete emptied folders (this closes
    the full-blueprint migration; it depends on items 5–9 landing their moves).

**Increment 5 (AI convergence, eval-gated, sub-staged):**
11. P2 — Mastra-native orchestration (typed steps → tool types → native control flow →
    native tracing → streaming instead of event bus).
12. P2 — Split the 639-LOC `StorytellerAgent`.
13. P3 — Batch cleanup of remaining `as any`/UI edge Zod.

Increment 1 is the first shippable increment; each subsequent increment is
independently reviewable and reversible. The mass-move (item 10) is intentionally
last within the structural work so the barrel + lint are proven before folders move.

---

## Deferred / out of scope

- **Building `src/shared/agent-kernel` / `src/shared/*` as a whole:** `src/shared/`
  does not yet exist (verified). Creating the full shared kernel (model registry,
  `OrchestrationEvent` union, ports, `useJob`) is a repo-wide effort spanning modules
  and belongs to a cross-module plan. [C] raises ambition for *this module*, not a
  repo-wide shared-layer build; this plan introduces only the minimum shared surface
  storyteller needs (the symbols `chat` pulls, and job observation for P2).
- **Mastra Memory / Scorers / Processors migration (§9.3, §9.6, §9.7):** the P2 AI work
  is scoped to concrete verified violations (span tree, event bus, `z.any()` steps,
  `any` tool signatures). Porting judges to `createScorer`, deleting `AgentMemory`, and
  processor guardrails are follow-on work driven by the shared agent-kernel plan and
  eval evidence.
- **Prompt/skills reorganization:** `prompts/` already matches the target authoring
  format; no divergence found, so it is left as-is.
