`PLAN.md` and `DECISIONS.md` are written. Stopping for Verification.

**1. P0 declaration** — `P0 exists`. Evidence: `store/useInteriorStore.ts:1579-1596` writes `interior_designs` via the browser Supabase client (bypasses auth/service path), and UI reads/forwards provider API keys from `localStorage` (`SurfaceProperties.tsx:312,374`; `PropertiesPanel.tsx:677,1122`) with tasks accepting client-supplied `apiKey`.

**2. Your Clarify decision: [A] Staged migration (boundary-first).** In scope: P0 security fixes, then `index.ts` barrel + `io/` edge + god-store split + shared jobs, then folder reshape/cross-module/`any` cleanup. Explicitly deferred: big-bang rewrite (option C), rendering/terrain/Unity functional changes, refactoring world-building-toolkit itself.

**3. First shippable increment: Items 1–2 only** — remove the browser Supabase rename write and eliminate browser-held/client-forwarded provider keys.

**4. Item count / effort:** 9 items. Increment 1 (Items 1–2) ≈ 1–1.5 dev days (S+M).

**5. Plan summary:**
- **Item 1 (P0/S):** add `PATCH` rename to `app/api/interior-designer/designs/route.ts` (reuse existing `requireAuth`+`verifyDesignAccess`); store calls it, drops `supabaseClient`.
- **Item 2 (P0/M):** delete `localStorage` key reads + key UI; read `MESHY/STABILITY` keys from server env; remove `apiKey` from task/route payloads.
- **Item 3 (P1/S):** create `index.ts` public barrel.
- **Item 4 (P1/M):** `io/interior-designer.{api,keys,dto}.ts`; move all `fetch` out of UI/store.
- **Item 5 (P1/L):** split 1.6k-line store → `state/useInteriorDesignerUiStore` + `state/queries/*` TanStack hooks.
- **Item 6 (P1/M):** replace `setInterval` polling with shared `useJob`/Trigger Realtime.
- **Item 7 (P2/L):** reshape to `ui/state/io/core/services/tasks`; move `ai/TextureService` → services; relocate `text-to-3d`/`surface-material` tasks into `tasks/` and migrate v3→v4 SDK.
- **Item 8 (P2/M):** route world-building-toolkit access through its barrel/shared, not `store/`+`components/` internals.
- **Item 9 (P3/S):** replace boundary `any` (`PropertiesPanel.tsx:705`) with Zod DTOs.

Corrections vs assess noted in PLAN.md: no `z.any()` (plain TS `any`); `designs` route already uses `requireAuth`+Drizzle (only `renameDesign` bypasses); cross-module also imports `AssetsPanel`; interior tasks live in global `src/trigger/` with client `apiKey` + v3 SDK.

```json
{
  "context_updates": {
    "plan.has_ui_surface": "yes",
    "plan.has_p0_security_issue": "yes"
  }
}
```