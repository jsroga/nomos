Assessment written to `findings/assess.md`.

One-line verdict: `interior-designer` is still in a legacy shape and is breaking the highest-value architecture rules around server writes, state separation, and long-job orchestration.

Top 3 gaps to fix first:
1. Browser → Supabase write in `useInteriorStore`
2. Giant Zustand store mixing remote/server state with ephemeral UI state
3. Bespoke polling/localStorage/CustomEvent job flow instead of module `tasks/` + shared job primitives