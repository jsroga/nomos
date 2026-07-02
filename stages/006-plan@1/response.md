Plan and decisions written. Verification summary below.

**1. P0 declaration:** `P0 exists` — `store/useInteriorStore.ts:1579-1591` (`renameDesign`) writes `interior_designs.name` directly via the browser Supabase client, bypassing auth (invariant #2). Fix is trivial: the `PATCH /api/interior-designer/designs` route already enforces auth.

**2. Your Clarify decision: [A] Staged migration.**
- In scope: P0 write removal, public `index.ts` barrel + layer seams, typed `io/` edge, staged store→TanStack split, cross-module import cleanup, AI/prompt server-side move.
- Explicitly deferred: shared `useJob`/Trigger job cleanup (Item 7 — blocked, `src/shared/` doesn't exist yet), full folder reshape (Item 10), `interior_designs` schema normalization.

**3. First shippable increment: Items 1–3 — P0 Supabase-write removal + public barrel/layer seams + typed `io/` edge (Zod DTOs shared with routes).** Backend/plumbing only; no user-visible UI-flow change.

**4. Item count & effort:** 10 items (P0×1, P1×4, P2×4, P3×1). Increment 1 ≈ 1–1.5 dev days.

**5. Plan highlights (concrete refs):**
- Item 1: swap browser Supabase call → `PATCH /api/interior-designer/designs` (mirrors existing `deleteDesign`).
- Item 2: add `index.ts` + seam folders (`io/ state/ core/ services/ tasks/ ui/`); only `storyteller` has a barrel today.
- Item 3: `io/interior-designer.{dto,api,keys}.ts` over the six existing routes.
- Items 4–5: move design fetch/save/rename/delete out of the 1661-LOC store into `state/queries/*`; shrink store to UI-only.
- Item 6: kill reach-ins to `world-building-toolkit/store/useWorldStore`, `AssetsPanel`, `3d-asset-exporter/AssetUploadZone`.
- Corrections vs assess: **no schema inversion** (`interiorDesigns` in `src/db/schema.ts:133`), **no `z.any()`**, `localStorage` is in UI components not `services/`.

**6. Verification reminder:** pick **[A] Approve & build** to implement, **[B]** for plan-only, **[I]** to request plan changes (type notes), **[X]** to abort. (Clarify's A/B/C are already decided — don't type `A` expecting build; choose gate option **[A]**.)

Stopping for Verification. Not implementing.

```json
{
  "context_updates": {
    "plan.has_ui_surface": "no",
    "plan.has_p0_security_issue": "yes"
  }
}
```