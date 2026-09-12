# Documentation

> World Building Kit — **eight** topic files plus this index, flat under `docs/` (no subfolders).  
> Enforced by `src/__tests__/structure.test.ts` + `scripts/check-agent-artifacts.mjs`  
> (allowlist: `scripts/structure-gates/docs-allowlist.mjs`).

| Doc | Purpose |
|-----|---------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System topology + module blueprint |
| [MODULES.md](./MODULES.md) | Domain map |
| [STORYTELLER.md](./STORYTELLER.md) | Writers’ room, episode phases (Premise → Beats → Draft), AgentController |
| [DEVELOPMENT.md](./DEVELOPMENT.md) | Tests, evals, Storybook, observability, quality gates, perf debug |
| [DESIGN.md](./DESIGN.md) | Product UI contract (tokens, projects, chat, marketing SSR) |
| [MCP_API.md](./MCP_API.md) | MCP tools / auth for integrators |
| [DECISIONS.md](./DECISIONS.md) | Architecture decision log — what was decided, what was rejected, and why |
| [MODEL_MAP.md](./MODEL_MAP.md) | Agents, models, tools, scores, and per-step workflow I/O + tokens |
| [README.md](./README.md) | This index |

## Also at repo root

| File | Purpose |
|------|---------|
| [AGENTS.md](../AGENTS.md) | Mastra v1 agent development |
| [CLAUDE.md](../CLAUDE.md) | Daily commands, Trigger, env |

## Local agent scratch (gitignored)

`.local/sessions/` · `.local/quality-backlog.md` · `.local/tmp/` — see ARCHITECTURE § Agent local workspace.
