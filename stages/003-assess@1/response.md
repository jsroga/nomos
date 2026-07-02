Assessment written to `findings/assess.md`.

Short summary:
- `interior-designer` is still a legacy slice: no public `index.ts`, no target-layer folders, and heavy direct imports into internals.
- The highest-risk issue is an active browser-side Supabase write in `renameDesign`, which violates the required API/auth/service path.
- The biggest structural blocker is the 1661-line Zustand store, which mixes UI state, server state, fetches, persistence, and job orchestration.
- Long-running flows are handled with bespoke polling/local metadata in UI components instead of module-owned tasks + shared job primitives.
- Cross-module internal imports are widespread, so encapsulation is currently broken.

Top 3 gaps to fix first:
1. Establish the module contract (`index.ts` + target layering).
2. Remove the client→Supabase write path.
3. Split the monolithic Zustand/polling architecture into `state/io/core/services/tasks`.