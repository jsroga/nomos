Implemented the approved minimum increment from `PLAN.md` Items 1–3.

Files created
- `src/domains/interior-designer/index.ts`
- `src/domains/interior-designer/io/interior-designer.dto.ts`
- `src/domains/interior-designer/io/interior-designer.api.ts`
- `src/domains/interior-designer/io/interior-designer.keys.ts`
- `src/domains/interior-designer/ui/InteriorDesignerWorkspace/InteriorDesignerWorkspace.tsx`
- `src/domains/interior-designer/ui/InteriorDesignerWorkspace/index.ts`

Files modified
- `src/domains/interior-designer/store/useInteriorStore.ts`
- `src/domains/interior-designer/components/DesignManager.tsx`
- `src/app/api/interior-designer/designs/route.ts`
- `src/app/app/[projectId]/interior-design/page.tsx`

What changed
- Removed the last browser→Supabase write from `renameDesign`.
  - `useInteriorStore.ts` now routes rename through the existing authenticated `PATCH /api/interior-designer/designs` path.
  - `grep -Rsn "supabaseClient" src/domains/interior-designer` now returns nothing.
- Established a typed `io/` edge.
  - Added shared Zod DTOs for:
    - design summaries/details
    - create/update/delete payloads
    - texture/material/retexture/text-to-3d kickoff/status payloads
  - Added typed fetch wrappers in `interior-designer.api.ts`.
  - Added a query-key factory in `interior-designer.keys.ts`.
- Updated current design persistence callers to use the new typed API layer.
  - `useInteriorStore.ts` now uses `interiorDesignerApi` for create/update/load/delete.
  - `DesignManager.tsx` now uses `interiorDesignerApi.listDesigns()`.
- Added a public module barrel.
  - `src/domains/interior-designer/index.ts` exports only:
    - `InteriorDesignerWorkspace`
    - public DTO/types
  - It does not re-export the store.
- Moved the app route onto the module public surface.
  - `src/app/app/[projectId]/interior-design/page.tsx` is now a thin wrapper that imports `InteriorDesignerWorkspace` from `@/domains/interior-designer`.
  - The new workspace component lives under `ui/`, so app code no longer deep-imports interior-designer internals.
- Updated the designs API route to use shared DTO validation/shaping.
  - `POST` and `PATCH` bodies are validated with shared Zod schemas.
  - list responses are now intentionally summary-shaped
  - detail responses remain full scene payloads

Validation
- Scoped lint:
  - Ran `eslint` on each changed file individually.
  - Result: no new lint errors.
  - Existing warnings remain in `src/domains/interior-designer/store/useInteriorStore.ts` for older unused locals already present outside this increment.
- Scoped typecheck:
  - The prescribed `tsc-files` flow was not usable in this environment (`tsc-files` unavailable / `npx` resolution issue).
  - Full inherited-config `tsc` attempts were OOM-killed by the repo in this container.
  - I still ran isolated temp-tsconfig checks where possible:
    - passed: `io/interior-designer.dto.ts`
    - passed: `io/interior-designer.api.ts`
    - passed: `store/useInteriorStore.ts` after fixing the tuple inference issue
  - Route/barrel/workspace inherited checks are currently blocked by pre-existing transitive type errors in other modules / legacy interior files, not by this increment.

Notable implementation detail
- `designs` list and mutation responses are now summary DTOs (`id`, `name`, `updatedAt`) rather than returning full scene records for those endpoints. Current callers in this increment only use summary fields; detail load still returns full scene data.

Deferred work
- `PLAN.md` Item 4: split the monolithic store into `state/` + `state/queries/`
- `PLAN.md` Item 5: tasks/services + `useJob` migration for long-running work
- P2/P3 items, including:
  - pure `core/` extraction
  - broader folder-per-unit migration
  - cross-module deep import cleanup
  - bespoke polling / `CustomEvent` / `localStorage` job recovery removal

No files deleted.