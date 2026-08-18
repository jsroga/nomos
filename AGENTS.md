# AGENTS.md — Mastra development

This repo uses **Mastra v1** (`@mastra/core@^1.x`). Read this before changing agents, tools, workflows, or memory. Mirror patterns in `src/domains/storyteller/ai/*` and `src/shared/agent-kernel/mastra/*`.

## Dark factory

The dark-factory execute loop has three interchangeable runners that share the **same stages, prompts, gates, and verify script**:

- **Interactive (IDE):** `/execute <module>` skill in Cursor Agent → delegates to `.cursor/agents/*` subagents (one per Fabro stage), `AskQuestion` at the Clarify and Verification gates. See `.cursor/skills/execute/SKILL.md`.
- **Claude Code:** same stages via `.claude/agents/*` subagents → `Read` `.agents/execute/*.md`.
- **Sandboxed:** `fabro run .fabro/workflows/execute/workflow.toml -I module=<x>` (Docker/Daytona). Stage prompts load from **`.agents/execute/`** — never duplicate.
- **Headless / CI:** `src/shared/agent-kernel/cursor-runner.ts` (Cursor SDK + custom tools for `fabro_run` / `fabro_verify` / `npm_script`), or sandboxed `fabro run` above.

`.cursor/` + `.claude/` config: scoped `rules/*.mdc`, thin subagents in `.cursor/agents/` and `.claude/agents/` (pointers only), **prompts in `.agents/execute/`**, **skills in `.agents/skills/`** (IDE symlinks + `.fabro/skills` → same), `skills/execute/`, `hooks.json`, `mcp.json`. Automations: `.cursor/automations/`.

## Rules

- Import from `@mastra/core/agent`, `/tools`, `/mastra`, `/workspace` — not package root.
- Use `RequestContext`, not `RuntimeContext`.
- `createTool` execute: `(inputData, context)` — separate params.
- No `format` on agents; use `structuredOutput`.
- Model strings: `'openai/gpt-5.6-luna'`, `'anthropic/claude-…'` (`provider/model`). Fast tier = Luna or Gemini Flash via OpenRouter (`TEXT_GEN_FAST_MODEL`).
- Keep Mastra packages on the same v1 version.

## Layout

| Concern | Location |
|---------|----------|
| Mastra instance | `src/mastra.ts` (Studio CLI canonical export), `src/shared/agent-kernel/MastraInstance.ts` (app) |
| CLI shim | `src/mastra/index.ts` — 2-line re-export of `src/mastra.ts`; exists only because `mastra dev/build` resolves `src/mastra/index.ts`. Keep both; do not add code here. |
| File-based prompts | `src/mastra/agents/<agent-id>/instructions.md` — static base prompts (Mastra convention), loaded by code-based agents via `loadAgentInstructions` |
| Agents | `src/domains/*/ai/agents/` (implementations) inside `src/domains/*/ai/` (Mastra layer — server-only; see `docs/ARCHITECTURE.md` module blueprint; enforced via `import '@/shared/data/server-guard'`, NOT the `server-only` package; pure schema modules allowlisted) |
| Agent registration | `src/shared/agent-kernel/mastra/runtime-registry.ts` (domains register at import via `core/io/mastra-runtime.ts`; shared never imports domains). Registered domains: **storyteller**, **game-design**, **loop-creator** (flagged `FF_LOOP_CREATOR_MASTRA=true`) — side-effect-imported by `src/mastra.ts` + each domain's API route so registration precedes the first `getMastraInstance()` |
| AgentController | `@mastra/core/agent-controller` — sessions, modes, plan→build gate (see "Plan-first agents" below) |
| Tools | `src/domains/*/ai/tools`, `src/shared/agent-kernel/mastra/tools/` (bundler-safe Studio stubs) |
| Models | `src/shared/agent-kernel/models.ts` (kernel/judging), domain `config/ModelConfig.ts` (`resolveRoleModel` role slots) |
| Memory | `@mastra/memory` + `PostgresStoreVNext` via shared storage (vNext observability domain for Studio discovery/feedback). One Mastra store/instance only. **Documented exception:** game-design's `GameDesignMemory` keeps its own `PgVector` **pattern-RAG index** (not agent memory) — a domain vector index is allowed; a second Mastra store/instance is not |
| Observability | `@mastra/observability` registry (`create-mastra`) + `tracingOptions`; real spans via `src/shared/observability/mastra-tracing.ts` (`withMastraSpan`); `observability.ts` = sanitizers only |
| Evals / scorers | `@mastra/core/evals` `createScorer`, `src/shared/agent-kernel/scorers/` + domain deterministic scorers unioned in `evals/run.ts` |
| Prompts | `src/shared/agent-kernel/prompts/` (repository + core prompts), domain `prompts/`; **static agent prompts** → `src/mastra/agents/<id>/instructions.md` (file-based, via `loadAgentInstructions`) |

## Tool pattern

```ts
export const myTool = createTool({
  id: 'my_tool',
  description: 'When the model should call this — be specific.',
  inputSchema: z.object({ … }),
  outputSchema: z.object({ … }),
  execute: async (inputData, context) => { … },
})
```

Delegate business logic to `src/services/*` when it exists. Tool `id` is snake_case and stable.

## Agent pattern

Register through the central Mastra instance so storage, workspace, and tracing are shared. Bound memory (`lastMessages: 10` or similar). Models and instructions are usually **dynamic** — `model: () => resolveRoleModel(role)` (role matrix + picker override) and `instructions: () => buildPrompt(runtimeInputs)`; keep them functions, don't flatten to statics.

Subagents → `agents` config (`agent-<key>` tools). Mastra workflows ≠ Fabro workflows (`.fabro/workflows/execute/`).

**Observability (into Mastra, not custom):** agent/workflow spans emit through the native `Observability` registry (`create-mastra`) + `tracingOptions: { traceId, parentSpanId }` on `agent.generate/stream`. Wrap a named operation span with **`withMastraSpan`** (`@/shared/observability/mastra-tracing`) — a real `getOrCreateSpan` + `executeWithContext` span; pass its `spanId` as the generate `parentSpanId` to nest explicitly. The old `withSpan` no-op shim is gone; `shared/observability/observability.ts` keeps only the sanitizers.

**File-based prompts (hybrid, static agents only):** an agent whose base prompt is **static** puts it in `src/mastra/agents/<agent-id>/instructions.md` (Mastra convention — editable in Studio / by non-engineers) and loads it via `loadAgentInstructions(agentId)` (`@/shared/agent-kernel/mastra`); code appends the dynamic parts. `next.config` `outputFileTracingIncludes` ships the `.md` with the build. Used by the critics + Muse. Agents with **runtime-injected** prompts (chat adapter, author) stay code-based. See `MASTRA-AGENT-APPROACHES-EVAL.md`.

## Plan-first agents (AgentController)

Mastra supports forcing an agent to **plan before it builds** — natively, no custom scaffolding:

- **`AgentController`** (`@mastra/core/agent-controller`) owns sessions, modes, shared memory/storage. Each consumer creates a `Session` (`createSession({ resourceId, tags })`) and drives work through it.
- **Modes** carve operating profiles. Each mode may set a `tools` allowlist — only listed tools are visible/executable in that mode. A mode may declare a **plan→build target**: when the model calls `submit_plan` in plan mode and the plan is **approved**, the session flips to the target mode idempotently. Unapproved = stays in plan mode.
- **The forced-plan-first recipe:** `modes: [{ id: 'plan', default: true, tools: [read-only tools + submit_plan], target: 'build' }, { id: 'build', tools: [everything] }]`. Plan mode physically cannot mutate — the mutating tools are not exposed to the model at all.
- **Per-tool/category permissions** (`session.permissions.setForCategory`) layer on top: a category `deny` wins even inside build mode.
- **Storyteller policy (decided 2026-07-09): mutations only.** Reads are never gated; the plan/build split is exactly the read-only vs mutating tool boundary. See `PLAN-V2.md` Phase 4.

When to use **workflow suspend/resume instead**: approvals that must survive restarts and arrive out-of-band (e.g. the beat-draft editorial verdict) belong in a Mastra **workflow** `suspendSchema`/`resumeSchema` step — durable snapshot in Postgres, resumable from any surface. Controller modes gate *what the agent may do next*; workflow suspend gates *a specific decision inside a run*. They compose.

Docs: `mastra.ai/docs/agent-controller/{overview,session,modes,tool-approvals}.md`, `mastra.ai/docs/workflows/{suspend-and-resume,human-in-the-loop}.md`. The pinned local types are authoritative: `node_modules/@mastra/core/dist/agent-controller/types.d.ts`.

## Long-running & autonomous (durable + goals)

For a loop that keeps working toward an objective (not one request/response):

- **Goals** — `Agent` config `goal: { judge: () => resolveRoleModel('critic'), maxRuns, prompt }` + `agent.setObjective(objective, { threadId, resourceId })`. A standing thread-scoped objective is judged after each iteration by the judge model until satisfied or the budget is spent. Needs storage + a memory-backed thread (both already registered). Emits `goal` stream chunks (`GoalEvaluationPayload`).
- **Durable agents** — `createDurableAgent({ agent })` (`@mastra/core/agent/durable`) runs the loop inside a workflow with reconnect (`observe(runId)`). In-process cache for dev; `RedisServerCache` for multi-process. Its `fullStream` is the same chunk format as `agent.stream()`.
- **Storyteller reference:** `ai/agents/AutonomousAuthor` + `startAutonomousEpisodeDraft` (`core/io/mastra-runtime`), flagged `FF_STORYTELLER_AUTONOMOUS=true`, mapped to the frozen SSE frames.
- **One gate, one owner** (three long-running mechanisms coexist): *editorial verdict = workflow suspend · capability/plan-first = AgentController · loop termination = goal*. Never stack two on the same gate. See `MASTRA-AGENT-APPROACHES-EVAL.md` §8.

Docs: `mastra.ai/docs/long-running-agents/{durable-agents,goals}.md`.

## Don't

- Second Postgres store or Mastra instance.
- `RuntimeContext`, root `@mastra/core` imports, old single-arg `execute`.
- Hardcoded secrets or model strings.
- Remove tracing or shrink memory windows without reason.
- **Type assertions** (`as any`, `as Type`) — use guards, Zod, or `recordFromJson`; `as const` only.
- **Cross-domain imports** (`src/domains/foo` importing `@/domains/bar`) — lift to `@/shared`.
- **Local `deepMerge`** — use `@/shared/data/deep-merge`.
- **Magic string values** as bare literals — use an `enum`, a `SCREAMING` const, or a `constants/` module. Use `enum` for plain literals; but an enum member referencing another enum/const or duplicating a value is illegal → `const X = { … } as const` (+ `type X = (typeof X)[keyof typeof X]`).
- **Non-null `!`** (`no-non-null-assertion`) — guard/`?.`/`?? fallback` instead.
- **Repeated `.filter()`** on the same array in one scope (`local/no-repeated-array-filter`) — one pass.
- **Manual URL construction** (`?foo=${x}`, `encodeURIComponent`, local `buildUrl`) — use `@/shared/data/url-builder` (`buildUrl`, `joinUrlPath`, `appendQueryParams`, `cloneSearchParams`).
- **IMPORTANT — never disable rules on your own if not allowed.** No file-level `eslint-disable`, no new/widened `eslint.config.js` `'off'` overrides, no `@ts-nocheck` to pass gates — ask in chat first. See `.cursor/rules/no-gate-bypass.mdc`.
- **New/changed `src/app/api/**/route.ts`** — register Zod + path in `domains/*/core/io/openapi-routes.ts` (or `src/shared/openapi/`), then `npm run openapi:generate`. SSE/admin/workspace-only → omit prefix in `scripts/openapi/route-coverage-omit.ts`. Gate: `npm run openapi:check`.

## Verify

**During work:** `npm run qualitygate:file -- <path>` · `npm run qualitygate:changed` · `npm run qualitygate:tsc -- --files <path>` — not full-repo `tsc` mid-task. **Many failures:** `npm run qualitygate:capture` → `.local/quality-backlog.md` (fix one, `qualitygate:backlog -- done <id>`, rescan every 5). After adding or changing `src/app/api/**/route.ts`, also `npm run openapi:generate` (coverage is part of `openapi:check` / `qualitygate:file` on those routes).

**Before handoff:** `npm run typecheck` · `npm run lint` · `npm run test:unit`

**IMPORTANT — never open the app in a browser.** No browser MCP tools, no `browser-use` subagent, no `curl` against `localhost:3000` to check behaviour, no logging in as the user. Verify through reusable committed tests: `npm run test:unit`, the live tier `npm run test:live` (`*.e2e.test.ts`, needs a **scratch** project id), or a **Playwright** spec. Browser testing has exactly one allowed form — a reusable spec in `e2e/scenarios/*.spec.ts` with actions in `e2e/fixtures/`, string constants as enums in `e2e/constants/`, `setupAuthenticatedPage` for login, and a throwaway project for data; running it stays operator-only. If something can't be checked that way, say it is unverified and name the test that would cover it. Highest-priority rule: `.cursor/rules/no-agent-browser.mdc`.

**When the user asks to commit:** `npm run precommit` first (includes **`test:unit`** + **`build`**), then commit without `--no-verify`. The message carries no `Co-Authored-By` trailer and no "generated with" footer naming a model, agent, or IDE. See `.cursor/rules/commit-gates.mdc`.

**Mastra paths touched** (`src/mastra/**`, `src/mastra.ts`, `src/shared/agent-kernel/mastra/**`, `MastraInstance.ts`, …): also `npm run mastra:smoke` (Cursor stop hook runs this automatically when those files were edited).

## Multi-request sessions (`.local/sessions/`)

When a user asks for **multiple deliverables** (or work spans subsystems / turns), create:

```
.local/sessions/YYYY-MM-DD_<shortId>_<slug>/
  REQUESTS.md  TODOS.md  PLAN.md  MEMORY.md  STATUS.md
```

Copy from `.agents/templates/session/`. Binding rule: `.cursor/rules/session-tracking.mdc`. Shared partial for Fabro/Claude/Cursor execute: `.agents/execute/partials/session-tracking.md`. `.local/` stays gitignored.

The same applies to **any** agent-authored markdown — plans, audits, trackers, findings all land in `.local/`, never at repo root or beside the code they describe (`.cursor/rules/agent-artifacts.mdc`, enforced by `scripts/check-agent-artifacts.mjs` + a `preToolUse` deny hook). When something *is* durable, extend the `docs/` page that already owns the topic instead of adding a file. Comments and docs state the current contract, never the edit that produced it; config files get one trailing clause per line, not tutorials (`.cursor/rules/writing-style.mdc`).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- TRIGGER.DEV SKILLS START -->
## Trigger.dev agent skills

This project has Trigger.dev agent skills installed in `.agents/skills/`. Before writing or changing Trigger.dev code (background tasks, scheduled tasks, realtime, or chat.agent AI agents), load the most relevant skill: `trigger-authoring-chat-agent`, `trigger-authoring-tasks`, `trigger-chat-agent-advanced`, `trigger-cost-savings`, `trigger-getting-started`.
<!-- TRIGGER.DEV SKILLS END -->
