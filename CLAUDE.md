# CLAUDE.md — dev commands & repo ops

Quick reference for running and changing this repo. **Mastra agents, tools, and memory:** see [AGENTS.md](AGENTS.md). **Architecture & modules:** see [docs/README.md](docs/README.md).

Markdown docs live in **`docs/`** (repo root). The site serves them at `/docs` via `src/app/documentation/` (Next.js UI only — not a second content folder).

---

## Daily

```bash
npm run dev              # Next.js (turbo) — http://localhost:4000
npm run build
npm run lint
npm run typecheck
npm run test:unit
npm run test:e2e         # Playwright (default)
npm run test:e2e smoke   # storyteller smoke script
```

## Mastra

```bash
npm run mastra:dev       # Studio — http://localhost:4111 (needs .env.local)
npm run mastra:build
```

## Evaluations

```bash
npm run eval              # all 12 golden examples (Mastra scorers)
npm run eval -- --samples=5
npm run eval:dashboard    # open dashboard (next dev)
```

Details: [docs/TESTING.md](docs/TESTING.md).

## MCP & Trigger

```bash
npm run mcp:build
npm run mcp:start
npm run trigger:dev
npm run trigger:deploy   # prod; sets OTEL_TRACES_EXPORTER=none
```

MCP reference: [docs/MCP_API.md](docs/MCP_API.md).

## Trigger.dev (v4)

- Use `@trigger.dev/sdk` — **never** `client.defineJob`.
- `triggerAndWait()` returns `{ ok, output, error }` — check `ok` before `output`.
- Prod **PENDING_VERSION**: deploy and promote — `npx trigger.dev@latest deploy --env prod`.
- OTEL deploy conflict: use `npm run trigger:deploy` or `OTEL_TRACES_EXPORTER=none`.

## Dark factory

The Fabro `execute` loop runs three ways — same stages, prompts, gates, and verify:

```bash
# Interactive (Cursor Agent)
/execute <module>                         # e.g. /execute storyteller

# Sandboxed (Docker / Daytona)
fabro run .fabro/workflows/execute/workflow.toml -I module=<module>
fabro run .fabro/workflows/execute/workflow.toml -I module=<module> --environment execute-daytona --preserve-sandbox  # with preview

# Headless (Cursor SDK) — needs CURSOR_API_KEY
npx tsx src/shared/agent-kernel/cursor-runner.ts --module <module>
npx tsx src/shared/agent-kernel/cursor-runner.ts --module <module> --cloud --repo owner/repo --auto-create-pr
```

Cursor config: `.cursor/rules/*.mdc` (scoped), `.cursor/agents/*.md` (9 stage subagents), `.cursor/skills/execute/SKILL.md` (`/execute`), `.cursor/hooks.json` (verify-on-edit + destructive-command guard), `.cursor/mcp.json` (trigger + fabro + world-building-kit), `.cursor/automations/` (PR verify, nightly sweep — materialize via `/automate`). Trigger.dev task: `cursor-execute` (`src/trigger/cursor-execute.task.ts`). Stage prompts are the single source of truth in `.fabro/workflows/execute/prompts/`.

## Quality gates

```bash
npm run typecheck
npm run lint
npx knip
```

Fabro `execute` workflow verify stage: `node scripts/fabro-verify.mjs` (module-scoped typecheck/lint).

## Local-only tooling

Ad-hoc audits and one-off scripts: **`.local/`** (gitignored). Do not add repo plumbing under `src/lib` for throwaway tooling.

## Env

Copy `.env.local.example` → `.env.local`. Evaluation: `CONFIDENT_API_KEY` (cloud) or `OPENAI_API_KEY` (local judge). Internal docs: `INTERNAL_DOCS_SECRET`.
