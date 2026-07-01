Implemented **Visit 1 / Item P0-1 only**.

### Files modified
- `src/domains/interior-designer/store/useInteriorStore.ts`

### What changed
- `renameDesign` no longer does a browser-side Supabase write.
- It now calls the existing authed API:
  - `PATCH /api/interior-designer/designs`
  - body: `{ id, name }`
- Added response error handling for failed rename requests.
- Kept local state behavior: if the renamed design is currently open, `currentDesignName` updates from the API response.
- Removed an unused `useShallow` import in the same file while touching it.

### Files created
- None

### Files deleted
- None

### Scope check
- Stayed within the approved minimum increment’s **first item only (P0-1)**.
- Did **not** implement:
  - P1-2 public barrel
  - P1-3 DTO/io layer
  - P1-4 cross-module import cleanup

### Verification
- Confirmed via grep that there are now **zero `supabase` / `getSupabaseClient` references** under `src/domains/interior-designer`.

### Static checks
- `npm run typecheck`  
  - attempted twice
  - full run hit environment/resource limits (`tsc` OOM / killed)
  - focused typecheck on the changed file surfaced **pre-existing** TS errors unrelated to P0-1:
    - `src/domains/interior-designer/store/useInteriorStore.ts:1336-1338`
    - `TS18048: 'currentSeg' is possibly 'undefined'`

- `npm run lint`
  - full repo lint is currently blocked by an **unrelated existing** error outside this increment:
    - `src/domains/loop-creator/agents/concept-evaluator.ts:10`
    - unused import: `LoopAgentAction`
  - targeted ESLint on the changed file reports warnings only, no errors after the import cleanup.

### Deviations from plan
- None for implementation scope.
- Only incidental cleanup was removing one unused import in the edited file.

### Deferred work
- Everything after P0-1 remains deferred to the next visit, starting with **P1-2**.