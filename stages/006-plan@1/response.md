`PLAN.md` and `DECISIONS.md` are written and grounded against the actual code. Stopping here for the Verification gate.

## What I did
- Recorded the Clarify decision (**[A] Staged migration — boundaries first**) in `DECISIONS.md`, including in-scope vs. deferred.
- Verified every finding against the code (barrel contents, ~40 external importers, schema inversion, client-side "services", workflow `z.any()`, god-file LOC, cross-module coupling). Corrected two stale-draft claims: `index.ts` **exists** and leaks internals (that's the real issue), and `core/` is actually **pure** (injected clock), so no "impure core" item.

## Plan summary
Boundary-first, no P0 (storyteller already has no browser writes; core is pure). Prioritized items:

- **P1 — Schema inversion:** move storyteller's Drizzle tables into `src/db/schema.ts` (it currently imports *up* into the module at `src/db/schema.ts:12-21`); repoint ~40 importers to `@/db`. This gates the barrel.
- **P1 — Narrow `index.ts`:** stop exporting `db/schema`, `access-verification`, and raw `services/*`; add a deep-import lint rule.
- **P1 — Layer skeleton + TanStack:** stand up `io/` + `state/queries/`, migrate the episodes and bible-lock flows off `cachedFetch`/raw `fetch` (anchored on the existing `useEntities`).
- **P1 — Server-only boundaries:** mark real services `server-only`; move the three browser "services" (`Poster`/`Moodboard`/`BeatImage`) out of `services/`.
- **P1/P2 — Jobs:** convert poster/moodboard `localStorage`+CustomEvent recovery into `tasks/*.task.ts` + shared `useJob`.
- **P2 — Thin Mastra:** kill `z.any()` steps (StoryWorkflow lines 112/143/168/216) + hand-rolled Langfuse/event-bus; type `any` in agents.
- **P2/P3 — Type porous boundaries, resolve `mentions↔chat` coupling, split god files (978/922/889/730/639/575 LOC), final folder consolidation + dependency lint.**

Suggested first shippable increment: **Items 1–3**. Full §9 Mastra convergence, `shared/` extraction, and RLS/migration reconciliation are explicitly deferred.

Ready for your review at Verification.