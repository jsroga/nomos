# Clarify — decisions needed before planning

## Summary
The assessment found that `src/domains/storyteller` is still materially off the target module blueprint: it lacks a single public `index.ts`, still uses legacy top-level folders, mixes client/server responsibilities, keeps server state outside TanStack Query, and runs a parallel hand-rolled orchestration layer beside Mastra. A good plan is possible now, but the architect still needs human direction on migration breadth, compatibility constraints, and whether to include the highest-risk subsystems (World Bible state/job flows, DB/schema convergence, and Mastra cleanup) in this run or stage them.

## Open questions

### Q1: Should planning target a staged migration or a one-pass blueprint reshape?
- **Context:** The biggest structural gap is the lack of a public module contract plus the legacy folder layout (`components/`, `hooks/`, `db/`, `tools/`, etc.). The architect can either plan around a compatibility-first shell or assume broader moves/renames up front.
- **If we guess wrong:** A too-big plan may create long-lived breakage across `app/` and `chat` imports; a too-small plan may preserve the legacy shape so long that later cleanup gets more expensive.
- **Option A (Recommended defaults):** Plan a staged migration led by a new `src/domains/storyteller/index.ts`, then move internals behind that contract in prioritized slices.
- **Option B (First increment):** Limit the first plan to import-boundary cleanup plus the minimum folder moves needed to stop new deep imports.
- **Option C (Full migration):** Plan a full blueprint reshape of storyteller folders/layers in one coordinated effort.
- **Custom:** Define your own rule for how aggressive structural moves may be in this run.

### Q2: How strictly must existing Storyteller UI behavior be preserved during the World Bible/state cleanup?
- **Context:** The assessment found server state mixed into custom hooks/context, plus lock/session behavior tied to URL wiring and custom events. Moving this to `state/queries` + `io/` may expose behavior differences unless compatibility is explicitly preserved.
- **If we guess wrong:** We could either freeze poor UX patterns for too long or accidentally change editing/locking flows that users rely on.
- **Option A (Recommended defaults):** Preserve user-visible behavior where practical, but allow internal state/query rewiring and removal of undocumented implementation details.
- **Option B (First increment):** Keep current World Bible behaviors fully intact for now; only isolate boundaries and prepare TanStack Query migration.
- **Option C (Full migration):** Allow the plan to redesign World Bible state flows to match the blueprint even if some URL/custom-event behavior changes.
- **Custom:** Specify exact Storyteller behaviors that are contractually fixed vs safe to change.

### Q3: Should long-running storyteller jobs be included in scope now, or only prepared structurally?
- **Context:** Image-generation flows currently rely on bespoke polling, `localStorage`, and `window` events instead of Trigger Realtime + shared `useJob`. This is a major architecture violation, but also a high-risk UX path.
- **If we guess wrong:** Deferring too much leaves one of the largest blueprint violations untouched; forcing full job migration now could dominate the entire cleanup plan.
- **Option A (Recommended defaults):** Include job-flow alignment in the plan, but as a later priority after module boundary and state-layer fixes.
- **Option B (First increment):** Only create the structural seams (`tasks/`, server-only services, typed payloads) and defer the shared `useJob` UX migration.
- **Option C (Full migration):** Make full Trigger.dev + shared `useJob` replacement part of this cleanup plan.
- **Custom:** Set a narrower or broader scope for job orchestration changes.

### Q4: Should the plan include DB/schema convergence out of `src/domains/storyteller/db/schema.ts` now?
- **Context:** The assessment found storyteller’s module-local schema still acting as an effective source of truth and being imported from routes/services/tools. The architecture requires `src/db/schema.ts` to be the single source of truth.
- **If we guess wrong:** Deferring schema convergence may keep cross-layer leakage in place; forcing it now could expand the plan into a repo-wide persistence migration rather than a module cleanup.
- **Option A (Recommended defaults):** Plan schema convergence as a dedicated workstream, but sequence it after public API and layer-boundary cleanup.
- **Option B (First increment):** Reduce new schema coupling and add adapter boundaries, but defer true source-of-truth migration.
- **Option C (Full migration):** Include full schema-source convergence and route/service import cleanup in this run’s plan.
- **Custom:** Define whether storyteller may temporarily keep a compatibility schema layer.

### Q5: How much Mastra-native consolidation should this cleanup plan absorb?
- **Context:** Storyteller already uses Mastra, but also keeps manual tracing, skill loading, loose workflow typing, and other parallel orchestration machinery. The architecture strongly prefers “use the framework once.”
- **If we guess wrong:** Under-scoping leaves the most complex technical debt in place; over-scoping may turn a module cleanup into a deep AI-platform refactor.
- **Option A (Recommended defaults):** Plan Mastra consolidation where it directly reduces storyteller-local complexity (typed tool/workflow boundaries, remove obvious parallel primitives), but do not require a full shared-kernel rewrite first.
- **Option B (First increment):** Restrict this run to typed boundaries and local cleanup; defer broader Mastra consolidation to a later dedicated AI-platform pass.
- **Option C (Full migration):** Make end-to-end Mastra-native tracing/skills/workflow consolidation a core part of the storyteller cleanup plan.
- **Custom:** Specify which orchestration concerns are in or out of scope.

## Gate guide (maps to Clarify dock buttons)
| Button | Meaning for THIS run |
| --- | --- |
| [A] Recommended defaults | Produce a prioritized, staged plan: establish `storyteller/index.ts`, stop deep imports, reshape layers incrementally, preserve visible behavior where practical, and sequence jobs/schema/Mastra cleanup after boundary fixes. |
| [B] First increment only | Produce a narrow first-step plan focused on public API/import boundaries and minimum-risk structural seams, explicitly deferring major World Bible, job, schema, and Mastra rewrites. |
| [C] Full blueprint migration | Produce a comprehensive end-state plan that assumes storyteller should be fully reshaped to the module blueprint, including job orchestration, schema convergence, and major Mastra consolidation. |
| [F] Custom directions | You provide your own migration constraints, compatibility requirements, or subsystem scope rules for the architect to follow. |
| [R] Re-assess | Re-run assessment only if you believe the findings missed major context or code has changed enough to invalidate them. |
