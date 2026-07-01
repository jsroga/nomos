Plan and decisions written. Stopping for Verification.

## Verification summary

**1. P0 declaration** — **P0 exists.** `store/useInteriorStore.ts:1580-1586` (`renameDesign`) does a direct browser→Supabase write (`supabase.from('interior_designs').update(...)`), bypassing the server auth gate (invariant #2).

**2. Your Clarify decision: [A] Staged migration.** In scope: fix the security seam, add `index.ts` + `io/` + `state/queries/` + `services/` boundaries, then co-locate Trigger tasks, then decouple cross-module imports. Explicitly deferred: full Realtime `useJob` job migration (blocked — `shared/jobs` doesn't exist yet), god-component splitting, and `shared/` extraction.

**3. First shippable increment: Items 1–3** — remove the browser Supabase write (route it to the **already-existing** authed `PATCH /api/interior-designer/designs`), add the module `index.ts` barrel, and introduce the `io/` edge (Zod DTOs + query keys + typed fetchers shared with the route).

**4. Item count / effort** — 9 active items + 1 deferred. Increment 1 (Items 1–3): ~1–2 dev days (S + S + M).

**5. Plan summary**
- **Item 1 (P0/S):** `renameDesign` → `PATCH /api/interior-designer/designs`; delete the `getSupabaseClient` import.
- **Item 2 (P1/S):** create `index.ts`; point `app/**/interior-design` at it.
- **Item 3 (P1/M):** `io/interior-designer.{dto,keys,api}.ts`; centralize the scattered `fetch` in the store + `DesignManager.tsx:46`.
- **Item 4 (P1/L):** dissolve server state from the 1661-LOC store into `state/queries/`; pure `core/SceneData.ts`.
- **Item 5 (P1/M):** `services/InteriorDesignService.ts` (server-only, `Result<T>`); relocate `ai/TextureService.ts` → `services/`, its `TextureStyle` type → `core/`.
- **Item 6 (P2/M):** kill deep imports of `world-building-toolkit`/`3d-asset-exporter` internals via their barrels.
- **Item 7 (P2/M):** co-locate retexture/text-to-3d/material tasks under `tasks/` as `schemaTask`s.
- **Item 8 (P2/M):** remove `any` at edges via the new DTOs.
- **Item 9 (P3/L):** reshape `components/` → `ui/<Component>/`, split god panels.

Corrections recorded in `DECISIONS.md`: P0 is narrower than assessed (only `renameDesign`); no `z.any()`; `localStorage` is API-key/prompt only; schema direction is correct; `TextureService` is live.

```json
{
  "context_updates": {
    "plan.has_ui_surface": "no",
    "plan.has_p0_security_issue": "yes"
  }
}
```

Awaiting human approval before implementing.