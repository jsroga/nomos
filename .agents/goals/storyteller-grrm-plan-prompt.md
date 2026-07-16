# Storyteller — GRRM / StoryForge architecture plan (Claude Code)

**Session goal (entry point).** Configuration map: [../CONFIGURATION.md](../CONFIGURATION.md).

**Use this file as your session goal.** Paste it into Claude Code, or run:

```text
Read .agents/goals/storyteller-grrm-plan-prompt.md and follow it exactly.
```

---

## Your job in this session

**Deliver a detailed architecture & migration PLAN only.** Do **not** implement code, delete files, or open a PR unless the human explicitly asks after reviewing the plan.

You have **wide freedom** to structure the plan: item count, waves, diagrams, risk register, eval/e2e strategy — but the plan must be **actionable** (concrete paths, grep checkpoints, verification commands) and **honest** about current broken WIP.

Write the plan to **`PLAN.md`** at the repo root (overwrite if present). Optionally add **`STRUCTURE.md`** if you propose folder moves.

Optional: park throwaway spot-check scripts or command output under **`.local/tmp/{session-id}/`**
(gitignored) if useful for the session — not required.

---

## North star

Reduce **storyteller** from a **10-agent writers' room + ~57 tools** (partially deleted; tree often does not typecheck) to a **StoryForge-aligned stack**:

| Dimension | Target (directional — you refine in the plan) |
| --- | --- |
| **Agents** | ~**5–6**: 1 author + beat planner + 3 narrow critics (+ optional thin chat/orchestrator adapter) |
| **Tools** | ~**10** stable CRUD/canonical tools + **1 workflow entry tool** (not 57 workflow variants) |
| **Quality loop** | **Beat plan → script-format draft → 3 critics (diagnose only) → human verdict → revise** — not committee prose averaging |
| **Voice** | GRRM-inspired **craft mechanics** (dialogue + action forward, Law of Motion, anti-slop) — not “write like GRRM” pastiche |
| **Orchestration** | **Mastra v1 Workflows** as the primary orchestration layer (suspend/resume for HITL where needed) — retire ad-hoc multi-agent graphs that average voice |
| **Wire contract** | **SSE chat** (`src/app/api/storyteller/chat/stream/route.ts`) is **published** — adapter-only changes; frame order unchanged |

Success = distinctive prose that **advances the story every beat**, continuity enforced by tools/memory, critics that **quote evidence and never rewrite**, human taste at verdict gates.

---

## Mandatory reading (do this before planning)

Read these in order; cite them in your plan where relevant.

### StoryForge PoC (reference architecture — do not copy blindly; port patterns)

| Path | Why |
| --- | --- |
| **`.local/storyforge/README.md`** | Full PoC: 1 author, 3 critics, bible tools, `chapter-workflow`, verdict suspend, scorers, e2e tiers |
| **`.local/storyforge/RECOMMENDATIONS.md`** | GRRM process research + Mastra PoC mapping (gardener philosophy, POV clustering, critic/overseer roles, workflow knots) |
| **`.local/storyforge/src/`** | Reference implementation: agents, workflows, tools, scorers, CLI patterns |
| **`.local/storyforge/example-act.json`** | Batch / act-runner shape for durable workflow runs |

The PoC lives under **`.local/storyforge/`** (gitignored reference). Treat it as the **design north star**, not a drop-in replacement for production `src/domains/storyteller/`.

### Production storyteller (current mess — inventory in plan)

Spot-check (do not skip):

```bash
find src/domains/storyteller/agents -name '*.ts' | sort
grep -rc 'createTool' src/domains/storyteller/ai/tools/ 2>/dev/null | grep -v ':0$'
find src/domains/storyteller -name '*Agent*.ts' | sort
grep -rn 'agents/council\|agents/judges\|orchestration' src/domains/storyteller/ | head -40
wc -l src/app/api/storyteller/chat/stream/route.ts
git status --short src/domains/storyteller/
node scripts/fabro-verify.mjs 2>&1 | head -60   # capture current failures — plan Wave 0 from this
```

Key areas today: `agents/council/`, `agents/judges/`, `agents/orchestration/` (`WritersRoomGraph`, `StoryWorkflow`), `agents/tools/` (WIP consolidation), `config/ModelConfig.ts`, `prompts/GrrmSystemPrompt.ts` (if present), `ActionApprovalModal` HITL.

### Repo rules & architecture

| Path | Why |
| --- | --- |
| **`AGENTS.md`** | Mastra v1 patterns: `RequestContext`, `createTool(inputData, context)`, `structuredOutput`, single Mastra instance |
| **`docs/unified/ARCHITECTURE.md`** | Module blueprint, dependency rule, invariants |
| **`docs/unified/SPEC.md`** | No `z.any()` at boundaries, no browser→Supabase writes, one Drizzle schema |
| **`docs/TESTING.md`** | Unit / e2e / eval tiers |
| **`evals/`** | Golden dataset + runner (`evals/datasets/storyteller-golden.ts`, `evals/run.ts`) |
| **`e2e/`** | Playwright + legacy agent scripts (`e2e/scenarios/`, `e2e/agent/`) — likely needs cleanup after agent reshape |
| **`.agents/execute/plan.md`** | Depth bar if human later runs Fabro Plan stage (35–55 items for agent-heavy modules) |

---

## What the plan MUST cover

Use your judgment on ordering and granularity, but **every section below must appear** in `PLAN.md`.

### 1. Current state → target state

- Agent/tool counts (before/after) with **file paths**
- What breaks today (typecheck errors, missing exports, council still wired to deleted tools)
- Text or mermaid diagram: **current orchestration** vs **target Mastra workflow graph**

### 2. Agent & tool simplification

- Which agents **delete**, **merge**, or **create** (map council/judges → author + 3 critics + beat planner)
- **Tool budget ~10**: stable IDs, input/output Zod (no `z.any()`), `RequestContext` for `projectId` / `episodeId`
- **Deletion order**: create replacements → rewire imports (`grep` until zero) → delete last
- Import rewiring matrix (symbol → new path → files to touch)

### 3. Mastra workflows & orchestration layer (required section)

Plan how storyteller uses **latest Mastra v1 workflow features**, not legacy graph sprawl:

- Primary workflow(s): e.g. **beat-draft workflow** (plan → draft → parallel critics → **suspend at human verdict** → revise)
- Where **`createStep`**, **parallel steps**, **suspend/resume**, and **workflow state** live (paths under `src/domains/storyteller/ai/`)
- How **chat/SSE route** invokes the workflow (thin adapter — no frame-order changes)
- How **HITL** maps to StoryForge’s editorial verdict (Studio / `ActionApprovalModal` / API — pick one coherent story)
- Retire or shrink: `WritersRoomGraph`, multi-hop council orchestration, 57-tool workflow sprawl
- Registration: `getMastraInstance()` / domain `server.ts` exports — what Studio and MCP see after reshape

Reference **`.local/storyforge/src/mastra/workflows/`** and **`RECOMMENDATIONS.md`** for PoC patterns (verdict gate, critic parallel step, durable run recovery).

### 4. Prompts & quality (GRRM / anti-slop)

- Single author prompt strategy (`GrrmSystemPrompt` or equivalent): **craft mechanics**, not author imitation
- Beat planner output schema (JSON beats: goal, conflict, turn, dialogue hook) — no free-form prose generation in planner
- Critic prompts: quote passage, forbidden to suggest replacement prose
- What to remove: committee “creative directors”, generic rewrite judges, atmospheric slop incentives

### 5. Evals — update & cleanup (`evals/`)

Plan how golden evals and scorers track the **new** pipeline:

| Today | Likely change |
| --- | --- |
| `evals/datasets/storyteller-golden.ts` | Add/update examples for beat-plan quality, critic diagnosis, post-revision prose |
| `evals/scorers/` + `src/shared/agent-kernel/scorers/` | Align with StoryForge craft scorers (prose-craft, stakes-cost) where appropriate |
| `npm run eval` | Which scorers gate prompt/workflow changes; baseline ratchet strategy |
| Live agent eval (future) | Wire workflow output into scorers — note as phased item if not in increment 1 |

Call out **obsolete scorers/examples** tied to deleted council/judges and how to remove without losing regression signal.

### 6. E2E — update & cleanup (`e2e/`)

Plan test tier realignment after orchestration change:

| Area | Notes |
| --- | --- |
| **`e2e/scenarios/storyteller-smoke.script.ts`** | SSE wire contract — must keep passing; update assertions if tool/action names change |
| **`e2e/agent/*`** | Legacy agent workspace tests — which to **delete**, **rewrite**, or **move** to match Mastra workflow + verdict suspend |
| **StoryForge PoC e2e model** | See `.local/storyforge/README.md` § E2E (`mechanics` free tier, `workflow` with models) — propose equivalent tiers for this repo |
| **Commands** | `npm run test:e2e`, `npm run test:e2e smoke`, fabro-verify integration |

Include a **test migration wave** (what runs in CI vs local-only vs optional LLM cost).

### 7. Waves, dependencies & minimum first increment

- **Wave 0**: tree compiles (`fabro-verify` green for storyteller module scope)
- **Wave 1+**: topology, workflow, eval/e2e — your breakdown
- **Minimum first increment**: shippable subset (8–15 items) that restores compile + one vertical slice (e.g. beat plan → draft → one critic → SSE still works)

### 8. Risk register & deferred scope

- SSE/HITL regressions
- MCP/API callers (`src/mcp/domains/storyteller/`, `server.ts` exports)
- Duplicate `db/schema.ts` (defer or include — state explicitly)
- Model config fragmentation (`ModelConfig.ts`, catalog files)

### 9. Verification (every wave)

- `node scripts/fabro-verify.mjs` (module-scoped + pre-commit parity)
- Targeted `grep` checkpoints from deletion order
- `npm run eval -- --scorers=…` for prompt/workflow changes
- `npm run test:e2e smoke` when SSE/touchpoints change
- `npm run test:unit` for domain tests you add/move

---

## Hard constraints (non-negotiable)

- **Mastra v1** only — see `AGENTS.md`; no `RuntimeContext`, no root `@mastra/core` imports, no `format` on agents
- **No `z.any()`** at tool/workflow/API boundaries
- **Do not change SSE frame order** without explicit human approval called out as P0 risk
- **One public barrel**: external imports via `src/domains/storyteller/index.ts`
- **Do not** reintroduce a writers' room of 6+ voice agents “for quality”
- **Plan only** in this session unless human says implement

---

## Optional context from prior Fabro run (may be stale — verify)

A prior execute run targeted StoryForge-aligned scope **[A]** with minimum increment roughly:

P0 compile fix → `grrmTools` → `GrrmAuthorAgent` → `BeatPlannerAgent` → critics → Mastra registration → single workflow entry tool.

Treat as **hint**, not gospel — your spot-checks override stale artifacts (`PLAN.md`, `DECISIONS.md`, `.local/findings/scope.md`).

---

## Output format for `PLAN.md`

Start with:

```markdown
# PLAN — storyteller GRRM / StoryForge migration

Fabro module: storyteller

## Summary
…

## Spot-check evidence
…

## Current architecture
…

## Target architecture (Mastra workflows + agents)
…
```

Then prioritized numbered items (P0–P3) with: Problem, Impact, Change (paths), Before→After imports where relevant, Verification command, Depends on, Risk, Acceptance.

End with: **Suggested sequence**, **Minimum first increment** (bold item numbers), **Eval migration**, **E2E migration**, **Deferred**.

---

## After you finish

Post a short summary in chat:

1. Item count and minimum increment size  
2. Target agent/tool counts  
3. Primary Mastra workflow name(s) and suspend/HITL story  
4. Top 3 risks  
5. Eval & e2e cleanup headline (what you’d delete vs rewrite)

Then **stop**. Wait for human approval before implementation.
