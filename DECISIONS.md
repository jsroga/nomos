# Decisions log

## Clarify gate (resolved)
- Question: How much should the cleanup plan take on?
- Human selection: **[A] Staged migration — boundaries first, bigger moves sequenced**
- Freeform text: (none provided)

### In scope (per [A])
- Fix unsafe boundary leaks first: move the browser→Supabase write behind the existing
  authed API route; establish the module public `index.ts` barrel; add typed Zod DTOs
  at the `io/` edge; clean up direct route/internal and cross-module imports.
- Then, in dependency order, phase the module toward `ui/state/io/core/services/tasks`:
  split the god Zustand store (server state → TanStack Query, pure logic → `core/`),
  move texture/retexture/text-to-3d observation off bespoke polling, and relocate
  secrets server-side.

### Explicitly deferred
- Full one-pass reorg of every component into folder-per-unit `ui/` (option C).
- Repo-wide creation of `src/shared/` (jobs/data/auth) and a shared `useJob` hook —
  these do not exist yet and are a cross-cutting effort beyond this module. This plan
  notes the dependency and stages around it.
- Normalizing the persisted scene JSON shape (kept backward-compatible unless a later
  increment explicitly migrates it).

## Spot-check corrections to findings/assess.md
- Browser→Supabase write is limited to `renameDesign` (store L1579-1597); save/load/delete
  already go through `/api/interior-designer/designs` with `requireAuth()`. P0 is narrower
  and smaller than assess implied.
- Job pipeline partially exists: Trigger tasks (`text-to-3d`, `retexture-model`,
  `surface-material`, etc.) and API routes under `src/app/api/interior-designer/*` are
  present. The real gap is UI-side `setInterval` polling + client-held API keys
  (localStorage) passed in request bodies — not a missing pipeline.
- `src/shared/` and `useJob` do NOT exist yet; the "observe via shared job primitive"
  target is blocked on repo-wide infra and is sequenced accordingly.
- No `z.any()` in the module; no local `db/schema.ts` (no schema inversion). `interiorDesigns`
  lives correctly in `src/db/schema.ts`.
