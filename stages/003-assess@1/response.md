Assessment written to `findings/assess.md`.

Verdict: `interior-designer` is still materially off the target architecture. The first three gaps to fix are:
1. direct client-side Supabase write in `useInteriorStore`
2. monolithic Zustand store mixing UI/server/persistence/job logic
3. UI-owned fetch/polling/job orchestration instead of `io/` + `tasks/` + shared job hooks