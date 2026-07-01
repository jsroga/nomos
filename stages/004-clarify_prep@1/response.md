## Assessment summary
The `interior-designer` module is still organized as a legacy slice, not the target vertical module blueprint. Its biggest issues are not cosmetic: it currently bypasses the required server write path, keeps provider credentials in the browser, and concentrates UI state, server state, persistence, and job logic inside one oversized Zustand store.

## Key gaps (max 5)
- Browser-side Supabase writes bypass `API route -> requireAuth() -> Service -> Drizzle`.
- Third-party generation keys are stored/read in the browser via `localStorage`.
- `useInteriorStore.ts` is a 1.6k-line god store mixing ephemeral UI state with server state and domain logic.
- UI components call `fetch` directly and hand-roll polling/job orchestration instead of using `io/`, TanStack Query, and shared job primitives.
- The module has no `index.ts` public API and reaches into another module’s internal store.

## Pick one scope (buttons are A / B / C — meanings are module-specific below)

The Fabro dock shows generic **[A] [B] [C]** buttons. Your table defines what each means **for this module**:

| Button | What the plan will assume for **this** module |
| --- | --- |
| **[A]** | **Boundary-first migration.** Plan the first wave around fixing the dangerous architecture breaks first: remove browser Supabase writes, move provider secrets server-side, split the god store by responsibility, move UI-owned fetch/polling behind `io/` + TanStack Query + jobs, then reshape folders/barrels as part of that path. |
| **[B]** | **Security-only first wave.** Plan only the minimum needed to remove the P0 issues now: replace direct browser writes and browser-held provider keys, while deferring the larger state/query/task/module-structure migration. |
| **[C]** | **Full blueprint convergence.** Plan a full module rewrite toward the target architecture: add `index.ts`, reorganize into `ui/state/io/core/services/tasks`, move server state out of Zustand, align long-running work to Trigger tasks/shared jobs, and fix cross-module boundary violations in the same program. |

**Advanced:** type custom constraints in freeform (routes to [F]) · pick [R] only if assess findings are wrong

**Recommendation: [A]** — it addresses the active security/boundary risks immediately without forcing the entire module to be restructured in one risky step.

The [A]/[B]/[C] buttons match this table, not the other way around.