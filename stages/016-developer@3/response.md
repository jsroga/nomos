Status: the approved minimum-first increment for `interior-designer` is already present on this branch, so I did not apply any new code changes in this pass.

What’s already implemented
- P0 rename fix
  - `src/domains/interior-designer/store/useInteriorStore.ts`
  - `renameDesign` now calls `interiorDesignerApi.updateDesign({ id, name })`
  - no direct browser Supabase client usage remains in `src/domains/interior-designer`
- Public module barrel
  - `src/domains/interior-designer/index.ts`
  - exports the minimal public surface (`InteriorDesignerWorkspace` + DTO types)
- Typed `io/` edge
  - `src/domains/interior-designer/io/interior-designer.api.ts`
  - `src/domains/interior-designer/io/interior-designer.keys.ts`
  - `src/domains/interior-designer/io/interior-designer.dto.ts`
  - shared DTOs are wired into the designs route:
    - `src/app/api/interior-designer/designs/route.ts`
  - and follow-on route validation was also aligned for:
    - `src/app/api/interior-designer/texture/route.ts`
    - `src/app/api/interior-designer/material/route.ts`
    - `src/app/api/interior-designer/material/[taskId]/route.ts`
    - `src/app/api/interior-designer/retexture/route.ts`
    - `src/app/api/interior-designer/retexture/[runId]/route.ts`
    - `src/app/api/interior-designer/text-to-3d/route.ts`
    - `src/app/api/interior-designer/text-to-3d/[taskId]/route.ts`

Verification
- Passed:
  - `grep -RIn "supabaseClient|getSupabaseClient" src/domains/interior-designer` → no matches
  - `grep -RIn "@/domains/interior-designer/" src --exclude-dir=interior-designer` → no external deep imports
  - scoped `eslint` on the minimum-increment files → no errors, only pre-existing warnings in `useInteriorStore.ts`
- Blocked:
  - scoped TypeScript checks still hit the same 4GB OOM as the verify stage, even with a temp tsconfig narrowed to the interior-designer files
  - that matches the existing repo-level typecheck memory blocker; I did not change repo-wide TS config because it’s outside the approved Items 1–3 increment

Files created/modified/deleted in the implemented increment
- Created
  - `src/domains/interior-designer/index.ts`
  - `src/domains/interior-designer/io/interior-designer.api.ts`
  - `src/domains/interior-designer/io/interior-designer.keys.ts`
- Modified
  - `src/domains/interior-designer/store/useInteriorStore.ts`
  - `src/domains/interior-designer/io/interior-designer.dto.ts`
  - `src/app/api/interior-designer/designs/route.ts`
  - `src/app/api/interior-designer/texture/route.ts`
  - `src/app/api/interior-designer/material/route.ts`
  - `src/app/api/interior-designer/material/[taskId]/route.ts`
  - `src/app/api/interior-designer/retexture/route.ts`
  - `src/app/api/interior-designer/retexture/[runId]/route.ts`
  - `src/app/api/interior-designer/text-to-3d/route.ts`
  - `src/app/api/interior-designer/text-to-3d/[taskId]/route.ts`
- Deleted
  - none

Deviations from plan
- None in scope for the minimum increment.
- No P2/P3 work was implemented.

Deferred work
- Item 4: split `useInteriorStore` into `state/` UI store + `state/queries/` server state
- Item 5: introduce `services/` + `tasks/` and move one async flow to `useJob`
- Items 6–8 remain deferred as planned

If you want, I can next tackle the verify blocker separately as a repo-wide TypeScript memory issue, but I left that untouched here because it is outside the approved `interior-designer` minimum increment.