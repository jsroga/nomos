# Clarify: storyteller architecture alignment

## Summary
The assessment found that `src/domains/storyteller` is still structurally legacy even though parts of it already point toward the target architecture. The highest-risk issues are not isolated style problems: they are boundary problems that affect imports, client/server data flow, long-running job orchestration, and Mastra usage.

The biggest planning choice is whether to treat this pass as a boundary-first migration, a minimal protective cleanup, or a full module reshape. That choice changes sequencing for `index.ts`, TanStack/io migration, Trigger tasks, and AI orchestration.

## Key gaps
1. **Module blueprint mismatch**
   - The module is still organized around legacy roots (`components/`, `hooks/`, `config/`, `db/`, `lib/`, `mentions/`, `tools/`) rather than the target `ui/state/io/core/services/agents/tasks/prompts` blueprint.
   - This is the root reason responsibilities are blurred and architectural lint rules would be hard to enforce.

2. **Public API and dependency boundary leakage**
   - `src/domains/storyteller/index.ts` exposes internal DB and server-only surfaces.
   - External code can couple directly to internals, which makes any deeper refactor more fragile.

3. **Client data flow violates target layering**
   - Hooks/components perform raw fetches, cache remote data locally, and bypass TanStack Query + typed `io/`.
   - This conflicts with the server-state invariant and will multiply migration work if not normalized early.

4. **Async/job flows are still bespoke**
   - Poster/moodboard and related long-running flows still use localStorage, window events, and custom recovery logic instead of module-owned Trigger tasks + shared job primitives.
   - This is a structural mismatch, not just an implementation detail.

5. **AI stack is split between Mastra-native and hand-rolled infrastructure**
   - Storyteller currently uses Mastra while also maintaining parallel tracing/context/workflow conventions and porous typed boundaries (`any`, `z.any`, ad-hoc result maps).
   - A full cleanup that touches agents should deliberately choose whether Mastra convergence is in scope now or deferred behind safer boundary work.

## Scope options for planning

### [A] Staged migration
Assume a boundary-first, architecture-aligned migration that fixes the foundations now and sequences the high-risk reshapes.

What the plan would prioritize:
1. Narrow `index.ts` to a safe public API and identify import fallout.
2. Define the target folder mapping for existing storyteller roots (`components → ui`, `hooks → state/queries`, `tools → agents/tools`, etc.) without requiring every file to move at once.
3. Move browser/server interaction into typed `io/` and TanStack `state/queries/` for the most important server-state flows first.
4. Mark and consolidate server-only surfaces (`services/`, `agents/`, later `tasks/`).
5. Convert bespoke long-running flows to `tasks/` and shared job primitives in a later phase of the same roadmap.
6. Thin storyteller’s custom orchestration around Mastra instead of rewriting every agent path immediately.

Trade-off resolved:
- Avoids a destabilizing full rewrite while still planning for the real architectural gaps instead of papering over them.
- Best if the goal is a credible migration plan with import-safe sequencing.

### [B] Minimal first step
Assume the smallest shippable architecture pass that reduces risk without taking on broad structural migration.

What the plan would prioritize:
1. Lock down `index.ts` and stop exporting internals.
2. Add missing `server-only` guards.
3. Identify and type the worst `any`/`z.any` boundaries.
4. Define, but mostly defer, the `ui/state/io/tasks` reshaping.

What would be explicitly deferred:
- Most folder moves.
- Most TanStack/io migration.
- Trigger task migration for poster/moodboard flows.
- Deep Mastra cleanup and cross-module mention/shared extraction.

Trade-off resolved:
- Fastest path to a smaller, safer plan, but it intentionally leaves the largest architectural drift in place.
- Best only if near-term change risk is more important than meaningful convergence.

### [C] Full blueprint
Assume this pass plans a comprehensive end-state reshape of storyteller to the target module blueprint.

What the plan would include:
1. Full remap of legacy roots into `ui/state/io/core/services/agents/tasks/prompts`.
2. Public API hardening and cross-module import cleanup.
3. TanStack Query + typed `io/` adoption for all major client/server flows.
4. Trigger task ownership for long-running storyteller jobs.
5. Mastra-only orchestration cleanup, including workflow typing and removal of parallel custom infrastructure where the framework already provides a primitive.
6. Component decomposition for major god files as part of the structural move.

Trade-off resolved:
- Produces the cleanest target-state plan, but highest coordination cost and greatest risk of broad import churn.
- Best only if the team is ready to fund a larger migration wave, not just a stabilizing cleanup.

## Module-specific risks to account for in the plan
- **Import fallout risk:** tightening `storyteller/index.ts` may break callers currently importing DB schema or private services directly.
- **Route/API coupling risk:** TanStack/io migration likely touches existing `/api/storyteller/*` assumptions and shared fetch helpers.
- **Job migration risk:** poster/moodboard flows may depend on current recovery semantics; replacing them with Trigger tasks needs deliberate UX/state mapping.
- **AI regression risk:** changing workflow/orchestration seams without phasing could impact observability, memory, or tool wiring.
- **Cross-module risk:** `mentions/` currently reaches into `chat` internals; resolving this may require either public API changes in `chat` or extraction into `shared/`.
- **DB placement risk:** storyteller-local `db/` artifacts may need an interim compatibility seam if they cannot move to `src/db` in the same wave.

## Recommended planning posture
Recommend **[A] Staged migration**.

Why:
- It addresses the real blockers first: public contract, layer boundaries, and server-state ownership.
- It leaves room to sequence risky work like Trigger task migration and Mastra convergence instead of forcing a brittle all-at-once rewrite.
- It is the best fit for storyteller specifically, because this module already has partial architecture-aligned pieces that can be used as anchors during migration.
