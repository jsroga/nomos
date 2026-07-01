Assessment written to `findings/assess.md`.

Short summary:
- Storyteller has an `index.ts`, but it currently exposes too much: DB schema, services, and agent internals leak through the public barrel.
- The module shape is still legacy (`components/hooks/tools/lib/db`) rather than the target `ui/state/io/core/services/agents/tasks/prompts` blueprint.
- Highest-risk divergences are in client/server boundaries: raw client `fetch`, ad-hoc caching, localStorage/window-event job recovery, and parallel hand-rolled AI orchestration beside Mastra.

Top 3 gaps first:
1. Reshape the module toward the target blueprint.
2. Narrow `src/domains/storyteller/index.ts` to a real public API.
3. Move client-side server state into `io/` + TanStack Query `state/queries/` and retire bespoke fetch/caching patterns.

No code was modified beyond the findings file.