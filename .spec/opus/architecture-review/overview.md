# Nomos — Architecture Review: Overview

**Audit base:** branch `refactor`, commit `b40953967863877d1d747b8f38780b52696fbb8e`.
`origin/main` is `cf4f431d72c19a82353ffa7a149a8379a31a2c02` — 35 commits behind, 2 ahead.
All findings below were re-verified against a clean worktree of `b409539`, not against `main`.

**Deliverable type:** analysis and documentation only. No implementation. Per-action
specifications are a later stage. **Build order:** [phases.md](./phases.md). **Target:**
[target-architecture.md](./target-architecture.md) (honest floor).

**Scope.** Storyteller, 2D Canvas, 3D Asset Exporter, Game Design, marketing, `app/`, `api/`,
`shared/`, tooling, and evals. **Loop Creator and 3D Canvas are excluded** from
recommendations; they appear only where a shared file they touch is under discussion.

---

## 1. Correction notice: what the previous revision of this review got wrong

The previous revision of these documents was baselined on `main`. That was the wrong tree.
`refactor` carries SPEC-12 through SPEC-16, which **already solved** three things the earlier
review reported as missing. Those claims are withdrawn here, and the same corrections apply to
the parallel review in `.spec/glm/architecture-review/`, which shares the `main` baseline.

| Withdrawn claim | Reality on `b409539` | Evidence |
|---|---|---|
| "Token/cost accounting is missing entirely." | An LLM gateway records every routed call to a `llm_calls` table with tokens, model, provider, cost, latency, outcome, project and user. A committed price table, a `npm run spend` report, and an ESLint gate against direct provider SDK imports all exist. | `src/shared/ai/gateway/record.ts`, `supabase/migrations/20260828100000_create_llm_calls.sql`, `src/shared/ai/gateway/constants/pricing.ts`, `scripts/spend.mjs` |
| "There is no eval regression gate; the baseline is policy-only." | `npm run eval:gate` loads the newest committed baseline, compares scorer means against a noise-derived threshold, treats a missing scorer as a regression, and exits non-zero. | `evals/gate.ts:39-71`, `evals/compare.ts:61-103` |
| "There is no quality ratchet as code." | `.quality-ratchet.json` holds 21 counters; 14 have Vitest consumers that run inside `npm run test:unit`. | `.quality-ratchet.json`, `scripts/__tests__/*-inventory.test.ts` |

Two further corrections of degree rather than kind:

- Environment access **is** centralized (SPEC-12): `src/shared/config/env.ts` parses a Zod
  schema at import, and `local/no-bare-process-env` is an error with the ratchet at zero.
- Job ownership **is** largely solved (SPEC-14): `defineOwnedTask` requires a schema, a queue
  and a nonce; `retrieveOwnedRun` gates every status route; `rawTaskDefinitions`,
  `tasksWithoutQueue` and `tasksWithoutIdempotencyKey` all sit at zero.

The honest summary of this branch is not "nothing exists." It is: **the mechanisms exist and
are well designed; several of them do not yet measure or enforce what their names claim.**
That gap — between a gate's promise and its executable reach — is the through-line of this
review.

**Committed vs uncommitted.** The working notes accompanying this review describe local,
uncommitted fixes (`evals/baseline-schema.ts`, `evals/regression-threshold.ts`,
`eslint-rules/no-functions-in-constants.js`, `scripts/__tests__/constants-policy.test.mjs`).
Those files are **not** on `b409539`. This review scores the committed tree and treats that
local work as in-flight, credited where it lands but never assumed.

---

## 2. What this branch got right — do not regress it

These are load-bearing and should be extended, not rebuilt. Several proposed actions
explicitly build on them.

- **A single billing seam.** `complete` / `completeStructured` / `embed` / `meteredCall` all
  funnel into one `recordLlmCall`. Writes are fire-and-forget so a metering outage cannot fail
  a user request (ADR 0003), and a missing price now degrades to `costUsd: 0` **with the token
  row preserved** and the model named in `unpricedModels` (`bc06f2f`). That is the correct
  failure mode: visible ignorance rather than silent zero.
- **A durable editorial gate.** The beat-draft workflow suspends for the human verdict and
  snapshots to Postgres, so a run survives a restart and resumes from the route, Studio, or a
  script. This is the one place a workflow `suspend` is used correctly rather than a controller
  mode.
- **A real plan/build split.** `AgentController` modes withhold mutating tools in plan mode;
  approval flips to build. The capability boundary is enforced by tool visibility, not by
  prompt instruction.
- **An exemplary contracts pilot.** `src/domains/3d-asset-exporter/contracts/` establishes wire
  schema → mapper → domain type, parses legacy JSONB with `safeParse` so malformed stored data
  degrades to `null` instead of a 500, and round-trips under test. This is the pattern to
  propagate.
- **Ownership on job reads.** Cross-tenant run access returns 404 rather than 403, which
  avoids run-id enumeration.
- **Honest not-run states in evals.** The frozen Aeternum baseline distinguishes
  `not-applicable` from `not-run` instead of scoring a zero.
- **Metric discipline holds.** No file over 800 lines and no function over complexity 25 in
  the active tree.

---

## 3. The organizing thesis

Three failure modes recur across every layer. Each of the thirty-two actions attacks one of them.

**A gate that cannot fail is not a gate.** The eval gate is real, but the harness it guards
scores frozen strings. The ratchet is real, but seven of its counters have no executable
consumer and any threshold can be raised in the same commit that adds the violation. The
import policy is real in source, but — as proved in §4.1 — a later config block silently
replaced it.

**A measurement that is not defined cannot be trusted.** Usage is read from the wrong field on
multi-step runs. Embedding tokens come from a module-global counter. Inventory counters match
text lines rather than syntax, so a reformat changes the number and removing one violation
masks adding another.

**A capability that is described but not wired is not a feature.** Muse exists and is tested,
but `wildcards` is absent from the chat tool schema, so no user can reach it. The `@mention`
agent catalog renders roles that no server-side router dispatches. Two agent class wrappers are
exported and unused.

---

## 4. Findings — cross-cutting

### 4.1 The newest quality gate silently disabled an older one — P1

**This is proved rather than argued — and its blast radius was measured before it was ranked.**

**Scope correction.** An earlier revision called this the most consequential finding in the
review and ranked its repair first. Measurement contradicts that. Counting current violations
across every domain — `storyteller`, `game-design`, `2d-canvas`, `3d-asset-exporter`,
`marketing`, `loop-creator`, `3d-canvas` — plus `shared/` importing `@/domains` or `@/app`, plus
legacy `@/lib` and `@/agent-core` roots, the total is **zero**. The rule does not fire, but
nobody is walking through the open door. This is a dormant regression risk, not live damage; the
verified identity boundary in §4.2 is unambiguously more consequential and now leads the action
list. The good news is that restoring the policy surfaces no cleanup work, so it is cheap.

`eslint.config.js` declares `no-restricted-imports` in **nine** separate flat-config blocks
(lines 186, 480, 495, 516, 567, 589, 666, 693, 703) and `no-restricted-globals` in **three**
(618, 633, 647). In ESLint flat config, when several config objects match the same file, the
later object's rule options **replace** the earlier object's — they do not merge. The
provider-SDK block introduced with the SPEC-13 gateway matches `src/**`, so it overwrites the
cross-domain and legacy-root import bans declared earlier.

Computing the effective configuration confirms it. For
`src/domains/storyteller/ai/tools/bible-tools.ts` the surviving `no-restricted-imports`
options are exactly three paths — `ai`, `openai`, `replicate` — plus two pattern groups
(`@ai-sdk/*` and `@/shared/auth/project-access`). The cross-domain guard is gone.

Linting probe source in `src/domains/storyteller/`, with a positive control to prove the
harness itself works:

| Probe import | Documented policy | Actual result |
|---|---|---|
| `import OpenAI from 'openai'` | error | **error** (positive control passes) |
| `from '@/domains/game-design'` | error — cross-domain forbidden | **no message** |
| `from '@/domains/game-design/ai/agents/memory'` | error — deep cross-domain forbidden | **no message** |
| `from '@/lib/utils'` | restricted legacy root | **no message** |

The cross-domain import ban is documented as a hard error in `CLAUDE.md`, `AGENTS.md`, and
`.cursor/rules/eslint-boundaries.mdc`. On this branch it does not fire. Every architectural
claim resting on it — domain isolation, `shared/` never importing domains, the legacy-root
migration — is currently unenforced, and no test would notice.

`no-restricted-globals` suffers the same fate: only the `encodeURIComponent` entry survives,
at severity `warn`. The `localStorage` and raw-`fetch` restrictions declared earlier are
absent from the effective config.

The lesson generalizes beyond the fix: **the gate suite has no test of its own effective
configuration.** Rules are tested through purpose-built fixture files rather than by asking
ESLint what policy actually applies to a real product path.

### 4.2 The identity boundary is not verified — P0

`requireAuth` resolves the caller through `getUserSession`, which calls
`supabase.auth.getSession()` (`src/shared/auth/auth.ts:55-72`). `getSession()` decodes the JWT
carried in the cookie **locally**; it does not revalidate against the Supabase auth server.
`getUser()`, which does revalidate, appears nowhere in the server auth path. Supabase's own
guidance for server-side code is to trust `getUser()` and never `getSession()`. Consequently a
forged or unsigned token that merely parses into a session shape satisfies `requireAuth` and
`withAuth`, which together guard 110 of 116 API routes.

Three concrete exposures compound it:

- **`/api/trigger/token`** issues a Trigger.dev public read token for **caller-supplied
  `runIds`** with no ownership check. This routes around the `retrieveOwnedRun` gate that
  SPEC-14 correctly applied to every polling route: a client that subscribes over realtime
  instead of polling can read another tenant's run.
- **`/api/complete-token`** has no auth at all and accepts `{ tokenId, action, variantIndex }`
  to call `wait.completeToken()`. Anyone who learns a token id can complete another user's
  wait token.
- **PATCH with a raw body spread.** `beats/[beatId]` executes
  `db.update(beats).set(body)` and `characters/[characterId]` executes
  `db.update(characters).set(body)`. Access to the *existing* row is checked, but the body is
  never filtered, so `{"episodeId": …}` or `{"projectId": …}` **reassigns the row's parent**.
  The episodes route already solved this with an explicit allowlist that excludes `projectId` —
  the pattern exists and simply was not applied here.

The ratchet asserts `routesTakingProjectIdWithoutOwnershipCheck: 0`, but that counter has no
executable consumer (§4.4), so it records an intention rather than a fact.

Separately, twelve routes are annotated `auth-scope: session-existence-only`. Most are
defensible, but four of them (`llm-judge`, `generate-metrics`, `script-review`,
`script/edit`) let any signed-in user spend provider budget with no project scope and, per
§4.5, without appearing in the cost ledger.

### 4.3 The eval gate guards a harness that never calls the model — P0

The gate is genuine: it fails on scorer errors, requires a committed baseline, treats a
vanished scorer as a regression, and enforces a cost ceiling when both sides are priced. The
problem is upstream of it. `evals/run.ts:211` sets the text to be scored as:

```ts
const output = example.referenceOutput
```

The runner never invokes an agent. It scores frozen golden strings from
`evals/datasets/storyteller-golden.ts`. A prompt edit, a tool change, a model swap, or an
orchestration regression cannot move the number, because the number does not depend on them.
This is a legitimate and useful **scorer/judge regression test**; it is not, and must not be
labelled, an agent quality gate.

The consequences chain outward:

- **Pre-commit reinforces the illusion.** `scripts/pre-commit.mjs:30` runs
  `check-eval-freshness.mjs`, which requires a `latest.json` whose `inputHash` matches the
  watched sources and whose `failures` array is empty. A commit therefore proves *an eval was
  run*, never *the comparison passed*.
- **The freshness hash has real holes.** It watches `.ts`/`.tsx`/`.json` under five prefixes,
  so it misses the file-based agent prompts in `src/mastra/agents/**/instructions.md` — the
  literal text of the agent — and misses `evals/constants/thresholds.ts`, where the regression
  thresholds live. It selects staged files with `--diff-filter=ACMR`, so **deletions and
  renames of watched files never trigger the check**, while hashing working-tree contents
  rather than the staged tree.
- **The cost gate is inert.** The committed `evals/results/latest.json` carries
  `"costUsd": 0` with `"unpricedModels": ["openai/gpt-5.6-sol"]`, and `compare.ts:122-125`
  withholds cost comparison whenever any model is unpriced. The budget check cannot fire. The
  correct reading is "cost unknown," not "cost zero."
- **Sampling is neither complete nor deterministic.** `--samples=N` subsamples with
  `Math.random()` and no seed, an unknown `--dataset` silently falls through to the storyteller
  golden set, and nothing requires the run's example and scorer matrix to match the baseline's.
  A small sample can return the same verdict word as a full run.
- **Calibration is a manual promise.** `SCORER_NOISE` is derived from three runs and copied
  into `thresholds.ts` with a comment asking future editors to re-measure after a judge change;
  nothing binds the σ to a judge model id. Three observations of zero variance are not evidence
  of determinism.
- **The A/B experiment cannot refuse a bad run.** `wildcards-ab.ts` returns `null` for failed
  workflows and merely warns on scorer errors, while `mean([])` returns `0`. Arms can be
  compared over different subsets and still print a recommendation.

`wildcards-ab.ts` is the one path that drives the real workflow — and it is wired into neither
pre-commit nor `eval:gate`.

### 4.4 The ratchet enforces less than it declares — P0

`.quality-ratchet.json` holds 21 counters. Fourteen are read by Vitest consumers that run in
`npm run test:unit`. **Seven have no executable consumer** — they are honor-system numbers
documented by a shell command in a `_commands` block:

| Field | Value | Why the number does not bind |
|---|---:|---|
| `routesTakingProjectIdWithoutOwnershipCheck` | 0 | A grep cannot decide authorization semantics; §4.2 shows live counterexamples |
| `sessionExistenceOnlyRoutes` | 12 | A comment recording accepted risk is not a permission test |
| `directDbClientImporters` | 70 | Not executed by any test |
| `serviceRoleClientSites` | 23 | Naming a call site does not prove its privilege scope |
| `bareProjectIdExports` | 0 | A separate ESLint rule enforces this; the JSON field itself binds nothing |
| `systemScopeSites` | 2 | Typed reason is useful; the counter is not enforced |
| `untaggedRunGracePaths` | 0 | Deleting the legacy path is not a test that it stays deleted |

Two structural weaknesses affect all 21, including the enforced fourteen:

- **The threshold and the code travel together.** Every consumer asserts
  `current <= RATCHET.field` **within the same tree**, with no comparison against a pinned base
  ref. Raising `untypedJsonReads` from 1148 to 1200 while adding fifty violations passes in one
  commit. A ratchet that the same commit can loosen is a comment.
- **Violations have no stable identity.** `scripts/inventory/index.mjs` classifies **one bucket
  per line of text**. Removing violation A while adding violation B keeps the sum flat and
  passes. Rewrapping an import changes the count without changing meaning.

### 4.5 The cost ledger is a floor, not a total — P1

The gateway is the right design and it is genuinely wired into the storyteller chat stream, the
planner, the three critics, Muse, and several services. But four defects mean the number it
reports is systematically low, and nothing detects the shortfall.

- **Multi-step runs are undercounted at the source.** `usageFrom` in
  `src/shared/ai/gateway/agent.ts:32-36` reads only `result.usage`. For a multi-step
  `agent.generate()` in Mastra v1, `usage` is the **final step** and `totalUsage` is the
  cumulative figure; `totalUsage` appears nowhere in `src/`. The affected agents run with
  `maxSteps` of 10 (chat adapter, author, game design), 5 (planner) and 25 (market analyst), so
  the recorded figure can be a small fraction of the true spend. The streamed chat path reads
  `payload.usage` with the same exposure.
- **Embedding tokens come from a module global.** `lastEmbeddingTokens` in
  `voyage-api-client.ts:111-115` is read *after* the call returns. A cache hit leaves the
  previous call's value in place, a multi-batch embed keeps only the last batch, and concurrent
  embeds race.
- **The largest storyteller surface is unmetered.** `/api/assistant/[agentId]` never
  establishes `withGatewayContext`, so `meteredCall` inside those agents is a silent no-op.
  In the beat-draft pipeline the planner and all three critics are metered but
  `generateAuthorDraft` — the longest generation in the pipeline — is not.
- **Two token classes are lost.** `cached_tokens` exists as a column and is always zero; no
  call site supplies it. Reasoning tokens are not separated, so they are billed as output where
  the provider includes them and vanish where it does not — on reasoning-heavy models that is a
  large and invisible error.

The six named provider-SDK exemptions are managed honestly, but around them sit real bypasses:
direct Voyage embeddings in `hybrid-search.ts` and `entity-graph-service.ts`, the OpenRouter
rerank fetch, the game-design v2 tools, the storyboard/voiceover task client, and the
autonomous stream. Attribution stops at project, user and a coarse `LlmFeature`: there is no
episode id, run id, or agent role, so "what did this beat cost" is unanswerable.

### 4.6 Nothing runs automatically — P0

There is no `.github/` directory and no workflow file of any kind. Every gate is local and
optional in practice. `npm run eval:gate` is manual. Pre-commit runs architecture checks, docs
checks, staged typecheck and ESLint, unit tests, and the build — a strong set — but a
contributor who never runs it is caught by nothing, and results cannot be reproduced by a third
party. Compounding it, `tsx` is not a pinned dependency yet is invoked as `npx tsx` in fifteen
package scripts, so a gate can silently download a different version mid-run; the scoped
typecheck writes a shared temporary config filename, so two concurrent runs corrupt each other.

For a repository whose entire quality thesis is enforcement, the absence of CI is the single
largest structural gap.

### 4.7 Boundary contracts are piloted, not adopted — P1

Of 116 API routes, roughly 30 validate input with Zod and roughly 86 take the body or query
raw. Within storyteller the split is 8 validated against 34 raw. The ratchet quantifies the
downstream cost: 1148 untyped JSON guard reads, 268 snake_case reads outside mappers, 42
`.passthrough()` schemas, 12 `z.any()` uses.

The OpenAPI document is assembled by a **parallel registry** rather than derived from the
schema a route executes, so the two drift by construction. Concretely: OpenAPI advertises
`PATCH /storyteller/characters` as `stPatchCharacterRequest` — five optional fields, plus
`.passthrough()` — while the route actually runs `buildCharacterPatchUpdates()`, which accepts
`gender`, `characterPrompt`, `mbti`, `psychology` and several metric aliases. The published
contract and the executed contract are different objects, and `openapi:check` compares the
document against the registry, so it cannot detect this.

There is also a lossy mapper in the active scope: `toLegacyAsset`
(`src/domains/2d-canvas/core/world-types.ts:51-95`) reconstructs metadata but carries only
bounds and box, dropping `autoGeneratedThumbnail` — which is written on upload and read by the
3D Asset Exporter UI through a raw `recordFromJson`, bypassing the new contracts module.

### 4.8 A paid provider call can be repeated on retry — P1

SPEC-14's idempotency key `` `${taskId}:${requestId}` `` correctly prevents a duplicate
*submission*. It does not protect a *partially completed* run. `generate-tile.task.ts` runs
with `maxAttempts: 3` and performs generation, then blob upload, then database writes, with no
checkpoint between them: a failure after generation re-issues the paid call on retry. The Meshy
pipeline writes `meshyTaskId` into Trigger metadata *after* the create POST and never reads it
at task start, so a retry creates a second paid Meshy task; `persistMeshyModelUrl` additionally
swallows database errors, so a run can report success with stale state.

The team already understands this risk — `remesh-3d-model.task.ts` carries
`maxAttempts: 1, // Don't retry - costs money`. That reasoning simply has not been applied to
the generation tasks, and a comment is a weaker instrument than a checkpoint.

### 4.9 The test suite's green is softer than it looks — P1

`vitest.config.ts:18` sets `dangerouslyIgnoreUnhandledErrors: true`. An unhandled promise
rejection — the exact signature of a swallowed async failure in a task or route — cannot fail
the suite. There are no coverage thresholds configured at all; the previously measured figures
(about 26.5% of lines, 14.8% of branches) span the whole configured repo including now-excluded
domains, so they describe the harness rather than the active scope. 1956 passing tests is a
count of assertions executed, not of boundaries defended.

### 4.10 Constants are a naming loophole with an incentive behind it — P1

In the active scope, roughly 92 files under a `constants/` path export named functions
(about 219 by `export function` alone; an AST count including arrow-function constants reaches
roughly 328 across 93 files). Content ranges from harmless formatters to complete async IO
pipelines: `2d-canvas/tasks/constants/generate-tile-seams.ts` holds 24 functions, 19 of them
async; `storyteller/config/constants/model-config.ts` holds model-resolution logic across 490
lines; `generate-tile-legnext.ts` performs uploads.

The cause is mechanical, not cultural, and this matters because it determines the fix.
`local/no-magic-string` **exempts whole `constants/` directories**, and no counter-rule
forbids logic living there. Moving a helper into `constants/` therefore *removes* diagnostics.
File-length limits add a second push toward extraction without judging whether the resulting
boundary means anything. Any instruction to "move the functions out" that does not also change
this incentive will simply recreate the pattern under a different folder name.

---

## 5. Findings — Storyteller

### 5.1 Reachability: features that exist but cannot be invoked — P1

- **Muse is unreachable from chat.** `wildcards` is a documented field on
  `beat-draft-contract.ts:29-34` and the workflow honors it — the mechanics test drives it
  directly. But `RunBeatDraftInputSchema` in `workflow-tool.ts:36-45` exposes only `brief`,
  `characters` and `autoApprove`, and `run.start()` never forwards `wildcards`. No user
  utterance can switch it on. The brainstorm→rank stage the A/B experiment is meant to
  validate is dead on the product path.
- **The `@mention` agent catalog dispatches nothing.** `mention-catalog.ts` advertises
  `writer`, `premise_architect`, `plot_architect`, `devils_advocate` and others. Mentions are
  serialized into XML routing hints by `context-builder.ts:46-49`, and `buildMessageWithContext`
  is never imported outside its own module. There is no server-side router keyed on
  `agent.type`. The UI promises a roster of specialists that does not exist.
- **Two agent wrappers are dead.** `GrrmAuthorAgent` and `BeatPlannerAgent` are exported from
  the domain barrel with no call sites; production uses the file-system agents re-exported by
  `stateless-agents.ts`. The refactor branch even added `meteredCall` inside these dead
  wrappers — maintenance spent on unreachable code, which is precisely the cost of leaving
  phantoms in the tree.

### 5.2 Three chat entry points with three different safety properties — P1

| Route | Agent path | Editorial gate |
|---|---|---|
| `POST /api/assistant/[agentId]` | registered `chatAdapterAgent`, 12-tool allowlist | honored — tool suspends, user resumes |
| `POST /api/storyteller/chat/stream` | per-request `StorytellerAgent`, or AgentController when `FF_STORYTELLER_CONTROLLER` | honored |
| `POST /api/storyteller/chat` | **bypasses the chat agent**, drives the workflow directly | **none — `autoApprove: true` is hard-coded** (`chat-post-handler.ts:129-137`) |

The third route makes the human editorial verdict optional by choice of URL. The registered
adapter binds `manageBeatApprovalTool` while the legacy `StorytellerAgent` binds the ungated
`manageBeatTool`, so the same logical agent id has two different mutation policies. Whichever
route is retained, the approval property must be a property of the domain, not of the entry
point — and, per §4.5, the assistant route is also the one with no billing context.

### 5.3 Persisted state can disagree with reported state — P1

In the revise step, `deps.persistBeat` returns `{ saved: false }` on a soft tool failure
without throwing, and the workflow **completes successfully** with a populated `finalDraft` and
`saved: false`. A thrown database error fails the step, but the soft path lets the run report
success while nothing was written; the non-stream route maps it to a `NeedsReview` status. The
draft, the critiques and the persistence outcome are not committed as one unit, so a reader
cannot tell "the model produced this and we stored it" from "the model produced this and we
lost it."

### 5.4 Orchestration is real but not observable — P1

Contrary to the concern that prompted this review, the tools are genuinely wired: twelve tools
are bound on the chat adapter, and the beat-draft workflow calls the planner, the author and
the three critics programmatically through injected deps rather than describing them in prose.
There are no Mastra subagents (`agents:` config) anywhere; dispatch is direct.

What is missing is a **typed record of what happened**. There is no run trace enumerating which
tool ran, with which arguments, in what order, how long it took, whether it failed, and what it
cost. `withMastraSpan` is applied only to the three dead class wrappers; the tools themselves
carry no spans. The consequence shows up in the tests: mechanics tests drive the workflow with
fake deps and prove suspend/resume/kill and the concreteness retry; the live `*.e2e.test.ts`
proves a real end-to-end draft persists. **No committed test proves that a chat turn dispatched
the workflow and persisted a beat** — the seam between the model deciding and the pipeline
running is untested, and is exactly the seam the user asked about.

### 5.5 Domain hotspots — P2

`ai/tools/bible-tools.ts` (455 lines) mixes bible CRUD with continuity checking, and
`config/constants/model-config.ts` (490 lines) mixes the model matrix with resolution logic and
legacy accessors. Both are inside the 400-line warn band; neither breaches the 800 error line.
They matter as the two files most likely to accumulate further responsibility, and
`model-config.ts` is a §4.10 constants violation in the single most security- and
cost-relevant place.

### 5.6 Agent memory is configured, unbound, and never expired — P1

Three findings that only look separate. **Configured on a path that does not use it:** three
agents construct `new Memory({ storage, options: { lastMessages: 10 } })` and attach it
(`storyteller-agent.ts:91`, `beat-planner-agent.ts:68`, `grrm-author-agent.ts:83`), but the
production SSE chat never passes `memory: { thread, resource }` into `agent.stream()`
(`stream-post-handler.ts:89`). The single call site in `src/` that binds a thread is the
autonomous draft (`mastra-runtime.ts:233`). "Bounded at ten messages" is therefore a claim about
code the main path does not execute — the same declared-versus-effective pattern as §4.4 and
§5.1.

**Keyed wrongly in both directions where it is bound.** The autonomous route uses
`episodeId ?? 'storyteller-autonomous'` (`autonomous/route.ts:37`), so every run without an
episode shares one thread name, separated only by `resourceId`; the CRUD helper mints
`thread_${Date.now()}_${random}` per call (`storyteller-crud-service.ts:368`), so nothing is
ever recalled and rows accrue that nothing will read.

**Never expired.** `PostgresStoreVNext` creates its `mastra_*` tables at runtime
(`create-mastra.ts:55`) with no migration owning them, so there is no schema to hang a policy
on. No prune, TTL or cleanup exists in `src/`; the only `deleteThread` / `deleteMessages` sit on
`AgentMemory` (`agent-memory.ts:122`), a class with no instantiation site. One agent takes the
unbounded default outright — `src/mcp/agent.ts:12` omits `lastMessages` entirely. Cost is
unattributed either way: `ContextBudgetSection.Memory` exists in `token-budget.ts:31` and is
never populated, so recalled-message tokens cannot be separated from assembled context on the
bill. Lands as **Action 31**.

### 5.7 Distinct character voice is demanded four times and measured zero times — P1

Four prompt files require it: `anti-slop/SKILL.md:30` ("military ≠ academic ≠ street"),
`storyteller/SKILL.md:28`, `george-rr-martin/SKILL.md:33` (voice from class, region,
education), and `prose-critic/instructions.md:9`. None of the eighteen shipping scorers
measures it. `persona-fidelity` grades the **author's** requested persona, not the cast's;
`character_field_adherence` checks `wants` / `fears` / `wontBreak`, which is psychology rather
than diction. `magic-strong-01` even records "Specific voices" in its metadata
(`storyteller-golden.ts:58`) and then runs only the holistic `magic` judge.

Two structural gaps keep it unmeasurable rather than merely unmeasured. The `characters` row
(`core-tables.ts:34-60`) has no column for voice, register or verbal habit — a vestigial
optional `voice` survives on a legacy update schema (`action-character-schemas.ts:21`) and maps
to nothing. And dialogue is stored as free prose in `beats.content` and
`episodes.scriptContent`, with the planner emitting one `dialogueHook` string
(`beat-plan-schema.ts:15`), so there is no per-speaker text to compare. This is the most
visible failure mode in long-form generated prose and one of the few that needs no judge:
`self_repetition` already computes a distinct-3-gram ratio across beats
(`evals/structural/mastra-scorers.ts:204`), and the same measurement across *speakers* is a
voice metric. Lands as **Action 32**.

---

## 6. Evidence table

Every number below was produced against `b409539`. The command column is the reproduction.

| Claim | Value | Reproduction |
|---|---|---|
| Cross-domain import ban does not fire | no diagnostic | `ESLint.lintText` on a `src/domains/storyteller/**` path importing `@/domains/game-design`, with an `openai` import as positive control |
| `no-restricted-imports` config blocks | 9 | `grep -n "'no-restricted-imports'" eslint.config.js` |
| `no-restricted-globals` config blocks | 3 | `grep -n "no-restricted-globals" eslint.config.js` |
| API routes | 116 | `find src/app/api -name route.ts \| wc -l` |
| Routes with no auth reference | 6 | includes `/api/complete-token` |
| Routes validating input with Zod | ~30 of 116 | storyteller subset: 8 of 42 |
| `auth-scope: session-existence-only` routes | 12 | matches the ratchet counter |
| Ratchet counters | 21 | `.quality-ratchet.json` |
| Ratchet counters with an executable consumer | 14 | remaining 7 are `_commands` greps |
| Eval runner scores frozen text | yes | `evals/run.ts:211` — `const output = example.referenceOutput` |
| Committed eval cost | `costUsd: 0`, one unpriced model | `evals/results/latest.json` |
| CI workflows | 0 | no `.github/` directory |
| `npx tsx` invocations with `tsx` unpinned | 15 | `grep -c 'npx tsx' package.json`; no `"tsx"` dependency |
| Constants files exporting functions (active scope) | ~92 | excludes loop-creator, 3d-canvas, tests |
| Files > 800 lines / complexity > 25 | 0 / 0 | metric gates hold |
| Call sites binding `memory: { thread, resource }` | 1 | `grep -rn "memory: {" src/` — only `mastra-runtime.ts:233` |
| Mastra `Memory` instances with no `lastMessages` | 1 | `src/mcp/agent.ts:12` |
| Retention / TTL / prune jobs over `mastra_*` | 0 | no migration owns the tables; `deleteThread` exists only on the uninstantiated `AgentMemory` |
| Shipping scorers | 18 | 7 in `ALL_SCORERS` + 8 structural + 2 domain + `goal-reached` |
| Scorers measuring per-character voice | 0 | `persona-fidelity` is authorial; `character_field_adherence` is psychology |
| `characters` columns for voice / register / diction | 0 | `core-tables.ts:34-60` |
| Prompt files demanding distinct character voice | 4 | two skills, the Martin skill, the prose critic |

**Not run for this review:** any paid evaluation, deployment, E2E, or browser session. No claim
here depends on one. The build is not re-measured; the previously reported failure was a
`/login` prerender blocked by absent public Supabase configuration, which is an environment
gap, not evidence of a code regression.

---

## 7. Traceability

The thirty-two actions in `actions.md` subsume the working plan's R01–R20 and the `.spec/glm`
review. Nothing from either input is silently dropped. Rows marked *this review* have no
external source item — they were found while auditing the branch and are recorded here so the
table stays a complete map rather than only an inbox.

| Source item | Where it lands |
|---|---|
| R01 verified identity and ownership | **Action 1** |
| R02 gate rejects tool failure | Action 4 |
| R03 functions leave constants | Backlog B1; worst file named in Action 25 |
| R04 one contract at the boundary | Action 13 |
| R05 server state isolated per project | Backlog B2 |
| R06 3D scene save / Loop Creator autosave | Out of scope — frozen |
| R07 AI usage attributed to a call | Action 6 |
| R08 resume a paid job without regenerating | Action 8 |
| R09 separate scorer tests from agent evaluation | Action 7 |
| R10 client/server/contracts entry points | Backlog B3 |
| R11 compose ESLint policy without overwriting | Action 5 — proved, and blast radius measured at zero |
| R12 AST rule for constants | Backlog B1 |
| R13 ratchet against a pinned base | Action 5 |
| R14 syntax inventory instead of text lines | Action 5 |
| R15 tests that catch unhandled errors | Action 8 |
| R16 eval proof bound to an exact tree | Actions 7, 19 |
| R17 full dataset × example × scorer matrix | Actions 7, 19 |
| R18 scorer calibration and honest A/B | Actions 20, 21 |
| R19 eval budget with complete pricing | Actions 6, 23 |
| R20 reproducible tooling and CI | Action 4 |
| GLM: trace recorder and trace tests | Actions 3, 17 |
| GLM: Muse `wildcards` on the tool input | Appendix — deferred pending an ablation result |
| GLM: collapse the dual chat adapter | Action 9 |
| GLM: Humanizer placement and vibe seam | **Action 17** (the George split); voice-at-drafting vs de-slop-at-the-end in Action 16 |
| This review §5.6: memory unbound on the live path, unkeyed, unexpired | **Action 31** |
| This review §5.7: character voice demanded in four prompts, measured by no scorer | **Action 32** |

---

## 8. How to read the rest

- **`target-architecture.md`** — **the honest floor.** One chat agent, Planner, Author (incl.
  Humanizer after verdict), one critic × **three** scopes, Muse as `brainstorm`, three
  workflows (`beat-draft-workflow` heavy, `artifact-draft` light, `fix-inconsistencies` sweep).
  Host persists after Approve — no model `commit_beat`. Four-layer canon is a prompt
  partition first. Voice is the existing MASTER PROMPT / EPISODE PROMPT. Latency (180s, one
  auto-revise, one timeout source) binds every phase. Ablation decides extras (`cognition`,
  `dialogue`, ledger, autonomy). Evaluation stays first-class. Role pins after a live-quality
  run, not vendor ids in the spec.
- **`evaluation.md`** — **the deep companion on testing.** Four tiers; POV-leak and Law of
  Motion in the deterministic tier; GRRM rubric in live quality; ablation for additions past
  **three** scopes, not for deleting the floor. Trace contracts assert three overlapping
  critics, Humanizer before persist, kill writes nothing.
- **`diagrams.md`** — ten Mermaid diagrams: two of `b409539`, five of the honest floor
  (including disclosure and the de-slop pass), three of measurement.
- **`actions.md`** — thirty-two actions in four tracks. Action **10 is cut**. Action **14**
  floor is three scopes. Action **27** regex-injection is not P0. Action **28** is a Phase 0
  constraint. Schedule is **`phases.md`**, not the historical serial string. Action 17 is the
  George split. Every action has WHAT/HOW/WHERE/Acceptance plus **What is there to learn**
  and **In plain words**.
- **`phases.md`** — **canonical build order.** Platform ∥ storyteller in phases 0–4. All 32
  ids mapped; none silently dropped.
- **`second-opinion.md`** — rationale that produced the honest floor. The target document now
  implements it.
- **`learning-materials.md`** — backend fundamentals through this repo, then a teaching unit
  on the craft catalog, the George split, and the thirty-two actions as a syllabus.
