# Storyteller architecture review

## North stars already present

- `src/domains/storyteller/agents/MastraInstance/MastraInstance.ts` already centralizes Mastra storage, workspace, and observability. That aligns with `ARCHITECTURE.md` §1.1/§9 and should be preserved.
- The module has strong folder-per-unit discipline in several legacy areas (`components/*`, `agents/*`, `core/*`) with many local `index.ts` files. That is a good substrate for the §4 blueprint migration.
- Storyteller is structurally closer to the target than the other pilot on auth/data-path discipline: most writes still go through API routes plus server-side auth checks, and I did not find browser-side Supabase writes in this module.
- `src/domains/storyteller/hooks/useEntity.ts` is a real TanStack Query foothold and matches the pattern §6 wants generalized.

## Findings

### [High] Storyteller still lacks a curated public barrel, so routes keep importing internals directly
- Location: `src/domains/storyteller/` and `src/app/api/storyteller/*`
- Divergence: Breaks ARCHITECTURE §3/§4/§10 (`index.ts` as the contract; no deep imports of another module's internals).
- Cost: API handlers and other callers stay coupled to folder layout (`agents/StoryWorkflow`, `services/ContextAssemblyService`, `core/WorkflowContext`, etc.), which makes boundary enforcement and safe refactors much harder.
- Target: Add `src/domains/storyteller/index.ts` and route all outside imports through it; keep internals private and only re-export the curated surface.

### [High] App routes still carry domain orchestration and persistence instead of thin HTTP glue
- Location: `src/app/api/storyteller/chat/route.ts`, `src/app/api/storyteller/chat/stream/route.ts`, `src/app/api/storyteller/workflow/resume/route.ts`
- Divergence: Conflicts with ARCHITECTURE §3/§4/§5, where `app/` is glue only and business logic lives in module services/tasks.
- Cost: Route handlers are doing direct DB writes, workflow orchestration, context assembly, access checks, and custom error shaping inline. That spreads behavior across HTTP handlers, makes the module harder to test, and blurs the server boundary the target is trying to enforce.
- Target: Keep routes as adapters that validate input and delegate to module services/agents/tasks via the barrel; move persistence and orchestration into server-only module layers.

### [Medium] Module exports are still broader than the actual public contract
- Location: `src/domains/storyteller/agents/index.ts`, `src/domains/storyteller/lib/access-verification.ts`
- Divergence: Pushes against ARCHITECTURE §4/§10’s curated-surface rule. The agents barrel exports many concrete classes/workflows directly, while `access-verification.ts` contains internal helper surface (`getUserProjects`) that is not part of any explicit module contract.
- Cost: Dead or incidental exports make it harder to tell what is stable versus implementation detail, which increases the chance of accidental deep consumption and slows the eventual barrel-based encapsulation work.
- Target: Shrink exports to the deliberately public API behind `index.ts`; keep internal helpers file-private unless they are truly consumed elsewhere.

### [Medium] Storyteller still has no public contract and has not been reshaped into the §4 slice blueprint
- Location: `src/domains/storyteller/` (entire module), plus external consumers like `src/app/app/[projectId]/storyteller/page.tsx`
- Divergence: Breaks the public-barrel and module-blueprint invariants in §3/§4/§10. There is no `src/domains/storyteller/index.ts`; the top level is still legacy (`components/`, `hooks/`, `lib/`, `db/`, `tools/`, `config/`, `mentions/`) instead of `ui/state/io/core/services/agents/tasks/prompts`.
- Cost: Nothing enforces module boundaries, so callers reach into internals directly. That keeps the slice impossible to encapsulate, makes lint ratcheting hard, and raises the eventual migration from “move imports” to “rewrite dependencies.”
- Target: `src/domains/storyteller/index.ts` becomes the only external entry point; the module converges on the §4 folder set; external imports go through the barrel rather than deep paths.

### [High] Server state bypasses `state/` and `io/`; UI code fetches directly instead of using TanStack Query as the source of truth
- Location: `src/domains/storyteller/hooks/useEpisodeData.ts`, `src/domains/storyteller/hooks/useBibleState.ts`, `src/domains/storyteller/hooks/useStorytellerHydration.ts`, `src/domains/storyteller/components/EpisodeManager/EpisodeManager.tsx`, `src/domains/storyteller/components/CorkBoard/CorkBoard.tsx`, `src/domains/storyteller/components/WorldBible/BibleContext.tsx`, `src/domains/storyteller/components/WorldBiblePanel/WorldBiblePanel.tsx`, `src/domains/storyteller/components/CharacterWeb/CharacterWeb.tsx`
- Divergence: Breaks §4/§5/§6. The target says server state lives in TanStack Query hooks under `state/queries/`, and UI may not talk to `io/` or fetch directly. In practice, most storyteller reads/writes are ad hoc `fetch(...)`, `cachedFetch(...)`, local component state, and URL/localStorage coordination.
- Cost: The slice has multiple partial caches instead of one server-state model, so invalidation is manual, stale data bugs are more likely, and every component re-solves loading/error/sync behavior differently. This also prevents shared DTO validation and keeps the module coupled to route shapes.
- Target: Move reads and mutations behind `io/storyteller.api.ts` + DTOs + query keys, then expose them through `state/queries/*`. Components should render/query/dispatch only; the `useEntity` pattern is the seed to generalize.

### [High] Layer boundaries are inverted: `app/` contains business logic, `core/` is impure, and `services/` is not server-only
- Location: `src/app/api/storyteller/chat/stream/route.ts`, `src/app/api/storyteller/actions/route.ts`, `src/app/api/storyteller/relationships/route.ts`, `src/app/api/storyteller/characters/route.ts`; `src/domains/storyteller/core/CascadeEditor/CascadeEditor.ts`, `src/domains/storyteller/core/EntityExtractor/EntityExtractor.ts`, `src/domains/storyteller/lib/entity-loader.ts`; `src/domains/storyteller/services/MoodboardGenerationService.ts`, `src/domains/storyteller/services/PosterGenerationService.ts`, `src/domains/storyteller/services/BeatImageService.ts`; `src/app/app/[projectId]/storyteller/page.tsx`
- Divergence: Breaks the dependency rule in §3/§5. `app/` is supposed to be thin glue, `core/` is supposed to be pure, and `services/`/`agents/`/`tasks/` are supposed to be server-only. Instead, several routes are god routes with domain logic, merging, orchestration, and persistence inline; `core/CascadeEditor` performs `fetch()` calls and uses `Date.now()`; `core/EntityExtractor` and `lib/entity-loader` depend on UI-layer `ReferenceText` types; and the `services/` folder contains client-side polling/orchestration code imported into a client page.
- Cost: Responsibilities are split by historical convenience rather than architecture. That makes routes hard to test in isolation, prevents reusing business logic consistently, turns `core` into runtime code, and muddies which code is safe to import on the client.
- Target: Keep `app/` as request parsing + auth + service invocation + response mapping, keep `core/` pure data-in/data-out, and move client helpers out of `services/`. True server layers should be bundler-guarded with `server-only`.

## Architecture verdict
Storyteller is the right pilot because it already has good internal discipline and a real Mastra core, but today it is still a pre-blueprint hybrid rather than the canonical vertical slice.

Top 3 structural gaps: missing module contract/blueprint, direct UI/server-state coupling instead of `state`+`io`, and a parallel custom async/AI orchestration stack beside Mastra/Trigger.