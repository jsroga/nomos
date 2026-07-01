# Decisions log

## Clarify gate (resolved)

- **Selected option:** [A] Recommended defaults (per CLARIFY.md)
- **Freeform text:** none
- **Resolved at:** stage `Clarify` (human gate)

### What [A] means for this run

Produce a **prioritized, staged** cleanup plan rather than a one-pass reshape or a
narrow first-increment-only slice. Concretely, the plan is constrained as follows:

| Clarify question | Chosen direction (Option A default) | Constraint on the plan |
| --- | --- | --- |
| Q1 — staged vs one-pass | Staged migration led by a new `index.ts` | Establish the public barrel first, then move internals behind it in prioritized slices. No big-bang folder rename. |
| Q2 — UI behavior preservation | Preserve user-visible behavior where practical | Internal state/query rewiring and removal of undocumented implementation details is allowed; do not intentionally change editing/locking UX. |
| Q3 — job orchestration scope | Include job alignment, but later priority | Sequence Trigger/`useJob` migration **after** module boundary + state-layer fixes. Create the structural seams (`tasks/`, server-only services, typed payloads) first. |
| Q4 — DB/schema convergence | Dedicated workstream, sequenced later | Plan schema convergence to `src/db/schema.ts`, but after public API + layer-boundary cleanup. Adapter/re-export boundary acceptable as an interim. |
| Q5 — Mastra consolidation | Consolidate where it reduces local complexity | Type the tool/workflow boundaries and remove obvious parallel primitives; do **not** require a full shared-kernel rewrite in this run. |

### Prioritization consequences

1. **P0/P1 = boundary + state**: the public `index.ts`, stopping deep imports, and
   moving server state to TanStack Query lead the plan.
2. **Jobs, schema convergence, and Mastra-native consolidation are staged later**
   (P2), planned but explicitly sequenced after boundary/state work.
3. **Behavior preservation** is a standing constraint on every UI/state item.
4. A **full blueprint reshape (Option C)** and a **boundary-only stop (Option B)**
   are both out of scope: the plan stages the middle path.
