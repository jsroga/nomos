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
- Do not put JSON response templates in prompts. Shape lives on `structuredOutput.schema` or scorer `outputSchema`. OpenRouter judges use `createJudgingConfig` (`jsonPromptInjection: true`) because chat completions cannot host Mastra's Responses-API tool schema. Agents that also have tools use `jsonPromptInjection: 'auto'`.
- Model strings are `provider/model` (`'moonshotai/kimi-k3'`, `'openai/gpt-5.6-sol'`). Text generation runs on three models only — Kimi, Sol, GLM; the cheap tier is GLM (`TEXT_GEN_FAST_MODEL`). Wiring: [docs/MODEL_MAP.md](docs/MODEL_MAP.md). Operator pins: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) § Model routing.
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
| Editor | `@mastra/editor` on `createMastra` (`source: 'code'`). Studio Save writes committed JSON under `src/mastra/editor/`. See **Mastra Editor** below. |

## Mastra Editor

Studio (`npm run mastra:dev`, `:4111`) Save writes Editor overlays as JSON under `src/mastra/editor/` (`source: 'code'`). You git-commit those files. Production and `npm run eval` read the same overlay JSON. `instructions.md` is fallback when an overlay id is missing.

- **Storage:** `MastraEditor({ source: 'code', codePath })` in [`create-mastra.ts`](src/shared/agent-kernel/mastra/create-mastra.ts). Postgres stays for memory / traces. Do not pass `sourceControlProvider` (no auto-PR).
- **Live agents:** `getPublishedAgent(id)` / `getPublishedAgentOr(id, fallback)` in [`get-published-agent.ts`](src/shared/agent-kernel/mastra/get-published-agent.ts) wrap `getAgentById(id, { status: 'published' })`. Empty tool membership in JSON falls back to the code catalog. Overlay JSON without an `instructions` field also falls back to the code agent — published generate/stream throws when `editor: { instructions: true }` and the stored brief is empty. Instruction overlays also apply via `loadPublishedOrFileBrief` / `getPrompt`. `/api/assistant` passes `handleChatAgentVersion(agentId)` into `handleChatStream` (`published` only when overlay JSON has instructions; otherwise `draft`). Writers Room SSE, AgentController, workflows, game-design, and loop-creator generate/stream go through the helper.
- **Code owns identity.** `id`, `name`, `model` / `resolveRoleModel`, RequestContext, and mutating tool **implementations** stay in TypeScript. Studio may change **instructions**, tool **descriptions**, and (writers only) tool **membership**.
- **World bible stays off Editor text.** Workspace packing is the turn `system` message (assistant route + chat adapter), not published instruction overlays.
- **Registry keys match `agent.id`** (`storyteller`, `grrm-author`, `game-design-agent`, `loop-creator-supervisor`, …) so Studio does not list duplicates. Muse, muse-ranker, and beat-cast-extract stay direct `generate()` agents — do not register extra instance copies for Studio completeness.
- **Instance tools:** domains pass production tools through `registerMastraModule({ tools })`. Editor’s picker lists those ids. Hour-bot tools stay agent-local. Do not import `@mastra/editor/composio` or `@mastra/editor/arcade`.
- **Prompt blocks:** overlay ids are `brief-<agentId>` and `registry-<promptName>`. Import missing files once with `npm run studio:import-prompts`. Boot does not overwrite JSON from `instructions.md`.
- **Evals** (`npm run eval` / `eval:gate`) hash `src/mastra/editor` plus code prompts. HTTP chat keeps `CHAT_HTTP_SCORERS = {}`.
- **Studio hour-loop (Phase 7):** start in Studio chat — [`.spec/opus/architecture-review/phases.md`](.spec/opus/architecture-review/phases.md) §7.1. Register `quality-improver` on the Studio CLI instance only. Bot may dirty Editor JSON; you commit. Live vs golden datasets: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) § Observability (Experiments table).
- **Studio stays local.** Do not expose Editor REST (`/api/stored/*`) on the Next app. Out of scope: Agent Builder (`@mastra/editor/ee`), a second Editor on the MCP stdio process.

Permissions (`editor:` on every Agent) — defaults would let Studio attach extra mutating tools:

| Agents | `editor` |
|--------|----------|
| Chat adapter, GRRM author, beat planner, autonomous author, game-design, market-analyst | `{ instructions: true, tools: true }` (Studio owns membership; code `tools` are fallback) |
| Critics, loop-creator specialists, beat-cast-extract, muse / muse-ranker, quality-improver | `{ instructions: true }` |
| Provider probe, tests | `false` |

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
- **Direct provider LLM SDKs** (`openai`, `@anthropic-ai/*`, Google GenAI, Cohere, Mistral, spending `ai` / `@ai-sdk/*` outside the gateway). **Only OpenRouter** via `@/shared/ai/gateway`. See `.cursor/rules/openrouter-only.mdc`.
- Remove tracing or shrink memory windows without reason.
- **Type assertions** (`as any`, `as Type`) — use guards, Zod, or `recordFromJson`; `as const` only.
- **Cross-domain imports** (`src/domains/foo` importing `@/domains/bar`) — lift to `@/shared`.
- **Local `deepMerge`** — use `@/shared/data/deep-merge`.
- **Magic string values** as bare literals — use an `enum`, a `SCREAMING` const, or a `constants/` module. Use `enum` for plain literals; but an enum member referencing another enum/const or duplicating a value is illegal → `const X = { … } as const` (+ `type X = (typeof X)[keyof typeof X]`).
- **`constants/` is values only** (enums, tables, numeric limits). No `function`, arrow helper, or `FunctionExpression` in `src/**/constants/**`. Put logic in the same-layer `utils/` or a named module (`git mv` the file; do not leave function re-exports in `constants/`). Enforced by `local/no-functions-in-constants` (**error**).
- **Non-null `!`** (`no-non-null-assertion`) — guard/`?.`/`?? fallback` instead.
- **Repeated `.filter()`** on the same array in one scope (`local/no-repeated-array-filter`) — one pass.
- **Manual URL construction** (`?foo=${x}`, `encodeURIComponent`, local `buildUrl`) — use `@/shared/data/url-builder` (`buildUrl`, `joinUrlPath`, `appendQueryParams`, `cloneSearchParams`).
- **IMPORTANT — never disable rules on your own if not allowed.** No file-level `eslint-disable`, no new/widened `eslint.config.js` `'off'` overrides, no `@ts-nocheck` to pass gates — ask in chat first. See `.cursor/rules/no-gate-bypass.mdc`.
- **New/changed `src/app/api/**/route.ts`** — register Zod + path in `domains/*/core/io/openapi-routes.ts` (or `src/shared/openapi/`), then `npm run openapi:generate`. SSE/admin/workspace-only → omit prefix in `scripts/openapi/route-coverage-omit.ts`. Gate: `npm run openapi:check`.

## Verify

**During work:** `npm run qualitygate:file -- <path>` · `npm run qualitygate:changed` · `npm run qualitygate:tsc -- --files <path>` — not full-repo `tsc` mid-task. **Many failures:** `npm run qualitygate:capture` → `.local/quality-backlog.md` (fix one, `qualitygate:backlog -- done <id>`, rescan every 5). After adding or changing `src/app/api/**/route.ts`, also `npm run openapi:generate` (coverage is part of `openapi:check` / `qualitygate:file` on those routes).

**Before handoff:** `npm run typecheck` · `npm run lint` · `npm run test:unit`

**IMPORTANT — never open the app in a browser for ad-hoc clicks.** No browser MCP tools, no `browser-use` subagent, no `curl` against `localhost:3000` to check behaviour, no logging in as the user. Verify through reusable committed tests: `npm run test:unit`, the live tier `npm run test:live` (`*.e2e.test.ts`, needs a **scratch** project id), or a **Playwright** / smoke e2e. After a plan completes (or when asked if e2e is done and it was not run), **run** `npm run test:e2e smoke` with `.env.local` loaded — do not ask. Smoke POSTs `modelName: zai-coding-plan:glm-5.2` (GLM via OpenRouter) to keep spend down; never Kimi, never GPT-5.6 Sol, never Opus. Live LLM scorers stay off HTTP chat / smoke — scoring is `npm run eval`. If OpenRouter returns **insufficient credits** (402, not in-flight budget), **STOP, tell the operator, and pause** — do not retry until they add credits. In-flight budget may wait Retry-After (120s) and retry once. Highest-priority UI rule: `.cursor/rules/no-agent-browser.mdc`. OpenRouter-only LLM rule: `.cursor/rules/openrouter-only.mdc`.

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
