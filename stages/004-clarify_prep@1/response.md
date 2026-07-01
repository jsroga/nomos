## Assessment summary
`src/domains/interior-designer` is still in a legacy slice shape and misses the target module contract from `docs/unified/ARCHITECTURE.md`. The highest-risk gaps are concentrated in three places: browser-side data writes, a god Zustand store that owns server state and persistence, and custom long-job orchestration that bypasses the shared jobs architecture.

## Key gaps (max 5)
- Browser code writes `interior_designs` directly via Supabase instead of going through API → `requireAuth()` → service → Drizzle.
- `store/useInteriorStore.ts` is a 1.6k-line god store mixing ephemeral UI, persisted scene state, async fetch/write logic, and domain behavior.
- Long-running generation/retexture flows use bespoke polling, `localStorage`, and `window` events instead of module-owned Trigger tasks plus shared `useJob`.
- The module layout is off-blueprint (`components/`, `store/`, `utils/`, `ai/`) and has no `index.ts` public API, so boundaries cannot be enforced.
- UI and cross-module consumers reach into deep internals directly, including other modules’ internals, instead of going through public barrels/shared abstractions.

## Pick one scope (buttons are A / B / C — meanings are module-specific below)

The Fabro dock shows generic **[A] [B] [C]** buttons. Your table defines what each means **for this module**:

| Button | What the plan will assume for **this** module |
| --- | --- |
| **[A]** | Fix the architectural core now: remove browser Supabase writes, move persisted/server state out of Zustand into `io/` + TanStack query/mutation hooks + server services, replace bespoke job plumbing with module `tasks/` + shared job primitives, add a public `index.ts`, and clean up the cross-module deep imports touched by that work. Defer only lower-priority file-size polish and optional contract redesigns. |
| **[B]** | Take the smallest safe step: eliminate direct browser writes and direct UI fetches, extract only enough `io/`/query/service structure to stop the worst violations, but defer the full store breakup, full Trigger job migration, and most module reshaping/boundary cleanup. |
| **[C]** | Plan for full convergence in one pass: reshape the module to the target blueprint (`ui/state/io/core/services/tasks/index.ts`), comprehensively split the god store, replace bespoke jobs entirely, stop deep imports across module boundaries, and move generation/retexture orchestration out of ad-hoc `ai/` code into server services + Trigger tasks even if route/contracts change. |

**Advanced:** type custom constraints in freeform (routes to [F]) · pick [R] only if assess findings are wrong

**Recommendation: [A]** — it addresses the P0 security issue and the two highest-leverage architectural breaks without forcing an all-at-once full-module rewrite.

The [A]/[B]/[C] buttons match this table, not the other way around.