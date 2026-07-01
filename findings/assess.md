### [Critical] Browser-side Supabase write bypasses the required server/service path
- Location: `src/domains/interior-designer/store/useInteriorStore.ts:1579`
- Divergence: Breaks invariant #2 (`No browser→Supabase writes`) and the `services/` server-only contract.
- Cost: Auth and write policy are split between browser code and server routes, making security/correctness dependent on client behavior and blocking clean Drizzle ownership.
- Target: All design writes go through typed `io/` calls to `/api/interior-designer/*` → `requireAuth()` → server-only `services/` using Drizzle; the Zustand store only triggers those mutations.

### [High] Module shape is still legacy and lacks the canonical public barrel
- Location: `src/domains/interior-designer/` top level (`ai/`, `components/`, `store/`, `utils/`) with no `index.ts`, `ui/`, `state/`, `io/`, `core/`, `services/`, or `tasks/`
- Divergence: Breaks the module blueprint in `docs/unified/ARCHITECTURE.md` §4 and invariant #6 (`One barrel`).
- Cost: There is no stable public contract, and responsibilities are spread across ad-hoc folders that make migration, lint enforcement, and cross-module reuse risky.
- Target: Reshape to the blueprint with `index.ts` as the only public surface, `ui/state/io/core/services/tasks`, and folder-per-unit naming.

### [High] The module keeps nearly all server state, persistence, and UI state in one giant Zustand store
- Location: `src/domains/interior-designer/store/useInteriorStore.ts` (1661 LOC)
- Divergence: Breaks invariant #1 (`Server state in TanStack Query, never in Zustand`) and the dependency rule (`state -> io`, not direct fetch/Supabase/persistence logic).
- Cost: Remote data, save/load flows, undo history, selection state, and long-job coordination are tightly coupled, which makes caching, invalidation, and incremental refactors hard.
- Target: Keep Zustand only for ephemeral UI/editor state; move remote reads/writes into `state/queries/*` backed by typed `io/*.api.ts` + query keys, and move pure geometry/business rules into `core/`.

### [High] Long-running work uses bespoke polling, localStorage, and window events instead of module-owned jobs
- Location: `components/UI/PropertiesPanel.tsx`, `components/UI/SurfaceProperties.tsx`, `components/UI/Toolbar.tsx`
- Divergence: Breaks invariant #4 (`Long work is a Job`) and the asset-module rule to lean on `tasks/` + shared jobs infrastructure.
- Cost: Job status recovery, progress, and retries are scattered across polling loops, local browser storage, and `CustomEvent` signaling, which is brittle and inconsistent with Trigger.dev Realtime.
- Target: Represent retexture/material/text-to-3d flows as module `tasks/*.task.ts`, surface them through shared `useJob`, and remove bespoke interval polling/localStorage recovery/event buses from components.

### [High] UI components call fetch directly and reach into other modules’ internals
- Location: `components/DesignManager.tsx`, `components/UI/PropertiesPanel.tsx`, `components/UI/SurfaceProperties.tsx`, `components/UI/AssetLibrary.tsx`
- Divergence: Breaks the dependency rule (`ui` should not call `io`/fetch directly) and invariant #6 (`One barrel`; no cross-module internal imports).
- Cost: The UI layer is coupled to API URLs and deep paths like `world-building-toolkit/store/useWorldStore` and `3d-asset-exporter/components/AssetUploadZone`, so module boundaries cannot be enforced.
- Target: UI imports only this module’s `state/` hooks and shared primitives; cross-module usage goes through each module’s `index.ts`; network calls move behind typed `io/` and query/mutation hooks.

### [Medium] Asset-module server work is misplaced under `ai/`/`prompts/` and not expressed as services/tasks
- Location: `src/domains/interior-designer/ai/TextureService.ts`, `src/domains/interior-designer/prompts/index.ts`
- Divergence: Breaks the target blueprint for asset modules, which should skip `agents/` and lean on `services/` + `tasks/`.
- Cost: Server concerns are hard to reason about, and module intent is muddy: prompt handling and external API orchestration sit outside the target server layers.
- Target: Move prompt/texture orchestration into server-only `services/` and Trigger tasks, with Zod-typed DTOs at the API/task boundaries.

### [Medium] Typed boundaries are weak in the highest-risk job/UI paths
- Location: `components/UI/PropertiesPanel.tsx:705`, `components/SurfaceManager.tsx:146`, `components/SculptableSurface.tsx`, `components/UI/Toolbar.tsx`, tests and helper props across `components/`
- Divergence: Breaks invariant #5 (`Typed boundaries`) and signals that DTOs/contracts are not centralized.
- Cost: Job metadata and event payloads are free-form, making refactors of retexture/text-to-3d/material flows risky and increasing runtime-only failures.
- Target: Define Zod DTOs in `io/*.dto.ts` (and task payload schemas), infer types from them, and remove `any` from component/job boundaries.

### [Medium] Several files are already past the architecture size limits and combine multiple responsibilities
- Location: `store/useInteriorStore.ts` (1661 LOC), `components/UI/PropertiesPanel.tsx` (1323 LOC), `components/UI/SurfaceProperties.tsx` (981 LOC)
- Divergence: Breaks invariant #8 (size guardrails) and makes the migration harder.
- Cost: Large files currently mix rendering, async orchestration, persistence, and editor logic, so even small changes have high regression risk.
- Target: Split by target layer/responsibility while migrating: query/mutation hooks into `state/queries`, typed fetchers into `io`, pure transforms into `core`, and narrower UI units under `ui/`.

## Metadata
- has_ui_surface: yes
- has_p0_security_issue: yes
- top_violation_layer: state

## Open questions for Clarify
- Should this cleanup also create/standardize public barrels for `world-building-toolkit` and `3d-asset-exporter`, or should interior-designer temporarily adapt around their current deep-import surfaces?
- Is preserving the current local draft persistence/undo behavior in Zustand a hard requirement during this increment, or can it be reduced to pure UI state while remote scene data moves to TanStack Query?
- For the Meshy/Stability/OpenAI API-key flows currently sourced from `localStorage`, should this increment only restructure the architecture, or also move credential handling fully server-side?

Verdict: interior-designer is still far from the target module contract and is actively violating the most important state/job/security invariants, so planning should start with boundary and state-layer cleanup rather than UI polish.
Top 3 gaps: browser→Supabase write path, monolithic Zustand store mixing server + UI state, and bespoke long-job orchestration instead of module `tasks/` + shared job primitives.
