# Storyteller — Architecture Alignment Plan

> Target: `docs/unified/ARCHITECTURE.md` (module blueprint §4, dependency rule
> §3/§5, non-negotiable invariants §2). Scope decided at Clarify:
> **[A] Staged migration — boundaries first** (see `DECISIONS.md`).
> This is a plan only; implement after approval at Verification.
>
> Every item below was spot-checked against current code. (This supersedes an
> earlier draft that assumed `index.ts` was absent — it exists with 79 lines and
> leaks internals, which is the actual problem.)

## Summary

`src/domains/storyteller` is partly on-architecture (folder-per-unit components,
one good TanStack hook `hooks/useEntity.ts`, a pure `core/` with an injected
clock, no browser→Supabase writes) but is still legacy at the boundaries. Its
public barrel re-exports DB schema/services/agent internals; the canonical
Drizzle tables live *inside* the module so `src/db/schema.ts` imports *up* into
it; client hooks fetch via `cachedFetch`/raw `fetch` instead of TanStack; and
long-running poster/moodboard work runs as browser "services" with `localStorage`
recovery + `window` CustomEvents. The AI workflow uses Mastra `Workflow` but also
a hand-rolled Langfuse tree + event-bus and `z.any()` steps.

Per [A], the plan fixes the schema and barrel boundaries first (they unblock
everything else), migrates the highest-value client server-state to typed `io/` +
`state/queries/`, marks server-only surfaces, then sequences the Trigger-task and
Mastra-thinning work.

**There is no P0.** The acute-risk categories are already clean here: storyteller
does not write to Supabase from the browser (`hooks/useBibleState.ts:31` only
calls `auth.getUser()`), and `core/` is pure. The work is P1 structural
boundaries and below.

---

## Prioritized items

### [P1] Fix schema-ownership inversion — make `src/db` the source of truth
- **Problem:** Canonical Drizzle tables (`characters`, `episodes`, `beats`,
  `seriesBibles`, `storyPlans`, `entityReferences`, relations) live in
  `src/domains/storyteller/db/schema.ts`, and `src/db/schema.ts:12-21` imports
  them *from the module barrel*. This inverts invariant #3 ("Drizzle
  `src/db/schema.ts` is the source of truth") and is why ~40 external files
  import tables straight from `@/domains/storyteller`.
- **Impact:** Blocks barrel narrowing (Item 2) and dependency-rule lint; a module
  cannot be a clean vertical slice while global schema depends on it.
- **Change:** Move the storyteller table/relation definitions into
  `src/db/schema.ts` (single schema file). Delete the up-import at
  `src/db/schema.ts:12-21`. Reconcile the two `projects` definitions (both files
  define it — diff the column maps, do not assume identical). Update the ~40
  importers — routes under `app/api/storyteller/*`, `src/lib/db.ts`,
  `src/services/storyteller.service.ts`,
  `src/infrastructure/ai/rag/hybrid-search.ts`, `src/evaluation/*` — to import
  tables from `@/db` instead of `@/domains/storyteller`. Delete
  `src/domains/storyteller/db/schema.ts` once nothing imports it.
- **Effort:** L
- **Verification:** `npm run typecheck` clean; `grep` shows no table symbols
  imported from `@/domains/storyteller`; Drizzle generate shows no unintended
  migration.
- **Depends on:** none (foundation).
- **Risk:** Boundary-touching (invariant #3) + wide import churn — one mechanical
  codemod commit, reconcile `projects` before deleting the module copy.

### [P1] Narrow `storyteller/index.ts` to a real public contract
- **Problem:** `src/domains/storyteller/index.ts:66-79` re-exports `./db/schema`,
  `./lib/access-verification`, and eight concrete `services/*` from the public
  barrel. Breaks the "one barrel" invariant (#6) and §4 public-API rule; external
  callers couple to persistence + server internals.
- **Impact:** Any internal refactor risks breaking outside callers; dependency
  lint can't be enabled while internals are public.
- **Change:** After Item 1, drop the table/schema exports (consumers use `@/db`).
  Move `verifyProjectAccess`/`verifyEpisodeAccess`/`verifyCharacterAccess`
  (`lib/access-verification.ts`) to the shared auth layer (`shared/auth`); routes
  import from there. Keep on the barrel only: public UI components (already listed
  `:16-37`), public hooks/types, and the server *entry* functions the app calls
  (`createStorytellerAgent`, `runStorytellerWorkflow`, `assembleStorytellerContext`,
  `regenerateText`, consistency apply/undo, `entityRegistry`, `workflowStore`).
  Replace `export * from './services/*'` with named exports of only the functions
  routes use. Add an ESLint `no-restricted-imports` rule banning
  `@/domains/storyteller/*` deep imports from outside the module (start `warn`,
  ratchet to `error` once clean).
- **Effort:** L
- **Verification:** `npm run typecheck`/`lint` clean; barrel no longer exports
  `db/schema` or raw service classes; every remaining export has a real external
  consumer (`grep`); lint fires on a deliberate deep-import.
- **Depends on:** Item 1.
- **Risk:** Import fallout across `app/api/storyteller/*` — update call sites in
  the same change.

### [P1] Stand up the target layer skeleton + migrate top client server-state to `io/` + TanStack
- **Problem:** Module is organized as legacy roots (`hooks/`, `components/`,
  `config/`, `lib/`, `db/`, `mentions/`, `tools/`); client hooks
  (`hooks/useEpisodeData.ts:45`, `hooks/useBibleState.ts:44`) fetch via
  `cachedFetch` + raw `fetch` and hold server data in `useState`, bypassing
  TanStack (invariant #1, dependency rule §5). Anchor already exists:
  `hooks/useEntity.ts` (`useEntities`, TanStack).
- **Impact:** Duplicate fetch/cache logic, manual invalidation, no server-state
  ownership; blocks the folder blueprint.
- **Change:** Create the blueprint folders (`io/`, `state/`, `state/queries/`;
  `core/`, `agents/`, `prompts/` already exist). Add `io/storyteller.api.ts`,
  `io/storyteller.keys.ts`, `io/storyteller.dto.ts` (Zod DTOs shared with routes)
  for the two highest-value flows: **episodes** (`GET /api/storyteller/episodes`)
  and **bible-lock** (`GET /api/storyteller/bible/lock`). Replace the data
  fetching in `useEpisodeData`/`useBibleState` with `state/queries/useEpisodes.ts`
  and `state/queries/useBibleLock.ts` (TanStack), leaving only ephemeral UI state
  (URL sync, optimistic open) in the hook (toward a `state/useStorytellerUiStore`).
  Fold the existing `useEntities` key into `io/storyteller.keys.ts`. Use the
  legacy→blueprint mapping table below to place remaining roots without moving
  every file yet.
- **Effort:** M
- **Verification:** the two migrated hooks no longer use `cachedFetch`; TanStack
  devtools show the new keys; storyteller e2e smoke
  (`components/__tests__/chat-persistence.e2e.test.tsx`) still passes.
- **Depends on:** Item 2 (so `io/` DTOs are the boundary, not the barrel).
- **Risk:** state→io boundary + user-facing UX — preserve lock/edit behavior;
  gate on a manual World Bible smoke.

### [P1] Mark server-only boundaries; separate client "services" from server services
- **Problem:** No `services/*` or `agents/*` file has `import 'server-only'`
  (verified: 0 matches) though many import Drizzle/server SDKs (§4 rule). Worse,
  three "services" are actually **browser** code:
  `services/PosterGenerationService.ts` (`localStorage` at `:70,131`, resume-from-
  localStorage at `:306`, `window.dispatchEvent('poster-generation-complete')` at
  `:264`), `services/MoodboardGenerationService.ts` (`:78,205,248`), and
  `services/BeatImageService.ts` (`:7,23`) — they must not sit next to Drizzle
  services.
- **Impact:** Easy accidental client-bundle import of server code (and vice
  versa); weak signaling; mislabels the job-migration target.
- **Change:** Add `import 'server-only'` to the genuine server services
  (`ContextAssemblyService`, `ContextualSummaryService`, `EntityRegistryService`,
  `EntityAutoLinkerService`, `EntityGraphService`, `RagService`,
  `RelationshipEnricherService`, `ScriptOperationsService`,
  `ReferenceValidatorService`, `context/*`) and to `agents/*` entry files. Move
  the three client services out of `services/`: their orchestration collapses into
  Item 5 (`tasks/` + `useJob`); residual client glue moves under `state/`/`ui/`.
- **Effort:** M
- **Verification:** build passes (no `server-only` reaching a client component);
  `grep 'server-only'` covers every server entry; the three client services no
  longer live in `services/`.
- **Depends on:** Item 2 (barrel no longer bulk-exports these).

### [P1/P2] Migrate poster/moodboard long-running flows to Trigger tasks + `useJob`
- **Problem:** `PosterGenerationService.ts` / `MoodboardGenerationService.ts`
  persist run state to `localStorage`, "resume pending tasks from localStorage"
  (`:306` / `:248`), and signal completion via `window.dispatchEvent(new
  CustomEvent(...))` (`:264` / `:205`). Breaks invariant #4. Server trigger routes
  already exist (`api/storyteller/moodboard/trigger`,
  `api/storyteller/episodes/[id]/generate-poster`).
- **Impact:** Fragile recovery, browser-coupled orchestration, inconsistent UX;
  the module can't be "on-architecture" for jobs.
- **Change:** Author `tasks/generate-poster.task.ts` and
  `tasks/generate-moodboard.task.ts` as `schemaTask`s (Zod payload, `queue`
  `{ name: 'image-gen', concurrencyLimit: 5 }`, `retry`, idempotency key e.g.
  `poster-${episodeId}`), re-exported from `src/trigger/index.ts`. The API route
  triggers and returns `{ runId, accessToken }`. UI observes via the shared
  `shared/jobs/useJob` hook on Trigger Realtime; delete the `localStorage`
  recovery + CustomEvent paths and their listeners. Recovery = persist `runId`
  (TanStack/URL) and re-subscribe.
- **Effort:** L
- **Verification:** no `localStorage`/`CustomEvent` left in the poster/moodboard
  path (`grep`); a run streams progress via `useJob`; reload re-subscribes without
  a `localStorage` scan; image-gen smoke unchanged.
- **Depends on:** Item 4; requires `shared/jobs/useJob` (confirm at Verification —
  if absent, add creating it, mirroring the world-building-toolkit pattern in
  ARCHITECTURE §7, as a sub-step).
- **Risk:** high-risk UX path + invariant #4 — keep behavior identical.

### [P2] Thin AI orchestration around Mastra (light pass) + kill `z.any()` steps
- **Problem:** `agents/StoryWorkflow/StoryWorkflow.ts` uses Mastra
  `Workflow`/`createStep` but also imports the hand-rolled `langfuse`
  (`@/agent-core/observability`) and the `WorkflowContext` event bus
  (`core/WorkflowContext`: `getWorkflowEventBus`, `WORKFLOW_EVENTS`), threads
  `data?: any` through step events, and declares `inputSchema: z.any()` at lines
  **112, 143, 168, 216**. Breaks invariant #7 ("use the framework once") and #5
  (typed steps). `any` casts also appear in `agents/ConsistencyAgent`
  (`:92,162,190`) and `agents/PremiseArchitectAgent`
  (`(this.agent as any).mastra` `:127`, `:191-193`).
- **Impact:** Two tracing/context models to maintain; untyped step boundaries.
- **Change (light, boundary-relevant slice only):** Replace each step `z.any()`
  with explicit `inputSchema`/`outputSchema` from `core/`/`agents` DTOs (flow via
  `getStepResult` inferred types; `agents/__tests__/schema-validation.test.ts`
  already bans `z.any()`). Rely on Mastra Observability (already wired in
  `agents/MastraInstance`) for spans and delete the manual `langfuse`/event-bus
  emission from the workflow (surface step events from `run.stream().fullStream`
  instead of `WORKFLOW_EVENTS`). Remove the `any` casts in
  `ConsistencyAgent`/`PremiseArchitectAgent` by typing their inputs/results.
  **Deferred:** the full §9 kernel/memory/scorer/processor convergence.
- **Effort:** L
- **Verification:** `grep 'z.any' agents/StoryWorkflow` → 0;
  `agents/__tests__/schema-validation.test.ts` + `agents/__tests__/*.e2e` pass;
  workflow no longer imports `WorkflowContext`/`langfuse`; Langfuse traces still
  nest; targeted `npm run eval storyteller` for parity.
- **Depends on:** Item 4.
- **Risk:** correctness-sensitive AI path — keep to low-risk removals; eval-gate.

### [P2] Type the remaining porous client/service boundaries
- **Problem:** `hooks/useStorytellerActions.ts` maps action payloads loosely and
  persists history to `localStorage` (`:75,90`); `core/ConsistencyTypes/*` and
  `config/tool-result-mapper.ts` carry ad-hoc result shapes. Breaks invariant #5.
- **Impact:** Weak compile-time guarantees exactly at the edges that most need
  stability during migration.
- **Change:** Introduce explicit Zod DTOs for action payloads and tool-result
  mapping in `io/storyteller.dto.ts` / `core/`; type the action-history shape.
  Move server-state parts of the action history onto the Item 3 TanStack path;
  keep only ephemeral UI in local state.
- **Effort:** M
- **Verification:** `npm run typecheck`; no `any` in touched files;
  `config/__tests__/tool-result-mapper.test.ts` still green.
- **Depends on:** Item 3.

### [P2] Resolve cross-module `mentions` coupling
- **Problem:** `mentions/MentionsProvider/MentionsProvider.tsx:4-6` imports chat
  internals (`@/domains/chat/components/ChatInterface`,
  `@/domains/chat/mentions/*`). Chat also reaches back into storyteller's barrel
  (`src/domains/chat/components/AgentLog.tsx:29`, `src/domains/chat/types.ts:2`).
  Breaks the cross-module dependency rule (§3).
- **Impact:** Tight two-way coupling; future dependency-lint violations.
- **Change:** Consume `@/domains/chat` via its `index.ts` only (add needed public
  exports to chat's barrel), or extract shared mention primitives to `shared/`.
  Make the storyteller symbols chat needs (`ConsistencyMessage`, `ReferenceText`,
  `hasReferences`, `ConsistencyCheckResult`) explicit public contract items
  (aligns with Item 2).
- **Effort:** M
- **Depends on:** Item 2.
- **Risk:** touches `chat`'s public API — coordinate the two barrels.

### [P2] Split god components/files as they move into the blueprint
- **Problem:** Files exceed the ~400 LOC guidance (invariant #8, verified via
  `wc -l`): `components/ActionApprovalModal/ActionApprovalModal.tsx` (978),
  `components/CharacterWeb/CharacterWeb.tsx` (922),
  `components/CharacterCreationDialog/CharacterCreationDialog.tsx` (889),
  `tools/agent-tools.ts` (730), `agents/StorytellerAgent/StorytellerAgent.ts`
  (639), `components/WorldBible/BibleContext.tsx` (575).
- **Impact:** Hard reviewability, mixed concerns, higher refactor risk.
- **Change:** As each relocates into the blueprint, split into presentation +
  local state hooks + side-effect units with colocated tests and local barrels:
  `BibleContext` shrinks once its queries move (Item 3); `StorytellerAgent`
  extracts prompt/guardrail prose into `prompts/` builders (keep memory bounds +
  Mastra instrumentation); `agent-tools.ts` splits into `agents/tools/<tool>.ts`
  families (feeds Item 7 typing). Do this opportunistically on move, not as a
  separate churn wave.
- **Effort:** L
- **Depends on:** Item 3 (blueprint folders exist).
- **Verification:** no moved unit > ~400 LOC; existing component/tool tests pass.

### [P3] Retire legacy roots into the blueprint (final consolidation)
- **Problem:** After the above, `components/ → ui/`, remaining `hooks/ → state/`,
  `tools/ → agents/tools/`, `config/ → <module>.config.ts` + `core/`,
  `lib/entity-loader → io/`, still need the physical moves + naming cleanup (§4).
- **Change:** Complete folder-per-unit moves, rename to blueprint conventions,
  and enable the dependency-rule lint (§13) so the architecture can't rot.
- **Effort:** L
- **Depends on:** Items 2–8.
- **Verification:** dependency-rule lint green; storyteller scorecard row in
  ARCHITECTURE §14 flips the Barrel/TanStack/Jobs cells.

---

## Legacy-root → blueprint mapping (reference for the moves)

| Legacy root | Target layer | Notes |
| --- | --- | --- |
| `components/` | `ui/` | folder-per-component already; split god files (Item 9) |
| `hooks/` (server data) | `state/queries/` | `useEpisodeData`, `useBibleState`, `useEntity` |
| `hooks/` (ephemeral UI) | `state/useStorytellerUiStore.ts` | optimistic open, URL sync, `useLoadingStates` |
| `hooks/useStorytellerActions` | `state/` + `io/` DTOs | server history → TanStack |
| `db/schema.ts` | `@/db` (`src/db/schema.ts`) | Item 1 — source of truth |
| `lib/access-verification.ts` | `shared/auth` | Item 2 |
| `lib/entity-loader.ts` | `io/` (client fetcher) | used by `useEntities` |
| `services/*` (server) | `services/` + `import 'server-only'` | Item 4 |
| `services/{Poster,Moodboard,BeatImage}*` | `tasks/` + `ui/`/`state/` | Items 4/5 |
| `tools/` | `agents/tools/` | Item 10 |
| `config/*` | `storyteller.config.ts` + `core/` | Item 10 |
| `mentions/` | consume `chat` barrel or `shared/` | Item 8 |
| `core/`, `prompts/` | unchanged | already aligned (core is pure) |

---

## Suggested sequence (first shippable increment first)

1. **Item 1** (schema → `src/db`) — foundation; unblocks the barrel. *First
   shippable, self-contained commit gated by typecheck.*
2. **Item 2** (narrow barrel + deep-import lint) — depends on 1.
3. **Item 3** (layer skeleton + episodes/bible-lock TanStack) — first visible
   architecture win; establishes `io/` + `state/queries/` patterns.
4. **Item 4** (server-only marks + split client services) — cheap, high-signal.
5. **Item 5** (poster/moodboard → Trigger tasks + `useJob`).
6. **Item 6** (thin Mastra workflow + kill `z.any()`) and **Item 7** (type
   boundaries) in parallel.
7. **Item 8** (mentions), **Item 9** (god files), then **Item 10** (final
   consolidation + dependency lint).

**Minimum first increment for review:** Items 1–3 (schema source of truth,
narrowed barrel, first TanStack/`io/` slice) — independently shippable and
low-risk, and it proves the migration shape before the heavier job/AI work.

---

## Deferred / out of scope

- **Full §9 Mastra convergence** — delete `AgentMemory`, add working+semantic
  memory, port judges to live `createScorer`, move guardrails to input/output
  processors, and build one `shared/agent-kernel` lifecycle. Large, cross-module,
  safe only after boundaries are locked; sequence as its own wave (SPEC).
- **Complete file-by-file relocation of every component** — Item 10 finishes the
  moves; only the highest-value hooks/services move in this pass to limit churn.
- **`chat`/`mentions` extraction into `shared/`** — Item 8 unblocks it via public
  barrels; the shared-primitive extraction itself is a follow-on.
- **True relocation of `access-verification` → `shared/auth`** vs. interim seam —
  the import boundary is fixed this run; the physical move to `shared/*` is
  repo-wide.
- **Migration-ownership / RLS reconciliation for the moved schema** — beyond
  landing one Drizzle source of truth (Item 1); tracked under the DB workstream
  (quality-improvement-spec Q-9).
- **Replacing the chat SSE surface** — ARCHITECTURE §7 keeps streaming chat as
  SSE by design; not a cleanup target.
- **New product behavior / World Bible UX redesign** — preservation chosen; out
  of scope.
