Assessment written to `findings/assess.md`.

Verdict: `interior-designer` is still strongly legacy-shaped and the first plan should focus on boundary repair, not cosmetic moves.

Top 3 gaps:
1. Direct browser→Supabase write in `store/useInteriorStore.ts`
2. 1661-line Zustand store mixing UI state, server state, persistence, and job orchestration
3. Missing target architecture seams: `index.ts`, `io/`, `services/`, and `tasks/` for this asset module