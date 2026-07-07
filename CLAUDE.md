# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
npm run test:e2e smoke   # storyteller smoke; also: actions, full-loop, swiss-knife
```

Single unit test (Vitest; `@/` → `src/`):

```bash
npx vitest run src/domains/storyteller/agents/tools/__tests__/storytelling.test.ts
npx vitest run src/domains/loop-creator            # whole directory
```

`*.e2e.test.ts` files are excluded from `test:unit` (need DB/LLM) — run them explicitly with `npx vitest run <path>` when keys are available. E2E scenarios need a running app + `.env.local`.

## Architecture

**Stack:** Next.js 15 (App Router, RSC) · Supabase (Postgres + pgvector + auth/RLS) · Mastra v1 (agents/tools/workflows) · Trigger.dev v4 (background jobs) · Three.js. Long-running work (image/3D generation) goes Frontend → API → Trigger.dev task → poll/subscribe.

`src/` topology:

| Folder | Role |
|--------|------|
| `app/` | Next.js routes, API glue, `_shell/` chrome |
| `domains/` | Feature modules — vertical slices (storyteller, loop-creator, interior-designer, chat, …) |
| `shared/` | Cross-module code: `agent-kernel` (Mastra instance, scorers), `ai`, `data`, `auth`, `observability` |
| `components/` | Radix/CVA design system, flat PascalCase folder per primitive |
| `db/` | Drizzle schema + client |
| `trigger/` | Trigger.dev task registry |
| `mcp/` | MCP server (separate deployable) |

Each `src/domains/<module>/` follows the blueprint in [docs/unified/ARCHITECTURE.md](docs/unified/ARCHITECTURE.md): `ui/`, `state/`, `io/`, `core/`, `services/`, `agents/`, `tasks/`, `prompts/` + a **single public `index.ts` barrel**. Dependency rule: `ui → state → io → core → services → agents`; no cross-module deep imports, `core/` is pure (no React/DB/IO), server data lives in TanStack Query not Zustand. Enforced by `src/domains/__tests__/domain-structure.test.ts` and ESLint barrel guards. Asset modules (`interior-designer`, `world-building-toolkit`, `3d-asset-exporter`) lean on `tasks/`, not `agents/`.

Two Mastra entries: `src/mastra.ts` is the Studio CLI entry (bundler-safe tool stubs in `src/shared/agent-kernel/mastra/tools/`); `src/shared/agent-kernel/MastraInstance.ts` is the production instance (Postgres memory, tracing). Production agents live in `src/domains/*/agents/`. Never create a second Mastra instance or Postgres store.

**TypeScript is strict**: implicit `any` is a compile error and `@typescript-eslint/no-explicit-any` is an `error` (no `: any` / `as any`). Legacy `@ts-nocheck` files exist; don't add new ones.

## Mastra

```bash
npm run mastra:dev       # Studio — http://localhost:4111 (needs .env.local)
npm run mastra:build
```

## Evaluations

```bash
npm run eval              # all 12 golden examples (Mastra scorers)
npm run eval -- --samples=5
npm run eval:dashboard    # generate + open HTML report
```

Run evals after any change to agent prompts, tools, model config, or the storyteller generation flow. A change is an improvement only if no single scorer regresses below baseline (`evals/results/latest.json`). Scorers: `src/shared/agent-kernel/scorers/`; golden set: `evals/datasets/storyteller-golden.ts`. Details: [docs/TESTING.md](docs/TESTING.md).

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
# Interactive (Cursor Agent or Claude Code)
/execute <module>                         # e.g. /execute storyteller
/scope-runner                             # or invoke any stage subagent directly

# Sandboxed (Docker / Daytona)
fabro run .fabro/workflows/execute/workflow.toml -I module=<module>
fabro run .fabro/workflows/execute/workflow.toml -I module=<module> --environment execute-daytona --preserve-sandbox  # with preview

# Headless (Cursor SDK) — needs CURSOR_API_KEY
npx tsx src/shared/agent-kernel/cursor-runner.ts --module <module>
npx tsx src/shared/agent-kernel/cursor-runner.ts --module <module> --cloud --repo owner/repo --auto-create-pr
```

Shared prompts: **`.agents/execute/`** · skills: **`.agents/skills/`** (Cursor/Claude symlinks; Fabro via `.fabro/skills`). Thin adapters: `.cursor/agents/*.md`, `.claude/agents/*.md`. Fabro: `workflow.fabro` → `@../../../.agents/execute/<stage>.md`. See [.agents/README.md](.agents/README.md).

## Quality gates

Run before declaring work done; fix failures, don't bypass:

```bash
npm run typecheck
npm run lint
npm run test:unit
npx knip                 # dead code / unused exports
```

Module-scoped fast verify (dark-factory; reads module from `PLAN.md`, matches husky pre-commit): `node scripts/fabro-verify.mjs`.

## Local-only tooling

Ad-hoc audits and one-off scripts: **`.local/`** (gitignored). Do not add repo plumbing under `src/lib` for throwaway tooling.

## Env

Copy `.env.local.example` → `.env.local`. Evaluation judges: `OPENAI_API_KEY` or `JUDGING_MODEL` (see `evals/run.ts`). Internal docs: `INTERNAL_DOCS_SECRET`.
