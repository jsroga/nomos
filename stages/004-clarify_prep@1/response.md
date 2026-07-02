## Assessment summary
The interior-designer module is still far from the target slice architecture in `docs/unified/ARCHITECTURE.md`: it has no public barrel, no target layer split, and too much behavior collapsed into a single legacy client store. The most urgent issue is a live browser-side Supabase write path, while the biggest structural problem is that Zustand currently mixes UI state, server state, domain logic, and long-running job orchestration.

## Key gaps (max 5)
- No `index.ts` or target `ui/state/io/core/services/tasks` blueprint, so external code must import internals directly.
- `store/useInteriorStore.ts` is a 1661-LOC god store that mixes ephemeral UI, server data, persistence, serialization, and job side effects.
- `renameDesign` writes directly from browser state code to Supabase, violating the required API → `requireAuth()` → service → Drizzle path.
- Long-running generation/retexture flows use bespoke polling and local metadata instead of module-owned Trigger.dev tasks plus shared job primitives.
- The module imports other domains’ internals directly, which breaks encapsulation and blocks convergence on shared/public APIs.

## Pick one scope (buttons are A / B / C — meanings are module-specific below)

The Fabro dock shows generic **[A] [B] [C]** buttons. Your table defines what each means **for this module**:

| Button | What the plan will assume for **this** module |
| --- | --- |
| **[A]** | **Phased architecture cleanup.** Plan the slice contract first: add `index.ts`, define the target layer map, remove the browser→Supabase write, and split the monolithic store into UI-only Zustand plus typed `io/state` seams. Full Trigger/job consolidation and deeper shared extraction are sequenced after those foundations. |
| **[B]** | **Minimal risk containment.** Plan only the direct-write fix plus the smallest boundary cleanup needed to stop further drift. TanStack Query migration, large store decomposition, task/job unification, and cross-module import cleanup are deferred. |
| **[C]** | **Full blueprint convergence.** Plan the end-state reshape now: `ui/state/io/core/services/tasks`, TanStack Query for server state, Trigger.dev/shared jobs for long work, removal of cross-module internal imports, and migration of legacy `ai/` behavior into server-only services/tasks. |

**Advanced:** type custom constraints in freeform (routes to [F]) · pick [R] only if assess findings are wrong

**Recommendation: [A]** — it addresses the P0 security hole and the core architectural blockers first, without forcing the entire long-running job/runtime migration into one risky pass.

The [A]/[B]/[C] buttons match this table, not the other way around.