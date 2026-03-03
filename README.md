# World Building Kit

> AI-powered creative platform for storytellers, game designers, and world builders.

[![CI](https://github.com/jsroga/world-building-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/jsroga/world-building-kit/actions/workflows/ci.yml)
[![License: BUSL-1.1](https://img.shields.io/badge/License-BUSL--1.1-blue.svg)](LICENSE)

---

## What is it?

World Building Kit is a multi-agent AI workspace that helps you design and manage rich fictional universes — characters, narratives, game mechanics, 3D environments, and more — through a suite of specialized AI tools.

**Tech Stack:** Next.js 15 · Supabase · LangGraph · Trigger.dev · Three.js

---

## Modules

| Module | Description |
|--------|-------------|
| **Storyteller** | Virtual Writers Room — characters, episodes, arcs, world bible |
| **Loop Creator** | Game loop design with multi-agent supervisor + specialists |
| **Interior Designer** | 3D world-building, terrain sculpting, tilemap editor |
| **Chat** | AI chat with tool use, action approvals, streaming |
| **MCP Server** | Model Context Protocol API for external integrations |

---

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start MCP server
npm run mcp:dev

# Run tests
npm run test:unit
```

Requires a `.env.local` — see `.env.example` for required variables.

---

## Documentation

- [System Architecture](docs/ARCHITECTURE.md)
- [Agent Core](docs/agent-core.md)
- [MCP API Reference](docs/MCP_API.md)
- [Evaluation Framework](docs/evaluation/README.md)
- **Modules:** [Storyteller](docs/modules/storyteller.md) · [Loop Creator](docs/modules/loop-creator.md) · [Interior Designer](docs/modules/interior-designer.md) · [Chat](docs/modules/chat.md)

---

## CI / CD

Every push to `main`, `dev`, and `preview/**` runs:

1. **Lint** — ESLint
2. **Unit Tests** — Vitest
3. **Dead Code** — Knip
4. **AI Security Review** — Claude (blocks deploy on HIGH severity findings)
5. **Deploy** — Vercel (production on `main`, preview on other branches)

---

## Development

See [CLAUDE.md](CLAUDE.md) for full development rules and conventions.

```bash
npm run build          # Production build
npm run lint           # ESLint
npm run test:unit      # Unit tests (Vitest)
npm run test:e2e       # E2E tests
npm run mcp:build      # Build MCP server
```

---

## License

[Business Source License 1.1](LICENSE) — source available, not open source.
See [LICENSE](LICENSE) for usage terms.
