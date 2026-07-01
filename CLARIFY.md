# Clarify reference

## Summary
The interior-designer module is materially off the target architecture: client state, persistence, long-running work, and cross-module coupling are all mixed together. The safest sequencing is to fix the boundary violations first, then reshape the module into the blueprint without breaking the existing page/editor experience.

## Key risks (max 5)
- Client-side Supabase writes in Zustand violate the required API → auth → service write path.
- The 1661-line store mixes UI state, server state, persistence, and pure domain logic, so almost every change is high-risk.
- Long-running texture/retexture flows use bespoke polling, localStorage secrets, and UI-managed job state instead of Trigger.dev jobs.
- The module has no public barrel or canonical slice layout, so app code and sibling modules import internals directly.
- Cross-module internal imports suggest some asset/project concerns may belong in `shared/` rather than remaining private module internals.

## Scope mapping
| Option | Posture for this module |
| A | Staged migration: first stop unsafe boundary leaks (browser writes, ad-hoc job path, public API gap), then split `state/io/core/services/tasks` behind compatibility seams. |
| B | Minimal first step: only fix the highest-risk architecture leaks now (server write path, DTOs, barrel, route import cleanup), while deferring the store split and major UI decomposition. |
| C | Full blueprint: fully reorganize to `index.ts + ui/state/io/core/services/tasks`, split the god store, move long work to Trigger tasks, and remove cross-module internal imports in one coordinated pass. |
