# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Quick reference for running and changing this repo. **Mastra agents, tools, and memory:** see [AGENTS.md](AGENTS.md). **Architecture & modules:** see [docs/README.md](docs/README.md).

Markdown docs live in **`docs/`** (repo root). The site serves them at `/docs` via `src/app/documentation/` (Next.js UI only — not a second content folder).

---

## Daily

```bash
npm run dev          # Next.js (webpack) — http://localhost:3000
npm run dev:stack    # Next turbopack (:3000) + Mastra Studio (:4111) + Trigger.dev
npm run build
npm run lint
npm run typecheck
npm run test:unit
npm run test:coverage        # Vitest v8 HTML/LCOV → coverage/
npm run test:e2e         # Playwright (default)
npm run test:e2e smoke   # storyteller smoke; also: actions, full-loop, swiss-knife
```

Single unit test (Vitest; `@/` → `src/`):

```bash
npx vitest run src/domains/storyteller/ai/tools/__tests__/storytelling.test.ts
npx vitest run src/domains/loop-creator            # whole directory
```

`*.e2e.test.ts` files are excluded from `test:unit` (need DB/LLM) — run them explicitly with `npx vitest run <path>` when keys are available. E2E scenarios need a running app + `.env.local`.

## Architecture

**Stack:** Next.js 16 (App Router, RSC) · Supabase (Postgres + pgvector + auth/RLS) · Mastra v1 (agents/tools/workflows) · Trigger.dev v4 (background jobs) · Three.js. Long-running work (image/3D generation) goes Frontend → API → Trigger.dev task → poll/subscribe.

`src/` topology:

| Folder | Role |
|--------|------|
| `app/` | Next.js routes, API glue, `_shell/` chrome |
| `domains/` | Feature modules — vertical slices (storyteller, loop-creator, 2d-canvas, 3d-canvas, …) |
| `shared/` | Cross-module (`admin`, `agent-kernel`, `auth`, `canvas`, `chat`, `data`, `debug`, `errors`, `jobs`, `observability` + legacy) — gate: `scripts/structure-gates/src-topology.ts` |
| `components/` | Radix/CVA design system, flat PascalCase folder per primitive |
| `db/` | Drizzle schema + client |
| `trigger/` | Trigger.dev task registry |
| `mcp/` | MCP server (separate deployable) |

Each `src/domains/<module>/` follows the blueprint in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): `ui/`, `state/`, `core/` (with `core/io/`), `services/`, `ai/`, `tasks/` + a **single public `index.ts` barrel**. Dependency rule: `ui → state → core → services → ai`; no cross-module deep imports, pure `core/` (outside `core/io/`) has no React/DB/fetch, server data lives in TanStack Query not Zustand. Enforced by `src/domains/__tests__/domain-structure.test.ts` and ESLint barrel guards. Asset modules (`2d-canvas`, `3d-canvas`, `3d-asset-exporter`) lean on `tasks/`, not `ai/`.

**Server configuration is read in one place.** `src/shared/config/env.ts` parses `process.env` once at import with a Zod schema, so a missing variable fails at boot naming itself rather than surfacing later as `undefined`. Import `env` from it; never read `process.env.X` in `src/**`. Exempt: `NEXT_PUBLIC_*` (Next only inlines literal member expressions — use `env.client.ts`), runtime values (`NODE_ENV`, `NEXT_RUNTIME`, `VITEST`, `PORT`), assignments, and lookups by a variable key. Enforced by `local/no-bare-process-env` and `npm run env:check`, which fails when a schema key is undocumented in `.env.local.example`.

**World-bible sections have one declaration.** `src/domains/storyteller/core/bible/section-registry.ts` is the single place a section is defined — ownership, merge strategy, whether it hydrates, its label and aliases. `BIBLE_OWNED_PLAN_FIELDS` and `HYDRATION_PLAN_FIELDS` are derived from it; never edit them by hand. Adding a `BibleSection` member without a registry entry is a **compile error**, and the eight world-level scalars that are not sections (`genre`, `tone`, `sequences`, …) live in `WORLD_SCALAR_FIELDS` beside it. Enforced by `npm run test:unit` — `core/bible/__tests__/section-registry.test.ts`.

Two Mastra entries: `src/mastra.ts` is the Studio CLI entry (bundler-safe tool stubs in `src/shared/agent-kernel/mastra/tools/`); `src/shared/agent-kernel/MastraInstance.ts` is the production instance (Postgres memory, tracing). Production Mastra agents live in `src/domains/*/ai/agents/`. Never create a second Mastra instance or Postgres store.

**TypeScript is strict**: implicit `any` is a compile error; `@typescript-eslint/no-explicit-any` is `error`; **`as` type assertions are banned** (`assertionStyle: 'never'`, `as const` only); non-null `!` is banned (`no-non-null-assertion` — guard instead). Legacy `@ts-nocheck` files exist; don't add new ones. **Domains must not import each other**, and `shared/` must not import `@/domains/*` — lift shared code to `@/shared` (a re-export "seam" still trips `no-restricted-imports`). Magic-string values → an `enum` **or** a `SCREAMING` const / `constants/` module (`local/no-magic-string`); but an enum member that references another enum/const or duplicates a value is illegal → use `const X = { … } as const`. Also live: `local/no-repeated-array-filter` (partition in one pass). Full patterns: `.agents/execute/implement.md` § Code rules. See `.cursor/rules/eslint-boundaries.mdc`.

## Mastra

```bash
npm run mastra:dev       # Studio — http://localhost:4111 (needs .env.local)
npm run mastra:build
```

## Observability

Mastra AI tracing (agent/tool/workflow spans + forwarded logs) is configured in `src/shared/agent-kernel/mastra/observability-config.ts` and lands in the Mastra store → Studio Traces. Sentry/`@vercel/otel` cover HTTP traces separately (`src/instrumentation.ts`). Wrap named operations with `withMastraSpan()` from `@/shared/observability/mastra-tracing`. Env knobs (`MASTRA_TRACE_*`, `MASTRA_PLATFORM_ACCESS_TOKEN`) and gaps: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) § Observability.

## Evaluations

```bash
npm run eval              # all 12 golden examples (Mastra scorers)
npm run eval -- --samples=5
npm run eval:dashboard    # generate + open HTML report
```

Run evals after any change to agent prompts, tools, model config, or the storyteller generation flow. A change is an improvement only if no single scorer regresses below baseline (`evals/results/latest.json`). Scorers: `src/shared/agent-kernel/scorers/`; golden set: `evals/datasets/storyteller-golden.ts`. Details: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

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

**During agent work** — use scoped `qualitygate:file` for the fast loop. `npm run typecheck` now runs with an 8 GB heap and excludes `ds-bundle` (fixed 2026-07-14) so it no longer OOMs (~20s warm) — run it after changing any `shared/**` or `core/types` type to catch cross-file cascades that `qualitygate:file` (single-file scoped) misses:

```bash
npm run qualitygate:file -- src/path/to/file.ts   # TSC + ESLint + metrics (~5s); OpenAPI coverage on API routes
npm run qualitygate:changed                          # every 5 completed todos
npm run qualitygate:capture                       # scan once → .local/quality-backlog.md
npm run qualitygate:backlog                       # next fix without rescanning
npm run qualitygate:tsc -- --files src/path/to/file.ts
npm run qualitygate:tsc -- --changed
npm run openapi:generate                          # after new/changed src/app/api/**/route.ts
npm run openapi:check                             # spec drift + every route.ts is in public/openapi.json or omitted
```

**New/changed `src/app/api/**/route.ts`:** register Zod + path in `domains/*/core/io/openapi-routes.ts` (or `src/shared/openapi/`), then `npm run openapi:generate`. SSE/admin/workspace-only → omit prefix in `scripts/openapi/route-coverage-omit.ts`. `qualitygate:file` on those routes and `openapi:check` fail if the path is missing from `public/openapi.json`.

**Many gate failures:** fix one item at a time from `.local/quality-backlog.md`; rescan every **5** fixes — `.agents/execute/partials/quality-backlog.md`.

**End of task** (before “done”):

```bash
npm run typecheck          # full tsc + qualitygate:metrics
npm run lint               # eslint . — 8 GB heap (was OOMing without it); src is error-clean
npm run test:unit
```

**When the user asks to commit:** run `npm run precommit` first (architecture, docs, staged typecheck/eslint, **unit tests**, **production build**). Fix failures, then `git commit` — never `--no-verify`. Husky `.husky/pre-commit` re-runs the same script. Cursor blocks `--no-verify` via `.cursor/hooks/guard-commit.sh`. **No AI attribution in the message** — no `Co-Authored-By: Claude/Cursor`, no "generated with" footer. Rule: `.cursor/rules/commit-gates.mdc`.

**IMPORTANT — never disable rules on your own if not allowed.** No file-level `eslint-disable`, no new/widened `eslint.config.js` `'off'` overrides, no `@ts-nocheck`, no “legacy extraction” excuses — **ask the user first**. See `.cursor/rules/no-gate-bypass.mdc` and `quality-gates.mdc`.

**Code metrics (ESLint + typecheck, same thresholds):** file lines warn **400** / error **800**; cyclomatic complexity warn **15** / error **25** (`scripts/code-metrics-limits.cjs`). Touched files must be clean before handoff; split oversized files one extract per step, gating each with `qualitygate:file`. See `.cursor/rules/code-metrics.mdc`.

**IMPORTANT — never open the app in a browser (highest priority).** No browser MCP tools, no `browser-use` subagent, no `curl` against `localhost:3000` to check behaviour, no logging in as the user. Verify through reusable committed tests only: `npm run test:unit`, `npm run test:live` (the `*.e2e.test.ts` tier — needs a **scratch** project id, never a real project), or a **Playwright** spec. Browser testing has exactly one allowed shape, matching what is already in `e2e/`: spec in `e2e/scenarios/*.spec.ts`, page actions in `e2e/fixtures/`, selectors/prompts/timeouts as enums in `e2e/constants/`, login via `setupAuthenticatedPage`, throwaway project via `createStoryProject`, no hard-coded UUIDs. Writing the spec is yours; **running** `npm run test:e2e` stays operator-only. A check worth doing is worth keeping as a test; when something can't be verified that way, report it as unverified and name the test that would cover it. See `.cursor/rules/no-agent-browser.mdc`.

**Refactor discipline (binding):** never rewrite `src/**` with bulk codegen (`node -e`, `python`/`node` heredocs, ad-hoc transform scripts) — edit incrementally, one extract/file at a time. Route pages stay thin shells; feature logic lives in `src/domains/<module>/`, never under `app/`. See `.cursor/rules/refactor-discipline.mdc`.

**Boundaries:** cross-domain imports are lint errors — code shared by 2+ domains moves to `@/shared` (chat is being platformized to `@/shared/chat`); `shared/` never imports `@/domains/*` or `@/app/*`. See `.cursor/rules/eslint-boundaries.mdc`.

Module-scoped verify: `node scripts/fabro-verify.mjs`. Details: `.cursor/skills/typecheck-scoped/SKILL.md`.

## Local-only tooling

Ad-hoc audits and one-off scripts: **`.local/`** (gitignored). Quality backlog: `.local/quality-backlog.md` via `npm run qualitygate:capture`. Do not add repo plumbing under `src/lib` for throwaway tooling.

**Every agent-authored `.md` goes in `.local/`** — plans, audits, trackers, findings, status writeups. Repo root takes `README.md`, `AGENTS.md`, `CLAUDE.md` and nothing else; durable human-facing docs go in `docs/` with a `docs/README.md` entry. Enforced by `scripts/check-agent-artifacts.mjs` (pre-commit) and a `preToolUse` deny hook. Rule: `.cursor/rules/agent-artifacts.mdc`.

**Comments state the contract, not the edit.** No date stamps, audit trails, `// NEW:`, provenance notes, or restating the next line. Config files (`.env*.example`, `*.config.*`) get one trailing clause per line — tutorials and option matrices belong in `docs/`. See `.cursor/rules/writing-style.mdc`.

**Extend `docs/`, don't grow it.** Find the doc that already owns the topic (`docs/README.md` is the index) and add a section. A new `docs/` file is the last resort and must be registered in `docs/README.md`.

**Multi-request sessions (mandatory when applicable):** `.local/sessions/YYYY-MM-DD_<shortId>_<slug>/` with `REQUESTS.md` / `TODOS.md` / `PLAN.md` / `MEMORY.md` / `STATUS.md` — templates in `.agents/templates/session/`; rule `.cursor/rules/session-tracking.mdc`; Fabro include `.agents/execute/partials/session-tracking.md`.

**Mastra smoke before handover** (when Mastra files changed): `npm run mastra:smoke` — also wired into Cursor stop hooks via `.cursor/hooks/mastra-smoke-on-stop.sh`.

## Env

Copy `.env.local.example` → `.env.local`. Text LLMs use `OPENROUTER_API_KEY` only; judges: `JUDGING_MODEL` (see `evals/run.ts`). Feature flags are `FF_<NAME>=true` (`src/shared/data/constants/feature-flags.ts`); default-on kill switches keep their own names and `!== 'false'` semantics.

<!-- TRIGGER.DEV SKILLS START -->
## Trigger.dev agent skills

This project has Trigger.dev agent skills installed in `.claude/skills/`. Before writing or changing Trigger.dev code (background tasks, scheduled tasks, realtime, or chat.agent AI agents), load the most relevant skill: `trigger-authoring-chat-agent`, `trigger-cost-savings`, `trigger-authoring-tasks`.
<!-- TRIGGER.DEV SKILLS END -->
