# Evaluation — Mastra agent approaches, across all domains

**Scope:** what it takes to adopt four Mastra capabilities — (1) file‑based agents, (2) durable agents, (3) goals, (4) Studio agent editing — across every domain in this repo.

**Docs evaluated:**
- https://mastra.ai/docs/getting-started/file-based-agents
- https://mastra.ai/docs/long-running-agents/durable-agents
- https://mastra.ai/docs/long-running-agents/goals
- Studio agent editing (getting-started/studio)

**Bottom line (TL;DR):**

| Approach | Verdict | Effort | Blocker |
|---|---|---|---|
| **File‑based agents** | ⚠️ Partial / not now | High | Our agents are **dynamic** (`instructions:()=>…`, `model:()=>resolveRoleModel()`); file‑based is "unsuitable for dynamic/runtime configuration" |
| **Durable agents** | ✅ High value for storyteller | Medium | We already have workflow‑suspend HITL; durable agents would **replace/augment** it — needs Redis for multi‑process |
| **Goals** | ✅ Fits Muse/autonomous flows | Medium | Needs memory‑backed threads + a judge model (we have both) |
| **Studio editing** | ⚠️ Only if we go file‑based | Low‑Med | Studio live‑edits **source files**; real write‑back needs file‑based agents (or Mastra Editor) |

---

## 1. Current architecture (the baseline every approach must fit)

- **Two Mastra entries:** `src/mastra.ts` (Studio CLI entry → `shared/agent-kernel/mastra`) and `MastraInstance.ts` / `create-mastra.ts` (production: Postgres store via `@mastra/pg`, native `Observability` registry). *Never a second store/instance* is a hard invariant (AGENTS.md).
- **Registration by dependency inversion:** domains call `registerMastraModule({ agents, workflows })` in `core/io/mastra-runtime.ts`; `create-mastra` calls `consumeMastraRegistrations()`. `shared/` never imports `@/domains/*`.
- **Agents are code‑based AND dynamic:**
  ```ts
  new Agent({
    id, name, description,
    instructions: () => buildChatAdapterPrompt(getEntityLinkRequirements()),
    model: () => resolveRoleModel('chat'),          // role→model matrix, picker override per D2
    tools: { … 10 tools … },
  })
  ```
  Instructions are **prompt‑builder functions** (runtime inputs: entity‑link minimums, phase, project context); models are **resolved per request** from a role matrix + `RequestContext` (the picker drives the author model, Kimi default). This dynamism is load‑bearing.
- **Long‑running today:** the beat‑draft **workflow** suspends on the editorial verdict (HITL) and resumes via the workflow API; Postgres persists run state. `AgentController` (PLAN‑V2 Phase 4) is landed behind `STORYTELLER_CONTROLLER=1`, default off.
- **`src/mastra/`** currently holds only `index.ts` + `public/` — **not** the file‑based convention (`src/mastra/agents/<id>/config.ts` + `instructions.md`).

### Agents per domain

| Domain | Agents today | Style | Long‑running need |
|---|---|---|---|
| **storyteller** | chat adapter, GRRM author, beat planner, 3 critics, Muse (brainstorm+rank) — ~9 | dynamic model+prompt, tools, workflow | High (beat drafting, verdict HITL) |
| **game-design** | game‑design agent | dynamic, memory search | Low‑med |
| **loop-creator** | market‑analyst (+ legacy LangChain tree) | mixed | Low |
| **interior-designer / 3d-asset-exporter / world-building-toolkit** | none — **`tasks/` (Trigger.dev)**, not agents | n/a | Handled by Trigger.dev already |
| **marketing** | none currently | n/a | n/a |

**Implication:** "all domains" really means **storyteller (deep), game‑design + loop‑creator (light), asset domains (n/a — they use Trigger.dev tasks, not Mastra agents).** Any adoption is overwhelmingly a storyteller concern.

---

## 2. File‑based agents

**What it is:** define agents as files under `src/mastra/agents/<id>/` — `config.ts` (`agentConfig({ model })`), `instructions.md` (system prompt), optional `tools/`, `skills/`, `memory.ts`, `subagents/`, `scorers/`. The Mastra CLI (`mastra dev`/`build`) discovers and registers them; runtime behavior is identical to code‑defined agents. **Beta.**

**Fit with us — the core tension:**
- File‑based `instructions.md` is **static markdown**; our instructions are **functions** that inject runtime data (entity‑link minimums, phase, project/entity context, sparks). The docs explicitly say file‑based is *"unsuitable for dynamic or runtime‑based configuration."*
- File‑based `config.ts` picks **one model**; we resolve models **per request** from a role matrix + `RequestContext` (picker override). A static `model:` throws that away.
- Discovery only works when launched **via the Mastra CLI**. Our **production** path is the Next.js app importing the `mastra` instance directly — the docs warn *"direct imports of the `mastra` instance bypass file‑based discovery; in library contexts, define primitives in code."* So file‑based would help **Studio/authoring**, not production.
- `src/mastra.ts` (file) vs `src/mastra/agents/` (dir) can coexist, but our dual‑entry + DI registration seam would need reconciling.

**What adoption would take:**
1. Split each agent's static skeleton (id/name/description + base system prompt prose) into `instructions.md`, keep the **dynamic** parts (model resolution, runtime prompt injection, tools) in code — i.e. a **hybrid**: file‑based prose + code‑based composition. Realistically only the *base* prompt prose moves to markdown; the builder wraps it.
2. Keep production on code‑based registration; use file‑based **only for Studio authoring parity**.
3. Reconcile the `.agents/` skill/prompt convention already in the repo (`.agents/execute/`, `.agents/skills/`) with Mastra's `skills/` — decide one source of truth.

**Verdict:** ⚠️ **Not a wholesale win.** High effort, beta risk, and it fights our dynamic‑config design. **Recommended narrow use:** move **static base prompts → `instructions.md`** (readability + Studio editing) while keeping model/prompt composition in code. Do storyteller first as a pilot; asset domains have no agents so are out of scope.

---

## 3. Durable agents

**What it is:** wrap a standard `Agent` so its agentic loop runs **inside a workflow** with PubSub event streaming — clients can disconnect/reconnect (`observe(runId)`), state survives restarts, tool‑approval suspend/resume built in. Factories: `createDurableAgent` (in‑proc/dev), `createEventedAgent` (fire‑and‑forget background), `createInngestAgent` (prod: memoization/retries). Multi‑process reconnection needs a **persistent cache (Redis)**. **Beta.**

**Fit with us:**
- **Strong for storyteller.** Beat drafting is multi‑step, long, and already has a suspend gate. Durable agents give **reconnect‑after‑disconnect** (mobile/flaky networks) and background drafting for free — exactly the `untilIdle` + `observe` use case.
- **Overlaps existing machinery:** we already do HITL via **workflow suspend** + our new **AgentController** (which also gates tools + modes). Durable agents are a *third* long‑running mechanism. They compose (controller gates modes; workflow gates the verdict; durable wraps the loop for reconnection) but we must be deliberate to avoid three overlapping abstractions.
- **Infra:** dev is in‑memory (free). Multi‑process/prod reconnection requires **Redis** (`@mastra/redis` `RedisServerCache`) — new infra we don't run today. Inngest is a heavier prod option (new platform dependency).

**What adoption would take:**
1. Pilot `createDurableAgent({ agent })` around the **chat adapter** or the **beat‑draft loop**, behind a flag, reusing the existing Postgres store for run state.
2. Add **Redis** for multi‑process reconnection (or accept single‑process dev‑only for the pilot).
3. Map durable stream events → our frozen SSE `ChatFrameType` (same table we built for AgentController 4.3) — largely reusable.
4. Decide the boundary: **workflow‑suspend vs durable‑agent** for the verdict gate (pick one to own HITL).

**Verdict:** ✅ **High value for storyteller**, medium effort. **Gate on the Redis decision.** Not applicable to asset domains (Trigger.dev already gives them durable background jobs). Light value for game‑design/loop‑creator.

---

## 4. Goals

**What it is:** a **durable, thread‑scoped objective** the agent keeps working toward across loop iterations until an **LLM‑judge** marks it satisfied or a run budget (`maxRuns`, default 50) is exhausted. API: `setObjective/getObjective/updateObjectiveOptions/clearObjective`; agent config `goal: { judge, maxRuns, prompt, scorer? }`; emits typed `goal` chunks (`GoalEvaluationPayload`) for UI progress. Requires **storage + memory‑backed thread + judge model**.

**Fit with us:**
- We **already have the prerequisites:** Postgres storage, memory‑backed threads, and judge models (the Muse **rank** stage + the three **critics** are literally LLM‑judges; `resolveRoleModel('critic'/'planner')` gives a judge).
- Natural fit for **autonomous multi‑beat generation**: "keep drafting beats until the episode premise is satisfied" is a goal with the critics as the scorer. Also fits the **Muse** brainstorm→rank loop.
- The `GoalEvaluationPayload` chunk maps cleanly to a progress frame in our SSE contract.

**What adoption would take:**
1. Add `goal: { judge: resolveRoleModel('critic'), maxRuns, prompt }` to a worker agent (e.g. an autonomous author) — small.
2. Wire `setObjective` at the start of an autonomous run keyed by `threadId`/`resourceId` (we already have both).
3. Surface `goal` chunks as a progress frame; reuse the story‑motion/critic scorers as `goal.scorer` for domain‑correct "done".

**Verdict:** ✅ **Good fit, medium effort**, low new‑infra (reuses storage/memory/judges we have). Best paired with **durable agents** (goals need the long‑running loop). Storyteller‑only in practice.

---

## 5. Studio agent editing

**What it is:** with `mastra dev` (Studio at :4111) you can tweak model params (temperature/top‑p) and **live‑edit agents/workflows** — but Studio edits your **source files** and reflects them on reload; the docs **do not confirm UI write‑back** to agent config. A separate **Mastra Editor** targets non‑technical iteration + versioning.

**Fit with us:**
- Studio already works against our real agents (the `mastra.ts` entry registers the production agents into Studio — PLAN‑V2 1.1). You can **run/inspect** them today.
- Meaningful *editing* of prompts from the UI effectively **requires file‑based agents** (so there's an `instructions.md` to edit) — otherwise you're editing TS prompt‑builder functions, which Studio won't safely round‑trip.
- Our prompts are **dynamic builders**, so even with file‑based, only the *static base prose* would be Studio‑editable.

**Verdict:** ⚠️ **Dependent on file‑based adoption.** Cheap to expose read/run in Studio (already there); real prompt‑editing value is gated on moving base prompts to `instructions.md` (see §2). Consider **Mastra Editor** if non‑technical prompt iteration + versioning is a real requirement.

---

## 6. Cross‑domain applicability matrix

| Domain | File‑based | Durable | Goals | Studio edit |
|---|---|---|---|---|
| **storyteller** | Pilot base prompts → `.md` (hybrid) | ✅ high (beat loop, reconnect) | ✅ (autonomous drafting, critics as judge) | after file‑based |
| **game-design** | maybe (1 agent) | ○ low | ○ | after file‑based |
| **loop-creator** | maybe (market‑analyst) | ○ low | ○ | after file‑based |
| **interior‑designer / 3d / world‑building** | n/a (no agents) | n/a — **Trigger.dev** already durable | n/a | n/a |
| **marketing** | n/a | n/a | n/a | n/a |

**Key point:** the three asset domains are **already "durable"** via Trigger.dev tasks; introducing Mastra durable agents there would add a competing mechanism for no gain. This work is **~90% a storyteller concern**.

---

## 7. Recommendation & phased path

**Do (highest value, lowest friction):**
1. **Goals + Durable agents together, storyteller only, behind a flag** — the "autonomous drafting until the episode premise is satisfied" loop. Reuses our Postgres store, memory threads, and critic judges. Map events to the existing SSE frame table (built for AgentController 4.3). Start `createDurableAgent` in‑process (no Redis) for the pilot.
2. Reuse our **critics/story‑motion scorer** as `goal.scorer` so "done" is domain‑correct.

**Defer / conditional:**
3. **File‑based agents** — only as a **hybrid pilot**: move each storyteller agent's *static base prompt prose* to `instructions.md`, keep dynamic model/prompt composition in code. Buys Studio editability + readability; does **not** replace our registration seam. Gate on beta‑stability.
4. **Studio prompt editing** — falls out of (3); until then Studio stays run/inspect‑only.
5. **Redis / Inngest** — only when multi‑process reconnection or prod‑grade retries become a real requirement.

**Do not:**
- Do **not** migrate the asset domains — Trigger.dev already covers durability there.
- Do **not** flatten our **dynamic** model/prompt resolution into static file‑based config — the role‑matrix + picker override (D2) is load‑bearing.
- Do **not** stack durable‑agent + workflow‑suspend + AgentController on the same gate without picking **one** owner for the editorial verdict.

**Sequencing:** land the storyteller **AgentController** (Phase 4, already built) → add **durable+goals** autonomous loop behind a flag → then **hybrid file‑based** for authoring/Studio. Each is independently shippable and reuses the SSE frame contract already in place.

---

*Prereqs we already satisfy: Postgres store, memory‑backed threads, judge models, SSE frame contract, native Observability. New infra only if we choose Redis (durable multi‑process) or Inngest (prod retries).*
