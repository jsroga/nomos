# Plan: Eliminate `as` Type Assertions (ESLint `consistent-type-assertions`)

**Goal:** Drive `@typescript-eslint/consistent-type-assertions` errors to zero across `src/` using type fixes, guards, and shared utilities — not runtime coercion (`?? ''`, `as any` band-aids).

**Baseline (2026-07-09):** ~444 `consistent-type-assertions` errors · ~494 `no-explicit-any` · 22 cross-domain `no-restricted-imports` (deferred unless blocking).

**Principles:**
1. Optional field → guard + branch (`if (action.id)` not `readString(id) ?? ''`)
2. JSON/DB unknown → `recordFromJson` / `readRowString` in `@/shared/data/json-guards.ts`
3. Entity types → `parseEntityType` / `entityMetadata` in storyteller core
4. **Protocol / wire strings → `enum` (preferred over magic strings)** — e.g. `ApprovalActionStatus`, `Phase`, `QuestionMachineState`; use `Set` for membership checks, not `as` casts on string literals
5. Chat ↔ storyteller boundary → shared wire types in `@/shared`, not casts in page
6. Verify each wave: `npx eslint <files>` + `npm run typecheck`

---

## Wave 0 — Foundations (shared types & utilities)

- [x] **W0-01** Add `ApprovalActionStatus` enum in `@/shared/agent-kernel/action-wire.ts` (`pending` | `executing` | `committed` | `rejected`)
- [x] **W0-02** Add `WireAgentAction` interface in shared (matches chat stream shape: `type`, `payload?`, `id?`, `status?`, `reasoning?`)
- [x] **W0-03** Re-export wire types from `@/shared/agent-kernel` barrel
- [x] **W0-04** Point `chat/core/types.ts` `AgentAction` + `ActionStatus` at shared wire types (no duplicate literals)
- [x] **W0-05** Point `StreamAgentAction` in storyteller at shared `WireAgentAction` (remove storyteller-enum mismatch on `status`)
- [x] **W0-06** Rename storyteller history enum to `ActionHistoryStatus` (COMMITTED/UNDONE/REDONE) — stop conflating with approval status
- [x] **W0-07** Add `syncActionStatus(action, status, location?)` to `useChatStream` (id branch vs index branch, single implementation)
- [x] **W0-08** Export `syncActionStatus` from chat domain barrel (via hook return; type exports added)
- [ ] **W0-09** Extend `json-guards.ts` with `readStringArray`, `readBoolean` if needed by API routes
- [ ] **W0-10** Add `projectSeriesBible(project)` helper using `Project.series_bible` typed field (no `as any`)
- [ ] **W0-11** Document wave-0 patterns in `.cursor/rules/eslint-boundaries.mdc` (approval status vs history status)

---

## Wave 1 — `storyteller/page.tsx` (94 errors → 0) ✅

- [x] **W1-01** Replace all `updateActionStatusById` / `updateActionStatus` pairs with `syncActionStatus`
- [x] **W1-02** Remove `projectIdFromRoute` `|| 'unknown'` — use `readString(params?.projectId)`
- [x] **W1-03** Fix `resolveEpisodeId` via `customEventDetailRecord`
- [x] **W1-04** Replace `(event as CustomEvent)` handlers with `customEventDetailRecord`
- [x] **W1-05** Replace `projectAny` with typed `Project` fields + `projectHasStoredPlan()`
- [x] **W1-06** Fix hydration effect bible detection using `Object.keys(series_bible).length`
- [x] **W1-07**–**W1-19** Poster/storyboard, bible handlers, PhaseId, StoryPlanBoard, ActionApprovalModal, review modal payloads
- [x] **W1-23** Remove `setStoryPlan as never`
- [x] **W1-24** ESLint `consistent-type-assertions` clean for `page.tsx`
- [ ] **W1-13** Align `Character` interface with `useStorytellerActions` Character type (single definition)
- [ ] **W1-16** CorkBoard `onAddMessage` — explicit field mapping (done); consider shared Message type later
- [ ] **W1-20** Fix `MemoizedActionComponent` / `ActionCommitted` / `ActionSuggestion` action prop types
- [ ] **W1-21** Fix `setActionHistory` entries to use `WireAgentAction` + `ActionHistoryStatus`
- [ ] **W1-22** Fix `onQuestion` session merge — align `QuestionSession.machineState` type

---

## Wave 2 — Storyteller hooks & state ✅

- [x] **W2-01** `useStorytellerHydration.ts` — `recordFromJson` + `applyUpdatesToStoryPlan`; 0 assertion errors
- [x] **W2-02** `useStorytellerActions.ts` — `StreamAgentAction`, `ProjectLike`, `recordFromJson`; 0 assertion errors
- [x] **W2-03** `ActionHistoryEntry.action` → `StreamAgentAction` (in progress this pass)
- [x] **W2-04** `series_bible` merge via `recordFromJson` (done in useStorytellerActions)
- [x] **W2-05** `useBibleState.ts` — no assertion casts found
- [x] **W2-06** `useEpisodeData.ts` — no assertion casts found
- [x] **W2-07** ESLint clean for `state/` storyteller (assertion rule)

---

## Wave 3 — Storyteller services

**Root cause:** Services read Drizzle `jsonb` columns and CRUD responses as `unknown`, then cast to domain types. Fix by parsing at the boundary — never cast.

- [x] **W3-01** `ContextAssemblyService.ts` — `recordFromJson`, `storyPlanFromJson`, `PhaseId`, typed CRUD rows; 0 assertion errors

### W3-02–W3-11 (remaining services — audit on entry)

- [x] **W3-02** `EntityGraphService.ts` — verify 0 assertion errors
- [x] **W3-03** `ConsistencyService.ts` — `ConsistencyCheckKind` enum + typed beat rows
- [x] **W3-04** `StorytellerCrudService.ts` — (no assertion errors in scope)
- [x] **W3-05** `EntityRegistryService.ts` — `parseEntityType` + `entityMetadata`
- [x] **W3-06** `ReferenceValidatorService.ts` — `validateObject` returns `unknown`
- [x] **W3-11** ESLint clean for `services/` storyteller (assertion rule)

---

## Wave 4 — Storyteller API routes

- [x] **W4-01**–**W4-10** Storyteller API routes — 0 assertion errors in `app/api/storyteller/**`
- [x] **W4-12** ESLint clean for `app/api/storyteller/**` (assertion rule)

---

## Wave 5 — Storyteller UI components

- [x] **W5-01** `CharacterPanel.tsx` — `StorytellerCharacter` + `character-wire` helpers
- [x] **W5-02**–**W5-09** Remaining high-density UI — 0 assertion errors in storyteller `ui/`
- [x] **W5-10** ESLint clean for `ui/` storyteller (assertion rule)

---

## Wave 6 — Storyteller core & agents

- [ ] **W6-01** `action-config.ts` — remove remaining casts in `applyUpdatesToStoryPlan` consumers
- [ ] **W6-02** `CascadeEditor.ts` (9 errors)
- [ ] **W6-03** `ActionTypes.ts` — split wire vs domain action types
- [ ] **W6-04** `ConsistencyTypes.ts` (7 errors)
- [ ] **W6-05** `workflow-tool.ts` (6 errors)
- [ ] **W6-06** `beat-draft-workflow.ts`
- [ ] **W6-07** `ActionFormatters.ts`
- [ ] **W6-08** `ReferenceParser.ts`
- [ ] **W6-09** ESLint clean for `agents/` + `core/` storyteller

---

## Wave 7 — Chat domain

- [ ] **W7-01** `useChatStream.ts` — wire types + `syncActionStatus`; remove casts
- [ ] **W7-02** `useChatStream.test.ts` (16 errors) — update to wire types
- [ ] **W7-03** `AgentLog.tsx`
- [ ] **W7-04** `chat/core/types.ts` — eliminate `any` on payload fields where possible
- [ ] **W7-05** ESLint clean for `domains/chat`

---

## Wave 8 — Other domains (lower priority)

- [ ] **W8-01** `loop-creator/ui/LoopCreatorLayout.tsx` (25 errors)
- [ ] **W8-02** `loop-creator/ui/MarketAnalysisPanel.tsx` (13 errors)
- [ ] **W8-03** `loop-creator/core/graph/state.ts` (12 errors)
- [ ] **W8-04** `world-building-toolkit/tasks/upscale-tile.task.ts` (23 errors)
- [ ] **W8-05** `world-building-toolkit/tasks/generate-tile.task.ts` (17 errors)
- [ ] **W8-06** `world-building-toolkit/state/useWorldUiStore.ts` (14 errors)
- [ ] **W8-07** `game-design/agents/*` cluster (~40 errors)
- [ ] **W8-08** `interior-designer/ui/*` cluster
- [ ] **W8-09** `3d-asset-exporter` cluster
- [ ] **W8-10** `marketing/ui/ThreeDIcon.tsx` (16 errors)

---

## Wave 9 — Shared & app shell

- [ ] **W9-01** `shared/ai/contextAssemblerWorker.ts` (6 errors)
- [ ] **W9-02** `shared/data/deep-merge.ts` — verify no casts
- [ ] **W9-03** `shared/agent-kernel/scorers/*`
- [ ] **W9-04** `shared/observability/observability.ts`
- [ ] **W9-05** App shell pages (`projects/page.tsx`, `login/page.tsx`, asset-exporter)
- [ ] **W9-06** `trigger/utils/llm-logger.ts` (12 errors)

---

## Wave 10 — Cross-domain imports (deferred; fix when blocking)

- [ ] **W10-01** Inventory 22 `no-restricted-imports` violations (storyteller↔chat, loop-creator→chat, etc.)
- [ ] **W10-02** Extract `src/shared/chat/mentions-wire.ts` if needed for mentions
- [ ] **W10-03** Extract `src/shared/world/project-types.ts` if needed
- [ ] **W10-04** Fix shared files importing domains (`contextAssemblerWorker`, etc.)

---

## Wave 11 — Verification & ratchet

- [ ] **W11-01** Full `npx eslint src --quiet` → 0 `consistent-type-assertions`
- [ ] **W11-02** `npm run typecheck` green
- [ ] **W11-03** `npm run test:unit` green
- [ ] **W11-04** `npm run lint` green (all rules)
- [ ] **W11-05** Update baseline in `docs/internal/eslint-guard-template.md`
- [ ] **W11-06** Optional: enable `@typescript-eslint/no-magic-numbers` follow-up plan

---

## Progress log

| Date | Done | Notes |
|------|------|-------|
| 2026-07-09 | Plan created | Baseline 444 assertion errors |
| 2026-07-09 | EntityGraphService | Casts removed; uses json-guards + parseEntityType |
| 2026-07-09 | Wave 0 (partial) | `action-wire.ts`, `ApprovalActionStatus`, `WireAgentAction`, `syncActionStatus`, `ActionHistoryStatus` split |
| 2026-07-09 | W3–W5 storyteller | **Storyteller domain: 0** `consistent-type-assertions` (was 91). Services, API routes, UI, enums. New wire helpers: `character-wire`, `story-plan-wire`, `world-rule-wire`, `consistency-types`. |

---

## Current focus

**Active:** Wave 8+ — other domains (`loop-creator`, `game-design`, `world-building-toolkit`, …). Storyteller domain is **0** assertion errors.
