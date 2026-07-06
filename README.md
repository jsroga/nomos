# World Building Kit

AI workspace for storytellers and game designers — characters, narratives, loops, 3D worlds, and agent tooling.

**Stack:** Next.js 15 · Supabase · Mastra · Trigger.dev · Three.js

## Modules

| Module | What it does |
|--------|----------------|
| Storyteller | Writers room — bible, episodes, beats, characters |
| Loop Creator | Game-loop design with multi-agent planning |
| Interior Designer | 3D terrain, tilemaps, world editing |
| Chat | Streaming agent chat with tool approvals |
| MCP | Model Context Protocol server for external tools |

## Quick start

```bash
npm install
cp .env.local.example .env.local   # fill in keys
npm run dev
```

```bash
npm run test:unit
npm run test:e2e full-loop
npm run mastra:dev
```

## Docs

| Topic | Location |
|-------|----------|
| Architecture (target) | [docs/unified/ARCHITECTURE.md](docs/unified/ARCHITECTURE.md) |
| Architecture (current) | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| MCP API | [docs/MCP_API.md](docs/MCP_API.md) |
| Evaluations | [docs/evaluation/README.md](docs/evaluation/README.md) |
| Agent / Mastra rules | [AGENTS.md](AGENTS.md) |
| Dev commands & repo ops | [CLAUDE.md](CLAUDE.md) |

Internal module notes live under `docs/internal/`.

## License

[Business Source License 1.1](LICENSE)
