Added targeted automated coverage for the architecture-alignment slice and fixed one low-risk source bug exposed while writing tests.

### Tests added

1. **`src/app/api/storyteller/episodes/__tests__/route.test.ts`**
   - Pins down the `GET /api/storyteller/episodes` and `POST /api/storyteller/episodes` contract.
   - Covers:
     - `400` when `projectId` is missing
     - `403` when project access is denied
     - happy-path authorized `GET` returning the typed episode list
     - `400` when `POST` body fails DTO validation
     - happy-path `POST` inserting **camelCase** fields (`projectId`, `masterPrompt`, etc.) and returning the created episode

2. **`src/domains/storyteller/hooks/__tests__/useEpisodeData.test.ts`**
   - Covers the top migrated server-state hook behavior.
   - Covers:
     - override-driven empty/non-empty state via `LocalStorageKeys.FORCE_STORYTELLER_STATE`
     - hydration of selected episode/title from the new query-backed data
     - transition when selecting another episode and pushing the URL state

3. **`src/domains/storyteller/hooks/__tests__/useBibleState.test.ts`**
   - Covers the migrated Bible-lock/query-backed hook behavior.
   - Covers:
     - default `bible=open` URL behavior on first visit
     - exposure of fetched lock state (`isBibleLocked`, `bibleLockedBy`)
     - transition when toggling the Bible open, including the `bible-opened` event

### Source fix made during testing

- **File:** `src/app/api/storyteller/episodes/route.ts`
- **Fix:** invalid `POST` payloads now return **`400 Invalid episode payload`** instead of falling into a generic `500`.
- This was a real boundary bug: the new Zod validation existed, but parse failures were not surfaced as client errors.

### UX states / edge cases covered

- **Error states**
  - missing query param
  - access denied
  - invalid episode creation payload
- **Empty / forced state transitions**
  - `HAS_EPISODES` override in `useEpisodeData`
- **Success / happy path**
  - typed episode list fetch
  - episode creation with camelCase fields
  - selected-episode hydration
  - Bible auto-open and lock-state hydration
- **Important transitions**
  - selecting an episode updates URL state
  - toggling Bible open dispatches the expected event

### What I could not complete

I **could not run** `npm run test:unit` or `npm run typecheck` in this environment because the container has **no `node`/`npm` binaries installed**.

Repro:
- `npm run test:unit` → `/bin/bash: npm: command not found`
- `npm run typecheck` → `/bin/bash: npm: command not found`

### Risk-based gaps left untested

- I did **not** add broader integration coverage for the many import rewires from `@/domains/storyteller` → `@/db` / `@/shared/auth`, because the highest-risk observable behaviors in this increment are the new typed episode boundary and the migrated query-backed hooks.
- I did **not** add UI component tests for sidebar empty/error rendering because the shipped code in this increment primarily changed hooks/routes, not the component rendering layer itself.

If you want, the next best step is to run:
- `npm run typecheck`
- `npm run test:unit`

in an environment with Node/npm available, then loop back on any concrete failures.