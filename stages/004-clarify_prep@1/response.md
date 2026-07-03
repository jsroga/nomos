## Assessment summary

The catalog reveals **severe folder sprawl** in storyteller (104 subdirectories vs §4 target of ~12-15), **missing public barrels** in 5/9 modules (deep imports bypass encapsulation), **god stores** mixing server/client state in 2 modules (WBT: 864 LOC; interior: ~500 LOC), and a **P0 security issue** (browser→Supabase writes in WBT). Only interior-designer partially follows §4; the other 8 modules need structural reshaping.

## Key gaps (max 5)

1. **Storyteller folder sprawl (104 dirs):** 17 `core/` type folders (ActionFormatters, CascadeEditor, EntityExtractor, etc.) should merge into 8 units; `hooks/`, `lib/`, `mentions/` feature silos violate layer discipline; `tools/` at root instead of `agents/tools/`. Target: ~50-60 dirs (50% reduction).

2. **Reference sweep scope (storyteller alone: 250+ files):** ~80 files in `src/app/api/storyteller/`, ~10 in `src/services`, ~8 in `src/evaluation`, ~150+ test files import storyteller internals 3-4 levels deep. Every folder move requires paired "update referrers" todo with grep patterns.

3. **Missing barrels (5/9 modules):** `loop-creator`, `world-building-toolkit`, `deduction-puzzle-designer`, `chat`, `game-design`, `3d-asset-exporter`, `marketing` have no `index.ts`. Cross-module imports reach internal layers directly. Need curated public APIs (~10-30 exports per module).

4. **God stores kill separation of concerns:** WBT `useWorldStore.ts` (864 LOC) mixes viewport state, tiles/projects/assets data, job polling, and manual snake_case mapping. Interior similar. Target: split server state (TanStack Query) from ephemeral UI (Zustand ~150 LOC).

5. **P0 security + manual state hacks:** WBT has browser writes (`supabase.from('projects').insert()` at `:332`), bypassing auth/RLS validation. Also: hand-rolled polling, `localStorage` recovery, `window.dispatchEvent` side-effects instead of Trigger Realtime + `useJob`.

## Pick one scope (buttons are A / B / C — meanings are module-specific below)

| Button | What the plan will assume for **this catalog effort** |
|--------|------------------------------------------------------|
| **[A] Staged** | Finalize `STRUCTURE.md` for **all 9 modules** (full ideal trees + move maps for storyteller, loop-creator, WBT, interior, chat, deduction-puzzle, game-design, 3d-asset-exporter, marketing). **Implement Wave 1 only:** storyteller folder collapse (17→8 core units, delete hooks/lib/mentions, move tools→agents/, rename components→ui) + **full referrer update** (~80 app routes, ~10 services, ~8 evaluation, ~150+ tests — grep-driven file lists). Verification gates after moves. **Deferred:** WBT state split (P0 but complex), 5-module barrel creation, interior cleanup, loop-creator reshape, schema consolidation (saves 200+ referrer updates for later waves). |
| **[B] Plan-only** | Write `STRUCTURE.md` for all 9 modules (current tree at top 2 levels, ideal target grounded in §4, move map `old→new` for every file that moves, public barrel contract, deferred items). **No code moves this run** — design artifacts only. Also: grep-based referrer inventory (patterns + estimated counts per module: "expect ~250 storyteller, ~10 WBT, ~12 chat…"). Delivers: approved structure contract + implementation roadmap. Zero verification loops, zero import breakage risk. Human reviews structures, approves, triggers separate implementation run. |
| **[C] Full catalog** | `STRUCTURE.md` + **implement all waves across all 9 modules:** storyteller collapse, WBT state split + write path fix (security P0), interior store deletion, loop-creator reshape (create ui/state/io/core/services layers), create 5 missing barrels (loop/WBT/deduction/chat/game-design/3d/marketing), schema consolidation (fold storyteller db/ into src/db/), **all referrer updates** (400+ files: app routes, services, evaluation, trigger, tests, shared, docs). Requires 8-10 verification loops (typecheck/unit/fabro-verify per wave), high coordination cost, 3-5 day effort. Delivers: entire catalog §4-compliant, all barrels curated, no deep imports, unified schema. |

**Advanced:** type custom constraints in freeform (routes to [F]) · pick [R] only if assess findings are wrong

**Recommendation: [A]** — Storyteller's 104-dir sprawl is the operator's stated pain; Wave 1 (collapse + referrers) proves the structure/move/update pattern on the hardest module. Finalize all 9 structures now (design is cheap), but defer WBT security P0 and other modules to avoid context-switch thrash — each verification loop adds 20-30 min latency. Option B (plan-only) doesn't validate the moves work; Option C (full catalog) is 5x scope with 10x verification overhead.