## Assessment summary
The interior-designer module is materially off the target architecture in `docs/unified/ARCHITECTURE.md`. Its biggest issue is a 1661-line Zustand store that mixes ephemeral UI state, server state, persistence, and domain logic, plus a live browser→Supabase rename write that bypasses the required API→auth→service→Drizzle path.

This means the plan needs a single scope decision: do we stabilize boundaries first, do only the minimum safety cleanup, or plan a full module-blueprint convergence for `src/domains/interior-designer`?

## Key gaps (max 5)
- A giant mixed Zustand store (`store/useInteriorStore.ts`) violates the core state split: server state is in Zustand instead of TanStack Query, and domain logic is embedded in the store.
- `renameDesign` performs a direct browser→Supabase write, which is a P0 security/correctness violation against the architecture invariants.
- The module has no public `index.ts` and no target skeleton (`ui/state/io/core/services/tasks`), so outside code can keep reaching into internals.
- `DesignManager.tsx` fetches directly and imports `world-building-toolkit` internals, breaking both the dependency rule and cross-module encapsulation.
- Export/retexture/texture-generation flows are ad hoc and component-driven instead of module-owned Trigger.dev jobs with typed boundaries.

## Pick one scope (buttons are A / B / C — meanings are module-specific below)

The Fabro dock shows generic **[A] [B] [C]** buttons. Your table defines what each means **for this module**:

| Button | What the plan will assume for **this** module |
| --- | --- |
| **[A]** | **Staged architecture-first cleanup.** Plan around fixing the browser Supabase write, adding a public `index.ts` plus target folder skeleton, splitting the monolithic store at the boundaries first (UI store vs query/io vs core), and defining how export/retexture moves to module-owned jobs without requiring every legacy component to be fully migrated in the first implementation pass. |
| **[B]** | **Minimal safety pass.** Plan only the smallest set of changes to remove the browser write, add the public barrel, and stop the worst direct UI/network and cross-module-internal coupling, while deferring most store decomposition, task/job normalization, and core extraction to later follow-ups. |
| **[C]** | **Full blueprint convergence now.** Plan a full reshape of `src/domains/interior-designer` into `ui/state/io/core/services/tasks`, move design persistence to TanStack Query + typed API/services, convert export/retexture/AI texture flows into Trigger.dev jobs, replace cross-module internal imports, and extract geometry/terrain logic into pure `core/` modules in one coordinated migration. |

**Advanced:** type custom constraints in freeform (routes to [F]) · pick [R] only if assess findings are wrong

**Recommendation: [A]** — it addresses the P0 browser-write issue and the broken module boundaries first, while keeping the migration realistic for a module whose store, UI, and long-running flows are all tightly entangled.

The [A]/[B]/[C] buttons match this table, not the other way around.