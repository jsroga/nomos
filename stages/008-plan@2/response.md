All spot-checks confirm the existing plan's claims are accurate:

- **No `index.ts`** in the module (glob empty) — barrel genuinely missing.
- **Largest files:** `store/useInteriorStore.ts` 1661, `PropertiesPanel.tsx` 1323, `SurfaceProperties.tsx` 981 — matches cited sizes.
- **No `z.any()`** — confirms the plan's correction (the `any` is plain TS `any`).
- **`localStorage` provider-key reads** confirmed at `SurfaceProperties.tsx:312,374` and `PropertiesPanel.tsx:677,1122`.
- **Browser→Supabase write** confirmed at `useInteriorStore.ts:1579-1596` (`renameDesign`); `deleteDesign` already uses `fetch` → route.
- **No schema inversion** — `src/db/schema.ts` is the source of truth; module has no local `db/schema.ts`.

`PLAN.md` and `DECISIONS.md` are accurate and require no correction.

---

**1. P0 declaration** — `P0 exists`. Evidence: browser Supabase write in `useInteriorStore.ts:1579-1596` (bypasses auth/service path) + browser-held/client-forwarded provider keys (`SurfaceProperties.tsx:312,374`; `PropertiesPanel.tsx:677,1122`).

**2. Your Clarify decision: [A] Staged migration (boundary-first).** In scope: P0 security fixes, then `index.ts` barrel + `io/` edge + god-store split + shared jobs, then folder reshape/cross-module/`any` cleanup. Explicitly deferred: big-bang rewrite (option C), rendering/terrain/Unity functional changes, refactoring world-building-toolkit itself.

**3. First shippable increment: Items 1–2 only** — remove the browser Supabase rename write; eliminate browser-held/client-forwarded provider keys.

**4. Item count / effort:** 9 items. Increment 1 (Items 1–2) ≈ 1–1.5 dev days (S+M).

**5. Plan summary:**
- **Item 1 (P0/S):** add `PATCH` rename to `app/api/interior-designer/designs/route.ts`; store calls it, drops `supabaseClient`.
- **Item 2 (P0/M):** delete `localStorage` key reads + key UI; read `MESHY`/`STABILITY` keys server-side; strip `apiKey` from task/route payloads.
- **Item 3 (P1/S):** create `index.ts` barrel.
- **Item 4 (P1/M):** `io/interior-designer.{api,keys,dto}.ts`; move `fetch` out of UI/store.
- **Item 5 (P1/L):** split store → `state/useInteriorDesignerUiStore` + `state/queries/*`.
- **Item 6 (P1/M):** replace `setInterval` polling with shared `useJob`/Trigger Realtime.
- **Item 7 (P2/L):** reshape to blueprint layers; relocate tasks into `tasks/`, migrate v3→v4 SDK.
- **Item 8 (P2/M):** route world-building-toolkit access through its barrel/shared.
- **Item 9 (P3/S):** replace boundary `any` with Zod DTOs.

Stopping for Verification. Not implementing.

```json
{
  "context_updates": {
    "plan.has_ui_surface": "yes",
    "plan.has_p0_security_issue": "yes"
  }
}
```