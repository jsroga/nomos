# Quality Improvement Spec — World Building Kit

> Spec-driven development plan for raising code quality across the repo (top-level)
> and the `storyteller` domain specifically.
>
> **Status:** In progress · **Owner:** TBD · **Last reviewed:** 2026-07-06
>
> This document is written *spec-first*: every initiative below states the
> **Problem**, an **Evidence** pointer (file:line), the **Spec** (the target
> behaviour/contract), explicit **Acceptance Criteria**, and a **Verification**
> step. Implement against the spec, not the prose.

---

## Implementation status — updated 2026-07-06

Baseline gates (run before every change): `npx knip` (0 findings), `npm run lint:ratchet`
(≤ baseline), `npm run test:unit` (colocated tests under `src/**/__tests__/`).
ESLint warning baseline currently **1724** (`eslint-warnings-baseline.txt`);
typecheck baseline **0** (`typecheck-baseline.txt`).

### Done

| Item | Summary |
|------|---------|
| **Q-1** | Typecheck ratchet (`scripts/typecheck-ratchet.mjs`) + blocking CI step |
| **Q-2** | ESLint ratchet (`scripts/eslint-ratchet.mjs`) + blocking CI step; `continue-on-error` removed |
| **Q-4** | Hardcoded `INTERNAL_DOCS_SECRET` fallback removed — fail-closed |
| **Q-8** | Single `getUserSession` in `lib/auth.ts`; `api-utils` re-exports it |
| **Q-10** | Empty MCP stub domains (loop-creator/interior-designer/world-building) removed |
| **ST-1** | `prompts/push-to-hub.ts` implemented (Langfuse); config comments de-LangSmith'd |
| **ST-2** (partial) | Stream route 1,499 → 940 LOC. Extracted `services/context-assembly.ts` + `config/tool-result-mapper.ts` (pure, 17 unit tests). Remaining: SSE-loop extraction (needs e2e/DB to verify safely). |
| **ST-4** | Single `Phase` enum in `enums.ts` (`+ PhaseId`); dead `types.ts` enum removed |
| **ST-5** | Canonical `cast` normalizer in `utils/story-plan-fields.ts`; aliasing centralized |
| **ST-6** | Unit tests for merge/persist + anti-slop (`__tests__/action-config`, `prose-quality-scorer`) |
| **ST-7** | Shared `utils/deep-merge.ts` + `guardrails/anti-slop-phrases.ts` (dedup) |
| **ST-11** | Stale LangChain/LangGraph comments + unused import removed |
| **Agent dedup** | `agent-core/agents/agent-response.ts` (`extractThinking`, `truncateForTrace`, `TRACE_PREVIEW_CHARS`, 8 unit tests). Replaced the duplicated `(response as any).reasoning \|\| .thinking \|\| .steps[0]` + `.slice(0,500)` across 6 council agents. Centralized `'openai:gpt-4o'`/`maxSteps: 10` magic literals into `AGENT_RUNTIME_DEFAULTS`. Warnings 1724 → 1701. |
| **De-regex creative judgment** | Removed regex-based *creative-quality* heuristics: deleted `prose-quality-scorer.ts` (SLOP_PATTERNS), `scene-necessity.ts`, `visual-hook-validator.ts` + dead `inferEffortFromMessage`/`inferEffortFromBeat`/`estimateCost`. `self_critique` tool is now **LLM-only** (`SelfCritiqueAgent`); `story-workflow` creative-decision uses the LLM critique score. Slop list retained as **prompt guidance** only (`formatBannedPhrasesForPrompt`). Kept mechanical regex (entity-link/URL parsing). Warnings 1701 → 1697. Tradeoff: each self-critique is now a (cheap-model) LLM call instead of free regex. |
| **Storyteller modularization** | Consolidated **20 root folders → 7** via an alias-based codemod (186 import specifiers across 118 files): `agents/` (+planner, graph, workflows), `components/` (+hooks, mentions), `prompts/` (+guardrails, schemas, skills), `services/` (+lib, context, db), `core/` (enums, types, actions, consistency, questions, utils), plus `config/` & `tools/`. Verified: tsc 0 errors, knip clean, 288 tests. Fixed non-import string refs (`SKILLS_DIR`, `drizzle.config.js`, `langgraph.json`). |
| **Cleanup** | Root junk artifacts removed + `.gitignore`; Knip-confirmed dead code removed; `/skills` moved into the storyteller domain (`SKILLS_DIR` constant) |
| **LangGraph removal** | Loop Creator migrated to Mastra orchestrator (`loop-orchestrator.ts`); `@langchain/langgraph` removed from dependencies; market analyst uses Mastra Agent |
| **Shared layer (partial)** | `shared/auth`, `shared/errors`, `shared/data`, `shared/agent-kernel` absorbing `lib/` + `agent-core/` + Mastra Studio entry |
| **Test layout** | Removed stale top-level `tests/` folder; unit tests colocated in `src/**/__tests__/`; see `docs/TESTING.md` |

### Next steps (prioritized)

1. **Q-3** `P1` — flip `next.config.js` `ignoreBuildErrors`/`ignoreDuringBuilds` to `false`
   once baselines hold (needs a clean `npm run build`; verify locally first).
2. **ST-2 (finish)** `P1` — route is down to 940 LOC; remaining work is extracting the
   SSE streaming loop (workflow-event bridging + chunk handler) into a `stream-events`
   module. Deferred until the storyteller e2e suite can run (needs DB) to verify safely.
3. **ST-3** `P1` — externalize the ~320-line Showrunner prompt into `prompts/agents/showrunner.ts`.
4. **ST-8** `P2` — type the tool boundary (`z.infer` instead of `args: any`) — biggest
   dent in the 1724 warning baseline.
5. **Q-7** `P2` — once warnings are down, promote `unused-imports/no-unused-vars` to `error`.
   (~652 `no-unused-vars` remain; clear per-directory, lowering the baseline each pass.)
6. **Q-5 / Q-6 / Q-9** — Trigger env allowlist, CI test tiers, migration-ownership doc
   (need a running env / infra access to verify).
7. **ST-9 / ST-10** `P2` — error-handling convention; split god UI components.
8. **Revive AGENT_MODEL_MATRIX tuning** `P2` — the matrix defines per-agent `temperature`/`topP`/
   `maxOutputTokens` with rationales, but **only `.model` is consumed**; the sampling params are
   dead. BLOCKER: Mastra `agent.generate()` in this version does not type `temperature`/`topP`
   (the Showrunner only passes them via an `as` cast, which may be a runtime no-op). Verify the
   correct Mastra knob (Agent `modelSettings`/`defaultGenerateOptions`) before wiring, and confirm
   with the agent e2e suite that sampling actually changes output. Until then the tuning is inert.
9. **CouncilAgent base class** `P2` (WBK-wide) — the 6 council agents (`psychologist`, `consequence`,
   `gardener`, `devils-advocate`, `creative-director`, `self-critique`) share identical boilerplate
   (toolsMap reduce, `new Agent({...})`, `createAgentTrace`, `withSpan`+generate+record). Extract a
   `agent-core/agents/CouncilAgent` base/factory reusable by loop-creator & interior-designer.
   Needs agent e2e/DB to verify; do not do blind.
10. **Unify the 3 model-config sources** `P2` — `agent-core/models.ts` (`MODELS`, both files literally
    say "one file to rule them all"), `agents/v2/model-config.ts` (`AGENT_MODEL_MATRIX`), and the
    `MODELS.generation.primary` usage in premise-architect. Consolidate into one registry +
    `AGENT_RUNTIME_DEFAULTS`. Also type the tool boundary (ST-8) — `Agent.tools` currently receives
    `Record<string, unknown>`, a pre-existing TS error masked by `ignoreBuildErrors`.

### Notes / carve-outs

- `scripts/` reorg is deliberately **deferred**: scripts use relative `../src` imports and
  can't be runtime-verified without env; a move needs import rewrites + `package.json` updates.
- `LiquidGlass.tsx` is **live** (used by `AsyncStatusIndicator`) — its old Knip ignore was stale.
- Eval CLI scripts (`extended-thinking-ab-test.ts`, `eval-architecture.ts`) are kept — they're
  documented entrypoints, not dead code.

---

## 0. How to use this document

1. Each work item (`Q-#` top-level, `ST-#` storyteller) is independently
   shippable. Pick one, satisfy its Acceptance Criteria, verify, ship.
2. Items are ordered roughly by **risk-reduction per unit effort**. Do P0 before P1.
3. Do not expand scope inside an item. If you discover adjacent debt, file a new
   `Q-#`/`ST-#` rather than growing the PR.
4. "Done" means Acceptance Criteria pass **and** the Verification command is green.

### Priority legend

| Priority | Meaning |
|----------|---------|
| **P0** | Correctness/safety gate. Blocks regressions from reaching prod. |
| **P1** | Structural risk. High blast-radius files / weak typing. |
| **P2** | Maintainability & consistency. |
| **P3** | Polish / nice-to-have. |

---

## 1. Current-state baseline (facts, not opinions)

| Dimension | State | Evidence |
|-----------|-------|----------|
| TS strictness | `strict: false`; only `strictNullChecks` + `useUnknownInCatchVariables` | `tsconfig.json:11`, `:33-34` |
| Build gates | Build ignores TS **and** ESLint errors | `next.config.js` (`ignoreBuildErrors`, `ignoreDuringBuilds`) |
| CI typecheck | Runs but `continue-on-error: true` (non-blocking) | `.github/workflows/ci.yml:32-36` |
| CI ESLint | Runs but `continue-on-error: true` (non-blocking) | `.github/workflows/ci.yml:37-39` |
| CI tests | `npm run test:unit` — **hard gate** | CI workflow |
| Integration/e2e/eval | Not in CI | See `docs/TESTING.md` |
| `any` usage | `no-explicit-any: 'warn'`; 100+ occurrences in storyteller alone | `eslint.config.js:98` |
| Unused vars | `'warn'` (comment says promote to `'error'` after cleanup) | `eslint.config.js:101-105` |
| Hardcoded secret fallback | `INTERNAL_DOCS_SECRET || 'okurwadiabel'` | `src/middleware.ts:4` |
| Env sync scope | Entire `.env.local` synced to Trigger.dev cloud | `trigger.config.ts:24-28` |
| Broken npm script | `prompts:push*` → `push-to-hub.ts` does not exist | `package.json:138-140` |
| Storyteller test ratio | ~12 test files / ~123 source files (~10%) | `src/domains/storyteller/**` |
| God files | `storyteller/page.tsx` ~3,255 LOC; `chat/stream/route.ts` ~1,499 LOC | see §3 |

**Guiding principle:** the codebase has *good architecture and AI review on PRs* but
*soft enforcement gates*. The highest-leverage work is making existing gates real,
then reducing the blast radius of the few enormous files.

---

## 2. Top-level quality specs

### Q-1 — Make typecheck a blocking CI gate `P0`

**Problem:** Type errors can merge and deploy; `tsc` runs in CI but never fails the build.

**Evidence:** `.github/workflows/ci.yml:32-36` (`continue-on-error: true`); `next.config.js` `typescript.ignoreBuildErrors: true`.

**Spec:**
- CI fails when `npm run typecheck` reports any error.
- Because the codebase is not yet clean under `tsc`, introduce a **ratchet**: a
  checked-in `typecheck-baseline.txt` (count of current errors). CI fails only if
  the count *increases*. New code cannot add type errors.

**Acceptance Criteria:**
- [ ] `continue-on-error` removed from the TypeScript step (or replaced by the ratchet script).
- [ ] Baseline file committed with today's error count.
- [ ] A PR that introduces a new type error fails CI; a PR that fixes one passes and lowers the baseline.

**Verification:** `npm run typecheck` locally; open a throwaway PR adding `const x: number = 'a'` and confirm CI red.

---

### Q-2 — Make ESLint a blocking gate (errors only) `P0`

**Problem:** ESLint runs but never fails CI; `next build` also ignores it.

**Evidence:** `.github/workflows/ci.yml:37-39`; `next.config.js` `eslint.ignoreDuringBuilds: true`.

**Spec:**
- CI fails on ESLint **errors** (not warnings) via `npx eslint . --max-warnings=<current_warning_count>` ratchet, or `--quiet` (errors only) without `continue-on-error`.
- Warnings remain visible but non-blocking until Q-7 reduces them.

**Acceptance Criteria:**
- [ ] ESLint step no longer has `continue-on-error: true`.
- [ ] Existing error-level rules (`unused-imports/no-unused-imports`, `semi`, `quotes`, `react/no-unknown-property`) block merges.
- [ ] Warning count does not regress (max-warnings ratchet).

**Verification:** `npx eslint . --quiet` exits 0 today; CI red on a deliberately broken file.

---

### Q-3 — Remove or justify build-time error suppression `P1`

**Problem:** `next build` silently ignores TS + ESLint, so a production build can ship broken code that local `tsc`/lint would catch.

**Evidence:** `next.config.js` (`typescript.ignoreBuildErrors`, `eslint.ignoreDuringBuilds`).

**Spec:**
- Once Q-1 and Q-2 are green and the baselines are at/near zero, flip both flags to `false`.
- Until then, document *why* they exist (inline comment + link to this spec item) so the suppression is intentional, not accidental.

**Acceptance Criteria:**
- [ ] Both flags either removed or annotated with a comment referencing `Q-3` and a target date.
- [ ] `npm run build` succeeds with flags off (final state).

**Verification:** `npm run build`.

---

### Q-4 — Eliminate the hardcoded secret fallback `P0`

**Problem:** `/docs/internal` auth falls back to a hardcoded literal when the env var is unset, defeating the gate.

**Evidence:** `src/middleware.ts:4` — `process.env.INTERNAL_DOCS_SECRET || 'okurwadiabel'`.

**Spec:**
- No secret literal in source. If `INTERNAL_DOCS_SECRET` is unset in production, the protected route **denies access** (fail-closed) rather than accepting a known constant.

**Acceptance Criteria:**
- [ ] Hardcoded fallback string removed.
- [ ] Missing env var ⇒ `/docs/internal` returns 401/redirect, never authenticates.
- [ ] `INTERNAL_DOCS_SECRET` documented in `.env.local.example`.

**Verification:** unset the var locally, confirm `/docs/internal` is locked; grep for the literal returns nothing.

---

### Q-5 — Scope Trigger.dev env sync to an explicit allowlist `P1`

**Problem:** The whole `.env.local` is uploaded to Trigger.dev cloud on deploy — over-broad blast radius for secrets.

**Evidence:** `trigger.config.ts:24-28`.

**Spec:**
- `syncEnvVars` returns only an **explicit allowlist** of variable names that tasks actually need.

**Acceptance Criteria:**
- [ ] Allowlist array defined; only those keys are synced.
- [ ] Tasks still run (no missing-env failures) after the change.

**Verification:** `npm run trigger:dev`; smoke a task that uses synced vars.

---

### Q-6 — Run the high-risk test tiers (integration / e2e / eval) in CI `P1`

**Problem:** Agent flows most likely to break (e2e, eval) are not in CI; only colocated unit tests run.

**Evidence:** `npm run test:e2e` and `npm run eval` absent from CI workflow.

**Spec:**
- Add a CI job (nightly schedule **and** on-demand `workflow_dispatch`, to control LLM cost) that runs:
  - `npm run test:e2e` (at least the storyteller smoke scenario)
  - `npm run eval regression` (a fast deterministic subset)
  - Optionally: explicit `npx vitest run '**/*.e2e.test.ts'` when DB secrets are available
- These jobs may be allowed to fail-soft initially but must report status.

**Acceptance Criteria:**
- [ ] New scheduled job exists and runs the tiers above.
- [ ] Job summary surfaces pass/fail counts.
- [ ] Secrets (LLM keys, DATABASE_URL) injected via GitHub secrets, not committed.

**Verification:** trigger the job via `workflow_dispatch`; confirm it executes.

---

### Q-7 — Promote `no-unused-vars` to error after cleanup `P2`

**Problem:** Dead vars accumulate as warnings; the config comment already flags the intent to make this an error.

**Evidence:** `eslint.config.js:101-105`.

**Spec:**
- Fix all current `unused-imports/no-unused-vars` warnings (use `_`-prefix for intentional), then set the rule to `'error'`.

**Acceptance Criteria:**
- [ ] `npx eslint . | grep no-unused-vars` returns nothing.
- [ ] Rule level changed to `'error'` in `eslint.config.js`.

**Verification:** `npx eslint .`.

---

### Q-8 — Resolve duplicate session helpers `P2`

**Problem:** `getUserSession()` exists in two places, risking divergent auth behaviour.

**Evidence:** `src/lib/auth.ts` and `src/lib/api-utils.ts` both export session helpers.

**Spec:**
- One canonical session/auth helper module; the other re-exports or is deleted. All call sites import from the canonical source.

**Acceptance Criteria:**
- [ ] Single source of truth for `getUserSession`/`requireAuth`.
- [ ] No behavioural change in auth (same tests pass).

**Verification:** `npm run test:unit`; grep confirms one definition.

---

### Q-9 — Reconcile dual migration systems `P2`

**Problem:** Schema evolves through both Drizzle (`drizzle/`) and Supabase SQL (`supabase/migrations/`, 36 files), inviting drift.

**Evidence:** `drizzle.config.js:4-10`; `supabase/migrations/`.

**Spec:**
- Document (in `docs/ARCHITECTURE.md`) which system owns which tables, and the rule for adding a migration. If feasible, designate one as source-of-truth and generate the other.

**Acceptance Criteria:**
- [ ] A short "Migrations" section in `ARCHITECTURE.md` stating ownership + workflow.
- [ ] No table is mutated by both systems without being noted.

**Verification:** doc review; `npm run db:generate` produces no unexpected diff.

---

### Q-10 — Complete or remove MCP stub domains `P3`

**Problem:** `loop-creator`, `interior-designer`, `world-building` MCP tool modules export empty arrays with TODOs on a public API surface.

**Evidence:** `src/mcp/domains/{loop-creator,interior-designer,world-building}/tools.ts:4`.

**Spec:**
- Either implement the tools or remove the stub registration so the MCP surface advertises only working tools.

**Acceptance Criteria:**
- [ ] No empty-array TODO stubs remain registered.
- [ ] `npm run mcp:dev` lists only functional tools.

**Verification:** `npm run mcp:dev` + tool listing.

---

## 3. Storyteller domain specs

> Scope: `src/domains/storyteller/**` plus its orchestration in
> `src/app/api/storyteller/chat/stream/route.ts`.

### ST-1 — Fix the broken `prompts:push` script `P0`

**Problem:** Three npm scripts point at `src/domains/storyteller/prompts/push-to-hub.ts`, which does not exist. The scripts fail immediately and the hub/Langfuse prompt strategy is ambiguous.

**Evidence:** `package.json:138-140`; glob of `prompts/` returns 6 files, none named `push-to-hub.ts`. `config/storyteller-config.ts:46-51` references LangSmith Hub config while `src/prompts/repository.ts:19-32` fetches from **Langfuse**.

**Spec:** choose **one** of:
- (a) Implement `push-to-hub.ts` that pushes the registered prompts to the chosen remote (Langfuse *or* LangSmith — pick one, matching `repository.ts`), **or**
- (b) Delete the three scripts and the stale `useHub`/`hubOwner` config, documenting the single prompt-management path.

**Acceptance Criteria:**
- [ ] No npm script references a missing file.
- [ ] `docs/internal/storyteller.md` documents exactly one prompt-sync mechanism.
- [ ] If (a): `npm run prompts:push:staging` runs end-to-end against staging.

**Verification:** run each `prompts:push*` script (or confirm removal); `grep -r push-to-hub package.json` consistent with chosen path.

---

### ST-2 — Decompose the storyteller chat stream route `P1`

**Problem:** `src/app/api/storyteller/chat/stream/route.ts` (~1,499 LOC) owns auth, context assembly, RAG, agent creation, streaming, tool-result→action mapping, Langfuse bridging, and dedup in a single `POST`. High blast radius, hard to test.

**Evidence:** route handler starting `route.ts:97`; tool-result handling `:850-1230`; section key list duplicated `:861-906`.

**Spec:** extract pure, unit-testable modules **without changing behaviour**:
- `context-assembly.ts` — DB fetch + formatting + `budgetContext`.
- `tool-result-mapper.ts` — tool result → `ActionType` + payload (move into domain `config/`).
- `stream-events.ts` — SSE event construction.
- Route handler becomes orchestration glue (< ~300 LOC).

**Acceptance Criteria:**
- [ ] Route file reduced to orchestration only.
- [ ] Extracted modules have unit tests (see ST-6).
- [ ] Existing storyteller e2e tests still pass (behaviour unchanged).
- [ ] Section-key list defined once and imported (removes `:861-906` vs `action-config.ts` duplication).

**Verification:** `npm run test:unit`; the storyteller `*.e2e.test.ts` suite green.

---

### ST-3 — Externalise the Showrunner system prompt `P1`

**Problem:** `StorytellerAgent.create()` embeds ~320 lines of system prompt inline, mixing prompt authoring with object construction.

**Evidence:** `agents/v2/storyteller-agent.ts:137-456`.

**Spec:**
- Move the system prompt into `prompts/agents/showrunner.ts` (consistent with the other per-agent prompt files), exported as a builder function that takes the dynamic context.
- `create()` composes prompt + tools + config; no large inline string literal.

**Acceptance Criteria:**
- [ ] Prompt lives in `prompts/agents/`, matching existing convention.
- [ ] `storyteller-agent.ts` shrinks substantially; no behaviour change.
- [ ] Prompt referenced by the prompt registry consistently (resolves the `storyteller-system` dynamic-registration inconsistency at `:443-451`).

**Verification:** storyteller e2e suite; snapshot the assembled prompt before/after to confirm parity.

---

### ST-4 — Unify the "phase" model `P1`

**Problem:** Three incompatible phase concepts coexist, causing confusion and latent bugs.

**Evidence:**
- `types.ts:1-6` → `Phase { BRAINSTORMING, PLANNING, WRITING, REVIEW }`
- `enums.ts:39-45` → `{ PREMISE, BREAKING, CARDLOCK, WRITING, COMPLETE }` (not exported)
- agent prompt → `premise → breaking → writing → complete` (`storyteller-agent.ts:400-407`)

**Spec:**
- Define **one** canonical `Phase` enum in `enums.ts`, exported, and use it everywhere (types, prompt phase names, transition tests).

**Acceptance Criteria:**
- [ ] Single exported `Phase` enum; the other definitions removed.
- [ ] Agent prompt phase labels match the enum values.
- [ ] `phase-transitions.e2e.test.ts` updated and green.

**Verification:** `npm run test:unit -- phase-transitions`.

---

### ST-5 — Resolve `cast` vs `keyCharacters` naming `P1`

**Problem:** An incomplete migration: the agent prompt instructs `cast`, while UI/stream code normalises to `keyCharacters`, with aliasing scattered across 5+ files. Risk of silent data loss on merge.

**Evidence:** `storyteller-agent.ts:215` (prompt says `cast`); stream normalises to `keyCharacters` `route.ts:916-919`; aliasing in `action-config.ts:159`, `useStorytellerHydration.ts:45-109`, `world-building-tools.ts:272`, `BibleContext.tsx:330-351`.

**Spec:**
- Pick the canonical field name. Add a single normalisation point (one helper) at the persistence boundary; remove ad-hoc aliasing elsewhere. Prompt, schema, and UI all use the canonical name.

**Acceptance Criteria:**
- [ ] One canonical field name documented in schema + prompt.
- [ ] Exactly one normalisation function; other aliasing removed.
- [ ] Round-trip test: agent emits characters → persisted → re-hydrated with no field loss.

**Verification:** new unit test for the normaliser; storyteller e2e green.

---

### ST-6 — Unit-test the persistence & merge core `P1`

**Problem:** The HITL persistence path (the most data-critical logic) has almost no unit coverage; tests skew to expensive e2e.

**Evidence:** no tests for `config/action-config.ts` (`deepMerge`, `smartMergeArray`), `tools/v2/world-building-tools.ts` (`update_world_bible`), `hooks/useStorytellerActions.ts` (`applyUpdatesToStoryPlan`).

**Spec:**
- Add fast, deterministic unit tests (no LLM) for:
  - `deepMerge` / `smartMergeArray` (incl. `cast`/`keyCharacters` from ST-5).
  - `update_world_bible` merge+persist with the rejection-acceptance logic (`world-building-tools.ts:18-21`).
  - `applyUpdatesToStoryPlan` apply/undo.

**Acceptance Criteria:**
- [ ] ≥ 3 new test files covering the above, runnable offline.
- [ ] Tests assert merge correctness, idempotency, and array-dedup behaviour.
- [ ] Added to the CI unit tier (Q-2/existing `test` job).

**Verification:** `npm run test:unit`.

---

### ST-7 — De-duplicate `deepMerge` and anti-slop lists `P2`

**Problem:** Two implementations of `deepMerge` and two overlapping anti-slop phrase lists exist, risking divergent behaviour.

**Evidence:** `deepMerge` in `config/action-config.ts:57-78` **and** `config/storyteller-config.ts:336-343`; anti-slop in `prompts/extended-thinking.ts:47-80` vs `guardrails/agent-validators/prose-quality-scorer.ts:22-80`.

**Spec:**
- Single `deepMerge` in a shared util, imported by both configs.
- Single source-of-truth anti-slop phrase list, consumed by both the prompt blocklist and the regex scorer.

**Acceptance Criteria:**
- [ ] One `deepMerge` definition; the duplicate removed.
- [ ] One exported anti-slop list; both consumers import it.
- [ ] Behaviour unchanged (covered by ST-6 merge tests + a scorer test).

**Verification:** `npm run test:unit`; grep shows single definitions.

---

### ST-8 — Type the tool/agent boundary `P2`

**Problem:** Nearly all Mastra tools use `execute: async (args: any)` and `toolsMap: Record<string, any>`; UI hooks/stream carry `any` payloads. Errors surface at runtime, not compile time.

**Evidence:** `agent-tools.ts:80`, `beat-tools.ts:115`, `world-building-tools.ts:134`, `rag-tools.ts:187`, `storyteller-agent.ts:62`; hooks `useStorytellerActions.ts:21,57-58`; stream `route.ts:38,351-370`.

**Spec:**
- Tools already declare Zod input schemas — derive the `execute` arg type from the schema (`z.infer`) instead of `any`. Define a shared `ToolResult` discriminated union for outputs.
- Replace `Record<string, any>` tool maps with a typed registry keyed by tool id.

**Acceptance Criteria:**
- [ ] No `args: any` in `tools/v2/*` — each uses the inferred input type.
- [ ] `toolsMap` typed.
- [ ] `no-explicit-any` warning count for `tools/v2/**` drops to ~0.

**Verification:** `npm run typecheck`; `npx eslint src/domains/storyteller/tools` warning count compared before/after.

---

### ST-9 — Standardise error handling in the agent path `P2`

**Problem:** Mixed strategies — swallowed `catch {}`, log-and-return-`''`, per-item try/catch, and module-level mutable state for business logic — make failures hard to trace.

**Evidence:** empty catch `route.ts:517`; RAG failure returns `''` `route.ts:91-94`; skill-load failure continues `storyteller-agent.ts:432-435`; module-level rejection `Map` `world-building-tools.ts:18-21`.

**Spec:**
- Adopt one convention: tools return a typed `{ ok: false, error }` result (no throw across the Mastra boundary); the route maps these to a single SSE `error` event shape. No empty catches (log + typed result). Move the rejection-acceptance state off module scope into the tool's run/context.

**Acceptance Criteria:**
- [ ] No empty `catch {}` in the storyteller stream path.
- [ ] Rejection-acceptance state no longer lives in a module-level `Map`.
- [ ] One documented error→SSE mapping.

**Verification:** unit test the error mapper; storyteller e2e green.

---

### ST-10 — Split the largest UI components `P2`

**Problem:** Several components exceed 750 LOC, concentrating state + render + parsing logic.

**Evidence:** `components/ActionApprovalModal.tsx` (~978), `CharacterWeb/CharacterWeb.tsx` (~922), `CharacterCreationDialog.tsx` (~889), `EpisodePremisePanel.tsx` (~765), `AgentLog.tsx` (~698). And outside the domain: `app/app/[projectId]/storyteller/page.tsx` (~3,255).

**Spec:**
- Extract presentational subcomponents and pull diff/parse logic into hooks/utils. Target < ~400 LOC per component file. `ActionApprovalModal` payload parsing (`as any` at `:99,457,811,837-868`) moves to a typed helper (ties into ST-8).

**Acceptance Criteria:**
- [ ] Each listed component split; no single file > ~400 LOC (page.tsx may be staged).
- [ ] Existing component e2e tests pass.

**Verification:** component `*.e2e.test.tsx` suite; LOC check.

---

### ST-11 — Remove stale artifacts & comments `P3`

**Problem:** Dead/legacy references mislead readers.

**Evidence:** `graph/writers-room.ts:5-8,29-36` (stale LangGraph/`.run()` comments); `schemas/agent-schemas.ts:5` claims LangChain `withStructuredOutput` though agents use Mastra; `services/storyteller.service.ts:12` imports `@langchain/core/runnables` with no in-domain LangChain use; `agents/v2/` implies a non-existent v1.

**Spec:**
- Remove or correct the stale comments/imports; if `graph/writers-room.ts` is only a shim, either delete it (if unused) or document it as the intentional legacy adapter.

**Acceptance Criteria:**
- [ ] No comment references LangGraph/LangChain where Mastra is used.
- [ ] Unused `@langchain/*` import removed (Knip clean).
- [ ] `graph/writers-room.ts` either removed or has an accurate header.

**Verification:** `npx knip`; grep for `langchain` in the domain.

---

## 4. Suggested sequencing

```
Week 1 (P0 safety):   Q-1, Q-2, Q-4, ST-1
Week 2 (P0/P1 risk):  Q-3, Q-5, Q-6, ST-2, ST-6
Week 3 (P1 structure):ST-3, ST-4, ST-5
Week 4 (P2 cleanup):  Q-7, Q-8, ST-7, ST-8, ST-9
Backlog (P2/P3):      Q-9, Q-10, ST-10, ST-11
```

Rationale: lock the gates first (nothing new gets worse), neutralise the secret +
broken script, then attack the two god files and the data-critical persistence
path, then typing and cleanup.

---

## 5. Definition of Done (per item)

An item is Done when **all** hold:
1. Acceptance Criteria checkboxes are ticked.
2. The Verification command runs green locally.
3. `npm run typecheck` and `npm run test:unit` do not regress.
4. No new `any` introduced (warning count not increased for touched files).
5. Behaviour-preserving items have their existing e2e suite passing unchanged.

---

## 6. Out of scope (explicit non-goals)

- Rewriting the agent architecture (Mastra → other framework).
- Migrating off Supabase or Trigger.dev.
- Adding new product features.
- Achieving a fixed coverage % target (we target *risk areas*, not a number).
- Touching the legacy Pages Router beyond what `Q-*` items name.
