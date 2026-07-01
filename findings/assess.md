### [Critical] No single public module API; other modules import storyteller internals directly
- Location: module root; external imports in `src/domains/chat/components/AgentLog.tsx`, `src/domains/chat/types.ts`, many `src/app/api/storyteller/*`
- Divergence: Breaks the module blueprint and invariant #6/#10 (`index.ts` as the only legal import target).
- Cost: Storyteller internals are now de facto public, making any cleanup risky; app/chat code is coupled to component/core file paths instead of a stable contract.
- Target: Add `src/domains/storyteller/index.ts` as the only public surface, then migrate app/chat/cross-module consumers to that barrel and block deep imports with lint.

### [Critical] Layer blueprint is still legacy-shaped, not target-shaped
- Location: `src/domains/storyteller/` top level (`components/`, `hooks/`, `lib/`, `db/`, `tools/`, `mentions/`, `config/`), with no `ui/`, `state/`, `io/`, or `tasks/`
- Divergence: Breaks the canonical module blueprint (§4) and naming/layering contract.
- Cost: Responsibilities are spread across ad-hoc folders, so state, client edge logic, server logic, and agent code are hard to separate and migrate incrementally.
- Target: Converge on `ui/`, `state/`, `io/`, `core/`, `services/`, `agents/`, `tasks/`, `prompts/`, `<module>.config.ts`, with folder-per-unit naming and local barrels.

### [High] “Core” is not pure; it imports UI and prompt-layer types and uses runtime time directly
- Location: `src/domains/storyteller/core/EntityExtractor/EntityExtractor.ts`
- Divergence: Breaks the dependency rule (`core/` may not import React/UI/other layers) and invariant #8 (pure core testable offline).
- Cost: Core logic now depends on `components/ReferenceText` and `prompts/schemas/agent-schemas`, and also stamps `new Date()`, which makes the supposedly pure layer impure and harder to reuse/test.
- Target: Move shared entity/reference DTOs into `core/` or `io/`, keep `core/` free of UI/prompt imports, and inject clocks/metadata instead of calling `Date` directly.

### [High] “Services” contains client-side orchestration, polling, localStorage, and window events
- Location: `src/domains/storyteller/services/MoodboardGenerationService.ts`, `src/domains/storyteller/services/PosterGenerationService.ts`, plus UI helpers in `components/WorldBiblePanel/WorldBiblePanel.tsx`
- Divergence: Breaks the service contract (`services/` must be server-only) and invariant #4 (long work must use Trigger Realtime + shared `useJob`, no bespoke polling/localStorage/window events).
- Cost: Server/client responsibilities are inverted: browser concerns live in `services/`, long-running job UX is bespoke, and recovery/status behavior is scattered across polling loops and custom events.
- Target: Move browser behavior into `state/` + shared jobs hooks, keep `services/` server-only (`import 'server-only'`), and represent Trigger jobs via module `tasks/` plus shared `useJob` rather than local polling.

### [High] Client state and server state are mixed in custom hooks/context instead of TanStack Query
- Location: `src/domains/storyteller/components/WorldBible/BibleContext.tsx`, `src/domains/storyteller/hooks/useBibleState.ts`
- Divergence: Breaks invariant #1 (server state in TanStack Query, never in Zustand/custom stores) and the `state/ -> io/` contract.
- Cost: Fetching lock state and user/session state is handled via `useEffect`, `cachedFetch`, manual invalidation, and URL/window event wiring; this bypasses cache consistency and makes the World Bible UI hard to reason about.
- Target: Move remote reads/writes into `state/queries/*` hooks backed by typed `io/` fetchers and query keys; leave only ephemeral panel/editing state in client state.

### [High] Storyteller keeps a parallel hand-rolled orchestration stack beside Mastra
- Location: `src/domains/storyteller/agents/StoryWorkflow/StoryWorkflow.ts`, `src/domains/storyteller/agents/StorytellerAgent/StorytellerAgent.ts`, `src/domains/storyteller/agents/MastraInstance/MastraInstance.ts`
- Divergence: Breaks invariant #7/#11 (“use the framework once”): manual Langfuse spans, ad-hoc workflow event bus, step `z.any()`, direct tool mutation, prompt-time skill injection despite Workspace already configured.
- Cost: The AI layer pays double complexity for tracing/skills/workflow behavior; correctness depends on manual glue instead of Mastra primitives, which raises migration and debugging cost.
- Target: Let Mastra own tracing, workflow typing, skills access, and agent/tool composition end-to-end; remove manual parallel machinery and replace `z.any()` workflow boundaries with explicit schemas.

### [High] Module-local DB schema is still the effective source of truth and is imported broadly
- Location: `src/domains/storyteller/db/schema.ts`, imported by `src/app/api/storyteller/*`, `src/lib/db.ts`, storyteller tools/services
- Divergence: Breaks repository topology and invariant #3 (single schema source in `src/db/schema.ts`).
- Cost: The schema boundary remains storyteller-owned rather than repo-owned, so the module cannot be cleanly encapsulated and other layers continue to reach through storyteller to touch persistence details.
- Target: Make `src/db/schema.ts` the true source of truth, keep Drizzle access in server services, and stop importing module-local schema files from app routes/tools.

### [Medium] Typed boundaries are still weak, especially in tools and workflow steps
- Location: `src/domains/storyteller/tools/*.ts`, `src/domains/storyteller/agents/StoryWorkflow/StoryWorkflow.ts`, `src/domains/storyteller/core/StoryTypes/StoryTypes.ts`
- Divergence: Breaks invariant #5 (Zod at edges, ban `any` at boundaries).
- Cost: Tool inputs/outputs and workflow step contracts are loosely typed (`execute(args: any)`, `z.any()`, `Record<string, any>`), which increases runtime drift and makes refactors unsafe.
- Target: Replace boundary `any` with strict Zod DTOs and inferred types, especially for Mastra tools, workflow steps, and story-plan payloads.

### [Medium] Several files are already past the architecture size guardrails
- Location: `components/WorldBible/BibleContext.tsx` (575 LOC), `agents/StorytellerAgent/StorytellerAgent.ts` (639 LOC), `tools/agent-tools.ts` (730 LOC)
- Divergence: Breaks invariant #8 (components < ~400 LOC; split god files).
- Cost: The largest files now concentrate multiple responsibilities, which will make the migration to the target layers slower and riskier.
- Target: Split by responsibility while moving to the new folders: query hooks/DTOs out of Bible context, prompt-building out of `StorytellerAgent`, and tool families into smaller typed units under `agents/tools` or `services`.

## Open questions for Clarify
- Should storyteller’s existing `components/` and `hooks/` be renamed/moved in one structural pass first, or can the migration proceed incrementally behind a new `index.ts` contract?
- Is the World Bible lock/session UX allowed to change to fit TanStack Query + typed API boundaries, or must current URL/custom-event behaviors be preserved exactly during migration?
- Should long-running image generation in storyteller be fully moved onto shared `useJob`/Trigger Realtime in this cleanup scope, or only prepared structurally for a later migration?

Verdict: storyteller is pointed at the right architecture concepts, but its current public boundaries and client/server layering are still too legacy-shaped to plan implementation safely without first enforcing the module contract.
Top 3 gaps: missing public `index.ts` contract, legacy folder/layer shape (`components/hooks/db/tools` instead of `ui/state/io/tasks`), and bespoke client/job orchestration living outside TanStack Query + shared Trigger/Mastra primitives.
