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

Run ID: 01KWM39XR77X28YMP2847ZK7YQ
Completed 1 stage(s) so far.


# Scope (deterministic — shell only)

Run the commands below **exactly** via the shell tool. Paste their **full stdout**
as your response. Do not analyze, summarize, or skip output.

Target: `src-root` (`domains-catalog` = all `src/domains/` · `src-root` = top-level `src/`)

```bash
MOD="src-root"
echo "=== target: $MOD ==="
if [ "$MOD" = "src-root" ]; then
  echo "=== src/ top-level (target topology audit) ==="
  ls -1 src/
  echo
  echo "=== directory counts (top-level folders) ==="
  for d in src/*/; do
    name=$(basename "$d")
    dirs=$(find "$d" -type d 2>/dev/null | wc -l | tr -d ' ')
    files=$(find "$d" -type f 2>/dev/null | wc -l | tr -d ' ')
    echo "$name: $dirs dirs, $files files"
  done
  echo
  echo "=== root files (middleware, instrumentation) ==="
  ls -1 src/*.{ts,tsx,js} 2>/dev/null || true
  echo
  echo "=== shared/ skeleton ==="
  ls -1 src/shared/ 2>/dev/null || echo "(missing)"
  echo
  echo "=== legacy import heat (sample counts) ==="
  for pat in "@/lib" "@/agent-core" "@/hooks" "@/infrastructure" "@/store" "@/services"; do
    c=$(grep -r "$pat" src/ tests/ --include='*.ts' --include='*.tsx' 2>/dev/null | wc -l | tr -d ' ')
    echo "$pat: $c lines"
  done
  echo
  echo "=== domains/ (out of scope for moves — referrer context only) ==="
  ls -1 src/domains/
elif [ "$MOD" = "domains-catalog" ]; then
  echo "=== domains catalog (all modules) ==="
  ls -1 src/domains/
  echo
  echo "=== directory counts per module ==="
  for d in src/domains/*/; do
    name=$(basename "$d")
    dirs=$(find "$d" -type d | wc -l | tr -d ' ')
    files=$(find "$d" -type f | wc -l | tr -d ' ')
    echo "$name: $dirs dirs, $files files"
  done
  echo
  echo "=== storyteller top-level (sprawl sample) ==="
  ls -1 src/domains/storyteller/
  echo
  echo "=== index.ts barrels ==="
  find src/domains -maxdepth 2 -name 'index.ts' | sort
  echo
  echo "=== deep imports from app (sample) ==="
  grep -rh "from '@/domains/" src/app --include='*.ts' --include='*.tsx' 2>/dev/null | sed 's/.*from /@/domains/' | sort -u | head -40
else
  find "src/domains/$MOD" -type f | sort | head -120
  echo
  echo "=== top-level folders ==="
  ls -1 "src/domains/$MOD/"
fi
echo
echo "=== git status ==="
git status --short
echo
echo "=== architecture contract ==="
ls -la docs/unified/ARCHITECTURE.md docs/unified/SPEC.md 2>&1
```

If `find` returns nothing for a single-module run, still report that — do not
substitute another module.

For `domains-catalog`, read `.fabro/workflows/plan/goals/domains-catalog-cleanup.md`
if present — it is the operator briefing for this run.

For `src-root`, read `.fabro/workflows/plan/goals/src-root-cleanup.md` if present.