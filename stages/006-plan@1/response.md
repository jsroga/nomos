`PLAN.md` and `DECISIONS.md` are updated. Stopping for Verification.

---

**1. P0 declaration** — `P0 exists`: `store/useInteriorStore.ts:1579` writes directly via `getSupabaseClient()` (`interior_designs.update({ name })`) from the browser, breaking invariant #2. It's the *only* remaining direct client write — save/create/delete already use the authenticated API.

**2. Your Clarify decision: [A] Staged migration.**
- In scope: P0 write-path fix + minimum canonical seams (`index.ts` barrel, typed `io/`, split store into UI-only Zustand + TanStack `state/queries/`, `services/`+`tasks/` scaffolding via shared `useJob`).
- Explicitly deferred: full component breakup, migrating every async flow off polling, complete `ai/`→services consolidation, cross-module barrel additions in other modules.

**3. First shippable increment: Items 1–3** — remove the Supabase write (route through the existing `PATCH /api/interior-designer/designs`, which already accepts `name`), add the module `index.ts` barrel, and define the typed `io/` edge (`.dto.ts`/`.keys.ts`/`.api.ts`). Plumbing only, no user-visible flow change; unblocks the store split.

**4. Item count / effort** — 8 items. Increment 1 (Items 1–3): ~1–1.5 dev days (Item 1 is ~15 LOC). Full plan through Item 5: ~4–6 days.

**5. Plan summary**
- **Item 1 (P0/S)** — swap direct Supabase write for `fetch PATCH .../designs`; drop `supabaseClient` import.
- **Item 2 (P1/S)** — minimal `index.ts` (no store/UI leak).
- **Item 3 (P1/M)** — Zod DTOs + query keys + fetchers in `io/`, shared with routes.
- **Item 4 (P1/L)** — split 1661-LOC store: `useInteriorDesignerUiStore` (ephemeral) + `state/queries/` (server via TanStack).
- **Item 5 (P1/L)** — one long flow (retexture/text-to-3d) → `tasks/` schemaTask + server `services/` + `shared/jobs/useJob`; kills that flow's `setInterval`/`CustomEvent`/`localStorage`-key path.
- **Item 6 (P2/M)** — extract pure geometry/export to `core/`.
- **Item 7 (P2/M)** — folder-per-unit rename to `ui/`.
- **Item 8 (P3)** — route cross-module imports (`world-building-toolkit`, `3d-asset-exporter`) via barrels.

Corrections logged in DECISIONS.md: P0 is narrower than assess implied; `SurfaceProperties.tsx` (981 LOC) is a co-equal polling offender; client-held Meshy/Stability keys in `localStorage`; no schema inversion or `z.any()`.

```json
{
  "context_updates": {
    "plan.has_ui_surface": "no",
    "plan.has_p0_security_issue": "yes"
  }
}
```

Awaiting Verification approval — I will not implement until then.