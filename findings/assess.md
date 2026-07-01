### [Critical] Module blueprint is almost entirely legacy-shaped
- Location: `src/domains/interior-designer/` top level
- Divergence: Breaks the module blueprint in `ARCHITECTURE.md` §4: there is no public `index.ts`, and the module uses `components/`, `store/`, `utils/`, `ai/` instead of `ui/`, `state/`, `io/`, `core/`, `services/`, `tasks/`.
- Cost: Responsibilities are collapsed into ad-hoc folders, making it hard to separate client state, client/server I/O, pure domain logic, and long-running jobs; every future cleanup becomes a risky file-by-file archaeology project.
- Target: Reshape into the canonical asset-module skeleton with `index.ts`, `ui/`, `state/`, `io/`, `core/`, `services/`, and `tasks/` (no `agents/` needed), with folder-per-unit naming and local barrels.

### [Critical] Browser→Supabase write still exists inside the Zustand store
- Location: `src/domains/interior-designer/store/useInteriorStore.ts:1579-1597`
- Divergence: Breaks invariant #2 / first-principles §2.4: no browser→Supabase writes; all writes must go through API → `requireAuth()` → Service → Drizzle.
- Cost: This is an active security/consistency hole: auth and authorization depend on client-side Supabase usage, the write path bypasses the module’s server boundary, and persistence logic is now split between API routes and direct browser DB access.
- Target: Move rename/update/delete/create/load persistence behind typed `io/*.api.ts` calls to authenticated API routes, with all DB work in server-only `services/*Service.ts` over Drizzle.

### [High] One 1661-line Zustand store mixes UI state, server state, persistence, job orchestration, and domain types
- Location: `src/domains/interior-designer/store/useInteriorStore.ts`
- Divergence: Breaks invariant #1 and the dependency rule: Zustand should hold ephemeral UI state only, while server state belongs in TanStack Query and persistence belongs behind `io/` and `services/`.
- Cost: The store currently owns remote fetch/save/load/delete flows, scene persistence flags, undo history, and domain entities (`walls`, `surfaces`, `objects`) all in one place, so cache invalidation, testing, and incremental migration are all difficult.
- Target: Split into `state/useInteriorUiStore.ts` for ephemeral UI only, TanStack hooks under `state/queries/` for designs/jobs/assets, DTO/fetch logic under `io/`, and pure scene transforms/types under `core/`.

### [High] Long-running work is tracked with bespoke polling, localStorage, and a global status store instead of Trigger Realtime + shared jobs hooks
- Location: `components/UI/PropertiesPanel.tsx:533-669, 672-729, 962-1053`; `components/UI/SurfaceProperties.tsx:239-299`; `store/useInteriorStore.ts`; `components/UI/Toolbar.tsx:44-45`
- Divergence: Breaks invariant #4: long work must be Trigger.dev jobs observed via shared `useJob`, with no bespoke polling, `localStorage` recovery, or `window` custom events.
- Cost: Job UX is scattered across polling loops and ad-hoc operation metadata, making retries, reconnects, and progress behavior inconsistent and hard to reuse across asset workflows.
- Target: Co-locate long-running generation/export flows in module `tasks/*.task.ts`, expose typed job handles through `io/`, and observe them via shared Trigger Realtime/job primitives rather than per-component polling.

### [High] UI components call APIs directly and reach into cross-module internals
- Location: `components/DesignManager.tsx`, `components/UI/PropertiesPanel.tsx`, `components/UI/SurfaceProperties.tsx`, `components/UI/AssetLibrary.tsx`
- Divergence: Breaks the dependency rule and invariant #6: `ui/` should not fetch directly, and modules must not import another module’s internals except via its public barrel.
- Cost: Client components are tightly coupled to `/api/interior-designer/*`, `world-building-toolkit/store/useWorldStore`, `world-building-toolkit/components/AssetsPanel`, and `3d-asset-exporter/components/AssetUploadZone`, so the module cannot be encapsulated or lint-enforced.
- Target: Move remote calls to `state/queries/*` + `io/*.api.ts`, introduce `src/domains/interior-designer/index.ts`, and replace deep cross-module imports with public-barrel or `shared/` contracts.

### [High] Asset-module server concerns are misplaced in `ai/` and client files; there is no server-only services/tasks layer
- Location: `src/domains/interior-designer/ai/TextureService.ts`; entire module lacks `services/` and `tasks/`
- Divergence: Breaks the asset-module contract in §4 and the “server-only” rule: asset modules should lean on `tasks/`, while server integrations belong in `services/` with `import 'server-only'`.
- Cost: External AI/network logic is hard to reason about, and the module has no clear place for authenticated server orchestration, task payload schemas, or reusable service boundaries.
- Target: Replace `ai/` with server-only `services/` for provider calls and `tasks/` for long-running work; keep prompts/config isolated if still needed, but treat them as implementation details behind typed server boundaries.

### [Medium] Typed boundaries are weak at the exact edges that need strict schemas
- Location: `components/UI/Toolbar.tsx:42`; `components/UI/PropertiesPanel.tsx:705`; `components/SculptableSurface.tsx:23,26,544`; `components/SurfaceManager.tsx:146`; `components/tools/TerrainTool.tsx:117`; `ai/TextureService.ts:33-34`
- Divergence: Breaks invariant #5: boundaries should use Zod DTOs and inferred types, not `any` and unvalidated JSON shapes.
- Cost: Task status payloads, geometry/config props, and API responses can drift silently at runtime, which is especially risky during a structural migration.
- Target: Define `*.dto.ts` schemas for requests/responses/job payloads, move domain configs into typed `core/`, and remove `any` from event/API/task edges.

### [Medium] Several files already violate the size guardrails and concentrate too many responsibilities
- Location: `store/useInteriorStore.ts` (1661 LOC), `components/UI/PropertiesPanel.tsx` (1323 LOC), `components/SculptableSurface.tsx` (585 LOC)
- Divergence: Breaks invariant #8: components should stay under ~400 LOC, and god files should be split by responsibility.
- Cost: The biggest migration risks are concentrated in a few monoliths that mix persistence, job orchestration, rendering rules, and UI controls, making safe refactors slower and harder to verify.
- Target: Split by architecture seam while migrating: query hooks and job logic out of panels, pure mesh/terrain logic into `core/`, and persistence/actions into `io/` + `services/` + `tasks/`.

## Metadata
- has_ui_surface: yes
- has_p0_security_issue: yes
- top_violation_layer: state

## Open questions for Clarify
- Should this cleanup include moving shared asset/library integrations out of `interior-designer` into `shared/`, or is that limited to replacing deep imports with public barrels for now?
- Are user-supplied third-party API keys (currently read from `localStorage`) in scope for this migration, or should the first pass only remove direct Supabase/browser persistence and bespoke polling?
- Should the large monolithic UI panels be structurally split in this increment, or only enough to establish `state/io/services/tasks` seams while preserving the current UI composition?

Verdict: interior-designer is still far from the target asset-module architecture; plan should start with the data/state boundary, because the current store owns persistence, jobs, and UI at once.
Top 3 gaps: direct browser→Supabase write in `useInteriorStore`, monolithic Zustand store mixing server and UI state, and missing `io/services/tasks/index.ts` architecture contract.