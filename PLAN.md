# Interior Designer — Architecture Alignment Plan

## Summary
`src/domains/interior-designer` is materially off the target blueprint: it has no public
`index.ts`, a 1661-LOC god Zustand store, one browser→Supabase write that bypasses auth,
UI panels that poll Trigger jobs by hand and hold provider API keys in `localStorage`, and
direct cross-module imports of `world-building-toolkit`/`3d-asset-exporter` internals. Per
the human's **[A] Staged migration** choice, this plan fixes the unsafe boundaries first
(P0/P1), then sequences the larger store split and job-observation work behind stable seams.
Good news from spot-checks: the designs API route (authed, Drizzle) and the Trigger tasks
for generation flows already exist, so most items are re-routing and layering, not new pipelines.

## Prioritized items

### [P0-1] Route `renameDesign` through the authed API (kill the browser→Supabase write)
- Problem: `store/useInteriorStore.ts:1579-1597` dynamically imports `supabaseClient` and
  writes `interior_designs.name` directly from the browser. Violates invariant #2.
- Impact: Bypasses `requireAuth()` + project-access checks; only RLS protects the write.
  Save/load/delete already use `/api/interior-designer/designs` — this is the lone leak.
- Change: Replace the Supabase call with a `PATCH /api/interior-designer/designs`
  (`{ id, name }`) fetch — the route already accepts `name` (route.ts:116-144). Delete the
  dynamic supabase import in the store. No schema/route change needed.
- Effort: S
- Verification: `npm run typecheck`; manual rename in the editor persists + reloads;
  grep confirms zero `supabase`/`getSupabaseClient` references remain in the module.
- Depends on: none.

### [P1-2] Introduce the module public barrel `index.ts`
- Problem: No `src/domains/interior-designer/index.ts`. `app/.../interior-design/page.tsx`
  and sibling modules import deep internals (components/store/utils). Violates invariant #6.
- Impact: Blocks lint enforcement of the dependency rule and makes every later move a
  wide-blast route/import refactor.
- Change: Create `index.ts` exporting the page-facing surface only: `InteriorCanvas`,
  `Toolbar`, `InteriorRightSidebar`, `DesignManager`, the store hook (transitional), and
  the `UnityExporter` used by the page. Update `page.tsx` to import from
  `@/domains/interior-designer` instead of deep paths (keep `dynamic()` for `InteriorCanvas`).
- Effort: M
- Verification: `npm run typecheck` + `npm run lint`; page renders; no deep interior-designer
  imports remain in `src/app`.
- Depends on: none (do alongside P0-1).

### [P1-3] Add typed DTOs at the `io/` edge for designs + generation flows
- Problem: Store and panels do raw `fetch(...).json()` with untyped bodies; no `*.dto.ts`.
  Violates invariant #5 and the blueprint `io/` requirement.
- Impact: Edge contracts (design create/update, retexture/text-to-3d/material start+poll)
  can drift silently between client and routes.
- Change: Create `io/interior-designer.dto.ts` (Zod) for design records + request bodies,
  and job start/status payloads; `io/interior-designer.keys.ts` (TanStack query keys); and
  `io/interior-designer.api.ts` wrapping the existing fetch calls with parsed DTOs. Import
  the same Zod schemas in the API routes to validate request bodies (`route.ts` bodies are
  currently destructured untyped).
- Effort: M
- Verification: `npm run typecheck`; routes reject malformed bodies; unit test DTO parse.
- Depends on: P0-1 (rename now flows through the API surface these DTOs cover).

### [P1-4] Remove cross-module internal imports (go through barrels or `shared/`)
- Problem: `components/DesignManager.tsx`, `components/UI/AssetLibrary.tsx`,
  `components/UI/SurfaceProperties.tsx`, `components/UI/PropertiesPanel.tsx`,
  `app/.../page.tsx` import `world-building-toolkit/store/useWorldStore`,
  `world-building-toolkit/components/AssetsPanel`, `3d-asset-exporter/components/AssetUploadZone`.
  Violates invariant #6 + the no-other-module-internals rule.
- Impact: Couples migrations across three modules; changing one breaks the others.
- Change: Short-term — export the needed surface from each module's `index.ts` and import
  from there. Where `useWorldStore`'s `currentProject` is really shared project context used
  by 2+ modules, flag it for extraction to `shared/data` (deferred until `shared/` exists —
  see P2-7). No behavior change.
- Effort: M
- Verification: `npm run typecheck` + `npm run lint`; grep shows no `@/domains/<other>/(store|components)/` deep imports in this module.
- Depends on: those modules exposing barrels (verify during build; may need small sibling edits via their `index.ts`).

### [P2-5] Split the god store: server state → TanStack Query, pure logic → `core/`
- Problem: `store/useInteriorStore.ts` (1661 LOC) mixes ephemeral UI state, server
  reads/writes (fetch + persistence), geometry/terrain transforms, and undo. Violates
  invariants #1 and #8 and the dependency rule.
- Impact: Highest source of change-risk; blocks testing and reliable cache invalidation.
- Change (phased, behind the P1-3 seams):
  - `state/useInteriorDesignerUiStore.ts` — keep only ephemeral UI (mode, selection,
    zenMode, export/camera flags, unsaved flag).
  - `state/queries/` — `useDesigns`, `useDesign`, `useSaveDesignMutation`,
    `useRenameDesignMutation`, `useDeleteDesignMutation` (TanStack, calling `io/` from P1-3).
  - `core/` — pure geometry/terrain/serialization helpers (heightmap, wall/object math,
    scene<->DTO mapping); no React/Date.now(); unit-tested offline.
  - Keep the current `useInteriorStore` as a thin transitional facade re-exporting from the
    new pieces until callers are migrated, then delete it.
- Effort: L
- Verification: `npm run typecheck` + `npm run test:unit` (new `core/` tests);
  manual: load/save/rename/delete + auto-save debounce still work.
- Depends on: P1-3 (DTOs/io), P1-2 (barrel).

### [P2-6] Move job observation off bespoke polling; move secrets server-side
- Problem: `components/UI/PropertiesPanel.tsx` (retexture/text-to-3d) and
  `components/UI/SurfaceProperties.tsx` (material/texture) start jobs via API then poll with
  `setInterval` (9 + 4 occurrences), and read Meshy/Stability API keys from `localStorage`
  (PropertiesPanel L677/L1122/L1139, SurfaceProperties L312/L374), passing them in request
  bodies. Also `texture/route.ts` requires an `apiKey` from the client body. Violates invariants #4 and #5.
- Impact: Flaky async UX, duplicated polling logic, and provider secrets on the client.
- Change:
  - Server-side secrets: read Meshy/Stability keys from server env in the API routes/tasks;
    drop `apiKey` from request bodies and the `localStorage` reads. (`texture/route.ts:14`,
    `SurfaceProperties.tsx:312/374`, `PropertiesPanel.tsx:677/1122`.)
  - Replace `setInterval` status polling with Trigger Realtime observation. Preferred target
    is a shared `useJob` hook — **blocked on P2-7 (no `src/shared/` yet)**. Interim: encapsulate
    polling in a single `state/queries/useGenerationJob` hook (one place, typed via P1-3 DTOs)
    and delete the inline panel loops; swap its internals to `useJob` once available.
  - Relocate the module-owned Trigger tasks (`text-to-3d`, `retexture-model`,
    `surface-material`) into `tasks/` per the blueprint (or re-export from module `tasks/`),
    keeping `src/trigger/` as thin re-exports.
- Effort: L
- Verification: `npm run typecheck` + `npm run lint`; manual: retexture/text-to-3d/material
  jobs complete and update the scene; grep shows no `localStorage` API-key reads and no
  `setInterval` job polling in panels.
- Depends on: P1-3 (DTOs); soft-depends on P2-7 for the final `useJob` swap.

### [P2-7] (Cross-cutting, flag only) Establish `shared/` seams this module needs
- Problem: Target requires `src/shared/jobs` (`useJob`), `shared/data` (project context),
  `shared/auth`; none exist yet.
- Impact: P1-4 and P2-6 can only partially reach their target end-state without these.
- Change: Out of scope to build here. Document the two concrete seams this module needs
  (a `useJob`/Trigger-Realtime hook; a shared project/`currentProject` source) so the
  repo-wide effort can prioritize them. This module stages around their absence.
- Effort: N/A (planning note)
- Verification: n/a
- Depends on: none.

### [P3-8] Retire/relocate ad-hoc `ai/TextureService.ts`; enforce size limits
- Problem: Asset module carries `ai/TextureService.ts` (calls provider directly; placeholder-ish)
  outside the task/service architecture; `PropertiesPanel.tsx` (1323) and
  `SurfaceProperties.tsx` (981) exceed the ~400 LOC limit (invariant #8).
- Impact: Parallel AI path + god components; hard to reason about after the moves above.
- Change: Fold `TextureService` logic into a server `services/` module or the existing
  Trigger task, delete the `ai/` folder. After P2-5/P2-6 thin the panels, split remaining
  render code into folder-per-unit `ui/` components under the size limit.
- Effort: M
- Verification: `npm run typecheck` + `npm run lint`; component LOC under threshold; no `ai/` dir.
- Depends on: P2-5, P2-6.

## Suggested sequence
1. **Items P0-1, P1-2, P1-3, P1-4 (first shippable increment)** — boundary/layer fixes with
   no user-visible flow change: authed rename, public barrel, `io/` DTOs, and de-coupled
   cross-module imports. Small blast radius, unblocks everything else.
2. P2-5 — split the store behind the P1-3 seams (biggest structural unblocker).
3. P2-6 — job observation + server-side secrets (soft-blocked on P2-7 for final `useJob`).
4. P3-8 — retire `ai/`, split god components to size.
- P2-7 is a standing flag consumed by the repo-wide `shared/` effort, not built here.

**Minimum first increment: Items P0-1, P1-2, P1-3, P1-4 only.**

## Deferred / out of scope
- Full folder-per-unit reorg of all components into `ui/` (option C end-state) beyond P3-8.
- Building `src/shared/` (jobs/data/auth) and a shared `useJob` hook (P2-7 flags it).
- Normalizing the persisted scene JSON shape (kept backward-compatible).
- Any change to sibling modules beyond adding/using their `index.ts` barrels for P1-4.
