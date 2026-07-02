Added/changed tests
- `src/app/api/interior-designer/__tests__/designs-route.test.ts`
  - Covers the `designs` route contract that changed:
    - `GET` returns 400 when neither `projectId` nor `designId` is provided
    - `PATCH` returns 400 when `id` is missing
    - `PATCH` returns 403 when access verification fails
    - `PATCH` accepts the new name-only rename path and persists only `name` + `updatedAt`
- `src/domains/interior-designer/__tests__/useInteriorStore.renameDesign.test.ts`
  - Covers the store behavior that replaced the browser Supabase write:
    - successful rename routes through the typed API client and updates the current design name
    - renaming a different design does not overwrite the open design name
    - API failure is surfaced and local state is preserved

What behavior is now pinned down
- Core happy path:
  - design rename succeeds through `PATCH /api/interior-designer/designs`
  - current design title updates in the store after a successful rename
- Edge/error cases:
  - missing route params/body fields produce 400s
  - unauthorized rename attempts produce 403s
  - failed rename requests do not mutate local state
- State transitions:
  - current design rename updates visible state
  - non-current design rename leaves visible state unchanged
  - error path preserves prior state

Commands run
- `npx vitest run src/app/api/interior-designer/__tests__/designs-route.test.ts src/domains/interior-designer/__tests__/useInteriorStore.renameDesign.test.ts` ✅
- `npx vitest run src/domains/interior-designer src/app/api/interior-designer` ✅
- `node scripts/fabro-verify.mjs` ✅
- `npm run test:unit` ❌ blocked by unrelated pre-existing repo failures outside interior-designer

Notable edge cases intentionally left untested
- I did not add UI rendering tests for the new `InteriorDesignerWorkspace` barrel wiring because this increment is plumbing-only and the highest-risk changes were the rename persistence path and typed route validation.
- I did not add tests for every non-design route (`texture`, `material`, `retexture`, `text-to-3d`) because the approved increment’s highest-risk behavioral change was the rename write-path removal; the DTO parse coverage already added by Developer covers those schemas.

Product bugs found
- No interior-designer source defect was exposed by the new tests.
- The full repo unit suite is still red due to unrelated existing failures outside this feature.

Bug: Storyteller config crashes test imports because JSX is used without React in scope
Where: `src/domains/storyteller/config/storyteller-agents.tsx:8`
Repro: `npm run test:unit`
Expected: Storyteller-related tests import config modules without runtime `React is not defined`
Actual: Multiple unrelated suites fail with `ReferenceError: React is not defined`
Suspected cause: `storyteller-agents.tsx` contains JSX (`<Brain ... />`) but the test/runtime transform for that file still requires `React` to be in scope.

Bug: Chat e2e lucide mock is missing the `Heart` export now used by CharacterPanel
Where: `src/domains/chat/components/__tests__/AgentLog.e2e.test.tsx` (failure surfaces via `src/domains/storyteller/components/CharacterPanel/CharacterPanel.tsx:80`)
Repro: `npm run test:unit`
Expected: The lucide mock used by the chat e2e test exports all icons needed by imported storyteller components
Actual: Suite fails with `No "Heart" export is defined on the "lucide-react" mock`
Suspected cause: An outdated partial `lucide-react` mock in that test no longer matches the current storyteller component imports.

Status
- Interior-designer test slice: green
- Full repo `npm run test:unit`: blocked by unrelated existing failures above