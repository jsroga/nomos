# Documentation Index

> World Building Kit — internal and public docs. **Last reviewed:** 2026-07-06.

## Start here

| Doc | Audience | Purpose |
|-----|----------|---------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Everyone | System context, containers, data flow, core patterns |
| [unified/ARCHITECTURE.md](./unified/ARCHITECTURE.md) | Contributors | Target module blueprint (vertical slices) |
| [unified/SPEC.md](./unified/SPEC.md) | Contributors | Migration plan toward the unified architecture |
| [TESTING.md](./TESTING.md) | Contributors | Unit, e2e, and eval test tiers |
| [orchestration-rfc.md](./orchestration-rfc.md) | Storyteller | Hexagonal orchestration core (draft) |
| [quality-improvement-spec.md](./quality-improvement-spec.md) | Maintainers | Quality gates and ratchet strategy |
| [MCP_API.md](./MCP_API.md) | Integrators | MCP tools, resources, auth |

## Module internals (`docs/internal/`)

| Module | Doc |
|--------|-----|
| Storyteller | [internal/storyteller.md](./internal/storyteller.md) |
| Loop Creator | [internal/loop-creator.md](./internal/loop-creator.md) |
| Agents (overview) | [internal/agents/index.md](./internal/agents/index.md) |
| Agent architecture | [internal/agents/architecture.md](./internal/agents/architecture.md) |
| Agent kernel | [internal/agents/agent-core.md](./internal/agents/agent-core.md) |
| E2E (Playwright) | [internal/testing/e2e.md](./internal/testing/e2e.md) |
| Evaluation | [evaluation/README.md](./evaluation/README.md) |

## In-app docs

Markdown lives in this `docs/` folder (single source of truth). The site serves it at `/docs` via Next.js routes under `src/app/documentation/` (rewritten from `/docs` URLs). Internal docs require `INTERNAL_DOCS_SECRET` (see `.env.local.example`).

## Agent development

See also repo root [AGENTS.md](../AGENTS.md) (Mastra v1) and [CLAUDE.md](../CLAUDE.md) (dev commands, Trigger.dev, eval).

## Mastra Studio

```bash
npm run mastra:dev   # http://localhost:4111 — requires .env.local with ANTHROPIC_API_KEY
```

Studio entry: `src/shared/agent-kernel/mastra/index.ts`. Production agents live under `src/domains/*/agents/`; Studio uses a bundler-safe tool catalog in `src/shared/agent-kernel/mastra/tools/`.
