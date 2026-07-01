# Decisions log

## Clarify gate (resolved)
- Question: How much should the cleanup plan take on?
- Selected: **[A] Staged migration — boundaries first, bigger moves sequenced**
- Freeform text: (none)

### In scope (per Option A, staged)
1. Restore safe boundaries first: kill the one browser→Supabase write, add
   `index.ts`, `io/` (DTOs/fetchers/keys), and pull server state out of the god
   store into `state/queries/` TanStack hooks; formalize server writes behind a
   `services/` seam.
2. Then sequence the bigger async move: co-locate the existing retexture /
   text-to-3d / material Trigger tasks under module `tasks/` as `schemaTask`s.
3. Then clean cross-module seams (deep imports of `world-building-toolkit` /
   `3d-asset-exporter`) and leftover legacy AI/util code.

### Explicitly deferred (not this pass)
- Full Trigger **Realtime + `useJob`** migration of the job flows — blocked on
  `shared/jobs` / `useJob`, which **do not exist yet** in the repo (SPEC §P1
  cross-module infra). Client polling stays until that lands.
- Splitting god UI components (`PropertiesPanel` 1323 LOC, `SurfaceProperties`
  981 LOC) below the ~400 LOC target — tracked as P3, not required for
  increment 1.
- Extracting shared project-selection / asset-browser primitives into `shared/`
  (only unblock via public `index.ts` first).

## Corrections to findings/assess.md (verified during spot-checks)
- **P0 is narrower than assessed.** Only `renameDesign`
  (`store/useInteriorStore.ts:1580-1586`) does a direct browser Supabase write.
  Save/load/list/delete already go through `/api/interior-designer/designs`
  (`requireAuth()` + Drizzle). The target `PATCH` endpoint already exists and
  already updates `name` with auth (`designs/route.ts:116-144`), so the fix is S.
- **No `z.any()`** exists in the module. The typing debt is TS `any` +
  unvalidated `res.json()` at edges, not `z.any()`.
- **`localStorage`** in the module is for reading API keys (Meshy/Stability) and
  the master prompt (`SurfaceProperties.tsx`, `PropertiesPanel.tsx`), **not** job
  recovery. Job flows use client-side polling of `[taskId]`/`[runId]` routes.
- **No schema inversion.** `src/db/schema.ts` owns `interiorDesigns`
  (`schema.ts:133`); there is no module-local `db/schema.ts`. Direction is correct.
- **`index.ts` is missing** (confirmed).
- **`ai/TextureService.ts` is not dead** — used by `texture/route.ts` (server) and
  its `TextureStyle` type by `SurfaceProperties.tsx`. Relocate, don't delete.
