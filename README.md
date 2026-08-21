# Nomos - Game Building Kit

AI workspace for storytellers and game designers — characters, narratives, loops, 3D worlds, and agent tooling.

**Stack:** Next.js 16 · Supabase · Mastra · Trigger.dev · Three.js

## Modules

| Module | What it does |
|--------|----------------|
| Storyteller | Writers room — bible, episodes, beats, characters |
| Loop Creator | Game-loop design with multi-agent planning |
| 2D Canvas | Infinite tile canvas — procedural maps, upscale, fidelity |
| 3D Canvas | R3F interiors, terrain, surfaces, props |
| Chat | Streaming agent chat with tool approvals |
| MCP | Model Context Protocol server for external tools |

## Quick start

```bash
npm install
cp .env.local.example .env.local   # fill in keys
npm run dev
```

## Configuration

One `OPENROUTER_API_KEY` routes every model; per-slot pins and the role→model table are in [docs/DEVELOPMENT.md § Model routing](docs/DEVELOPMENT.md). Feature flags are `FF_<NAME>=true` — opt-in, on only when the value is exactly `true` ([`src/shared/data/constants/feature-flags.ts`](src/shared/data/constants/feature-flags.ts)). Admin access comes from `NEXT_PUBLIC_CENTRAL_USERS` ([docs/ARCHITECTURE.md § Access control](docs/ARCHITECTURE.md)). Every variable is listed in [`.env.local.example`](.env.local.example).

## Docs

| Topic | Location |
|-------|----------|
| Docs index | [docs/README.md](docs/README.md) |
| Architecture | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Modules | [docs/MODULES.md](docs/MODULES.md) |
| Storyteller | [docs/STORYTELLER.md](docs/STORYTELLER.md) |
| Development / evals / obs | [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) |
| MCP API | [docs/MCP_API.md](docs/MCP_API.md) |
| Agent / Mastra rules | [AGENTS.md](AGENTS.md) |
| Dev commands & repo ops | [CLAUDE.md](CLAUDE.md) |

## Quality gates

Every change passes three layers. Nothing here is optional, and none of it may be silenced with `eslint-disable`, `@ts-nocheck`, or `git commit --no-verify` — a `beforeShellExecution` hook rejects the last one outright.

**While you work** — scoped checks that run in seconds instead of the full-repo `tsc`, which is slow and OOM-prone:

| Command | Scope |
|---------|-------|
| `npm run qualitygate:file -- <path>` | One file: TSC + ESLint + metrics (~3s) |
| `npm run qualitygate:changed` | All git-changed `src/**` — run every 5 completed todos |
| `npm run qualitygate:capture` | Same scan, cached as a fix list in `.local/quality-backlog.md` |
| `npm run qualitygate:tsc -- --files <path>` | Types only |

The gate enforces TypeScript (strict — no `any`, no `as` assertions, no non-null `!`), ESLint (domain boundaries, magic strings, deep-merge and URL-builder single implementations), and code metrics: **400 lines warn / 800 error** per file, **complexity 15 / 25** per function. Full command list and rules: [docs/DEVELOPMENT.md § Quality gates](docs/DEVELOPMENT.md).

**At handover** — Cursor `stop` hooks gate the turn automatically. [`plan-critique-on-stop.sh`](.cursor/hooks/plan-critique-on-stop.sh) fires once when a plan file landed (`*.plan.md`, `PLAN.md`) and auto-submits a follow-up to expand todos and critique weak spots — it does not start implementation. [`fast-verify-on-stop.sh`](.cursor/hooks/fast-verify-on-stop.sh) re-runs the gate on the files touched that turn and hands failures back to the agent as a follow-up instead of ending the turn. [`mastra-smoke-on-stop.sh`](.cursor/hooks/mastra-smoke-on-stop.sh) fires only when Mastra paths changed (`src/mastra/**`, agent-kernel Mastra) and runs `npm run mastra:smoke` over the Studio index and file-based agent packages.

**Before committing** — `npm run precommit` ([`scripts/pre-commit.mjs`](scripts/pre-commit.mjs), re-run by Husky as a safety net) walks architecture layout, agent artifacts, docs sync, staged typecheck, staged ESLint, `test:unit`, and a production build. End-of-task full sweep when you want it locally:

```bash
npm run typecheck   # tsc --noEmit + full-src metrics
npm run lint
npm run test:unit
```

E2E is operator/CI-only — agents don't run `npm run test:e2e`.

## License

[Business Source License 1.1](LICENSE)
