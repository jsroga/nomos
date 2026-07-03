Goal: # src-root cleanup — ideal top-level `src/` layout + full reference update

## Mission

Design the **ideal top-level `src/` folder structure** per
`docs/unified/ARCHITECTURE.md` §3 (Repository topology), then **update every file
that references old paths** (imports, re-exports, tests, API routes, Next.js config,
Fabro verify scopes). Behavior-preserving; no new product features.

This is a **large, multi-sprint** effort — the plan may contain **40–80 todos**.
Do **not** under-scope the reference sweep: a move without updating all referrers
is a failed increment.

**Primary pain (operator):** `src/` has **~20+ top-level folders** outside the
target topology. Legacy homes (`agent-core`, `lib`, `infrastructure`, `hooks`,
`store`, `services`, `prompts`, `evaluation`, `mcp`, `workflows`, `types`,
`config`, `constants`, `content`, `pages`) duplicate or prefigure what must live
in `shared/`, `domains/<module>/`, `db/`, `trigger/`, `components/ui/`, or `app/`.
The operator wants Fabro to **propose** a concrete target tree, get human approval,
then **execute moves and fix every import**.

**Out of scope for this run's default posture:** reshaping `src/domains/*` internals
(that is `module=domains-catalog`). This run focuses on **top-level `src/`** only,
but must still **grep and fix referrers** in `domains/`, `app/`, and `tests/` when
paths change.

## Target topology (contract)

From `docs/unified/ARCHITECTURE.md` §3 — the **only** legal top-level `src/` layout
after migration:

```
src/
├─ domains/<module>/     # vertical slices (see domains-catalog for module internals)
├─ shared/               # cross-module: agent-kernel, jobs, data, auth, observability, errors
├─ components/ui/        # Radix + CVA design system primitives
├─ db/                   # Drizzle schema + client (single source of truth)
├─ trigger/              # thin re-export registry for Trigger.dev tasks
├─ app/                  # Next.js App Router — routes + API glue only
├─ middleware.ts         # Next.js middleware (if present — stays at src root)
└─ instrumentation*.ts   # Next.js instrumentation (if present — stays at src root)
```

**Rule:** anything imported by 2+ modules lives in `shared/`, never in a domain or
legacy top-level folder. `shared/` supersedes `lib/`, `agent-core/`, `infrastructure/`,
`store/`, and ad-hoc `services/` at `src/` root.

## Current inventory (operator snapshot — Scope re-validates)

| Top-level path | Role today | Target disposition |
|----------------|------------|-------------------|
| `agent-core/` | Mastra kernel, models, observability dupes | → `shared/agent-kernel/` (+ `shared/observability/`) |
| `lib/` | auth, utils, API helpers | → `shared/auth/`, `shared/data/`, delete dupes |
| `infrastructure/` | legacy wiring | → `shared/*` or delete |
| `hooks/` | cross-cutting React hooks | → `shared/` or owning `domains/*/state/` |
| `store/` | global Zustand | → `shared/` or module `state/` |
| `services/` | orphan server helpers | → `domains/*/services/` or `shared/` |
| `prompts/` | prompt builders | → `domains/*/prompts/` or `shared/agent-kernel/` |
| `evaluation/` | offline eval harness | → keep slim or `shared/agent-kernel/scorers/` |
| `mcp/` | MCP servers | → `src/mcp` ok if single entry; or `shared/` |
| `workflows/` | hand-rolled orchestration | → Mastra workflows in `domains/*/agents/` |
| `types/` | global TS types | → `shared/data/` or colocate |
| `config/`, `constants/`, `content/` | misc | → colocate or `shared/` |
| `pages/` | legacy Pages router? | → migrate to `app/` or delete |
| `components/` | UI | → `components/ui/` only at top level |
| `domains/` | product modules | **keep** — do not reshape internals this run |
| `db/`, `trigger/`, `app/`, `shared/` | already target-aligned | **keep** — extend, don't replace |

Scope stage prints live counts; Plan Author updates this table if reality differs.

## Required deliverable: ideal structure (before code moves)

**Plan Author MUST write `STRUCTURE.md`** at repo root (overwrite stale domain-catalog
copies). For **src-root** runs the file has a dedicated section:

### `STRUCTURE.md` — src-root section (mandatory)

1. **Current top-level tree** — `ls -1 src/` + one-line role per folder.
2. **Ideal target tree** (ASCII) — §3 topology above; note what stays at root
   (`middleware.ts`, `instrumentation.ts`).
3. **Disposition table** — every legacy top-level folder: `keep` | `merge → shared/X` |
   `move → domains/<m>/Y` | `delete` (with evidence: importers = 0).
4. **Move map** — `old_path → new_path` for every file that moves in the approved wave.
5. **Re-export shim plan** — which old paths get temporary `index.ts` re-exports
   (SPEC F-1 staged migration).
6. **Out of scope for this wave** — explicit list (usually: full `domains/` reshape,
   full `evaluation/` rewrite).

## Required deliverable: reference update (every referrer)

Implementation MUST update **all referrers**, not only files inside the moved folder:

| Referrer class | Examples | Action |
|----------------|----------|--------|
| `@/lib/*`, `@/agent-core/*` | app routes, domains, tests | Rewrite to `@/shared/*` |
| Deep imports | `@/hooks/useX`, `@/services/Foo` | Route through new public path |
| `tsconfig` paths | `paths` in `tsconfig.json` | Update aliases |
| Next config | `next.config.js` transpile/includes | Update if paths change |
| Tests | `tests/**`, `**/__tests__/**` | Fix mocks + imports |
| Docs | `AGENTS.md`, `docs/**` | Update cited paths |
| Knip / ESLint boundaries | boundary rules | Update globs |

**Plan Author** must include grep-driven todos:

```bash
grep -rn "from '@/lib" src/ tests/
grep -rn "from '@/agent-core" src/ tests/
grep -rn "from '@/hooks" src/ tests/
grep -rn "from '@/infrastructure" src/ tests/
grep -rn "from '@/store" src/ tests/
```

…one todo per batch with expected file counts.

## Plan shape (`PLAN.md`)

First lines must include: **`Fabro module: src-root`** (for `fabro-verify.mjs`).

1. **Executive summary**
2. **Pointer to `STRUCTURE.md`** — src-root section is the move contract
3. **Global prerequisites** — SPEC F-1 (shared stubs + re-exports), F-2, F-3
4. **Per-folder sections** (agent-core, lib, hooks, …) with prioritized items
5. **Master todo list** (numbered 1…N, N may be 40–80):
   - Structure design todos
   - Stub + re-export todos (no big-bang)
   - Move todos (`git mv` batches)
   - **Reference-update todos** (grep-driven)
   - Boundary lint / knip todos
   - Verification per wave
6. **Suggested waves**
7. **Deferred** (domains-catalog, evaluation overhaul, etc.)

## Clarify gate (src-root)

| Option | Posture |
|--------|---------|
| **A — Staged** | Finalize `STRUCTURE.md` for **all** top-level folders; **implement Wave 1** only (`shared/` stubs + highest-traffic `lib/`/`agent-core` re-exports + referrer sweep) after Verification. |
| **B — Plan-only** | `STRUCTURE.md` + `PLAN.md` + referrer inventory; **no moves** this run. |
| **C — Full src-root** | Structure for all; implement all waves + all referrers (many verify loops). |

Recommend **A**.

## Non-negotiables

- Ground ideal tree in `docs/unified/ARCHITECTURE.md` §3 + `docs/unified/SPEC.md` F-1…F-3.
- **No move without referrer audit** — paired move + grep todos.
- Behavior-preserving; `npm run typecheck`, `npm run test:unit`, `node scripts/fabro-verify.mjs`.
- Use `refactor` skill for moves; staged re-exports before deleting old paths.
- Do **not** reshape `src/domains/*` internals in Wave 1 unless a top-level move
  forces a one-line import fix in a domain barrel.

## Assess focus

- Top-level folder inventory vs §3 target (table)
- **Duplication map**: `agent-core` vs `shared/agent-kernel` vs `domains/*/agents`
- **Import heat map**: grep counts for `@/lib`, `@/agent-core`, `@/hooks` from `app/` and `domains/`
- **SPEC F-1 readiness**: does `shared/` exist with stubs?
- `## Metadata` (`has_ui_surface: no` for structure-only Wave 1)


## Completed stages
- **scope**: succeeded
  - Model: claude-sonnet-4-5, 5.4k tokens in / 929 out


# Role: Architecture Assessor (fast pass)

You do a **single, tight assessment** of the target module against this project's
target architecture. You are the only reviewer, and you are on a **2-minute
budget** — be fast and focused, not exhaustive. You do **not** write a plan and
you do **not** modify code.

## The goal / target

# src-root cleanup — ideal top-level `src/` layout + full reference update

## Mission

Design the **ideal top-level `src/` folder structure** per
`docs/unified/ARCHITECTURE.md` §3 (Repository topology), then **update every file
that references old paths** (imports, re-exports, tests, API routes, Next.js config,
Fabro verify scopes). Behavior-preserving; no new product features.

This is a **large, multi-sprint** effort — the plan may contain **40–80 todos**.
Do **not** under-scope the reference sweep: a move without updating all referrers
is a failed increment.

**Primary pain (operator):** `src/` has **~20+ top-level folders** outside the
target topology. Legacy homes (`agent-core`, `lib`, `infrastructure`, `hooks`,
`store`, `services`, `prompts`, `evaluation`, `mcp`, `workflows`, `types`,
`config`, `constants`, `content`, `pages`) duplicate or prefigure what must live
in `shared/`, `domains/<module>/`, `db/`, `trigger/`, `components/ui/`, or `app/`.
The operator wants Fabro to **propose** a concrete target tree, get human approval,
then **execute moves and fix every import**.

**Out of scope for this run's default posture:** reshaping `src/domains/*` internals
(that is `module=domains-catalog`). This run focuses on **top-level `src/`** only,
but must still **grep and fix referrers** in `domains/`, `app/`, and `tests/` when
paths change.

## Target topology (contract)

From `docs/unified/ARCHITECTURE.md` §3 — the **only** legal top-level `src/` layout
after migration:

```
src/
├─ domains/<module>/     # vertical slices (see domains-catalog for module internals)
├─ shared/               # cross-module: agent-kernel, jobs, data, auth, observability, errors
├─ components/ui/        # Radix + CVA design system primitives
├─ db/                   # Drizzle schema + client (single source of truth)
├─ trigger/              # thin re-export registry for Trigger.dev tasks
├─ app/                  # Next.js App Router — routes + API glue only
├─ middleware.ts         # Next.js middleware (if present — stays at src root)
└─ instrumentation*.ts   # Next.js instrumentation (if present — stays at src root)
```

**Rule:** anything imported by 2+ modules lives in `shared/`, never in a domain or
legacy top-level folder. `shared/` supersedes `lib/`, `agent-core/`, `infrastructure/`,
`store/`, and ad-hoc `services/` at `src/` root.

## Current inventory (operator snapshot — Scope re-validates)

| Top-level path | Role today | Target disposition |
|----------------|------------|-------------------|
| `agent-core/` | Mastra kernel, models, observability dupes | → `shared/agent-kernel/` (+ `shared/observability/`) |
| `lib/` | auth, utils, API helpers | → `shared/auth/`, `shared/data/`, delete dupes |
| `infrastructure/` | legacy wiring | → `shared/*` or delete |
| `hooks/` | cross-cutting React hooks | → `shared/` or owning `domains/*/state/` |
| `store/` | global Zustand | → `shared/` or module `state/` |
| `services/` | orphan server helpers | → `domains/*/services/` or `shared/` |
| `prompts/` | prompt builders | → `domains/*/prompts/` or `shared/agent-kernel/` |
| `evaluation/` | offline eval harness | → keep slim or `shared/agent-kernel/scorers/` |
| `mcp/` | MCP servers | → `src/mcp` ok if single entry; or `shared/` |
| `workflows/` | hand-rolled orchestration | → Mastra workflows in `domains/*/agents/` |
| `types/` | global TS types | → `shared/data/` or colocate |
| `config/`, `constants/`, `content/` | misc | → colocate or `shared/` |
| `pages/` | legacy Pages router? | → migrate to `app/` or delete |
| `components/` | UI | → `components/ui/` only at top level |
| `domains/` | product modules | **keep** — do not reshape internals this run |
| `db/`, `trigger/`, `app/`, `shared/` | already target-aligned | **keep** — extend, don't replace |

Scope stage prints live counts; Plan Author updates this table if reality differs.

## Required deliverable: ideal structure (before code moves)

**Plan Author MUST write `STRUCTURE.md`** at repo root (overwrite stale domain-catalog
copies). For **src-root** runs the file has a dedicated section:

### `STRUCTURE.md` — src-root section (mandatory)

1. **Current top-level tree** — `ls -1 src/` + one-line role per folder.
2. **Ideal target tree** (ASCII) — §3 topology above; note what stays at root
   (`middleware.ts`, `instrumentation.ts`).
3. **Disposition table** — every legacy top-level folder: `keep` | `merge → shared/X` |
   `move → domains/<m>/Y` | `delete` (with evidence: importers = 0).
4. **Move map** — `old_path → new_path` for every file that moves in the approved wave.
5. **Re-export shim plan** — which old paths get temporary `index.ts` re-exports
   (SPEC F-1 staged migration).
6. **Out of scope for this wave** — explicit list (usually: full `domains/` reshape,
   full `evaluation/` rewrite).

## Required deliverable: reference update (every referrer)

Implementation MUST update **all referrers**, not only files inside the moved folder:

| Referrer class | Examples | Action |
|----------------|----------|--------|
| `@/lib/*`, `@/agent-core/*` | app routes, domains, tests | Rewrite to `@/shared/*` |
| Deep imports | `@/hooks/useX`, `@/services/Foo` | Route through new public path |
| `tsconfig` paths | `paths` in `tsconfig.json` | Update aliases |
| Next config | `next.config.js` transpile/includes | Update if paths change |
| Tests | `tests/**`, `**/__tests__/**` | Fix mocks + imports |
| Docs | `AGENTS.md`, `docs/**` | Update cited paths |
| Knip / ESLint boundaries | boundary rules | Update globs |

**Plan Author** must include grep-driven todos:

```bash
grep -rn "from '@/lib" src/ tests/
grep -rn "from '@/agent-core" src/ tests/
grep -rn "from '@/hooks" src/ tests/
grep -rn "from '@/infrastructure" src/ tests/
grep -rn "from '@/store" src/ tests/
```

…one todo per batch with expected file counts.

## Plan shape (`PLAN.md`)

First lines must include: **`Fabro module: src-root`** (for `fabro-verify.mjs`).

1. **Executive summary**
2. **Pointer to `STRUCTURE.md`** — src-root section is the move contract
3. **Global prerequisites** — SPEC F-1 (shared stubs + re-exports), F-2, F-3
4. **Per-folder sections** (agent-core, lib, hooks, …) with prioritized items
5. **Master todo list** (numbered 1…N, N may be 40–80):
   - Structure design todos
   - Stub + re-export todos (no big-bang)
   - Move todos (`git mv` batches)
   - **Reference-update todos** (grep-driven)
   - Boundary lint / knip todos
   - Verification per wave
6. **Suggested waves**
7. **Deferred** (domains-catalog, evaluation overhaul, etc.)

## Clarify gate (src-root)

| Option | Posture |
|--------|---------|
| **A — Staged** | Finalize `STRUCTURE.md` for **all** top-level folders; **implement Wave 1** only (`shared/` stubs + highest-traffic `lib/`/`agent-core` re-exports + referrer sweep) after Verification. |
| **B — Plan-only** | `STRUCTURE.md` + `PLAN.md` + referrer inventory; **no moves** this run. |
| **C — Full src-root** | Structure for all; implement all waves + all referrers (many verify loops). |

Recommend **A**.

## Non-negotiables

- Ground ideal tree in `docs/unified/ARCHITECTURE.md` §3 + `docs/unified/SPEC.md` F-1…F-3.
- **No move without referrer audit** — paired move + grep todos.
- Behavior-preserving; `npm run typecheck`, `npm run test:unit`, `node scripts/fabro-verify.mjs`.
- Use `refactor` skill for moves; staged re-exports before deleting old paths.
- Do **not** reshape `src/domains/*` internals in Wave 1 unless a top-level move
  forces a one-line import fix in a domain barrel.

## Assess focus

- Top-level folder inventory vs §3 target (table)
- **Duplication map**: `agent-core` vs `shared/agent-kernel` vs `domains/*/agents`
- **Import heat map**: grep counts for `@/lib`, `@/agent-core`, `@/hooks` from `app/` and `domains/`
- **SPEC F-1 readiness**: does `shared/` exist with stubs?
- `## Metadata` (`has_ui_surface: no` for structure-only Wave 1)


## Target architecture — folder structure & layering (MUST follow)

This project has a canonical target architecture that every module converges on.
The authoritative source is **`docs/unified/ARCHITECTURE.md`** (companion:
`docs/unified/SPEC.md`, `docs/orchestration-rfc.md`,
`docs/quality-improvement-spec.md`). **Read `docs/unified/ARCHITECTURE.md` before
proposing or placing any new code.** The summary below is the contract; the doc
is the detail.

> Note: this is the *target state*. Existing modules (e.g. `storyteller`) are
> mid-migration, so current code may not fully match. New code you add MUST follow
> the target; when editing legacy code, move it toward the target, never further away.

**Locked stack (non-negotiable):** Mastra · Radix · Supabase · TanStack Query ·
Trigger.dev · Vercel. You change *how* they're used, never *whether*.

### Repository topology

```
src/
├─ domains/<module>/     # vertical slices — the unit of ownership
├─ shared/               # cross-module building blocks (imported by 2+ modules)
│   ├─ agent-kernel/  jobs/  data/  auth/  observability/  errors/
├─ components/ui/        # Radix + CVA + tailwind-merge design system (shared primitives)
├─ db/                   # Drizzle: single schema source of truth + client
├─ trigger/              # thin re-export registry only
└─ app/                  # Next.js App Router: routes + API; thin glue only
```

Anything imported by 2+ modules lives in `shared/`, never inside a module.

### Module blueprint (every domain looks like this)

```
src/domains/<module>/
├─ index.ts        # PUBLIC API — the ONLY legal import target from outside
├─ ui/             # React client components. PascalCase folder-per-component (+ colocated .test.tsx + local index.ts)
├─ state/          # CLIENT state only (Zustand: use<Module>UiStore) + queries/ (TanStack: use<Entity>, use<Entity>Mutation)
├─ io/             # client→server edge: <module>.api.ts, <module>.keys.ts, <module>.dto.ts (Zod, shared with routes)
├─ core/           # PURE domain logic. No React, no DB, no I/O, no Date.now(). Unit-tested offline.
├─ services/       # SERVER-ONLY. DB (Drizzle) + external APIs. `import 'server-only'`. Returns Result<T>.
├─ agents/         # SERVER-ONLY. Mastra agents/tools/workflows (AI modules only) + tools/<tool>.ts
├─ tasks/          # Trigger.dev schemaTasks OWNED by this module: <verb>.task.ts
├─ prompts/        # prompt builders + skills (AI modules only)
└─ <module>.config.ts
```

- **AI modules** (storyteller, chat, loop-creator…) use `agents/` + `prompts/`.
  **Asset modules** (world-building-toolkit, 3d-asset-exporter, interior-designer)
  skip them and lean on `tasks/`.

### Dependency rule (points inward and downward — enforced by lint)

`ui → state → io → core ← (server) services/agents/tasks`

| Layer | May import | May NOT import |
| --- | --- | --- |
| `ui/` | `state/`, `core/` types, `components/ui`, `shared/jobs` | `services/`, `db`, `io/` directly, another module |
| `state/` | `io/`, `core/`, `shared/data`, `shared/jobs` | `services/`, `db`, `react-dom` |
| `io/` | `core/` DTOs, `shared/data` | `services/`, `db`, `react` |
| `core/` | `core/`, `zod` | everything else (stays pure) |
| `services/` | `db`, `shared/*`, external SDKs | `state/`, `ui/`, `io/`, React |
| `agents/` | `shared/agent-kernel`, `services/`, `prompts/`, `core/` | `ui/`, `state/` |
| `tasks/` | `services/`, `agents/`, `core/`, `shared/jobs` | `ui/`, `state/`, `io/` |

- A module may **not** import another module's internals — go through its
  `index.ts` or the shared layer. `app/` holds **no business logic**.

### Naming (kill the flat-vs-folder split — folder-per-unit everywhere)

- Folders & components `PascalCase`; hooks `useX.ts`; tasks `<verb>.task.ts`;
  services `<Noun>Service.ts`; Zod DTOs `*.dto.ts`; each unit gets a local barrel.

### Non-negotiable invariants (the highest-leverage rules)

1. **Server state in TanStack Query, never in Zustand.** Zustand holds *only*
   ephemeral UI state (selection, modes, panels). They never mix in one store.
2. **No browser→Supabase writes.** All writes + privileged reads go through an API
   route → `requireAuth()` → Service → Drizzle. RLS is defense-in-depth, not the gate.
3. **One schema, camelCase end-to-end.** Drizzle (`src/db/schema.ts`) is the source
   of truth; the snake_case↔camelCase boundary is the Drizzle column map only.
4. **Long work is a Job.** Anything > ~1s of server/GPU/LLM time is a Trigger.dev
   `schemaTask`, observed via Trigger Realtime through the shared `useJob` hook —
   no bespoke polling, no `localStorage` recovery, no `window` CustomEvents.
5. **Typed boundaries.** Zod at every edge (API body, tool input, task payload, and
   every workflow step `inputSchema`/`outputSchema`). Ban `any` at boundaries.
6. **One barrel.** Reaching into a module's internals from outside is a lint error.
7. **Use the framework once.** If Mastra ships a primitive (Workflows, Memory, AI
   Tracing, Workspace skills, Scorers, Processors, RequestContext), use it — no
   hand-rolled parallel. Wrapping is allowed; re-implementing is not.
8. **Size limits.** Components < ~400 LOC, routes < ~300 LOC; split god components.

When deciding *where* a change goes, map it to the layer above and place it there.
If unsure, consult `docs/unified/ARCHITECTURE.md` §3–§5 and §12 rather than guessing.

## How to work (stay under ~2 minutes)

- The **`Scope` stage output already contains the full module file tree and git
  status** — use that tree directly. Do **NOT** re-glob the module root
  (`glob("src/domains/*")`, `glob("**/index.ts")`, etc.) — it wastes tool calls
  and returns empty when the sandbox cwd differs.
- Read **only** what you need to judge alignment: the module's `index.ts` (if any),
  its top-level folders, and a *small* representative sample (2-4 files) per concern
  below. Skim, don't deep-read every file.
- **Search with `grep`, not `rg`.** `ripgrep` is NOT installed on this stage
  (it runs before Bootstrap). Use `grep -rn "text" src/domains/<module>`; for literal
  strings that contain regex chars (`.`, `(`, `'`, `@`, `/`) use `grep -rnF`. Keep
  patterns simple — a bad regex wastes a whole tool call.
- **Read before write.** `findings/assess.md` may already exist from a prior run;
  Fabro blocks `write_file` on an unread existing file. Read it first (or just
  overwrite after reading) — don't burn a turn on a blocked write.
- Judge against the **target** state, but be fair: modules are mid-migration, so
  distinguish "not yet migrated" from "actively moving the wrong way".
- Do not modify code. Do not run builds or tests.

## What to check (the highest-leverage lenses only)

1. **Layering & blueprint** — does the module have the `ui/state/io/core/services/
   agents/tasks/prompts` shape and a single public `index.ts` barrel? What's missing
   or mis-placed?
2. **Dependency rule** — any inward/downward violations? (`ui` touching `services`/
   `db`/`io` directly, `core` importing React/DB/IO, cross-module internal imports.)
3. **State split** — server data living in Zustand instead of TanStack Query.
4. **Write path & schema** — browser→Supabase writes; manual snake_case remapping.
5. **Framework-once** — hand-rolled parallels to Mastra primitives.
6. **Typed boundaries & size** — `any` at edges; god files over the size limits.

**Asset modules** (`interior-designer`, `world-building-toolkit`, `3d-asset-exporter`):
lean on `tasks/` not `agents/`; flag browser→Supabase writes, bespoke job polling in
`components/`, and monolithic Zustand stores (`useInteriorStore`, etc.) as high-leverage
findings.

## Output

Write concise findings to `findings/assess.md` with `write_file`, then give a short
summary. For each finding use:

```
### [SEV] Short title
- Location: path (or layer)
- Divergence: which invariant/§ it breaks
- Cost: what it causes today / risks later
- Target: what the on-architecture version looks like
```

Severity: **Critical / High / Medium / Low**. Keep it to the ~6-10 findings that
matter most for a **single-module** run — this feeds Clarify prep and Plan.

## Catalog-wide runs (`module=domains-catalog`)

When the run goal targets the **full `src/domains/` catalog** (see
`goals/domains-catalog-cleanup.md`):

- Expand to **~15–25 findings** plus a **catalog overview table** (all 9 modules).
- **Storyteller deep dive** is mandatory: folder sprawl (~104 dirs), **draft ideal
  target tree** (fewer top-level folders, §4 layers), list folders to eliminate.
- Per other module: **ideal target tree sketch** (3–8 lines ASCII) + 3–5 gap bullets.
- **Referrer heat map**: `grep` counts for deep imports per module from `src/app`,
  `src/shared`, `src/hooks`, tests.
- Include **cross-cutting** findings (schema, shared migration).
- Still end with `## Metadata` and **Open questions for Clarify** (catalog A/B/C).

## src-root runs (`module=src-root`)

When the run goal targets **top-level `src/` cleanup** (see
`goals/src-root-cleanup.md`):

- Expand to **~12–20 findings** plus a **top-level folder inventory table**
  (every `src/*` entry vs §3 target disposition).
- **Duplication deep dive**: `agent-core/` vs `shared/agent-kernel/` vs scattered
  `domains/*/agents` — who imports what.
- **Import heat map**: grep counts for `@/lib`, `@/agent-core`, `@/hooks`,
  `@/infrastructure`, `@/store` from `src/app`, `src/domains`, `tests/`.
- Flag **SPEC F-1** readiness (`shared/` stubs exist? re-export shims needed?).
- Explicitly note **`domains/` is out of scope** for internal reshape — only
  referrer fixes when top-level paths change.
- Still end with `## Metadata` and **Open questions for Clarify** (src-root A/B/C).

**End `findings/assess.md` with this required metadata block** (downstream agents
and the graph condition on it):

```markdown
## Metadata
- has_ui_surface: yes|no
- has_p0_security_issue: yes|no
- top_violation_layer: barrel|state|schema|ai|jobs|other
```

- `has_ui_surface: no` when the work is internal structure (imports, schema, layers,
  Mastra wiring) with no meaningful user-visible UI change in this increment.
- `has_p0_security_issue: yes` only for active security/correctness holes (client
  writes, auth bypass, data loss).

Then:

## Open questions for Clarify
List 0–5 items where a human decision is needed before planning (scope, trade-offs,
conflicts between findings). If none, write "None — safe to plan with defaults."

Then a one-line verdict and the **top 3 gaps** to fix first. Stop.