### [Critical] Client store performs direct Supabase write
- Location: `src/domains/interior-designer/store/useInteriorStore.ts:1579`
- Divergence: Breaks invariant #2 and the dependency rule: browser/client state code writes to Supabase directly instead of API route → auth → service → Drizzle.
- Cost: Active security and consistency risk; auth/business rules can be bypassed, interior-designer persistence diverges from the canonical server path, and migration to one schema becomes harder.
- Target: Rename/delete/save flows go through `io/` DTO-backed client fetchers into `/api/interior-designer/*`, then `services/` (`server-only`) using Drizzle and shared auth.

### [High] Module shape is far from the blueprint
- Location: module root (`components/`, `store/`, `utils/`, `ai/`, `prompts/`; missing `index.ts`, `ui/`, `state/`, `io/`, `core/`, `services/`, `tasks/`)
- Divergence: Breaks the module blueprint and invariant #6 (`index.ts` as the only public entry point).
- Cost: No clear public API, no enforced layering, and future cleanup will keep getting more expensive because responsibilities are encoded in legacy folders instead of target layers.
- Target: Converge to `index.ts` + `ui/`, `state/`, `io/`, `core/`, `services/`, `tasks/`; asset-module behavior should center on `tasks/`, not ad-hoc `ai/` or `utils/` entry points.

### [High] One 1661-line Zustand god store mixes UI, server state, persistence, jobs, and domain logic
- Location: `src/domains/interior-designer/store/useInteriorStore.ts`
- Divergence: Breaks invariant #1 (server state in TanStack Query, never Zustand) and the layering contract (`state` should not own fetch/write orchestration or server integration).
- Cost: Tight coupling, poor testability, hidden async side effects, harder invalidation/sync, and high change risk for even small edits.
- Target: Keep Zustand only for ephemeral UI state (`mode`, selection, panel/tool toggles); move design lists/current design/job-backed async writes to TanStack Query hooks in `state/queries/`, with fetchers in `io/` and pure transforms in `core/`.

### [High] Bespoke job polling and local recovery in UI instead of shared job primitives
- Location: `src/domains/interior-designer/components/UI/PropertiesPanel.tsx:668-729` and related retexture flow
- Divergence: Breaks invariant #4: long work should be Trigger.dev jobs observed through shared `useJob`, not `setInterval`, ad-hoc status bookkeeping, or client-owned recovery.
- Cost: Fragile async UX, duplicated polling logic, race conditions around status transitions, and inconsistent job observability across modules.
- Target: Represent retexture/export work as module-owned `tasks/*.task.ts`, expose typed job handles, and observe them through shared job hooks/store instead of manual polling in components.

### [High] Cross-module internal imports violate encapsulation and create slice coupling
- Location: `components/DesignManager.tsx`, `components/UI/AssetLibrary.tsx`, `components/UI/PropertiesPanel.tsx`
- Divergence: Breaks the dependency rule and invariant #6 by importing `world-building-toolkit` and `3d-asset-exporter` internals (`store/*`, `components/*`) directly.
- Cost: Interior-designer is coupled to other modules' implementation details, making parallel migrations and lint enforcement difficult.
- Target: Depend only on other modules' `index.ts` public APIs or move shared concerns (project selection, asset browser/upload primitives) into `shared/`.

### [Medium] UI components reach across layers with raw fetches and mutation orchestration
- Location: `components/DesignManager.tsx:42-109`, plus store methods calling `fetch(...)`
- Divergence: Breaks the `ui → state → io → core` rule; `ui` should not orchestrate persistence/load behavior via direct fetches or store singleton calls.
- Cost: Network behavior is scattered between components and Zustand actions, making DTO/versioning/auth changes expensive and error-prone.
- Target: Components call `state/queries` hooks and UI-store actions only; all HTTP moves into `io/<module>.api.ts` with query keys and invalidation centralized.

### [Medium] Typed boundaries are weak or absent
- Location: module-wide; examples include `res.json()` without validation in `DesignManager.tsx` / `useInteriorStore.ts`, `metadata: any` in `components/UI/PropertiesPanel.tsx:705`, and several `any` event/config props in rendering components
- Divergence: Breaks invariant #5 (Zod at boundaries, ban `any` at edges).
- Cost: Runtime shape drift is easy to miss, especially around persisted `sceneData`, job metadata, and API responses.
- Target: Add Zod DTOs in `io/` and shared request/response schemas for design CRUD, retexture jobs, and persisted scene payloads; replace edge `any` with inferred types.

### [Medium] Asset module contains ad-hoc AI/service code instead of task/server layering
- Location: `src/domains/interior-designer/ai/TextureService.ts`, `src/domains/interior-designer/prompts/index.ts`
- Divergence: For an asset module, this moves away from the target: asset modules should lean on `tasks/` and server services, not client-adjacent ad-hoc AI wrappers.
- Cost: The module grows a parallel architecture for AI/external calls, including direct OpenAI fetch logic and an obviously incomplete placeholder implementation.
- Target: Either remove dead/incomplete AI code or relocate real server-side generation logic into `services/` + `tasks/` with typed inputs/outputs; keep prompt constants only if they support those tasks.

## Metadata
- has_ui_surface: no
- has_p0_security_issue: yes
- top_violation_layer: state

## Open questions for Clarify
1. Should project/asset selection remain a dependency on world-building-toolkit via a new public API, or should that shared concern be extracted to `shared/` as part of this cleanup?
2. Is the retexture flow in-scope for the first migration pass, or should it be deferred behind a compatibility wrapper while the design CRUD/state split lands first?
3. Should the incomplete `ai/TextureService.ts` be deleted if unused, or preserved and moved behind server-only task/service seams?

Verdict: The module is still in a pre-blueprint shape; plan the migration around state/persistence boundaries first, then jobs, then public API/folder convergence.

Top 3 gaps to fix first: direct client Supabase write; god Zustand store holding server state and persistence; bespoke polling/cross-module internal coupling.
