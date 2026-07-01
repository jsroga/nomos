Added focused coverage for the shipped **P0-1 rename flow**, but I’m **not handing back a fully green repo-wide test run** because `npm run test:unit` is blocked by **pre-existing, unrelated failures outside this increment**.

### Test files added
- `src/domains/interior-designer/__tests__/useInteriorStore.renameDesign.test.ts`
  - Pins down the client/store contract for rename:
    - sends `PATCH /api/interior-designer/designs` with `{ id, name }`
    - updates `currentDesignName` from the API response when the renamed design is open
    - leaves `currentDesignName` unchanged when renaming a different design
    - preserves local state and throws on API failure
    - falls back to a generic error when the failed response body is not JSON

- `src/app/api/__tests__/interior-designs-route.test.ts`
  - Pins down the route/auth contract for rename:
    - returns `400` when `id` is missing
    - returns `401` when unauthenticated
    - returns `403` when the user lacks design access
    - accepts a **name-only PATCH** and persists `updatedAt`

### UX / state coverage
For what was actually built, the tests cover the meaningful states:
- **Success:** rename request succeeds and the open design name updates
- **No-op local state case:** renaming another design does not clobber the open design label
- **Error:** server rejection surfaces as a thrown error and local state is preserved
- **Edge/error body case:** malformed/non-JSON error response still yields a stable fallback error
- **Auth boundary:** missing auth and unauthorized access are rejected at the route

I intentionally did **not** add UI tests for `DesignManager` because this increment changed the **store/API seam**, not the UI behavior or rendering states.

### What I ran
Passed:
- `npx vitest run src/domains/interior-designer/__tests__/useInteriorStore.renameDesign.test.ts src/app/api/__tests__/interior-designs-route.test.ts`
- `npx eslint src/domains/interior-designer/__tests__/useInteriorStore.renameDesign.test.ts src/app/api/__tests__/interior-designs-route.test.ts`

Blocked by unrelated existing repo issues:
- `npm run test:unit`
- focused `tsc` run for the new tests/import graph

### Product bugs found in the shipped rename flow
- None. The shipped rename behavior passed the targeted store + route tests without requiring source changes.

### Why the full suite is still red
These are existing repo-level blockers unrelated to the rename-flow tests I added:

```text
Bug: Storyteller test imports fail because React is not defined in a TSX config module
Where: src/domains/storyteller/config/storyteller-agents.tsx:8
Repro: npm run test:unit
Expected: Storyteller-related test suites import successfully
Actual: ReferenceError: React is not defined
Suspected cause: JSX in the TSX config file relies on React being in scope under the current Vitest transform/runtime setup
```

```text
Bug: Chat/storyteller test path uses an incomplete lucide-react mock
Where: surfaced at src/domains/storyteller/components/CharacterPanel/CharacterPanel.tsx:80 during src/domains/chat/components/__tests__/AgentLog.e2e.test.tsx
Repro: npm run test:unit
Expected: mocked lucide-react exports cover icons used by imported components
Actual: Error: No "Heart" export is defined on the "lucide-react" mock
Suspected cause: the partial lucide-react mock used by that suite is missing Heart
```

```text
Bug: interior store still has pre-existing strict-null TypeScript errors
Where: src/domains/interior-designer/store/useInteriorStore.ts:1336-1338
Repro: NODE_OPTIONS=--max-old-space-size=8192 node ./node_modules/typescript/lib/tsc.js -p /tmp/tsconfig.interior-rename-tests.json --pretty false
Expected: interior store typechecks cleanly
Actual: TS18048: 'currentSeg' is possibly 'undefined'
Suspected cause: combineWalls dereferences currentSeg before the nullability risk is fully eliminated
```

### Intentionally left untested
- `DesignManager` UI interaction flow itself  
  Reason: this increment did not change component rendering or user interaction logic; the highest-risk regression was the **write-path/auth boundary**, which is better covered at the store and route seams.

If you want, the next loop should go to the Developer to clear the unrelated suite/typecheck blockers above before a full green gate is possible.