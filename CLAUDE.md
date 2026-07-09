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

**TypeScript is strict**: implicit `any` is a compile error; `@typescript-eslint/no-explicit-any` is `error`; **`as` type assertions are banned** (`assertionStyle: 'never'`, `as const` only). Legacy `@ts-nocheck` files exist; don't add new ones. **Domains must not import each other** — shared code in `@/shared`. Magic-string protocol values → **`enum`**, not const object maps. See `.cursor/rules/eslint-boundaries.mdc`.

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

**During agent work** — fast, scoped only (never full-repo `tsc --noEmit` mid-task; it OOMs):

```bash
npm run qualitygate:file -- src/path/to/file.ts   # TSC + ESLint + metrics (~5s)
npm run qualitygate:changed                          # every 5 completed todos
npm run qualitygate:capture                       # scan once → .local/quality-backlog.md
npm run qualitygate:backlog                       # next fix without rescanning
npm run qualitygate:tsc -- --files src/path/to/file.ts
npm run qualitygate:tsc -- --changed
```

**Many gate failures:** fix one item at a time from `.local/quality-backlog.md`; rescan every **5** fixes — `.agents/execute/partials/quality-backlog.md`.

**End of task** (before “done”):

```bash
npm run typecheck          # full tsc + qualitygate:metrics
npm run lint
npm run test:unit
```

**Never bypass gates:** no file-level `eslint-disable` for lint/metrics rules, no `@ts-nocheck`, no “legacy extraction” excuses — **user approval required** for any exception. See `.cursor/rules/quality-gates.mdc`.

**Code metrics (ESLint + typecheck, same thresholds):** file lines warn **400** / error **800**; cyclomatic complexity warn **15** / error **25** (`scripts/code-metrics-limits.cjs`). Touched files must be clean before handoff; split oversized files one extract per step, gating each with `qualitygate:file`. See `.cursor/rules/code-metrics.mdc`.

**Refactor discipline (binding):** never rewrite `src/**` with bulk codegen (`node -e`, `python`/`node` heredocs, ad-hoc transform scripts) — edit incrementally, one extract/file at a time. Route pages stay thin shells; feature logic lives in `src/domains/<module>/`, never under `app/`. See `.cursor/rules/refactor-discipline.mdc`.

**Boundaries:** cross-domain imports are lint errors — code shared by 2+ domains moves to `@/shared` (chat is being platformized to `@/shared/chat`); `shared/` never imports `@/domains/*` or `@/app/*`. See `.cursor/rules/eslint-boundaries.mdc`.

Module-scoped verify: `node scripts/fabro-verify.mjs`. Details: `.cursor/skills/typecheck-scoped/SKILL.md`.

## Local-only tooling

Ad-hoc audits and one-off scripts: **`.local/`** (gitignored). Quality backlog: `.local/quality-backlog.md` via `npm run qualitygate:capture`. Do not add repo plumbing under `src/lib` for throwaway tooling.

## Env

Copy `.env.local.example` → `.env.local`. Evaluation judges: `OPENAI_API_KEY` or `JUDGING_MODEL` (see `evals/run.ts`). Internal docs: `INTERNAL_DOCS_SECRET`.
