Assessment written to `findings/assess.md`.

Verdict: interior-designer is materially off the target architecture, with the biggest gaps in client-side writes, monolithic Zustand ownership, and bespoke job orchestration.

Top 3 to fix first:
1. Remove direct browser→Supabase writes from `useInteriorStore`.
2. Split `useInteriorStore` into UI-only Zustand + TanStack/io/service layers.
3. Replace polling/localStorage/CustomEvent job flows with module-owned Trigger tasks + shared job primitives.