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

Run ID: 01KWKYBW7C2H8WQ8FH7YMTGG6N
Pipeline progress: 4 of 22 stages completed

## Stage: scope
- Status: succeeded
- Handler: agent
- Model: claude-sonnet-4-5
- Tokens: 5.4k in / 929 out
- Response:
  > I'll run the scope command for `src-root` exactly as specified.

## Stage: assess
- Status: succeeded
- Handler: agent
- Model: claude-sonnet-4-5
- Tokens: 40.8k in / 9.5k out
- Files touched: findings/assess.md
- Response:
  > ## Assessment Complete
  > 
  > I've analyzed the src-root structure against the target topology and written findings to `findings/assess.md`.
  > 
  > **Key discoveries:**
  > 
  > 1. **Good progress:** F-1 (staged migration) already 85% done from Increment 1 — `shared/` stubs exist, `lib/auth` and `lib/api-utils` are now 3-line re-export shims
  > 
  > 2. **Scope:** 23 top-level folders, only 7 aligned with target → 16 legacy folders to migrate/delete
  > 
  > 3. **Import chaos quantified:**
  >    - 168+ `@/lib` imports (140 via shims, 28 real files unmigrated)
  >    - 25 `@/agent-core` imports (duplication with `shared/agent-kernel`)
  >    - 20 `@/store` imports (global state sprawl)
  >    - 18 `@/infrastructure` imports (AI clients scattered)
  >    - 9 `@/hooks` imports (already moved to `shared/data/`, shims missing)
  > 
  > 4. **Critical duplication:** `agent-core/observability.ts` (459 LOC manual Langfuse spans) duplicates Mastra AI Tracing — ARCHITECTURE §1.1 violation
  > 
  > 5. **Staged execution:** Wave 1 = codemod shims (~170 imports), Wave 2 = merge sources (~60 imports + folder moves)
  > 
  > **Top 3 priorities:**
  > 1. Codemod `@/lib` shim users (140 sites) → `@/shared/*`
  > 2. Add + codemod `@/hooks` shims (9 sites) → `@/shared/data/*`
  > 3. Add `@/store` shims (20 sites) → `shared/errors|jobs|auth`
  > 
  > The findings include a full disposition table, heat map, and SPEC F-1 readiness check. Ready for Clarify stage to choose Wave 1 (recommended) vs. full execution.

## Stage: clarify_prep
- Status: succeeded
- Handler: agent
- Model: claude-sonnet-4-5
- Tokens: 20.5k in / 2.4k out
- Files touched: /workspace/kurvitza/CLARIFY.md, /workspace/kurvitza/DECISIONS.md, /workspace/kurvitza/PLAN.md
- Response:
  > Now I'll present the inline summary for the human:
  > 
  > ---
  > 
  > ## Assessment summary
  > The repository has **23 top-level `src/` folders** where only **7** align with the target topology. Good news: Increment 1 already completed **F-1** (shared stubs + re-exports) with working shims for `lib/auth`, `lib/api-utils`, etc. The remaining **16 legacy folders** need consolidation into `shared/`, domains, or deletion. Import heat map shows **~240 total import sites** to update across waves: 168+ `@/lib` (mostly shims), 25 `@/agent-core`, 20 `@/store`, 18 `@/infrastructure`, plus smaller folders.
  > 
  > ## Key gaps (max 5)
  > 1. **Duplication pyramid** — `agent-core/observability` (459 LOC manual spans) vs `shared/agent-kernel/` (102 LOC Mastra wiring) vs domain agents; parallel observability trees violate "use framework once"
  > 2. **Shim codemod volume** — Wave 1 shims exist but 140+ import sites still use old `@/lib/*` paths; batch codemod errors = broken builds
  > 3. **Boundary enforcement gap** — lint at `warn` level; premature flip to `error` before codemods land blocks iteration
  > 4. **Cross-domain referrer sweep** — top-level moves force import updates in `domains/*/` files; missed grep batches = import failures at runtime
  > 5. **Legacy folder sprawl** — 16 folders outside target (12 to merge, 2 to delete, 2 keep slim); no disposition plan = drift continues
  > 
  > ## Pick one scope (buttons are A / B / C — meanings are module-specific below)
  > 
  > | Button | What the plan will assume for **src-root cleanup** |
  > |--------|-----------------------------------------------------|
  > | **[A] Staged (Wave 1)** | Finalize `STRUCTURE.md` with **all 23 folders mapped** (disposition table + move map). **Implement Wave 1 only**: codemod existing shims (`@/lib`, `@/hooks` = ~140 sites) + add new shims (`@/store` = 20 sites) + grep-driven referrer updates + verify green + flip boundary lint to `error` for completed scopes. **Defer to Wave 2**: merge `agent-core/` → `shared/agent-kernel/`, consolidate `infrastructure/`, `services/`, `prompts/`, delete `workflows/`/`pages/`, rename `components/` → `components/ui/`. Low risk, high leverage (~170 imports fixed, unlocks enforcement). |
  > | **[B] Plan-only** | Write **complete** `STRUCTURE.md` (current tree, ideal tree, disposition for all 16 legacy folders, full move map for all waves) + `PLAN.md` (40–80 numbered todos: structure design, shim setup, move batches, grep-driven referrer sweeps for all 240+ import sites, boundary lint config, verification per wave). **No moves, no codemods this run** — next Fabro run executes Wave 1 from the plan. Pure architecture design + referrer inventory. |
  > | **[C] Full src-root** | Structure + implement **all waves** in this run: codemod all shims (~170 sites) + merge `agent-core/`, `infrastructure/`, `services/`, `prompts/`, `types/` into `shared/` or domain folders (60+ additional imports) + delete `workflows/`, `pages/` + rename `components/` → `components/ui/` + update all referrers in `domains/`, `app/`, `tests/` + flip all boundary lint to `error`. Complete src-root convergence (est. 6–8 verification cycles, 40–80 todos executed). |
  > 
  > **Advanced:** type custom constraints in freeform (routes to [F]) · pick [R] only if assess findings are wrong
  > 
  > **Recommendation: [A] Staged (Wave 1)** — Assessment shows F-1 foundation ready (shims exist), Wave 1 codemods are high-leverage/low-risk (~170 imports, unlocks enforcement), and deferring Wave 2 merges reduces blast radius. Full src-root (option C) is viable but requires 6–8 verify loops; staged approach ships enforcement increment sooner.

## Stage: Clarify
- Status: succeeded
- Handler: human

## Current context
| Key | Value |
|-----|-------|
| human.gate.Clarify.answer | C |
| human.gate.Clarify.label | [C] Full blueprint |
| human.gate.Clarify.question | Choose scope A, B, or C for this module (see Clarify Prep summary — table defines what each means here) |
| human.gate.label | [C] Full blueprint |
| human.gate.selected | C |


# Role: Plan Author

You turn the assessment into a **prioritized, reviewable improvement plan** — the
deliverable of this workflow. You do **not** implement anything. A developer must
be able to execute your plan without rediscovering the codebase.

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

Every step in your plan MUST place changes in the correct layer/folder above,
name the module's `index.ts` contract where relevant, and flag any step that would
touch a dependency-rule boundary or an invariant as a risk.

## Inputs — read them first

1. `findings/assess.md` — primary input, including `## Metadata`.
2. `CLARIFY.md` — short scope framing (if present).
3. **`DECISIONS.md`** — update with the human's Clarify choice **before** drafting.
   Read `human.gate.Clarify.*` and `human.gate.text`. Record option, freeform text,
   in-scope vs deferred.
4. If re-invoked after Verification **[I] Iterate**, human notes are in
   `human.gate.Verification.*` / `human.gate.text`. Update both files only when the
   note is **substantive** (concrete changes requested). If the note is empty, a lone
   letter (`A`, `B`, `P`), or generic approval ("looks good", "approve", "LGTM"), do
   **not** rewrite the plan — respond: "No iteration notes. At Verification pick
   **[A] Approve & build** to implement (Clarify is already done)." Then stop.

## Mandatory spot-checks (before writing PLAN.md)

Run these **once** — do not exploratory re-discover what assess already found.
**Use `grep`, not `rg`** (ripgrep isn't installed on this stage); for literal
strings with regex chars use `grep -rnF`. Keep patterns simple to avoid failed
tool calls:

1. `index.ts` — does `src/domains/src-root/index.ts` exist? Read it; note
   what it exports (barrel leak vs missing).
2. **Largest files** — `wc -l` on the 3 largest `.ts`/`.tsx` files in the module.
3. **`z.any()`** — `grep -n 'z\.any()' src/domains/src-root/` (especially
   workflow/agent files).
4. **`localStorage`** — `grep -rn localStorage src/domains/src-root/services/`
   or job-related paths.
5. **Schema inversion** — does `src/db/schema.ts` import from the module's local
   `db/schema.ts`? Read both if assess flagged it.

Correct any stale assess claim you find; note corrections in the plan.

## Build the plan

Group findings into concrete **improvement items**:

```
### [Priority] Title
- Problem: what's wrong today (cite finding + location)
- Impact: why it matters
- Change: files/layers to create/modify/delete
- Effort: S / M / L
- Verification: typecheck, lint, test, manual
- Depends on: other items first (if any)
```

Prioritization: **P0** security/correctness · **P1** structural unblockers · **P2**
maintainability · **P3** nits.

## Catalog-wide plans (`module=domains-catalog`)

When the goal is the **full domains catalog** cleanup:

- **`STRUCTURE.md` is mandatory** — ideal folder tree per module (see goal file).
  `PLAN.md` implements the move map + referrer updates; do not bury structure only
  inside `PLAN.md`.
- `PLAN.md` may contain **50–100 numbered todos** — expected for moves + grep-driven
  referrer fixes across `src/`, `tests/`, `docs/`.
- Each **move** todo must pair with **update referrers** todo(s) listing grep patterns
  and expected file counts.
- Spot-check **each** module's `index.ts` and top-level folders (Scope output).
- **Impact map**: routes, `shared/`, `db/`, hooks, fabro-verify, knip.
- Default **Minimum first increment**: finalize `STRUCTURE.md` (all modules) + implement
  storyteller reshape + **full referrer sweep** (Wave 1).

## Mandatory spot-checks (catalog addition)

When `module=domains-catalog`, also run once per pilot module in Wave 1:

```bash
grep -rc "from '@/domains/storyteller" src/ tests/ | grep -v ':0$' | head -20
grep -rc "storyteller/" src/app/api --include='*.ts' | head -15
```

Record counts in `PLAN.md` — they size the referrer-update todos.

## src-root plans (`module=src-root`)

When the goal is **top-level `src/` cleanup** (see `goals/src-root-cleanup.md`):

- **`STRUCTURE.md` is mandatory** — src-root section with disposition table + move map.
  `PLAN.md` implements moves + referrer updates; do not bury structure only in prose.
- First line of `PLAN.md` body: **`Fabro module: src-root`** (verify script reads this).
- `PLAN.md` may contain **40–80 numbered todos** — expected for legacy folder moves +
  grep-driven referrer fixes across `src/`, `tests/`, config.
- **Do not reshape `src/domains/*` internals** unless fixing a direct import broken by
  a top-level move (document each as a small referrer-only todo).
- Default **Minimum first increment**: finalize `STRUCTURE.md` + Wave 1 =
  `shared/` stubs (SPEC F-1) + migrate highest-traffic `lib/` / `agent-core` paths
  with re-export shims + full referrer sweep for those paths.

### Mandatory spot-checks (src-root)

Run once before writing `PLAN.md`:

```bash
ls -1 src/
ls -1 src/shared/ 2>/dev/null || echo "shared/ missing"
grep -rc "from '@/lib" src/ tests/ | grep -v ':0$' | head -15
grep -rc "from '@/agent-core" src/ tests/ | grep -v ':0$' | head -15
grep -rc "from '@/hooks" src/ tests/ | grep -v ':0$' | head -15
head -30 src/db/schema.ts
head -20 src/trigger/index.ts
```

## Output files

**`PLAN.md`** — if it exists, you may overwrite after your spot-checks (you will have
read the paths above). Structure:

0. **`STRUCTURE.md`** (catalog / folder-reshape runs) — write **before** or alongside
   `PLAN.md` when the goal requires ideal folder layout. See goal file /
   `goals/domains-catalog-cleanup.md` or `goals/src-root-cleanup.md`. Plan items
   must reference move-map rows.

1. **Summary** — 2-4 sentences.
2. **Prioritized items** — P0…P3.
3. **Suggested sequence** — order + **Minimum first increment** (bold the item numbers,
   e.g. Items 1–3 only for first developer visit).
4. **Deferred / out of scope** — explicit list.

**`DECISIONS.md`** — Clarify + any Verification notes.

## Context for downstream build routing

At the end of your work, emit this JSON block in your final response (required for
the workflow graph to skip UX Designer on backend-only plans):

```json
{
  "context_updates": {
    "plan.has_ui_surface": "yes|no",
    "plan.has_p0_security_issue": "yes|no"
  }
}
```

Set `plan.has_ui_surface` from `findings/assess.md` metadata and the planned increment:
- `"no"` when the minimum first increment is imports/schema/layers/Mastra only.
- `"yes"` when the increment changes user-visible UI flows or needs `UX.md`.

## Final response format (Verification gate — keep under 400 words)

Your final response **must** include:

1. **P0 declaration** — `No P0` or `P0 exists` with one-line evidence.
2. **Your Clarify decision recap** — e.g. "**Your Clarify decision: [A] Staged
   migration.** In scope: … Explicitly deferred: …" (3 lines from DECISIONS.md).
3. **First shippable increment** in bold.
4. **Item count** and rough effort (e.g. "8 items, ~2–3 dev days for increment 1").
5. Bulleted plan summary with concrete file references.

6. **Verification reminder:** pick **[A] Approve & build** to implement, **[B]** for
   plan-only, **[I]** only if you want plan changes (type notes), **[X]** to abort.
   (Clarify's A/B/C are already decided — do not type `A` expecting build unless you
   choose option **[A]** on this gate.)

Then stop for **Verification**. Do not implement.

## Handoff

When `PLAN.md` and `DECISIONS.md` are updated, stop. Human reviews at Verification.
On **[I] iterate**, update both files and note what changed.