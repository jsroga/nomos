## Assessment summary
`src/domains/storyteller` is still materially off the target module blueprint: its folder layout is legacy, its public barrel leaks internals, and client/server responsibilities are blurred. Planning can start now, but the architect needs one scope decision first because the biggest gaps affect import safety, TanStack/typed-io migration, job orchestration, and Mastra cleanup.

## Key gaps (max 5)
- The module shape is still legacy (`components/`, `hooks/`, `db/`, `tools/`, `mentions/`) instead of `ui/state/io/core/services/agents/tasks/prompts`.
- `src/domains/storyteller/index.ts` exposes private DB/server-only internals, breaking the “one barrel” rule.
- Client hooks/components fetch directly, hold server data locally, and bypass TanStack Query + typed `io/`.
- Long-running storyteller flows still use bespoke recovery patterns (`localStorage`, `window` events) instead of Trigger.dev tasks + shared job primitives.
- The AI layer mixes Mastra-native primitives with parallel hand-rolled orchestration/tracing and still has porous typed boundaries (`any`, `z.any`).

## Pick one scope for the architect

| Option | What the plan will assume |
| --- | --- |
| **[A] Staged migration** | Boundary-first roadmap: tighten `storyteller/index.ts`, map legacy roots to `ui/state/io/core/services/agents/tasks/prompts`, migrate the highest-value server-state flows to TanStack + typed `io/` first, then stage Trigger job migration, schema convergence, and Mastra cleanup after the boundaries are safe. |
| **[B] Minimal first step** | Smallest safe slice only: lock down exports, add missing server-only guards, type the worst boundaries, and define seams for future `state/io/tasks` work; explicitly defer most folder moves, most TanStack migration, Trigger job replacement, and deeper Mastra consolidation. |
| **[C] Full blueprint** | Comprehensive end-state reshape: fully reorganize storyteller into the blueprint, clean all cross-module/internal imports, migrate major client/server flows to TanStack + `io/`, move long-running work to `tasks/`, and make Mastra the only orchestration path planned for this effort. |
| **[F] Custom** | Type your own constraints in freeform |
| **[R] Re-assess** | Only if findings are wrong or code changed since assessment |

**Recommendation: [A]** — storyteller’s biggest risks are boundary and data-flow problems, so a staged migration gives the architect enough scope to fix the real issues without forcing a brittle big-bang rewrite.

The buttons below match this table. Pick the option that fits.