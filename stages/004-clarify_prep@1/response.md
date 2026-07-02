## Assessment summary
The interior-designer module is still far from the target slice architecture in `docs/unified/ARCHITECTURE.md`: it has no public `index.ts`, no canonical layer split, and still relies on a large legacy store plus direct UI/data coupling. The most urgent problem is a live browser→Supabase write path inside `useInteriorStore`, with additional architectural debt around long-running jobs, cross-module deep imports, and misplaced server/AI logic.

## Key gaps (max 5)
- Client-side Supabase write still exists in `store/useInteriorStore.ts` (`renameDesign`), violating the server-only write path.
- `store/useInteriorStore.ts` is a 1661-line mixed-responsibility store holding UI state, server state, persistence, side effects, and pure logic.
- The module still uses legacy folders (`components/`, `store/`, `utils/`, `ai/`) instead of `ui/state/io/core/services/tasks`, and has no public barrel.
- UI components directly fetch API routes and import another module’s internal store (`world-building-toolkit/store/useWorldStore`), breaking the dependency and one-barrel rules.
- Long-running work and texture generation bypass the target job/task architecture and typed server-only boundaries.

## Pick one scope (buttons are A / B / C — meanings are module-specific below)

The Fabro dock shows generic **[A] [B] [C]** buttons. Your table defines what each means **for this module**:

| Button | What the plan will assume for **this** module |
| --- | --- |
| **[A]** | **Security-first foundation.** Plan the public `index.ts`, add the initial `io/`, `services/`, and `tasks/` skeleton, remove the browser→Supabase write path via server-only boundaries, and split the first chunk of `useInteriorStore` into UI-only Zustand vs TanStack/server data. Defer most UI/file relocation and deeper component breakup to later increments. |
| **[B]** | **Minimal containment.** Plan only the smallest safe change set to eliminate the client Supabase write and tighten the persistence boundary around design reads/writes, while leaving the large store and most of the current folder layout in place for now. |
| **[C]** | **Full blueprint convergence.** Plan a full reshape of `src/domains/interior-designer` into `ui/state/io/core/services/tasks`, move pure geometry/export logic out of the store and oversized components, replace bespoke async orchestration with module-owned Trigger tasks + shared job status, and retire the ad hoc `ai/` path in favor of typed server services/tasks. |

**Advanced:** type custom constraints in freeform (routes to [F]) · pick [R] only if assess findings are wrong

**Recommendation: [A]** — it addresses the P0 security/data-path issue first while also creating the minimum architecture seams needed to safely decompose the store and converge on the blueprint without committing to a full module rewrite in one step.

The [A]/[B]/[C] buttons match this table, not the other way around.