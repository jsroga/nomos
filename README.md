# Nomos - Game Building Kit

AI workspace for storytellers and game designers — characters, narratives, loops, 3D worlds, and agent tooling.

**Stack:** Next.js 16 · Supabase · Mastra · Trigger.dev · Three.js

## Modules

`src/domains/<name>/` — public import is the module barrel only.

| Module | What it does |
|--------|----------------|
| Storyteller | Writers room — bible, episodes, beats, characters |
| Loop Creator | Game-loop design with multi-agent planning |
| Game Design | Pattern and design-lab agents |
| 2D Canvas | Infinite tile canvas — procedural maps, upscale, fidelity |
| 3D Canvas | R3F interiors, terrain, surfaces, props |
| 3D Asset Exporter | GLB ingest, Meshy/Hyper3D generation, remesh |
| Marketing | Landing and legal surfaces |

Streaming chat chrome is shared (`@/shared/chat`), not a domain. The MCP server
([docs/MCP_API.md](docs/MCP_API.md)) is a separate deployable under `src/mcp/`.

## Quick start

```bash
npm install
cp .env.local.example .env.local   # fill in keys — a missing one fails at boot, by name
npm run dev:stack                  # Next :3000 + Mastra Studio :4111 + Trigger.dev
```

`dev:stack` is the one to use — background jobs and agent tooling need all three.
For the app alone: `npm run dev` (webpack) or `npm run dev:turbo` (turbopack).

```bash
npm run test:unit
npm run eval:gate                  # scorers vs the dated baseline; costs model spend
npm run test:e2e smoke             # shortcuts: smoke · api · all (operator-only)
```

## Configuration

One `OPENROUTER_API_KEY` routes every model; per-slot pins and the role→model table are in [docs/DEVELOPMENT.md § Model routing](docs/DEVELOPMENT.md). Server configuration is parsed once, at import, by [`src/shared/config/env.ts`](src/shared/config/env.ts) — a missing variable fails at boot naming itself rather than surfacing later as `undefined`, and `npm run env:check` fails when a schema key is undocumented. Feature flags are `FF_<NAME>=true` — opt-in, on only when the value is exactly `true` ([`src/shared/data/constants/feature-flags.ts`](src/shared/data/constants/feature-flags.ts)). Admin access comes from `NEXT_PUBLIC_CENTRAL_USERS` ([docs/ARCHITECTURE.md § Access control](docs/ARCHITECTURE.md)). Every variable is listed in [`.env.local.example`](.env.local.example).

## Docs

| Topic | Location |
|-------|----------|
| Docs index | [docs/README.md](docs/README.md) |
| Architecture | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Modules | [docs/MODULES.md](docs/MODULES.md) |
| Storyteller | [docs/STORYTELLER.md](docs/STORYTELLER.md) |
| Development / evals / obs | [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) |
| MCP API | [docs/MCP_API.md](docs/MCP_API.md) |
| Decisions (ADRs) | [docs/DECISIONS.md](docs/DECISIONS.md) |
| Agent / Mastra rules | [AGENTS.md](AGENTS.md) |
| Dev commands & repo ops | [CLAUDE.md](CLAUDE.md) |

## Agents & local workspace

The SDLC runs as a five-stage loop over one `src/domains/` module, with a human gate after clarify and again before any code is written. Start it with `/execute <module>` in Cursor; the same stages run sandboxed via `fabro run .fabro/workflows/execute/workflow.toml` or headless via `src/shared/agent-kernel/cursor-runner.ts`. Prompts live once in [`.agents/execute/`](.agents/execute/) — the per-runner agent files are thin pointers.

| Agent | Stage | Produces |
|-------|-------|----------|
| [`scope-runner`](.cursor/agents/scope-runner.md) | Inventory the module and name the decision axes | `.local/findings/scope.md` |
| [`clarify-facilitator`](.cursor/agents/clarify-facilitator.md) | Turn scope into module-specific A/B/C options | `CLARIFY.md`, `DECISIONS.md` |
| [`plan-author`](.cursor/agents/plan-author.md) | Turn the chosen option into a prioritized plan | `PLAN.md` (+ `STRUCTURE.md`) |
| [`developer`](.cursor/agents/developer.md) | Implement the approved first increment | Code — self-verified with `fabro-verify.mjs` |
| [`retro-author`](.cursor/agents/retro-author.md) | Report what actually landed, checked against the diff | `RETRO.md` |

Reusable skills sit in [`.agents/skills/`](.agents/skills/) and are symlinked into `.cursor/skills/` and `.claude/skills/`: workflow skills (`/execute`, `/commit`, `/review`, `/docs`, `/pr-description`), repo-specific ones (`supabase`, `mastra-workflow`, `shadcn`, `sse-wire-contract`, `typecheck-scoped`, `component-audit`, `accessibility-audit`, `core-web-vitals`), and the Trigger.dev set (`trigger-dev`, `trigger-getting-started`, `trigger-authoring-tasks`, `trigger-authoring-chat-agent`, `trigger-chat-agent-advanced`, `trigger-cost-savings`). Runner and configuration map: [`.agents/README.md`](.agents/README.md) and [`.agents/CONFIGURATION.md`](.agents/CONFIGURATION.md).

`.local/` is **gitignored** and holds everything an agent writes for itself — plans, audits, trackers, findings, quality backlogs, throwaway recon, and **multi-request session tracking**:

```
.local/sessions/YYYY-MM-DD_<shortId>_<slug>/
  REQUESTS.md  TODOS.md  PLAN.md  MEMORY.md  STATUS.md
```

Templates: [`.agents/templates/session/`](.agents/templates/session/). Rule: [`.cursor/rules/session-tracking.mdc`](.cursor/rules/session-tracking.mdc). Fabro/Cursor/Claude include: [`.agents/execute/partials/session-tracking.md`](.agents/execute/partials/session-tracking.md).

No agent markdown lands at the repo root or beside the code it describes — [`scripts/check-agent-artifacts.mjs`](scripts/check-agent-artifacts.mjs) blocks it at commit and a `preToolUse` hook blocks it at write time ([`.cursor/rules/agent-artifacts.mdc`](.cursor/rules/agent-artifacts.mdc)). Durable documentation extends an existing page in `docs/` via the `/docs` skill rather than adding files.

## Quality gates

Every change passes three layers. Nothing here is optional, and none of it may be silenced with `eslint-disable`, `@ts-nocheck`, or `git commit --no-verify` — a `beforeShellExecution` hook rejects the last one outright.

**While you work** — scoped checks that run in seconds instead of the full-repo `tsc`, which is slow and OOM-prone:

| Command | Scope |
|---------|-------|
| `npm run qualitygate:file -- <path>` | One file: TSC + ESLint + metrics (~3s) |
| `npm run qualitygate:changed` | All git-changed `src/**` — run every 5 completed todos |
| `npm run qualitygate:capture` | Same scan, cached as a fix list in `.local/quality-backlog.md` |
| `npm run qualitygate:tsc -- --files <path>` | Types only |
| `npm run openapi:check` · `npm run env:check` | Public API drift · undocumented env keys |
| `npm run spend -- --days 7` | What the model calls cost, by project and feature |

The gate enforces TypeScript (strict — no `any`, no `as` assertions, no non-null `!`), ESLint (domain boundaries, magic strings, deep-merge and URL-builder single implementations), and code metrics: **400 lines warn / 800 error** per file, **complexity 15 / 25** per function.

Several invariants are structural rather than advisory — the wrong thing does not
compile or does not lint. Every paid model call goes through `@/shared/ai/gateway`;
server config is read only from `@/shared/config/env`; tenant reads take a
`ProjectScope` rather than a `projectId: string`; background tasks are built by
`defineOwnedTask`; and a shape is parsed once in a module's `contracts/`. Each has
an ESLint rule, a fixture proving that rule is on, and a counter in
[`.quality-ratchet.json`](.quality-ratchet.json) that may only decrease. Rules and
commands: [docs/DEVELOPMENT.md § Quality gates](docs/DEVELOPMENT.md); the reasoning:
[docs/DECISIONS.md](docs/DECISIONS.md).

**At handover** — Cursor `stop` hooks gate the turn automatically. [`plan-critique-on-stop.sh`](.cursor/hooks/plan-critique-on-stop.sh) fires once when a plan file landed (`*.plan.md`, `PLAN.md`) and auto-submits a follow-up to expand todos and critique weak spots — it does not start implementation. [`fast-verify-on-stop.sh`](.cursor/hooks/fast-verify-on-stop.sh) re-runs the gate on the files touched that turn and hands failures back to the agent as a follow-up instead of ending the turn. [`mastra-smoke-on-stop.sh`](.cursor/hooks/mastra-smoke-on-stop.sh) fires only when Mastra paths changed (`src/mastra/**`, agent-kernel Mastra) and runs `npm run mastra:smoke` over the Studio index and file-based agent packages.

**Before committing** — `npm run precommit` ([`scripts/pre-commit.mjs`](scripts/pre-commit.mjs), re-run by Husky as a safety net) walks ten stages: architecture layout, agent artifacts, docs sync, eval freshness, OpenAPI drift, env example, staged typecheck, staged ESLint, `test:unit`, and a production build. End-of-task full sweep when you want it locally:

```bash
npm run typecheck   # tsc --noEmit + full-src metrics
npm run lint
npm run test:unit
```

E2E is **operator-only** — there is no CI, and agents do not run `npm run test:e2e`
or open the app in a browser. A check worth making is kept as a committed test.

## License

[Business Source License 1.1](LICENSE)
