Assessment written to `findings/assess.md`.

Verdict: interior-designer is materially off the target architecture, with the biggest risks in persistence/state boundaries rather than rendering code.

Top 3 gaps to fix first:
1. Direct browser-side Supabase write in `useInteriorStore`
2. 1.6k-line Zustand store mixing UI, server state, persistence, and domain logic
3. UI-owned fetch/polling/job orchestration instead of `io` + TanStack Query + Trigger job primitives