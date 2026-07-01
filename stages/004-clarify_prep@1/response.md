## Assessment summary
`src/domains/interior-designer` is materially off the target module blueprint. The biggest issues are at the architecture boundaries: browser-side writes, a monolithic Zustand store holding server state and persistence logic, and long-running flows managed in UI code instead of the required API/service/task layers.

The module should be cleaned up in dependency order. The safest plan starts by fixing the write path and public API boundary, then splitting state and orchestration, and only then doing the broader folder/module reshape.

## Key gaps (max 5)
- Browser-side Supabase writes in `useInteriorStore` violate the required server write path.
- A 1661-line Zustand store mixes UI state, server state, persistence, and domain logic.
- Texture/retexture/text-to-3d flows use bespoke polling, localStorage secrets, and UI-managed jobs instead of Trigger.dev + shared job primitives.
- The module lacks the target `index.ts` public barrel and canonical `ui/state/io/core/services/tasks` shape.
- App code and sibling modules import module internals directly, including cross-module internals that likely belong in `shared/`.

## Pick one scope (most teams pick A, B, or C)

| Option | What the plan will assume |
| --- | --- |
| **[A] Staged migration** | Fix the unsafe boundaries first: move browser writes behind API → auth → service, introduce a public `index.ts`, add typed DTO seams, and then phase the module toward `ui/state/io/core/services/tasks` while preserving current editor behavior. |
| **[B] Minimal first step** | Limit the plan to the highest-risk leaks only: eliminate browser-side writes, define DTOs/API seams, add the module barrel, and clean up direct route/internal imports; defer the big store split and major UI/task migration. |
| **[C] Full blueprint** | Plan a coordinated end-state migration now: split the god store, move long-running generation flows to Trigger tasks, reorganize the module to the canonical blueprint, and remove cross-module internal imports in one larger pass. |

**Advanced:** [F] type custom constraints in freeform · [R] re-assess only if findings are wrong

**Recommendation: [A]** — it addresses the security and boundary violations first without forcing a risky one-pass rewrite of the whole editor.