Implemented the approved boundary-first increment.

What changed:
- **Schema source of truth moved to `src/db/schema.ts`**
  - Moved storyteller tables/relations into `src/db/schema.ts`
  - Deleted `src/domains/storyteller/db/schema.ts`
  - Updated schema consumers to import from `@/db`

- **Access verification moved to shared auth**
  - Added `src/shared/auth/storyteller-access.ts`
  - Added `src/shared/auth/index.ts`
  - Deleted `src/domains/storyteller/lib/access-verification.ts`
  - Updated route/dynamic imports to use `@/shared/auth`

- **Storyteller barrel narrowed**
  - Removed schema/access/service wildcard leakage from `src/domains/storyteller/index.ts`
  - Kept curated public server entry points and existing UI/hooks/types

- **Target `io/` + `state/queries/` scaffolding added**
  - Added:
    - `src/domains/storyteller/io/storyteller.dto.ts`
    - `src/domains/storyteller/io/storyteller.keys.ts`
    - `src/domains/storyteller/io/storyteller.api.ts`
    - `src/domains/storyteller/state/queries/useEpisodes.ts`
    - `src/domains/storyteller/state/queries/useBibleLock.ts`

- **Top client server-state hooks migrated off `cachedFetch`**
  - `useEpisodeData` now uses TanStack-backed `useEpisodes` / `useEpisode`
  - `useBibleState` now uses TanStack-backed `useBibleLock`
  - `useEntity` query keys now route through `storyteller.keys`

- **Episodes API moved toward typed/camelCase boundary**
  - `src/app/api/storyteller/episodes/route.ts` now uses Drizzle + DTO parsing instead of Supabase admin fetches
  - `src/app/api/storyteller/bible/lock/route.ts` now uses shared DTO parsing for query/response

Notes:
- I also updated the affected API/service/eval imports so schema/access no longer come from `@/domains/storyteller`.
- I could **not run `npm run typecheck` or tests** here because `npm` is unavailable in this environment, so validation was limited to static inspection and import-path auditing.