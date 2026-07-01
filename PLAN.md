# Plan — interior-designer module cleanup (staged / Option A)

## Summary
`interior-designer` is pre-blueprint: no `index.ts`, a 1661-LOC Zustand store that
mixes UI + server state + persistence, one remaining browser→Supabase write, deep
imports of two sibling modules, and job flows that poll instead of using Realtime.
This plan follows the human's **[A] staged** decision: fix the security seam and
establish `index.ts` / `io/` / `state/queries/` / `services/` boundaries first, then
sequence the task co-location, then clean cross-module and legacy code. Full
Realtime/`useJob` job migration is deferred because the `shared/jobs` primitive does
not yet exist.

Spot-check corrections are recorded in `DECISIONS.md` (P0 narrower than assessed; no
`z.any()`; `localStorage` is API-key/prompt only; schema direction correct;
`TextureService` is live, not dead).

---

## Prioritized items

### [P0] Item 1 — Remove the browser→Supabase write in `renameDesign`
- Problem: `store/useInteriorStore.ts:1580-1586` dynamically imports
  `getSupabaseClient()` and does `supabase.from('interior_designs').update({name})`
  directly from the browser. Breaks invariant #2.
- Impact: Auth/business rules bypass the server gate; only RLS protects the write.
  Active security/consistency risk.
- Change: Point `renameDesign` at the **existing** authed endpoint
  `PATCH /api/interior-designer/designs` (`designs/route.ts:116-144` already updates
  `name` behind `requireAuth()` + `verifyDesignAccess` + Drizzle). Delete the
  `@/infrastructure/storage/supabaseClient` import from the store. Interim: call the
  route via `fetch` (matching the sibling CRUD methods); it moves into `io/` in Item 3.
- Effort: **S**
- Verification: typecheck, lint; manual rename in the UI persists and survives reload;
  confirm no other `supabase.from(` remains in the module (`grep`).
- Depends on: none.

### [P1] Item 2 — Add the module public barrel `index.ts`
- Problem: `src/domains/interior-designer/index.ts` does not exist; outside code
  imports internals directly (and this module reaches into siblings' internals —
  Item 6). Breaks invariant #6 / blueprint rule.
- Impact: No enforceable public API; every later boundary fix has nothing to anchor to.
- Change: Create `src/domains/interior-designer/index.ts` re-exporting the module's
  public components (the editor entry component used by
  `app/app/[projectId]/interior-design`), the UI store hook, public types, and
  (type-only) task handles once Item 7 lands. Update `app/**/interior-design` imports
  to the barrel.
- Effort: **S**
- Verification: typecheck, lint; grep that `app/` imports the module only via `index.ts`.
- Depends on: none (do alongside Item 1).

### [P1] Item 3 — Introduce the `io/` edge (DTOs + fetchers + keys)
- Problem: HTTP is scattered — `fetch('/api/interior-designer/designs')` lives in the
  store (`:1485,:1503,:1529,:1601`) and in `components/DesignManager.tsx:46`, with
  `res.json()` unvalidated. Breaks the `ui → state → io` rule and invariant #5.
- Impact: DTO/auth/versioning changes require touching many call sites; response
  shape drift is invisible.
- Change: Create
  - `io/interior-designer.dto.ts` — Zod schemas for design CRUD (list, get, create,
    update/rename, delete) and the persisted `sceneData` payload; **shared with**
    `designs/route.ts` (replace its inline `body` reads with the DTO parse).
  - `io/interior-designer.keys.ts` — query-key factory (`all`, `list(projectId)`,
    `detail(designId)`).
  - `io/interior-designer.api.ts` — typed `fetch` wrappers that validate responses
    with the DTOs.
  Route every existing design `fetch` (store + `DesignManager`) through `io/`.
- Effort: **M**
- Verification: typecheck, lint; unit test DTO parse of a representative `sceneData`;
  manual save/load/list/delete unchanged.
- Depends on: Item 1 (rename now also flows through `io/`).

### [P1] Item 4 — Split server state out of the god store into `state/queries/`
- Problem: `store/useInteriorStore.ts` (1661 LOC) holds design lists / current design
  / load / save / rename / delete alongside ephemeral scene/UI state. Breaks
  invariant #1 and the `state/` contract.
- Impact: Untestable, hidden async side effects, manual cache management, high edit risk.
- Change:
  - Add `state/queries/useDesigns.ts` (list), `useDesign.ts` (detail), and
    `useDesignMutation.ts` (create/save/rename/delete) as TanStack hooks calling
    `io/` and invalidating `interior-designer.keys`.
  - Reduce `useInteriorStore` to **ephemeral UI/scene state only** (selection, tool
    mode, panel toggles, in-memory scene graph). Move `currentDesignId/Name`,
    `lastSaved`, `hasUnsavedChanges`, and the load/save/rename/delete actions out to
    the query hooks; components read server data from hooks.
  - Move pure transforms (scene serialize/deserialize, terrain
    heightmap/materialMap pack/unpack at `:1473-1477,:1560-1568`) into
    `core/SceneData.ts` (pure, unit-tested, no `Date.now()`), consumed by both the
    store and the mutation hooks.
- Effort: **L**
- Verification: typecheck, lint; unit tests for `core/SceneData` round-trip; module
  e2e / manual: create → edit → save → reload → rename → delete.
- Depends on: Items 2, 3.

### [P1] Item 5 — Formalize the server write path in `services/`
- Problem: `designs/route.ts` inlines Drizzle reads/writes and access checks; there is
  no server-only service seam. Blueprint wants routes as thin glue over `services/`.
- Impact: Persistence logic can't be reused/tested; routes drift.
- Change: Add `services/InteriorDesignService.ts` (`import 'server-only'`) wrapping the
  Drizzle CRUD + `verifyDesignAccess`, returning `Result<T>`. Reduce
  `designs/route.ts` to `requireAuth()` → DTO parse (Item 3) → service call → map
  `Result` to HTTP. Relocate `ai/TextureService.ts` here as
  `services/TextureService.ts` (it is server-only and used by `texture/route.ts`);
  move its `TextureStyle` type to `core/` so `SurfaceProperties.tsx` stops importing
  from `ai/`.
- Effort: **M**
- Verification: typecheck, lint; `texture/route.ts` and `designs/route.ts` still pass;
  grep that no UI imports from `services/` or `ai/`.
- Depends on: Item 3 (shared DTOs). **Boundary risk:** ensure `services/` never gets
  imported by `ui/`/`state/` (dependency rule).

### [P2] Item 6 — Remove cross-module internal imports
- Problem: `DesignManager.tsx:3`, `AssetLibrary.tsx:5-7`, `SurfaceProperties.tsx:27`,
  `PropertiesPanel.tsx:5` import `world-building-toolkit/store/useWorldStore`,
  `world-building-toolkit/components/AssetsPanel`, and
  `3d-asset-exporter/components/AssetUploadZone` — sibling internals. Breaks the
  dependency rule + invariant #6.
- Impact: Couples interior-designer to two modules' implementation details; blocks
  their parallel migration and lint enforcement.
- Change: Consume only each sibling's `index.ts` public API (add the needed exports to
  those barrels), or, if the shared concern is genuinely cross-module (project
  selection, asset browser/upload), lift it into `shared/`. Prefer the barrel route
  first; flag any `shared/` extraction as its own follow-up.
- Effort: **M**
- Verification: typecheck, lint (dependency-rule lint once added); grep shows no
  `@/domains/<other>/{store,components}/…` imports.
- Depends on: Items 2 (and the siblings exposing barrels).

### [P2] Item 7 — Co-locate Trigger tasks under module `tasks/`
- Problem: `retexture-model.ts`, `text-to-3d.ts`, `surface-material.ts` (and 3d model
  tasks) live flat in `src/trigger/*`; not all are `schemaTask`s with Zod payloads.
  Blueprint §8 wants them authored in the module and re-exported from `src/trigger`.
- Impact: Ownership is unclear; payloads are loosely typed.
- Change: Move interior-owned tasks to `tasks/<verb>.task.ts` as `schemaTask`s with
  Zod payloads + `queue`/`retry`/`idempotencyKey`; re-export from `src/trigger/index`.
  Keep the existing authed API routes triggering them. Export type-only handles from
  `index.ts`.
- Effort: **M**
- Verification: typecheck, lint; `npx trigger.dev deploy` dry build discovers tasks;
  retexture/text-to-3d still trigger.
- Depends on: Item 2. Does **not** include the Realtime/`useJob` swap (deferred).

### [P2] Item 8 — Tighten typed boundaries (`any` → inferred/Zod)
- Problem: `metadata: any` (`PropertiesPanel.tsx:705`), several `any` event/config
  props, and unvalidated `res.json()` at fetch sites. Breaks invariant #5.
- Impact: Job-metadata and API-response shape drift goes unnoticed.
- Change: Reuse the `io/` DTOs (Item 3) for API responses; add Zod for job status /
  metadata payloads; replace edge `any` with `z.infer` types. (No `z.any()` exists to
  remove — this is TS-`any` cleanup.)
- Effort: **M**
- Verification: typecheck with no new `any` at boundaries; lint.
- Depends on: Items 3, 7.

### [P3] Item 9 — Split god UI components toward the ~400 LOC target
- Problem: `PropertiesPanel.tsx` (1323), `SurfaceProperties.tsx` (981),
  `SculptableSurface.tsx` (585), `LayerPanel.tsx` (583) exceed the size limit; folders
  are `components/`/`components/UI/` (flat), not `ui/<Component>/` folder-per-unit.
- Impact: Hard to review/test; violates naming + size rules.
- Change: Reshape `components/` → `ui/<Component>/` folder-per-unit with colocated
  tests + local barrels; extract retexture / material / text-to-3d controls out of
  `PropertiesPanel`/`SurfaceProperties` into their own components.
- Effort: **L**
- Verification: typecheck, lint; no component > ~400 LOC; e2e smoke unchanged.
- Depends on: Items 3, 4 (so extracted pieces read from hooks, not the god store).

### [Deferred / flagged] Item 10 — Realtime `useJob` for job flows
- Problem: `PropertiesPanel.tsx` / `SurfaceProperties.tsx` poll `[taskId]`/`[runId]`
  routes for retexture/text-to-3d/material status (invariant #4 wants Realtime + `useJob`).
- Blocker: `shared/jobs` and `useJob` **do not exist in the repo yet** (verified). This
  is cross-module SPEC §P1 infra. Do not hand-roll a module-local copy.
- Action: Deferred until `shared/jobs` lands; revisit as a follow-up once Item 7 has the
  tasks co-located and typed.

---

## Suggested sequence
1. **Minimum first increment: Items 1–3** (P0 write fix + `index.ts` barrel + `io/`
   DTO/keys/api edge). This removes the security seam and creates the anchor every
   later boundary fix needs, with low blast radius.
2. Item 4 (server-state split) then Item 5 (services seam) — the structural core.
3. Items 6, 7 — cross-module decoupling and task co-location.
4. Item 8 — typing cleanup riding on the new DTOs/tasks.
5. Item 9 — component reshaping/size (P3), when capacity allows.
6. Item 10 — only after `shared/jobs` exists.

## Deferred / out of scope
- Realtime/`useJob` job migration (Item 10) — blocked on `shared/jobs`.
- Splitting god components below ~400 LOC (Item 9) — P3, not in increment 1.
- Extracting shared project-selection/asset primitives into `shared/` — attempt public
  barrels first (Item 6); `shared/` lift is a separate follow-up.
- Any new product features, AI-kernel work, or scorer/observability changes (this is an
  asset module; no `agents/`/`prompts/` blueprint surface).
