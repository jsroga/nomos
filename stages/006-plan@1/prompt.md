Goal: # Domains catalog cleanup — ideal structure + full reference update

## Mission

Design the **ideal folder structure** for every module under `src/domains/`, then
**update every file in the repo that references old paths** (imports, re-exports,
tests, API routes, shared shims, docs, Fabro verify scopes). Behavior-preserving;
no new product features.

This is a **large, multi-sprint** effort — the plan may contain **50–100 todos**.
Do **not** under-scope the reference sweep: a move without updating all referrers
is a failed increment.

**Primary pain (operator):** `storyteller` has **~104 subdirectories** — far too
many top-level and nested folders. The operator wants Fabro to **propose** a
concrete target tree (fewer folders, §4-aligned), get human approval, then **execute
the moves and fix every import**.

**Scope:** all 9 domain modules:

| Module | ~dirs today | Notes |
|--------|-------------|--------|
| `storyteller` | 104 | **Worst sprawl** — design target tree first |
| `interior-designer` | 19 | Partial §4 skeleton |
| `loop-creator` | 12 | Agents + market-analyst subtree |
| `deduction-puzzle-designer` | 7 | Smaller |
| `world-building-toolkit` | 7 | Flat legacy → reshape per ARCHITECTURE worked example |
| `chat` | 6 | Cross-cutting UI |
| `game-design` | 3 | Thin |
| `3d-asset-exporter` | 3 | Asset module |
| `marketing` | 3 | Thin |

## Required deliverable: ideal structure (before code moves)

**Plan Author MUST write `STRUCTURE.md`** at repo root (overwrite stale copies).
This is the contract for implementation — not optional prose in `PLAN.md` alone.

For **each** module, `STRUCTURE.md` contains:

1. **Current tree** (top 2 levels + note on worst sprawl).
2. **Ideal target tree** (ASCII) — grounded in `docs/unified/ARCHITECTURE.md` §4.
   - Module root: only `index.ts`, `ui/`, `state/`, `io/`, `core/`, `services/`,
     `agents/`, `tasks/`, `prompts/`, `<module>.config.ts` (omit empty layers).
   - **Collapse rules** for storyteller: merge `core/*` one-folder-per-type into
     fewer `core/` units; fold `mentions/`, `hooks/`, `lib/`, `db/` into correct
     layers; keep `agents/` but reduce per-agent folder noise where sensible.
3. **Move map** — table `old_path → new_path` for every file that moves.
4. **Public barrel** — what `index.ts` exports after the reshape.
5. **Out of scope for this wave** — folders/files that stay put until a later wave.

**Storyteller gets the most detail** (full before/after). Other modules: at least
target tree + move map for files that move in the approved wave.

## Required deliverable: reference update (every referrer)

After the structure is approved, implementation MUST update **all referrers**, not
only files inside the module:

| Referrer class | Examples | Action |
|----------------|----------|--------|
| Intra-module imports | `../../core/Foo` | Rewrite to new paths |
| Cross-module deep imports | `@/domains/storyteller/agents/...` | Route through `index.ts` or new public path |
| App API routes | `src/app/api/storyteller/**` | Update imports to services/io/barrel |
| Shared shims | `src/shared/**`, `src/lib/**` | Update re-exports |
| DB layer | `src/db/**`, `src/domains/*/db/schema` | Align with unified schema plan |
| Hooks outside domain | `src/hooks/**` | Move or update imports per STRUCTURE |
| Tests | `**/__tests__/**`, `tests/**` | Fix paths + mocks |
| Config | `tsconfig.fabro-verify.json`, `knip`, `eslint` boundaries | Update include paths |
| Docs | `docs/internal/*.md`, `AGENTS.md` paths cited in code comments | Update when paths change |

**Plan Author** must include todos that run, per module/wave:

```bash
grep -rn "from '@/domains/<module>" src/ tests/
grep -rn "domains/<module>/" src/ tests/
```

…and assign **one todo per referrer batch** (or per directory of callers) so nothing
is missed. Expect **dozens of files** outside `src/domains/storyteller/` for
storyteller alone.

## Plan shape (`PLAN.md`)

1. **Executive summary**
2. **Pointer to `STRUCTURE.md`** — "implementation follows move map"
3. **Global prerequisites** (F-1…F-3 from SPEC)
4. **Per-module sections** with prioritized items
5. **Master todo list** (numbered 1…N, N may be 80–100):
   - Structure design todos (write/iterate `STRUCTURE.md`)
   - Move todos (git mv / codemod batches)
   - **Reference-update todos** (grep-driven, list affected files)
   - Barrel + boundary lint todos
   - Verification per wave
6. **Suggested waves**
7. **Deferred**

## Clarify gate (catalog-wide)

| Option | Posture |
|--------|---------|
| **A — Staged** | Finalize `STRUCTURE.md` for **all** modules; **implement Wave 1** only (storyteller ideal tree + full referrer update) after Verification. |
| **B — Plan-only** | `STRUCTURE.md` + `PLAN.md` + referrer inventory; **no moves** this run. |
| **C — Full catalog** | Structure for all; implement all waves + all referrers (many verify loops). |

Recommend **A**.

## Non-negotiables

- Ground ideal trees in `docs/unified/ARCHITECTURE.md` §4 + worked examples (§4 WBT).
- **No move without referrer audit** — every `PLAN.md` move item has a paired
  "update referrers" item listing grep patterns.
- Behavior-preserving; `npm run typecheck`, `npm run test:unit`, `node scripts/fabro-verify.mjs`.
- Use `refactor` skill for layer moves; codemod import paths in batches.
- Orchestration/agent logic: **move files first**; do not rewrite Mastra behavior in
  the same increment as folder collapse unless the plan explicitly says so.

## Assess focus

- Catalog table (9 modules vs §4)
- **Storyteller**: current vs ideal folder count estimate; top 10 folders to eliminate
- **Referrer heat map**: which modules have the most external deep imports
- `## Metadata` (`has_ui_surface: no` for structure-only Wave 1)

Run ID: 01KWKQ7AJDXMRYVKT8GKDGF7WA
Pipeline progress: 4 of 22 stages completed

## Stage: scope
- Status: succeeded
- Handler: agent
- Model: claude-sonnet-4-5
- Tokens: 5.5k in / 1.1k out
- Response:
  > Let me fix the sed command and re-run the deep imports check:

## Stage: assess
- Status: succeeded
- Handler: agent
- Model: claude-sonnet-4-5
- Tokens: 46.0k in / 8.9k out
- Files touched: findings/assess.md
- Response:
  > Perfect! I've completed the catalog-wide assessment. Let me provide a summary:
  > 
  > ## Assessment Complete ✓
  > 
  > I've analyzed all 9 domain modules against the target architecture and created a comprehensive catalog assessment at `findings/assess.md`.
  > 
  > ### Key Findings
  > 
  > **Catalog Overview:**
  > - Only **1/9 modules** (storyteller) approximates the §4 blueprint, but it has severe folder sprawl (102 subdirs)
  > - **world-building-toolkit** has critical security/architecture violations (browser→Supabase writes, 865-LOC god Zustand store)
  > - 7 other modules need full §4 reshape from flat legacy structures
  > 
  > **Storyteller Deep Dive (main focus):**
  > - Current: **102 subdirectories** 
  > - Target: **~60-65 subdirectories** (42% reduction)
  > - Worst offenders:
  >   - `core/`: 15 one-folder-per-type units → collapse to 5-6 thematic groups
  >   - `agents/`: 17 folders → reduce to ~10-12 by grouping council/judges/orchestration
  >   - `ui/`: 31 folders ✅ (correct pattern, keep as-is)
  > 
  > **Critical Issues:**
  > 1. **WBT browser→Supabase writes** (P0 security issue)
  > 2. **WBT 865-LOC god Zustand store** mixing server + client state
  > 3. **Missing public barrels** in 8/9 modules
  > 4. **Parallel Mastra stacks** (hand-rolled observability/memory/skills vs. native)
  > 5. **Referrer sprawl**: WBT has ~15+ external deep imports (highest coupling)
  > 
  > **Ideal Structure Designed:**
  > - Full target tree for **storyteller** (detailed folder reorganization)
  > - Target trees for **all other modules** (WBT, interior-designer, loop-creator, chat, and 4 smaller modules)
  > - Move map sketches showing 15 key consolidations for storyteller
  > 
  > **Recommendation:** **Option A (Staged)** — Design all structures now, implement only Wave 1 (storyteller) after Verification.
  > 
  > The assessment is ready for the Clarify stage to finalize scope gates and create the detailed PLAN.md + STRUCTURE.md implementation guide.

## Stage: clarify_prep
- Status: succeeded
- Handler: agent
- Model: claude-sonnet-4-5
- Tokens: 18.0k in / 2.6k out
- Files touched: /workspace/kurvitza/CLARIFY.md, /workspace/kurvitza/DECISIONS.md, /workspace/kurvitza/PLAN.md
- Response:
  > ## Assessment summary
  > 
  > The catalog has **9 domain modules** (381 TypeScript files). Only **1/9 modules (storyteller)** approximates the §4 blueprint, but it suffers **102-subdir sprawl** — the worst being `core/` with 15 one-folder-per-type units and `agents/` with 17 per-agent subfolders. **World-building-toolkit** is **critically divergent**: 865-LOC Zustand store mixing server/UI state, browser→Supabase writes bypassing auth gates, hand-rolled job polling. The other 7 modules are **legacy flat structures** (3-19 dirs) needing full §4 layering.
  > 
  > **Referrer coupling is high**: storyteller has ~40 external deep imports (API routes, cross-module, services shim); WBT has ~15 external `useWorldStore` imports from interior-designer, 3d-asset-exporter, app pages, and shared utilities.
  > 
  > ## Key gaps (max 5)
  > 
  > 1. **Storyteller `core/` sprawl**: 15 one-folder-per-type units (ActionTypes, StoryTypes, Enums, EntityExtractor, etc.) → collapse into 5 thematic groups (types/, domain-logic/, formatters/, entity-refs/, utils/). Target: 102 → ~60 subdirs (42% reduction).
  > 
  > 2. **WBT god store + security**: `useWorldStore.ts` (865 LOC) mixes server data (tiles/projects/assets), UI state (viewport/brushSize), and job state; browser→Supabase writes bypass `requireAuth()`. Must split into TanStack queries (server state) + thin Zustand (~150 LOC UI-only) + server Services + API routes.
  > 
  > 3. **Referrer sweep scope**: ~100+ external deep imports across 9 modules. Storyteller alone: 30 API routes, chat module, evaluation/, services shim. WBT: 15 cross-module `useWorldStore` imports. Every move needs paired grep-driven import rewrite.
  > 
  > 4. **Missing public barrels**: 8/9 modules lack `index.ts` — external callers see internals (`@/domains/world-building-toolkit/store/useWorldStore`). No contract boundary, no lint enforcement.
  > 
  > 5. **Agent folder sprawl**: storyteller `agents/` has 17 subdirs (1 per agent, plus MastraInstance/ModelConfig/workflows/tools). Target: group into `council/` (6 agents as files), `judges/` (3 agents), `orchestration/` (workflows/graphs/planner) → ~10 subdirs. Move MastraInstance → `shared/agent-kernel/`, ModelConfig → `config/`.
  > 
  > ## Pick one scope (buttons are A / B / C — meanings are module-specific below)
  > 
  > | Button | What the plan will assume for **domains catalog cleanup** |
  > | --- | --- |
  > | **[A]** | **Staged — design all, implement Wave 1 only**. Write `STRUCTURE.md` with ideal trees + move maps for all 9 modules (grounded in §4 + WBT worked example). Then **implement Wave 1 storyteller only**: collapse `core/` (15→5 units), group `agents/` (17→10 subdirs), move MastraInstance/ModelConfig, fix **all ~40 storyteller external referrers** (API routes in `src/app/api/storyteller/*`, chat module, evaluation scripts, services shim). Verify (typecheck + test + verify scope). Gate before Wave 2 (WBT + others). ~30-40 todos Wave 1. |
  > | **[B]** | **Plan-only — structure contract + inventory, no moves**. Write `STRUCTURE.md` (ideal trees for all 9) + `PLAN.md` (full 80-100 todo sequencing: moves + grep patterns for every referrer batch). Human reviews structure contract, then launches separate executor run. Zero file moves this run — prep only. |
  > | **[C]** | **Full catalog — all 9 modules + all referrers**. `STRUCTURE.md` + implement: storyteller (42-dir cut) + **WBT critical reshape** (split god store → TanStack queries + thin Zustand + API routes, eliminate browser→Supabase writes) + interior-designer (merge state/store, rename components→ui) + loop-creator (add §4 layers) + 5 smaller modules (expand to full blueprint). Fix ~100+ external referrers across all modules. ~80-100 todos, many verify loops. |
  > 
  > **Advanced:** type custom constraints in freeform (routes to [F]) · pick [R] only if assess findings are wrong
  > 
  > **Recommendation: [A]** — Storyteller is the operator's stated pain point (104 subdirs) and has the cleanest path (skeleton exists, just needs collapse + referrer cleanup). WBT is higher-risk (security + cross-module coupling + full paradigm shift from god store to TanStack); defer to Wave 2 after storyteller proves the structure contract + referrer update pattern. Option B is safe but doesn't prove the pattern. Option C tackles WBT security (good) but risks multi-module breakage without intermediate verification gates.

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

# Domains catalog cleanup — ideal structure + full reference update

## Mission

Design the **ideal folder structure** for every module under `src/domains/`, then
**update every file in the repo that references old paths** (imports, re-exports,
tests, API routes, shared shims, docs, Fabro verify scopes). Behavior-preserving;
no new product features.

This is a **large, multi-sprint** effort — the plan may contain **50–100 todos**.
Do **not** under-scope the reference sweep: a move without updating all referrers
is a failed increment.

**Primary pain (operator):** `storyteller` has **~104 subdirectories** — far too
many top-level and nested folders. The operator wants Fabro to **propose** a
concrete target tree (fewer folders, §4-aligned), get human approval, then **execute
the moves and fix every import**.

**Scope:** all 9 domain modules:

| Module | ~dirs today | Notes |
|--------|-------------|--------|
| `storyteller` | 104 | **Worst sprawl** — design target tree first |
| `interior-designer` | 19 | Partial §4 skeleton |
| `loop-creator` | 12 | Agents + market-analyst subtree |
| `deduction-puzzle-designer` | 7 | Smaller |
| `world-building-toolkit` | 7 | Flat legacy → reshape per ARCHITECTURE worked example |
| `chat` | 6 | Cross-cutting UI |
| `game-design` | 3 | Thin |
| `3d-asset-exporter` | 3 | Asset module |
| `marketing` | 3 | Thin |

## Required deliverable: ideal structure (before code moves)

**Plan Author MUST write `STRUCTURE.md`** at repo root (overwrite stale copies).
This is the contract for implementation — not optional prose in `PLAN.md` alone.

For **each** module, `STRUCTURE.md` contains:

1. **Current tree** (top 2 levels + note on worst sprawl).
2. **Ideal target tree** (ASCII) — grounded in `docs/unified/ARCHITECTURE.md` §4.
   - Module root: only `index.ts`, `ui/`, `state/`, `io/`, `core/`, `services/`,
     `agents/`, `tasks/`, `prompts/`, `<module>.config.ts` (omit empty layers).
   - **Collapse rules** for storyteller: merge `core/*` one-folder-per-type into
     fewer `core/` units; fold `mentions/`, `hooks/`, `lib/`, `db/` into correct
     layers; keep `agents/` but reduce per-agent folder noise where sensible.
3. **Move map** — table `old_path → new_path` for every file that moves.
4. **Public barrel** — what `index.ts` exports after the reshape.
5. **Out of scope for this wave** — folders/files that stay put until a later wave.

**Storyteller gets the most detail** (full before/after). Other modules: at least
target tree + move map for files that move in the approved wave.

## Required deliverable: reference update (every referrer)

After the structure is approved, implementation MUST update **all referrers**, not
only files inside the module:

| Referrer class | Examples | Action |
|----------------|----------|--------|
| Intra-module imports | `../../core/Foo` | Rewrite to new paths |
| Cross-module deep imports | `@/domains/storyteller/agents/...` | Route through `index.ts` or new public path |
| App API routes | `src/app/api/storyteller/**` | Update imports to services/io/barrel |
| Shared shims | `src/shared/**`, `src/lib/**` | Update re-exports |
| DB layer | `src/db/**`, `src/domains/*/db/schema` | Align with unified schema plan |
| Hooks outside domain | `src/hooks/**` | Move or update imports per STRUCTURE |
| Tests | `**/__tests__/**`, `tests/**` | Fix paths + mocks |
| Config | `tsconfig.fabro-verify.json`, `knip`, `eslint` boundaries | Update include paths |
| Docs | `docs/internal/*.md`, `AGENTS.md` paths cited in code comments | Update when paths change |

**Plan Author** must include todos that run, per module/wave:

```bash
grep -rn "from '@/domains/<module>" src/ tests/
grep -rn "domains/<module>/" src/ tests/
```

…and assign **one todo per referrer batch** (or per directory of callers) so nothing
is missed. Expect **dozens of files** outside `src/domains/storyteller/` for
storyteller alone.

## Plan shape (`PLAN.md`)

1. **Executive summary**
2. **Pointer to `STRUCTURE.md`** — "implementation follows move map"
3. **Global prerequisites** (F-1…F-3 from SPEC)
4. **Per-module sections** with prioritized items
5. **Master todo list** (numbered 1…N, N may be 80–100):
   - Structure design todos (write/iterate `STRUCTURE.md`)
   - Move todos (git mv / codemod batches)
   - **Reference-update todos** (grep-driven, list affected files)
   - Barrel + boundary lint todos
   - Verification per wave
6. **Suggested waves**
7. **Deferred**

## Clarify gate (catalog-wide)

| Option | Posture |
|--------|---------|
| **A — Staged** | Finalize `STRUCTURE.md` for **all** modules; **implement Wave 1** only (storyteller ideal tree + full referrer update) after Verification. |
| **B — Plan-only** | `STRUCTURE.md` + `PLAN.md` + referrer inventory; **no moves** this run. |
| **C — Full catalog** | Structure for all; implement all waves + all referrers (many verify loops). |

Recommend **A**.

## Non-negotiables

- Ground ideal trees in `docs/unified/ARCHITECTURE.md` §4 + worked examples (§4 WBT).
- **No move without referrer audit** — every `PLAN.md` move item has a paired
  "update referrers" item listing grep patterns.
- Behavior-preserving; `npm run typecheck`, `npm run test:unit`, `node scripts/fabro-verify.mjs`.
- Use `refactor` skill for layer moves; codemod import paths in batches.
- Orchestration/agent logic: **move files first**; do not rewrite Mastra behavior in
  the same increment as folder collapse unless the plan explicitly says so.

## Assess focus

- Catalog table (9 modules vs §4)
- **Storyteller**: current vs ideal folder count estimate; top 10 folders to eliminate
- **Referrer heat map**: which modules have the most external deep imports
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

1. `index.ts` — does `src/domains/domains-catalog/index.ts` exist? Read it; note
   what it exports (barrel leak vs missing).
2. **Largest files** — `wc -l` on the 3 largest `.ts`/`.tsx` files in the module.
3. **`z.any()`** — `grep -n 'z\.any()' src/domains/domains-catalog/` (especially
   workflow/agent files).
4. **`localStorage`** — `grep -rn localStorage src/domains/domains-catalog/services/`
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

## Output files

**`PLAN.md`** — if it exists, you may overwrite after your spot-checks (you will have
read the paths above). Structure:

0. **`STRUCTURE.md`** (catalog / folder-reshape runs) — write **before** or alongside
   `PLAN.md` when the goal requires ideal folder layout. See goal file /
   `goals/domains-catalog-cleanup.md`. Plan items must reference move-map rows.

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