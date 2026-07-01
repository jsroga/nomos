Implemented the minimum increment cleanup for `interior-designer` Items 1–3.

What changed
- `src/app/api/interior-designer/texture/route.ts`
- `src/app/api/interior-designer/material/route.ts`
- `src/app/api/interior-designer/material/[taskId]/route.ts`
- `src/app/api/interior-designer/retexture/route.ts`
- `src/app/api/interior-designer/retexture/[runId]/route.ts`
- `src/app/api/interior-designer/text-to-3d/route.ts`
- `src/app/api/interior-designer/text-to-3d/[taskId]/route.ts`
- `src/domains/interior-designer/io/interior-designer.dto.ts`
- `src/lib/api-utils.ts`
- `src/infrastructure/storage/supabase.ts`
- `src/lib/supabase-admin.ts`

What I did
- Verified Item 1 is already in place:
  - `renameDesign` already uses `interiorDesignerApi.updateDesign(...)`
  - no browser `supabaseClient` / `getSupabaseClient` usage remains in `src/domains/interior-designer`
- Verified Item 2 is already in place:
  - `src/domains/interior-designer/index.ts` is present
  - it exports only the workspace entrypoint and public DTO types
- Finished Item 3 more completely by aligning the API routes to the typed `io/` boundary:
  - request bodies now validate against shared Zod DTOs
  - success payloads now parse through shared response schemas
  - job-status routes now return the shared job-status schema consistently
  - tightened DTOs for Meshy-specific enums:
    - `artStyle`: `'realistic' | 'sculpture'`
    - `topology`: `'triangle' | 'quad'`
  - added a missing Meshy API key guard in `retexture/route.ts`

Small shared fixes needed for scoped checks
- `src/lib/api-utils.ts`
  - removed `req.ip` usage in rate-limit key generation
  - tightened generic defaults from `any` to `unknown`
  - simplified `withRateLimit` handler typing
  - removed an unused constant
- `src/infrastructure/storage/supabase.ts`
- `src/lib/supabase-admin.ts`
  - replaced unsafe record casts with `Reflect.get(...)` in the lazy Proxy wrappers

Validation
- Scoped typecheck passed:
  - `NODE_PATH="$PWD/node_modules" NODE_OPTIONS=--max-old-space-size=4096 npx --yes tsc-files --noEmit $FILES`
- Scoped lint passed:
  - `npx eslint $FILES`
- Confirmed:
  - `grep -rn "getSupabaseClient\|supabaseClient" src/domains/interior-designer` returns nothing

Deviations from plan
- None to the module increment itself.
- I did make 3 minimal shared utility fixes outside `interior-designer` to get changed-file type/lint verification clean.

Deferred work
- Item 4: split `store/useInteriorStore.ts` into `state/` + `state/queries/`
- Item 5: scaffold `services/` + `tasks/` and move one long-running flow to `useJob`
- All P2/P3 items remain deferred per `PLAN.md`

No files were created or deleted.