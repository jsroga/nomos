## Assessment summary
The interior-designer module is materially off the target architecture in the places that matter most: it mixes UI state, server state, persistence, and long-running job orchestration inside one large client store, and it still has a browser-side Supabase write path. It also lacks the canonical module shape (`index.ts`, layered folders, typed `io/`, server-only `services/`, module-owned `tasks/`), so cleanup can either be staged or done as a full reshape.

## Key gaps (max 5)
- Direct browser → Supabase writes in `store/useInteriorStore.ts` violate the required API → auth → service → Drizzle path.
- The 1661-line Zustand store mixes ephemeral UI state with remote/server state, violating the TanStack Query vs Zustand split.
- Long-running generation/retexture flows use bespoke polling, global store bookkeeping, and `localStorage` instead of Trigger tasks + shared job observation.
- The module has no public `index.ts` or target blueprint folders, so internal imports and ownership boundaries cannot be enforced.
- Interior-designer imports sibling module internals directly, creating coupling that will either need public-barrel exports or `shared/` extraction.

## Pick one scope (buttons are A / B / C — meanings are module-specific below)

The Fabro dock shows generic **[A] [B] [C]** buttons. Your table defines what each means **for this module**:

| Button | What the plan will assume for **this** module |
| --- | --- |
| **[A]** | **Security + architecture foundation.** Plan to remove browser-side Supabase writes first, establish the module’s public barrel and target layer seams, and stage the breakup of `useInteriorStore` into UI-only state + TanStack/`io`/server layers. Also plan the replacement of bespoke job polling, but sequence it to reduce migration risk instead of forcing a one-shot rewrite. |
| **[B]** | **Minimal containment.** Plan only the smallest safe increment: eliminate the direct browser write path and document follow-on work. The large Zustand store, most manual polling/job orchestration, and most folder restructuring would remain deferred. |
| **[C]** | **Full blueprint convergence now.** Plan a full reshape of `src/domains/interior-designer` into `index.ts`, `ui/`, `state/`, `io/`, `core/`, `services/`, and `tasks/`; split server state into TanStack Query; replace custom polling/localStorage job flows with Trigger/shared jobs; and resolve sibling-module internal imports in this same increment. |

**Advanced:** type custom constraints in freeform (routes to [F]) · pick [R] only if assess findings are wrong

**Recommendation: [A]** — it addresses the P0 security issue and lays down the architectural seams needed for a safe migration, without forcing the highest-risk full-module rewrite in one pass.

The [A]/[B]/[C] buttons match this table, not the other way around.