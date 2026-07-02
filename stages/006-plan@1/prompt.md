Goal: Clean up and align the interior-designer module (src/domains/interior-designer) with the target architecture in docs/unified/ARCHITECTURE.md (module blueprint, dependency rule, non-negotiable invariants). Produce a prioritized plan; implement only after human approval at Verification.
Run ID: 01KWGSZM6PEMNXFEF1Q3NQ3B3N
Pipeline progress: 4 of 22 stages completed

## Stage: scope
- Status: succeeded
- Handler: agent
- Model: gpt-5.4
- Tokens: 9.3k in / 840 out
- Response:
  > === module: interior-designer ===
  > src/domains/interior-designer/__tests__/terrain-cdt.test.ts
  > src/domains/interior-designer/__tests__/terrain-quality.test.ts
  > src/domains/interior-designer/__tests__/unity-export.script.ts
  > src/domains/interior-designer/__tests__/windows-doors.e2e.test.ts
  > src/domains/interior-designer/ai/TextureService.ts
  > src/domains/interior-designer/components/CameraController.tsx
  > src/domains/interior-designer/components/DesignManager.tsx
  > src/domains/interior-designer/components/Exporter.tsx
  > src/domains/interior-designer/components/FloorManager.tsx
  > src/domains/interior-designer/components/InteriorCanvas.tsx
  > src/domains/interior-designer/components/KeybindingManager.tsx
  > src/domains/interior-designer/components/ObjectManager.tsx
  > src/domains/interior-designer/components/RetextureExporter.tsx
  > src/domains/interior-designer/components/SculptableSurface.tsx
  > src/domains/interior-designer/components/SurfaceManager.tsx
  > src/domains/interior-designer/components/TransformManager.tsx
  > src/domains/interior-designer/components/UI/AssetLibrary.tsx
  > src/domains/interior-designer/components/UI/InteriorRightSidebar.tsx
  > src/domains/interior-designer/components/UI/LayerPanel.tsx
  > src/domains/interior-designer/components/UI/PropertiesPanel.tsx
  > src/domains/interior-designer/components/UI/SurfaceProperties.tsx
  > src/domains/interior-designer/components/UI/TerrainEditorPanel.tsx
  > src/domains/interior-designer/components/UI/Toolbar.tsx
  > src/domains/interior-designer/components/VoxelTerrainMesh.tsx
  > src/domains/interior-designer/components/WallManager.tsx
  > src/domains/interior-designer/components/meshes/DoorMesh.tsx
  > src/domains/interior-designer/components/meshes/RoadMesh.tsx
  > src/domains/interior-designer/components/meshes/WindowMesh.tsx
  > src/domains/interior-designer/components/terrain/GlobalWaterPlane.tsx
  > src/domains/interior-designer/components/terrain/TerrainBrushPreview.tsx
  > src/domains/interior-designer/components/terrain/index.ts
  > src/domains/interior-designer/components/tools/ObjectTool.tsx
  > src/domains/interior-designer/components/tools/ScatterTool.tsx
  > src/domains/interior-designer/components/tools/SurfaceTool.tsx
  > src/domains/interior-designer/components/tools/TerrainTool.tsx
  > src/domains/interior-designer/components/tools/WallTool.tsx
  > src/domains/interior-designer/prompts/index.ts
  > src/domains/interior-designer/store/useInteriorStore.ts
  > src/domains/interior-designer/utils/UnityExporter.ts
  > src/domains/interior-designer/utils/UnityYAML.ts
  > src/domains/interior-designer/utils/polygonUtils.ts
  > src/domains/interior-designer/utils/textureCache.ts
  > 
  > === git status ===
  > 
  > === architecture contract ===
  > -rw-r--r-- 1 root root 38694 Jul  2 06:59 docs/unified/ARCHITECTURE.md
  > -rw-r--r-- 1 root root 26993 Jul  2 06:59 docs/unified/SPEC.md

## Stage: assess
- Status: succeeded
- Handler: agent
- Model: gpt-5.4
- Tokens: 44.0k in / 4.2k out
- Files touched: /repos/jsroga/kurvitza/findings/assess.md
- Response:
  > Assessment written to `findings/assess.md`.
  > 
  > Verdict: interior-designer is still a legacy flat slice and is materially off-target in three places first: direct browser-side persistence, a monolithic Zustand store carrying server state, and bespoke polling/job orchestration in UI components.
  > 
  > Top 3 gaps to fix first:
  > 1. Remove browser → Supabase writes; route all writes through typed API/service/Drizzle paths.
  > 2. Split `useInteriorStore` into UI-only Zustand state plus TanStack Query + `io/` for server data.
  > 3. Replace component-level polling/global job bookkeeping with module-owned Trigger tasks and shared job observation.

## Stage: clarify_prep
- Status: succeeded
- Handler: agent
- Model: gpt-5.4
- Tokens: 20.7k in / 2.2k out
- Files touched: /repos/jsroga/kurvitza/CLARIFY.md, /repos/jsroga/kurvitza/DECISIONS.md, /repos/jsroga/kurvitza/PLAN.md
- Response:
  > ## Assessment summary
  > The interior-designer module is materially off the target architecture in the places that matter most: it mixes UI state, server state, persistence, and long-running job orchestration inside one large client store, and it still has a browser-side Supabase write path. It also lacks the canonical module shape (`index.ts`, layered folders, typed `io/`, server-only `services/`, module-owned `tasks/`), so cleanup can either be staged or done as a full reshape.
  > 
  > ## Key gaps (max 5)
  > - Direct browser → Supabase writes in `store/useInteriorStore.ts` violate the required API → auth → service → Drizzle path.
  > - The 1661-line Zustand store mixes ephemeral UI state with remote/server state, violating the TanStack Query vs Zustand split.
  > - Long-running generation/retexture flows use bespoke polling, global store bookkeeping, and `localStorage` instead of Trigger tasks + shared job observation.
  > - The module has no public `index.ts` or target blueprint folders, so internal imports and ownership boundaries cannot be enforced.
  > - Interior-designer imports sibling module internals directly, creating coupling that will either need public-barrel exports or `shared/` extraction.
  > 
  > ## Pick one scope (buttons are A / B / C — meanings are module-specific below)
  > 
  > The Fabro dock shows generic **[A] [B] [C]** buttons. Your table defines what each means **for this module**:
  > 
  > | Button | What the plan will assume for **this** module |
  > | --- | --- |
  > | **[A]** | **Security + architecture foundation.** Plan to remove browser-side Supabase writes first, establish the module’s public barrel and target layer seams, and stage the breakup of `useInteriorStore` into UI-only state + TanStack/`io`/server layers. Also plan the replacement of bespoke job polling, but sequence it to reduce migration risk instead of forcing a one-shot rewrite. |
  > | **[B]** | **Minimal containment.** Plan only the smallest safe increment: eliminate the direct browser write path and document follow-on work. The large Zustand store, most manual polling/job orchestration, and most folder restructuring would remain deferred. |
  > | **[C]** | **Full blueprint convergence now.** Plan a full reshape of `src/domains/interior-designer` into `index.ts`, `ui/`, `state/`, `io/`, `core/`, `services/`, and `tasks/`; split server state into TanStack Query; replace custom polling/localStorage job flows with Trigger/shared jobs; and resolve sibling-module internal imports in this same increment. |
  > 
  > **Advanced:** type custom constraints in freeform (routes to [F]) · pick [R] only if assess findings are wrong
  > 
  > **Recommendation: [A]** — it addresses the P0 security issue and lays down the architectural seams needed for a safe migration, without forcing the highest-risk full-module rewrite in one pass.
  > 
  > The [A]/[B]/[C] buttons match this table, not the other way around.

## Stage: Clarify
- Status: succeeded
- Handler: human

## Current context
| Key | Value |
|-----|-------|
| human.gate.Clarify.answer | A |
| human.gate.Clarify.label | [A] Staged migration |
| human.gate.Clarify.question | Choose scope A, B, or C for this module (see Clarify Prep summary — table defines what each means here) |
| human.gate.label | [A] Staged migration |
| human.gate.selected | A |


# Role: Plan Author

You turn the assessment into a **prioritized, reviewable improvement plan** — the
deliverable of this workflow. You do **not** implement anything. A developer must
be able to execute your plan without rediscovering the codebase.

## The goal / target

Clean up and align the interior-designer module (src/domains/interior-designer) with the target architecture in docs/unified/ARCHITECTURE.md (module blueprint, dependency rule, non-negotiable invariants). Produce a prioritized plan; implement only after human approval at Verification.

## Target architecture — folder structure & layering (MUST follow)

This project has a canonical target architecture that every module converges on.
The authoritative source is **`docs/unified/ARCHITECTURE.md`** (companion:
`docs/unified/SPEC.md`, `docs/orchestration-rfc.md`,
`docs/quality-improvement-spec.md`). **Read `docs/unified/ARCHITECTURE.md` before
proposing or placing any new code.** The summary below is the contract; the doc
is the detail.

> Note: this is the *target state*. Existing modules (e.g. `storyteller`) are
> mid-migration, so current code may not fully match. New code you add MUST follow
> the target; when editing legacy code, move it toward the target, never further away.

**Locked stack (non-negotiable):** Mastra · Radix · Supabase · TanStack Query ·
Trigger.dev · Vercel. You change *how* they're used, never *whether*.

### Repository topology

```
src/
├─ domains/<module>/     # vertical slices — the unit of ownership
├─ shared/               # cross-module building blocks (imported by 2+ modules)
│   ├─ agent-kernel/  jobs/  data/  auth/  observability/  errors/
├─ components/ui/        # Radix + CVA + tailwind-merge design system (shared primitives)
├─ db/                   # Drizzle: single schema source of truth + client
├─ trigger/              # thin re-export registry only
└─ app/                  # Next.js App Router: routes + API; thin glue only
```

Anything imported by 2+ modules lives in `shared/`, never inside a module.

### Module blueprint (every domain looks like this)

```
src/domains/<module>/
├─ index.ts        # PUBLIC API — the ONLY legal import target from outside
├─ ui/             # React client components. PascalCase folder-per-component (+ colocated .test.tsx + local index.ts)
├─ state/          # CLIENT state only (Zustand: use<Module>UiStore) + queries/ (TanStack: use<Entity>, use<Entity>Mutation)
├─ io/             # client→server edge: <module>.api.ts, <module>.keys.ts, <module>.dto.ts (Zod, shared with routes)
├─ core/           # PURE domain logic. No React, no DB, no I/O, no Date.now(). Unit-tested offline.
├─ services/       # SERVER-ONLY. DB (Drizzle) + external APIs. `import 'server-only'`. Returns Result<T>.
├─ agents/         # SERVER-ONLY. Mastra agents/tools/workflows (AI modules only) + tools/<tool>.ts
├─ tasks/          # Trigger.dev schemaTasks OWNED by this module: <verb>.task.ts
├─ prompts/        # prompt builders + skills (AI modules only)
└─ <module>.config.ts
```

- **AI modules** (storyteller, chat, loop-creator…) use `agents/` + `prompts/`.
  **Asset modules** (world-building-toolkit, 3d-asset-exporter, interior-designer)
  skip them and lean on `tasks/`.

### Dependency rule (points inward and downward — enforced by lint)

`ui → state → io → core ← (server) services/agents/tasks`

| Layer | May import | May NOT import |
| --- | --- | --- |
| `ui/` | `state/`, `core/` types, `components/ui`, `shared/jobs` | `services/`, `db`, `io/` directly, another module |
| `state/` | `io/`, `core/`, `shared/data`, `shared/jobs` | `services/`, `db`, `react-dom` |
| `io/` | `core/` DTOs, `shared/data` | `services/`, `db`, `react` |
| `core/` | `core/`, `zod` | everything else (stays pure) |
| `services/` | `db`, `shared/*`, external SDKs | `state/`, `ui/`, `io/`, React |
| `agents/` | `shared/agent-kernel`, `services/`, `prompts/`, `core/` | `ui/`, `state/` |
| `tasks/` | `services/`, `agents/`, `core/`, `shared/jobs` | `ui/`, `state/`, `io/` |

- A module may **not** import another module's internals — go through its
  `index.ts` or the shared layer. `app/` holds **no business logic**.

### Naming (kill the flat-vs-folder split — folder-per-unit everywhere)

- Folders & components `PascalCase`; hooks `useX.ts`; tasks `<verb>.task.ts`;
  services `<Noun>Service.ts`; Zod DTOs `*.dto.ts`; each unit gets a local barrel.

### Non-negotiable invariants (the highest-leverage rules)

1. **Server state in TanStack Query, never in Zustand.** Zustand holds *only*
   ephemeral UI state (selection, modes, panels). They never mix in one store.
2. **No browser→Supabase writes.** All writes + privileged reads go through an API
   route → `requireAuth()` → Service → Drizzle. RLS is defense-in-depth, not the gate.
3. **One schema, camelCase end-to-end.** Drizzle (`src/db/schema.ts`) is the source
   of truth; the snake_case↔camelCase boundary is the Drizzle column map only.
4. **Long work is a Job.** Anything > ~1s of server/GPU/LLM time is a Trigger.dev
   `schemaTask`, observed via Trigger Realtime through the shared `useJob` hook —
   no bespoke polling, no `localStorage` recovery, no `window` CustomEvents.
5. **Typed boundaries.** Zod at every edge (API body, tool input, task payload, and
   every workflow step `inputSchema`/`outputSchema`). Ban `any` at boundaries.
6. **One barrel.** Reaching into a module's internals from outside is a lint error.
7. **Use the framework once.** If Mastra ships a primitive (Workflows, Memory, AI
   Tracing, Workspace skills, Scorers, Processors, RequestContext), use it — no
   hand-rolled parallel. Wrapping is allowed; re-implementing is not.
8. **Size limits.** Components < ~400 LOC, routes < ~300 LOC; split god components.

When deciding *where* a change goes, map it to the layer above and place it there.
If unsure, consult `docs/unified/ARCHITECTURE.md` §3–§5 and §12 rather than guessing.

Every step in your plan MUST place changes in the correct layer/folder above,
name the module's `index.ts` contract where relevant, and flag any step that would
touch a dependency-rule boundary or an invariant as a risk.

## Inputs — read them first

1. `findings/assess.md` — primary input, including `## Metadata`.
2. `CLARIFY.md` — short scope framing (if present).
3. **`DECISIONS.md`** — update with the human's Clarify choice **before** drafting.
   Read `human.gate.Clarify.*` and `human.gate.text`. Record option, freeform text,
   in-scope vs deferred.
4. If re-invoked after Verification **[I] Iterate**, human notes are in
   `human.gate.Verification.*` / `human.gate.text`. Update both files only when the
   note is **substantive** (concrete changes requested). If the note is empty, a lone
   letter (`A`, `B`, `P`), or generic approval ("looks good", "approve", "LGTM"), do
   **not** rewrite the plan — respond: "No iteration notes. At Verification pick
   **[A] Approve & build** to implement (Clarify is already done)." Then stop.

## Mandatory spot-checks (before writing PLAN.md)

Run these **once** — do not exploratory re-discover what assess already found.
**Use `grep`, not `rg`** (ripgrep isn't installed on this stage); for literal
strings with regex chars use `grep -rnF`. Keep patterns simple to avoid failed
tool calls:

1. `index.ts` — does `src/domains/interior-designer/index.ts` exist? Read it; note
   what it exports (barrel leak vs missing).
2. **Largest files** — `wc -l` on the 3 largest `.ts`/`.tsx` files in the module.
3. **`z.any()`** — `grep -n 'z\.any()' src/domains/interior-designer/` (especially
   workflow/agent files).
4. **`localStorage`** — `grep -rn localStorage src/domains/interior-designer/services/`
   or job-related paths.
5. **Schema inversion** — does `src/db/schema.ts` import from the module's local
   `db/schema.ts`? Read both if assess flagged it.

Correct any stale assess claim you find; note corrections in the plan.

## Build the plan

Group findings into concrete **improvement items**:

```
### [Priority] Title
- Problem: what's wrong today (cite finding + location)
- Impact: why it matters
- Change: files/layers to create/modify/delete
- Effort: S / M / L
- Verification: typecheck, lint, test, manual
- Depends on: other items first (if any)
```

Prioritization: **P0** security/correctness · **P1** structural unblockers · **P2**
maintainability · **P3** nits.

## Output files

**`PLAN.md`** — if it exists, you may overwrite after your spot-checks (you will have
read the paths above). Structure:

1. **Summary** — 2-4 sentences.
2. **Prioritized items** — P0…P3.
3. **Suggested sequence** — order + **Minimum first increment** (bold the item numbers,
   e.g. Items 1–3 only for first developer visit).
4. **Deferred / out of scope** — explicit list.

**`DECISIONS.md`** — Clarify + any Verification notes.

## Context for downstream build routing

At the end of your work, emit this JSON block in your final response (required for
the workflow graph to skip UX Designer on backend-only plans):

```json
{
  "context_updates": {
    "plan.has_ui_surface": "yes|no",
    "plan.has_p0_security_issue": "yes|no"
  }
}
```

Set `plan.has_ui_surface` from `findings/assess.md` metadata and the planned increment:
- `"no"` when the minimum first increment is imports/schema/layers/Mastra only.
- `"yes"` when the increment changes user-visible UI flows or needs `UX.md`.

## Final response format (Verification gate — keep under 400 words)

Your final response **must** include:

1. **P0 declaration** — `No P0` or `P0 exists` with one-line evidence.
2. **Your Clarify decision recap** — e.g. "**Your Clarify decision: [A] Staged
   migration.** In scope: … Explicitly deferred: …" (3 lines from DECISIONS.md).
3. **First shippable increment** in bold.
4. **Item count** and rough effort (e.g. "8 items, ~2–3 dev days for increment 1").
5. Bulleted plan summary with concrete file references.

6. **Verification reminder:** pick **[A] Approve & build** to implement, **[B]** for
   plan-only, **[I]** only if you want plan changes (type notes), **[X]** to abort.
   (Clarify's A/B/C are already decided — do not type `A` expecting build unless you
   choose option **[A]** on this gate.)

Then stop for **Verification**. Do not implement.

## Handoff

When `PLAN.md` and `DECISIONS.md` are updated, stop. Human reviews at Verification.
On **[I] iterate**, update both files and note what changed.