Implemented the approved minimum increment for `interior-designer`.

Files created
- `src/domains/interior-designer/index.ts`
- `src/domains/interior-designer/interior-designer.config.ts`
- `src/domains/interior-designer/ui/InteriorDesignerWorkspace/InteriorDesignerWorkspace.tsx`
- `src/domains/interior-designer/ui/InteriorDesignerWorkspace/index.ts`
- `src/domains/interior-designer/ui/index.ts`
- `src/domains/interior-designer/state/index.ts`
- `src/domains/interior-designer/state/queries/index.ts`
- `src/domains/interior-designer/io/interior-designer.dto.ts`
- `src/domains/interior-designer/io/interior-designer.api.ts`
- `src/domains/interior-designer/io/interior-designer.keys.ts`
- `src/domains/interior-designer/io/index.ts`
- `src/domains/interior-designer/core/index.ts`
- `src/domains/interior-designer/services/index.ts`
- `src/domains/interior-designer/tasks/index.ts`
- `src/domains/interior-designer/__tests__/interior-designer.dto.test.ts`

Files modified
- `src/app/app/[projectId]/interior-design/page.tsx`
- `src/domains/interior-designer/store/useInteriorStore.ts`
- `src/domains/interior-designer/components/DesignManager.tsx`
- `src/domains/interior-designer/components/UI/PropertiesPanel.tsx`
- `src/domains/interior-designer/components/UI/SurfaceProperties.tsx`
- `src/app/api/interior-designer/designs/route.ts`
- `src/app/api/interior-designer/texture/route.ts`
- `src/app/api/interior-designer/textures/route.ts`
- `src/app/api/interior-designer/retexture/route.ts`
- `src/app/api/interior-designer/retexture/[runId]/route.ts`
- `src/app/api/interior-designer/text-to-3d/route.ts`
- `src/app/api/interior-designer/text-to-3d/[taskId]/route.ts`
- `src/app/api/interior-designer/material/route.ts`
- `src/app/api/interior-designer/material/[taskId]/route.ts`

What changed
- Replaced the browser-side Supabase rename write with the authenticated `PATCH /api/interior-designer/designs` path.
- Added the module barrel and seam folders/barrels for `ui/`, `io/`, `state/`, `state/queries/`, `core/`, `services/`, and `tasks/`.
- Extracted the current route shell into `InteriorDesignerWorkspace` so the app route now imports the module through `@/domains/interior-designer`.
- Added shared Zod DTOs for designs, texture, textures, retexture, text-to-3d, and material routes.
- Added a typed `interiorDesignerApi` client and query-key factory.
- Rewired current runtime calls in the store and legacy components to use the typed io client instead of ad hoc `fetch(...)`.
- Updated the interior-designer API routes to parse requests and shape responses with the shared DTOs.
- Added DTO parse tests.

Verification
- `npx vitest run src/domains/interior-designer/__tests__/interior-designer.dto.test.ts` ✅
- `node scripts/fabro-verify.mjs` ✅
  - scoped typecheck clean
  - eslint passes the gate, but there are pre-existing warnings in touched legacy files
- Quick grep checks:
  - no `supabaseClient` / `getSupabaseClient` references remain in `src/domains/interior-designer`
  - no runtime direct `fetch('/api/interior-designer...')` calls remain in the module; only the existing e2e test still hits the route directly

Deviations from plan
- Small structural extraction: I introduced `InteriorDesignerWorkspace` so the route could consume the new public barrel immediately. This stays within Item 2’s “establish the contract” intent and avoids exposing multiple internals from `app/`.

Deferred work
- Item 4: TanStack Query hooks for design server-state
- Item 6: cross-module internal import cleanup
- All P2/P3 items remain deferred, including store split, AI/task relocation, UI component breakup, and shared job infra migration

Notes
- The scoped verify script passes, but legacy lint warnings remain in `PropertiesPanel.tsx`, `SurfaceProperties.tsx`, `DesignManager.tsx`, the new workspace wrapper, and a few route handlers. I did not widen scope to clean those since they’re outside the approved minimum increment.