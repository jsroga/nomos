Assessment written to `findings/assess.md`.

Verdict: interior-designer is still a legacy flat slice and is materially off-target in three places first: direct browser-side persistence, a monolithic Zustand store carrying server state, and bespoke polling/job orchestration in UI components.

Top 3 gaps to fix first:
1. Remove browser → Supabase writes; route all writes through typed API/service/Drizzle paths.
2. Split `useInteriorStore` into UI-only Zustand state plus TanStack Query + `io/` for server data.
3. Replace component-level polling/global job bookkeeping with module-owned Trigger tasks and shared job observation.