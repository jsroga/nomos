Plan and decisions written. Stopping for Verification.

**1. P0 declaration** — `P0 exists`: `store/useInteriorStore.ts:1579-1597` `renameDesign` writes `interior_designs.name` via a browser Supabase client, bypassing `requireAuth()` (invariant #2).

**2. Your Clarify decision: [A] Staged migration.** In scope: fix unsafe boundaries first (authed rename, public `index.ts`, `io/` DTOs, cross-module import cleanup), then sequence the store split + job-observation moves. Explicitly deferred: full folder-per-unit reorg (C), building `src/shared/`+`useJob`, and scene-JSON normalization.

**3. First shippable increment: Items P0-1, P1-2, P1-3, P1-4 only** — authed rename, module barrel, Zod DTOs at the `io/` edge, and de-coupled cross-module imports. No user-visible flow change; small blast radius.

**4. Item count / effort** — 8 items (P0-1, P1-2/3/4, P2-5/6/7, P3-8). Increment 1 ≈ 1–2 dev days (mostly S/M re-routing and layering).

**5. Plan summary**
- **P0-1 (S):** Replace the dynamic `supabaseClient` write in `renameDesign` with `PATCH /api/interior-designer/designs` — the route already accepts `name` (`designs/route.ts:116-144`).
- **P1-2 (M):** Add `src/domains/interior-designer/index.ts`; repoint `app/app/[projectId]/interior-design/page.tsx` off deep imports.
- **P1-3 (M):** Add `io/interior-designer.{dto,keys,api}.ts` (Zod) and validate request bodies in the existing routes.
- **P1-4 (M):** Remove deep imports of `world-building-toolkit/store`, `.../components/AssetsPanel`, `3d-asset-exporter/components/AssetUploadZone` (DesignManager, AssetLibrary, SurfaceProperties, PropertiesPanel, page).
- **P2-5 (L):** Split the 1661-LOC store → `state/` UI store + `state/queries/` TanStack + pure `core/`.
- **P2-6 (L):** Kill `setInterval` polling + `localStorage` API keys in the panels; move secrets server-side; observe jobs via Realtime (`useJob` once P2-7 exists).
- **P2-7:** Flag repo-wide `shared/jobs`/`shared/data` seams (not built here).
- **P3-8 (M):** Retire `ai/TextureService.ts`; split the >400-LOC panels.

Corrections logged in DECISIONS.md: browser-write is a single spot (save/load/delete already authed); Trigger tasks + routes already exist (gap is UI polling/secrets); `src/shared/`+`useJob` don't exist yet; no `z.any()`, no schema inversion.

```json
{
  "context_updates": {
    "plan.has_ui_surface": "no",
    "plan.has_p0_security_issue": "yes"
  }
}
```