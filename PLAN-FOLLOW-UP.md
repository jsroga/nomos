# PLAN FOLLOW-UP — storyteller: remaining waves + Muse / DevChat / Model strategy

Fabro module: storyteller

Companion to `PLAN.md` (original 45 items). Part 0 fixes the cross-cutting architecture decisions; Part 1 carries over every unfinished item from the original waves; Parts 2–4 plan the three new features. Item numbers continue from the original plan (46+). Every API claim below was **verified against the installed `@mastra/core` build** — citations inline.

> **Live tracking** (updated as work lands): Status — ✅ done · 🔄 in progress · ⬜ pending.
> **Handoff tag** — who can safely execute the item if a strong model isn't available:
> 🟢 **mechanical**: precise spec above; a cheap/low-reasoning model (or careful junior) can execute + run the listed verify command;
> 🟡 **guided**: mostly mechanical but needs judgment at one step (shape comparison, test-first discipline) — cheap model OK with review;
> 🔴 **reasoning**: architectural/taste/contract decisions — keep on a strong model.


---

## Status snapshot (verified 2026-07-09)

| Area | State |
| --- | --- |
| **Wave 1 — GRRM pipeline** | ✅ Done & verified: `beat-draft-workflow` (plan → draft → 3 parallel critics → durable verdict suspend → revise), critics, entry tool, durable resume route, SSE verdict adapter, kernel runtime-registry registration. fabro-verify pass incl. Next build; 6/6 mechanics tests; 51/51 domain tests. |
| **Wave 0 — types** | ✅ Module-scope errors **142 → 38**; all 38 live in the four deletion-slated files (`StoryWorkflow` 24, `StorytellerWorkflow` 6, `ScriptReviewAgent` 4, council 4). `z.any()` in module: 0. Bonus fixes: repo-wide `ApiHandler` inference (`NoInfer`), RAG reranker NaN-scoring bug. |
| **Wave 0 — lint** | ✅ Done — fabro-verify fully green (item L1). |
| **Type-hygiene hardening** (user feedback) | ✅ `as`-cast sweep: stream route now consumes Mastra's official `ChunkType` union (zero casts in the chunk loop); bible route spread-wall → `pickPresent()` helper; `useChatStream` casts → `asString/asNumber/asRecord` guards; RelationshipEnricher double-casts → typed `CharacterData.relationships`; `extractEntitiesFromPlan` takes a structural `EntityExtractablePlan` (RichText bridge cast deleted). Policy: `as any` prohibited (lint error); remaining casts only at untyped-JSON/DB boundaries, one per site, commented. |
| **Wave 2 — rewire + delete** | ✅ Done: items 13–16, 22–30, 38. Chat adapter slimmed (`chat-adapter-prompt.ts`), RequestContext plumbing end-to-end, tool-result-mapper purged + 12 pin tests, MCP chat rewired, `ScriptReviewService`/`ConsistencyCheckAdapter` shape-compatible replacements, non-stream chat route on `beat-draft-workflow(autoApprove)`, orchestration/council/judges/judging deleted (grep-zero first), Studio registry mirrors production. |
| **Assertion-ban sweep** (user feedback, hardened lint) | ✅ `assertionStyle: 'never'` now clean across the whole changed-file scope (71 files): tools (beat/character/episode) via `recordFromJson`/`stringArrayFromJson`, action-config `applyUpdatesToStoryPlan` rewritten cast-free (`Object.assign` typed-return pattern), RelationshipEnricher jsonb → zod schemas, ReferenceText `TooltipMeta` → per-field `.catch()` zod parse, StoryPlanBoard premise bridge (`bridgeEpisodePremise`), ActionApprovalModal/ActionToast/AgentLog/WorldBiblePanel/useStorytellerActions de-cast, `formatActionForDisplay` accepts wire actions, reranker Cohere response zod-validated, `stringRecordFromJson` added to `shared/data/json-guards`. fabro-verify: typecheck OK, eslint OK, unit-tests OK. |
| **Wave 3** | ✅ Items 32–37, 40, 43 done (2026-07-09). ⬜ Remaining: 39 (`eval --live`) + 41 (smoke pin) — both need a running app + keys; 44 superseded by 56–60. |

Hard invariants unchanged: **UI/API compatibility contract** (PLAN.md) — SSE frames frozen, request/response shapes frozen; Mastra v1 rules; no `z.any()`; deletion order create → rewire → grep-zero → delete.

---

# Part 0 — Cross-cutting architecture decisions (read first)

These six decisions shape most items below. Each records the alternatives considered and why they lose.

### D1. Per-run model selection = `DynamicArgument` model + `RequestContext` (not agent rebuilding)

**Verified:** `AgentConfig.model: DynamicArgument<MastraModelConfig, TRequestContext>` (`@mastra/core/dist/agent/agent.d.ts:42,138`) — the model field accepts a **function resolved at request time** with access to `RequestContext`. `agent.generate()/stream()` options accept `requestContext` (`agent.types.d.ts:304,406`), and v1 tools receive it as `context.requestContext` (`ToolExecutionContext`).

**Decision:** the stateless author stays a **module singleton** whose `model` is a resolver:

```ts
// stateless-agents.ts
export const statelessGrrmAuthor = new Agent({
  id: 'grrm-author',
  model: ({ requestContext }) =>
    resolveRoleModel('author', requestContext?.get(AUTHOR_MODEL_KEY) as string | undefined),
  …
})
```

**Alternatives rejected:**
- *Construct an author agent per run with the chosen model* — recreates the class-constructor pattern the wave-1 registration inversion exists to avoid; per-request construction also breaks Studio registration (the registered instance wouldn't be the one running).
- *Two prebuilt authors (`kimiAuthor`, `glmAuthor`) + branch in the workflow* — N agents per model choice doesn't scale past two, duplicates registration, and leaks the model list into workflow code.
- *Env-only selection* — user-pickable Kimi/GLM is a product requirement; env can't vary per request.

### D2. The user's model pick travels via RequestContext, end to end

Today the picker's `modelName` changes the **chat agent's** model. Under the new strategy the pick means "**author model**" (the token-heavy role); the chat adapter becomes fixed secret sauce. One deliberate behavior change, wired as:

```
UI picker (Kimi | GLM)
  → POST /chat/stream body.modelName            (existing param — request shape unchanged)
  → route validates via resolveChatModelId       (existing)
  → route builds RequestContext { 'storyteller.authorModel': id, projectId, episodeId }
  → agent.stream(prompt, { requestContext })     (chat agent: fixed 'chat' role model)
  → run_beat_draft_workflow.execute(input, ctx)  → reads ctx.requestContext          (server-trusted)
  → workflow input { authorModel }               (validated: must be a catalog id)
  → draft/revise steps: statelessGrrmAuthor.generate(prompt, { requestContext })
  → author's DynamicArgument model fn resolves Kimi/GLM per D1
```

Why RequestContext and not tool arguments: tool args are **model-typed** — the LLM could hallucinate or omit the model id. RequestContext is server-set and tamper-proof from the model's perspective. This is the same argument as original item 16 (projectId/episodeId), so item 16 and the model pick land as **one plumbing change**.

### D3. GLM 5.2 resolves as an `OpenAICompatibleConfig` object — role slots must return objects, not just strings

**Verified:** `MastraModelConfig = … | ModelRouterModelId | OpenAICompatibleConfig | …` where `OpenAICompatibleConfig = { id: \`${string}/${string}\`, url?, apiKey?, headers? }` (`llm/model/shared.types.d.ts:24,59`). Our existing `resolveStorytellerModel()` already returns exactly `{ url, id, apiKey }` for catalog entries with `endpointUrl` (GLM) and a plain `provider/model` string otherwise (Kimi via the gateway) — but the wave-1 `getRoleModelString()` returns strings only, silently bypassing the endpoint path. **Every role resolution goes through one new function** (item 57) that returns `MastraModelConfig`; `getRoleModelString` is deleted after migration.

### D4. Muse randomness is **code-side entropy**, not sampling temperature

Two facts force this: (a) Opus 4.8 / Sonnet 5 / Fable 5 **reject** `temperature` at the API (400); (b) even on models that accept it, hot sampling converges on tropes — asked to "be random", an LLM samples from the same peaked distribution. A `Math.random()`-driven constraint injector does not. Temperature-capable models remain *available* to the `muse` slot, but the guarantee of divergence comes from injected constraints (item 48). Corollary from wave 1's cycle lesson: all Muse schemas/taxonomies live in **pure modules** (zod + constants only, no agent imports) so the tools-barrel ↔ registration import cycle stays initialization-safe.

### D5. The dev REPL lives **outside `src/`** and shares the production Mastra instance

- **Placement:** `scripts/storyteller-chat/` (own `tsconfig.json` extending root, run via `npx tsx` — the exact pattern `evals/run.ts` already uses for `@/` path resolution). Rejected: `src/domains/storyteller/cli/` — the domain-structure test allowlists top-level folders (`BLUEPRINT_TOP_LEVEL` + documented legacy exceptions; `domain-structure.test.ts:45–62`) and adding `cli` would loosen a guard for dev-only tooling; `.local/` — gitignored, but this tool should be versioned and shared.
- **Instance:** the REPL imports `getMastraInstance()`/`getStorageInstance()` (kernel) so AgentController threads and workflow suspends land in the **same Postgres storage** as production. Consequence worth having: a verdict suspended in the REPL is resumable from the web UI and vice versa. Rejected: StoryForge's separate LibSQL file store — would violate the one-instance/one-store rule and break suspend interop.

### D6. Tool budget 10 → 11 (accepted, documented)

`brainstorm_wildcards` (item 50) is the 11th tool. The original budget's purpose was killing 57 auto-generated workflow-variant tools, not capping orthogonal capabilities at a magic number. Constraint that actually matters and is kept: **the author agent inside the workflow has zero tools**; Muse has zero tools; only the chat adapter grows.

---

# Part 1 — Remaining items from the original waves

### ✅ 🟢 L1. Close the lint gate (wave 0)
- **Left:** `ui/WorldBible/BibleRoadmap.tsx` — `resolveSequences(seqs: any[]…)` (:28) → generic `<T,>(seqs: T[] | null | undefined)`; two `(storyPlan as any)` debug casts (:42–43) → drop casts (the zod `StoryPlan` now types `sequences`/`episodeRoadmap`). Already fixed & verified: entities barrel semis, RelationshipEnricher + ReferenceText non-null assertions (bucket pattern), RichText `entity: any` → `EntityReference | null`, EpisodeRoadmapCard `extracted: any` → typed.
- **Verify:** `node scripts/fabro-verify.mjs` fully green. **Effort:** S.

### ✅ 🔴 Item 13. Slim `StorytellerAgent` into the thin chat adapter *(wave 2)* — DONE: `prompts/chat-adapter-prompt.ts` (~120 lines, real tools only, phases UI-owned); skill-injection loop/extended-thinking/DA removed; model = fixed `'chat'` role slot.
- **Change:** extract the ~330-line inline prompt to `prompts/chat-adapter-prompt.ts` as `buildChatAdapterPrompt(entityLinkReqs)` (≤150 lines). **Delete:** all 9 phantom-tool sections, Council/"GENIUS MODE"/Showrunner framing, and the **workspace-skill injection loop** (`StorytellerAgent.create` currently inlines every repo skill's instructions into the prompt — unbounded prompt growth, committee-in-prompt-form). **Keep verbatim:** `update_world_bible` field contracts, entity-link format + density rules (smoke-load-bearing), phase transitions, the `run_beat_draft_workflow` section.
- **Structural note:** while here, the chat agent's `model` becomes the fixed `'chat'` role slot per D2 (the picker no longer drives it) — one item, one prompt+model change, one eval run.
- **Verify:** phantom grep → only `tool-result-mapper` (dies in 22); smoke forced-tool-call assertions unaffected; `npm run eval` vs baseline. **Risk:** HIGH product behavior — move bible sections, don't rewrite them.

### ✅ 🟢 Item 14. Remove dead `agenticMode` council instruction *(wave 2)* — DONE: replaced with one-line "prefer `run_beat_draft_workflow` for drafting". No frame changes. Bonus landed with it: chunk loop now narrows Mastra's official `ChunkType` union (dead `'thinking'`/`'reasoning'` branches replaced by the real `reasoning-delta` — thinking frames now actually fire for reasoning models; existing frame type, additive only).

### ✅ 🟢 Item 15. Drop legacy council-tool re-exports *(wave 2)* — DONE: `legacy-council-tools.ts` deleted with council (28); tools barrel exports only the 10 real tools.

### ✅ 🟡 Item 16. `RequestContext` plumbing *(wave 2 — merged with D2)* — DONE: `agents/request-context.ts` constants + builder; stream route passes `requestContext`; all CRUD tools + workflow tool prefer server-trusted IDs over model args.
- **Change:** (a) `agents/request-context.ts` — typed key constants (`STORYTELLER_PROJECT_ID`, `STORYTELLER_EPISODE_ID`, `STORYTELLER_AUTHOR_MODEL`) + `buildStorytellerRequestContext()`; (b) stream route constructs it and passes `requestContext` into `agent.stream`; (c) the 9 CRUD tools prefer `context.requestContext?.get(...)` over model-supplied input IDs (fallback to input keeps Studio usable); (d) `run_beat_draft_workflow` reads authorModel + IDs from `context.requestContext`, never from LLM args.
- **Verify:** unit — tool called with wrong input projectId + correct RequestContext writes to the correct project; authorModel not in tool's `inputSchema` at all.

### ✅ 🟡 Item 22. Purge phantom tools from `tool-result-mapper.ts` *(wave 2)* — DONE: phantom branches deleted; 12 pin-down tests (`config/__tests__/tool-result-mapper.test.ts`) lock kept action shapes.
- Pin-down table tests for kept mappings (`update_world_bible`, `manage_beat`) **before** deleting the `update_story_phase` / `create_character` / `create_episode` / `consult_premise_architect` branches. Action shapes byte-identical (smoke depends on them).

### ✅ 🟡 Item 23. Rewire MCP chat *(wave 2)* — DONE: `StorytellerCrudService.chat:349` → slimmed chat agent directly, same response shape; fix stale "LangGraph … LangSmith" description in `src/mcp/domains/storyteller/tools.ts:229`. Gate: `npm run mcp:build`.

### ✅ 🟡 Item 24. `consistency/check` + `server.ts` → `ConsistencyService` *(wave 2)* — DONE via `services/ConsistencyCheckAdapter.ts` (legacy `ConsistencyCheckResult` shape preserved). compare the judge's result fields vs `ConsistencyCheckResult` first; adapter shim if they differ (route consumers grep before change).

### ✅ 🟡 Item 25. `script-review` route → prose critic *(wave 2)* — DONE: `services/ScriptReviewService.ts`, severity-weighted score, legacy `PersonaReview` shape preserved.
- New `services/ScriptReviewService.ts`: run `proseCritic` (+`stakesCritic`) with `CriticReportSchema` structured output; derive `overallScore` from severity counts (critical 0.3 / major 0.6 / minor 0.85 weighting — tune in the unit test); accept-and-ignore the legacy `persona` param. Response shape byte-compatible.

### ✅ 🟢 Item 26. Barrel + `server.ts` cleanup; tracing move *(wave 2)* — DONE.
- `agents/index.ts`: drop `export * from './orchestration'`; add critics + workflow contract exports. `server.ts`: drop `runStorytellerWorkflow`, `workflowStore`, judge exports. Move `normalizeMastraTraceId` → `agents/tracing.ts` (both chat routes import it; `WorkflowContext.ts` must be deletable). Remove the dead `eventBus`/`WORKFLOW_EVENTS` bridge from the stream route — its only emitter is `StoryWorkflow`, which nothing invokes, so the bridged frames never fire today (contract-neutral removal; verify with smoke).

### ✅ 🔴 Item 27. Rewire non-stream `chat/route.ts`, then delete `agents/orchestration/` *(wave 2)* — DONE: route runs the workflow `autoApprove: true`, legacy response shape kept; `agents/orchestration/` deleted grep-zero.
- Route runs `beat-draft-workflow` with `autoApprove: true`; map `BeatDraftOutput` → the existing `{beats, continuityIssues, status, message, steps}` response (beats: `[persisted beat]`; steps: synthesized from the workflow steps record; continuityIssues: parsed from the continuity critic block — or `[]` + message if unparsable, shape-first). Then `git rm -r agents/orchestration/` after grep-zero. Kills 30 of the remaining 38 type errors + all 4 workflow `z.any()`.

### ✅ 🟢 Item 28. Delete council ×6 + `legacy-council-tools.ts` *(wave 2)* — DONE (grep-zero verified first).
### ✅ 🟢 Item 29. Delete judges ×3 *(wave 2)* — DONE (grep-zero verified first).
### ✅ 🟢 Item 30. Studio registry mirrors production *(wave 2)* — DONE: grrm-author / beat-planner / 3 critics stubs; council/judge stubs removed. Gate `npm run mastra:build` still to run in the final-gates pass.
### ✅ 🟢 Item 38. Delete orphaned judging machinery *(wave 2/3)* — DONE: `shared/agent-kernel/judging/` deleted after grep-zero.

### ✅ 🟢 Item 32. Single-source anti-slop *(wave 3)* — DONE: §VII.A renders `formatBannedPhrasesForPrompt()`; prose critic brief carries the same list as an automatic-finding rule. Divergent copy (`extended-thinking.ts`) deleted.

### ✅ 🟡 Item 33. Port StoryForge craft scorers *(wave 3)* — DONE: `prose-craft` + `stakes-cost` in `shared/agent-kernel/scorers/` (zod-validated analyze results, no casts), registered in ALL_SCORERS/STORYTELLER_SCORERS, attached to `draft-script` + `revise` steps at rate 1. Legacy scorers de-cast in passing.
- `shared/agent-kernel/scorers/{prose-craft-scorer,stakes-cost-scorer}.ts` ported from `.local/storyforge/src/mastra/scorers/craft-scorers.ts` (`createScorer` — same API version). Register in `ALL_SCORERS`/`STORYTELLER_SCORERS`; attach to `draft-script` + `revise` steps via `createStep({ scorers: { … sampling: {type:'ratio', rate:1} } })` so every run writes **draft-vs-revise pairs** to `mastra_scorers` (the revision-actually-helps signal). Use the `craft-scorer-author` skill; do not duplicate magic-scorer slop checks.

### ✅ 🟢 Item 34. Trim `prompts/skills/` 7 → 2 *(wave 3)* — DONE (grep-zero first): deleted creative-directors/david-lynch/vince-gilligan/psychology/writing skill dirs + dead `extended-thinking.ts`, `storyteller-prompts.ts`, `prompts/personas/`.

### ✅ 🟡 Item 35. Beat-plan concreteness gate *(wave 3)* — DONE: `BeatPlanner/beat-plan-quality.ts` (pure; 25-char floor + `BEAT_PLAN_VAGUE_PHRASES` from guardrails + must-name-a-character), retry-once wired into `plan-beat`, `planWarnings` in suspend payload + workflow-tool message. 7 gate unit tests + 2 mechanics tests.

### ✅ 🔴 Item 36. Golden dataset extension *(wave 3)* — DONE: baseline snapshotted to `evals/results/pre-grrm-baseline.json`; dataset 12 → 21 rows (+3 beat-plan, +3 critic-discipline, +3 prose-craft regressions); lynch/gilligan persona rows re-pointed at GRRM-craft. New deterministic scorers `beat-plan-concreteness` (wraps the item-35 gate) and `critic-discipline` live in the DOMAIN (shared/ can't import domains) and are unioned by `evals/run.ts`. Deterministic rows verified: concrete=1, vague=0, prose-leak=0, quotes=1, misses=0, rewrites=0. NOTE: `latest.json` now holds that partial deterministic run — regenerate with a full `npm run eval` (keys) in the final-gates pass.

### ✅ 🟢 Item 37. Scorer gating doc *(wave 3)* — DONE: gating matrix + ratchet policy in docs/TESTING.md (Eval experiments section).

### ⬜ 🟡 Item 39. `npm run eval -- --live` *(wave 3, phased)* — flag runs the workflow `autoApprove` on 2–3 golden briefs and scores the revise output. Local-only (keys + DB).

### ✅ 🟢 Item 40. Delete `e2e/agent/` + scrub `LANGCHAIN_*` from `e2e/config.ts` *(wave 3)* — DONE.

### ⬜ 🔴 Item 41. Smoke pin *(wave 3)* — byte-identical through waves; ONE additive assertion (drafting request → `questions` frame with `workflowRunId`) only when the app can actually be run (`npm run test:e2e smoke`); consult `sse-wire-contract` skill first.

### ✅ 🟡 Item 43. `workflow-full` LLM e2e tier *(wave 3)* — DONE: `workflows/__tests__/beat-draft-workflow.e2e.test.ts`, env-gated (`WORKFLOW_E2E_PROJECT_ID`/`EPISODE_ID` + DB + key), self-cleaning; documented in TESTING.md. Not yet executed against a live DB — run in the final-gates pass.

### ⬜ 🟡 Item 44. *(superseded)* — model-source consolidation folded into items 56–60; additionally delete `getAgentModel()` + its AI-SDK `specificationVersion` monkey-patch once grep shows no consumers.

---

# Part 2 — Request 1: the Muse (blank-context wildcard ideas agent)

**North star:** inject genuinely surprising turns without rebuilding the committee. Muse **generates options**; planner **chooses with stated reasons**; critics **check**; human **kills**. The Muse never writes prose, never sees the conversation, never persists anything.

```
                              entropy (code RNG)          contrast library
                                    │                            │
 brief distillate ───────────► ┌────▼────┐   5 candidates   ┌────▼─────┐
 (premise 2 lines,             │  MUSE   │ ────────────────►│ PLANNER  │──► BeatPlan{sparkUsed?}
  characters, genre,           │ blank   │  {moment, why,   │ adopt /  │         │
  negative list only)          │ context │   mechanism}     │ splice / │         ▼
                               └─────────┘                  │ reject+  │   … draft → critics →
                                                            │  reason  │   VERDICT (human sees
                                                            └──────────┘   sparkUsed, can kill)
```

### ⬜ 🟡 Item 46. `MuseAgent` — stateless, blank-context
- **Files:** `agents/Muse/muse-schema.ts` (**pure**: zod + mechanism enum only — D4 cycle rule), `agents/Muse/MuseAgent.ts` (stateless `new Agent`, no memory/tools/workspace), export via `agents/index.ts` + register in `io/mastra-runtime.ts`.
- **Contract:**
```ts
export const WILDCARD_MECHANISMS = [
  'consequence-cascade', 'safety-contract-violation', 'premise-as-engine',
  'dread-in-one-voice', 'structure-as-revelation', 'the-win-is-the-loss',
] as const                                   // single source: schema AND contrast library key off this

export const WildcardSchema = z.object({
  moment: z.string().min(1).max(300),        // ≤2 sentences, no prose/dialogue
  whyItSparks: z.string().min(1),
  mechanism: z.enum(WILDCARD_MECHANISMS),
})
export const WildcardBatchSchema = z.object({ candidates: z.array(WildcardSchema).length(5) })
```
- **Blank context, precisely:** the per-call prompt contains ONLY: genre, 2-line premise distillate, character names, the 3 entropy constraints (48), and a ≤10-line negative list (51). Never: chat history, previous beats' prose, world-bible dumps. Enforced structurally — the Muse has no memory and no tools to fetch more.
- **Invocation:** `museAgent.generate(prompt, { structuredOutput: { schema: WildcardBatchSchema }, requestContext })`; model = `muse` role slot (D1/57).
- **Verify:** unit with injected seeds — two calls, same brief, different seeds → candidate `moment`s pairwise dissimilar (normalized trigram overlap < 0.5); schema-invalid output → one retry then hard error. **Effort:** M.

### ⬜ 🔴 Item 47. Craft-contrast library (the IMDb calibration, done right)
- **File:** `prompts/guardrails/spark-contrast.ts` (pure data). Structure:
```ts
interface MechanismExample { mechanism: WildcardMechanism; pattern: string; exemplar: string }  // exemplar = craft description, never script content
export const SPARK_MECHANISMS: MechanismExample[]      // 8.5+: Ozymandias-class cascade, Red-Wedding contract violation, Total-Rickall premise-engine, TD-S1 dread/structure…
export const ANTI_MECHANISMS: readonly string[]         // 6/10: sprawl w/o thematic spine; N protagonists nobody owns; mood-as-decoration; complexity ≠ depth; twists that change facts not stakes
```
- Rendered into the Muse prompt as: each candidate **must name** its `mechanism` (schema-enforced enum — the "why S1 > S2" understanding becomes a machine-checkable field, not vibes) and self-check against every anti-mechanism. Copyright posture: mechanisms and critique are facts/analysis; no plot summaries beyond one clause, no dialogue.
- **Verify:** item 52 eval examples; enum/library key parity unit test. **Effort:** M.

### ⬜ 🟢 Item 48. Entropy injector
- **File:** `agents/Muse/entropy.ts` (pure): `drawEntropy(rng: () => number = Math.random): EntropySeed` where `EntropySeed = { oblique: string; collision: string; inversion: string }` drawn from three curated const lists (~50 oblique strategies, ~40 concrete domains for `noun × noun` collisions, ~15 structural inversions). Injected as **mandatory constraints** ("every candidate must engage at least one"). Deterministic via injected `rng` for tests; the workflow step draws it (code-side), never the model.
- **Effort:** S.

### ⬜ 🔴 Item 49. `spark` step + planner engagement contract
- **Workflow change (`beat-draft-workflow.ts`):** new optional first step `spark` gated by input `wildcards?: boolean` (schema change in `beat-draft-contract.ts`; **default `false` until item 52's A/B passes**, then flipped). Deps interface gains `muse: (ctx, negative: string[], seed: EntropySeed) => Promise<Wildcard[]>` — mechanics tests keep running with fakes, no LLM.
- **Planner contract change** (`beat-planner-prompt.ts` + `plan-beat` step): given candidates, the planner must set
```ts
// beat-plan-schema.ts (pure module) — additive, optional: no consumer breaks
sparkUsed: z.object({ moment: z.string(), mechanism: z.string(), disposition: z.enum(['adopted','spliced','rejected']), reason: z.string() }).optional()
```
  Forced engagement (adopt / splice / reject-with-reason) is the anti-regression device: without it, planners silently ignore wildcards and revert to safe tropes.
- **Human visibility:** `editorial-verdict.suspendSchema` gains optional `sparkUsed` — it rides the existing suspend payload; **no SSE frame changes** (the payload is read by the entry tool, which already forwards draft/critiques).
- **Verify:** mechanics test (fake muse): candidates reach planner; `sparkUsed` present in suspend payload; `wildcards:false` skips the step entirely. **Depends:** 46–48. **Effort:** M.

### ⬜ 🟢 Item 50. `brainstorm_wildcards` chat tool (tool #11 — D6)
- **File:** `agents/tools/ideate-tool.ts`. Input `{ count?: 1..10 }` — project/episode come from RequestContext (16), never LLM args. Executes: negative list ← `listBeatsTool`, seed ← `drawEntropy()`, Muse call, returns `{ candidates }`. Mapper renders as existing `info` outcome (no new frame). Registered on the **chat adapter only**.
- **Verify:** unit with mocked muse; smoke-neutral. **Depends:** 46–48, 16. **Effort:** S.

### ⬜ 🟢 Item 51. Anti-repetition ledger = the beats table
- Last N=10 beat loglines via `listBeatsTool` → Muse negative list ("do not resemble"). No new storage; negative-only context preserves the blank slate. **Effort:** S.

### ⬜ 🔴 Item 52. Novelty measurement — the adoption gate
- (a) Golden examples: Muse outputs that must name a valid mechanism; planted-cliché candidates the planner must reject with reason. (b) A/B protocol in TESTING.md: same briefs, `wildcards` on/off, compare `magic` + `prose-craft` + `stakes-cost`. **Flip the `wildcards` default to `true` only if**: no scorer regresses AND `magic` lifts. If it fails: tune the contrast library (47), not the temperature. **Depends:** 33, 36, 49. **Effort:** M.

---

# Part 3 — Request 2: one chat surface for dev testing + full-orchestration debugging

**Verified capabilities in our installed build:**
- `@mastra/core/agent-controller` exports `AgentController`, `Session`, and the full type surface (`AgentControllerConfig`, `AgentControllerEvent`, `AgentControllerMode`, `PermissionPolicy`, `ToolCategory`, `AvailableModel`, `ModelAuthStatus`, …) — `dist/agent-controller/index.d.ts`.
- Construction pattern proven at this exact version in `.local/storyforge/src/cli/chat.ts:104–155`: `new AgentController({ id, agent, memory, storage, modes, workspace, subagents (forked), toolCategoryResolver, disableBuiltinTools })` → `controller.init()` → `controller.createSession({ id, ownerId })` → `session.permissions.setForCategory({ category: 'edit', policy: 'ask' })`.
- Mastra Studio already runs `beat-draft-workflow` end-to-end with a **resume form at the verdict suspend**, plus traces and per-step scores — the visual tier exists today.

**Conclusion:** no second chat and nothing to invent — port the StoryForge CLI onto our domain. Debug detail is a verbosity toggle on the *same* stream (D5: one shared Postgres store means REPL suspends interop with the web UI).

### ⬜ 🔴 Item 53. `scripts/storyteller-chat/` — terminal REPL (AgentController port)
- **Files:** `scripts/storyteller-chat/{index.ts,tsconfig.json}` (+ `package.json` script `"storyteller:chat": "npx tsx scripts/storyteller-chat/index.ts"`); tsx resolves `@/` via the local tsconfig exactly like `evals/run.ts`. Imports **only** through sanctioned surfaces: `@/domains/storyteller/server` (agent factory), `@/domains/storyteller/io/mastra-runtime` (workflow ids), `@/shared/agent-kernel` (instance/storage — D5).
- **Wiring decisions:**
  - `agent`: the production chat adapter; `storage`: `getStorageInstance()` (Postgres — threads survive, suspends interop); `memory`: the adapter's Memory (required for forked subagents); `workspace`: repo-root scoped like production.
  - `modes` (instruction overlays on the same agent, StoryForge pattern): `develop` (no prose — bible/planning), `write` (delegates drafting to the workflow), `review` (critique existing beats).
  - `toolCategoryResolver`: `update_world_bible`, `manage_beat`(create/update/delete), `manage_character`, `manage_episode` → `'edit'` (y/n/a approval); reads free; `run_beat_draft_workflow` → its own `'pipeline'` category (announce, don't gate — the verdict gate is the approval).
  - Commands: `/beat <episodeId> <brief>` runs the workflow directly (prints plan → draft → per-critic findings → inline **a/r/k** verdict → resumes the durable run — same `getWorkflowRunById`/`createRun({runId}).resume` path as the web route); `/resume <runId>` recovers any suspended run (web- or CLI-created); `/steer`, `/abort`, queued follow-ups; `/models` prints the role→model resolution (item 60's data).
- **Verify:** manual session against local DB (mechanics of resume already unit-tested); REPL-created suspend resumable via `POST /workflow/resume` and vice versa. **Risk:** AgentController is beta — pin the `@mastra/core` minor; dev-only surface, production untouched. **Effort:** M–L.

### ⬜ 🟢 Item 54. `/debug on|off` — same stream, more detail
- When on, interleave dim-styled lines from the AgentController event stream + workflow results: every tool call with parsed result, step transitions, suspend payloads (incl. `sparkUsed`), resolved model per role with provenance, trace ids (printed as Studio deep links). Default off → the same session doubles as a clean UX check. **Effort:** S.

### ⬜ 🟢 Item 55. Document the test ladder *(TESTING.md)*
- ① `vitest` mechanics (free, no LLM) → ② REPL (interactive, real models, verdict loop) → ③ Studio (visual traces/scores/resume forms) → ④ smoke e2e (wire contract) → ⑤ `eval`/`eval --live` (quality regression). When to use which, and what each can't tell you. **Effort:** S.

---

# Part 4 — Request 3: model strategy, picker lockdown, provider health

**Routing table (the secret sauce; users see only the `author` row):**

| Role | Token share | Default | Env override | Notes |
| --- | --- | --- | --- | --- |
| `author` (draft + revise) | ~80% | **Kimi 2.7**; user-pickable → **GLM 5.2** | `STORYTELLER_AUTHOR_MODEL` | per-run via D1/D2; GLM = endpoint object (D3) |
| `planner` | low | Opus 4.8 | `STORYTELLER_PLANNER_MODEL` | structural decisions, structured output |
| `premise` (season/premise-level escalation) | very low | **off**; Fable 5 when `STORYTELLER_PREMISE_MODEL` set | ditto | Fable caveats pinned in config comments: premium price, always-on thinking (never send `thinking`), no sampling params, 30-day retention org requirement |
| `critic` ×3 | low-mid | gpt-4o-mini ↔ Sonnet 5 (eval decides, 61) | `STORYTELLER_CRITIC_MODEL` | diagnosis only |
| `muse` | tiny | temperature-capable (Kimi hot / gpt-4o) | `STORYTELLER_MUSE_MODEL` | divergence guaranteed by entropy anyway (D4) |
| `chat` adapter | mid | Sonnet-class / gpt-4o-mini | `STORYTELLER_CHAT_MODEL` | **no longer driven by the picker** (D2) |

### ⬜ 🟡 Item 56. Repoint role slots to the strategy table
- `config/ModelConfig.ts`: matrix entries per the table (author default `moonshotai:kimi-k2.7-code`), add `muse`/`premise`/`chat` slots, extend `StorytellerModelRole`. The picker choice overrides `author` per-run (D2); env overrides beat defaults; explicit `modelName` beats both (CLI/testing).
- **Verify:** unit — every role resolves; **eval before flipping the author default** — this is the single biggest quality variable in the plan; rollback = env var. **Effort:** S–M. **Depends:** 57.

### ⬜ 🔴 Item 57. `resolveRoleModel()` — endpoint-aware role resolution (fixes the GLM gap)
- `config/ModelConfig.ts`:
```ts
export function resolveRoleModel(role: StorytellerModelRole, overrideId?: string): MastraModelConfig {
  const id = validateOverride(overrideId) ?? envOverride(role) ?? AGENT_MODEL_MATRIX[role].model
  return resolveStorytellerModel(id)   // string for gateway models; {url,id,apiKey} for endpoint models (GLM)
}
```
  `validateOverride` accepts only known catalog ids (a user pref can't point us at an arbitrary provider). All agents (stateless + class) consume it via their `DynamicArgument` model fn; `getRoleModelString` deleted afterward (grep-zero).
- **Verify:** unit per catalog entry incl. the GLM object shape; missing `ZHIPU_API_KEY` → the existing `resolveStorytellerModel` throw surfaces as a **clean tool/step error**, not a crash (test this path); REPL `/models` shows resolution. **Effort:** S.

### ⬜ 🟢 Item 58. Picker lockdown — users choose Kimi or GLM, nothing else
- `ChatModelCatalog.ts`: add `userSelectable: boolean` (true only for Kimi + GLM); `ModelSelector.tsx` filters on it (it already iterates `CHAT_MODELS` — a data filter, not a mechanism change; the compatibility contract froze behavior, and the options list has always been catalog-driven data). `DEFAULT_CHAT_MODEL` → Kimi. `resolveChatModelId` keeps resolving legacy saved prefs (backward compat) — they're just no longer offered.
- **Flag for you:** clients that send no `modelName` currently default to gpt-4o-mini for chat; after D2 they get chat=Sonnet-class glue + author=Kimi. Cost/quality profile changes by design — called out so it's a decision, not a surprise. **Effort:** S.

### ⬜ 🟡 Item 59. Provider health: status + live test
- **Exists:** `GET /api/settings/providers` (key presence). **Add:** `POST /api/settings/providers/test` — `{ providerKey }` → one ~5-token generation against that provider's cheapest catalog model through the **same resolution path production uses** (`resolveStorytellerModel` — so the GLM endpoint is what actually gets tested) → `{ ok, latencyMs, model, error? }`. Auth-gated (`requireAuth`), wrapped in `withRateLimit` (~5/min), 10s timeout, error mapped to `{ok:false, error}` (never a 500, never key material). UI: provider rows with status (no key / key untested / verified / failed) + per-row **Test** + "test all" (sequential, not parallel — rate limits).
- **Verify:** unit for error mapping; manual with real keys. **Effort:** M.

### ⬜ 🟢 Item 60. Model-routing readout (secret sauce, inspectable by you only)
- Dev-gated settings section + REPL `/models`: resolved role→model table with provenance ("author → moonshotai/kimi-k2.7-code (default)", "planner → … (STORYTELLER_PLANNER_MODEL)"). Gate: `NODE_ENV !== 'production'` or the existing `INTERNAL_DOCS_SECRET`. **Effort:** S.

### ⬜ 🟡 Item 61. Eval-gate the routing
- Golden set run per author candidate (Kimi, GLM) and per critic candidate (gpt-4o-mini, Sonnet 5); results recorded in `evals/results/`; defaults picked by data. Re-run whenever a role default changes (37's matrix). **Depends:** 33, 36, 56. **Effort:** S (runs, not code).

---

# Part 5 — Chat platformization: reuse across domains via `@/shared` (added 2026-07-09)

**Trigger:** repo rules hardened — **domains must not import each other** (shared code lives in `@/shared`), `as` assertions banned (`assertionStyle: 'never'`, `as const` only), protocol magic strings → **enum**. Verified violations today: `loop-creator` and `storyteller` both import `@/domains/chat` (cross-domain ×2); `shared/data/chat-persistence.ts` imports `@/domains/chat` types (shared→domain — inverted layering); `useChatStream` hardcodes `/api/storyteller/workflow/resume` (`useChatStream.ts:1104`) while the stream endpoint is already caller-injected (`:1027`) — so the coupling to fix is narrow.

**Architecture decision D7 — chat is platform, domains are tenants.** `src/shared/chat/` owns: transport (SSE parsing, reconnect/persistence), the **frame protocol** (one enum of frame types — the storyteller route and the hook import the same contract; satisfies the enum rule), generic UI (ChatInterface, ChatInput, ModelSelector, AgentLog…), and the mention **interfaces**. Domains own: their API routes, their mention providers, their action/payload semantics riding inside generic frames (e.g. storyteller's verdict `questions` payload — the platform doesn't know what a "verdict" is), and their pages' wiring. Nothing in `shared/chat` may reference a domain.

### ⬜ 🟢 Item 62. Move `domains/chat` → `shared/chat` (mechanical)
- `git mv src/domains/chat src/shared/chat` keeping `ui/ state/ core/` substructure; rewrite `@/domains/chat` imports (7 files incl. both domains + storyteller page) to `@/shared/chat`; update the ESLint barrel-guard entry and domain-structure test config (chat leaves the domains list); `chat-persistence.ts`'s shared→domain import becomes shared→shared (legal).
- **Verify:** `grep -rn '@/domains/chat' src/` → 0; fabro-verify; smoke unaffected (no runtime change).

### ⬜ 🟡 Item 63. De-couple `useChatStream` from storyteller
- Add `ChatStreamConfig` (injected via hook options or provider): `{ resumeUrl?: string }` — the only hardcoded coupling; default stays the storyteller URL until both consumers pass it explicitly (back-compat, zero behavior change). Frame types become `enum ChatFrameType` in `shared/chat/core/protocol.ts`; the storyteller stream route imports it so route and hook cannot drift (replaces the wave-1 ad-hoc shared type plan).
- **Verify:** unit — resume called with injected URL; storyteller + loop-creator pages compile with explicit config.

### ⬜ 🟢 Item 64. Mention system split
- `MentionProvider`/`MentionItem`/`ProjectContext` interfaces + `ChatInput` consumption stay in `shared/chat`; `game-entity-provider` moves to whichever domain owns game entities (or stays shared if the `game_entities` table is cross-domain — check ownership at implementation); storyteller/loop-creator keep their provider files, now implementing the shared interface.
- **Verify:** both domains' mentions work; no domain import inside `shared/chat`.

### ⬜ 🔴 Item 65. Reuse audit of everything built in waves 1–3
- Classify each new piece as platform vs tenant and relocate the platform pieces: `pickPresent` → `shared/data` (same treatment deepMerge already got); `requestContextString` (generic) → `shared/agent-kernel`, while the `STORYTELLER_*` keys stay domain; SSE verdict-frame *emission* stays in the storyteller route (tenant payload over platform frames); the mechanics-test pattern + entropy injector (Part 2) documented as portable patterns for other domains' pipelines. Loop-creator adopting the beat-pipeline pattern later = new tenant, zero shared changes.
- **Verify:** `npx knip` clean; boundaries lint green repo-wide.

**Policy updates rippling through all remaining items (L1–61):** no `as` assertions anywhere (type predicates + narrowing helpers instead — including at jsonb/JSON boundaries: prefer `isObjectLike`-style guards over boundary casts); protocol string unions → enums when touched; every relocation follows create → rewire → grep-zero → delete.

---

## Sequence

| Phase | Items | Gate |
| --- | --- | --- |
| **A — close wave 0** | L1 ✅ + assertion-ban compliance sweep over touched files | fabro-verify fully green |
| **B — wave 2 rewire & delete** | 13, 14, 15, 16(+D2 plumbing), 22, 23, 24, 25, 26, 27, 28, 29, 30, 38 | grep-zero before each `git rm`; **module-scope typecheck = 0**; smoke green; `mcp:build` + `mastra:build` green |
| **C — wave 3 quality** | 32, 33, 34, 35, 36, 37, 40, 43 (+39, 41 when app/keys available) | `npm run eval` ≥ baseline every scorer; `npx knip` clean |
| **D — model strategy** | 57, 56, 58, 59, 60, 61 | GLM endpoint resolves via role path; picker shows 2; provider tests pass; author default eval-gated |
| **E — Muse** | 46, 47, 48, 49, 50, 51, 52 | mechanics green with fake muse; A/B gate decides the `wildcards` default |
| **F — dev REPL** | 53, 54, 55 | manual session: chat → `/beat` → a/r/k → resume; REPL↔web suspend interop |
| **G — chat platformization** | 62, 63, 64, 65 | `@/domains/chat` grep → 0; boundaries lint green; both domains' chat works; knip clean |

Phase G can run any time after B (it's orthogonal to D–F); do it **before** loop-creator gains new chat features so they're built against `shared/chat` from day one.

Ordering rationale: B deletes the dead architecture everything else would coexist with; D before E (Muse needs the `muse` slot + endpoint-aware resolution); 57 before 56 (resolution layer before defaults move onto it); F last — unless you want the REPL earlier *as the tool for developing the Muse interactively*, which is a legitimate swap (F before E).

## Risk register (new/changed)

| Risk | Mitigation |
| --- | --- |
| Author swap to Kimi/GLM shifts prose quality (biggest variable in the plan) | 61 eval-gates before defaults flip; env rollback; picker keeps both options |
| GLM endpoint-object path untested in role slots | 57 lands first with per-entry unit tests + REPL `/models` verification |
| Picker semantics change (pick = author, not chat) confuses existing users | 58 flags the default-cost change explicitly; chat behavior otherwise identical; revert = one env var |
| Muse yields incoherent randomness | planner reject-with-reason (49), continuity critic downstream, `wildcards` default off until A/B passes (52), human sees `sparkUsed` at verdict |
| RequestContext plumbing regression breaks tool ID trust | 16 unit tests (wrong input ID + right context → right project) run in fabro-verify |
| AgentController beta drift | pinned minor; dev-only; Studio is the fallback debugger |
| Suspend-payload schema growth (`sparkUsed`) breaks old suspended runs | field optional; resume path tolerates absence (mechanics test covers both) |

## Verification (every phase)

```bash
node scripts/fabro-verify.mjs
npx vitest run src/domains/storyteller            # mechanics + mapper pins + muse/entropy units
npm run eval -- --samples=5                       # any prompt/model change; full run at phase gates
npm run test:e2e smoke                            # SSE contract (app running)
npx knip && npm run mcp:build && npm run mastra:build
grep -rn 'agents/council\|agents/judges\|orchestration\|workflowStore\|getRoleModelString' src/ e2e/ evals/
```
