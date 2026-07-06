# RFC: Storyteller Orchestration Layer

> Status: Draft · Owner: TBD · Supersedes the ad-hoc orchestration in `agents/`
> Scope: how storyteller composes agents and emits results across surfaces.
> This is the governing design doc for the P0–P5 refactor.

---

## 1. Problem (root cause, with evidence)

Two orthogonal axes are conflated into ~5 bespoke pipelines, so every entry point
re-implements the same cross-cutting concerns:

- **Execution surface**: SSE stream / JSON batch / graph-invoke
- **Generation strategy**: direct (Showrunner) / council (multi-agent) / plan (executive)

Evidence in code (post-reorg):

| Smell | Evidence |
|------|----------|
| Agent lifecycle duplicated | `createStorytellerAgent()` at **~8 prod sites** (stream route, `story-workflow`, `workflows/storyteller-workflow`, `graph/writers-room`, `services/script-operations`, `beats/generate-prompt`, evals) |
| Context assembly duplicated | canonical `assembleStorytellerContext` (stream route) vs ad-hoc context in beat-pipeline, graph shim, council |
| 3 incompatible result shapes | SSE `{type:'token'…}` · `{beats,status,steps[]}` · `{messages}` |
| God loop | `chat/stream/route.ts` POST is ~900 LOC; the `for await (chunk)` body alone is ~310 LOC with 6 chunk types, dedup, entity-linking, ordering, Langfuse, eventbus |
| Untestable | loop only runs through full stack (DB + LLM); **0 unit tests** cover orchestration decisions |

Cost function today: adding a surface **or** strategy is `O(surfaces × strategies)`
bespoke code, with no shared invariants and no offline test path.

---

## 2. Goals / Non-goals

**Goals**
1. One orchestration core; surfaces and strategies are pluggable seams.
2. The core is **unit-testable offline** (no DB/LLM) — this is a hard requirement, not a nicety.
3. Behaviour-preserving cutover of `/chat/stream` (byte-identical SSE) provable *before* it ships.
4. Collapse the ~8 agent-creation sites and 3 result shapes to 1 each.

**Non-goals**
1. Changing the SSE wire contract consumed by `useChatStream` (it is a published API).
2. Fusing the two runtime engines (Mastra `Workflow` vs `ExecutiveAgent`) — they stay behind the strategy seam (fusing them re-couples and reduces flexibility; see ADR-3).
3. New product capabilities.

---

## 3. Invariants (the safety spec — what MUST NOT change)

The cutover is "correct" iff all hold. These are the assertions the characterization
suite encodes.

| # | Invariant |
|---|-----------|
| I1 | SSE frame **bytes** are identical for an identical chunk sequence (every `type`, key, nesting) |
| I2 | Frame **ordering**: `start` → (tokens / thinking / tool_result / status / section_loading)* → final `message` → buffered `action`* → `complete` |
| I3 | Actions are emitted **after** the final message, de-duplicated by `getActionDedupeKey` |
| I4 | `error` chunk short-circuits: `error` + `message(error)` + `complete` then close |
| I5 | Iterator throw → user-friendly `error` (quota-aware) + `message` + `complete` |
| I6 | `tool_result` for `ask_*`/`create_episode`/`start_beat_planning` emits questions/info/navigation and **does not** create an action (`continue`) |
| I7 | `section_loading: true` on update tool-call; `section_loading: false` after a non-`full` `update_world_bible` action |
| I8 | Langfuse trace/generation/span nesting + `recordToolCall` parentage preserved |
| I9 | Memory keys unchanged: `resource = projectId`, `thread = episodeId || project-<id>` |
| I10 | `workflowContext.run({traceId,sessionId,userId,eventBus})` AsyncLocalStorage boundary still wraps the agent run (council events correlate) |
| I11 | EventBus listeners are always removed (`finally`) — no leak across requests |
| I12 | Controller-closed race is safe (`safeEnqueue`/`safeClose` idempotent) |
| I13 | `_before` diff state = `existingBibleData[detectedSection]` |
| I14 | Final + per-payload entity auto-linking applied identically |

---

## 4. Architecture — hexagonal (ports & adapters) + Strategy × Surface

```
            ┌────────────────────── Orchestrator (pure core) ──────────────────────┐
 request ─▶ │  assemble context (ContextPort) → pick GenerationStrategy →           │
            │  yield AsyncIterable<OrchestrationEvent>; normalize error/trace once   │
            └───────────────┬───────────────────────────────────────┬──────────────┘
   Strategy (HOW)            │                         Surface adapter (OUT)
   ├ DirectStrategy   ───────┤  ports: AgentPort, EntityLinkerPort,   ├ toSSE()        → /chat/stream
   ├ CouncilStrategy  ───────┤         TracerPort, ClockPort,         ├ toJSON()       → REST/evals/script-ops
   └ PlanStrategy     ───────┘         EventBusPort                   └ toGraphState() → MCP / graph adapters
```

**Ports (dependency inversion — the testability lever).** The core depends on
interfaces, not concretes. Real impls in prod; fakes in tests:

| Port | Prod impl | Test fake |
|------|-----------|-----------|
| `AgentPort` | `createStorytellerAgent().stream()` | yields a **scripted chunk fixture** |
| `ContextPort` | `assembleStorytellerContext` | returns canned context |
| `EntityLinkerPort` | `entityAutoLinker.autoLink` | **identity** |
| `TracerPort` | Langfuse trace/gen/span/recordToolCall | no-op spy |
| `ClockPort` | `() => Date.now()` | **fixed** (kills timestamp nondeterminism, I1) |
| `EventBusPort` | `EventEmitter` + `workflowContext.run` | in-memory emitter |

Everything speaks one `OrchestrationEvent` union (already defined in
`agents/orchestration/types.ts`); adapters are pure transforms (`toSSE` done +
unit-tested in P0).

---

## 5. The testability unlock (why this plan can be verified WITHOUT the DB)

The loop is `f(chunkSequence, context, ports) → OrchestrationEvent[]`. With ports
injected and the clock fixed, it is **deterministic and pure**. Therefore:

1. **Pin before refactor (characterization tests, Feathers).** Author synthetic
   chunk fixtures for each path — `text-delta`, `reasoning`, `tool-call`,
   `tool-result` per tool family (`update_world_bible`, `manage_beat`,
   `consult_premise_architect`, `ask_character_questions`, `create_episode`,
   `start_beat_planning`), `error`, iterator-throw. The chunk shapes are simple and
   known (§ route lines 442–748) — **no LLM needed to produce them**.
2. Snapshot the **current** loop's SSE output on those fixtures (extract current
   loop into a callable first), then refactor and assert **identical** snapshots.
   This enforces I1–I7, I13–I14 offline.
3. Strategy/adapter unit tests (mock `AgentPort`) cover routing + event mapping.
4. Only **I8–I12** (Langfuse nesting, ALS boundary, listener cleanup, controller
   race) need spy-based assertions + a final e2e in your env.

Net: ~90% of correctness is provable in CI offline; the DB/LLM run is confirmation,
not discovery.

---

## 6. Decomposition of the god loop

Extract the 310-LOC `for await` body into **pure chunk handlers**, one per chunk
type, each `(payload, state, ports) → OrchestrationEvent[]` (+ state mutation via a
small reducer). Mirrors the existing branches so it's a *move*, not a rewrite:

- `handleError`, `handleTextDelta`, `handleReasoning`, `handleToolCall`,
  `handleToolResult` (wraps `mapToolResultToAction` + dedup + linking + buffering),
  `handleStepStart`, plus finalizers `emitFinalMessage`, `flushPendingActions`.

Each handler is independently unit-tested. `getActionDedupeKey`,
`mapToolResultToAction`, `detectLoadingSection` already extracted + tested.

---

## 7. Migration — branch-by-abstraction, feature-flagged, gated

No big-bang. Old path stays until the new one is proven byte-identical.

| Phase | Work | Exit gate (must pass to proceed) |
|------|------|----------------------------------|
| **P0** | `OrchestrationEvent` contract + `toSSE` adapter (+ tests). **Design only — code lives here, not in `src/`, until P1 has a consumer** (no unconsumed scaffolding in the tree). Build it at the start of P1a. | spec ready |
| **P1a** | Extract current loop → pure chunk-handlers behind ports (no behaviour change); add characterization fixtures + snapshots of **current** output | snapshots captured; tsc/knip/vitest green |
| **P1b** | `Orchestrator` + `DirectStrategy` consume the handlers; route builds real ports; flag `ORCHESTRATOR_V2` (default OFF) chooses old vs new | **snapshot parity** old≡new on all fixtures (offline) |
| **P1c** | Flip flag ON in your env; run e2e + manual smoke (I8–I12) | e2e green in your env → remove old path |
| **P2** | `CouncilStrategy` wraps `storyCreationWorkflow`; `PlanStrategy` wraps executive; agentic→Council | strategy unit tests + e2e |
| **P3** | `toJSON` subsumes beat-pipeline; `toGraphState` subsumes graph shim; old files → thin re-export → delete after parity | per-surface parity tests |
| **P4** | Shared **AgentExecutionKernel**: collapse the ~8 `createStorytellerAgent` sites to 1 (lifecycle+trace+error once) | call-site count 8→1; suites green |
| **P5** | Delete dead re-exports; docs; `OrchestrationResult` contract doc | knip clean; RFC marked Accepted |

**Rollback**: `ORCHESTRATOR_V2=false` instantly reverts to the legacy loop at runtime
(P1b–P1c). Zero-deploy rollback until the old path is removed in P1c.

---

## 8. Risk register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Event-ordering regression (I2/I3) | Med | High | snapshot parity gate (P1b) |
| Timestamp nondeterminism breaks tests (I1) | High | Med | `ClockPort` fixed in tests |
| ALS boundary moved → council events lose correlation (I10) | Med | High | keep `workflowContext.run` wrapping the strategy; assert via spy |
| Listener leak / controller race (I11/I12) | Low | High | preserve `finally` cleanup + idempotent `safeEnqueue/Close`; spy test |
| Langfuse span nesting drift (I8) | Med | Low | `TracerPort` spy asserts call shape |
| Hidden coupling in `agent.stream` chunk shapes | Med | Med | fixtures derived from real chunk types; e2e final gate |
| Scope creep into engine fusion | Med | Med | ADR-3 forbids it; strategy seam only |

---

## 9. Determinism & concurrency hazards (called out explicitly)

- `Date.now()` in `startTime`, `timestamp`, `q-${stepId}-${Date.now()}` → **inject clock**.
- `for await` + `controller` lifetime: cancellation/abort must stop iteration and run cleanup.
- `workflowContext.run` = AsyncLocalStorage; the agent `stream()` MUST execute inside it
  so council sub-agents see the eventBus/traceId (I10).
- Backpressure: SSE `enqueue` is fire-and-forget today; keep semantics (no new awaits in hot path).

---

## 10. ADRs (decisions + rejected alternatives)

- **ADR-1: Hexagonal ports over a "service" facade.** Ports make the core pure/testable
  offline. Rejected: a thick service (still needs DB to test).
- **ADR-2: Characterization-first (pin then refactor).** Rejected: "refactor then test" —
  can't, no offline harness existed; we'd be flying blind.
- **ADR-3: Keep two runtime engines behind one Strategy.** Rejected: unify into one engine —
  conflates event-graph vs plan-loop, re-introduces coupling, lowers flexibility.
- **ADR-4: Feature flag + snapshot parity before cutover.** Rejected: direct cutover — the
  loop is on the revenue path; needs zero-deploy rollback.

---

## 11. Metrics (definition of done, measurable)

| Metric | Before | Target |
|--------|--------|--------|
| `createStorytellerAgent` prod call sites | ~8 | 1 |
| Context-assembly impls | 3–4 | 1 |
| Result shapes | 3 | 1 (+adapters) |
| Orchestration unit tests | 0 | chunk-handler + strategy + adapter suites |
| Offline-provable correctness of loop | 0% | ≥90% (I1–I7,I13–I14) |
| `chat/stream/route.ts` POST LOC | ~900 | < ~150 (orchestration glue) |

---

## 12. Status of work in this branch

- **No orchestration code committed yet** — the P0 event contract + `toSSE` adapter
  were prototyped and verified (11 passing tests) but **removed from `src/`** because
  they had no production consumer; committing unconsumed scaffolding violates the
  "new files must be needed or fold into a module" rule. The exact `OrchestrationEvent`
  union and frame mapping are specified in §3–§4 above — recreate verbatim at P1a.
- **Next**: P1a — extract chunk-handlers + author characterization fixtures and pin
  the current loop's output (offline), then (re)introduce `OrchestrationEvent`+`toSSE`
  *with* their consumer in the same step. No behaviour change; this is the safety net.
