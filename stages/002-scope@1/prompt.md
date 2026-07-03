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
Completed 1 stage(s) so far.


# Scope (deterministic — shell only)

Run the commands below **exactly** via the shell tool. Paste their **full stdout**
as your response. Do not analyze, summarize, or skip output.

Target: `domains-catalog` (use `domains-catalog` for full `src/domains/` sweep)

```bash
MOD="domains-catalog"
echo "=== target: $MOD ==="
if [ "$MOD" = "domains-catalog" ]; then
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