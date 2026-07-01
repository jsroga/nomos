## Assessment summary
`src/domains/interior-designer` is materially off the target module blueprint. The biggest issues are a client-side Supabase write path, a very large Zustand store that mixes UI and server concerns, and long-running retexture/export flows that bypass the shared Trigger.dev job model.

This means the plan should focus first on restoring safe boundaries and layering, then on moving async work and cross-module seams into the architecture contract.

## Key gaps (max 5)
- Direct browser → Supabase writes in `useInteriorStore` break the server-only persistence rule.
- A 1661-line Zustand store mixes ephemeral UI state, server state, persistence, jobs, and domain logic.
- Retexture/export uses bespoke polling and client recovery instead of module-owned Trigger tasks + shared job hooks.
- The module deep-imports internals from `world-building-toolkit` and `3d-asset-exporter`.
- Legacy `ai/TextureService.ts` plus weak DTO typing leave the server/task boundary unclear.

## Pick one scope (most teams pick A, B, or C)

| Option | What the plan will assume |
| --- | --- |
| **[A] Staged migration** | Create a safe migration path: first introduce `index.ts`, `state/`, `io/`, and `services/` around design CRUD and auth-safe persistence; then move retexture/export into `tasks/` + shared job primitives; finally clean up cross-module API boundaries and leftover legacy AI/util code. |
| **[B] Minimal first step** | Limit the plan to the highest-risk fixes first: remove browser writes, add typed DTO/API/service seams for design CRUD, and split server state out of Zustand, while deferring full retexture/export and broader folder convergence. |
| **[C] Full blueprint** | Plan a full reshape now: migrate to `ui/state/io/core/services/tasks`, replace the god store, convert retexture/export to Trigger tasks, eliminate deep cross-module imports, and either remove or properly relocate incomplete AI code. |

**Advanced:** [F] type custom constraints in freeform · [R] re-assess only if findings are wrong

**Recommendation: [A]** — it fixes the active security/architecture risks first without forcing the whole module into a single high-risk rewrite.