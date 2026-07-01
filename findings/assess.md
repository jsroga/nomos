### [Critical] Browser-side Supabase write in rename flow
- Location: `src/domains/interior-designer/store/useInteriorStore.ts:1579`
- Divergence: Breaks invariant #2 (`No browser→Supabase writes`) and the module layering rule (`state/` may not import storage/DB clients).
- Cost: Privileged persistence logic lives in the client, bypasses the intended API→auth→service path, and makes future auth/audit/schema changes brittle.
- Target: `state/queries` mutation → `io/interior-designer.api.ts` → `/api/interior-designer/*` → `services/InteriorDesignService.ts` with `requireAuth()` and typed DTOs.

### [High] Module does not match the blueprint and has no public barrel
- Location: module root (`src/domains/interior-designer/`)
- Divergence: Missing canonical `index.ts`, `ui/state/io/core/services/tasks` shape; current structure is `components/`, `store/`, `utils/`, `ai/`, `prompts/`.
- Cost: External code imports internals directly from `app/` and other files, making migration, lint enforcement, and ownership boundaries hard.
- Target: Reshape to the target skeleton with `index.ts` as the only public entry point; move current store/components/utilities into `ui/`, `state/`, `io/`, `core/`, `services/`, `tasks/` as appropriate.

### [High] Monolithic Zustand store mixes UI state, server state, persistence, and domain logic
- Location: `src/domains/interior-designer/store/useInteriorStore.ts` (1661 LOC)
- Divergence: Breaks invariant #1 (`Server state in TanStack Query, never in Zustand`) and the dependency rule (`state/` should not own fetch/persistence orchestration).
- Cost: One god store owns scene entities, async saves/loads, geometry logic, undo state, and UI flags; this blocks testing and makes invalidation/data consistency fragile.
- Target: Keep only ephemeral editor UI in `state/useInteriorDesignerUiStore.ts`; move remote reads/writes into TanStack hooks under `state/queries/`; move pure geometry/terrain transforms into `core/`; move server persistence behind `io/` + `services/`.

### [High] Hand-rolled job polling and browser secret storage bypass the job architecture
- Location: `src/domains/interior-designer/components/UI/PropertiesPanel.tsx`, `src/domains/interior-designer/components/UI/SurfaceProperties.tsx`
- Divergence: Breaks invariants #4 and #6 (`Long work is a Job`, no bespoke polling/localStorage recovery/window events).
- Cost: Repeated `setInterval` polling, localStorage-held API keys/prompts, and UI-managed job bookkeeping create flaky async UX, duplicate logic, and weak operational visibility.
- Target: Long-running texture/retexture/text-to-3d flows should be owned by module `tasks/` and observed through shared job primitives (`shared/jobs/useJob` / Trigger Realtime), with secrets and provider calls server-side only.

### [High] Cross-module internal imports violate encapsulation and dependency boundaries
- Location: `components/DesignManager.tsx`, `components/UI/AssetLibrary.tsx`, `components/UI/PropertiesPanel.tsx`, `components/UI/SurfaceProperties.tsx`
- Divergence: Breaks invariant #6 (`One barrel`) and the rule against importing another module's internals.
- Cost: `interior-designer` directly reaches into `world-building-toolkit/store`, `world-building-toolkit/components`, and `3d-asset-exporter/components`, coupling migrations across slices.
- Target: Consume other modules only through their `index.ts`, or extract shared asset/project primitives into `src/shared/*` when used by 2+ modules.

### [Medium] Oversized UI files are acting as orchestration layers
- Location: `components/UI/PropertiesPanel.tsx` (1323 LOC), `components/UI/SurfaceProperties.tsx` (981 LOC), `components/UI/Toolbar.tsx` (284 LOC)
- Divergence: Violates invariant #8 (size limits) and pushes business/process logic into `ui/`.
- Cost: Panels own request lifecycles, polling, local persistence, operation metadata, and mutation logic, making them difficult to reason about and expensive to split later.
- Target: Break into folder-per-unit UI components backed by hooks in `state/queries` and `io/`, with orchestration moved out of render components.

### [Medium] Asset module carries ad-hoc AI/service code in the wrong place
- Location: `src/domains/interior-designer/ai/TextureService.ts`, `src/domains/interior-designer/prompts/index.ts`
- Divergence: Asset modules should lean on `tasks/`, not ad-hoc `ai/`; current code also bypasses the locked framework stack by calling OpenAI directly from a local class.
- Cost: The module grows a parallel AI path outside the task/service architecture, and the current `TextureService` is visibly incomplete/placeholder-like.
- Target: Move texture generation into typed server services and Trigger tasks; keep prompt/constants only where still needed by that server pipeline.

### [Medium] Typed boundaries are weak at the edges
- Location: `components/UI/PropertiesPanel.tsx:705`, `components/UI/Toolbar.tsx:42`, module-wide lack of `*.dto.ts`
- Divergence: Breaks invariant #5 (`Typed boundaries`) and the blueprint requirement for Zod DTOs in `io/`.
- Cost: `any`-shaped operation metadata, untyped mode setter inputs, and raw `fetch(...).json()` flows make edge contracts easy to break silently.
- Target: Introduce `io/interior-designer.dto.ts` Zod schemas for API/task payloads and responses; replace edge `any` with inferred types.

### [Medium] App layer and module internals are tightly coupled
- Location: `src/app/app/[projectId]/interior-design/page.tsx`
- Divergence: Breaks the topology rule that `app/` should import a module only through its public `index.ts` and contain thin glue.
- Cost: Route code currently imports interior-designer components, store, and utils directly, so any internal reorganization becomes a route refactor too.
- Target: Expose the page-facing surface from `src/domains/interior-designer/index.ts` and keep `app/` as composition-only glue.

## Metadata
- has_ui_surface: yes
- has_p0_security_issue: yes
- top_violation_layer: state

## Open questions for Clarify
- Should `interior-designer` own project/asset selection UI long-term, or should those capabilities move to a shared asset/project surface consumed by multiple modules?
- For texture/retexture/text-to-3d, is the intended migration target Trigger.dev tasks in this module, or shared generation tasks reused with module-specific DTOs?
- Is preserving the current persisted scene JSON shape a hard compatibility requirement, or can the migration normalize it behind new DTOs/services?

Verdict: The module is materially off-architecture; plan should start with state/write-path boundaries before any UI reshuffle.
Top 3 gaps: split the god store, remove client-side Supabase/job polling, add the module barrel + canonical slice structure.
