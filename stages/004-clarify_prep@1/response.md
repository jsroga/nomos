## Assessment summary
`interior-designer` is still in a pre-blueprint legacy shape and currently violates the highest-risk architecture rules called out in `ARCHITECTURE.md`. The biggest problems are a direct browser→Supabase write path, a monolithic Zustand store that mixes every concern, and UI components that own fetch/polling/job orchestration instead of going through typed `io/`, TanStack Query, and Trigger tasks.

## Key gaps (max 5)
- Direct client-side Supabase writes from `store/useInteriorStore.ts`, which is a P0 security/correctness issue.
- A 1661-line Zustand store that mixes ephemeral UI state, server state, persistence, jobs, and pure logic.
- UI components (`DesignManager`, `PropertiesPanel`, `Toolbar`) bypass the intended state/io boundary with raw fetches, polling loops, and job status handling.
- The module does not match the canonical blueprint yet: no `index.ts`, no `ui/state/io/core/services/tasks` layering, legacy `components/store/utils/ai` layout.
- Cross-module deep imports and weak typed boundaries (`any`, untyped JSON edges) will make cleanup fragile unless addressed in the plan.

## Pick one scope (buttons are A / B / C — meanings are module-specific below)

The Fabro dock shows generic **[A] [B] [C]** buttons. Your table defines what each means **for this module**:

| Button | What the plan will assume for **this** module |
| --- | --- |
| **[A]** | **Foundation-first alignment.** Plan the P0 write-path fix **and** the minimum structural migration needed to establish the target seams: public `index.ts`, split `state/io/services/tasks`, TanStack Query for server state, and shared job-based async boundaries. This tackles the unsafe persistence path and the architectural hotspots without committing to a full module rewrite in one pass. |
| **[B]** | **Safety-only containment.** Plan only the direct Supabase-write removal, typed API/service path, and the smallest possible store/query adjustments needed to stop unsafe persistence. Most folder reshaping, job-system standardization, component breakup, and deep-import cleanup are deferred. |
| **[C]** | **Full blueprint migration.** Plan a broad end-state reshape of `interior-designer` into the canonical architecture: replace legacy folders with `ui/state/io/core/services/tasks`, move server state fully into TanStack Query, convert long work to module-owned Trigger tasks, extract pure core logic, split oversized components/stores, and clean up cross-module contracts in one coordinated effort. |

**Advanced:** type custom constraints in freeform (routes to [F]) · pick [R] only if assess findings are wrong

**Recommendation: [A]** — it addresses the P0 browser-write issue and the root-cause boundary problems together, without taking on the delivery risk of a full one-pass module rewrite.