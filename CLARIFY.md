# Clarify reference

## Summary
interior-designer is still in a pre-blueprint shape: client state, persistence, job orchestration, and cross-module dependencies are tangled inside legacy `components/`, `store/`, `utils/`, and `ai/` folders. The first plan should restore the architecture contract at the highest-risk seams first, especially browser writes, server state ownership, and long-running job handling.

## Key risks (max 5)
- Direct browser → Supabase writes in `useInteriorStore` violate the server-only persistence rule.
- The 1661-line Zustand store mixes UI state, server state, persistence, and domain logic, blocking clean layering.
- Retexture/export flows use bespoke polling and client recovery instead of module-owned Trigger tasks + shared job primitives.
- The module imports internals from `world-building-toolkit` and `3d-asset-exporter`, preventing a clean public API boundary.
- Legacy `ai/TextureService.ts` and weak DTO typing make the asset-module server boundary ambiguous.

## Scope mapping
| Option | Posture for this module |
| A | Stage the migration: first carve out `index.ts`, `state/`, `io/`, and `services/` for design CRUD/auth-safe persistence; then move retexture/export to `tasks/` and shared job APIs; finally clean cross-module/public API seams. |
| B | Take the minimum safe step: stop browser writes, add typed DTO/API/service seams for design CRUD, and split ephemeral UI state from server state without fully reshaping retexture/export yet. |
| C | Do the full blueprint pass now: reshape folders to `ui/state/io/core/services/tasks`, replace the god store, convert retexture/export to Trigger tasks, remove internal cross-module imports, and resolve dead/incomplete AI code. |
