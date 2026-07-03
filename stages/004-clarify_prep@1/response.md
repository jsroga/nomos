Now I'll present the inline summary for the human:

---

## Assessment summary
The repository has **23 top-level `src/` folders** where only **7** align with the target topology. Good news: Increment 1 already completed **F-1** (shared stubs + re-exports) with working shims for `lib/auth`, `lib/api-utils`, etc. The remaining **16 legacy folders** need consolidation into `shared/`, domains, or deletion. Import heat map shows **~240 total import sites** to update across waves: 168+ `@/lib` (mostly shims), 25 `@/agent-core`, 20 `@/store`, 18 `@/infrastructure`, plus smaller folders.

## Key gaps (max 5)
1. **Duplication pyramid** — `agent-core/observability` (459 LOC manual spans) vs `shared/agent-kernel/` (102 LOC Mastra wiring) vs domain agents; parallel observability trees violate "use framework once"
2. **Shim codemod volume** — Wave 1 shims exist but 140+ import sites still use old `@/lib/*` paths; batch codemod errors = broken builds
3. **Boundary enforcement gap** — lint at `warn` level; premature flip to `error` before codemods land blocks iteration
4. **Cross-domain referrer sweep** — top-level moves force import updates in `domains/*/` files; missed grep batches = import failures at runtime
5. **Legacy folder sprawl** — 16 folders outside target (12 to merge, 2 to delete, 2 keep slim); no disposition plan = drift continues

## Pick one scope (buttons are A / B / C — meanings are module-specific below)

| Button | What the plan will assume for **src-root cleanup** |
|--------|-----------------------------------------------------|
| **[A] Staged (Wave 1)** | Finalize `STRUCTURE.md` with **all 23 folders mapped** (disposition table + move map). **Implement Wave 1 only**: codemod existing shims (`@/lib`, `@/hooks` = ~140 sites) + add new shims (`@/store` = 20 sites) + grep-driven referrer updates + verify green + flip boundary lint to `error` for completed scopes. **Defer to Wave 2**: merge `agent-core/` → `shared/agent-kernel/`, consolidate `infrastructure/`, `services/`, `prompts/`, delete `workflows/`/`pages/`, rename `components/` → `components/ui/`. Low risk, high leverage (~170 imports fixed, unlocks enforcement). |
| **[B] Plan-only** | Write **complete** `STRUCTURE.md` (current tree, ideal tree, disposition for all 16 legacy folders, full move map for all waves) + `PLAN.md` (40–80 numbered todos: structure design, shim setup, move batches, grep-driven referrer sweeps for all 240+ import sites, boundary lint config, verification per wave). **No moves, no codemods this run** — next Fabro run executes Wave 1 from the plan. Pure architecture design + referrer inventory. |
| **[C] Full src-root** | Structure + implement **all waves** in this run: codemod all shims (~170 sites) + merge `agent-core/`, `infrastructure/`, `services/`, `prompts/`, `types/` into `shared/` or domain folders (60+ additional imports) + delete `workflows/`, `pages/` + rename `components/` → `components/ui/` + update all referrers in `domains/`, `app/`, `tests/` + flip all boundary lint to `error`. Complete src-root convergence (est. 6–8 verification cycles, 40–80 todos executed). |

**Advanced:** type custom constraints in freeform (routes to [F]) · pick [R] only if assess findings are wrong

**Recommendation: [A] Staged (Wave 1)** — Assessment shows F-1 foundation ready (shims exist), Wave 1 codemods are high-leverage/low-risk (~170 imports, unlocks enforcement), and deferring Wave 2 merges reduces blast radius. Full src-root (option C) is viable but requires 6–8 verify loops; staged approach ships enforcement increment sooner.