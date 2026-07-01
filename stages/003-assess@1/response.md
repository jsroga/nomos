Assessment written to `findings/assess.md`.

Verdict: `interior-designer` is significantly off the target architecture. The top 3 gaps to fix first are:
1. Split the 1661-line Zustand god store and move server state/writes out of it.
2. Remove client-side Supabase writes and bespoke polling/localStorage job flows.
3. Add a proper module `index.ts` and migrate toward the canonical `ui/state/io/core/services/tasks` structure.