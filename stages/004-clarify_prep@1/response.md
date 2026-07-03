## Assessment summary

The catalog has **9 domain modules** (381 TypeScript files). Only **1/9 modules (storyteller)** approximates the §4 blueprint, but it suffers **102-subdir sprawl** — the worst being `core/` with 15 one-folder-per-type units and `agents/` with 17 per-agent subfolders. **World-building-toolkit** is **critically divergent**: 865-LOC Zustand store mixing server/UI state, browser→Supabase writes bypassing auth gates, hand-rolled job polling. The other 7 modules are **legacy flat structures** (3-19 dirs) needing full §4 layering.

**Referrer coupling is high**: storyteller has ~40 external deep imports (API routes, cross-module, services shim); WBT has ~15 external `useWorldStore` imports from interior-designer, 3d-asset-exporter, app pages, and shared utilities.

## Key gaps (max 5)

1. **Storyteller `core/` sprawl**: 15 one-folder-per-type units (ActionTypes, StoryTypes, Enums, EntityExtractor, etc.) → collapse into 5 thematic groups (types/, domain-logic/, formatters/, entity-refs/, utils/). Target: 102 → ~60 subdirs (42% reduction).

2. **WBT god store + security**: `useWorldStore.ts` (865 LOC) mixes server data (tiles/projects/assets), UI state (viewport/brushSize), and job state; browser→Supabase writes bypass `requireAuth()`. Must split into TanStack queries (server state) + thin Zustand (~150 LOC UI-only) + server Services + API routes.

3. **Referrer sweep scope**: ~100+ external deep imports across 9 modules. Storyteller alone: 30 API routes, chat module, evaluation/, services shim. WBT: 15 cross-module `useWorldStore` imports. Every move needs paired grep-driven import rewrite.

4. **Missing public barrels**: 8/9 modules lack `index.ts` — external callers see internals (`@/domains/world-building-toolkit/store/useWorldStore`). No contract boundary, no lint enforcement.

5. **Agent folder sprawl**: storyteller `agents/` has 17 subdirs (1 per agent, plus MastraInstance/ModelConfig/workflows/tools). Target: group into `council/` (6 agents as files), `judges/` (3 agents), `orchestration/` (workflows/graphs/planner) → ~10 subdirs. Move MastraInstance → `shared/agent-kernel/`, ModelConfig → `config/`.

## Pick one scope (buttons are A / B / C — meanings are module-specific below)

| Button | What the plan will assume for **domains catalog cleanup** |
| --- | --- |
| **[A]** | **Staged — design all, implement Wave 1 only**. Write `STRUCTURE.md` with ideal trees + move maps for all 9 modules (grounded in §4 + WBT worked example). Then **implement Wave 1 storyteller only**: collapse `core/` (15→5 units), group `agents/` (17→10 subdirs), move MastraInstance/ModelConfig, fix **all ~40 storyteller external referrers** (API routes in `src/app/api/storyteller/*`, chat module, evaluation scripts, services shim). Verify (typecheck + test + verify scope). Gate before Wave 2 (WBT + others). ~30-40 todos Wave 1. |
| **[B]** | **Plan-only — structure contract + inventory, no moves**. Write `STRUCTURE.md` (ideal trees for all 9) + `PLAN.md` (full 80-100 todo sequencing: moves + grep patterns for every referrer batch). Human reviews structure contract, then launches separate executor run. Zero file moves this run — prep only. |
| **[C]** | **Full catalog — all 9 modules + all referrers**. `STRUCTURE.md` + implement: storyteller (42-dir cut) + **WBT critical reshape** (split god store → TanStack queries + thin Zustand + API routes, eliminate browser→Supabase writes) + interior-designer (merge state/store, rename components→ui) + loop-creator (add §4 layers) + 5 smaller modules (expand to full blueprint). Fix ~100+ external referrers across all modules. ~80-100 todos, many verify loops. |

**Advanced:** type custom constraints in freeform (routes to [F]) · pick [R] only if assess findings are wrong

**Recommendation: [A]** — Storyteller is the operator's stated pain point (104 subdirs) and has the cleanest path (skeleton exists, just needs collapse + referrer cleanup). WBT is higher-risk (security + cross-module coupling + full paradigm shift from god store to TanStack); defer to Wave 2 after storyteller proves the structure contract + referrer update pattern. Option B is safe but doesn't prove the pattern. Option C tackles WBT security (good) but risks multi-module breakage without intermediate verification gates.