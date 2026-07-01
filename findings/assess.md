### [Critical] Module blueprint is still legacy-shaped, not converged on the target slice contract
- Location: `src/domains/storyteller/` top level
- Divergence: Breaks the module blueprint in `ARCHITECTURE.md` §4. The module is organized around `components/`, `hooks/`, `config/`, `db/`, `lib/`, `mentions/`, `tools/` instead of `ui/`, `state/`, `io/`, `core/`, `services/`, `agents/`, `tasks/`, plus `<module>.config.ts`.
- Cost: Keeps responsibilities blurred, makes lintable dependency rules hard to enforce, and increases migration cost because new code has no canonical home.
- Target: Reshape toward `ui/state/io/core/services/agents/tasks/prompts`, with legacy folders retired or mapped cleanly into those layers.

### [Critical] Public barrel leaks internals and server-only surfaces
- Location: `src/domains/storyteller/index.ts`
- Divergence: Breaks the “one barrel” invariant and §4 public API rule. The barrel re-exports `./db/schema`, `./lib/access-verification`, and multiple concrete services/agent internals instead of a curated external contract.
- Cost: External callers can couple directly to persistence and server implementation details, which blocks internal refactors and violates the dependency boundary the architecture depends on.
- Target: `index.ts` should export only approved public UI/hooks/types/task handles; DB schema, private services, and agent internals stay inside the module.

### [High] Client layer is acting as state/io and bypassing TanStack Query
- Location: `hooks/useEpisodeData.ts`, `hooks/useStorytellerActions.ts`, `hooks/useBibleState.ts`, multiple `components/*`
- Divergence: Breaks the dependency rule (`ui → state → io → core`) and invariant #1. Client hooks/components issue raw `fetch('/api/storyteller/...')`, keep remote server data in local React state, and implement ad-hoc caching with `cachedFetch` instead of `state/queries` + typed `io/`.
- Cost: Duplicate fetching logic, manual invalidation, inconsistent cache behavior, harder optimistic updates, and no standard server-state ownership.
- Target: Move browser/server interaction into `io/*.api.ts` + `*.dto.ts`, then expose TanStack hooks in `state/queries/` for episodes, bible lock, actions/mutations, etc. Keep local component state only for ephemeral UI.

### [High] Long-running work still uses bespoke client recovery/event patterns
- Location: `hooks/useBibleState.ts`, `services/PosterGenerationService.ts`, `services/MoodboardGenerationService.ts`
- Divergence: Breaks invariant #4. The module still uses `localStorage`, `window` events / `CustomEvent`, and service-level “resume pending tasks” patterns instead of Trigger.dev task ownership + shared `useJob`/Realtime.
- Cost: Fragile recovery semantics, duplicated job orchestration logic, browser-only coupling, and inconsistent UX across async workflows.
- Target: Long-running poster/moodboard/AI operations should be owned by `tasks/*.task.ts`, observed through shared job primitives, with no custom localStorage/event bus recovery path.

### [High] AI orchestration still runs Mastra and hand-rolled parallel infrastructure side by side
- Location: `agents/StoryWorkflow/StoryWorkflow.ts`, `agents/StorytellerAgent/StorytellerAgent.ts`, `agents/MastraInstance/MastraInstance.ts`, `core/WorkflowContext/*`
- Divergence: Breaks invariant #7 / “use the framework once.” The module uses Mastra workflows/memory/observability, but also manual Langfuse spans, custom workflow event bus/context plumbing, broad prompt-enforced guardrails, and mutable tool wiring.
- Cost: Two tracing/context models to maintain, more failure modes, weaker type guarantees, and a harder path to standardizing agents through the shared kernel.
- Target: Mastra primitives should be the only implementation for tracing/workflows/memory/context where available; storyteller-specific orchestration should thin down into adapters around those primitives.

### [High] Typed boundaries are still porous (`any`, `z.any`, ad-hoc result shapes)
- Location: `agents/StoryWorkflow/StoryWorkflow.ts`, `agents/StorytellerAgent/StorytellerAgent.ts`, `hooks/useStorytellerActions.ts`, `services/ContextAssemblyService.ts`, `core/ConsistencyTypes/*`
- Divergence: Breaks invariant #5 and §4 typed-boundary rules. Representative examples include workflow steps with `inputSchema: z.any()`, `execute(params: any)`, `Record<string, any>` tool maps, and `any`-heavy payload mapping across hooks/services.
- Cost: Weak compile-time guarantees at exactly the boundaries that most need stability, plus brittle runtime assumptions during migration.
- Target: Introduce explicit DTO/schema types for workflow step IO, action payloads, API responses, and service return shapes; remove `any` from edges first.

### [Medium] Server-only boundaries are not marked or consistently enforced
- Location: `src/domains/storyteller/services/*`, `src/domains/storyteller/agents/*`
- Divergence: Breaks §4 server-only rule. Representative services and agents do not include `import 'server-only'`, even when they import DB access or server SDKs.
- Cost: Easier accidental client-bundle imports, weaker architectural signaling, and less protection against boundary regressions.
- Target: All `services/`, `agents/`, and future `tasks/` entry files should be bundler-guarded with `import 'server-only'` where applicable.

### [Medium] Browser auth/session access still reaches Supabase directly
- Location: `hooks/useBibleState.ts`, `components/WorldBible/BibleContext.tsx`
- Divergence: While not a write-path violation, it works against the target’s typed edge/server-gate model and keeps auth retrieval logic duplicated in the client layer.
- Cost: Repeated client auth plumbing, more coupling to Supabase in feature code, and weaker encapsulation around authenticated flows.
- Target: Prefer a shared auth/session abstraction (or server-fed session data) so module UI/state does not directly depend on Supabase helpers.

### [Medium] Some storyteller UI/components are still god files beyond the size limit
- Location: `components/ActionApprovalModal/ActionApprovalModal.tsx` (~978 LOC), `components/CharacterWeb/CharacterWeb.tsx` (~922), `components/CharacterCreationDialog/CharacterCreationDialog.tsx` (~889), `components/EpisodePremisePanel/EpisodePremisePanel.tsx` (~765), `components/AgentLog/AgentLog.tsx` (~696)
- Divergence: Breaks invariant #8 size guidance and makes the target folder-per-unit structure less meaningful.
- Cost: Harder reviewability, more mixed concerns per component, and greater refactor risk during architecture migration.
- Target: Split these into smaller feature units under `ui/` with colocated local barrels/tests and clearer separation between presentation, state hooks, and side effects.

### [Medium] Cross-module internal coupling already exists in storyteller UI
- Location: `mentions/MentionsProvider/MentionsProvider.tsx`
- Divergence: Breaks the cross-module dependency rule. Storyteller reaches into chat internals (`@/domains/chat/components/ChatInterface`, `@/domains/chat/mentions/*`) rather than importing a public `chat` contract or moving shared mention primitives to `shared/`.
- Cost: Tight coupling between modules, harder independent migration, and likely future barrel/lint violations once the rules are enforced.
- Target: Either consume `src/domains/chat/index.ts` only, or extract mention/chat integration primitives used by multiple modules into `shared/`.

## Open questions for Clarify
1. Should this pass include moving storyteller-local `db/` artifacts to the global `src/db` contract now, or should that be deferred behind the “interim server-side compatibility” seam already noted in `index.ts`?
2. Is `mentions/` intended to remain storyteller-owned, or should cross-module mention infrastructure be explicitly moved to `shared/` as part of this cleanup?
3. For long-running poster/moodboard flows, should migration to `tasks/` be in scope for this alignment pass, or treated as a follow-on after the `ui/state/io` reshape?
4. Should `tools/` be folded under `agents/tools/` in this pass to match the blueprint, or left temporarily in place with public imports narrowed first?

Verdict: storyteller is moving toward the target in places, but its public surface and client/server boundaries are still fundamentally legacy.
Top 3 gaps to fix first: blueprint reshaping, barrel/internal boundary cleanup, and TanStack/io migration for client-side server state.