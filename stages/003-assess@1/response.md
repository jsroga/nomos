Assessment written to `findings/assess.md`.

Short summary:
- The module is far from the target blueprint: no public `index.ts`, legacy foldering, no `io/services/tasks` structure.
- The biggest issue is active client-side Supabase writing in `useInteriorStore.renameDesign`, which violates the server-only write path.
- The next biggest issue is the 1661-line Zustand store mixing UI state, server state, persistence, and core logic.
- UI components also fetch directly, dispatch browser events, and import another module’s internals, so dependency boundaries are currently unenforceable.

Top 3 gaps:
1. Remove the client Supabase write path.
2. Split `useInteriorStore` into UI-only Zustand + TanStack/server data + pure core logic.
3. Introduce the canonical module contract (`index.ts`, `io/`, `services/`, `tasks/`) and stop deep internal imports/fetches from UI.